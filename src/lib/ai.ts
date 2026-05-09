import { API_BASE } from './api';

export async function generateAIContent(prompt: string, schema?: any, modelName = 'gemini-2.0-flash') {
  const res = await fetch(`${API_BASE}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: schema ? {
        responseMimeType: 'application/json',
        responseSchema: schema
      } : undefined
    })
  });

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from AI');
  return schema ? JSON.parse(text) : text;
}

export async function analyzeAIImage(prompt: string, imageBase64: string, mimeType: string, schema?: any, modelName = 'gemini-2.0-flash') {
  const res = await fetch(`${API_BASE}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64.split(',')[1] || imageBase64, mimeType } }
        ]
      }],
      generationConfig: schema ? {
        responseMimeType: 'application/json',
        responseSchema: schema
      } : undefined
    })
  });

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from AI');
  return schema ? JSON.parse(text) : text;
}
