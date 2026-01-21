import { validateDeviceSession } from "../services/device-session.service.js";
import * as deviceService from "../services/device.service.js";

/**
 * Middleware to verify device session token
 * User must have a valid session token to control the device
 *
 * The session token should be passed in the header:
 * X-Device-Session: <session_token>
 *
 * Or in the body:
 * { "sessionToken": "<session_token>" }
 */
export const verifyDeviceSession = async (req, res, next) => {
  // Get session token from header or body
  const sessionToken = req.headers["x-device-session"] || req.body.sessionToken;

  if (!sessionToken) {
    return res.status(401).json({
      error: "Device session token is required",
      message:
        "Please authenticate with PIN first using /api/device/auth endpoint",
      code: "SESSION_REQUIRED",
    });
  }

  try {
    // Validate session
    const session = validateDeviceSession(sessionToken);

    if (!session) {
      return res.status(401).json({
        error: "Session expired or invalid",
        message:
          "Your device session has expired. Please re-authenticate with PIN.",
        code: "SESSION_EXPIRED",
      });
    }

    // Verify user matches
    if (session.userId !== req.user.uid) {
      return res.status(403).json({
        error: "Session does not belong to this user",
        code: "SESSION_MISMATCH",
      });
    }

    // Attach session data to request
    req.deviceSession = session;

    next();
  } catch (err) {
    console.error("Device session verification error:", err.message);
    return res.status(500).json({
      error: "Failed to verify device session",
      detail: err.message,
    });
  }
};

/**
 * Middleware to verify device ownership
 * Checks if the user owns the device they're trying to control
 */
export const verifyDeviceOwnership = async (req, res, next) => {
  const deviceCode =
    req.body.deviceCode ||
    req.params.deviceCode ||
    req.deviceSession?.deviceCode;

  if (!deviceCode) {
    return res.status(400).json({
      error: "Device code is required",
    });
  }

  try {
    const device = await deviceService.getDeviceByCode(deviceCode);

    if (!device) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    if (device.ownerId !== req.user.uid) {
      return res.status(403).json({
        error: "You are not the owner of this device",
      });
    }

    // Attach device to request
    req.device = device;

    next();
  } catch (err) {
    console.error("Device ownership verification error:", err.message);
    return res.status(500).json({
      error: "Failed to verify device ownership",
      detail: err.message,
    });
  }
};

/**
 * Combined middleware: authenticate + verify session + verify ownership
 * Use this for device control endpoints
 */
export const deviceControlAuth = [verifyDeviceSession, verifyDeviceOwnership];
