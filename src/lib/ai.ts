import axios from "axios";

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "llama-3.3-70b-versatile") {
  console.log(">>> [AI] Đang gọi hàm generateAIContent với model:", modelName);
  
  const messages = schema ? [
    { role: "system", content: "You are a helpful assistant. You must respond ONLY with a valid JSON object. Do not include any explanations or markdown formatting outside the JSON." },
    { role: "user", content: prompt }
  ] : [
    { role: "user", content: prompt }
  ];

  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages,
      // Bỏ response_format: { type: "json_object" } để tránh lỗi của Groq
    });

    console.log(">>> [AI] Phản hồi từ server:", response.data);

    let text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");
    
    if (schema) {
      try {
        // Cố gắng tìm phần JSON trong văn bản (nếu AI có lỡ trả về markdown ```json ... ```)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
        }
        return JSON.parse(text);
      } catch (parseError) {
        console.error(">>> [AI] Lỗi parse JSON. Nội dung gốc:", text);
        throw new Error("AI returned invalid JSON structure");
      }
    }
    
    return text;
  } catch (error: any) {
    console.error(">>> [AI] Lỗi khi gọi API:", error.response?.data || error.message);
    throw error;
  }
}

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName: string = "llama-3.2-11b-vision-preview") {
  console.log(">>> [AI] Đang gọi hàm analyzeAIImage với model:", modelName);
  
  const messages = schema ? [
    { role: "system", content: "You are a helpful assistant. You must respond ONLY with a valid JSON object. Do not include any explanations or markdown formatting outside the JSON." },
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
      // Bỏ response_format
    });

    console.log(">>> [AI] Phản hồi từ server:", response.data);

    let text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");

    if (schema) {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
        }
        return JSON.parse(text);
      } catch (parseError) {
        console.error(">>> [AI] Lỗi parse JSON Vision. Nội dung gốc:", text);
        throw new Error("AI returned invalid JSON structure");
      }
    }

    return text;
  } catch (error: any) {
    console.error(">>> [AI] Lỗi Vision:", error.response?.data || error.message);
    throw error;
  }
}
