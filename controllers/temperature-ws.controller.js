import {
  processTemperatureDataWs,
  getTemperatureStateWs,
  setThresholdWs,
  setSaveIntervalWs,
  resetTemperatureStateWs,
} from "../services/temperature-ws.service.js";
import { saveUserIfNotExists } from "../services/prisma.service.js";

/**
 * POST /api/temperature-ws/data
 * Terima data temperature dari Arduino (via Postman untuk testing)
 * Broadcast via WebSocket ke semua connected clients
 * Body: { temperature: number, humidity: number }
 */
export const receiveTemperatureDataWs = async (req, res) => {
  const { temperature, humidity } = req.body;
  const { uid, name, email } = req.user;

  // Validasi input
  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({
      error: "Data tidak lengkap",
      message: "Body harus berisi 'temperature' dan 'humidity'",
      received: req.body,
    });
  }

  if (typeof temperature !== "number" || typeof humidity !== "number") {
    return res.status(400).json({
      error: "Format data tidak valid",
      message: "'temperature' dan 'humidity' harus berupa number",
      received: req.body,
    });
  }

  try {
    // Simpan user jika belum ada
    if (name && email) {
      await saveUserIfNotExists(uid, { name, email });
    }

    // Process temperature data dan broadcast via WebSocket
    const result = await processTemperatureDataWs(
      uid,
      { temperature, humidity },
      req.wssClients
    );

    res.json({
      success: true,
      message: result.logSaved
        ? `Data temperature diterima dan disimpan ke log (${result.saveReason})`
        : "Data temperature diterima dan di-broadcast via WebSocket",
      data: result,
    });
  } catch (err) {
    console.error("❌ Error processing temperature:", err.message);
    res.status(500).json({
      error: "Gagal memproses data temperature",
      detail: err.message,
    });
  }
};

/**
 * GET /api/temperature-ws/state
 * Get current temperature monitoring state untuk user
 */
export const getStateWs = async (req, res) => {
  const { uid } = req.user;

  try {
    const state = getTemperatureStateWs(uid);
    res.json({
      success: true,
      userId: uid,
      state,
    });
  } catch (err) {
    console.error("❌ Error getting state:", err.message);
    res.status(500).json({
      error: "Gagal mengambil state",
      detail: err.message,
    });
  }
};

/**
 * POST /api/temperature-ws/config
 * Update konfigurasi temperature monitoring untuk user
 * Body: { threshold?: number, saveIntervalMinutes?: number }
 */
export const updateConfigWs = async (req, res) => {
  const { threshold, saveIntervalMinutes } = req.body;
  const { uid } = req.user;

  try {
    const updates = {};

    if (threshold !== undefined) {
      if (typeof threshold !== "number" || threshold <= 0) {
        return res.status(400).json({
          error: "Threshold harus berupa number positif",
        });
      }
      setThresholdWs(uid, threshold);
      updates.threshold = threshold;
    }

    if (saveIntervalMinutes !== undefined) {
      if (typeof saveIntervalMinutes !== "number" || saveIntervalMinutes <= 0) {
        return res.status(400).json({
          error: "saveIntervalMinutes harus berupa number positif",
        });
      }
      setSaveIntervalWs(uid, saveIntervalMinutes);
      updates.saveIntervalMinutes = saveIntervalMinutes;
    }

    const newState = getTemperatureStateWs(uid);

    res.json({
      success: true,
      message: "Konfigurasi berhasil diupdate",
      userId: uid,
      updated: updates,
      currentState: newState,
    });
  } catch (err) {
    console.error("❌ Error updating config:", err.message);
    res.status(500).json({
      error: "Gagal update konfigurasi",
      detail: err.message,
    });
  }
};

/**
 * POST /api/temperature-ws/reset
 * Reset temperature state untuk user
 */
export const resetStateWs = async (req, res) => {
  const { uid } = req.user;

  try {
    const state = resetTemperatureStateWs(uid);
    res.json({
      success: true,
      message: "State berhasil direset",
      userId: uid,
      state,
    });
  } catch (err) {
    console.error("❌ Error resetting state:", err.message);
    res.status(500).json({
      error: "Gagal reset state",
      detail: err.message,
    });
  }
};

/**
 * POST /api/temperature-ws/bulk
 * Terima multiple data sekaligus (untuk testing spike detection)
 * Body: { data: [{ temperature: number, humidity: number }, ...] }
 */
export const receiveBulkDataWs = async (req, res) => {
  const { data } = req.body;
  const { uid, name, email } = req.user;

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({
      error: "Data tidak valid",
      message: "Body harus berisi array 'data' dengan minimal 1 item",
    });
  }

  try {
    // Simpan user jika belum ada
    if (name && email) {
      await saveUserIfNotExists(uid, { name, email });
    }

    const results = [];
    for (const item of data) {
      if (item.temperature !== undefined && item.humidity !== undefined) {
        const result = await processTemperatureDataWs(
          uid,
          {
            temperature: item.temperature,
            humidity: item.humidity,
          },
          req.wssClients
        );
        results.push(result);

        // Small delay untuk simulate real data stream
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      message: `${results.length} data berhasil diproses`,
      results,
    });
  } catch (err) {
    console.error("❌ Error processing bulk data:", err.message);
    res.status(500).json({
      error: "Gagal memproses bulk data",
      detail: err.message,
    });
  }
};

/**
 * POST /api/temperature-ws/simulate
 * Simulasi data temperature untuk testing (auto generate data)
 * Body: { count: number, baseTemp: number, baseHumidity: number, includeSpike?: boolean }
 */
export const simulateDataWs = async (req, res) => {
  const {
    count = 5,
    baseTemp = 28,
    baseHumidity = 70,
    includeSpike = true,
  } = req.body;
  const { uid, name, email } = req.user;

  try {
    // Simpan user jika belum ada
    if (name && email) {
      await saveUserIfNotExists(uid, { name, email });
    }

    const results = [];

    for (let i = 0; i < count; i++) {
      // Generate random variation
      let temp = baseTemp + (Math.random() * 2 - 1); // ±1°C variation
      let hum = baseHumidity + (Math.random() * 4 - 2); // ±2% variation

      // Include spike di tengah-tengah jika diminta
      if (includeSpike && i === Math.floor(count / 2)) {
        temp = baseTemp + 10; // Spike +10°C
        hum = baseHumidity + 15;
      }

      temp = Math.round(temp * 10) / 10;
      hum = Math.round(hum * 10) / 10;

      const result = await processTemperatureDataWs(
        uid,
        { temperature: temp, humidity: hum },
        req.wssClients
      );

      results.push({
        index: i + 1,
        temperature: temp,
        humidity: hum,
        ...result,
      });

      // Delay antar data
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const savedCount = results.filter((r) => r.logSaved).length;
    const spikeCount = results.filter(
      (r) => r.saveReason === "spike_detected"
    ).length;

    res.json({
      success: true,
      message: `Simulasi selesai: ${count} data diproses, ${savedCount} disimpan, ${spikeCount} spike detected`,
      summary: {
        totalProcessed: count,
        totalSaved: savedCount,
        spikeDetected: spikeCount,
      },
      results,
    });
  } catch (err) {
    console.error("❌ Error simulating data:", err.message);
    res.status(500).json({
      error: "Gagal simulasi data",
      detail: err.message,
    });
  }
};
