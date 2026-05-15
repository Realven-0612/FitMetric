import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";
import webpush from "web-push";
import cron from "node-cron";
import * as admin from "firebase-admin";

// ─── VAPID Keys ───────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BHgYFT3fKh7KNAh4rMVCjULIBEe7l30uSV9ggK4661qmcBMUdmNOkso93NdqTcj6RGgMFrKuV--1ir-_27fx4tg";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "EXlgfUjh0d1e6cpYIHogWnKXSa5AAx2M3PS-cTd9iBE";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@fitmetric.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ─── Firebase Admin (for persistent push subscriptions) ──────────────────────
let db: admin.firestore.Firestore | null = null;
try {
  const serviceAccountJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    });
    db = admin.firestore();
    console.log("[Firebase Admin] Initialized — subscriptions will persist in Firestore.");
  } else if (!serviceAccountJson) {
    console.warn("[Firebase Admin] GCP_SERVICE_ACCOUNT_JSON not set — falling back to in-memory subscriptions.");
  }
} catch (e: any) {
  console.error("[Firebase Admin] Init failed:", e.message);
}

// ─── Subscription helpers (Firestore-backed, memory fallback) ─────────────────
let _memSubs: any[] = []; // used only when Firestore is unavailable

async function getSubscriptions(): Promise<any[]> {
  if (!db) return _memSubs;
  const snap = await db.collection("pushSubscriptions").get();
  return snap.docs.map(d => d.data().subscription);
}

async function addSubscription(sub: any): Promise<void> {
  if (!db) {
    if (!_memSubs.find(s => s.endpoint === sub.endpoint)) _memSubs.push(sub);
    return;
  }
  // Use a hash of the endpoint as the document ID so it's idempotent
  const id = Buffer.from(sub.endpoint).toString("base64").slice(0, 100);
  await db.collection("pushSubscriptions").doc(id).set({ subscription: sub, updatedAt: new Date() });
}

async function removeSubscription(endpoint: string): Promise<void> {
  if (!db) {
    _memSubs = _memSubs.filter(s => s.endpoint !== endpoint);
    return;
  }
  const id = Buffer.from(endpoint).toString("base64").slice(0, 100);
  await db.collection("pushSubscriptions").doc(id).delete();
}

function base64url(str: string | Buffer) {
  return (typeof str === 'string' ? Buffer.from(str) : str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function getAccessToken(serviceAccount: any) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  };
  
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedClaimSet}`);
  const signature = base64url(sign.sign(serviceAccount.private_key));
  
  const jwt = `${encodedHeader}.${encodedClaimSet}.${signature}`;
  
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  });
  
  return response.data.access_token;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
  const REDIRECT_URI = `${APP_URL}/api/strava/callback`;

  // ─── Simple IP-based rate limiter for /api/ai ────────────────────────────
  // Max 30 AI requests per IP per 60-second window (protects Groq/Gemini quotas)
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const AI_RATE_LIMIT = 30;       // requests
  const AI_RATE_WINDOW_MS = 60_000; // 1 minute

  function aiRateLimiter(req: any, res: any, next: any) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + AI_RATE_WINDOW_MS });
      return next();
    }

    if (entry.count >= AI_RATE_LIMIT) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many AI requests. Please wait a moment.',
        retryAfter,
      });
    }

    entry.count++;
    next();
  }

  // Strava Auth Initializer
  app.get("/api/strava/auth", (req, res) => {
    if (!STRAVA_CLIENT_ID) {
      return res.status(500).json({ error: "Strava Client ID not configured" });
    }
    const scope = "activity:read_all";
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
    res.json({ url: authUrl });
  });

  // Strava Callback Handler
  app.get("/api/strava/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const response = await axios.post("https://www.strava.com/oauth/token", {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      });

      const tokenPayload = JSON.stringify(response.data);
      const appUrl = APP_URL;

      // Works for both popup (desktop) and same-tab (mobile) flows:
      // - If opened as popup: postMessage to parent then close.
      // - If same tab (mobile): redirect back to the SPA with token in sessionStorage via a bridge page.
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Connecting Strava...</title></head>
<body style="background:#0a0a0c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p style="opacity:0.5;font-size:13px">Connecting... please wait</p>
  <script>
    var token = ${tokenPayload};
    try {
      if (window.opener && !window.opener.closed) {
        // Desktop popup flow
        window.opener.postMessage({ type: 'STRAVA_AUTH_SUCCESS', payload: token }, '*');
        window.close();
      } else {
        // Mobile same-tab flow — store token and redirect back to app
        sessionStorage.setItem('strava_pending_token', JSON.stringify(token));
        window.location.href = '${appUrl}/profile#strava-connected';
      }
    } catch(e) {
      sessionStorage.setItem('strava_pending_token', JSON.stringify(token));
      window.location.href = '${appUrl}/profile#strava-connected';
    }
  <\/script>
</body></html>`;
      res.send(html);
    } catch (error: any) {
      console.error("Strava Auth Error:", error.response?.data || error.message);
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Strava Error</title></head>
<body style="background:#0a0a0c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p style="color:#f87171">Connection failed. Redirecting...</p>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'STRAVA_AUTH_ERROR', error: 'Failed to exchange token' }, '*');
        window.close();
      } else {
        window.location.href = '${APP_URL}/profile#strava-error';
      }
    } catch(e) {
      window.location.href = '${APP_URL}/profile#strava-error';
    }
  <\/script>
</body></html>`;
      res.send(html);
    }
  });

  // Fetch recent Strava Activities (last 10)
  app.post("/api/strava/activities", async (req, res) => {
    let { accessToken, refreshToken, todayOnly } = req.body;
    if (!accessToken) return res.status(401).json({ error: "No access token" });

    try {
      const params: any = { per_page: 10 };

      // todayOnly mode: used by Dashboard for calorie sum
      if (todayOnly) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        params.after = Math.floor(startOfDay.getTime() / 1000);
      }

      let response: any;
      let newTokenData = null;

      try {
        response = await axios.get(`https://www.strava.com/api/v3/athlete/activities`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params
        });
      } catch (err: any) {
        if (err.response?.status === 401 && refreshToken) {
          console.log("[Strava] Access token expired, attempting refresh...");
          const refreshRes = await axios.post("https://www.strava.com/oauth/token", {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: refreshToken
          });
          newTokenData = refreshRes.data;
          accessToken = newTokenData.access_token;
          
          response = await axios.get(`https://www.strava.com/api/v3/athlete/activities`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params
          });
        } else {
          throw err;
        }
      }

      const activities = response.data.map((act: any) => ({
        id: act.id,
        name: act.name,
        type: act.sport_type || act.type,
        distance: act.distance,           // meters
        moving_time: act.moving_time,     // seconds
        elapsed_time: act.elapsed_time,   // seconds
        start_date: act.start_date_local, // ISO string
        calories: act.calories || (act.kilojoules ? Math.round(act.kilojoules / 4.184 * 1000) / 1000 : 0),
        average_heartrate: act.average_heartrate || null,
        max_heartrate: act.max_heartrate || null,
        total_elevation_gain: act.total_elevation_gain || 0,
        strava_url: `https://www.strava.com/activities/${act.id}`
      }));

      res.json({ activities, newTokenData });
    } catch (error: any) {
      console.error("Strava Fetch Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // AI Proxy Route with Cerebras, Groq & Google AI Studio fallback support
  app.post("/api/ai", aiRateLimiter, async (req, res) => {
    const { model, messages, response_format, temperature } = req.body;
    
    const cerebrasKey = process.env.CEREBRAS_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    // Helper to detect if messages contain images (Cerebras doesn't support vision yet)
    const hasImage = messages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((part: any) => part.type === 'image_url')
    );

    async function tryCerebras() {
      if (!cerebrasKey) throw new Error("No Cerebras key");
      if (hasImage) throw new Error("Cerebras doesn't support vision");
      
      const targetModel = model?.includes('llama') ? model : "llama3.1-8b"; // Cerebras supports llama3.1-8b and 70b
      console.log(`[AI Proxy] Routing to Cerebras: ${targetModel}`);

      const response = await axios.post("https://api.cerebras.ai/v1/chat/completions", {
        model: targetModel,
        messages,
        response_format,
        temperature: temperature || 0.3
      }, {
        headers: { 
          'Authorization': `Bearer ${cerebrasKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    }

    async function tryGroq() {
      if (!groqKey) throw new Error("No Groq key");
      
      const groqModel = hasImage ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';
      console.log(`[AI Proxy] Routing to Groq: ${groqModel}`);

      const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: groqModel,
        messages,
        response_format,
        temperature: temperature || 0.3
      }, {
        headers: { 
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    }

    async function tryGemini() {
      if (!googleKey) throw new Error("No Google key");
      console.log(`[AI Proxy] Routing to Gemini`);

      const targetModel = model?.includes('gemini') ? model : 'gemini-3.1-flash-lite';

      const contents = messages.filter((m: any) => m.role !== 'system').map((m: any) => {
        const parts: any[] = [];
        if (typeof m.content === 'string') {
          parts.push({ text: m.content });
        } else if (Array.isArray(m.content)) {
          m.content.forEach((part: any) => {
            if (part.type === 'text') parts.push({ text: part.text });
            else if (part.type === 'image_url') {
              const base64 = part.image_url.url.split(',')[1];
              const mimeType = part.image_url.url.split(';')[0].split(':')[1];
              parts.push({ inlineData: { mimeType, data: base64 } });
            }
          });
        }
        return { role: m.role === 'assistant' ? 'model' : 'user', parts };
      });

      const systemMessage = messages.find((m: any) => m.role === 'system');
      const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${googleKey}`;

      const response = await axios.post(url, {
        contents,
        systemInstruction,
        generationConfig: {
          temperature: temperature || 0.3,
          responseMimeType: response_format?.type === 'json_object' ? 'application/json' : 'text/plain'
        }
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      return {
        choices: [{ message: { role: 'assistant', content: text } }]
      };
    }

    // --- WATERFALL EXECUTION ---
    try {
      try {
        const data = await tryCerebras();
        return res.json(data);
      } catch (err: any) {
        if (err.response?.status === 429 || err.message.includes("vision") || err.message.includes("Cerebras key")) {
          console.warn(`[AI Proxy] Cerebras skipped/failed (Status ${err.response?.status || err.message}). Fallback to Groq.`);
        } else {
          // If it's a bad request, don't throw immediately, maybe Groq can handle it.
          console.warn(`[AI Proxy] Cerebras error: ${err.message}. Fallback to Groq.`);
        }
      }

      try {
        const data = await tryGroq();
        return res.json(data);
      } catch (err: any) {
        if (err.response?.status === 429 || err.message.includes("Groq key")) {
          console.warn(`[AI Proxy] Groq skipped/failed (Status ${err.response?.status || err.message}). Fallback to Gemini.`);
        } else {
          console.warn(`[AI Proxy] Groq error: ${err.message}. Fallback to Gemini.`);
        }
      }

      const data = await tryGemini();
      return res.json(data);

    } catch (finalError: any) {
      console.error("[AI Proxy] All AI providers failed.", finalError.response?.data || finalError.message);
      return res.status(500).json({ error: "All AI providers failed", details: finalError.message });
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  // ─── Push Notification API Routes ───
  // Must be registered BEFORE static/catch-all handler

  // Serve public VAPID key to frontend
  app.get("/api/notifications/vapid-public-key", (_req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Register a push subscription from browser
  app.post("/api/notifications/subscribe", async (req, res) => {
    const subscription = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: "Invalid subscription object" });
    }
    try {
      await addSubscription(subscription);
      const all = await getSubscriptions();
      console.log(`[Push] Subscription saved. Total: ${all.length}`);
      res.status(201).json({ status: "subscribed", total: all.length });
    } catch (err: any) {
      console.error("[Push] Failed to save subscription:", err.message);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // Unsubscribe a specific endpoint
  app.post("/api/notifications/unsubscribe", async (req, res) => {
    const { endpoint } = req.body;
    try {
      await removeSubscription(endpoint);
      console.log(`[Push] Unsubscribed: ${endpoint.substring(0, 50)}...`);
      res.json({ status: "unsubscribed" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  // Test: send a push to all subscribers immediately
  app.post("/api/notifications/test", async (_req, res) => {
    const subs = await getSubscriptions();
    if (subs.length === 0) {
      return res.status(404).json({ error: "No subscribers. Enable notifications first." });
    }
    const payload = JSON.stringify({
      title: "FitMetric Test 🏋️",
      body: "Push notifications are working correctly!"
    });
    const results = await Promise.allSettled(
      subs.map(sub => webpush.sendNotification(sub, payload))
    );
    const sent = results.filter(r => r.status === "fulfilled").length;
    res.json({ status: "done", sent, total: subs.length });
  });

  // ─── Send reminder push to all active subscribers (called by cron) ───
  app.post("/api/notifications/send-reminders", async (_req, res) => {
    const subs = await getSubscriptions();
    if (subs.length === 0) {
      return res.json({ status: "skipped", reason: "no subscribers" });
    }

    const hour = new Date().getUTCHours();
    let title = "FitMetric 💪";
    let body = "Stay on track with your health goals today!";
    if (hour < 10) {
      title = "Good Morning! 🌅";
      body = "Log your breakfast and kick off a healthy day!";
    } else if (hour < 15) {
      title = "Midday Check-In 🥗";
      body = "Don't forget to log lunch and stay hydrated!";
    } else {
      title = "Evening Reminder 🌙";
      body = "Log your dinner and review today's progress!";
    }

    const payload = JSON.stringify({ title, body, icon: "/assets/app_icon.png" });
    let sent = 0;
    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            stale.push(sub.endpoint);
          }
        }
      })
    );

    // Clean up stale subscriptions
    for (const endpoint of stale) {
      await removeSubscription(endpoint);
    }
    if (stale.length > 0) {
      console.log(`[Push] Removed ${stale.length} stale subscription(s).`);
    }

    console.log(`[Push] Reminders sent: ${sent}/${subs.length} (${stale.length} removed as stale).`);
    res.json({ status: "done", sent, total: subs.length, staleRemoved: stale.length });
  });

  // ─── Cron Jobs ───
  // Reminders: 8:00, 12:00, 20:00 UTC — calls /api/notifications/send-reminders
  cron.schedule("0 8,12,20 * * *", async () => {
    console.log(`[Cron] Triggering send-reminders...`);
    try {
      const response = await axios.post(`http://localhost:${PORT}/api/notifications/send-reminders`);
      console.log(`[Cron] Result:`, response.data);
    } catch (err: any) {
      console.error("[Cron] Failed to call /api/notifications/send-reminders:", err.message);
    }
  });

  // ─── Static Files / SPA Fallback ───
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[Push] VAPID Public Key configured. Subscriptions backed by ${db ? "Firestore" : "memory"}.`);
  });
}

startServer();
