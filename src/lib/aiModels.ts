/**
 * AI Model constants for FitMetric.
 *
 * GROQ_TEXT  – Llama 3.3 via Groq API key (free tier, high rate limit for text)
 * GROQ_VISION – Llama 3.2 Vision via Groq API key (for image analysis)
 *
 * Change model names here only — all callers import from this file.
 */
export const AI_MODELS = {
  /** Cerebras ultra-fast inference */
  CEREBRAS_TEXT: "llama3.3-70b",

  /** Default text generation (fallback) */
  GROQ_TEXT: "llama-3.3-70b-versatile",

  /** Vision / image analysis (food scanner, 3D body scanner) */
  GROQ_VISION: "llama-3.2-90b-vision-preview",

  /** Ultra-fast, budget-friendly Gemini model from Google AI Studio */
  GEMINI_FLASH_LITE: "gemini-3.1-flash-lite",
} as const;

export const AI_PROVIDERS = {
  CEREBRAS: "cerebras",
  GROQ: "groq",
  GOOGLE: "google",
} as const;

export type AIModelKey = keyof typeof AI_MODELS;
export type AIModelValue = (typeof AI_MODELS)[AIModelKey];
