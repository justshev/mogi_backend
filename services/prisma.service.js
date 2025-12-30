import prisma from "../lib/prisma.js";

export const saveUserIfNotExists = async (userId, userData) => {
  // Cek apakah user sudah ada menggunakan upsert
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {}, // Tidak update apapun jika sudah ada
    create: {
      id: userId,
      name: userData.name,
      email: userData.email,
    },
  });

  return user;
};

export const saveJamurLog = async (userId, logData) => {
  const log = await prisma.log.create({
    data: {
      userId: userId,
      temperature: logData.temperature,
      humidity: logData.humidity,
    },
  });

  return log;
};

export const getUserData = async (uid) => {
  const user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (!user) {
    throw new Error(`User UID ${uid} not found`);
  }

  return user;
};

export const getUserLogs = async (userId) => {
  const logs = await prisma.log.findMany({
    where: { userId: userId },
    orderBy: { timestamp: "desc" },
  });

  return logs;
};

export const createUser = async (userData) => {
  const user = await prisma.user.create({
    data: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
    },
  });

  return user;
};

export const getUserByEmail = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  return user;
};
