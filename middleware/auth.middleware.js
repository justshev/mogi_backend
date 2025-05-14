import firebase from "../firebase.js";
const { auth } = firebase;

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token tidak ditemukan." });
  }

  const idToken = header.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken; // berisi { uid, email, ... }
    next();
  } catch (err) {
    console.error("Token tidak valid:", err.message);
    return res.status(403).json({ error: "Token tidak valid." });
  }
};
