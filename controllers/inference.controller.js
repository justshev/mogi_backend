/**
 * Inference Controller
 *
 * Orchestrates the complete inference pipeline:
 * 1. Fetch and aggregate sensor logs
 * 2. Store aggregated features in feature store
 * 3. Send features to FastAPI for ML inference
 * 4. Store and return prediction results
 *
 * All endpoints require authentication.
 * Responses are translated to Bahasa Indonesia.
 */

import {
  aggregateRecentLogs,
  getFeatureSummary,
  WINDOW_TYPES,
} from "../services/feature-aggregation.service.js";
import {
  computeAndStoreFeatures,
  getFeaturesForInference,
  storeInferenceResult,
  getInferenceHistory,
  getLatestFeatures,
} from "../services/feature-store.service.js";
import {
  requestFullPrediction,
  requestHarvestPrediction,
  requestRiskPrediction,
  requestAnomalyDetection,
  checkHealth,
  getCircuitStatus,
} from "../services/inference-client.service.js";

/**
 * Translate risk level to Indonesian
 */
const translateRiskLevel = (level) => {
  const translations = {
    low: "Rendah",
    medium: "Sedang",
    high: "Tinggi",
    critical: "Kritis",
  };
  return translations[level] || level;
};

/**
 * Translate recommendations to Indonesian
 */
const translateRecommendations = (recommendations) => {
  const translations = {
    // Temperature
    "🌡️ Temperature is high (>28°C). Improve ventilation or add cooling.":
      "🌡️ Suhu tinggi (>28°C). Perbaiki ventilasi atau tambah pendingin.",
    "🔥 Temperature is critically high (>30°C). Immediate cooling required!":
      "🔥 Suhu sangat tinggi (>30°C). Perlu pendinginan segera!",
    "❄️ Temperature is low (<18°C). Consider adding heating.":
      "❄️ Suhu rendah (<18°C). Pertimbangkan menambah pemanas.",

    // Humidity
    "💧 Humidity is low (<80%). Increase misting frequency or add humidifier.":
      "💧 Kelembaban rendah (<80%). Tingkatkan frekuensi penyiraman atau tambah humidifier.",
    "💨 Humidity is very high (>95%). Improve air circulation to prevent mold.":
      "💨 Kelembaban sangat tinggi (>95%). Perbaiki sirkulasi udara untuk mencegah jamur liar.",

    // Warmth
    "🔥 Heat level is high (>32°C). Reduce heat sources in growing area.":
      "🔥 Tingkat panas tinggi (>32°C). Kurangi sumber panas di area budidaya.",

    // Risk
    "⚠️ High failure risk detected. Review all environmental conditions immediately.":
      "⚠️ Risiko gagal panen tinggi terdeteksi. Periksa semua kondisi lingkungan segera.",

    // Anomaly
    "🚨 Unusual sensor readings detected. Verify sensor calibration and placement.":
      "🚨 Pembacaan sensor tidak wajar. Periksa kalibrasi dan posisi sensor.",

    // Optimal
    "✅ Environmental conditions are optimal for mushroom growth.":
      "✅ Kondisi lingkungan optimal untuk pertumbuhan jamur.",
  };

  return recommendations.map((rec) => translations[rec] || rec);
};

/**
 * Format prediction response to Indonesian
 * Now handles anomaly_reasons and severity from FastAPI
 */
const formatPredictionResponse = (prediction, features) => {
  const harvestDays = prediction.harvest_time_days;
  const harvestConfidence = prediction.harvest_confidence;
  const riskFail = prediction.risk_fail;
  const riskLevel = prediction.risk_level;
  const isAnomaly = prediction.anomaly;
  const anomalyReasons = prediction.anomaly_reasons || [];
  const severity = prediction.severity || "info";

  // Calculate harvest date
  const harvestDate = new Date();
  harvestDate.setDate(harvestDate.getDate() + Math.round(harvestDays));
  const harvestDateStr = harvestDate.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    // Prediksi Panen
    prediksiPanen: {
      hariLagi: Math.round(harvestDays),
      tanggalPanen: harvestDateStr,
      kepercayaan: harvestConfidence
        ? `${(harvestConfidence * 100).toFixed(0)}%`
        : null,
      pesan: `Jamur diprediksi siap panen dalam ${Math.round(harvestDays)} hari lagi (${harvestDateStr})`,
    },

    // Risiko Gagal Panen
    risikoGagal: {
      status: riskFail === 1 ? "Berisiko" : "Aman",
      level: translateRiskLevel(riskLevel),
      probabilitas: prediction.risk_probability
        ? `${(prediction.risk_probability * 100).toFixed(1)}%`
        : null,
      pesan:
        riskFail === 1
          ? "⚠️ Ada risiko gagal panen. Perhatikan kondisi lingkungan."
          : "✅ Risiko gagal panen rendah. Kondisi terkendali.",
    },

    // Deteksi Anomali
    anomali: {
      terdeteksi: isAnomaly,
      skor: prediction.anomaly_score,
      alasan: anomalyReasons, // New: list of reasons
      pesan: isAnomaly
        ? "🚨 Terdeteksi pembacaan sensor yang tidak normal!"
        : "✅ Pembacaan sensor normal.",
    },

    // Rekomendasi (sudah dalam bahasa Indonesia dari FastAPI)
    rekomendasi: prediction.recommendations || [],

    // Tingkat Keparahan
    tingkatKeparahan:
      severity === "critical"
        ? "Kritis"
        : severity === "warning"
          ? "Peringatan"
          : "Normal",

    // Kondisi Saat Ini
    kondisiSaatIni: {
      suhu: `${(features.tempAvg ?? features.temperature)?.toFixed(1) || "-"}°C`,
      suhuVariasi: features.tempStd
        ? `±${features.tempStd.toFixed(1)}°C`
        : null,
      kelembaban: `${(features.humidityAvg ?? features.humidity)?.toFixed(1) || "-"}%`,
      kelembabanVariasi: features.humidityStd
        ? `±${features.humidityStd.toFixed(1)}%`
        : null,
      panas: `${(features.warmthAvg ?? features.warmth)?.toFixed(1) || "-"}°C`,
      jumlahBaglog: features.baglog,
      jumlahSampel: features.sampleCount || null,
    },

    // Metadata
    versiModel: prediction.model_version,
    fiturDigunakan: prediction.features_used || null,
  };
};

/**
 * Full prediction endpoint
 * Aggregates recent logs, stores features, and gets all predictions
 *
 * POST /api/inference/predict
 * Body: { deviceId?: string, baglogCount?: number, hoursBack?: number }
 */
export const predict = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.uid;
  const { deviceId, baglogCount = 100, hoursBack = 24 } = req.body;

  try {
    // Step 1: Aggregate recent sensor logs
    const aggregatedFeatures = await aggregateRecentLogs(
      userId,
      deviceId,
      hoursBack,
    );

    if (!aggregatedFeatures || aggregatedFeatures.sampleCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Data sensor tidak ditemukan",
        message: `Tidak ada data sensor dalam ${hoursBack} jam terakhir. Pastikan sensor IoT mengirim data.`,
        saran: "Periksa koneksi sensor dan pipeline data",
      });
    }

    // Step 2: Prepare features for inference (10 features)
    const inferenceFeatures = {
      // Primary features
      tempAvg: aggregatedFeatures.tempAvg,
      humidityAvg: aggregatedFeatures.humidityAvg,
      warmthAvg: aggregatedFeatures.warmthAvg || 28, // Default if no warmth data
      baglog: baglogCount,

      // Stability features (std)
      tempStd: aggregatedFeatures.tempStd || 1.0,
      humidityStd: aggregatedFeatures.humidityStd || 2.0,
      warmthStd: aggregatedFeatures.warmthStd || 1.0,

      // Trend features
      tempTrend: aggregatedFeatures.tempTrend || 0.0,
      humidityTrend: aggregatedFeatures.humidityTrend || 0.0,
      warmthTrend: aggregatedFeatures.warmthTrend || 0.0,

      // Metadata for response formatting
      sampleCount: aggregatedFeatures.sampleCount,
    };

    // Step 3: Request prediction from FastAPI
    const predictionResult = await requestFullPrediction(inferenceFeatures);

    if (!predictionResult.success) {
      const fallback = generateFallbackPrediction(inferenceFeatures);
      return res.status(503).json({
        success: false,
        error: "Layanan prediksi tidak tersedia",
        message: predictionResult.error.message,
        circuitBreaker: getCircuitStatus(),
        prediksi: formatPredictionResponse(fallback, inferenceFeatures),
      });
    }

    // Step 4: Store inference result for audit trail
    const latencyMs = Date.now() - startTime;
    await storeInferenceResult(
      userId,
      deviceId,
      null, // featureStoreId - could be added if storing features first
      predictionResult.data,
      latencyMs,
    );

    // Step 5: Return comprehensive response in Indonesian
    const formattedPrediction = formatPredictionResponse(
      predictionResult.data,
      inferenceFeatures,
    );

    return res.status(200).json({
      success: true,
      message: "Prediksi berhasil",
      prediksi: formattedPrediction,
      // Keep raw data for debugging/advanced use
      raw: {
        prediction: predictionResult.data,
        features: {
          aggregated: {
            temp_avg: inferenceFeatures.tempAvg,
            humidity_avg: inferenceFeatures.humidityAvg,
            warmth_avg: inferenceFeatures.warmthAvg,
            baglog: inferenceFeatures.baglog,
            temp_std: inferenceFeatures.tempStd,
            humidity_std: inferenceFeatures.humidityStd,
            warmth_std: inferenceFeatures.warmthStd,
            temp_trend: inferenceFeatures.tempTrend,
            humidity_trend: inferenceFeatures.humidityTrend,
            warmth_trend: inferenceFeatures.warmthTrend,
          },
          metadata: {
            sampleCount: aggregatedFeatures.sampleCount,
            windowType: aggregatedFeatures.windowType,
            windowStart: aggregatedFeatures.windowStart,
            windowEnd: aggregatedFeatures.windowEnd,
            hoursBack,
          },
        },
      },
      performance: {
        totalLatencyMs: latencyMs,
        inferenceLatencyMs: predictionResult.latencyMs,
      },
    });
  } catch (error) {
    console.error("❌ Prediction error:", error);
    return res.status(500).json({
      success: false,
      error: "Kesalahan server internal",
      message: error.message,
      prediksi: null,
    });
  }
};

/**
 * Predict using stored features (faster, no aggregation)
 * Uses previously computed and stored features from feature store
 *
 * POST /api/inference/predict-stored
 * Body: { deviceId?: string, baglogCount?: number }
 */
export const predictFromStored = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.uid;
  const { deviceId, baglogCount = 100 } = req.body;

  try {
    // Get stored features
    const features = await getFeaturesForInference(
      userId,
      deviceId,
      baglogCount,
    );

    if (!features) {
      return res.status(404).json({
        success: false,
        error: "Fitur tersimpan tidak ditemukan",
        message:
          "Jalankan komputasi fitur terlebih dahulu atau gunakan endpoint /predict untuk agregasi real-time",
      });
    }

    // Request prediction
    const predictionResult = await requestFullPrediction(features);

    if (!predictionResult.success) {
      const fallback = generateFallbackPrediction(features);
      return res.status(503).json({
        success: false,
        error: "Layanan prediksi tidak tersedia",
        message: predictionResult.error.message,
        prediksi: formatPredictionResponse(fallback, features),
      });
    }

    // Store result
    const latencyMs = Date.now() - startTime;
    await storeInferenceResult(
      userId,
      deviceId,
      features.featureStoreId,
      predictionResult.data,
      latencyMs,
    );

    const formattedPrediction = formatPredictionResponse(
      predictionResult.data,
      features,
    );

    return res.status(200).json({
      success: true,
      message: "Prediksi berhasil",
      prediksi: formattedPrediction,
      raw: {
        prediction: predictionResult.data,
        features: {
          source: "feature_store",
          featureStoreId: features.featureStoreId,
          computedAt: features.computedAt,
        },
      },
      performance: {
        totalLatencyMs: latencyMs,
        inferenceLatencyMs: predictionResult.latencyMs,
      },
    });
  } catch (error) {
    console.error("❌ Prediction from stored error:", error);
    return res.status(500).json({
      success: false,
      error: "Kesalahan server internal",
      message: error.message,
    });
  }
};

/**
 * Compute and store features for a time window
 * Useful for scheduled feature computation jobs
 *
 * POST /api/inference/compute-features
 * Body: { deviceId?: string, windowType?: string, baglogCount?: number }
 */
export const computeFeatures = async (req, res) => {
  const userId = req.user.uid;
  const {
    deviceId,
    windowType = WINDOW_TYPES.HOURLY,
    baglogCount = 100,
  } = req.body;

  try {
    const storedFeatures = await computeAndStoreFeatures(
      userId,
      deviceId,
      windowType,
      baglogCount,
    );

    if (!storedFeatures) {
      return res.status(404).json({
        success: false,
        error: "No data to aggregate",
        message: `No sensor logs found for the current ${windowType} window`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Features computed and stored successfully",
      featureStoreId: storedFeatures.id,
      features: {
        windowType: storedFeatures.windowType,
        windowStart: storedFeatures.windowStart,
        windowEnd: storedFeatures.windowEnd,
        sampleCount: storedFeatures.sampleCount,
        temperature: {
          avg: storedFeatures.tempAvg,
          min: storedFeatures.tempMin,
          max: storedFeatures.tempMax,
        },
        humidity: {
          avg: storedFeatures.humidityAvg,
          min: storedFeatures.humidityMin,
          max: storedFeatures.humidityMax,
        },
        warmth: {
          avg: storedFeatures.warmthAvg,
          min: storedFeatures.warmthMin,
          max: storedFeatures.warmthMax,
        },
      },
    });
  } catch (error) {
    console.error("❌ Feature computation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get feature summary with data quality metrics
 *
 * GET /api/inference/features/summary
 * Query: { hoursBack?: number }
 */
export const getFeatures = async (req, res) => {
  const userId = req.user.uid;
  const hoursBack = parseInt(req.query.hoursBack) || 24;

  try {
    const summary = await getFeatureSummary(userId, hoursBack);

    return res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error("❌ Feature summary error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get inference history for the user
 *
 * GET /api/inference/history
 * Query: { limit?: number }
 */
export const getHistory = async (req, res) => {
  const userId = req.user.uid;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const history = await getInferenceHistory(userId, limit);

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("❌ History retrieval error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Health check for inference pipeline
 * Checks FastAPI connectivity and circuit breaker status
 *
 * GET /api/inference/health
 */
export const healthCheck = async (req, res) => {
  try {
    const fastapiHealth = await checkHealth();

    return res.status(fastapiHealth.healthy ? 200 : 503).json({
      success: fastapiHealth.healthy,
      services: {
        fastapi: fastapiHealth,
        circuitBreaker: getCircuitStatus(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generate fallback prediction when inference service is unavailable
 * Uses simple rule-based logic as a degraded experience
 * Returns Indonesian recommendations
 *
 * @param {object} features - Aggregated features
 * @returns {object} Fallback prediction
 */
const generateFallbackPrediction = (features) => {
  // Support both old and new field names for backwards compatibility
  const tempAvg = features.tempAvg ?? features.temperature ?? 25;
  const humidityAvg = features.humidityAvg ?? features.humidity ?? 85;
  const warmthAvg = features.warmthAvg ?? features.warmth ?? 26;
  const baglog = features.baglog ?? 200;
  const tempStd = features.tempStd ?? 0;
  const humidityStd = features.humidityStd ?? 0;
  const warmthStd = features.warmthStd ?? 0;
  const tempTrend = features.tempTrend ?? 0;
  const humidityTrend = features.humidityTrend ?? 0;
  const warmthTrend = features.warmthTrend ?? 0;

  // Simple rule-based fallback with Indonesian messages
  const recommendations = [];
  const anomalyReasons = [];

  // Temperature checks
  if (tempAvg > 28) {
    recommendations.push(
      "🌡️ Suhu tinggi (>28°C). Perbaiki ventilasi atau tambah pendingin.",
    );
    anomalyReasons.push("Suhu rata-rata di atas batas optimal (>28°C)");
  }
  if (tempAvg < 20) {
    recommendations.push(
      "❄️ Suhu rendah (<20°C). Pertimbangkan menambah pemanas.",
    );
    anomalyReasons.push("Suhu rata-rata di bawah batas optimal (<20°C)");
  }

  // Humidity checks
  if (humidityAvg < 80) {
    recommendations.push(
      "💧 Kelembaban rendah (<80%). Tingkatkan frekuensi penyiraman.",
    );
    anomalyReasons.push("Kelembaban rata-rata di bawah batas optimal (<80%)");
  }
  if (humidityAvg > 95) {
    recommendations.push(
      "💨 Kelembaban sangat tinggi (>95%). Perbaiki sirkulasi udara.",
    );
    anomalyReasons.push("Kelembaban rata-rata di atas batas optimal (>95%)");
  }

  // Warmth checks
  if (warmthAvg > 32) {
    recommendations.push(
      "🔥 Tingkat panas tinggi (>32°C). Kurangi sumber panas.",
    );
    anomalyReasons.push("Suhu hangat (warmth) melebihi batas aman (>32°C)");
  }

  // Stability checks (std)
  if (tempStd > 4.0) {
    recommendations.push(
      "📊 Suhu tidak stabil (variasi tinggi). Periksa sistem pendingin/pemanas.",
    );
    anomalyReasons.push("Variasi suhu tinggi menunjukkan kondisi tidak stabil");
  }
  if (humidityStd > 4.0) {
    recommendations.push("📊 Kelembaban tidak stabil. Periksa sistem irigasi.");
    anomalyReasons.push(
      "Variasi kelembaban tinggi menunjukkan kondisi tidak stabil",
    );
  }

  // Trend checks
  if (Math.abs(tempTrend) > 0.3) {
    const direction = tempTrend > 0 ? "naik" : "turun";
    recommendations.push(
      `📈 Suhu sedang ${direction} dengan cepat. Pantau dan sesuaikan.`,
    );
    anomalyReasons.push(`Tren suhu menunjukkan perubahan cepat (${direction})`);
  }
  if (Math.abs(humidityTrend) > 0.3) {
    const direction = humidityTrend > 0 ? "naik" : "turun";
    recommendations.push(
      `📈 Kelembaban sedang ${direction} dengan cepat. Periksa sistem irigasi.`,
    );
    anomalyReasons.push(
      `Tren kelembaban menunjukkan perubahan cepat (${direction})`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "✅ Kondisi terlihat normal berdasarkan analisis rule-based.",
    );
  }

  // Rough harvest estimation based on humidity (simplified)
  const estimatedHarvestDays = Math.max(
    20,
    40 - (humidityAvg - 70) / 5 - (tempAvg - 20) / 10,
  );

  // Risk assessment
  const isHighRisk =
    humidityAvg < 75 || tempAvg > 29 || warmthAvg > 33 || tempStd > 6.0;
  const isAnomaly = anomalyReasons.length > 0;

  return {
    isFallback: true,
    message: "Menggunakan prediksi rule-based (layanan ML tidak tersedia)",
    harvest_time_days: Math.round(estimatedHarvestDays),
    harvest_confidence: 0.5, // Low confidence for fallback
    risk_fail: isHighRisk ? 1 : 0,
    risk_level: isHighRisk ? "high" : "low",
    risk_probability: isHighRisk ? 0.7 : 0.2,
    anomaly: isAnomaly,
    anomaly_score: isAnomaly ? 0.7 : 0,
    anomaly_reasons: anomalyReasons,
    severity: isHighRisk ? "critical" : isAnomaly ? "warning" : "info",
    recommendations,
    model_version: "fallback-1.0",
    features_used: {
      temp_avg: tempAvg,
      humidity_avg: humidityAvg,
      warmth_avg: warmthAvg,
      baglog: baglog,
      temp_std: tempStd,
      humidity_std: humidityStd,
      warmth_std: warmthStd,
      temp_trend: tempTrend,
      humidity_trend: humidityTrend,
      warmth_trend: warmthTrend,
    },
  };
};

export default {
  predict,
  predictFromStored,
  computeFeatures,
  getFeatures,
  getHistory,
  healthCheck,
};
