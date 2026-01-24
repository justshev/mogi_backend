/**
 * Inference Routes
 *
 * REST API endpoints for ML inference operations.
 * All endpoints require authentication.
 */

import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  predict,
  predictFromStored,
  computeFeatures,
  getFeatures,
  getHistory,
  healthCheck,
} from "../controllers/inference.controller.js";

const router = Router();

/**
 * @route POST /api/inference/predict
 * @desc Full prediction with real-time feature aggregation
 * @access Private
 * @body {
 *   deviceId?: string,      // Optional device ID filter
 *   baglogCount?: number,   // Number of mushroom bags (default: 100)
 *   hoursBack?: number      // Hours of data to aggregate (default: 24)
 * }
 * @returns {
 *   success: boolean,
 *   prediction: {
 *     harvest_time_days: number,
 *     risk_fail: number,
 *     risk_probability?: number,
 *     anomaly: boolean,
 *     anomaly_score?: number,
 *     recommendations: string[],
 *     model_version: string
 *   },
 *   features: {...},
 *   performance: {...}
 * }
 */
router.post("/predict", authenticate, predict);

/**
 * @route POST /api/inference/predict-stored
 * @desc Prediction using pre-computed features from feature store (faster)
 * @access Private
 * @body {
 *   deviceId?: string,
 *   baglogCount?: number
 * }
 */
router.post("/predict-stored", authenticate, predictFromStored);

/**
 * @route POST /api/inference/compute-features
 * @desc Compute and store aggregated features for a time window
 * @access Private
 * @body {
 *   deviceId?: string,
 *   windowType?: "hourly" | "daily",  // default: "hourly"
 *   baglogCount?: number
 * }
 */
router.post("/compute-features", authenticate, computeFeatures);

/**
 * @route GET /api/inference/features/summary
 * @desc Get feature summary with data quality metrics
 * @access Private
 * @query {
 *   hoursBack?: number  // default: 24
 * }
 */
router.get("/features/summary", authenticate, getFeatures);

/**
 * @route GET /api/inference/history
 * @desc Get inference prediction history
 * @access Private
 * @query {
 *   limit?: number  // default: 50
 * }
 */
router.get("/history", authenticate, getHistory);

/**
 * @route GET /api/inference/health
 * @desc Health check for inference pipeline (public)
 * @access Public
 */
router.get("/health", healthCheck);

export default router;
