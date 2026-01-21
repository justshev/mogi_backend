import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Validate PIN format (numbers only, 4-6 digits)
 */
export const validatePin = (pin) => {
  const pinRegex = /^\d{4,6}$/;
  return pinRegex.test(pin);
};

/**
 * Hash PIN using bcrypt
 */
export const hashPin = async (pin) => {
  return await bcrypt.hash(pin, SALT_ROUNDS);
};

/**
 * Compare PIN with hashed PIN
 */
export const comparePin = async (pin, hashedPin) => {
  return await bcrypt.compare(pin, hashedPin);
};

/**
 * Create a new device (initial device setup - usually done by admin/system)
 */
export const createDevice = async (deviceCode, name = null) => {
  // Generate a default PIN (will be changed by owner later)
  const defaultPin = "000000";
  const hashedPin = await hashPin(defaultPin);

  const device = await prisma.device.create({
    data: {
      deviceCode,
      name,
      pin: hashedPin,
      isRegistered: false,
    },
  });

  return device;
};

/**
 * Get device by device code
 */
export const getDeviceByCode = async (deviceCode) => {
  const device = await prisma.device.findUnique({
    where: { deviceCode },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return device;
};

/**
 * Get device by ID
 */
export const getDeviceById = async (deviceId) => {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return device;
};

/**
 * Check if device is already owned
 */
export const isDeviceOwned = async (deviceCode) => {
  const device = await getDeviceByCode(deviceCode);
  return device?.isRegistered && device?.ownerId !== null;
};

/**
 * Register device to a user (claim ownership)
 * User becomes the owner and sets a new PIN
 */
export const registerDeviceToUser = async (deviceCode, userId, newPin) => {
  const device = await getDeviceByCode(deviceCode);

  if (!device) {
    throw new Error("Device not found");
  }

  if (device.isRegistered && device.ownerId) {
    throw new Error(
      "Device is already registered to another user. Please forget device first."
    );
  }

  // Validate PIN format
  if (!validatePin(newPin)) {
    throw new Error("PIN must be 4-6 digits (numbers only)");
  }

  const hashedPin = await hashPin(newPin);

  const updatedDevice = await prisma.device.update({
    where: { deviceCode },
    data: {
      ownerId: userId,
      isRegistered: true,
      pin: hashedPin,
      connectedAt: new Date(),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedDevice;
};

/**
 * Connect to device with PIN verification
 */
export const connectToDevice = async (deviceCode, userId, pin) => {
  const device = await getDeviceByCode(deviceCode);

  if (!device) {
    throw new Error("Device not found");
  }

  if (!device.isRegistered || !device.ownerId) {
    throw new Error(
      "Device is not registered. Please register the device first."
    );
  }

  // Check if user is the owner
  if (device.ownerId !== userId) {
    throw new Error("You are not the owner of this device");
  }

  // Verify PIN
  const isPinValid = await comparePin(pin, device.pin);
  if (!isPinValid) {
    throw new Error("Invalid PIN");
  }

  // Update last connected time
  const updatedDevice = await prisma.device.update({
    where: { deviceCode },
    data: {
      connectedAt: new Date(),
    },
  });

  return updatedDevice;
};

/**
 * Forget/Remove device from user (release ownership)
 * Only the owner can forget the device
 */
export const forgetDevice = async (deviceCode, userId, pin) => {
  const device = await getDeviceByCode(deviceCode);

  if (!device) {
    throw new Error("Device not found");
  }

  if (!device.isRegistered || !device.ownerId) {
    throw new Error("Device is not registered to any user");
  }

  // Check if user is the owner
  if (device.ownerId !== userId) {
    throw new Error("You are not the owner of this device");
  }

  // Verify PIN
  const isPinValid = await comparePin(pin, device.pin);
  if (!isPinValid) {
    throw new Error("Invalid PIN");
  }

  // Reset device ownership and PIN
  const defaultPin = "000000";
  const hashedPin = await hashPin(defaultPin);

  const updatedDevice = await prisma.device.update({
    where: { deviceCode },
    data: {
      ownerId: null,
      isRegistered: false,
      pin: hashedPin,
      connectedAt: null,
    },
  });

  return updatedDevice;
};

/**
 * Change device PIN
 * Only the owner can change the PIN
 */
export const changeDevicePin = async (deviceCode, userId, oldPin, newPin) => {
  const device = await getDeviceByCode(deviceCode);

  if (!device) {
    throw new Error("Device not found");
  }

  if (!device.isRegistered || !device.ownerId) {
    throw new Error("Device is not registered");
  }

  // Check if user is the owner
  if (device.ownerId !== userId) {
    throw new Error("You are not the owner of this device");
  }

  // Verify old PIN
  const isPinValid = await comparePin(oldPin, device.pin);
  if (!isPinValid) {
    throw new Error("Invalid current PIN");
  }

  // Validate new PIN format
  if (!validatePin(newPin)) {
    throw new Error("New PIN must be 4-6 digits (numbers only)");
  }

  const hashedNewPin = await hashPin(newPin);

  const updatedDevice = await prisma.device.update({
    where: { deviceCode },
    data: {
      pin: hashedNewPin,
    },
  });

  return updatedDevice;
};

/**
 * Get all devices owned by a user
 */
export const getUserDevices = async (userId) => {
  const devices = await prisma.device.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      deviceCode: true,
      name: true,
      isRegistered: true,
      connectedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return devices;
};

/**
 * Update device name
 */
export const updateDeviceName = async (deviceCode, userId, name) => {
  const device = await getDeviceByCode(deviceCode);

  if (!device) {
    throw new Error("Device not found");
  }

  if (device.ownerId !== userId) {
    throw new Error("You are not the owner of this device");
  }

  const updatedDevice = await prisma.device.update({
    where: { deviceCode },
    data: { name },
  });

  return updatedDevice;
};

/**
 * Check device status (for initial connection check)
 */
export const checkDeviceStatus = async (deviceCode) => {
  const device = await getDeviceByCode(deviceCode);

  if (!device) {
    return {
      exists: false,
      isRegistered: false,
      hasOwner: false,
    };
  }

  return {
    exists: true,
    isRegistered: device.isRegistered,
    hasOwner: device.ownerId !== null,
    deviceId: device.id,
    deviceName: device.name,
    ownerName: device.owner?.name || null,
  };
};
