import axios from "axios";

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "llama-3.3-70b-versatile") {
  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      response_format: schema ? { type: "json_object" } : undefined
    });

    const text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");
    
    return schema ? JSON.parse(text) : text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName: string = "llama-3.2-11b-vision-preview") {
  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64.split(",")[1] || imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: schema ? { type: "json_object" } : undefined
    });

    const text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");

    return schema ? JSON.parse(text) : text;
  } catch (error) {
    console.error("AI Vision Error:", error);
    throw error;
  }
}
