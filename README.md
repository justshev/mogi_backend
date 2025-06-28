# ✨ Mogi Backend

[![GitHub stars](https://img.shields.io/github/stars/justshev/mogi_backend?style=flat-square)](https://github.com/justshev/mogi_backend)
[![GitHub language count](https://img.shields.io/github/languages/count/justshev/mogi_backend?style=flat-square)](https://github.com/justshev/mogi_backend)
[![Node.js](https://img.shields.io/badge/node.js-v16+-brightgreen.svg?style=flat-square)](https://nodejs.org/en/)
[![Yarn](https://img.shields.io/badge/yarn-1.22+-blue.svg?style=flat-square)](https://yarnpkg.com/)


> Backend untuk aplikasi pintar MOGI yang didukung AI, membantu petani jamur memantau suhu dan kelembapan secara real-time sambil memprediksi pertumbuhan jamur secara cerdas.

## ✨ Fitur Utama

* **Monitoring Suhu dan Kelembapan Real-time:**  Sistem memantau dan mencatat suhu dan kelembapan secara terus-menerus, memberikan data aktual kepada pengguna.  Integrasi dengan sensor IoT (yang tidak ditampilkan di repositori ini) diharapkan.
* **Prediksi Pertumbuhan Jamur:** Menggunakan data lingkungan yang dikumpulkan (suhu, kelembapan), backend memprediksi pertumbuhan jamur, membantu petani dalam perencanaan panen.  Algoritma prediksi kemungkinan menggunakan model machine learning.
* **Otentikasi Pengguna:**  Sistem memungkinkan pendaftaran dan login pengguna yang aman, kemungkinan menggunakan JWT (JSON Web Tokens), berdasarkan keberadaan `auth.controller.js` dan `auth.middleware.js`.
* **Integrasi Firebase:** Penggunaan Firebase disimpulkan dari keberadaan `firebase.js` dan banyak paket Firebase di dalam `node_modules`.  Firebase mungkin digunakan untuk analitik, otentikasi, atau penyimpanan data.


## 🛠️ Tumpukan Teknologi

| Kategori         | Teknologi          | Catatan                                     |
|-----------------|----------------------|---------------------------------------------|
| Bahasa           | JavaScript          |                                             |
| Framework         | Fastify (diindikasikan) | Diduga berdasarkan penggunaan `@fastify/busboy` |
| Manajemen Paket   | Yarn                |                                             |
| Database         | Tidak ditentukan     | Kemungkinan menggunakan Firebase sebagai database NoSQL |
| Otentikasi       | JWT (diindikasikan) | Berdasarkan nama file `auth.controller.js` dan `auth.middleware.js` |
| Layanan Cloud     | Firebase            | Berdasarkan keberadaan banyak paket Firebase di `node_modules` |


## 🏛️ Tinjauan Arsitektur

Aplikasi ini menggunakan arsitektur monorepo, dengan semua kode berada dalam satu repositori.  Struktur file menunjukkan pemisahan antara controller, middleware, dan logika inti.  Integrasi dengan Firebase untuk layanan tambahan, seperti otentikasi dan analitik, juga digunakan.


## 🚀 Memulai

1. Kloning repositori:
   ```bash
   git clone https://github.com/justshev/mogi_backend.git
   cd mogi_backend
   ```
2. Instal dependensi:
   ```bash
   yarn install
   ```
3. Jalankan server pengembangan:
   ```bash
   yarn dev
   ```


## 📂 Struktur File

```
/
├── .DS_Store
├── .gitignore
├── README.md
├── app.js             // File utama aplikasi
├── controllers        // Direktori untuk controller API
│   ├── auth.controller.js  // Controller untuk autentikasi
│   └── prediksi.controller.js // Controller untuk prediksi pertumbuhan jamur
├── firebase.js        // File untuk integrasi Firebase
├── middleware        // Direktori untuk middleware
│   └── auth.middleware.js // Middleware untuk autentikasi
└── node_modules      // Dependensi proyek yang terinstal
```

`controllers`: Berisi logika untuk menangani permintaan API.

`middleware`: Berisi middleware untuk menangani permintaan sebelum mencapai controller, seperti autentikasi.

`node_modules`: Berisi semua dependensi yang diinstal melalui Yarn.  Keberadaan banyak paket `@firebase` mengindikasikan penggunaan Firebase.
