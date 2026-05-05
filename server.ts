import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

let aiClient: any = null;
async function getAIClient() {
  if (!aiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // AI Proxy Endpoints
  const validateAIRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Basic validation
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const origin = req.get('origin');
    // We could validate origin or token here, for now it's a basic check
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    next();
  };

  app.post('/api/ai/chat', validateAIRequest, async (req, res) => {
    try {
      const ai = await getAIClient();
      const requestPayload = {
        model: req.body.model || 'gemini-1.5-flash',
        contents: req.body.contents,
        config: req.body.config
      };
      const response = await ai.models.generateContent(requestPayload);
      res.json({
        text: response.text,
        functionCalls: response.functionCalls,
        candidates: response.candidates
      });
    } catch (error) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/ai/generate', validateAIRequest, async (req, res) => {
    try {
      const ai = await getAIClient();
      const requestPayload = {
        model: req.body.model || 'gemini-1.5-flash',
        contents: req.body.contents,
        config: req.body.config
      };
      const response = await ai.models.generateContent(requestPayload);
      res.json({
        text: response.text,
        functionCalls: response.functionCalls,
        candidates: response.candidates
      });
    } catch (error) {
      console.error('AI Generate Error:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Strava Auth Endpoint
  app.get("/api/strava/auth", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/api/strava/callback`;
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
