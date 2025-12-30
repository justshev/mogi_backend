# 🌡️ Temperature Monitoring WebSocket API

API untuk monitoring temperature secara realtime menggunakan WebSocket (tanpa Supabase Realtime).

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Flow Diagram](#flow-diagram)
3. [WebSocket Connection](#websocket-connection)
4. [REST API Endpoints](#rest-api-endpoints)
5. [Testing dengan Postman](#testing-dengan-postman)
6. [Contoh Skenario Testing](#contoh-skenario-testing)

---

## 🎯 Overview

### Logic Penyimpanan Data:

| Kondisi                                   | Aksi                                   |
| ----------------------------------------- | -------------------------------------- |
| **Data Stabil**                           | Simpan ke database setiap **30 menit** |
| **Ada Lonjakan** (perubahan >= threshold) | **Langsung simpan** ke database        |

### Default Configuration:

| Parameter      | Default Value | Keterangan                                    |
| -------------- | ------------- | --------------------------------------------- |
| `threshold`    | 5°C           | Selisih temperature untuk dianggap "lonjakan" |
| `saveInterval` | 30 menit      | Interval penyimpanan untuk data stabil        |

---

## 📊 Flow Diagram

```
┌─────────────────┐
│  Arduino/Postman│
│  Kirim Data     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POST /data     │
│  (REST API)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Process Temperature Data            │
│  1. Broadcast ke WebSocket clients   │
│  2. Cek: Lonjakan atau 30 menit?     │
└────────┬───────────────────┬─────────┘
         │                   │
    [Lonjakan/30min]    [Stabil]
         │                   │
         ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│  Simpan ke DB   │   │  Skip save      │
│  (logs table)   │   │  (hanya WS)     │
└─────────────────┘   └─────────────────┘
```

---

## 🔌 WebSocket Connection

### Connect ke WebSocket Server

**URL:** `ws://localhost:3000`

### Menggunakan Browser Console:

```javascript
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
  console.log("✅ Connected to WebSocket");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("📡 Received:", data);
};

ws.onclose = () => {
  console.log("❌ Disconnected from WebSocket");
};
```

### Format Data yang Diterima:

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

---

## 🚀 REST API Endpoints

Base URL: `http://localhost:3000/api/temperature-ws`

| Method | Endpoint    | Auth | Deskripsi                     |
| ------ | ----------- | ---- | ----------------------------- |
| POST   | `/data`     | ✅   | Kirim data temperature        |
| POST   | `/bulk`     | ✅   | Kirim multiple data sekaligus |
| POST   | `/simulate` | ✅   | Simulasi data otomatis        |
| GET    | `/state`    | ✅   | Get monitoring state          |
| POST   | `/config`   | ✅   | Update konfigurasi            |
| POST   | `/reset`    | ✅   | Reset state monitoring        |

---

### 1. POST /data - Kirim Data Temperature

Kirim data temperature tunggal dari Arduino/sensor.

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

**Response (Data Stabil - Tidak Disimpan):**

```json
{
  "success": true,
  "message": "Data temperature diterima dan di-broadcast via WebSocket",
  "data": {
    "broadcasted": 2,
    "logSaved": false,
    "saveReason": null,
    "log": null,
    "currentState": {
      "temperature": 28.5,
      "humidity": 75.2,
      "lastSavedAt": "2025-01-01T12:00:00.000Z",
      "nextSaveIn": 1200
    }
  }
}
```

**Response (Lonjakan Terdeteksi - Disimpan):**

```json
{
  "success": true,
  "message": "Data temperature diterima dan disimpan ke log (spike_detected)",
  "data": {
    "broadcasted": 2,
    "logSaved": true,
    "saveReason": "spike_detected",
    "log": {
      "id": "uuid",
      "userId": "uuid",
      "temperature": 40.0,
      "humidity": 90.0,
      "timestamp": "...",
      "createdAt": "..."
    },
    "currentState": { ... }
  }
}
```

---

### 2. POST /bulk - Kirim Multiple Data

Kirim beberapa data sekaligus untuk testing.

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "data": [
    { "temperature": 28.0, "humidity": 70.0 },
    { "temperature": 28.2, "humidity": 71.0 },
    { "temperature": 35.0, "humidity": 85.0 },
    { "temperature": 28.5, "humidity": 72.0 }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "4 data berhasil diproses",
  "results": [
    { "broadcasted": 1, "logSaved": true, "saveReason": "interval_30min", ... },
    { "broadcasted": 1, "logSaved": false, ... },
    { "broadcasted": 1, "logSaved": true, "saveReason": "spike_detected", ... },
    { "broadcasted": 1, "logSaved": true, "saveReason": "spike_detected", ... }
  ]
}
```

---

### 3. POST /simulate - Simulasi Data Otomatis

Generate data temperature otomatis dengan opsi include spike.

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "count": 10,
  "baseTemp": 28,
  "baseHumidity": 70,
  "includeSpike": true
}
```

| Parameter      | Type    | Default | Keterangan                  |
| -------------- | ------- | ------- | --------------------------- |
| `count`        | number  | 5       | Jumlah data yang digenerate |
| `baseTemp`     | number  | 28      | Temperature dasar           |
| `baseHumidity` | number  | 70      | Humidity dasar              |
| `includeSpike` | boolean | true    | Include lonjakan di tengah  |

**Response:**

```json
{
  "success": true,
  "message": "Simulasi selesai: 10 data diproses, 3 disimpan, 1 spike detected",
  "summary": {
    "totalProcessed": 10,
    "totalSaved": 3,
    "spikeDetected": 1
  },
  "results": [
    { "index": 1, "temperature": 27.8, "humidity": 69.5, ... },
    ...
  ]
}
```

---

### 4. GET /state - Get Monitoring State

Lihat state monitoring saat ini.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response:**

```json
{
  "success": true,
  "userId": "uuid-user-id",
  "state": {
    "lastSavedAt": 1704110400000,
    "lastTemperature": 28.5,
    "lastHumidity": 75.2,
    "threshold": 5,
    "saveInterval": 1800000,
    "lastSavedAtFormatted": "2025-01-01T12:00:00.000Z",
    "nextSaveInSeconds": 1200
  }
}
```

---

### 5. POST /config - Update Konfigurasi

Update threshold dan interval penyimpanan.

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "threshold": 3,
  "saveIntervalMinutes": 1
}
```

| Parameter             | Type   | Keterangan                    |
| --------------------- | ------ | ----------------------------- |
| `threshold`           | number | Selisih °C untuk trigger save |
| `saveIntervalMinutes` | number | Interval save dalam menit     |

**Response:**

```json
{
  "success": true,
  "message": "Konfigurasi berhasil diupdate",
  "userId": "uuid",
  "updated": {
    "threshold": 3,
    "saveIntervalMinutes": 1
  },
  "currentState": { ... }
}
```

---

### 6. POST /reset - Reset State

Reset semua tracking state ke awal.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response:**

```json
{
  "success": true,
  "message": "State berhasil direset",
  "userId": "uuid",
  "state": {
    "lastSavedAt": null,
    "lastTemperature": null,
    "lastHumidity": null,
    "threshold": 5,
    "saveInterval": 1800000
  }
}
```

---

## 🧪 Testing dengan Postman

### Step 1: Import Collection

1. Buka Postman
2. Import file: `postman/Temperature_WS_Monitoring.postman_collection.json`
3. Collection akan muncul di sidebar

### Step 2: Setup Environment

Pastikan variable sudah di-set:

- `baseUrl`: `http://localhost:3000`
- `accessToken`: (akan auto-fill setelah login)

### Step 3: Flow Testing

```
1. Login          → Dapat accessToken (auto-save)
2. Reset State    → Bersihkan state sebelumnya
3. Set Config     → Set interval 1 menit untuk testing cepat
4. Send Data 1    → Data pertama (auto-save karena interval)
5. Send Data 2    → Data stabil (tidak disimpan)
6. Send Spike     → Lonjakan temperature (auto-save)
7. Get State      → Lihat state terkini
8. Simulate       → Generate 10 data otomatis
9. Get History    → Cek data yang tersimpan di DB
```

### Step 4: Test WebSocket Realtime

1. Buka browser, go to `http://localhost:3000`
2. Buka Developer Console (F12)
3. Jalankan kode berikut:

```javascript
const ws = new WebSocket("ws://localhost:3000");
ws.onmessage = (e) => console.log("📡", JSON.parse(e.data));
ws.onopen = () => console.log("✅ Connected!");
```

4. Kirim data via Postman
5. Lihat data muncul realtime di console!

---

## 📝 Contoh Skenario Testing

### Skenario 1: Data Stabil (Tidak Ada Lonjakan)

```
Config: threshold = 5°C, interval = 1 menit

Data 1: 28°C  → ✅ SAVE (pertama kali)
Data 2: 28.5°C → ❌ Skip (stabil, belum 1 menit)
Data 3: 27.8°C → ❌ Skip (stabil, belum 1 menit)
... tunggu 1 menit ...
Data 4: 28.2°C → ✅ SAVE (sudah 1 menit)
```

### Skenario 2: Ada Lonjakan

```
Config: threshold = 5°C

Data 1: 28°C  → ✅ SAVE (pertama kali)
Data 2: 28.5°C → ❌ Skip (selisih 0.5°C < threshold)
Data 3: 35°C  → ✅ SAVE (selisih 6.5°C >= threshold - SPIKE!)
Data 4: 28°C  → ✅ SAVE (selisih 7°C >= threshold - SPIKE!)
```

### Skenario 3: Testing Cepat

Untuk testing cepat, set interval ke 1 menit:

```json
POST /api/temperature-ws/config
{
  "threshold": 3,
  "saveIntervalMinutes": 1
}
```

---

## 🔧 Troubleshooting

### WebSocket tidak connect?

- Pastikan server running: `npm run dev`
- Cek port: default `3000`
- Pastikan tidak ada firewall blocking

### Data tidak tersimpan?

- Cek apakah sudah login (token valid)
- Cek state: `GET /state` untuk lihat `nextSaveInSeconds`
- Coba kirim data dengan lonjakan besar (>= threshold)

### Ingin test cepat tanpa tunggu 30 menit?

```json
POST /api/temperature-ws/config
{
  "saveIntervalMinutes": 1
}
```

---

## 📦 File Structure

```
services/
  temperature-ws.service.js    # Logic WebSocket version
controllers/
  temperature-ws.controller.js # Handler endpoints
routes/
  temperature-ws.route.js      # Route definitions
docs/
  TEMPERATURE_WS_DOCS.md       # Dokumentasi ini
postman/
  Temperature_WS_Monitoring.postman_collection.json
```
