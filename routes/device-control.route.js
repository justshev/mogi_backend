import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  verifyDeviceSession,
  verifyDeviceOwnership,
} from "../middleware/device-session.middleware.js";
import {
  authenticateDevice,
  checkSessionStatus,
  extendSession,
  logoutSession,
  sendControlData,
  getDeviceStatus,
} from "../controllers/device-control.controller.js";

const router = Router();

// ==================== SESSION MANAGEMENT ====================

/**
 * Authenticate device with PIN and get session token
 * Session lasts for 5 minutes
 */
router.post("/auth", authenticate, authenticateDevice);

/**
 * Check session status
 * Returns whether session is valid and remaining time
 */
router.get("/session/status", authenticate, checkSessionStatus);

/**
 * Extend session duration by another 5 minutes
 */
router.post("/session/extend", authenticate, extendSession);

/**
 * Logout/Invalidate session
 */
router.post("/session/logout", authenticate, logoutSession);

// ==================== DEVICE CONTROL ====================
// All endpoints below require valid device session (PIN authenticated)

/**
 * Send control data to Arduino
 * Requires valid session token in header: X-Device-Session
 */
router.post(
  "/control",
  authenticate,
  verifyDeviceSession,
  verifyDeviceOwnership,
  sendControlData
);

/**
 * Get device current status
 * Requires valid session token in header: X-Device-Session
 */
router.get(
  "/control/:deviceCode/status",
  authenticate,
  verifyDeviceSession,
  verifyDeviceOwnership,
  getDeviceStatus
);

export default router;
