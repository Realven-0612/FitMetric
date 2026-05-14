/**
 * AI Model constants for FitMetric.
 *
 * GROQ_TEXT  – Llama 3.3 via Groq API key (free tier, high rate limit for text)
 * GEMINI_VISION – Gemini via Vertex AI service account (for image analysis)
 *
 * Change model names here only — all callers import from this file.
 */
export const AI_MODELS = {
  /** Default text generation (workout plans, nutrition, chat) */
  GROQ_TEXT: "llama-3.3-70b-versatile",

  /** Vision / image analysis (food scanner, 3D body scanner) */
  GEMINI_VISION: "gemini-3.1-flash-lite",
} as const;

export type AIModelKey = keyof typeof AI_MODELS;
export type AIModelValue = (typeof AI_MODELS)[AIModelKey];
