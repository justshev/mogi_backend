import crypto from "crypto";

// In-memory session store (for production, use Redis or database)
const deviceSessions = new Map();

// Session duration in milliseconds (5 minutes)
const SESSION_DURATION = 5 * 60 * 1000;

/**
 * Generate a secure random session token
 */
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Create a new device session after PIN verification
 * @param {string} userId - The user ID
 * @param {string} deviceId - The device ID
 * @param {string} deviceCode - The device code
 * @returns {object} Session data with token and expiry
 */
export const createDeviceSession = (userId, deviceId, deviceCode) => {
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_DURATION;

  const sessionData = {
    token,
    userId,
    deviceId,
    deviceCode,
    createdAt: Date.now(),
    expiresAt,
  };

  // Store session with token as key
  deviceSessions.set(token, sessionData);

  // Also store by user+device combination for easy lookup
  const userDeviceKey = `${userId}:${deviceCode}`;
  deviceSessions.set(userDeviceKey, token);

  return {
    token,
    expiresAt,
    expiresIn: SESSION_DURATION / 1000, // in seconds
  };
};

/**
 * Validate a device session token
 * @param {string} token - The session token
 * @returns {object|null} Session data if valid, null if invalid or expired
 */
export const validateDeviceSession = (token) => {
  const session = deviceSessions.get(token);

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (Date.now() > session.expiresAt) {
    // Clean up expired session
    invalidateSession(token);
    return null;
  }

  return session;
};

/**
 * Get active session for a user and device
 * @param {string} userId - The user ID
 * @param {string} deviceCode - The device code
 * @returns {object|null} Session data if exists and valid
 */
export const getActiveSession = (userId, deviceCode) => {
  const userDeviceKey = `${userId}:${deviceCode}`;
  const token = deviceSessions.get(userDeviceKey);

  if (!token) {
    return null;
  }

  return validateDeviceSession(token);
};

/**
 * Invalidate/remove a device session
 * @param {string} token - The session token
 */
export const invalidateSession = (token) => {
  const session = deviceSessions.get(token);

  if (session) {
    // Remove both entries
    const userDeviceKey = `${session.userId}:${session.deviceCode}`;
    deviceSessions.delete(userDeviceKey);
    deviceSessions.delete(token);
  }
};

/**
 * Invalidate all sessions for a user and device
 * @param {string} userId - The user ID
 * @param {string} deviceCode - The device code
 */
export const invalidateUserDeviceSession = (userId, deviceCode) => {
  const userDeviceKey = `${userId}:${deviceCode}`;
  const token = deviceSessions.get(userDeviceKey);

  if (token) {
    deviceSessions.delete(userDeviceKey);
    deviceSessions.delete(token);
  }
};

/**
 * Extend session expiry time
 * @param {string} token - The session token
 * @returns {object|null} Updated session data
 */
export const extendSession = (token) => {
  const session = deviceSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    return null;
  }

  // Extend by SESSION_DURATION
  session.expiresAt = Date.now() + SESSION_DURATION;
  deviceSessions.set(token, session);

  return {
    token,
    expiresAt: session.expiresAt,
    expiresIn: SESSION_DURATION / 1000,
  };
};

/**
 * Get remaining time for a session
 * @param {string} token - The session token
 * @returns {number} Remaining time in seconds, 0 if expired
 */
export const getSessionRemainingTime = (token) => {
  const session = deviceSessions.get(token);

  if (!session) {
    return 0;
  }

  const remaining = session.expiresAt - Date.now();
  return remaining > 0 ? Math.floor(remaining / 1000) : 0;
};

/**
 * Clean up expired sessions (run periodically)
 */
export const cleanupExpiredSessions = () => {
  const now = Date.now();

  for (const [key, value] of deviceSessions.entries()) {
    // Only check token entries (not userDeviceKey entries)
    if (typeof value === "object" && value.expiresAt && value.expiresAt < now) {
      invalidateSession(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupExpiredSessions, 60 * 1000);

export default {
  createDeviceSession,
  validateDeviceSession,
  getActiveSession,
  invalidateSession,
  invalidateUserDeviceSession,
  extendSession,
  getSessionRemainingTime,
  cleanupExpiredSessions,
};
