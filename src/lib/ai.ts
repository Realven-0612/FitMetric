import { API_BASE } from "./api";

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "gemini-2.0-flash") {
  try {
    const response = await fetch(`${API_BASE}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: schema ? {
          responseMimeType: "application/json",
          responseSchema: schema
        } : undefined,
        model: modelName
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text returned from AI");
    
    return schema ? JSON.parse(text) : text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName: string = "gemini-2.0-flash") {
  try {
    const response = await fetch(`${API_BASE}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: imageBase64.split(",")[1] || imageBase64, mimeType } }
          ]
        }],
        generationConfig: schema ? {
          responseMimeType: "application/json",
          responseSchema: schema
        } : undefined,
        model: modelName
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text returned from AI");

    return schema ? JSON.parse(text) : text;
  } catch (error) {
    console.error("AI Vision Error:", error);
    throw error;
  }
}
