import { supabaseAdmin } from "../supabase.js";
import { saveUserIfNotExists } from "../services/prisma.service.js";

// Fungsi untuk Register
export const registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "Email, password, and name cannot be empty" });
  }

  try {
    // Mendaftar pengguna dengan email dan password menggunakan Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm email
      user_metadata: { name },
    });

    if (error) {
      throw error;
    }

    // Simpan data user ke tabel users
    await saveUserIfNotExists(data.user.id, { name, email });

    res.status(201).json({
      message: "User successfully registered",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name,
      },
    });
  } catch (err) {
    console.error("Error registering new user:", err.message);
    res.status(500).json({ error: "Failed", detail: err.message });
  }
};

// Login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password must be inputted" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const { session, user } = data;

    res.status(200).json({
      message: "Login successful",
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      expiresAt: session.expires_at,
      uid: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
      },
    });
  } catch (err) {
    console.error("Failed to login:", err.message);
    res.status(401).json({
      error: "Failed to login",
      detail: err.message,
    });
  }
};

// Refresh Token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      expiresAt: data.session.expires_at,
    });
  } catch (err) {
    console.error("Failed to refresh token:", err.message);
    res.status(401).json({
      error: "Failed to refresh token",
      detail: err.message,
    });
  }
};
