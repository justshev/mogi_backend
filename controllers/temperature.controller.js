import {
  processTemperatureData,
  getTemperatureState,
  setThreshold,
  setSaveInterval,
  resetTemperatureState,
} from "../services/temperature.service.js";
import { saveUserIfNotExists } from "../services/prisma.service.js";
import WebSocket from "ws";

/**
 * POST /api/temperature/data
 * Terima data temperature dari Arduino (via Postman untuk testing)
 * Body: { temperature: number, humidity: number }
 */
export const receiveTemperatureData = async (req, res) => {
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

    // Process temperature data
    const result = await processTemperatureData(uid, { temperature, humidity });

    // Broadcast ke WebSocket clients jika ada
    if (req.wssClients && req.wssClients.length > 0) {
      const wsMessage = JSON.stringify({
        type: "TEMPERATURE_UPDATE",
        userId: uid,
        data: {
          temperature,
          humidity,
          timestamp: new Date().toISOString(),
        },
      });

      req.wssClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(wsMessage);
        }
      });
    }

    res.json({
      success: true,
      message: result.logSaved
        ? `Data temperature diterima dan disimpan ke log (${result.saveReason})`
        : "Data temperature diterima dan dipush ke realtime",
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
 * GET /api/temperature/state
 * Get current temperature monitoring state
 */
export const getState = async (req, res) => {
  try {
    const state = getTemperatureState();
    res.json({
      success: true,
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
 * POST /api/temperature/config
 * Update konfigurasi temperature monitoring
 * Body: { threshold?: number, saveIntervalMinutes?: number }
 */
export const updateConfig = async (req, res) => {
  const { threshold, saveIntervalMinutes } = req.body;

  try {
    const updates = {};

    if (threshold !== undefined) {
      if (typeof threshold !== "number" || threshold <= 0) {
        return res.status(400).json({
          error: "Threshold harus berupa number positif",
        });
      }
      setThreshold(threshold);
      updates.threshold = threshold;
    }

    if (saveIntervalMinutes !== undefined) {
      if (typeof saveIntervalMinutes !== "number" || saveIntervalMinutes <= 0) {
        return res.status(400).json({
          error: "saveIntervalMinutes harus berupa number positif",
        });
      }
      setSaveInterval(saveIntervalMinutes);
      updates.saveIntervalMinutes = saveIntervalMinutes;
    }

    const newState = getTemperatureState();

    res.json({
      success: true,
      message: "Konfigurasi berhasil diupdate",
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
 * POST /api/temperature/reset
 * Reset temperature state
 */
export const resetState = async (req, res) => {
  try {
    const state = resetTemperatureState();
    res.json({
      success: true,
      message: "State berhasil direset",
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
 * POST /api/temperature/bulk
 * Terima multiple data sekaligus (untuk testing)
 * Body: { data: [{ temperature: number, humidity: number }, ...] }
 */
export const receiveBulkData = async (req, res) => {
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
        const result = await processTemperatureData(uid, {
          temperature: item.temperature,
          humidity: item.humidity,
        });
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
