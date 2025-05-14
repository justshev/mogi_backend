import { Router } from "express";
import { prediksiJamur } from "../controllers/prediksi.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getJamurHistory } from "../controllers/prediksi.controller.js";
const router = Router();

router.post("/", authenticate, prediksiJamur);
router.get("/history", authenticate, getJamurHistory);

export default router;
