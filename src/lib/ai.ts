import axios from "axios";
import { AI_MODELS } from "./aiModels";

// ─── Image compression ────────────────────────────────────────────────────────

async function compressImage(base64: string, maxPx = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}

// ─── JSON parser (shared) ─────────────────────────────────────────────────────

/**
 * Robustly extract and parse JSON from a raw AI response string.
 * Handles markdown code fences, trailing commas, bullet-list artefacts, etc.
 */
function parseAIJson(raw: string): any {
  const extract = (text: string): string | null => {
    const fb = text.indexOf("{");
    const ab = text.indexOf("[");
    let start = -1, end = -1;
    if (fb !== -1 && (ab === -1 || fb < ab)) { start = fb; end = text.lastIndexOf("}"); }
    else if (ab !== -1)                        { start = ab; end = text.lastIndexOf("]"); }
    return start !== -1 && end > start ? text.substring(start, end + 1) : null;
  };

  // Pass 1 – direct extract
  const slice1 = extract(raw);
  if (slice1) {
    try { return JSON.parse(slice1); } catch { /* fall through */ }
  }

  // Pass 2 – fix markdown bullet artefacts then retry
  const fixed = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .replace(/\n\s*\*\s*(.+)/g, '\n"$1",')
    .replace(/,\s*]/g, "]")
    .replace(/,\s*}/g, "}");
  const slice2 = extract(fixed);
  if (slice2) {
    try { return JSON.parse(slice2); } catch { /* fall through */ }
  }

  throw new Error("AI returned invalid JSON structure");
}

// ─── Retry helper (handles Groq 429 rate-limit) ───────────────────────────────

const RETRY_DELAYS_MS = [2000, 5000, 10000]; // 3 attempts total

async function postWithRetry(url: string, payload: any): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await axios.post(url, payload);
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err.response?.status;
      // Retry only on rate-limit (429) or server-side errors (5xx)
      const shouldRetry = status === 429 || (status >= 500 && status < 600);
      if (!shouldRetry || attempt === RETRY_DELAYS_MS.length) break;

      const delay = RETRY_DELAYS_MS[attempt];
      console.warn(`>>> [AI] HTTP ${status} – retrying in ${delay / 1000}s (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateAIContent(
  prompt: string,
  schema?: any,
  modelName: string = AI_MODELS.GEMINI_FLASH_LITE,
) {
  console.log(">>> [AI] generateAIContent model:", modelName);

  const messages = schema
    ? [
        {
          role: "system",
          content:
            "You are a helpful assistant. You must respond ONLY with a valid JSON object. " +
            "Do NOT use markdown, code blocks, or bullet points. " +
            "All list items must be proper quoted strings in JSON arrays.",
        },
        { role: "user", content: prompt },
      ]
    : [{ role: "user", content: prompt }];

  const payload: any = {
    model: modelName,
    messages,
    temperature: schema ? 0.3 : 0.7,
  };
  if (schema) payload.response_format = { type: "json_object" };

  try {
    const response = await postWithRetry("/api/ai", payload);
    console.log(">>> [AI] Response OK");

    const text: string = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");

    return schema ? parseAIJson(text) : text;
  } catch (error: any) {
    console.error(">>> [AI] generateAIContent failed:", error.response?.data || error.message);
    throw error;
  }
}

export async function analyzeAIImage(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  schema?: any,
  modelName: string = AI_MODELS.GEMINI_FLASH_LITE,
) {
  console.log(">>> [AI] analyzeAIImage model:", modelName);

  const compressedBase64 = await compressImage(imageBase64, 1024, 0.7);
  const base64Data = compressedBase64.split(",")[1] || compressedBase64;
  const finalMime = "image/jpeg";
  const payloadSizeKB = Math.round(base64Data.length / 1024);
  console.log(`>>> [AI] Image payload: ${payloadSizeKB}KB (compressed)`);

  const userContent: any[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: `data:${finalMime};base64,${base64Data}` } },
  ];

  const messages = schema
    ? [
        {
          role: "system",
          content:
            "You are a helpful assistant. You must respond ONLY with a valid JSON object or array. " +
            "Do NOT use markdown lists or bullet points (like '*') inside JSON arrays. " +
            "All list items must be proper quoted strings.",
        },
        { role: "user", content: userContent },
      ]
    : [{ role: "user", content: userContent }];

  try {
    const response = await postWithRetry("/api/ai", { model: modelName, messages });
    console.log(">>> [AI] Vision response OK");

    const text: string = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");

    return schema ? parseAIJson(text) : text;
  } catch (error: any) {
    const errDetail = error.response?.data;
    console.error(">>> [AI] analyzeAIImage failed:", {
      status: error.response?.status,
      error: typeof errDetail === "string" ? errDetail : JSON.stringify(errDetail, null, 2),
      model: modelName,
      imageSizeKB: payloadSizeKB,
    });
    throw error;
  }
}
