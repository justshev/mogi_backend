import { Router } from "express";
import { getData, LiveDataLogs } from "../controllers/prediksi.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getJamurHistory } from "../controllers/prediksi.controller.js";
import { prediksiDariHistory } from "../controllers/prediksi.controller.js";
const router = Router();

router.post("/live-data", authenticate, LiveDataLogs);
router.get("/history", authenticate, getJamurHistory);
router.get("/prediksi-from-history", authenticate, prediksiDariHistory);
// router.post("/get-data", getData);

export default router;
