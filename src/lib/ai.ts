export async function generateAIContent(prompt: string, schema?: any, modelName: string = "gemini-1.5-flash") {
  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, schema, modelName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate AI content");
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("AI Generation Proxy Error:", error);
    throw error;
  }
}

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName: string = "gemini-1.5-flash") {
  try {
    const response = await fetch("/api/ai/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, imageBase64, mimeType, schema, modelName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to analyze image with AI");
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("AI Vision Proxy Error:", error);
    throw error;
  }
}
