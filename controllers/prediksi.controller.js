import { generatePrediction } from "../services/genai.service.js";
import { extractJSON } from "../utils/jsonExtractor.js";
import {
  saveUserIfNotExists,
  saveJamurLog,
} from "../services/firebase.service.js";

export const prediksiJamur = async (req, res) => {
  const { logs } = req.body;

  // user diambil dari token yang sudah diverifikasi oleh middleware
  const { uid, name, email } = req.user;

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
  "kesimpulan": "...",
  "skorPertumbuhan": 0-10,
  "tingkatRisiko": "...",
  "saran": "...",
  "deskripsi": "..."
}
`;

  try {
    const aiResponse = await generatePrediction(prompt);
    const json = extractJSON(aiResponse);

    // Simpan user jika belum ada
    if (name && email) {
      await saveUserIfNotExists(uid, { name, email });
    }

    // Simpan log pertumbuhan jamur
    await saveJamurLog(uid, {
      ...json,
      inputLogs: logs,
    });

    res.json(json);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res
      .status(500)
      .json({ error: "Gagal menghasilkan prediksi", detail: err.message });
  }
};
