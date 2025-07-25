import { generatePrediction } from "../services/genai.service.js";
import { extractJSON } from "../utils/jsonExtractor.js";
import {
  saveUserIfNotExists,
  saveJamurLog,
  getUserData,
} from "../services/firebase.service.js";
import WebSocket from "ws";
import { getUserLogs } from "../services/firebase.service.js";

// testing purpose
// export const prediksiJamur = async (req, res) => {
//   const { logs } = req.body;

//   // user diambil dari token yang sudah diverifikasi oleh middleware
//   const { uid, name, email } = req.user;

//   if (!Array.isArray(logs)) {
//     return res.status(400).json({ error: "Body harus berisi array 'logs'" });
//   }

//   let prompt = "Berikut adalah kumpulan data suhu dan kelembapan:\n\n";
//   logs.forEach((log, index) => {
//     prompt += `Data ${index + 1}: Suhu ${log.temperature}°C, Kelembapan ${
//       log.humidity
//     }%\n`;
//   });

//   prompt += `
// Berdasarkan data tersebut, berikan satu kesimpulan umum mengenai kemungkinan pertumbuhan jamur.

// Balas hanya dengan JSON dengan struktur seperti ini:

// {
//   "kesimpulan": "...",
//   "skorPertumbuhan": 0-10,
//   "tingkatRisiko": "...",
//   "saran": "...",
//   "deskripsi": "..."
// }
// `;

//   try {
//     const aiResponse = await generatePrediction(prompt);
//     const json = extractJSON(aiResponse);

//     // Simpan user jika belum ada
//     if (name && email) {
//       await saveUserIfNotExists(uid, { name, email });
//     }

//     // Simpan log pertumbuhan jamur
//     await saveJamurLog(uid, {
//       ...json,
//       inputLogs: logs,
//     });

//     res.json(json);
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//     res
//       .status(500)
//       .json({ error: "Gagal menghasilkan prediksi", detail: err.message });
//   }
// };

export const getJamurHistory = async (req, res) => {
  const userId = req.user.uid; // ✅ Ambil dari token yang sudah diverifikasi di middleware

  try {
    const logs = await getUserLogs(userId);
    const userData = await getUserData(userId);
    res.json({
      userId,
      userName: userData.name,
      userEmail: userData.email,
      logs,
    });
  } catch (err) {
    console.error("❌ Error  history log:", err.message);
    res.status(500).json({ error: "Failed history log", detail: err.message });
  }
};

export const prediksiDariHistory = async (req, res) => {
  const clients = req.wssClients; // dapatkan clients dari middleware
  const userId = req.user.uid;

  try {
    const logs = await getUserLogs(userId);

    if (logs.length === 0) {
      return res.status(404).json({ error: "Tidak ada data log ditemukan" });
    }

    let prompt =
      "Berikut adalah data suhu dan kelembapan dari beberapa hari terakhir:\n\n";
    logs.forEach((log, index) => {
      prompt += `Log ${index + 1}: Suhu ${
        log.inputLogs[0].temperature
      }°C, Kelembapan ${log.inputLogs[0].humidity}%\n`;
    });

    prompt += `
Berdasarkan keseluruhan data ini, berikan satu kesimpulan umum mengenai kemungkinan pertumbuhan jamur. JAWAB DENGAN BAHASA INGGRIS !!

Balas hanya dengan JSON seperti ini:

{
  "kesimpulan": "...",
  "skorPertumbuhan": 0-10,
  "tingkatRisiko": "High/Medium/Low",
  "saran": "...",
  "deskripsi": "..."
}
`;

    const aiResponse = await generatePrediction(prompt);
    const json = extractJSON(aiResponse);

    // Kirim hasil ke semua client WebSocket yang terkoneksi
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(json));
      }
    });

    res.json(json);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: "Fail to get data", detail: err.message });
  }
};

// test websocket connection
// export const getData = async (req, res) => {
//   const data = req.body;

//   if (!data.temperature || !data.humidity) {
//     return res.status(400).json({
//       error: "Format data tidak valid",
//       message: "Data must format: { 'temperature': nilai, 'humidity': nilai }",
//       received: data,
//     });
//   }

//   const validatedData = {
//     temperature: data.temperature,
//     humidity: data.humidity,
//   };

//   req.wssClients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify(validatedData));
//     }
//   });

//   res.status(200).json({
//     message: "Sent to ke WebSocket client",
//     data: validatedData,
//   });
// };
