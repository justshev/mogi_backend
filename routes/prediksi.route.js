import { Router } from "express";
import { prediksiJamur } from "../controllers/prediksi.controller.js";

const router = Router();

router.post("/", prediksiJamur);

export default router;
