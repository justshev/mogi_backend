import { generatePrediction } from "../services/genai.service.js";
import { extractJSON } from "../utils/jsonExtractor.js";

export const prediksiJamur = async (req, res) => {
  const logs = req.body.logs;

  if (!Array.isArray(logs)) {
    return res.status(400).json({ error: "Body harus berisi array 'logs'" });
  }

  let prompt = "Berikut adalah kumpulan data suhu dan kelembapan:\n\n";
  logs.forEach((log, index) => {
    prompt += `Data ${index + 1}: Suhu ${log.temperature}°C, Kelembapan ${
      log.humidity
    }%\n`;
  });

  prompt += `
Berdasarkan data tersebut, berikan satu kesimpulan umum mengenai kemungkinan pertumbuhan jamur.

Balas hanya dengan JSON dengan struktur seperti ini:

{
  "kesimpulan": "Teks kesimpulan singkat",
  "skorPertumbuhan": angka dari 0 sampai 10,
  "tingkatRisiko": "rendah" | "sedang" | "tinggi",
  "saran": "Saran singkat untuk mengurangi atau mengontrol pertumbuhan jamur.",
  "deskripsi": "Penjelasan singkat mengapa kesimpulan tersebut diambil berdasarkan data."
}
`;

  try {
    const result = await generatePrediction(prompt);
    const json = extractJSON(result);
    res.json(json);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res
      .status(500)
      .json({ error: "Gagal menghasilkan prediksi", detail: err.message });
  }
};
