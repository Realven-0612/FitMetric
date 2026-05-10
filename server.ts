import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

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
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    try {
      const { model, contents, generationConfig } = req.body;
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash-latest'}:generateContent?key=${GEMINI_API_KEY}`,
        { contents, generationConfig },
        { headers: { 'Content-Type': 'application/json' } }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("AI Proxy Error:", error.response?.data || error.message);
      res.status(500).json({ error: "AI request failed", details: error.response?.data });
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
