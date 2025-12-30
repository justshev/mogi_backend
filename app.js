import express from "express";
import http from "http"; // import module HTTP bawaan node
import WebSocket from "ws";
import "dotenv/config";

import prediksiRouter from "./routes/prediksi.route.js";
import authRouter from "./routes/auth.route.js";
import temperatureRouter from "./routes/temperature.route.js";

const app = express();
app.use(express.json());

// Buat HTTP server manual dan pasang Express ke dalamnya
const server = http.createServer(app);

// Buat WebSocket Server attach ke HTTP server yang sama
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);
  console.log("Client WebSocket terhubung");

  ws.on("close", () => {
    clients = clients.filter((client) => client !== ws);
  });
});

// Middleware supaya clients WebSocket bisa diakses di route handler
app.use((req, res, next) => {
  req.wssClients = clients;
  next();
});

// Pasang router Express
app.use("/api/data", prediksiRouter);
app.use("/api/auth", authRouter);
app.use("/api/temperature", temperatureRouter);

const PORT = process.env.PORT || 3000;

// Jalankan server HTTP (Express + WebSocket)
server.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
