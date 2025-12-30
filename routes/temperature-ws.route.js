import express from "express";
import {
  receiveTemperatureDataWs,
  getStateWs,
  updateConfigWs,
  resetStateWs,
  receiveBulkDataWs,
  simulateDataWs,
} from "../controllers/temperature-ws.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Semua route memerlukan autentikasi
router.use(authenticate);

// POST /api/temperature-ws/data - Terima data temperature dari Arduino/Postman
router.post("/data", receiveTemperatureDataWs);

// POST /api/temperature-ws/bulk - Terima multiple data sekaligus (testing)
router.post("/bulk", receiveBulkDataWs);

// POST /api/temperature-ws/simulate - Simulasi data untuk testing
router.post("/simulate", simulateDataWs);

// GET /api/temperature-ws/state - Get current monitoring state
router.get("/state", getStateWs);

// POST /api/temperature-ws/config - Update konfigurasi (threshold, interval)
router.post("/config", updateConfigWs);

// POST /api/temperature-ws/reset - Reset state monitoring
router.post("/reset", resetStateWs);

export default router;
