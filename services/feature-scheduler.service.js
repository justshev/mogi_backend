/**
 * Feature Computation Scheduler
 *
 * Background job for automated feature aggregation.
 * Runs periodic computations to keep feature store up-to-date.
 *
 * Usage:
 *   import { startFeatureScheduler, stopFeatureScheduler } from './services/feature-scheduler.service.js';
 *
 *   // Start scheduler on app startup
 *   startFeatureScheduler();
 *
 *   // Stop on shutdown
 *   stopFeatureScheduler();
 */

import prisma from "../lib/prisma.js";
import {
  WINDOW_TYPES,
  batchAggregateByWindow,
} from "./feature-aggregation.service.js";
import { storeFeatures, cleanupOldFeatures } from "./feature-store.service.js";

// Scheduler state
let hourlyInterval = null;
let dailyInterval = null;
let cleanupInterval = null;

// Configuration
const CONFIG = {
  // Interval in milliseconds
  hourlyInterval: 60 * 60 * 1000, // 1 hour
  dailyInterval: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours

  // Feature retention
  featureRetentionDays: 30,

  // Batch size for processing users
  batchSize: 50,
};

/**
 * Get all active users with recent sensor data
 * @param {number} hoursBack - Hours to look back for activity
 * @returns {Promise<string[]>} Array of user IDs
 */
const getActiveUsers = async (hoursBack = 24) => {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const users = await prisma.log.findMany({
    where: {
      timestamp: {
        gte: cutoff,
      },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  return users.map((u) => u.userId);
};

/**
 * Compute and store hourly features for all active users
 */
const computeHourlyFeatures = async () => {
  console.log("⏰ Starting hourly feature computation...");
  const startTime = Date.now();

  try {
    const activeUsers = await getActiveUsers(2); // Users with data in last 2 hours
    console.log(`📊 Processing ${activeUsers.length} active users`);

    let successCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < activeUsers.length; i += CONFIG.batchSize) {
      const batch = activeUsers.slice(i, i + CONFIG.batchSize);

      await Promise.all(
        batch.map(async (userId) => {
          try {
            // Get window boundaries for last complete hour
            const now = new Date();
            const windowEnd = new Date(now);
            windowEnd.setMinutes(0, 0, 0);

            const windowStart = new Date(windowEnd);
            windowStart.setHours(windowStart.getHours() - 1);

            // Aggregate logs for this window
            const { aggregateLogsSQL } =
              await import("./feature-aggregation.service.js");
            const features = await aggregateLogsSQL(
              userId,
              null,
              windowStart,
              windowEnd,
            );

            if (features && features.sampleCount > 0) {
              await storeFeatures(userId, null, {
                ...features,
                windowType: WINDOW_TYPES.HOURLY,
                windowStart,
                windowEnd,
              });
              successCount++;
            }
          } catch (error) {
            console.error(`❌ Error processing user ${userId}:`, error.message);
            errorCount++;
          }
        }),
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ Hourly computation complete: ${successCount} success, ${errorCount} errors (${duration}ms)`,
    );
  } catch (error) {
    console.error("❌ Hourly feature computation failed:", error);
  }
};

/**
 * Compute and store daily features for all active users
 */
const computeDailyFeatures = async () => {
  console.log("📅 Starting daily feature computation...");
  const startTime = Date.now();

  try {
    const activeUsers = await getActiveUsers(48); // Users with data in last 48 hours
    console.log(
      `📊 Processing ${activeUsers.length} active users for daily aggregation`,
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < activeUsers.length; i += CONFIG.batchSize) {
      const batch = activeUsers.slice(i, i + CONFIG.batchSize);

      await Promise.all(
        batch.map(async (userId) => {
          try {
            // Get window boundaries for yesterday
            const now = new Date();
            const windowEnd = new Date(now);
            windowEnd.setUTCHours(0, 0, 0, 0);

            const windowStart = new Date(windowEnd);
            windowStart.setDate(windowStart.getDate() - 1);

            const { aggregateLogsSQL } =
              await import("./feature-aggregation.service.js");
            const features = await aggregateLogsSQL(
              userId,
              null,
              windowStart,
              windowEnd,
            );

            if (features && features.sampleCount > 0) {
              await storeFeatures(userId, null, {
                ...features,
                windowType: WINDOW_TYPES.DAILY,
                windowStart,
                windowEnd,
              });
              successCount++;
            }
          } catch (error) {
            console.error(
              `❌ Error processing daily for user ${userId}:`,
              error.message,
            );
            errorCount++;
          }
        }),
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ Daily computation complete: ${successCount} success, ${errorCount} errors (${duration}ms)`,
    );
  } catch (error) {
    console.error("❌ Daily feature computation failed:", error);
  }
};

/**
 * Cleanup old features beyond retention period
 */
const runCleanup = async () => {
  console.log("🧹 Starting feature cleanup...");

  try {
    const deletedCount = await cleanupOldFeatures(CONFIG.featureRetentionDays);
    console.log(
      `✅ Cleanup complete: Removed ${deletedCount} old feature records`,
    );
  } catch (error) {
    console.error("❌ Feature cleanup failed:", error);
  }
};

/**
 * Start the feature computation scheduler
 */
export const startFeatureScheduler = () => {
  console.log("🚀 Starting feature computation scheduler...");

  // Run initial computation after short delay
  setTimeout(() => {
    computeHourlyFeatures();
  }, 5000);

  // Schedule hourly computation
  hourlyInterval = setInterval(computeHourlyFeatures, CONFIG.hourlyInterval);

  // Schedule daily computation (run at midnight UTC)
  const now = new Date();
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) -
    now;

  setTimeout(() => {
    computeDailyFeatures();
    dailyInterval = setInterval(computeDailyFeatures, CONFIG.dailyInterval);
  }, msUntilMidnight);

  // Schedule cleanup
  cleanupInterval = setInterval(runCleanup, CONFIG.cleanupInterval);

  console.log("✅ Feature scheduler started");
  console.log(
    `   - Hourly: every ${CONFIG.hourlyInterval / 1000 / 60} minutes`,
  );
  console.log(`   - Daily: at midnight UTC`);
  console.log(
    `   - Cleanup: every ${CONFIG.cleanupInterval / 1000 / 60 / 60} hours`,
  );
};

/**
 * Stop the feature computation scheduler
 */
export const stopFeatureScheduler = () => {
  console.log("🛑 Stopping feature computation scheduler...");

  if (hourlyInterval) {
    clearInterval(hourlyInterval);
    hourlyInterval = null;
  }

  if (dailyInterval) {
    clearInterval(dailyInterval);
    dailyInterval = null;
  }

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  console.log("✅ Feature scheduler stopped");
};

/**
 * Manually trigger feature computation
 * @param {string} windowType - 'hourly' or 'daily'
 */
export const triggerComputation = async (windowType = WINDOW_TYPES.HOURLY) => {
  if (windowType === WINDOW_TYPES.HOURLY) {
    await computeHourlyFeatures();
  } else if (windowType === WINDOW_TYPES.DAILY) {
    await computeDailyFeatures();
  }
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = () => ({
  running: hourlyInterval !== null || dailyInterval !== null,
  hourlyActive: hourlyInterval !== null,
  dailyActive: dailyInterval !== null,
  cleanupActive: cleanupInterval !== null,
  config: {
    hourlyInterval: CONFIG.hourlyInterval,
    dailyInterval: CONFIG.dailyInterval,
    featureRetentionDays: CONFIG.featureRetentionDays,
    batchSize: CONFIG.batchSize,
  },
});

export default {
  startFeatureScheduler,
  stopFeatureScheduler,
  triggerComputation,
  getSchedulerStatus,
};
