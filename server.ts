import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
  const REDIRECT_URI = `${APP_URL}/api/strava/callback`;

  // Initialize unified SDK
  const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

  // AI Endpoints
  app.post("/api/ai/generate", async (req, res) => {
    if (!client) {
      return res.status(500).json({ error: "Gemini API Key not configured" });
    }

    try {
      const { prompt, schema, modelName = "gemini-1.5-flash" } = req.body;
      console.log(`Generating content with model: ${modelName}`);
      
      const response = await client.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: schema ? {
          responseMimeType: "application/json",
          responseSchema: schema
        } : undefined
      });

      const text = response.text;

      if (!text) {
        console.error("Empty response from AI:", JSON.stringify(response, null, 2));
        return res.status(500).json({ error: "No text returned from AI" });
      }

      res.json({ result: schema ? JSON.parse(text) : text });
    } catch (error: any) {
      console.error("AI Generation Error details:", error);
      const errorMessage = error.message || String(error);
      if (errorMessage.toLowerCase().includes("api key not valid") || errorMessage.toLowerCase().includes("invalid_argument") || errorMessage.toLowerCase().includes("api_key_invalid")) {
        return res.status(401).json({ error: "Invalid Gemini API Key. Please verify your GEMINI_API_KEY in the AI Studio Secrets panel. (Error: " + errorMessage + ")" });
      }
      res.status(500).json({ error: errorMessage || "AI processing failed" });
    }
  });

  app.post("/api/ai/analyze-image", async (req, res) => {
    if (!client) {
      return res.status(500).json({ error: "Gemini API Key not configured" });
    }

    try {
      const { prompt, imageBase64, mimeType, schema, modelName = "gemini-1.5-flash" } = req.body;
      console.log(`Analyzing image with model: ${modelName}`);
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

      const response = await client.models.generateContent({
        model: modelName,
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }],
        config: schema ? {
          responseMimeType: "application/json",
          responseSchema: schema
        } : undefined
      });

      const text = response.text;

      if (!text) {
        console.error("Empty vision response from AI:", JSON.stringify(response, null, 2));
        return res.status(500).json({ error: "No text returned from AI" });
      }

      res.json({ result: schema ? JSON.parse(text) : text });
    } catch (error: any) {
      console.error("AI Vision Error details:", error);
      const errorMessage = error.message || String(error);
      if (errorMessage.toLowerCase().includes("api key not valid") || errorMessage.toLowerCase().includes("invalid_argument") || errorMessage.toLowerCase().includes("api_key_invalid")) {
        return res.status(401).json({ error: "Invalid Gemini API Key. Please verify your GEMINI_API_KEY in the AI Studio Secrets panel. (Error: " + errorMessage + ")" });
      }
      res.status(500).json({ error: errorMessage || "AI Vision analysis failed" });
    }
  });


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
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
