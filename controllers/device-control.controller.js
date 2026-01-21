import * as deviceService from "../services/device.service.js";
import * as deviceSessionService from "../services/device-session.service.js";

/**
 * Authenticate device with PIN and get session token
 * POST /api/device/auth
 *
 * This creates a session that lasts for 5 minutes
 * During this time, user can control the device without entering PIN again
 */
export const authenticateDevice = async (req, res) => {
  const { deviceCode, pin } = req.body;
  const userId = req.user.uid;

  if (!deviceCode || !pin) {
    return res.status(400).json({
      error: "Device code and PIN are required",
    });
  }

  try {
    // Get device
    const device = await deviceService.getDeviceByCode(deviceCode);

    if (!device) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    // Check ownership
    if (device.ownerId !== userId) {
      return res.status(403).json({
        error: "You are not the owner of this device",
      });
    }

    // Verify PIN
    const isPinValid = await deviceService.comparePin(pin, device.pin);
    if (!isPinValid) {
      return res.status(401).json({
        error: "Invalid PIN",
      });
    }

    // Invalidate any existing session for this user+device
    deviceSessionService.invalidateUserDeviceSession(userId, deviceCode);

    // Create new session
    const session = deviceSessionService.createDeviceSession(
      userId,
      device.id,
      deviceCode
    );

    res.status(200).json({
      message: "Device authenticated successfully",
      session: {
        token: session.token,
        expiresAt: new Date(session.expiresAt).toISOString(),
        expiresIn: session.expiresIn, // seconds
      },
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
      },
    });
  } catch (err) {
    console.error("Error authenticating device:", err.message);
    res.status(500).json({
      error: "Failed to authenticate device",
      detail: err.message,
    });
  }
};

/**
 * Check session status
 * GET /api/device/session/status
 */
export const checkSessionStatus = async (req, res) => {
  const sessionToken = req.headers["x-device-session"] || req.query.token;

  if (!sessionToken) {
    return res.status(400).json({
      error: "Session token is required",
      valid: false,
    });
  }

  const session = deviceSessionService.validateDeviceSession(sessionToken);

  if (!session) {
    return res.status(200).json({
      valid: false,
      message: "Session expired or invalid",
    });
  }

  const remainingTime =
    deviceSessionService.getSessionRemainingTime(sessionToken);

  res.status(200).json({
    valid: true,
    remainingTime, // seconds
    expiresAt: new Date(session.expiresAt).toISOString(),
    deviceCode: session.deviceCode,
  });
};

/**
 * Extend session duration
 * POST /api/device/session/extend
 */
export const extendSession = async (req, res) => {
  const sessionToken = req.headers["x-device-session"] || req.body.sessionToken;

  if (!sessionToken) {
    return res.status(400).json({
      error: "Session token is required",
    });
  }

  const session = deviceSessionService.extendSession(sessionToken);

  if (!session) {
    return res.status(401).json({
      error: "Session expired or invalid. Please re-authenticate with PIN.",
    });
  }

  res.status(200).json({
    message: "Session extended successfully",
    session: {
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      expiresIn: session.expiresIn,
    },
  });
};

/**
 * Logout/Invalidate session
 * POST /api/device/session/logout
 */
export const logoutSession = async (req, res) => {
  const sessionToken = req.headers["x-device-session"] || req.body.sessionToken;

  if (!sessionToken) {
    return res.status(400).json({
      error: "Session token is required",
    });
  }

  deviceSessionService.invalidateSession(sessionToken);

  res.status(200).json({
    message: "Session invalidated successfully",
  });
};

/**
 * Send control data to Arduino
 * POST /api/device/control
 *
 * Requires valid device session (PIN authenticated)
 */
export const sendControlData = async (req, res) => {
  const { targetTemperature, targetHumidity, fanSpeed, heaterOn, action } =
    req.body;
  const { deviceSession, device } = req;

  try {
    // Build control payload
    const controlPayload = {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      timestamp: new Date().toISOString(),
      controls: {},
    };

    // Add control values if provided
    if (targetTemperature !== undefined) {
      controlPayload.controls.targetTemperature = parseFloat(targetTemperature);
    }
    if (targetHumidity !== undefined) {
      controlPayload.controls.targetHumidity = parseFloat(targetHumidity);
    }
    if (fanSpeed !== undefined) {
      controlPayload.controls.fanSpeed = parseInt(fanSpeed);
    }
    if (heaterOn !== undefined) {
      controlPayload.controls.heaterOn = Boolean(heaterOn);
    }
    if (action !== undefined) {
      controlPayload.controls.action = action;
    }

    // Check if any controls were provided
    if (Object.keys(controlPayload.controls).length === 0) {
      return res.status(400).json({
        error: "At least one control parameter is required",
        availableControls: [
          "targetTemperature",
          "targetHumidity",
          "fanSpeed",
          "heaterOn",
          "action",
        ],
      });
    }

    // Broadcast to WebSocket clients connected to this device
    // This will be picked up by the Arduino
    if (req.wssClients && req.wssClients.length > 0) {
      const wsMessage = JSON.stringify({
        type: "DEVICE_CONTROL",
        ...controlPayload,
      });

      req.wssClients.forEach((client) => {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(wsMessage);
        }
      });
    }

    res.status(200).json({
      message: "Control data sent successfully",
      payload: controlPayload,
      sessionRemainingTime: deviceSessionService.getSessionRemainingTime(
        deviceSession.token
      ),
    });
  } catch (err) {
    console.error("Error sending control data:", err.message);
    res.status(500).json({
      error: "Failed to send control data",
      detail: err.message,
    });
  }
};

/**
 * Get device current status/readings
 * GET /api/device/control/:deviceCode/status
 *
 * Requires valid device session
 */
export const getDeviceStatus = async (req, res) => {
  const { device, deviceSession } = req;

  try {
    // Get latest logs for this device
    const latestData = {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      deviceName: device.name,
      lastConnected: device.connectedAt,
      sessionRemainingTime: deviceSessionService.getSessionRemainingTime(
        deviceSession.token
      ),
    };

    res.status(200).json({
      message: "Device status retrieved",
      status: latestData,
    });
  } catch (err) {
    console.error("Error getting device status:", err.message);
    res.status(500).json({
      error: "Failed to get device status",
      detail: err.message,
    });
  }
};
