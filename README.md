# PJT ERP

PJT ERP adalah sistem Perencanaan Sumber Daya Perusahaan (Enterprise Resource Planning) berbasis web yang dirancang menggunakan arsitektur **Microservices**. Dibangun dengan stack teknologi modern, sistem ini dirancang untuk melacak siklus produksi manufaktur end-to-end, mulai dari pesanan awal pelanggan, manajemen desain teknis, pengajuan material, pelacakan proses di lantai produksi, kontrol kualitas, hingga penagihan akhir.

## 🚀 Fitur Utama

- **Microservices Architecture:** 6 Domain Microservices dengan database terpisah (.NET 10 & PostgreSQL) yang saling terhubung lewat event bus (PGMQ).
- **Public & Internal Tracking:** Pembuatan barcode otomatis per order dengan dukungan UI pencarian tanpa login bagi pelanggan (Public Tracker) maupun internal.
- **Workflow Persetujuan Bertingkat:** Proses pembelian material (MR/PO) dengan persetujuan ketat dari Supervisor dan Finance.
- **Invoice & PO Print-Ready:** UI invoice dan PO web yang disesuaikan secara dinamis agar 100% responsif ketika diekspor atau dicetak di ukuran kertas A4.
- **Verifikasi Lintas Departemen:** Produksi *terkunci* jika Finance belum memverifikasi Uang Muka (DP).

## 🛠️ Stack Teknologi

- **Frontend:** React, Vite, TypeScript, TailwindCSS
- **Backend Services:** C# (.NET 10 SDK)
- **Database:** PostgreSQL (1 per domain microservice)
- **Event Bus:** PGMQ (Postgres-Backed Message Queue) + Transactional Outbox
- **Caching:** Distributed Postgres Cache (Tanpa Redis)
- **API Gateway:** YARP (Yet Another Reverse Proxy)
- **Orkestrasi:** Docker Compose Multi-Stage Build

## 📚 Dokumentasi Sistem (Docs)

Dokumentasi rinci mengenai alur bisnis dan arsitektur telah dipisahkan ke dalam folder `/docs` untuk memudahkan pembacaan:

1. [Arsitektur & Infrastruktur (PGMQ & DBs)](docs/architecture.md)
2. [Alur Bisnis: Sales Order & Production Tracking](docs/workflows/sales-order-production.md)
3. [Alur Bisnis: Pengajuan Pembelian & Finance](docs/workflows/purchasing-finance.md)
4. [Alur Bisnis: Quality Control (QC)](docs/workflows/quality-control.md)

*(Untuk referensi JSON format endpoint, lihat `docs/api-endpoints.json`)*

## 📦 Menjalankan Sistem Lokal (Getting Started)

Sistem telah dioptimalkan dengan **Unified Backend Docker Build** (`Dockerfile.backend`) untuk menghemat CPU/RAM secara drastis saat build lokal.

### Prasyarat
- Docker Engine & Docker Compose
- Node.js (hanya jika ingin menjalankan frontend di luar kontainer)

### 1. Build & Run via Docker Compose

```powershell
docker compose up --build -d
```
Docker akan melakukan satu proses `dotnet restore` tersentralisasi dan mem-build seluruh 6 layanan microservices secara paralel.

### 2. Akses Aplikasi
- **Frontend (Web App):** `http://localhost:5173`
- **Gateway API (YARP Backend):** `http://localhost:5000`
- **Scalar API Testing UI:** `http://localhost:5000/scalar`

### 3. Akun Testing (Dev)
Dalam environment *Development*, Anda dapat masuk ke seluruh layanan tanpa validasi eksternal menggunakan token ini di header atau login UI:
- **Akun Owner:** `owner@test.com` (Akses Dashboard Eksekutif)
- **Akun Admin:** `admin@test.com` (Akses Manajemen User)
- **Akun Finance:** `finance@test.com`
- **Akun Sales:** `sales@test.com`
- **Akun SPV Engineering:** `engineering@test.com`

> **Note:** Development JWT `dev-master-token` otomatis memberi akses ke semua role sistem dan men-bypass validasi signature di environment non-production.

## 🔄 CI/CD & Deployment

- Skrip alur kerja GitHub Actions (CI) terletak di `.github/workflows/`.
- Frontend akan divalidasi oleh `npm build`.
- Backend (seluruh `.sln`) akan divalidasi menggunakan Unit Test terdistribusi (QC Tests, Purchasing Tests, Finance Tests, dll).
- File compose prod (`docker-compose.prod.yml`) menggunakan builder bertingkat yang sama dan aman di-deploy ke server Linux/VPS.
