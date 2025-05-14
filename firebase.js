import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./firebase-adminsdk.json", "utf-8") // ganti sesuai dengan lokasi file
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth(); // Menambahkan Firebase Authentication
export default { db, auth };
