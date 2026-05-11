import axios from "axios";

// Compress image to max size before sending to API
async function compressImage(base64: string, maxPx: number = 1024, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // fallback: send as-is
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}

export async function generateAIContent(prompt: string, schema?: any, modelName: string = "meta-llama/llama-4-scout-17b-16e-instruct") {
  console.log(">>> [AI] Đang gọi hàm generateAIContent với model:", modelName);
  
  const messages = schema ? [
    { 
      role: "system", 
      content: "You are a helpful assistant. You must respond ONLY with a valid JSON object. Do NOT use markdown, code blocks, or bullet points. All list items must be proper quoted strings in JSON arrays." 
    },
    { role: "user", content: prompt }
  ] : [
    { role: "user", content: prompt }
  ];

  try {
    const payload: any = {
      model: modelName,
      messages,
      temperature: schema ? 0.3 : 0.7,
    };

    // Enable strict JSON mode when schema is expected
    if (schema) {
      payload.response_format = { type: "json_object" };
    }

    const response = await axios.post("/api/ai", payload);

    console.log(">>> [AI] Phản hồi từ server:", response.data);

    let text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from AI");
    
    if (schema) {
      try {
        // Tìm vị trí của dấu { hoặc [ đầu tiên và dấu } hoặc ] cuối cùng
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        let start = -1;
        let end = -1;

        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          start = firstBrace;
          end = text.lastIndexOf('}');
        } else if (firstBracket !== -1) {
          start = firstBracket;
          end = text.lastIndexOf(']');
        }

        if (start !== -1 && end !== -1 && end > start) {
          text = text.substring(start, end + 1);
        }

        return JSON.parse(text);
      } catch (parseError) {
        console.error(">>> [AI] Lỗi parse JSON. Nội dung gốc:", text);
        
        try {
          let fixedText = text.replace(/\n\s*\*\s*(.+)/g, '\n"$1",');
          fixedText = fixedText.replace(/,\s*\]/, ']');
          
          const firstBrace = fixedText.indexOf('{');
          const firstBracket = fixedText.indexOf('[');
          let start = -1;
          let end = -1;

          if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = fixedText.lastIndexOf('}');
          } else if (firstBracket !== -1) {
            start = firstBracket;
            end = fixedText.lastIndexOf(']');
          }

          if (start !== -1 && end !== -1 && end > start) {
            fixedText = fixedText.substring(start, end + 1);
            return JSON.parse(fixedText);
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

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName: string = "llama-3.2-90b-vision-preview") {
  console.log(">>> [AI] Đang gọi hàm analyzeAIImage với model:", modelName);

  // Compress image to avoid 413 Content Too Large
  const compressedBase64 = await compressImage(imageBase64, 1024, 0.8);
  const base64Data = compressedBase64.split(',')[1] || compressedBase64;
  const finalMime = 'image/jpeg';

  const messages = schema ? [
    { 
      role: "system", 
      content: "You are a helpful assistant. You must respond ONLY with a valid JSON object or array. Do NOT use markdown lists or bullet points (like '*') inside JSON arrays. All list items must be proper quoted strings." 
    },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${finalMime};base64,${base64Data}` }
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
          image_url: { url: `data:${finalMime};base64,${base64Data}` }
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
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        let start = -1;
        let end = -1;

        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          start = firstBrace;
          end = text.lastIndexOf('}');
        } else if (firstBracket !== -1) {
          start = firstBracket;
          end = text.lastIndexOf(']');
        }

        if (start !== -1 && end !== -1 && end > start) {
          text = text.substring(start, end + 1);
        }

        return JSON.parse(text);
      } catch (parseError) {
        console.error(">>> [AI] Lỗi parse JSON Vision. Nội dung gốc:", text);
        
        try {
          let fixedText = text.replace(/\n\s*\*\s*(.+)/g, '\n"$1",');
          fixedText = fixedText.replace(/,\s*\]/, ']');
          
          const firstBrace = fixedText.indexOf('{');
          const firstBracket = fixedText.indexOf('[');
          let start = -1;
          let end = -1;

          if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = fixedText.lastIndexOf('}');
          } else if (firstBracket !== -1) {
            start = firstBracket;
            end = fixedText.lastIndexOf(']');
          }

          if (start !== -1 && end !== -1 && end > start) {
            fixedText = fixedText.substring(start, end + 1);
            return JSON.parse(fixedText);
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
