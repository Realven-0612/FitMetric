import axios from "axios";

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "llama-3.3-70b-versatile") {
  console.log(">>> [AI] Đang gọi hàm generateAIContent với model:", modelName);
  
  // Tạo danh sách tin nhắn, nếu cần JSON thì thêm system message chứa từ "json"
  const messages = schema ? [
    { role: "system", content: "You are a helpful assistant. You must respond with a valid json object matching the requested schema." },
    { role: "user", content: prompt }
  ] : [
    { role: "user", content: prompt }
  ];

  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages,
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
  
  const messages = schema ? [
    { role: "system", content: "You are a helpful assistant. You must respond with a valid json object matching the requested schema." },
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
  ] : [
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
  ];

  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages,
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
