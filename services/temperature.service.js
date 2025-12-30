import { supabaseAdmin } from "../supabase.js";
import prisma from "../lib/prisma.js";

// In-memory state untuk tracking temperature
const temperatureState = {
  lastSavedAt: null, // Timestamp terakhir kali data disimpan
  lastTemperature: null, // Temperature terakhir
  lastHumidity: null, // Humidity terakhir
  threshold: 5, // Threshold untuk mendeteksi lonjakan (dalam derajat Celsius)
  saveInterval: 30 * 60 * 1000, // 30 menit dalam milliseconds
};

// Table name di Supabase Realtime Database
const REALTIME_TABLE = "temperature_realtime";

/**
 * Cek apakah temperature mengalami lonjakan
 */
const isTemperatureSpike = (currentTemp) => {
  if (temperatureState.lastTemperature === null) {
    return false;
  }

  const diff = Math.abs(currentTemp - temperatureState.lastTemperature);
  return diff >= temperatureState.threshold;
};

/**
 * Cek apakah sudah waktunya menyimpan data (30 menit)
 */
const shouldSaveByInterval = () => {
  if (temperatureState.lastSavedAt === null) {
    return true;
  }

  const now = Date.now();
  const elapsed = now - temperatureState.lastSavedAt;
  return elapsed >= temperatureState.saveInterval;
};

/**
 * Simpan data temperature ke Supabase Realtime (untuk streaming ke app)
 */
export const pushToRealtimeDatabase = async (userId, data) => {
  try {
    const { temperature, humidity } = data;

    // Upsert ke table realtime - hanya simpan 1 record per user (latest)
    const { data: result, error } = await supabaseAdmin
      .from(REALTIME_TABLE)
      .upsert(
        {
          user_id: userId,
          temperature,
          humidity,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select();

    if (error) {
      console.error("❌ Error pushing to realtime:", error.message);
      throw error;
    }

    return result;
  } catch (err) {
    console.error("❌ Error in pushToRealtimeDatabase:", err.message);
    throw err;
  }
};

/**
 * Simpan data temperature ke database (logs)
 */
export const saveTemperatureLog = async (userId, data) => {
  try {
    const log = await prisma.log.create({
      data: {
        userId: userId,
        temperature: data.temperature,
        humidity: data.humidity,
      },
    });

    // Update state
    temperatureState.lastSavedAt = Date.now();

    console.log(`✅ Log saved for user ${userId}:`, log);
    return log;
  } catch (err) {
    console.error("❌ Error saving temperature log:", err.message);
    throw err;
  }
};

/**
 * Process incoming temperature data
 * - Push ke realtime database untuk streaming
 * - Simpan ke DB jika ada lonjakan atau sudah 30 menit
 */
export const processTemperatureData = async (userId, data) => {
  const { temperature, humidity } = data;

  // 1. Push ke Supabase Realtime Database
  await pushToRealtimeDatabase(userId, data);

  // 2. Cek apakah perlu simpan ke database
  const isSpike = isTemperatureSpike(temperature);
  const shouldSaveByTime = shouldSaveByInterval();

  let savedLog = null;
  let saveReason = null;

  if (isSpike) {
    // Ada lonjakan temperature - simpan langsung
    savedLog = await saveTemperatureLog(userId, data);
    saveReason = "spike_detected";
    console.log(
      `🔥 Temperature spike detected! ${temperatureState.lastTemperature}°C -> ${temperature}°C`
    );
  } else if (shouldSaveByTime) {
    // Sudah 30 menit - simpan data
    savedLog = await saveTemperatureLog(userId, data);
    saveReason = "interval_30min";
    console.log(`⏰ 30 minutes interval - saving log`);
  }

  // Update state untuk tracking
  temperatureState.lastTemperature = temperature;
  temperatureState.lastHumidity = humidity;

  return {
    realtimePushed: true,
    logSaved: savedLog !== null,
    saveReason,
    log: savedLog,
    currentState: {
      temperature,
      humidity,
      lastSavedAt: temperatureState.lastSavedAt
        ? new Date(temperatureState.lastSavedAt).toISOString()
        : null,
      nextSaveIn: temperatureState.lastSavedAt
        ? Math.max(
            0,
            temperatureState.saveInterval -
              (Date.now() - temperatureState.lastSavedAt)
          ) / 1000
        : 0,
    },
  };
};

/**
 * Get current temperature state
 */
export const getTemperatureState = () => {
  return {
    ...temperatureState,
    lastSavedAtFormatted: temperatureState.lastSavedAt
      ? new Date(temperatureState.lastSavedAt).toISOString()
      : null,
    nextSaveInSeconds: temperatureState.lastSavedAt
      ? Math.max(
          0,
          temperatureState.saveInterval -
            (Date.now() - temperatureState.lastSavedAt)
        ) / 1000
      : 0,
  };
};

/**
 * Update temperature threshold
 */
export const setThreshold = (newThreshold) => {
  temperatureState.threshold = newThreshold;
  return temperatureState.threshold;
};

/**
 * Update save interval (dalam menit)
 */
export const setSaveInterval = (minutes) => {
  temperatureState.saveInterval = minutes * 60 * 1000;
  return temperatureState.saveInterval;
};

/**
 * Reset temperature state
 */
export const resetTemperatureState = () => {
  temperatureState.lastSavedAt = null;
  temperatureState.lastTemperature = null;
  temperatureState.lastHumidity = null;
  return temperatureState;
};

/**
 * Subscribe to realtime updates (untuk dipanggil dari client/app)
 * Note: Ini biasanya dipanggil dari frontend, bukan backend
 */
export const getRealtimeChannel = (userId, callback) => {
  const channel = supabaseAdmin
    .channel(`temperature_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: REALTIME_TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("📡 Realtime update received:", payload);
        if (callback) callback(payload);
      }
    )
    .subscribe();

  return channel;
};
