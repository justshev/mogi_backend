<div align="center">

# 🍄 MOGI Backend

**Mushroom Optimal Growth Intelligence**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google AI](https://img.shields.io/badge/Google%20AI-Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

_Backend cerdas untuk monitoring pertumbuhan jamur dengan prediksi AI real-time_ 🚀

[Fitur](#-fitur-utama) • [Instalasi](#-instalasi) • [API Docs](#-dokumentasi-api) • [Arsitektur](#-arsitektur)

</div>

---

## 📖 Tentang Proyek

**MOGI Backend** adalah sistem backend yang dirancang khusus untuk membantu petani jamur dalam memantau kondisi lingkungan secara real-time dan memprediksi pertumbuhan jamur menggunakan kecerdasan buatan. Sistem ini mengintegrasikan sensor IoT (Arduino) untuk mengumpulkan data suhu dan kelembapan, kemudian menganalisisnya menggunakan Google Generative AI.

---

## ✨ Fitur Utama

| Fitur                       | Deskripsi                                                   |
| --------------------------- | ----------------------------------------------------------- |
| 🌡️ **Real-time Monitoring** | Pantau suhu dan kelembapan secara langsung via WebSocket    |
| 🤖 **AI Prediction**        | Prediksi pertumbuhan jamur menggunakan Google Gemini AI     |
| 📊 **Smart Logging**        | Penyimpanan data pintar: setiap 30 menit atau saat lonjakan |
| 🔐 **Secure Auth**          | Autentikasi aman dengan Supabase Auth + JWT                 |
| 🔌 **WebSocket Support**    | Streaming data real-time ke aplikasi client                 |
| 📈 **History Analytics**    | Riwayat lengkap data monitoring untuk analisis              |

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        MOGI Backend                         │
├─────────────────────────────────────────────────────────────┤
│  Runtime       │  Node.js 18+                               │
│  Framework     │  Express.js 5.x                            │
│  Database      │  PostgreSQL (via Supabase)                 │
│  ORM           │  Prisma 7.x                                │
│  Auth          │  Supabase Authentication                   │
│  AI            │  Google Generative AI (Gemini)             │
│  Real-time     │  Native WebSocket (ws)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Instalasi

### Prerequisites

Pastikan Anda sudah menginstall:

- **Node.js** v18 atau lebih baru
- **npm** atau **yarn**
- **PostgreSQL** database (atau gunakan Supabase)

### Langkah Instalasi

#### 1️⃣ Clone Repository

```bash
git clone https://github.com/justshev/mogi_backend.git
cd mogi_backend
```

#### 2️⃣ Install Dependencies

```bash
npm install
# atau
yarn install
```

#### 3️⃣ Setup Environment Variables

Buat file `.env` di root folder:

```env
# ═══════════════════════════════════════════════════════════
# 🔐 SUPABASE CONFIGURATION
# ═══════════════════════════════════════════════════════════
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ═══════════════════════════════════════════════════════════
# 🤖 GOOGLE AI CONFIGURATION
# ═══════════════════════════════════════════════════════════
GOOGLE_AI_API_KEY=your-google-ai-api-key

# ═══════════════════════════════════════════════════════════
# ⚙️ SERVER CONFIGURATION
# ═══════════════════════════════════════════════════════════
PORT=3000
```

#### 4️⃣ Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke database
npm run db:push

# (Opsional) Buka Prisma Studio untuk melihat data
npm run db:studio
```

#### 5️⃣ Jalankan Server

```bash
# Development mode (dengan hot reload)
npm run dev

# Production mode
npm start
```

🎉 Server akan berjalan di `http://localhost:3000`

---

## 📂 Struktur Proyek

```
mogi_backend/
├── 📄 app.js                    # Entry point aplikasi
├── 📄 package.json              # Konfigurasi npm & scripts
├── 📄 supabase.js               # Konfigurasi Supabase client
│
├── 📁 controllers/              # Logic handler API
│   ├── auth.controller.js       # Handler autentikasi
│   ├── prediksi.controller.js   # Handler prediksi AI
│   ├── temperature.controller.js    # Handler temperature (Supabase RT)
│   └── temperature-ws.controller.js # Handler temperature (WebSocket)
│
├── 📁 routes/                   # Definisi endpoint API
│   ├── auth.route.js            # Route autentikasi
│   ├── prediksi.route.js        # Route prediksi
│   ├── temperature.route.js     # Route temperature
│   └── temperature-ws.route.js  # Route temperature WebSocket
│
├── 📁 services/                 # Business logic layer
│   ├── genai.service.js         # Service untuk Google AI
│   ├── prisma.service.js        # Service untuk Prisma
│   ├── temperature.service.js   # Service temperature
│   └── temperature-ws.service.js # Service temperature WebSocket
│
├── 📁 middleware/               # Express middleware
│   └── auth.middleware.js       # Middleware autentikasi JWT
│
├── 📁 prisma/                   # Database schema
│   └── schema.prisma            # Prisma schema definition
│
├── 📁 lib/                      # Library utilities
│   └── prisma.js                # Prisma client singleton
│
├── 📁 utils/                    # Helper utilities
│   └── jsonExtractor.js         # Utility extract JSON dari AI response
│
├── 📁 docs/                     # Dokumentasi tambahan
│   └── TEMPERATURE_WS_DOCS.md   # Docs WebSocket API
│
└── 📁 postman/                  # Koleksi Postman untuk testing
    ├── Temperature_Monitoring.postman_collection.json
    └── Temperature_WS_Monitoring.postman_collection.json
```

---

## 📡 Dokumentasi API

### Base URL

```
http://localhost:3000
```

### Ringkasan Endpoint

#### 🔐 Authentication

| Method | Endpoint             | Auth | Deskripsi            |
| ------ | -------------------- | :--: | -------------------- |
| `POST` | `/api/auth/register` |  ❌  | Daftar user baru     |
| `POST` | `/api/auth/login`    |  ❌  | Login user           |
| `POST` | `/api/auth/refresh`  |  ❌  | Refresh access token |

#### 📊 Data & Prediksi

| Method | Endpoint                          | Auth | Deskripsi                     |
| ------ | --------------------------------- | :--: | ----------------------------- |
| `POST` | `/api/data/live-data`             |  ✅  | Simpan data suhu & kelembapan |
| `GET`  | `/api/data/history`               |  ✅  | Ambil riwayat data            |
| `GET`  | `/api/data/prediksi-from-history` |  ✅  | Dapatkan prediksi AI          |

#### 🌡️ Temperature Monitoring

| Method | Endpoint                  | Auth | Deskripsi              |
| ------ | ------------------------- | :--: | ---------------------- |
| `POST` | `/api/temperature/data`   |  ✅  | Kirim data temperature |
| `POST` | `/api/temperature/bulk`   |  ✅  | Kirim multiple data    |
| `GET`  | `/api/temperature/state`  |  ✅  | Get monitoring state   |
| `POST` | `/api/temperature/config` |  ✅  | Update konfigurasi     |
| `POST` | `/api/temperature/reset`  |  ✅  | Reset state monitoring |

#### 🔌 Temperature WebSocket

| Method | Endpoint                       | Auth | Deskripsi                |
| ------ | ------------------------------ | :--: | ------------------------ |
| `POST` | `/api/temperature-ws/data`     |  ✅  | Kirim data via WebSocket |
| `POST` | `/api/temperature-ws/bulk`     |  ✅  | Kirim bulk data via WS   |
| `POST` | `/api/temperature-ws/simulate` |  ✅  | Simulasi data otomatis   |
| `GET`  | `/api/temperature-ws/state`    |  ✅  | Get state                |
| `POST` | `/api/temperature-ws/config`   |  ✅  | Update config            |
| `POST` | `/api/temperature-ws/reset`    |  ✅  | Reset state              |

> 📚 **Dokumentasi lengkap:** Lihat [API_DOCS.md](API_DOCS.md) untuk detail request/response

---

## 🚀 Quick Start Guide

### 1. Register User Baru

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "petani@jamur.com",
    "password": "password123",
    "name": "Pak Tani"
  }'
```

**Response:**

```json
{
  "message": "User successfully registered",
  "user": {
    "id": "uuid-user-id",
    "email": "petani@jamur.com",
    "name": "Pak Tani"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "petani@jamur.com",
    "password": "password123"
  }'
```

**Response:**

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh-token-string",
  "expiresIn": 3600,
  "uid": "uuid-user-id",
  "user": {
    "id": "uuid-user-id",
    "email": "petani@jamur.com",
    "name": "Pak Tani"
  }
}
```

### 3. Kirim Data Temperature

```bash
curl -X POST http://localhost:3000/api/temperature/data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "temperature": 28.5,
    "humidity": 75.2
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Data temperature diterima dan dipush ke realtime",
  "data": {
    "realtimePushed": true,
    "logSaved": false,
    "currentState": {
      "temperature": 28.5,
      "humidity": 75.2,
      "lastSavedAt": "2025-01-01T12:00:00.000Z"
    }
  }
}
```

### 4. Dapatkan Prediksi AI

```bash
curl -X GET http://localhost:3000/api/data/prediksi-from-history \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "kesimpulan": "Kondisi lingkungan optimal untuk pertumbuhan jamur",
  "skorPertumbuhan": 8,
  "tingkatRisiko": "Rendah",
  "saran": "Pertahankan suhu dan kelembapan saat ini",
  "deskripsi": "Berdasarkan data monitoring, kondisi sangat baik..."
}
```

---

## 🔌 WebSocket Connection

### Cara Koneksi

```javascript
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
  console.log("✅ Terhubung ke WebSocket");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("📡 Data diterima:", data);
};

ws.onclose = () => {
  console.log("❌ Terputus dari WebSocket");
};

ws.onerror = (error) => {
  console.error("⚠️ Error:", error);
};
```

### Format Data yang Diterima

#### Temperature Update

```json
{
  "type": "TEMPERATURE_UPDATE",
  "userId": "uuid-user-id",
  "data": {
    "temperature": 28.5,
    "humidity": 75.2,
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

#### Prediksi AI

```json
{
  "kesimpulan": "Kondisi optimal",
  "skorPertumbuhan": 8,
  "tingkatRisiko": "Rendah",
  "saran": "Pertahankan kondisi saat ini",
  "deskripsi": "..."
}
```

---

## 🧪 Testing dengan Postman

Import koleksi Postman yang sudah disediakan:

1. Buka **Postman**
2. Klik **Import** → pilih file dari folder `postman/`:
   - `Temperature_Monitoring.postman_collection.json`
   - `Temperature_WS_Monitoring.postman_collection.json`
3. Jalankan request **Login** terlebih dahulu
4. Copy `accessToken` dari response
5. Set header `Authorization: Bearer <accessToken>` untuk request lainnya

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐     ┌─────────────────────────────────────────┐     ┌─────────────────┐
│   Arduino/IoT   │     │              MOGI Backend               │     │   Mobile App    │
│    Sensors      │────▶│                                         │────▶│   (Flutter)     │
│  (DHT11/DHT22)  │     │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │     │                 │
└─────────────────┘     │  │ Express │──│ Service │──│  Prisma │  │     └─────────────────┘
                        │  │ Router  │  │  Layer  │  │   ORM   │  │              │
                        │  └─────────┘  └─────────┘  └────┬────┘  │              │
                        │       │            │            │       │              │
                        │       ▼            ▼            ▼       │              │
                        │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │              │
                        │  │Websocket│  │Google AI│  │Supabase │  │              │
                        │  │ Server  │  │ (Gemini)│  │   DB    │  │              │
                        │  └────┬────┘  └─────────┘  └─────────┘  │              │
                        └───────┼─────────────────────────────────┘              │
                                │                                                │
                                └────────────────────────────────────────────────┘
                                            Real-time Data Stream
```

### Flow Data

```
┌─────────────┐
│  Sensor     │
│  Arduino    │
└──────┬──────┘
       │ POST /api/temperature/data
       ▼
┌──────────────────────────────────────┐
│         Temperature Service          │
│  ┌────────────────────────────────┐  │
│  │  1. Cek threshold (lonjakan?)  │  │
│  │  2. Cek interval (30 menit?)   │  │
│  └────────────────────────────────┘  │
└───────┬────────────────────┬─────────┘
        │                    │
   [Lonjakan/Interval]   [Stabil]
        │                    │
        ▼                    ▼
┌───────────────┐    ┌───────────────┐
│ Simpan ke DB  │    │ Broadcast saja│
│ + Broadcast   │    │ (skip save)   │
└───────────────┘    └───────────────┘
```

---

## 📜 NPM Scripts

| Script        | Perintah                 | Deskripsi                  |
| ------------- | ------------------------ | -------------------------- |
| `start`       | `node app.js`            | Jalankan server production |
| `dev`         | `nodemon app.js`         | Jalankan dengan hot reload |
| `db:generate` | `npx prisma generate`    | Generate Prisma client     |
| `db:push`     | `npx prisma db push`     | Push schema ke database    |
| `db:migrate`  | `npx prisma migrate dev` | Jalankan migration         |
| `db:studio`   | `npx prisma studio`      | Buka GUI database          |

---

## ⚠️ Error Codes

| Status | Arti         | Solusi                      |
| ------ | ------------ | --------------------------- |
| `200`  | Success      | ✅ Request berhasil         |
| `201`  | Created      | ✅ Resource berhasil dibuat |
| `400`  | Bad Request  | Periksa format data request |
| `401`  | Unauthorized | Login ulang / refresh token |
| `403`  | Forbidden    | Token tidak valid           |
| `404`  | Not Found    | Data tidak ditemukan        |
| `500`  | Server Error | Cek log server              |

---

## 🔧 Konfigurasi Monitoring

### Default Configuration

| Parameter      | Default  | Deskripsi                             |
| -------------- | -------- | ------------------------------------- |
| `threshold`    | 5°C      | Selisih suhu untuk trigger "lonjakan" |
| `saveInterval` | 30 menit | Interval penyimpanan data stabil      |

### Update Configuration

```bash
curl -X POST http://localhost:3000/api/temperature/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "threshold": 3,
    "saveIntervalMinutes": 15
  }'
```

---

## 🤝 Contributing

Kontribusi sangat diterima! Silakan:

1. **Fork** repository ini
2. Buat **branch** baru (`git checkout -b feature/AmazingFeature`)
3. **Commit** perubahan (`git commit -m 'Add some AmazingFeature'`)
4. **Push** ke branch (`git push origin feature/AmazingFeature`)
5. Buat **Pull Request**

---

## 📝 License

Distributed under the **ISC License**.

---

## 📞 Contact & Support

**Developer Team:** Ayo Beraksi - Telkom University

Jika ada pertanyaan atau kendala, silakan buka **Issue** di repository ini.

---

<div align="center">

### 🍄 Happy Mushroom Farming! 🍄

_Made with ❤️ for Indonesian mushroom farmers_

**[⬆ Kembali ke Atas](#-mogi-backend)**

</div>
