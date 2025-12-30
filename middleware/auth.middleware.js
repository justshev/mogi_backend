import { supabaseAdmin } from "../supabase.js";

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token tidak ditemukan." });
  }

  const accessToken = header.split("Bearer ")[1];

  try {
    // Verifikasi token menggunakan Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new Error(error?.message || "User not found");
    }

    // Set user data ke request object
    req.user = {
      uid: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name,
      ...data.user,
    };

    next();
  } catch (err) {
    console.error("Token tidak valid:", err.message);
    return res.status(403).json({ error: "Token tidak valid." });
  }
};
