import firebase from "../firebase.js";
const { db, auth } = firebase;
import axios from "axios";
// Fungsi untuk Register
export const registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "Email, password, dan nama harus diisi" });
  }

  try {
    // Mendaftar pengguna dengan email dan password
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    res.status(201).json({
      message: "User berhasil terdaftar",
      user: userRecord,
    });
  } catch (err) {
    console.error("Error registering new user:", err.message);
    res
      .status(500)
      .json({ error: "Gagal mendaftar pengguna", detail: err.message });
  }
};

//login

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password harus diisi" });
  }

  try {
    const apiKey = process.env.FIREBASE_API_KEY;

    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { idToken, refreshToken, expiresIn, localId } = response.data;

    res.status(200).json({
      message: "Login berhasil",
      idToken,
      refreshToken,
      expiresIn,
      uid: localId,
    });
  } catch (err) {
    console.error("Gagal login:", err.response?.data || err.message);
    res.status(401).json({
      error: "Gagal login pengguna",
      detail: err.response?.data?.error?.message || err.message,
    });
  }
};
