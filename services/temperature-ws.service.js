import prisma from "../lib/prisma.js";

// In-memory state untuk tracking temperature (per user)
const temperatureStates = new Map();

// Default config
const DEFAULT_CONFIG = {
  threshold: 5, // Threshold untuk mendeteksi lonjakan (dalam derajat Celsius)
  saveInterval: 30 * 60 * 1000, // 30 menit dalam milliseconds
};

/**
 * Get atau create temperature state untuk user
 */
const getOrCreateState = (userId) => {
  if (!temperatureStates.has(userId)) {
    temperatureStates.set(userId, {
      lastSavedAt: null,
      lastTemperature: null,
      lastHumidity: null,
      threshold: DEFAULT_CONFIG.threshold,
      saveInterval: DEFAULT_CONFIG.saveInterval,
    });
  }
  return temperatureStates.get(userId);
};

/**
 * Cek apakah temperature mengalami lonjakan
 */
const isTemperatureSpike = (userId, currentTemp) => {
  const state = getOrCreateState(userId);

  if (state.lastTemperature === null) {
    return false;
  }

  const diff = Math.abs(currentTemp - state.lastTemperature);
  return diff >= state.threshold;
};

/**
 * Cek apakah sudah waktunya menyimpan data (30 menit)
 */
const shouldSaveByInterval = (userId) => {
  const state = getOrCreateState(userId);

  if (state.lastSavedAt === null) {
    return true;
  }

  const now = Date.now();
  const elapsed = now - state.lastSavedAt;
  return elapsed >= state.saveInterval;
};

/**
 * Broadcast data ke semua WebSocket clients
 */
export const broadcastToClients = (clients, data) => {
  const message = JSON.stringify(data);

  clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN = 1
      client.send(message);
    }
  });

  console.log(`📡 Broadcasted to ${clients.length} clients`);
};

/**
 * Simpan data temperature ke database (logs)
 */
export const saveTemperatureLogWs = async (userId, data) => {
  try {
    const log = await prisma.log.create({
      data: {
        userId: userId,
        temperature: data.temperature,
        humidity: data.humidity,
      },
    });

    // Update state
    const state = getOrCreateState(userId);
    state.lastSavedAt = Date.now();

    console.log(`✅ Log saved for user ${userId}:`, log);
    return log;
  } catch (err) {
    console.error("❌ Error saving temperature log:", err.message);
    throw err;
  }
};

/**
 * Process incoming temperature data (WebSocket version)
 * - Broadcast ke semua WebSocket clients
 * - Simpan ke DB jika ada lonjakan atau sudah 30 menit
 */
export const processTemperatureDataWs = async (userId, data, wsClients) => {
  const { temperature, humidity } = data;
  const state = getOrCreateState(userId);

  // 1. Broadcast ke WebSocket clients
  const wsMessage = {
    type: "TEMPERATURE_UPDATE",
    userId: userId,
    data: {
      temperature,
      humidity,
      timestamp: new Date().toISOString(),
    },
  };

  if (wsClients && wsClients.length > 0) {
    broadcastToClients(wsClients, wsMessage);
  }

  // 2. Cek apakah perlu simpan ke database
  const isSpike = isTemperatureSpike(userId, temperature);
  const shouldSaveByTime = shouldSaveByInterval(userId);

  let savedLog = null;
  let saveReason = null;

  if (isSpike) {
    // Ada lonjakan temperature - simpan langsung
    savedLog = await saveTemperatureLogWs(userId, data);
    saveReason = "spike_detected";
    console.log(
      `🔥 Temperature spike detected! ${state.lastTemperature}°C -> ${temperature}°C`
    );
  } else if (shouldSaveByTime) {
    // Sudah 30 menit - simpan data
    savedLog = await saveTemperatureLogWs(userId, data);
    saveReason = "interval_30min";
    console.log(`⏰ 30 minutes interval - saving log`);
  }

  // Update state untuk tracking
  state.lastTemperature = temperature;
  state.lastHumidity = humidity;

  return {
    broadcasted: wsClients ? wsClients.length : 0,
    logSaved: savedLog !== null,
    saveReason,
    log: savedLog,
    currentState: {
      temperature,
      humidity,
      lastSavedAt: state.lastSavedAt
        ? new Date(state.lastSavedAt).toISOString()
        : null,
      nextSaveIn: state.lastSavedAt
        ? Math.max(0, state.saveInterval - (Date.now() - state.lastSavedAt)) /
          1000
        : 0,
    },
  };
};

/**
 * Get current temperature state untuk user
 */
export const getTemperatureStateWs = (userId) => {
  const state = getOrCreateState(userId);

  return {
    ...state,
    lastSavedAtFormatted: state.lastSavedAt
      ? new Date(state.lastSavedAt).toISOString()
      : null,
    nextSaveInSeconds: state.lastSavedAt
      ? Math.max(0, state.saveInterval - (Date.now() - state.lastSavedAt)) /
        1000
      : 0,
  };
};

/**
 * Update temperature threshold untuk user
 */
export const setThresholdWs = (userId, newThreshold) => {
  const state = getOrCreateState(userId);
  state.threshold = newThreshold;
  return state.threshold;
};

/**
 * Update save interval untuk user (dalam menit)
 */
export const setSaveIntervalWs = (userId, minutes) => {
  const state = getOrCreateState(userId);
  state.saveInterval = minutes * 60 * 1000;
  return state.saveInterval;
};

/**
 * Reset temperature state untuk user
 */
export const resetTemperatureStateWs = (userId) => {
  const state = getOrCreateState(userId);
  state.lastSavedAt = null;
  state.lastTemperature = null;
  state.lastHumidity = null;
  return state;
};

/**
 * Get all connected users' states (untuk debugging)
 */
export const getAllStates = () => {
  const allStates = {};
  temperatureStates.forEach((state, oderId) => {
    allStates[userId] = {
      ...state,
      lastSavedAtFormatted: state.lastSavedAt
        ? new Date(state.lastSavedAt).toISOString()
        : null,
    };
  });
  return allStates;
};
