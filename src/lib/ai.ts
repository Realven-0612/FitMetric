import axios from "axios";

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "llama-3.3-70b-versatile") {
  console.log(">>> [AI] Đang gọi hàm generateAIContent với model:", modelName);
  
  const messages = schema ? [
    { 
      role: "system", 
      content: "You are a helpful assistant. You must respond ONLY with a valid JSON object. Do NOT use markdown lists or bullet points (like '*') inside JSON arrays. All list items must be proper quoted strings." 
    },
    { role: "user", content: prompt }
  ] : [
    { role: "user", content: prompt }
  ];

  try {
    const response = await axios.post("/api/ai", {
      model: modelName,
      messages,
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
        console.error(">>> [AI] Lỗi parse JSON. Nội dung gốc:", text);
        
        // Thử fix nhanh trường hợp AI dùng dấu * trong mảng
        try {
          let fixedText = text.replace(/\n\s*\*\s*(.+)/g, '\n"$1",');
          fixedText = fixedText.replace(/,\s*\]/, ']'); // Xóa dấu phẩy thừa cuối mảng
          const jsonMatch = fixedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error(">>> [AI] Thử fix JSON thất bại.");
        }
        
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
    { 
      role: "system", 
      content: "You are a helpful assistant. You must respond ONLY with a valid JSON object. Do NOT use markdown lists or bullet points (like '*') inside JSON arrays. All list items must be proper quoted strings." 
    },
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
        
        try {
          let fixedText = text.replace(/\n\s*\*\s*(.+)/g, '\n"$1",');
          fixedText = fixedText.replace(/,\s*\]/, ']');
          const jsonMatch = fixedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error(">>> [AI] Thử fix JSON thất bại.");
        }
        
        throw new Error("AI returned invalid JSON structure");
      }
    }

    return text;
  } catch (error: any) {
    console.error(">>> [AI] Lỗi Vision:", error.response?.data || error.message);
    throw error;
  }
}
