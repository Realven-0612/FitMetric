import axios from "axios";

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "llama-3.3-70b-versatile") {
  console.log(">>> [AI] Đang gọi hàm generateAIContent với model:", modelName);
  
  // Groq/OpenAI yêu cầu prompt phải chứa hướng dẫn trả về JSON khi dùng response_format: { type: "json_object" }
  const finalPrompt = schema ? `${prompt}\n\nIMPORTANT: You must return a valid JSON object matching the requested schema.` : prompt;

  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages: [{ role: "user", content: finalPrompt }],
      response_format: schema ? { type: "json_object" } : undefined
    });

    console.log(">>> [AI] Phản hồi từ server:", response.data);

    const text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");
    
    return schema ? JSON.parse(text) : text;
  } catch (error: any) {
    console.error(">>> [AI] Lỗi khi gọi API:", error.response?.data || error.message);
    throw error;
  }
}

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName: string = "llama-3.2-11b-vision-preview") {
  console.log(">>> [AI] Đang gọi hàm analyzeAIImage với model:", modelName);
  
  const finalPrompt = schema ? `${prompt}\n\nIMPORTANT: You must return a valid JSON object matching the requested schema.` : prompt;

  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: finalPrompt },
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

    console.log(">>> [AI] Phản hồi từ server:", response.data);

    const text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");

    return schema ? JSON.parse(text) : text;
  } catch (error: any) {
    console.error(">>> [AI] Lỗi Vision:", error.response?.data || error.message);
    throw error;
  }
}
