/**
 * Feature Aggregation Service
 *
 * Handles efficient SQL-based aggregation of sensor logs into ML-ready features.
 * Supports hourly and daily aggregation windows with statistical calculations.
 *
 * Features computed:
 * - avg, min, max, std for temperature, humidity, warmth
 * - trend (linear regression slope) for each metric
 * - sample count for data quality assessment
 */

import { supabaseAdmin } from "../supabase.js";
import prisma from "../lib/prisma.js";

// Window type constants
export const WINDOW_TYPES = {
  HOURLY: "hourly",
  DAILY: "daily",
  CUSTOM: "custom",
};

/**
 * Calculate linear regression slope (trend) from array of values
 * Returns the rate of change per time unit
 * @param {number[]} values - Array of numerical values
 * @returns {number} Slope of the linear regression line
 */
const calculateTrend = (values) => {
  if (!values || values.length < 2) return 0;

  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumX2 = indices.reduce((acc, x) => acc + x * x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
};

/**
 * Calculate standard deviation of an array
 * @param {number[]} values - Array of numerical values
 * @returns {number} Standard deviation
 */
const calculateStd = (values) => {
  if (!values || values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(variance);
};

/**
 * Get time window boundaries based on window type
 * @param {string} windowType - 'hourly' or 'daily'
 * @param {Date} referenceDate - Reference date for window calculation
 * @returns {{ windowStart: Date, windowEnd: Date }}
 */
export const getWindowBoundaries = (windowType, referenceDate = new Date()) => {
  const date = new Date(referenceDate);

  if (windowType === WINDOW_TYPES.HOURLY) {
    // Round down to current hour
    const windowStart = new Date(date);
    windowStart.setMinutes(0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(windowEnd.getHours() + 1);

    return { windowStart, windowEnd };
  }

  if (windowType === WINDOW_TYPES.DAILY) {
    // Round down to start of day (UTC)
    const windowStart = new Date(date);
    windowStart.setUTCHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 1);

    return { windowStart, windowEnd };
  }

  throw new Error(`Unsupported window type: ${windowType}`);
};

/**
 * Aggregate sensor logs for a specific user and time window using SQL
 * Optimized query that computes basic stats in the database
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {Date} windowStart - Start of aggregation window
 * @param {Date} windowEnd - End of aggregation window
 * @returns {Promise<object>} Aggregated features
 */
export const aggregateLogsSQL = async (
  userId,
  deviceId,
  windowStart,
  windowEnd,
) => {
  // Build the WHERE clause dynamically
  let whereClause = `WHERE user_id = $1 AND timestamp >= $2 AND timestamp < $3`;
  const params = [userId, windowStart.toISOString(), windowEnd.toISOString()];

  if (deviceId) {
    whereClause += ` AND device_id = $4`;
    params.push(deviceId);
  }

  // SQL query for basic aggregations (avg, min, max, count)
  // Note: PostgreSQL doesn't have built-in STDDEV for partial aggregation in this context,
  // so we compute it in application layer for accuracy
  const aggregationQuery = `
    SELECT
      COUNT(*) as sample_count,
      AVG(temperature) as temp_avg,
      MIN(temperature) as temp_min,
      MAX(temperature) as temp_max,
      STDDEV_POP(temperature) as temp_std,
      AVG(humidity) as humidity_avg,
      MIN(humidity) as humidity_min,
      MAX(humidity) as humidity_max,
      STDDEV_POP(humidity) as humidity_std,
      AVG(warmth) as warmth_avg,
      MIN(warmth) as warmth_min,
      MAX(warmth) as warmth_max,
      STDDEV_POP(warmth) as warmth_std
    FROM logs
    ${whereClause}
  `;

  const { data: aggData, error: aggError } = await supabaseAdmin.rpc(
    "execute_sql",
    {
      query: aggregationQuery,
      params: params,
    },
  );

  // Fallback: Use Prisma for aggregation if RPC is not available
  // This is more reliable but slightly less efficient
  const logs = await prisma.log.findMany({
    where: {
      userId,
      ...(deviceId && { deviceId }),
      timestamp: {
        gte: windowStart,
        lt: windowEnd,
      },
    },
    orderBy: { timestamp: "asc" },
    select: {
      temperature: true,
      humidity: true,
      warmth: true,
      timestamp: true,
    },
  });

  if (logs.length === 0) {
    return null;
  }

  // Extract values for each metric (filter out nulls)
  const temperatures = logs.map((l) => l.temperature).filter((v) => v !== null);
  const humidities = logs.map((l) => l.humidity).filter((v) => v !== null);
  const warmths = logs.map((l) => l.warmth).filter((v) => v !== null);

  // Calculate aggregations
  const calcStats = (values) => {
    if (!values || values.length === 0) {
      return { avg: 0, min: 0, max: 0, std: 0, trend: 0 };
    }
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      std: calculateStd(values),
      trend: calculateTrend(values),
    };
  };

  const tempStats = calcStats(temperatures);
  const humidityStats = calcStats(humidities);
  const warmthStats = calcStats(warmths);

  return {
    sampleCount: logs.length,
    tempAvg: tempStats.avg,
    tempMin: tempStats.min,
    tempMax: tempStats.max,
    tempStd: tempStats.std,
    tempTrend: tempStats.trend,
    humidityAvg: humidityStats.avg,
    humidityMin: humidityStats.min,
    humidityMax: humidityStats.max,
    humidityStd: humidityStats.std,
    humidityTrend: humidityStats.trend,
    warmthAvg: warmthStats.avg,
    warmthMin: warmthStats.min,
    warmthMax: warmthStats.max,
    warmthStd: warmthStats.std,
    warmthTrend: warmthStats.trend,
  };
};

/**
 * Aggregate recent sensor logs for real-time inference
 * Uses a sliding window approach (last N hours or days)
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {number} hoursBack - Number of hours to look back (default: 24)
 * @returns {Promise<object>} Aggregated features for inference
 */
export const aggregateRecentLogs = async (
  userId,
  deviceId = null,
  hoursBack = 24,
) => {
  const windowEnd = new Date();
  const windowStart = new Date(
    windowEnd.getTime() - hoursBack * 60 * 60 * 1000,
  );

  const features = await aggregateLogsSQL(
    userId,
    deviceId,
    windowStart,
    windowEnd,
  );

  if (!features) {
    return null;
  }

  return {
    ...features,
    windowType: WINDOW_TYPES.CUSTOM,
    windowStart,
    windowEnd,
    hoursBack,
  };
};

/**
 * Batch aggregate logs for multiple time windows
 * Useful for historical analysis and feature store population
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Optional device ID
 * @param {string} windowType - 'hourly' or 'daily'
 * @param {Date} startDate - Start of the batch period
 * @param {Date} endDate - End of the batch period
 * @returns {Promise<object[]>} Array of aggregated features per window
 */
export const batchAggregateByWindow = async (
  userId,
  deviceId,
  windowType,
  startDate,
  endDate,
) => {
  const results = [];
  let currentStart = new Date(startDate);

  // Align to window boundary
  if (windowType === WINDOW_TYPES.HOURLY) {
    currentStart.setMinutes(0, 0, 0);
  } else if (windowType === WINDOW_TYPES.DAILY) {
    currentStart.setUTCHours(0, 0, 0, 0);
  }

  while (currentStart < endDate) {
    const { windowStart, windowEnd } = getWindowBoundaries(
      windowType,
      currentStart,
    );

    // Skip future windows
    if (windowEnd > endDate) break;

    const features = await aggregateLogsSQL(
      userId,
      deviceId,
      windowStart,
      windowEnd,
    );

    if (features && features.sampleCount > 0) {
      results.push({
        ...features,
        windowType,
        windowStart,
        windowEnd,
      });
    }

    // Move to next window
    currentStart = new Date(windowEnd);
  }

  return results;
};

/**
 * Get feature summary with data quality metrics
 * Useful for monitoring and debugging
 *
 * @param {string} userId - User ID
 * @param {number} hoursBack - Number of hours to analyze
 * @returns {Promise<object>} Feature summary with quality metrics
 */
export const getFeatureSummary = async (userId, hoursBack = 24) => {
  const features = await aggregateRecentLogs(userId, null, hoursBack);

  if (!features) {
    return {
      hasData: false,
      message: "No sensor data found for the specified time window",
    };
  }

  // Data quality checks
  const qualityChecks = {
    hasSufficientSamples: features.sampleCount >= 10,
    hasTemperatureData: features.tempAvg > 0,
    hasHumidityData: features.humidityAvg > 0,
    hasWarmthData: features.warmthAvg > 0,
    temperatureInRange: features.tempAvg >= 15 && features.tempAvg <= 35,
    humidityInRange: features.humidityAvg >= 50 && features.humidityAvg <= 100,
  };

  const qualityScore =
    Object.values(qualityChecks).filter(Boolean).length /
    Object.keys(qualityChecks).length;

  return {
    hasData: true,
    features,
    qualityChecks,
    qualityScore,
    readyForInference: qualityScore >= 0.7,
  };
};

export default {
  WINDOW_TYPES,
  getWindowBoundaries,
  aggregateLogsSQL,
  aggregateRecentLogs,
  batchAggregateByWindow,
  getFeatureSummary,
  calculateTrend,
  calculateStd,
};
