import express from "express";
import "dotenv/config";
import prediksiRouter from "./routes/prediksi.route.js";
import authRouter from "./routes/auth.route.js";
const app = express();
app.use(express.json());

app.use("/api/prediksi-jamur", prediksiRouter);
app.use("/api/auth", authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
