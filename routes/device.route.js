import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createDevice,
  checkDeviceStatus,
  registerDevice,
  connectDevice,
  forgetDevice,
  changePin,
  getMyDevices,
  updateDeviceName,
  getDeviceDetails,
} from "../controllers/device.controller.js";

const router = Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Create a new device (Admin/System endpoint)
 * In production, this should be protected with admin auth
 */
router.post("/create", createDevice);

/**
 * Check device status (public - for initial connection check)
 * Returns whether device exists and if it has an owner
 */
router.get("/status/:deviceCode", checkDeviceStatus);

// ==================== PROTECTED ENDPOINTS ====================
// All endpoints below require authentication

/**
 * Register device to user (claim ownership)
 * User sets a new PIN during registration
 */
router.post("/register", authenticate, registerDevice);

/**
 * Connect to device with PIN verification
 * Returns connection token/status for device control
 */
router.post("/connect", authenticate, connectDevice);

/**
 * Forget/Release device ownership
 * Allows another user to claim the device
 */
router.post("/forget", authenticate, forgetDevice);

/**
 * Change device PIN
 * Requires current PIN for verification
 */
router.post("/change-pin", authenticate, changePin);

/**
 * Get all devices owned by the authenticated user
 */
router.get("/my-devices", authenticate, getMyDevices);

/**
 * Update device name
 */
router.put("/update-name", authenticate, updateDeviceName);

/**
 * Get device details
 * Only accessible by the device owner
 */
router.get("/:deviceCode", authenticate, getDeviceDetails);

export default router;
