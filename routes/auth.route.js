import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
} from "../controllers/auth.controller.js";

const router = Router();

// Endpoint untuk Register
router.post("/register", registerUser);

// Endpoint untuk Login
router.post("/login", loginUser);

// Endpoint untuk Refresh Token
router.post("/refresh", refreshToken);

export default router;
