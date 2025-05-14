import { Router } from "express";
import { prediksiJamur } from "../controllers/prediksi.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();

router.post("/", authenticate, prediksiJamur);

export default router;
