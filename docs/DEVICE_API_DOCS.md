# Device Management API Documentation

API untuk mengelola perangkat (device) dengan sistem kepemilikan dan PIN password.

## Flow Penggunaan

```
1. User Register/Login
2. User cek status device → GET /api/device/status/:deviceCode
3. Jika device belum terdaftar → POST /api/device/register (dengan PIN baru)
4. Untuk koneksi berikutnya → POST /api/device/connect (dengan PIN)
5. Untuk melepas device → POST /api/device/forget (dengan PIN)
```

---

## Base URL

```
/api/device
```

---

## Endpoints

### 1. Create Device (Admin/System)

Membuat device baru dalam sistem. Biasanya dilakukan oleh admin atau sistem saat device baru diproduksi.

**Endpoint:** `POST /api/device/create`

**Authentication:** Tidak diperlukan (sebaiknya diproteksi dengan admin auth di production)

**Request Body:**

```json
{
  "deviceCode": "DEVICE-001",
  "name": "Alat Monitoring Suhu #1" // optional
}
```

**Response (201 Created):**

```json
{
  "message": "Device created successfully",
  "device": {
    "id": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "name": "Alat Monitoring Suhu #1",
    "isRegistered": false
  }
}
```

**Error Response (409 Conflict):**

```json
{
  "error": "Device code already exists"
}
```

---

### 2. Check Device Status

Mengecek status device sebelum registrasi. Berguna untuk menampilkan informasi apakah device sudah memiliki owner atau belum.

**Endpoint:** `GET /api/device/status/:deviceCode`

**Authentication:** Tidak diperlukan

**Response (200 OK) - Device belum terdaftar:**

```json
{
  "message": "Device status retrieved",
  "status": {
    "exists": true,
    "isRegistered": false,
    "hasOwner": false,
    "deviceId": "uuid-device-id",
    "deviceName": "Alat Monitoring Suhu #1",
    "ownerName": null
  }
}
```

**Response (200 OK) - Device sudah terdaftar:**

```json
{
  "message": "Device status retrieved",
  "status": {
    "exists": true,
    "isRegistered": true,
    "hasOwner": true,
    "deviceId": "uuid-device-id",
    "deviceName": "Alat Monitoring Suhu #1",
    "ownerName": "John Doe"
  }
}
```

**Response (200 OK) - Device tidak ditemukan:**

```json
{
  "message": "Device status retrieved",
  "status": {
    "exists": false,
    "isRegistered": false,
    "hasOwner": false
  }
}
```

---

### 3. Register Device (Claim Ownership)

Mendaftarkan device ke user (menjadi pemilik). User harus membuat PIN baru saat registrasi.

**Endpoint:** `POST /api/device/register`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "deviceCode": "DEVICE-001",
  "pin": "1234" // PIN 4-6 digit angka saja
}
```

**Response (200 OK):**

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
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Device not found. Please check the device code."
}
```

**Error Response (409 Conflict):**

```json
{
  "error": "Device is already registered to another user",
  "message": "The device owner must forget/release the device first before you can register it."
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "PIN must be 4-6 digits (numbers only)"
}
```

---

### 4. Connect to Device

Menghubungkan ke device dengan verifikasi PIN. Digunakan setiap kali user ingin mengontrol device.

**Endpoint:** `POST /api/device/connect`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
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
  "message": "Connected to device successfully",
  "device": {
    "id": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "name": "Alat Monitoring Suhu #1",
    "connectedAt": "2026-01-11T10:30:00.000Z"
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "error": "Invalid PIN"
}
```

```json
{
  "error": "You are not the owner of this device"
}
```

---

### 5. Forget Device (Release Ownership)

Melepaskan kepemilikan device. Device akan bisa didaftarkan oleh user lain setelah di-forget.

**Endpoint:** `POST /api/device/forget`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
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
  "message": "Device forgotten successfully. The device can now be registered by another user."
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "You are not the owner of this device"
}
```

```json
{
  "error": "Invalid PIN"
}
```

---

### 6. Change Device PIN

Mengubah PIN device. Memerlukan PIN lama untuk verifikasi.

**Endpoint:** `POST /api/device/change-pin`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "deviceCode": "DEVICE-001",
  "oldPin": "1234",
  "newPin": "5678"
}
```

**Response (200 OK):**

```json
{
  "message": "PIN changed successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Invalid current PIN"
}
```

```json
{
  "error": "New PIN must be 4-6 digits (numbers only)"
}
```

---

### 7. Get My Devices

Mendapatkan daftar semua device yang dimiliki oleh user yang sedang login.

**Endpoint:** `GET /api/device/my-devices`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "message": "Devices retrieved successfully",
  "count": 2,
  "devices": [
    {
      "id": "uuid-device-1",
      "deviceCode": "DEVICE-001",
      "name": "Alat Monitoring Suhu #1",
      "isRegistered": true,
      "connectedAt": "2026-01-11T10:30:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid-device-2",
      "deviceCode": "DEVICE-002",
      "name": "Alat Monitoring Suhu #2",
      "isRegistered": true,
      "connectedAt": "2026-01-10T08:15:00.000Z",
      "createdAt": "2026-01-05T00:00:00.000Z"
    }
  ]
}
```

---

### 8. Update Device Name

Mengubah nama device.

**Endpoint:** `PUT /api/device/update-name`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "deviceCode": "DEVICE-001",
  "name": "Alat Baru Saya"
}
```

**Response (200 OK):**

```json
{
  "message": "Device name updated successfully",
  "device": {
    "id": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "name": "Alat Baru Saya"
  }
}
```

---

### 9. Get Device Details

Mendapatkan detail lengkap device. Hanya bisa diakses oleh pemilik device.

**Endpoint:** `GET /api/device/:deviceCode`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "message": "Device details retrieved",
  "device": {
    "id": "uuid-device-id",
    "deviceCode": "DEVICE-001",
    "name": "Alat Monitoring Suhu #1",
    "isRegistered": true,
    "connectedAt": "2026-01-11T10:30:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "owner": {
      "id": "uuid-user-id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "error": "You are not the owner of this device"
}
```

---

## PIN Requirements

- PIN harus berupa **angka saja** (0-9)
- Panjang PIN: **4-6 digit**
- PIN akan di-hash sebelum disimpan (aman)
- Contoh PIN valid: `1234`, `123456`, `0000`
- Contoh PIN tidak valid: `abc123`, `12`, `1234567`

---

## Error Codes

| Status Code | Description                                     |
| ----------- | ----------------------------------------------- |
| 200         | Success                                         |
| 201         | Created                                         |
| 400         | Bad Request - Input tidak valid                 |
| 401         | Unauthorized - Token tidak valid atau PIN salah |
| 403         | Forbidden - Bukan pemilik device                |
| 404         | Not Found - Device tidak ditemukan              |
| 409         | Conflict - Device sudah terdaftar               |
| 500         | Internal Server Error                           |

---

## Database Schema

```prisma
model Device {
  id           String    @id @default(uuid())
  deviceCode   String    @unique @map("device_code")
  name         String?
  pin          String    // Hashed PIN
  ownerId      String?   @map("owner_id")
  isRegistered Boolean   @default(false) @map("is_registered")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  connectedAt  DateTime? @map("connected_at")

  owner User? @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  logs  Log[]

  @@map("devices")
}
```
