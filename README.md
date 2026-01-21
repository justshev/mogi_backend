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

| Fitur                       | Deskripsi                                                     |
| --------------------------- | ------------------------------------------------------------- |
| 🌡️ **Real-time Monitoring** | Pantau suhu dan kelembapan secara langsung via WebSocket      |
| 🤖 **AI Prediction**        | Prediksi pertumbuhan jamur menggunakan Google Gemini AI       |
| 📊 **Smart Logging**        | Penyimpanan data pintar: setiap 30 menit atau saat lonjakan   |
| 🔐 **Secure Auth**          | Autentikasi aman dengan Supabase Auth + JWT                   |
| 🔌 **WebSocket Support**    | Streaming data real-time ke aplikasi client                   |
| 📈 **History Analytics**    | Riwayat lengkap data monitoring untuk analisis                |
| 📱 **Device Management**    | Registrasi & pengelolaan device dengan sistem PIN             |
| 🎮 **Device Control**       | Kontrol Arduino dengan session berbasis PIN (5 menit timeout) |

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
│   ├── device.controller.js     # Handler device management
│   ├── device-control.controller.js # Handler device control (Arduino)
│   ├── prediksi.controller.js   # Handler prediksi AI
│   ├── temperature.controller.js    # Handler temperature (Supabase RT)
│   └── temperature-ws.controller.js # Handler temperature (WebSocket)
│
├── 📁 routes/                   # Definisi endpoint API
│   ├── auth.route.js            # Route autentikasi
│   ├── device.route.js          # Route device management
│   ├── device-control.route.js  # Route device control
│   ├── prediksi.route.js        # Route prediksi
│   ├── temperature.route.js     # Route temperature
│   └── temperature-ws.route.js  # Route temperature WebSocket
│
├── 📁 services/                 # Business logic layer
│   ├── device.service.js        # Service untuk device management
│   ├── device-session.service.js # Service untuk device session (PIN auth)
│   ├── genai.service.js         # Service untuk Google AI
│   ├── prisma.service.js        # Service untuk Prisma
│   ├── temperature.service.js   # Service temperature
│   └── temperature-ws.service.js # Service temperature WebSocket
│
├── 📁 middleware/               # Express middleware
│   ├── auth.middleware.js       # Middleware autentikasi JWT
│   └── device-session.middleware.js # Middleware validasi device session
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
│   ├── DEVICE_API_DOCS.md       # Docs Device Management API
│   ├── DEVICE_CONTROL_API_DOCS.md # Docs Device Control API
│   └── TEMPERATURE_WS_DOCS.md   # Docs WebSocket API
│
└── 📁 postman/                  # Koleksi Postman untuk testing
    ├── Device_Management.postman_collection.json
    ├── Device_Management_API.postman_collection.json
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

#### 📱 Device Management

| Method | Endpoint                         | Auth | Deskripsi                         |
| ------ | -------------------------------- | :--: | --------------------------------- |
| `POST` | `/api/device/create`             |  ❌  | Buat device baru (admin/system)   |
| `GET`  | `/api/device/status/:deviceCode` |  ❌  | Cek status device                 |
| `POST` | `/api/device/register`           |  ✅  | Register device (claim ownership) |
| `POST` | `/api/device/connect`            |  ✅  | Connect ke device dengan PIN      |
| `POST` | `/api/device/forget`             |  ✅  | Lepas kepemilikan device          |
| `POST` | `/api/device/change-pin`         |  ✅  | Ubah PIN device                   |
| `GET`  | `/api/device/my-devices`         |  ✅  | List semua device user            |
| `PUT`  | `/api/device/update-name`        |  ✅  | Update nama device                |
| `GET`  | `/api/device/:deviceCode`        |  ✅  | Get detail device                 |

#### 🎮 Device Control (Arduino)

| Method | Endpoint                                 |  Auth   | Deskripsi                |
| ------ | ---------------------------------------- | :-----: | ------------------------ |
| `POST` | `/api/device/auth`                       |   ✅    | Auth device dengan PIN   |
| `GET`  | `/api/device/session/status`             | ✅ + 🔑 | Cek status session       |
| `POST` | `/api/device/session/extend`             | ✅ + 🔑 | Perpanjang session       |
| `POST` | `/api/device/session/logout`             | ✅ + 🔑 | Logout session           |
| `POST` | `/api/device/control`                    | ✅ + 🔑 | Kirim kontrol ke Arduino |
| `GET`  | `/api/device/control/:deviceCode/status` | ✅ + 🔑 | Get status device        |

> 🔑 = Memerlukan Device Session Token (header `X-Device-Session`)

> 📚 **Dokumentasi lengkap:**
>
> - [API_DOCS.md](API_DOCS.md) - General API
> - [docs/DEVICE_API_DOCS.md](docs/DEVICE_API_DOCS.md) - Device Management
> - [docs/DEVICE_CONTROL_API_DOCS.md](docs/DEVICE_CONTROL_API_DOCS.md) - Device Control
> - [docs/TEMPERATURE_WS_DOCS.md](docs/TEMPERATURE_WS_DOCS.md) - Temperature WebSocket

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

### 5. Register Device

```bash
curl -X POST http://localhost:3000/api/device/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "deviceCode": "DEVICE-001",
    "pin": "1234"
  }'
```

**Response:**

```json
{
  "message": "Device registered successfully",
  "device": {
    "id": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "name": "Alat Monitoring Suhu #1",
    "isRegistered": true,
    "owner": {
      "id": "uuid-user-id",
      "name": "Pak Tani",
      "email": "petani@jamur.com"
    }
  }
}
```

### 6. Auth Device & Kirim Kontrol

```bash
# Step 1: Auth device dengan PIN (dapat session token berlaku 5 menit)
curl -X POST http://localhost:3000/api/device/auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "deviceCode": "DEVICE-001",
    "pin": "1234"
  }'

# Step 2: Kirim kontrol ke Arduino (dengan session token)
curl -X POST http://localhost:3000/api/device/control \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Device-Session: SESSION_TOKEN_FROM_AUTH" \
  -d '{
    "deviceCode": "DEVICE-001",
    "targetTemperature": 28.5,
    "targetHumidity": 75,
    "fanSpeed": 80,
    "heaterOn": true
  }'
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

#### Device Control (dari App ke Arduino)

```json
{
  "type": "DEVICE_CONTROL",
  "deviceId": "uuid-device-id",
  "deviceCode": "DEVICE-001",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "controls": {
    "targetTemperature": 28.5,
    "targetHumidity": 75,
    "fanSpeed": 80,
    "heaterOn": true,
    "action": "START_MONITORING"
  }
}
```

---

## 🧪 Testing dengan Postman

Import koleksi Postman yang sudah disediakan:

1. Buka **Postman**
2. Klik **Import** → pilih file dari folder `postman/`:
   - `Device_Management.postman_collection.json` - Device Management API
   - `Device_Management_API.postman_collection.json` - Device Management API (Extended)
   - `Temperature_Monitoring.postman_collection.json` - Temperature Monitoring
   - `Temperature_WS_Monitoring.postman_collection.json` - Temperature WebSocket
3. Set collection variables:
   - `baseUrl`: `http://localhost:3000`
   - `accessToken`: Token dari response login
   - `deviceCode`: Kode device (contoh: `DEVICE-001`)
   - `pin`: PIN device (contoh: `1234`)
4. Jalankan request **Login** terlebih dahulu
5. Copy `accessToken` dari response dan set ke variable

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐     ┌─────────────────────────────────────────┐     ┌─────────────────┐
│   Arduino/IoT   │◄───▶│              MOGI Backend               │◄───▶│   Mobile App    │
│    Sensors      │     │                                         │     │   (Flutter)     │
│  (DHT11/DHT22)  │     │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │     │                 │
└─────────────────┘     │  │ Express │──│ Service │──│  Prisma │  │     └─────────────────┘
        │               │  │ Router  │  │  Layer  │  │   ORM   │  │              │
        │               │  └─────────┘  └─────────┘  └────┬────┘  │              │
        │               │       │            │            │       │              │
        ▼               │       ▼            ▼            ▼       │              │
┌─────────────────┐     │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │              │
│  Device Control │────▶│  │Websocket│  │Google AI│  │Supabase │  │              │
│  (via Session)  │     │  │ Server  │  │ (Gemini)│  │   DB    │  │              │
└─────────────────┘     │  └────┬────┘  └─────────┘  └─────────┘  │              │
                        └───────┼─────────────────────────────────┘              │
                                │                                                │
                                └────────────────────────────────────────────────┘
                                            Real-time Data Stream
```

### Device Session Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Device Control Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. POST /api/device/auth                                   │
│     ├── Input: deviceCode, pin                              │
│     └── Output: session token (valid 5 min)                 │
│                       │                                      │
│                       ▼                                      │
│  2. POST /api/device/control                                │
│     ├── Header: X-Device-Session: <token>                   │
│     ├── Body: { targetTemperature, fanSpeed, ... }          │
│     └── Output: success + broadcast ke Arduino via WS       │
│                       │                                      │
│            ┌──────────┴──────────┐                          │
│            │                     │                          │
│            ▼                     ▼                          │
│   Session masih valid     Session expired                   │
│   (< 5 menit)             (> 5 menit)                       │
│            │                     │                          │
│            │                     ▼                          │
│            │         Error → Auth ulang dengan PIN          │
│            │                                                 │
│            ▼                                                 │
│   POST /api/device/session/extend (perpanjang 5 menit)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
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

| Status | Arti         | Solusi                            |
| ------ | ------------ | --------------------------------- |
| `200`  | Success      | ✅ Request berhasil               |
| `201`  | Created      | ✅ Resource berhasil dibuat       |
| `400`  | Bad Request  | Periksa format data request       |
| `401`  | Unauthorized | Login ulang / refresh token       |
| `403`  | Forbidden    | Token/akses tidak valid           |
| `404`  | Not Found    | Data tidak ditemukan              |
| `409`  | Conflict     | Data sudah ada (device terdaftar) |
| `500`  | Server Error | Cek log server                    |

### Device Session Error Codes

| Code               | Deskripsi                               |
| ------------------ | --------------------------------------- |
| `SESSION_REQUIRED` | Session token tidak disertakan          |
| `SESSION_EXPIRED`  | Session sudah expired, perlu auth ulang |
| `SESSION_MISMATCH` | Session bukan milik user yang login     |

---

## 🔧 Konfigurasi Monitoring

### Default Configuration

| Parameter      | Default  | Deskripsi                             |
| -------------- | -------- | ------------------------------------- |
| `threshold`    | 5°C      | Selisih suhu untuk trigger "lonjakan" |
| `saveInterval` | 30 menit | Interval penyimpanan data stabil      |

### Device PIN Requirements

| Parameter | Requirement              |
| --------- | ------------------------ |
| Format    | Angka saja (0-9)         |
| Panjang   | 4-6 digit                |
| Contoh    | `1234`, `123456`, `0000` |

### Update Monitoring Configuration

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

**Developer Team:** Nirmalabs - Telkom University

Jika ada pertanyaan atau kendala, silakan buka **Issue** di repository ini.

---

<div align="center">

### 🍄 Happy Mushroom Farming! 🍄

_Made with ❤️ for Indonesian mushroom farmers_

**[⬆ Kembali ke Atas](#-mogi-backend)**

</div>
