import * as deviceService from "../services/device.service.js";

/**
 * Create a new device (Admin/System endpoint)
 * POST /api/device/create
 */
export const createDevice = async (req, res) => {
  const { deviceCode, name } = req.body;

  if (!deviceCode) {
    return res.status(400).json({ error: "Device code is required" });
  }

  try {
    const device = await deviceService.createDevice(deviceCode, name);

    res.status(201).json({
      message: "Device created successfully",
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
        isRegistered: device.isRegistered,
      },
    });
  } catch (err) {
    console.error("Error creating device:", err.message);

    if (err.code === "P2002") {
      return res.status(409).json({ error: "Device code already exists" });
    }

    res
      .status(500)
      .json({ error: "Failed to create device", detail: err.message });
  }
};

/**
 * Check device status before registration
 * GET /api/device/status/:deviceCode
 */
export const checkDeviceStatus = async (req, res) => {
  const { deviceCode } = req.params;

  if (!deviceCode) {
    return res.status(400).json({ error: "Device code is required" });
  }

  try {
    const status = await deviceService.checkDeviceStatus(deviceCode);

    res.status(200).json({
      message: "Device status retrieved",
      status,
    });
  } catch (err) {
    console.error("Error checking device status:", err.message);
    res
      .status(500)
      .json({ error: "Failed to check device status", detail: err.message });
  }
};

/**
 * Register device to user (claim ownership)
 * POST /api/device/register
 * Requires authentication
 */
export const registerDevice = async (req, res) => {
  const { deviceCode, pin } = req.body;
  const userId = req.user.uid;

  if (!deviceCode || !pin) {
    return res.status(400).json({ error: "Device code and PIN are required" });
  }

  try {
    // First check if device exists
    const status = await deviceService.checkDeviceStatus(deviceCode);

    if (!status.exists) {
      return res
        .status(404)
        .json({ error: "Device not found. Please check the device code." });
    }

    if (status.hasOwner) {
      return res.status(409).json({
        error: "Device is already registered to another user",
        message:
          "The device owner must forget/release the device first before you can register it.",
      });
    }

    const device = await deviceService.registerDeviceToUser(
      deviceCode,
      userId,
      pin
    );

    res.status(200).json({
      message: "Device registered successfully",
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
        isRegistered: device.isRegistered,
        owner: device.owner,
      },
    });
  } catch (err) {
    console.error("Error registering device:", err.message);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Connect to device with PIN verification
 * POST /api/device/connect
 * Requires authentication
 */
export const connectDevice = async (req, res) => {
  const { deviceCode, pin } = req.body;
  const userId = req.user.uid;

  if (!deviceCode || !pin) {
    return res.status(400).json({ error: "Device code and PIN are required" });
  }

  try {
    const device = await deviceService.connectToDevice(deviceCode, userId, pin);

    res.status(200).json({
      message: "Connected to device successfully",
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
        connectedAt: device.connectedAt,
      },
    });
  } catch (err) {
    console.error("Error connecting to device:", err.message);
    res.status(401).json({ error: err.message });
  }
};

/**
 * Forget/Release device ownership
 * POST /api/device/forget
 * Requires authentication
 */
export const forgetDevice = async (req, res) => {
  const { deviceCode, pin } = req.body;
  const userId = req.user.uid;

  if (!deviceCode || !pin) {
    return res.status(400).json({ error: "Device code and PIN are required" });
  }

  try {
    await deviceService.forgetDevice(deviceCode, userId, pin);

    res.status(200).json({
      message:
        "Device forgotten successfully. The device can now be registered by another user.",
    });
  } catch (err) {
    console.error("Error forgetting device:", err.message);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Change device PIN
 * POST /api/device/change-pin
 * Requires authentication
 */
export const changePin = async (req, res) => {
  const { deviceCode, oldPin, newPin } = req.body;
  const userId = req.user.uid;

  if (!deviceCode || !oldPin || !newPin) {
    return res
      .status(400)
      .json({ error: "Device code, old PIN, and new PIN are required" });
  }

  try {
    await deviceService.changeDevicePin(deviceCode, userId, oldPin, newPin);

    res.status(200).json({
      message: "PIN changed successfully",
    });
  } catch (err) {
    console.error("Error changing PIN:", err.message);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get all devices owned by the authenticated user
 * GET /api/device/my-devices
 * Requires authentication
 */
export const getMyDevices = async (req, res) => {
  const userId = req.user.uid;

  try {
    const devices = await deviceService.getUserDevices(userId);

    res.status(200).json({
      message: "Devices retrieved successfully",
      count: devices.length,
      devices,
    });
  } catch (err) {
    console.error("Error getting user devices:", err.message);
    res
      .status(500)
      .json({ error: "Failed to get devices", detail: err.message });
  }
};

/**
 * Update device name
 * PUT /api/device/update-name
 * Requires authentication
 */
export const updateDeviceName = async (req, res) => {
  const { deviceCode, name } = req.body;
  const userId = req.user.uid;

  if (!deviceCode || !name) {
    return res.status(400).json({ error: "Device code and name are required" });
  }

  try {
    const device = await deviceService.updateDeviceName(
      deviceCode,
      userId,
      name
    );

    res.status(200).json({
      message: "Device name updated successfully",
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
      },
    });
  } catch (err) {
    console.error("Error updating device name:", err.message);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get device details
 * GET /api/device/:deviceCode
 * Requires authentication
 */
export const getDeviceDetails = async (req, res) => {
  const { deviceCode } = req.params;
  const userId = req.user.uid;

  if (!deviceCode) {
    return res.status(400).json({ error: "Device code is required" });
  }

  try {
    const device = await deviceService.getDeviceByCode(deviceCode);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Check if user is the owner
    if (device.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "You are not the owner of this device" });
    }

    res.status(200).json({
      message: "Device details retrieved",
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
        isRegistered: device.isRegistered,
        connectedAt: device.connectedAt,
        createdAt: device.createdAt,
        owner: device.owner,
      },
    });
  } catch (err) {
    console.error("Error getting device details:", err.message);
    res
      .status(500)
      .json({ error: "Failed to get device details", detail: err.message });
  }
};
