import firebase from "../firebase.js";
const { db, auth } = firebase;

export const saveUserIfNotExists = async (userId, userData) => {
  const userRef = db.collection("users").doc(userId);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    await userRef.set(userData);
  }
};

export const saveJamurLog = async (userId, logData) => {
  const logsRef = db.collection("users").doc(userId).collection("logs");
  await logsRef.add({
    ...logData,
    timestamp: new Date().toISOString(),
  });
};

export const getUserData = async (uid) => {
  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error(`User  UID ${uid} not found`);
    }

    return userDoc.data();
  } catch (error) {
    console.error("❌ fail to get data user:", error);
    throw error;
  }
};

export const getUserLogs = async (userId) => {
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("logs")
    .orderBy("timestamp", "desc")
    .get();

  const logs = [];
  snapshot.forEach((doc) => {
    logs.push({ id: doc.id, ...doc.data() });
  });

  return logs;
};
