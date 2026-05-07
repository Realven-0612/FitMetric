import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";

dotenv.config();

// Environment Config Validation
if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ Warning: GEMINI_API_KEY is not configured in .env");
}
if (!process.env.STRAVA_CLIENT_ID) {
  console.warn("⚠️ Warning: STRAVA_CLIENT_ID is not configured in .env");
}

// ==================== GEMINI API KEY ROTATION ====================
let currentKeyIndex = 0;
const keyBlacklist = new Map<string, number>(); // key -> ban until timestamp

/**
 * Lấy Gemini client với key rotation thông minh
 */
async function getAIClient() {
  const rawKeys = process.env.GEMINI_API_KEY || "";
  let keys = rawKeys
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error("❌ No GEMINI_API_KEY configured in .env");
  }

  // Giới hạn tối đa 5 keys (theo yêu cầu)
  if (keys.length > 5) {
    console.warn(`⚠️ Found ${keys.length} keys, but only using first 5`);
    keys = keys.slice(0, 5);
  }

  const now = Date.now();
  // Xóa key khỏi blacklist nếu đã hết thời gian
  for (const [key, banUntil] of keyBlacklist.entries()) {
    if (banUntil < now) keyBlacklist.delete(key);
  }

  // Thử tối đa 5 lần (mỗi key 1 lần)
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = keys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;

    // Bỏ qua key đang bị blacklist
    if (keyBlacklist.has(apiKey)) {
      continue;
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      console.log(`🔑 Using Gemini key [${currentKeyIndex}] (${keys.length} keys available)`);
      return ai;

    } catch (err: any) {
      if (err.message?.includes("API key") || 
          err.message?.includes("quota") || 
          err.message?.includes("rate limit")) {
        
        console.warn(`🚫 Key [${currentKeyIndex}] temporarily blacklisted: ${err.message}`);
        keyBlacklist.set(apiKey, now + 10 * 60 * 1000); // ban 10 phút
      }
    }
  }

  throw new Error("❌ All Gemini API keys are currently unavailable or rate limited.");
}
// ==================== END KEY ROTATION ====================

async function startServer() {
  const app = express();
  const PORT = 3000;

  const allowedOrigins = [process.env.APP_URL || 'http://localhost:3000'];
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));

  app.use(express.json());

  // Rate Limiting (Anti-Abuse/DDoS)
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 50, // Stricter limit for AI endpoints
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many AI requests, please try again later.' }
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 200, 
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });

  app.use('/api/ai/', aiLimiter);
  app.use('/api/strava/', apiLimiter);

  // AI Proxy Endpoints
  const validateAIRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Tighter validation on body parameters
    if (!req.body || !req.body.contents) {
      return res.status(400).json({ error: 'Missing contents in request body' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    next();
  };

  app.post('/api/ai/chat', validateAIRequest, async (req, res, next) => {
    try {
      const ai = await getAIClient();
      const requestPayload = {
        model: req.body.model || 'gemini-1.5-flash',
        contents: req.body.contents,
        config: req.body.config?.generationConfig || req.body.config
      };
      console.log("📏 Request size:", JSON.stringify(req.body.contents).length, "bytes");
      const response = await ai.models.generateContent(requestPayload);
      res.json({
        text: response.text,
        functionCalls: response.functionCalls,
        candidates: response.candidates
      });
    } catch (error) {
      console.error('AI Chat Error:', error);
      next(error);
    }
  });

  app.post('/api/ai/generate', validateAIRequest, async (req, res, next) => {
    try {
      const ai = await getAIClient();
      const requestPayload = {
        model: req.body.model || 'gemini-1.5-flash',
        contents: req.body.contents,
        config: req.body.config?.generationConfig || req.body.config
      };
      const response = await ai.models.generateContent(requestPayload);
      res.json({
        text: response.text,
        functionCalls: response.functionCalls,
        candidates: response.candidates
      });
    } catch (error) {
      console.error('AI Generate Error:', error);
      next(error);
    }
  });

  // Strava Auth Endpoint
  app.get("/api/strava/auth", (req, res) => {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/strava/callback`;
    const clientId = process.env.STRAVA_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ error: "STRAVA_CLIENT_ID not configured" });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read,activity:read_all',
    });

    const authUrl = `https://www.strava.com/oauth/authorize?${params}`;
    res.json({ url: authUrl });
  });

  // Strava Callback
  app.get('/api/strava/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      return res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'STRAVA_AUTH_ERROR', error: '${error}' }, '*');
              window.close();
            }
          </script>
          <p>Auth error: ${error}</p>
        </body></html>
      `);
    }

    try {
      // Exchange code for tokens
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token exchange failed');
      }

      // Send tokens to parent window
      res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'STRAVA_AUTH_SUCCESS', payload: ${JSON.stringify(data)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body></html>
      `);

    } catch (err) {
      res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'STRAVA_AUTH_ERROR', error: 'Failed to exchange token' }, '*');
              window.close();
            }
          </script>
          <p>Auth error: Failed to exchange token</p>
        </body></html>
      `);
    }
  });

  // Strava Refresh Token
  app.post('/api/strava/refresh', async (req, res, next) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: "Missing refresh_token" });
    }

    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        })
      });

      if (!response.ok) {
        throw new Error(`Strava Token Refresh error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Strava refresh error:', error);
      next(error);
    }
  });

  // Strava Activities
  app.get('/api/strava/activities', async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    try {
      const perPage = req.query.per_page || 10;
      const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.statusText}`);
      }

      const activities = await response.json();
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    // Use get * to ensure React Router handles all other routes
    app.get('*', (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error Handler:', err);
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
