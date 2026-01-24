/**
 * Inference Client Service
 *
 * HTTP client for communicating with FastAPI inference service.
 * Implements retry logic, circuit breaker pattern, and proper error handling.
 *
 * Key features:
 * - Exponential backoff retry
 * - Circuit breaker for fault tolerance
 * - Request timeout handling
 * - Structured error responses
 */

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  lastFailure: null,
  isOpen: false,
  threshold: 5, // Number of failures before opening circuit
  resetTimeout: 30000, // 30 seconds before attempting to close circuit
};

// Configuration
const CONFIG = {
  baseUrl: process.env.FASTAPI_URL || "http://localhost:8000",
  timeout: parseInt(process.env.FASTAPI_TIMEOUT) || 10000, // 10 seconds
  maxRetries: parseInt(process.env.FASTAPI_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.FASTAPI_RETRY_DELAY) || 1000, // 1 second base delay
};

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if circuit breaker should allow request
 * @returns {boolean} True if request is allowed
 */
const isCircuitClosed = () => {
  if (!circuitBreaker.isOpen) {
    return true;
  }

  // Check if reset timeout has passed
  const now = Date.now();
  if (now - circuitBreaker.lastFailure >= circuitBreaker.resetTimeout) {
    // Half-open state: allow one request to test
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    console.log("🔌 Circuit breaker: Half-open, allowing test request");
    return true;
  }

  return false;
};

/**
 * Record a failure and potentially open the circuit
 */
const recordFailure = () => {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();

  if (circuitBreaker.failures >= circuitBreaker.threshold) {
    circuitBreaker.isOpen = true;
    console.error(
      `🚨 Circuit breaker OPEN after ${circuitBreaker.failures} failures`,
    );
  }
};

/**
 * Record a success and reset the circuit breaker
 */
const recordSuccess = () => {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
};

/**
 * Get circuit breaker status
 * @returns {object} Circuit breaker status
 */
export const getCircuitStatus = () => ({
  isOpen: circuitBreaker.isOpen,
  failures: circuitBreaker.failures,
  lastFailure: circuitBreaker.lastFailure
    ? new Date(circuitBreaker.lastFailure).toISOString()
    : null,
  threshold: circuitBreaker.threshold,
  resetTimeout: circuitBreaker.resetTimeout,
});

/**
 * Make HTTP request with timeout
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
const fetchWithTimeout = async (url, options, timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Make request with retry logic
 * @param {string} endpoint - API endpoint
 * @param {object} payload - Request payload
 * @param {number} retries - Remaining retries
 * @returns {Promise<object>} Response data
 */
const requestWithRetry = async (
  endpoint,
  payload,
  retries = CONFIG.maxRetries,
) => {
  const url = `${CONFIG.baseUrl}${endpoint}`;
  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      },
      CONFIG.timeout,
    );

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    recordSuccess();

    return {
      success: true,
      data,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Check if we should retry
    if (retries > 0 && !error.name?.includes("Abort")) {
      const delay =
        CONFIG.retryDelay * Math.pow(2, CONFIG.maxRetries - retries);
      console.warn(
        `⚠️ Inference request failed, retrying in ${delay}ms... (${retries} retries left)`,
      );
      await sleep(delay);
      return requestWithRetry(endpoint, payload, retries - 1);
    }

    recordFailure();

    return {
      success: false,
      error: {
        message: error.message,
        name: error.name,
        isTimeout: error.name === "AbortError",
      },
      latencyMs,
    };
  }
};

/**
 * Request full prediction from FastAPI
 * Combines harvest time, risk, anomaly detection, and recommendations
 *
 * @param {object} features - Aggregated features with 10 values
 * @returns {Promise<object>} Prediction result or error
 */
export const requestFullPrediction = async (features) => {
  // Check circuit breaker
  if (!isCircuitClosed()) {
    return {
      success: false,
      error: {
        message: "Service temporarily unavailable (circuit breaker open)",
        name: "CircuitBreakerError",
        isCircuitOpen: true,
      },
      latencyMs: 0,
    };
  }

  // Extract required fields - support both old and new field names
  const tempAvg = features.tempAvg ?? features.temperature ?? features.temp_avg;
  const humidityAvg =
    features.humidityAvg ?? features.humidity ?? features.humidity_avg;
  const warmthAvg =
    features.warmthAvg ?? features.warmth ?? features.warmth_avg ?? 28;
  const baglog = features.baglog ?? features.baglogCount ?? 100;

  // Extract extended stats (with defaults for stability)
  const tempStd = features.tempStd ?? features.temp_std ?? 1.0;
  const humidityStd = features.humidityStd ?? features.humidity_std ?? 2.0;
  const warmthStd = features.warmthStd ?? features.warmth_std ?? 1.0;

  // Extract trends (with defaults for no trend)
  const tempTrend = features.tempTrend ?? features.temp_trend ?? 0.0;
  const humidityTrend =
    features.humidityTrend ?? features.humidity_trend ?? 0.0;
  const warmthTrend = features.warmthTrend ?? features.warmth_trend ?? 0.0;

  // Validate required fields
  if (
    tempAvg === undefined ||
    humidityAvg === undefined ||
    warmthAvg === undefined ||
    baglog === undefined
  ) {
    return {
      success: false,
      error: {
        message: "Missing required feature fields",
        name: "ValidationError",
        required: [
          "tempAvg/temperature",
          "humidityAvg/humidity",
          "warmthAvg/warmth",
          "baglog",
        ],
        received: features,
      },
      latencyMs: 0,
    };
  }

  // Build payload with 10 features for FastAPI
  const payload = {
    temp_avg: Number(tempAvg),
    humidity_avg: Number(humidityAvg),
    warmth_avg: Number(warmthAvg),
    baglog: Number(baglog),
    temp_std: Number(tempStd),
    humidity_std: Number(humidityStd),
    warmth_std: Number(warmthStd),
    temp_trend: Number(tempTrend),
    humidity_trend: Number(humidityTrend),
    warmth_trend: Number(warmthTrend),
  };

  const result = await requestWithRetry("/api/v1/predict", payload);

  return result;
};

/**
 * Request only harvest time prediction
 * @param {object} features - Aggregated features
 * @returns {Promise<object>} Harvest prediction or error
 */
export const requestHarvestPrediction = async (features) => {
  if (!isCircuitClosed()) {
    return {
      success: false,
      error: {
        message: "Service temporarily unavailable",
        isCircuitOpen: true,
      },
      latencyMs: 0,
    };
  }

  const payload = {
    temp_avg: Number(features.tempAvg ?? features.temperature),
    humidity_avg: Number(features.humidityAvg ?? features.humidity),
    warmth_avg: Number(features.warmthAvg ?? features.warmth ?? 28),
    baglog: Number(features.baglog ?? 100),
    temp_std: Number(features.tempStd ?? 1.0),
    humidity_std: Number(features.humidityStd ?? 2.0),
    warmth_std: Number(features.warmthStd ?? 1.0),
    temp_trend: Number(features.tempTrend ?? 0.0),
    humidity_trend: Number(features.humidityTrend ?? 0.0),
    warmth_trend: Number(features.warmthTrend ?? 0.0),
  };

  return await requestWithRetry("/api/v1/predict/harvest", payload);
};

/**
 * Request only risk prediction
 * @param {object} features - Aggregated features
 * @returns {Promise<object>} Risk prediction or error
 */
export const requestRiskPrediction = async (features) => {
  if (!isCircuitClosed()) {
    return {
      success: false,
      error: {
        message: "Service temporarily unavailable",
        isCircuitOpen: true,
      },
      latencyMs: 0,
    };
  }

  const payload = {
    temp_avg: Number(features.tempAvg ?? features.temperature),
    humidity_avg: Number(features.humidityAvg ?? features.humidity),
    warmth_avg: Number(features.warmthAvg ?? features.warmth ?? 28),
    baglog: Number(features.baglog ?? 100),
    temp_std: Number(features.tempStd ?? 1.0),
    humidity_std: Number(features.humidityStd ?? 2.0),
    warmth_std: Number(features.warmthStd ?? 1.0),
    temp_trend: Number(features.tempTrend ?? 0.0),
    humidity_trend: Number(features.humidityTrend ?? 0.0),
    warmth_trend: Number(features.warmthTrend ?? 0.0),
  };

  return await requestWithRetry("/api/v1/predict/risk", payload);
};

/**
 * Request only anomaly detection
 * @param {object} features - Aggregated features
 * @returns {Promise<object>} Anomaly detection result or error
 */
export const requestAnomalyDetection = async (features) => {
  if (!isCircuitClosed()) {
    return {
      success: false,
      error: {
        message: "Service temporarily unavailable",
        isCircuitOpen: true,
      },
      latencyMs: 0,
    };
  }

  const payload = {
    temp_avg: Number(features.tempAvg ?? features.temperature),
    humidity_avg: Number(features.humidityAvg ?? features.humidity),
    warmth_avg: Number(features.warmthAvg ?? features.warmth ?? 28),
    baglog: Number(features.baglog ?? 100),
    temp_std: Number(features.tempStd ?? 1.0),
    humidity_std: Number(features.humidityStd ?? 2.0),
    warmth_std: Number(features.warmthStd ?? 1.0),
    temp_trend: Number(features.tempTrend ?? 0.0),
    humidity_trend: Number(features.humidityTrend ?? 0.0),
    warmth_trend: Number(features.warmthTrend ?? 0.0),
  };

  return await requestWithRetry("/api/v1/predict/anomaly", payload);
};

/**
 * Health check for FastAPI service
 * @returns {Promise<object>} Health status
 */
export const checkHealth = async () => {
  const url = `${CONFIG.baseUrl}/health`;
  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(
      url,
      { method: "GET" },
      CONFIG.timeout,
    );
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        healthy: false,
        status: response.status,
        latencyMs,
      };
    }

    const data = await response.json();
    return {
      healthy: true,
      data,
      latencyMs,
      circuitBreaker: getCircuitStatus(),
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      latencyMs: Date.now() - startTime,
      circuitBreaker: getCircuitStatus(),
    };
  }
};

/**
 * Get inference service configuration
 * @returns {object} Current configuration
 */
export const getConfig = () => ({
  baseUrl: CONFIG.baseUrl,
  timeout: CONFIG.timeout,
  maxRetries: CONFIG.maxRetries,
  retryDelay: CONFIG.retryDelay,
});

export default {
  requestFullPrediction,
  requestHarvestPrediction,
  requestRiskPrediction,
  requestAnomalyDetection,
  checkHealth,
  getCircuitStatus,
  getConfig,
};
