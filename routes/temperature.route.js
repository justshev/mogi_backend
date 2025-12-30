import express from "express";
import {
  receiveTemperatureData,
  getState,
  updateConfig,
  resetState,
  receiveBulkData,
} from "../controllers/temperature.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Semua route memerlukan autentikasi
router.use(authenticate);

// POST /api/temperature/data - Terima data temperature dari Arduino/Postman
router.post("/data", receiveTemperatureData);

// POST /api/temperature/bulk - Terima multiple data sekaligus (testing)
router.post("/bulk", receiveBulkData);

// GET /api/temperature/state - Get current monitoring state
router.get("/state", getState);

// POST /api/temperature/config - Update konfigurasi (threshold, interval)
router.post("/config", updateConfig);

// POST /api/temperature/reset - Reset state monitoring
router.post("/reset", resetState);

export default router;
