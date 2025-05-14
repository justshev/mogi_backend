import { Router } from "express";
import { registerUser, loginUser } from "../controllers/auth.controller.js";

const router = Router();

// Endpoint untuk Register
router.post("/register", registerUser);

// Endpoint untuk Login
router.post("/login", loginUser);

export default router;
