# 🍄 Mushroom Inference API (Express Backend)

Dokumentasi API Express untuk integrasi dengan sistem ML FastAPI.

## 📋 Daftar Isi

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Full Prediction](#full-prediction)
  - [Prediction from Stored Features](#prediction-from-stored-features)
  - [Compute Features](#compute-features)
  - [Get Features Summary](#get-features-summary)
  - [Prediction History](#prediction-history)
  - [Health Check](#health-check)
- [Response Format](#response-format)
- [Workflow](#workflow)

---

## Overview

Express backend bertindak sebagai orchestrator yang:

1. Mengambil data sensor dari Supabase
2. Mengagregasi data menjadi 10 fitur
3. Mengirim fitur ke FastAPI untuk prediksi ML
4. Mengembalikan hasil dalam Bahasa Indonesia

---

## Base URL

| Environment | URL                          |
| ----------- | ---------------------------- |
| Development | `http://localhost:3000`      |
| Production  | `https://api.yourdomain.com` |

API Prefix: `/api/inference`

---

## Authentication

Semua endpoint (kecuali `/health`) membutuhkan JWT token.

**Header:**

```
Authorization: Bearer <your_jwt_token>
```

**Mendapatkan Token:**

```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

## Endpoints

### Full Prediction

#### `POST /api/inference/predict`

Prediksi lengkap dengan agregasi fitur real-time dari sensor data.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "deviceId": "esp32-001",
  "baglogCount": 200,
  "hoursBack": 24
}
```

| Field         | Tipe   | Required | Default | Deskripsi                    |
| ------------- | ------ | -------- | ------- | ---------------------------- |
| `deviceId`    | string | No       | -       | Filter berdasarkan device ID |
| `baglogCount` | number | No       | 100     | Jumlah baglog                |
| `hoursBack`   | number | No       | 24      | Jam data yang diagregasi     |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Prediksi berhasil",
  "prediksi": {
    "waktuPanen": {
      "estimasiHari": 32,
      "estimasiTanggal": "24 Februari 2026",
      "kepercayaan": 0.85,
      "deskripsi": "Panen diperkirakan dalam 32 hari (sekitar 24 Februari 2026)"
    },
    "risiko": {
      "level": "Rendah",
      "probabilitas": 0.15,
      "isBahaya": false,
      "deskripsi": "Tingkat risiko gagal panen: Rendah (15%)"
    },
    "anomali": {
      "terdeteksi": false,
      "skor": -0.2,
      "alasan": [],
      "deskripsi": "Tidak ada anomali terdeteksi pada pembacaan sensor"
    },
    "rekomendasi": [
      "✅ Kondisi lingkungan optimal untuk pertumbuhan jamur. Pertahankan!"
    ],
    "tingkatKeparahan": "info",
    "versiModel": "1.0.0"
  },
  "raw": {
    "prediction": { "...": "raw FastAPI response" },
    "features": {
      "aggregated": {
        "temp_avg": 26.5,
        "humidity_avg": 85.0,
        "warmth_avg": 28.0,
        "baglog": 200,
        "temp_std": 1.2,
        "humidity_std": 2.5,
        "warmth_std": 1.0,
        "temp_trend": 0.05,
        "humidity_trend": -0.1,
        "warmth_trend": 0.02
      },
      "metadata": {
        "sampleCount": 48,
        "windowType": "hourly",
        "windowStart": "2026-01-22T00:00:00Z",
        "windowEnd": "2026-01-23T00:00:00Z",
        "hoursBack": 24
      }
    }
  },
  "performance": {
    "totalLatencyMs": 150,
    "inferenceLatencyMs": 50
  }
}
```

---

### Prediction from Stored Features

#### `POST /api/inference/predict-stored`

Prediksi menggunakan fitur yang sudah di-cache (lebih cepat).

**Request Body:**

```json
{
  "deviceId": "esp32-001",
  "baglogCount": 200
}
```

**Response:** (sama seperti Full Prediction)

---

### Compute Features

#### `POST /api/inference/compute-features`

Menghitung dan menyimpan fitur agregasi untuk window waktu tertentu.

**Request Body:**

```json
{
  "deviceId": "esp32-001",
  "windowType": "hourly",
  "baglogCount": 200
}
```

| Field        | Tipe   | Options       | Default |
| ------------ | ------ | ------------- | ------- |
| `windowType` | string | hourly, daily | hourly  |

**Response:**

```json
{
  "success": true,
  "message": "Fitur berhasil dihitung",
  "features": {
    "temp_avg": 26.5,
    "humidity_avg": 85.0,
    "warmth_avg": 28.0,
    "baglog": 200,
    "temp_std": 1.2,
    "humidity_std": 2.5,
    "warmth_std": 1.0,
    "temp_trend": 0.05,
    "humidity_trend": -0.1,
    "warmth_trend": 0.02
  },
  "metadata": {
    "sampleCount": 48,
    "windowType": "hourly",
    "windowStart": "2026-01-22T00:00:00Z",
    "windowEnd": "2026-01-23T00:00:00Z"
  }
}
```

---

### Get Features Summary

#### `GET /api/inference/features/summary`

Mendapatkan ringkasan fitur dengan metrik kualitas data.

**Query Parameters:**
| Param | Tipe | Default | Deskripsi |
|-------|------|---------|-----------|
| `hoursBack` | number | 24 | Jam data yang dianalisis |

**Response:**

```json
{
  "success": true,
  "summary": {
    "features": {
      "temp_avg": 26.5,
      "humidity_avg": 85.0,
      "warmth_avg": 28.0,
      "baglog": 200,
      "temp_std": 1.2,
      "humidity_std": 2.5,
      "warmth_std": 1.0,
      "temp_trend": 0.05,
      "humidity_trend": -0.1,
      "warmth_trend": 0.02
    },
    "quality": {
      "sampleCount": 48,
      "completeness": 0.95,
      "hasOutliers": false
    },
    "window": {
      "start": "2026-01-22T00:00:00Z",
      "end": "2026-01-23T00:00:00Z",
      "hoursBack": 24
    }
  }
}
```

---

### Prediction History

#### `GET /api/inference/history`

Mendapatkan riwayat prediksi.

**Query Parameters:**
| Param | Tipe | Default | Deskripsi |
|-------|------|---------|-----------|
| `limit` | number | 50 | Jumlah maksimal hasil |

**Response:**

```json
{
  "success": true,
  "history": [
    {
      "id": "uuid-123",
      "timestamp": "2026-01-23T10:00:00Z",
      "harvest_time_days": 32,
      "risk_level": "low",
      "anomaly": false,
      "features": { "...": "..." }
    }
  ]
}
```

---

### Health Check

#### `GET /api/inference/health`

Cek kesehatan pipeline inference (public, tidak perlu auth).

**Response:**

```json
{
  "success": true,
  "express": {
    "status": "healthy"
  },
  "fastapi": {
    "status": "healthy",
    "models_loaded": true,
    "model_version": "1.0.0"
  },
  "supabase": {
    "status": "connected"
  },
  "circuit_breaker": {
    "state": "closed",
    "failures": 0
  }
}
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Deskripsi sukses",
  "data": { "...": "..." }
}
```

### Error Response

```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Deskripsi error dalam Bahasa Indonesia"
}
```

### Common Errors

| Status | Error              | Deskripsi                      |
| ------ | ------------------ | ------------------------------ |
| 401    | Unauthorized       | Token tidak valid atau expired |
| 404    | NotFound           | Data sensor tidak ditemukan    |
| 500    | InternalError      | Error server internal          |
| 503    | ServiceUnavailable | FastAPI tidak tersedia         |

---

## Workflow

### Workflow Normal

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   Express   │───▶│   Supabase  │    │   FastAPI   │
│  (Postman)  │    │  Backend    │    │  (Sensor)   │    │    (ML)     │
└─────────────┘    └──────┬──────┘    └─────────────┘    └─────────────┘
                          │                                      │
                          │  1. Authenticate request             │
                          │  2. Fetch sensor logs ──────────────▶│
                          │  3. Aggregate to 10 features         │
                          │  4. Send to FastAPI ────────────────▶│
                          │  5. Receive ML predictions ◀─────────│
                          │  6. Translate to Indonesian          │
                          │  7. Return response                  │
                          ▼                                      │
```

### 10 Features Computed

```
┌──────────────────────────────────────────────────────────────────┐
│                    Sensor Logs (Last 24 hours)                   │
│  [temp, humidity, warmth, timestamp] x N samples                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Feature Aggregation                          │
├──────────────────┬──────────────────┬───────────────────────────┤
│   PRIMARY (4)    │   STABILITY (3)  │      TREND (3)            │
├──────────────────┼──────────────────┼───────────────────────────┤
│   temp_avg       │   temp_std       │   temp_trend              │
│   humidity_avg   │   humidity_std   │   humidity_trend          │
│   warmth_avg     │   warmth_std     │   warmth_trend            │
│   baglog         │                  │                           │
└──────────────────┴──────────────────┴───────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   FastAPI ML    │
                    │   Prediction    │
                    └─────────────────┘
```

---

## Contoh cURL

### Login dan Prediksi

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.token')

# 2. Full Prediction
curl -X POST http://localhost:3000/api/inference/predict \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"baglogCount": 200, "hoursBack": 24}'

# 3. Health Check
curl http://localhost:3000/api/inference/health
```

---

## Menjalankan Server

```bash
# 1. Start FastAPI (port 8000)
cd mogi_model
uvicorn api:app --reload --port 8000

# 2. Start Express (port 3000)
cd mogi_backend
npm run dev
```
