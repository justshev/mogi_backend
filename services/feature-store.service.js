/**
 * Feature Store Service
 *
 * Manages the persistence and retrieval of aggregated features.
 * Implements the feature store pattern for ML pipelines.
 *
 * Key responsibilities:
 * - Store computed features with proper indexing
 * - Retrieve latest features for inference
 * - Handle feature versioning and TTL
 * - Provide efficient batch operations
 */

import prisma from "../lib/prisma.js";
import {
  WINDOW_TYPES,
  aggregateLogsSQL,
  getWindowBoundaries,
} from "./feature-aggregation.service.js";

/**
 * Store aggregated features in the feature store
 * Uses upsert to handle duplicate window entries
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {object} features - Aggregated feature object
 * @returns {Promise<object>} Stored feature record
 */
export const storeFeatures = async (userId, deviceId, features) => {
  const {
    windowType,
    windowStart,
    windowEnd,
    sampleCount,
    tempAvg,
    tempMin,
    tempMax,
    tempStd,
    tempTrend,
    humidityAvg,
    humidityMin,
    humidityMax,
    humidityStd,
    humidityTrend,
    warmthAvg,
    warmthMin,
    warmthMax,
    warmthStd,
    warmthTrend,
    baglogCount = null,
  } = features;

  // Normalize deviceId for consistent handling (use empty string for unique constraint)
  const normalizedDeviceId = deviceId || "";

  const featureRecord = await prisma.featureStore.upsert({
    where: {
      userId_deviceId_windowType_windowStart: {
        userId,
        deviceId: normalizedDeviceId,
        windowType,
        windowStart: new Date(windowStart),
      },
    },
    update: {
      windowEnd: new Date(windowEnd),
      sampleCount,
      tempAvg,
      tempMin,
      tempMax,
      tempStd,
      tempTrend,
      humidityAvg,
      humidityMin,
      humidityMax,
      humidityStd,
      humidityTrend,
      warmthAvg,
      warmthMin,
      warmthMax,
      warmthStd,
      warmthTrend,
      baglogCount,
    },
    create: {
      userId,
      deviceId: normalizedDeviceId, // Empty string if no device (for unique constraint)
      windowType,
      windowStart: new Date(windowStart),
      windowEnd: new Date(windowEnd),
      sampleCount,
      tempAvg,
      tempMin,
      tempMax,
      tempStd,
      tempTrend,
      humidityAvg,
      humidityMin,
      humidityMax,
      humidityStd,
      humidityTrend,
      warmthAvg,
      warmthMin,
      warmthMax,
      warmthStd,
      warmthTrend,
      baglogCount,
    },
  });

  return featureRecord;
};

/**
 * Get the latest stored features for a user
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {string} windowType - Window type filter (optional)
 * @returns {Promise<object|null>} Latest feature record or null
 */
export const getLatestFeatures = async (
  userId,
  deviceId = null,
  windowType = null,
) => {
  const whereClause = {
    userId,
    ...(deviceId && { deviceId }),
    ...(windowType && { windowType }),
  };

  const feature = await prisma.featureStore.findFirst({
    where: whereClause,
    orderBy: { windowStart: "desc" },
  });

  return feature;
};

/**
 * Get features for a specific time range
 *
 * @param {string} userId - User ID
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @param {string} windowType - Window type filter (optional)
 * @returns {Promise<object[]>} Array of feature records
 */
export const getFeaturesByTimeRange = async (
  userId,
  startDate,
  endDate,
  windowType = null,
) => {
  const whereClause = {
    userId,
    windowStart: {
      gte: startDate,
    },
    windowEnd: {
      lte: endDate,
    },
    ...(windowType && { windowType }),
  };

  const features = await prisma.featureStore.findMany({
    where: whereClause,
    orderBy: { windowStart: "asc" },
  });

  return features;
};

/**
 * Compute and store features for the current time window
 * Combines aggregation and storage in a single operation
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {string} windowType - Window type ('hourly' or 'daily')
 * @param {number} baglogCount - Optional baglog count for the window
 * @returns {Promise<object>} Stored feature record
 */
export const computeAndStoreFeatures = async (
  userId,
  deviceId = null,
  windowType = WINDOW_TYPES.HOURLY,
  baglogCount = null,
) => {
  const { windowStart, windowEnd } = getWindowBoundaries(windowType);

  const features = await aggregateLogsSQL(
    userId,
    deviceId,
    windowStart,
    windowEnd,
  );

  if (!features || features.sampleCount === 0) {
    return null;
  }

  const enrichedFeatures = {
    ...features,
    windowType,
    windowStart,
    windowEnd,
    baglogCount,
  };

  return await storeFeatures(userId, deviceId, enrichedFeatures);
};

/**
 * Get features formatted for ML inference
 * Returns only the numerical features required by the model
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {number} baglogCount - Number of mushroom bags
 * @returns {Promise<object|null>} Inference-ready feature object
 */
export const getFeaturesForInference = async (
  userId,
  deviceId = null,
  baglogCount = 100,
) => {
  const latest = await getLatestFeatures(userId, deviceId);

  if (!latest) {
    return null;
  }

  // Return only the features needed by the ML model
  // These map to the model's expected input format
  return {
    // Core features (using averages for model input)
    temperature: latest.tempAvg,
    humidity: latest.humidityAvg,
    warmth: latest.warmthAvg,
    baglog: latest.baglogCount || baglogCount,

    // Extended features for advanced models
    features: {
      temp: {
        avg: latest.tempAvg,
        min: latest.tempMin,
        max: latest.tempMax,
        std: latest.tempStd,
        trend: latest.tempTrend,
      },
      humidity: {
        avg: latest.humidityAvg,
        min: latest.humidityMin,
        max: latest.humidityMax,
        std: latest.humidityStd,
        trend: latest.humidityTrend,
      },
      warmth: {
        avg: latest.warmthAvg,
        min: latest.warmthMin,
        max: latest.warmthMax,
        std: latest.warmthStd,
        trend: latest.warmthTrend,
      },
      sampleCount: latest.sampleCount,
      baglog: latest.baglogCount || baglogCount,
    },

    // Metadata
    featureStoreId: latest.id,
    windowType: latest.windowType,
    windowStart: latest.windowStart,
    windowEnd: latest.windowEnd,
    computedAt: latest.createdAt,
  };
};

/**
 * Store inference results for audit trail
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {string} featureStoreId - Reference to feature store record
 * @param {object} inferenceResult - Result from ML inference
 * @param {number} latencyMs - Request latency in milliseconds
 * @returns {Promise<object>} Stored inference result
 */
export const storeInferenceResult = async (
  userId,
  deviceId,
  featureStoreId,
  inferenceResult,
  latencyMs = null,
) => {
  const {
    harvest_time_days,
    risk_fail,
    risk_probability,
    anomaly,
    anomaly_score,
    recommendations,
    model_version,
  } = inferenceResult;

  const result = await prisma.inferenceResult.create({
    data: {
      userId,
      deviceId: deviceId || null,
      featureStoreId: featureStoreId || null,
      modelVersion: model_version || "1.0.0",
      harvestTimeDays: harvest_time_days,
      riskFail: risk_fail,
      riskProbability: risk_probability || null,
      isAnomaly: anomaly,
      anomalyScore: anomaly_score || null,
      recommendations: JSON.stringify(recommendations),
      requestLatencyMs: latencyMs,
    },
  });

  return result;
};

/**
 * Get inference history for a user
 *
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<object[]>} Array of inference result records
 */
export const getInferenceHistory = async (userId, limit = 50) => {
  const results = await prisma.inferenceResult.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Parse recommendations JSON
  return results.map((r) => ({
    ...r,
    recommendations: JSON.parse(r.recommendations),
  }));
};

/**
 * Clean up old feature store entries
 * Useful for maintaining database size
 *
 * @param {number} daysToKeep - Number of days to retain features
 * @returns {Promise<number>} Number of deleted records
 */
export const cleanupOldFeatures = async (daysToKeep = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const { count } = await prisma.featureStore.deleteMany({
    where: {
      windowEnd: {
        lt: cutoffDate,
      },
    },
  });

  return count;
};

export default {
  storeFeatures,
  getLatestFeatures,
  getFeaturesByTimeRange,
  computeAndStoreFeatures,
  getFeaturesForInference,
  storeInferenceResult,
  getInferenceHistory,
  cleanupOldFeatures,
};
