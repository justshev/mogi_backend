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
