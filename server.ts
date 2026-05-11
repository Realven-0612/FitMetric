import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
  const REDIRECT_URI = `${APP_URL}/api/strava/callback`;

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

      // Pass the token data to the parent window and close this popup
      const script = `
        <script>
          window.opener.postMessage({ type: 'STRAVA_AUTH_SUCCESS', payload: ${JSON.stringify(response.data)} }, '*');
          window.close();
        </script>
      `;
      res.send(script);
    } catch (error: any) {
      console.error("Strava Auth Error:", error.response?.data || error.message);
      const script = `
        <script>
          window.opener.postMessage({ type: 'STRAVA_AUTH_ERROR', error: 'Failed to exchange token' }, '*');
          window.close();
        </script>
      `;
      res.send(script);
    }
  });

  // Fetch Today's Strava Activities
  app.post("/api/strava/activities", async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(401).json({ error: "No access token" });

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const afterTimestamp = Math.floor(startOfDay.getTime() / 1000);

      const response = await axios.get(`https://www.strava.com/api/v3/athlete/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { after: afterTimestamp }
      });

      // Sum calories if available, or estimate based on distance/type if needed
      // Strava API activities often don't include calories unless they come from a device with HR
      // but 'kilojoules' for rides or we can use a basic MET estimation
      const activities = response.data.map((act: any) => ({
        id: act.id,
        name: act.name,
        type: act.type,
        distance: act.distance,
        moving_time: act.moving_time,
        calories: act.calories || (act.kilojoules ? act.kilojoules / 4.184 : 0) // rough estimate for kJ to kcal
      }));

      res.json({ activities });
    } catch (error: any) {
      console.error("Strava Fetch Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // AI Proxy Route
  app.post("/api/ai", async (req, res) => {
    const { model, messages, response_format, temperature } = req.body;
    
    let modelToUse = model || 'meta-llama/llama-4-scout-17b-16e-instruct';

    // Log for debugging
    const hasImage = JSON.stringify(messages || []).includes('image_url');
    console.log(`[AI Proxy] model=${model} hasImage=${hasImage}`);
    
    // ─── GEMINI: Use native REST API ───
    if (model && model.includes('gemini')) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

      // Convert OpenAI messages → Gemini native format
      const geminiContents: any[] = [];
      const systemParts: string[] = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemParts.push(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
          continue;
        }
        
        const parts: any[] = [];
        if (typeof msg.content === 'string') {
          parts.push({ text: msg.content });
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text') {
              parts.push({ text: block.text });
            } else if (block.type === 'image_url' && block.image_url?.url) {
              const dataUrl = block.image_url.url;
              const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
              if (match) {
                parts.push({
                  inline_data: {
                    mime_type: match[1],
                    data: match[2]
                  }
                });
              }
            }
          }
        }

        geminiContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts
        });
      }

      const geminiPayload: any = { contents: geminiContents };
      if (systemParts.length > 0) {
        geminiPayload.systemInstruction = { parts: [{ text: systemParts.join('\n') }] };
      }

      const geminiModel = modelToUse || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      console.log(`[AI Proxy] Gemini native → ${geminiModel}`);

      try {
        const response = await axios.post(geminiUrl, geminiPayload, {
          headers: { 'Content-Type': 'application/json' },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        // Convert Gemini response → OpenAI format
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({
          choices: [{ message: { role: 'assistant', content: text } }]
        });
      } catch (error: any) {
        const errData = error.response?.data;
        const status = error.response?.status || 500;
        console.error(`[Gemini Error] status=${status}`, JSON.stringify(errData)?.substring(0, 500));
        res.status(status).json(errData || { error: "Gemini request failed", details: error.message });
      }
      return;
    }

    // ─── OTHER PROVIDERS (OpenAI-compatible) ───
    let apiKey: string | undefined;
    let apiUrl: string;
    let extraPayload: any = {};
    
    if (model && model.includes('deepseek')) {
      apiKey = process.env.OPENROUTER_API_KEY;
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
      if (model === "deepseek-reasoner") modelToUse = "deepseek/deepseek-r1";
      else if (model === "deepseek-chat") modelToUse = "deepseek/deepseek-chat";
      extraPayload = { response_format, temperature };
    } else {
      // Groq (default)
      apiKey = process.env.GROQ_API_KEY;
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });
      extraPayload = { response_format, temperature };
    }

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
