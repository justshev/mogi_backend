import firebase from "../firebase.js";
const { db, auth } = firebase;
import axios from "axios";
// Fungsi untuk Register
export const registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "Email, password, and name cannot be empty" });
  }

  try {
    // Mendaftar pengguna dengan email dan password
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    res.status(201).json({
      message: "User successfully registered",
      user: userRecord,
    });
  } catch (err) {
    console.error("Error registering new user:", err.message);
    res.status(500).json({ error: "Failed", detail: err.message });
  }
};

//login

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password must be inputted" });
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
      message: "Login successful",
      idToken,
      refreshToken,
      expiresIn,
      uid: localId,
    });
  } catch (err) {
    console.error("Failed to login:", err.response?.data || err.message);
    res.status(401).json({
      error: "Failed to login",
      detail: err.response?.data?.error?.message || err.message,
    });
  }
};
