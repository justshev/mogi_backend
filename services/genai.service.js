import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = "gemini-2.0-flash";
const config = {
  responseMimeType: "text/plain",
  systemInstruction: [
    {
      text: "Kamu adalah AI analis lingkungan. Tugasmu membaca data suhu dan kelembapan lalu memberikan prediksi pertumbuhan jamur dalam format JSON valid. Berikan hanya output JSON murni tanpa awalan, tanpa tanda backtick, tanpa komentar atau penjelasan tambahan. Harus bisa langsung diparsing dengan JSON.parse().",
    },
  ],
};

export const generatePrediction = async (prompt) => {
  const response = await genAI.models.generateContentStream({
    model,
    config,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  let result = "";
  for await (const chunk of response) {
    result += chunk.text;
  }

  return result;
};
