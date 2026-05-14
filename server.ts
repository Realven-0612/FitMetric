import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";

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
    const { accessToken, todayOnly } = req.body;
    if (!accessToken) return res.status(401).json({ error: "No access token" });

    try {
      const params: any = { per_page: 10 };

      // todayOnly mode: used by Dashboard for calorie sum
      if (todayOnly) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        params.after = Math.floor(startOfDay.getTime() / 1000);
      }

      const response = await axios.get(`https://www.strava.com/api/v3/athlete/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params
      });

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

      res.json({ activities });
    } catch (error: any) {
      console.error("Strava Fetch Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // AI Proxy Route
  app.post("/api/ai", aiRateLimiter, async (req, res) => {
    const { model, messages, response_format, temperature } = req.body;
    
    const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
    let modelToUse = model || DEFAULT_MODEL;

    // Log for debugging
    const hasImage = JSON.stringify(messages || []).includes('image_url');
    console.log(`[AI Proxy] model=${model} hasImage=${hasImage}`);
    
    // ─── GEMINI: Route through Vertex AI ───
    if (model && model.includes('gemini')) {
      try {
        const saJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
        if (!saJson) {
          return res.status(500).json({ error: "GCP_SERVICE_ACCOUNT_JSON not configured" });
        }
        const serviceAccount = JSON.parse(saJson);
        
        console.log(`[AI Proxy] Getting Vertex AI access token...`);
        const token = await getAccessToken(serviceAccount);
        
        let vertexModel = model;
        if (model.includes('flash-lite')) vertexModel = 'gemini-1.5-flash-002';
        else if (model.includes('flash')) vertexModel = 'gemini-1.5-flash-002';
        else if (model.includes('pro')) vertexModel = 'gemini-1.5-pro-002';
        
        const region = 'us-central1'; // Force US region to bypass geo-restrictions
        const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/${region}/publishers/google/models/${vertexModel}:generateContent`;

        console.log(`[AI Proxy] Calling Vertex AI (${region}) for model ${vertexModel}`);

        // Convert OpenAI messages to Vertex AI format
        const contents = messages.map((m: any) => {
          const parts = [];
          if (typeof m.content === 'string') {
            parts.push({ text: m.content });
          } else if (Array.isArray(m.content)) {
            m.content.forEach((part: any) => {
              if (part.type === 'text') parts.push({ text: part.text });
              else if (part.type === 'image_url') {
                const base64 = part.image_url.url.split(',')[1];
                const mimeType = part.image_url.url.split(';')[0].split(':')[1];
                parts.push({
                  inlineData: {
                    mimeType,
                    data: base64
                  }
                });
              }
            });
          }
          return { role: m.role === 'assistant' ? 'model' : m.role, parts };
        });

        const systemMessage = messages.find((m: any) => m.role === 'system');
        const systemInstruction = systemMessage ? {
          parts: [{ text: systemMessage.content }]
        } : undefined;

        const vertexContents = contents.filter((c: any) => c.role !== 'system');

        const response = await axios.post(url, { 
          contents: vertexContents,
          systemInstruction,
          generationConfig: {
            temperature: temperature || 0.3,
            responseMimeType: response_format?.type === 'json_object' ? 'application/json' : 'text/plain'
          }
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        res.json({
          choices: [
            {
              message: {
                role: 'assistant',
                content: text
              }
            }
          ]
        });
      } catch (error: any) {
        const errData = error.response?.data;
        const status = error.response?.status || 500;
        console.error(`[Vertex AI Error] status=${status}`, JSON.stringify(errData)?.substring(0, 500));
        res.status(status).json(errData || { error: "Vertex AI request failed", details: error.message });
      }
      return;
    }

    // ─── OTHER PROVIDERS (OpenAI-compatible) ───
    let apiKey: string | undefined;
    let apiUrl: string;
    let extraPayload: any = {};
    
    // Groq (default)
    apiKey = process.env.GROQ_API_KEY;
    apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });
    extraPayload = { response_format, temperature };

    const payload = { model: modelToUse, messages, ...extraPayload };

    try {
      const response = await axios.post(apiUrl, payload, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      res.json(response.data);
    } catch (error: any) {
      const errData = error.response?.data;
      const status = error.response?.status || 500;
      console.error(`[AI Proxy Error] status=${status} model=${modelToUse}`, JSON.stringify(errData)?.substring(0, 500));
      res.status(status).json(errData || { error: "AI request failed", details: error.message });
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
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
  });
}

startServer();
