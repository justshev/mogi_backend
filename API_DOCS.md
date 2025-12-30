# 🍄 Mogi Backend API Documentation

API untuk monitoring pertumbuhan jamur dengan fitur prediksi AI.

**Base URL:** `http://localhost:3000`

---

## 📋 Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Authentication](#authentication)
3. [Data Endpoints](#data-endpoints)
4. [WebSocket](#websocket)

---

## 🔧 Setup & Configuration

### Environment Variables

Buat file `.env` dengan isi berikut:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server
PORT=3000

# Google AI (untuk prediksi)
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### Run Server

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push schema ke database
npx prisma db push

# Run development server
npm run dev
```

---

## 🔐 Authentication

### 1. Register User

Mendaftarkan user baru.

**Endpoint:** `POST /api/auth/register`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Success Response (201):**

```json
{
  "message": "User successfully registered",
  "user": {
    "id": "uuid-user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Response (400):**

```json
{
  "error": "Email, password, and name cannot be empty"
}
```

**Error Response (500):**

```json
{
  "error": "Failed",
  "detail": "Error message"
}
```

---

### 2. Login

Login dan mendapatkan access token.

**Endpoint:** `POST /api/auth/login`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-string",
  "expiresIn": 3600,
  "expiresAt": 1735123456,
  "uid": "uuid-user-id",
  "user": {
    "id": "uuid-user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Response (400):**

```json
{
  "error": "Email and password must be inputted"
}
```

**Error Response (401):**

```json
{
  "error": "Failed to login",
  "detail": "Invalid login credentials"
}
```

---

### 3. Refresh Token

Memperbarui access token yang sudah expired.

**Endpoint:** `POST /api/auth/refresh`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "refreshToken": "refresh-token-string"
}
```

**Success Response (200):**

```json
{
  "message": "Token refreshed successfully",
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 3600,
  "expiresAt": 1735127056
}
```

**Error Response (400):**

```json
{
  "error": "Refresh token is required"
}
```

**Error Response (401):**

```json
{
  "error": "Failed to refresh token",
  "detail": "Invalid refresh token"
}
```

---

## 📊 Data Endpoints

> ⚠️ **Semua endpoint di bawah ini memerlukan Authentication!**
>
> Tambahkan header: `Authorization: Bearer <accessToken>`

---

### 1. Save Live Data (Temperature & Humidity)

Menyimpan data suhu dan kelembapan dari sensor.

**Endpoint:** `POST /api/data/live-data`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "temperature": 28.5,
  "humidity": 75.2
}
```

**Success Response (200):**

```json
{
  "message": "Log berhasil disimpan",
  "data": {
    "temperature": 28.5,
    "humidity": 75.2
  }
}
```

**Error Response (400):**

```json
{
  "error": "Format data tidak valid",
  "message": "Data must format: { 'temperature': nilai, 'humidity': nilai }",
  "received": {}
}
```

**Error Response (401):**

```json
{
  "error": "Token tidak ditemukan."
}
```

**Error Response (403):**

```json
{
  "error": "Token tidak valid."
}
```

---

### 2. Get History Logs

Mendapatkan riwayat semua data suhu dan kelembapan user.

**Endpoint:** `GET /api/data/history`

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200):**

```json
{
  "userId": "uuid-user-id",
  "userName": "John Doe",
  "userEmail": "user@example.com",
  "logs": [
    {
      "id": "uuid-log-id",
      "userId": "uuid-user-id",
      "temperature": 28.5,
      "humidity": 75.2,
      "timestamp": "2024-12-30T10:30:00.000Z",
      "createdAt": "2024-12-30T10:30:00.000Z"
    },
    {
      "id": "uuid-log-id-2",
      "userId": "uuid-user-id",
      "temperature": 27.8,
      "humidity": 72.1,
      "timestamp": "2024-12-30T09:15:00.000Z",
      "createdAt": "2024-12-30T09:15:00.000Z"
    }
  ]
}
```

---

### 3. Get Prediction from History

Mendapatkan prediksi pertumbuhan jamur berdasarkan data historis menggunakan AI.

**Endpoint:** `GET /api/data/prediksi-from-history`

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200):**

```json
{
  "kesimpulan": "Conditions are favorable for mushroom growth",
  "skorPertumbuhan": 8,
  "tingkatRisiko": "High",
  "saran": "Monitor humidity levels and ensure proper ventilation",
  "deskripsi": "The temperature and humidity readings indicate optimal conditions for mushroom cultivation..."
}
```

**Error Response (404):**

```json
{
  "error": "Tidak ada data log ditemukan"
}
```

> 📝 **Note:** Response ini juga akan dikirim ke semua WebSocket client yang terkoneksi.

---

## 🔌 WebSocket

Server juga support WebSocket untuk real-time data streaming.

### Connection

```javascript
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
  console.log("Connected to WebSocket");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

ws.onclose = () => {
  console.log("Disconnected from WebSocket");
};
```

### Events

WebSocket akan menerima data prediksi ketika endpoint `/api/data/prediksi-from-history` dipanggil:

```json
{
  "kesimpulan": "...",
  "skorPertumbuhan": 8,
  "tingkatRisiko": "High",
  "saran": "...",
  "deskripsi": "..."
}
```

---

## 🧪 Quick Test dengan cURL

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Save Live Data (ganti TOKEN dengan accessToken dari login)

```bash
curl -X POST http://localhost:3000/api/data/live-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"temperature":28.5,"humidity":75.2}'
```

### Get History

```bash
curl -X GET http://localhost:3000/api/data/history \
  -H "Authorization: Bearer TOKEN"
```

### Get Prediction

```bash
curl -X GET http://localhost:3000/api/data/prediksi-from-history \
  -H "Authorization: Bearer TOKEN"
```

---

## 📦 API Summary Table

| Method | Endpoint                          | Auth | Description                   |
| ------ | --------------------------------- | ---- | ----------------------------- |
| POST   | `/api/auth/register`              | ❌   | Register user baru            |
| POST   | `/api/auth/login`                 | ❌   | Login user                    |
| POST   | `/api/auth/refresh`               | ❌   | Refresh access token          |
| POST   | `/api/data/live-data`             | ✅   | Simpan data suhu & kelembapan |
| GET    | `/api/data/history`               | ✅   | Ambil riwayat data            |
| GET    | `/api/data/prediksi-from-history` | ✅   | Dapatkan prediksi AI          |

---

## ❓ Error Codes

| Status Code | Meaning                                    |
| ----------- | ------------------------------------------ |
| 200         | Success                                    |
| 201         | Created (untuk register)                   |
| 400         | Bad Request - data tidak valid             |
| 401         | Unauthorized - perlu login / token expired |
| 403         | Forbidden - token tidak valid              |
| 404         | Not Found - data tidak ditemukan           |
| 500         | Internal Server Error                      |

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma 7
- **Auth:** Supabase Auth
- **AI:** Google Generative AI
- **Real-time:** WebSocket
