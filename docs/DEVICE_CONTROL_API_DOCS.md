# Device Control API Documentation

API untuk mengontrol perangkat Arduino dengan sistem PIN session yang berlaku selama 5 menit.

## Flow Penggunaan

```
1. User login → /api/auth/login
2. User auth device dengan PIN → POST /api/device/auth (dapat session token, berlaku 5 menit)
3. User kirim kontrol ke Arduino → POST /api/device/control (dengan session token di header)
4. Jika session habis → User auth ulang dengan PIN
5. Optional: Extend session → POST /api/device/session/extend
```

---

## Base URL

```
/api/device
```

---

## Session Management

### 1. Authenticate Device (Get Session Token)

Autentikasi device dengan PIN untuk mendapatkan session token yang berlaku selama 5 menit.

**Endpoint:** `POST /api/device/auth`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "deviceCode": "DEVICE-001",
  "pin": "1234"
}
```

**Response (200 OK):**

```json
{
  "message": "Device authenticated successfully",
  "session": {
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "expiresAt": "2026-01-11T10:35:00.000Z",
    "expiresIn": 300
  },
  "device": {
    "id": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "name": "Alat Monitoring Suhu #1"
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "error": "Invalid PIN"
}
```

---

### 2. Check Session Status

Mengecek apakah session masih valid dan sisa waktunya.

**Endpoint:** `GET /api/device/session/status`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
X-Device-Session: <session_token>
```

**Or Query Parameter:**

```
/api/device/session/status?token=<session_token>
```

**Response (200 OK) - Session Valid:**

```json
{
  "valid": true,
  "remainingTime": 245,
  "expiresAt": "2026-01-11T10:35:00.000Z",
  "deviceCode": "DEVICE-001"
}
```

**Response (200 OK) - Session Expired:**

```json
{
  "valid": false,
  "message": "Session expired or invalid"
}
```

---

### 3. Extend Session

Memperpanjang session selama 5 menit lagi dari waktu sekarang.

**Endpoint:** `POST /api/device/session/extend`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
X-Device-Session: <session_token>
```

**Response (200 OK):**

```json
{
  "message": "Session extended successfully",
  "session": {
    "token": "a1b2c3d4e5f6g7h8i9j0...",
    "expiresAt": "2026-01-11T10:40:00.000Z",
    "expiresIn": 300
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "error": "Session expired or invalid. Please re-authenticate with PIN."
}
```

---

### 4. Logout Session

Mengakhiri session sebelum expired.

**Endpoint:** `POST /api/device/session/logout`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
X-Device-Session: <session_token>
```

**Response (200 OK):**

```json
{
  "message": "Session invalidated successfully"
}
```

---

## Device Control

### 5. Send Control Data to Arduino

Mengirim data kontrol ke Arduino. **Memerlukan session token yang valid.**

**Endpoint:** `POST /api/device/control`

**Authentication:** Required (Bearer Token + Device Session)

**Headers:**

```
Authorization: Bearer <access_token>
X-Device-Session: <session_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "deviceCode": "DEVICE-001",
  "targetTemperature": 28.5,
  "targetHumidity": 75,
  "fanSpeed": 80,
  "heaterOn": true,
  "action": "START_MONITORING"
}
```

**Available Control Parameters:**

| Parameter           | Type    | Description                                   |
| ------------------- | ------- | --------------------------------------------- |
| `deviceCode`        | string  | **Required.** Kode device yang akan dikontrol |
| `targetTemperature` | float   | Target suhu (°C)                              |
| `targetHumidity`    | float   | Target kelembaban (%)                         |
| `fanSpeed`          | integer | Kecepatan kipas (0-100)                       |
| `heaterOn`          | boolean | Status pemanas (true/false)                   |
| `action`            | string  | Aksi khusus (e.g., "START", "STOP", "RESET")  |

**Response (200 OK):**

```json
{
  "message": "Control data sent successfully",
  "payload": {
    "deviceId": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "timestamp": "2026-01-11T10:30:00.000Z",
    "controls": {
      "targetTemperature": 28.5,
      "targetHumidity": 75,
      "fanSpeed": 80,
      "heaterOn": true,
      "action": "START_MONITORING"
    }
  },
  "sessionRemainingTime": 245
}
```

**Error Response (401 Unauthorized) - No Session:**

```json
{
  "error": "Device session token is required",
  "message": "Please authenticate with PIN first using /api/device/auth endpoint",
  "code": "SESSION_REQUIRED"
}
```

**Error Response (401 Unauthorized) - Session Expired:**

```json
{
  "error": "Session expired or invalid",
  "message": "Your device session has expired. Please re-authenticate with PIN.",
  "code": "SESSION_EXPIRED"
}
```

---

### 6. Get Device Status

Mendapatkan status device saat ini. **Memerlukan session token yang valid.**

**Endpoint:** `GET /api/device/control/:deviceCode/status`

**Authentication:** Required (Bearer Token + Device Session)

**Headers:**

```
Authorization: Bearer <access_token>
X-Device-Session: <session_token>
```

**Response (200 OK):**

```json
{
  "message": "Device status retrieved",
  "status": {
    "deviceId": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "deviceName": "Alat Monitoring Suhu #1",
    "lastConnected": "2026-01-11T10:30:00.000Z",
    "sessionRemainingTime": 245
  }
}
```

---

## WebSocket Message Format

Ketika kontrol dikirim, data akan di-broadcast ke semua WebSocket client dengan format:

```json
{
  "type": "DEVICE_CONTROL",
  "deviceId": "uuid-device-id",
  "deviceCode": "DEVICE-001",
  "timestamp": "2026-01-11T10:30:00.000Z",
  "controls": {
    "targetTemperature": 28.5,
    "targetHumidity": 75,
    "fanSpeed": 80,
    "heaterOn": true,
    "action": "START_MONITORING"
  }
}
```

Arduino yang terhubung via WebSocket akan menerima message ini dan melakukan aksi sesuai kontrol.

---

## Session Token Usage

Session token dapat dikirim melalui:

1. **Header (Recommended):**

   ```
   X-Device-Session: <session_token>
   ```

2. **Request Body:**
   ```json
   {
     "sessionToken": "<session_token>"
   }
   ```

---

## Session Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Session Flow                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. POST /api/device/auth                                   │
│     ├── Input: deviceCode, pin                              │
│     └── Output: session token (valid 5 min)                 │
│                       │                                      │
│                       ▼                                      │
│  2. POST /api/device/control                                │
│     ├── Header: X-Device-Session: <token>                   │
│     ├── Body: { deviceCode, targetTemperature, ... }        │
│     └── Output: success + sessionRemainingTime              │
│                       │                                      │
│            ┌──────────┴──────────┐                          │
│            │                     │                          │
│            ▼                     ▼                          │
│   Session masih valid     Session expired                   │
│   (< 5 menit)             (> 5 menit)                       │
│            │                     │                          │
│            │                     ▼                          │
│            │         Error: SESSION_EXPIRED                 │
│            │         → Kembali ke step 1                    │
│            │                                                 │
│            ▼                                                 │
│   Optional: POST /api/device/session/extend                 │
│   (perpanjang 5 menit lagi)                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Codes

| Code               | Description                             |
| ------------------ | --------------------------------------- |
| `SESSION_REQUIRED` | Session token tidak disertakan          |
| `SESSION_EXPIRED`  | Session sudah expired, perlu auth ulang |
| `SESSION_MISMATCH` | Session bukan milik user yang login     |

---

## Example Usage (JavaScript/Fetch)

```javascript
// Step 1: Authenticate device with PIN
const authResponse = await fetch("/api/device/auth", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceCode: "DEVICE-001",
    pin: "1234",
  }),
});

const { session } = await authResponse.json();
const deviceSessionToken = session.token;

// Step 2: Send control data (within 5 minutes)
const controlResponse = await fetch("/api/device/control", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "X-Device-Session": deviceSessionToken,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceCode: "DEVICE-001",
    targetTemperature: 28.5,
    targetHumidity: 75,
  }),
});

const result = await controlResponse.json();
console.log("Control sent:", result);
console.log("Session remaining:", result.sessionRemainingTime, "seconds");
```

---

## Notes

1. **Session berlaku 5 menit** dari waktu autentikasi
2. **Session dapat diperpanjang** menggunakan endpoint `/session/extend`
3. **Session disimpan di memory** - akan hilang jika server restart (untuk production, gunakan Redis)
4. **Satu user hanya bisa punya satu session per device**
5. **Autentikasi baru akan menghapus session lama** untuk device yang sama
