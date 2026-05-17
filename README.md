# PJT ERP

## Infrastruktur

Struktur utama project:

```text
PtPjtErp.sln
├── src/
│   ├── SharedLib/
│   │   ├── EventBus.Messages/
│   │   ├── Shared.Auth/
│   │   ├── Shared.Infrastructure/
│   │   └── Shared.Logging/
│   ├── Services/
│   │   ├── Identity.API/
│   │   ├── MasterData.API/
│   │   ├── Production.API/
│   │   ├── QC.API/
│   │   └── Purchasing.API/
│   └── ApiGateways/
│       └── Web.Gateway/
├── docker-compose.yml
├── docker-compose.override.yml
└── README.md
```

## Komponen SharedLib

`EventBus.Messages` berisi kontrak event antar service, seperti `MasterDataUpdatedEvent`, `SpkCreatedEvent`, `ProductionFinishedEvent`, `QcCheckCompletedEvent`, dan `PurchaseRequestReviewedEvent`.

`Shared.Auth` berisi konfigurasi JWT, validasi token, dan helper penerbit token untuk login.

`Shared.Infrastructure` berisi PGMQ event bus, transactional outbox, unit of work abstraction, dan Postgres-backed distributed cache.

`Shared.Logging` berisi konfigurasi logging standar untuk semua service.

## Service Backend

`Identity.API` menangani user, role, login, logout, dan penerbitan JWT. Service ini menjadi tempat fitur User CRUD.

`MasterData.API` menangani data master seperti customer dan product/part. Data ini dipakai oleh Sales dan Production, tetapi tidak dibuat sebagai foreign key lintas database.

`Production.API` menangani Sales Order, Sales Order Item, Production Order/SPK, barcode, scan mulai produksi, scan selesai produksi, dan dashboard owner.

`QC.API` menangani QC Inspection, visual check, dan dimension check. Data ukuran fleksibel disimpan dalam kolom JSONB agar form QC bisa berubah mengikuti kebutuhan part.

`Purchasing.API` menangani Purchase Request, item pembelian, submit PR, dan review approve/reject oleh Finance.

`Web.Gateway` adalah API Gateway berbasis YARP. Semua request frontend masuk lewat gateway, lalu diteruskan ke service yang sesuai.

## Port

Saat dijalankan dengan Docker Compose:

- Gateway: `http://localhost:5000`
- Identity API: `http://localhost:5001`
- MasterData API: `http://localhost:5002`
- Production API: `http://localhost:5003`
- QC API: `http://localhost:5004`
- Purchasing API: `http://localhost:5005`
- PostgreSQL + PGMQ: `localhost:5435`

## Database dan Microservices

Project ini memakai pendekatan microservices dari awal. Artinya setiap service punya database sendiri:

- `pjt_identity`
- `pjt_masterdata`
- `pjt_production`
- `pjt_qc`
- `pjt_purchasing`
- `pjt_eventbus`
- `pjt_cache`

Foreign key fisik hanya dipakai di dalam database service yang sama.

Contoh yang boleh memakai FK:

- `sales_orders` ke `sales_order_items`
- `sales_order_items` ke `production_orders`
- `qc_inspections` ke `qc_visual_checks`
- `qc_inspections` ke `qc_dimension_checks`
- `purchase_requests` ke `purchase_request_items`

Contoh yang tidak boleh memakai FK lintas service:

- `Production.sales_orders.customer_id` ke `MasterData.customers.id`
- `Production.sales_order_items.product_id` ke `MasterData.products.id`
- `QC.qc_inspections.production_order_id` ke `Production.production_orders.id`
- `approved_by_user_id`, `inspector_id`, `operator_id`, dan `requested_by_user_id` ke `Identity.user_accounts.id`

Kolom lintas service tersebut disebut soft reference. Validasi dilakukan oleh application logic dan event bus, bukan oleh PostgreSQL FK lintas database.

## Event Flow

Alur event utama:

```text
MasterData.API
  └── MasterDataUpdatedEvent
      └── Production.API menyimpan customer/product replica

Production.API
  ├── SpkCreatedEvent
  │   └── QC.API membuat form inspeksi awal
  └── ProductionFinishedEvent
      └── QC.API menandai inspeksi siap dikerjakan

QC.API
  └── QcCheckCompletedEvent
      └── Production.API menyimpan hasil QC pada production order

Purchasing.API
  └── PurchaseRequestReviewedEvent
      └── siap dipakai untuk dashboard/reporting berikutnya
```

Event dikirim melalui PGMQ dengan transactional outbox. Jadi data bisnis dan event disimpan dalam satu transaksi, lalu background worker mengirim event ke queue.

## Caching

Caching memakai PostgreSQL juga, bukan Redis. Implementasinya ada di `Shared.Infrastructure` sebagai Postgres-backed distributed cache.

Tujuannya agar infrastruktur tetap ringan:

- Tidak perlu service cache tambahan.
- Tetap cocok untuk development dan deployment sederhana.
- Bisa dipakai semua service dengan connection string `CacheConnection`.

## Tracking Status

Table operasional memiliki `updated_at_utc` supaya perubahan status bisa dilacak.

Contoh:

- `sales_orders`
- `sales_order_items`
- `production_orders`
- `qc_inspections`
- `qc_visual_checks`
- `qc_dimension_checks`
- `purchase_requests`
- `purchase_request_items`
- `user_accounts`

Ini penting untuk ERP karena owner dan admin perlu tahu berapa lama order diam di status tertentu.

## Role Sistem

Role utama:

- Admin
- Sales Order
- Engineering / Production
- Quality Control
- Purchasing
- Finance
- Owner

## Skenario Login dan Logout

1. User membuka aplikasi web.
2. User login memakai email yang sudah terdaftar.
3. `Identity.API` memvalidasi user dan role.
4. Sistem menerbitkan JWT dan menyimpannya sebagai cookie `access_token`.
5. Frontend menampilkan menu sesuai role user.
6. Saat logout, cookie token dihapus.

Contoh user demo:

- `owner@pjt.local`
- `sales@pjt.local`
- `production@pjt.local`
- `qc@pjt.local`
- `finance@pjt.local`

## Skenario Admin

Admin bertanggung jawab mengelola akses sistem.

Alur kerja:

1. Admin login ke sistem.
2. Admin membuka halaman User Management.
3. Admin membuat user baru untuk Sales, Engineering, QC, Purchasing, Finance, atau Owner.
4. Admin mengubah role user jika ada perpindahan divisi.
5. Admin menonaktifkan user yang sudah tidak boleh mengakses sistem.
6. Admin dapat melihat user aktif dan status terakhir login.

Data utama:

- `user_accounts`
- role user
- status user
- `last_active_at_utc`
- `updated_at_utc`

## Skenario Sales Order

Sales membuat order customer secara digital.

Alur kerja:

1. Sales login ke sistem.
2. Sales membuka menu Sales Order.
3. Sales memilih customer dari Master Data.
4. Sales memilih product/part yang dipesan.
5. Sales mengisi quantity, target date, dan notes.
6. Sales menyimpan Sales Order.
7. Saat Sales Order dikonfirmasi, Production API otomatis membuat SPK/Production Order.
8. Sistem membuat barcode unik untuk setiap SPK.

Output utama:

- Sales Order
- Sales Order Item
- Production Order/SPK
- Barcode UID

## Skenario Engineering / Production

Engineering atau tim produksi memakai barcode untuk update status pekerjaan.

Alur kerja:

1. User Production login.
2. User membuka daftar SPK.
3. User melihat SPK yang berasal dari Sales Order yang sudah dikonfirmasi.
4. User scan barcode ketika pekerjaan mulai.
5. Status production order berubah menjadi `InProgress`.
6. User scan barcode lagi ketika pekerjaan selesai.
7. Status production order berubah menjadi `Finished`.
8. Production API mengirim `ProductionFinishedEvent` ke QC API.

Output utama:

- Status produksi real-time.
- Waktu mulai produksi.
- Waktu selesai produksi.
- Event ke QC agar inspeksi siap dilakukan.

## Skenario Quality Control

QC melakukan inspeksi visual dan dimensi setelah barang selesai diproduksi.

Alur kerja:

1. QC login ke sistem.
2. QC membuka daftar inspeksi.
3. Saat SPK dibuat, QC API sudah menyiapkan form inspeksi melalui `SpkCreatedEvent`.
4. Saat produksi selesai, form berubah menjadi siap inspeksi melalui `ProductionFinishedEvent`.
5. QC mengisi data inspeksi awal seperti inspector, sample qty, sampling method, dan measuring tool.
6. QC mengisi visual check: accept, reject, repair, scrap, NC reference, dan remarks.
7. QC mengisi dimension check dengan data ukuran fleksibel dalam JSONB.
8. QC menyelesaikan inspeksi dengan keputusan `Accept`, `Reject`, `Repair`, atau `Scrap`.
9. QC API mengirim `QcCheckCompletedEvent` ke Production API.

Output utama:

- QC Inspection
- Visual Check
- Dimension Check
- QC Decision
- Update status ke Production

## Skenario Purchasing

Purchasing atau bagian operasional membuat permintaan pembelian material.

Alur kerja:

1. User Purchasing login.
2. User membuka menu Purchase Request.
3. User mengisi item material yang dibutuhkan.
4. User mengisi size, quantity, supplier suggestion, dan notes.
5. User submit Purchase Request.
6. Status PR berubah menjadi `Submitted`.
7. Finance dapat melihat PR tersebut untuk direview.

Output utama:

- Purchase Request
- Purchase Request Item
- Status PR

## Skenario Finance

Finance melakukan review terhadap Purchase Request.

Alur kerja:

1. Finance login ke sistem.
2. Finance membuka daftar Purchase Request.
3. Finance mengecek item, jumlah, supplier suggestion, dan notes.
4. Finance memilih `Approve` atau `Reject`.
5. Jika reject, Finance mengisi alasan penolakan.
6. Sistem menyimpan reviewer, waktu review, dan status final.
7. Purchasing API mengirim `PurchaseRequestReviewedEvent`.

Output utama:

- Status Approved / Rejected
- Reviewer
- Waktu review
- Rejection reason jika ada

## Skenario Owner

Owner melihat kondisi pabrik secara high-level.

Alur kerja:

1. Owner login ke sistem.
2. Owner membuka Executive Dashboard.
3. Owner melihat jumlah order yang masih waiting, in progress, finished, dan closed.
4. Owner melihat hasil QC: accepted, rejected, repair, dan scrap.
5. Owner melihat defect rate.
6. Owner memakai data ini untuk melihat bottleneck produksi dan kualitas barang.

Output utama:

- Ringkasan status produksi.
- Ringkasan hasil QC.
- Defect rate.
- Gambaran performa pabrik.

## Cara Menjalankan

Jalankan semua service:

```powershell
docker compose up --build
```

Build solution:

```powershell
dotnet build PtPjtErp.sln
```

Gateway utama:

```text
http://localhost:5000
```

## Catatan Implementasi

Project ini sudah disiapkan untuk microservices, bukan modular monolith. Karena itu relasi lintas service memakai soft reference dan sinkronisasi event.

Jika nanti sistem ingin dibuat lebih strict, validasi antar service bisa ditambah lewat:

- local replica table,
- event replay,
- API validation,
- background reconciliation job,
- dashboard monitoring untuk event gagal.
