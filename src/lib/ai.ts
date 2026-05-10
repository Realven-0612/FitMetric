import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "gemini-2.0-flash") {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: schema ? {
        responseMimeType: "application/json",
        responseSchema: schema
      } : undefined
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from AI");
    
    return schema ? JSON.parse(text) : text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName: string = "gemini-2.0-flash") {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64.split(",")[1] || imageBase64, mimeType } }
        ]
      }],
      config: schema ? {
        responseMimeType: "application/json",
        responseSchema: schema
      } : undefined
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from AI");

    return schema ? JSON.parse(text) : text;
  } catch (error) {
    console.error("AI Vision Error:", error);
    throw error;
  }
}
