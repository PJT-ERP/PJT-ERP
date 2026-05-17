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

`MasterData.API` menangani data master seperti customer dan product/part. Data ini dipakai oleh Sales Order dan Engineering, tetapi tidak dibuat sebagai foreign key lintas database.

`Production.API` menangani Sales Order, Sales Order Item, Production Order/SPK, barcode/QR, scan mulai produksi, scan selesai/complete produksi, tracking waktu otomatis, detail/list SPK, progress per Sales Order, dan dashboard owner. Service ini dipakai lintas role: Sales Order membuat SO, Engineering upload gambar/drawing, dan Owner menjalankan sekaligus memonitor production tracking.

`QC.API` menangani scan barcode/QR untuk QC, QC Inspection, visual check, dimension check, upload form QC oleh Owner, defect notes, dan review approve/reject oleh Owner. Kolom `Reject`, `Repair`, dan `Scrap` di visual check adalah hasil inspeksi teknis barang, sedangkan reject dari Owner adalah keputusan review final terhadap form QC. Data ukuran fleksibel disimpan dalam kolom JSONB agar form QC bisa berubah mengikuti kebutuhan part.

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

## API Catalog

Daftar endpoint gateway dan contoh payload tersedia di:

```text
docs/api-endpoints.json
```

File ini bukan konfigurasi runtime seperti `ocelot.json`. Runtime gateway tetap memakai YARP di `src/ApiGateways/Web.Gateway/appsettings.json`, sedangkan `docs/api-endpoints.json` dipakai sebagai referensi frontend dan dokumentasi cepat.

## Scalar API Testing

Saat environment `Development`, Scalar tersedia untuk testing API:

```text
http://localhost:5000/scalar
```

Gateway Scalar memuat dokumen OpenAPI dari masing-masing service. Pilih service dari dropdown di kiri atas Scalar:

- Identity: `/openapi/identity/v1.json`
- Master Data: `/openapi/masterdata/v1.json`
- Production: `/openapi/production/v1.json`
- QC: `/openapi/qc/v1.json`
- Purchasing: `/openapi/purchasing/v1.json`

Untuk testing cepat, semua service menerima dev master token hanya di environment `Development`:

```text
Authorization: Bearer dev-master-token
```

Alternatif header:

```text
X-Dev-Master-Token: dev-master-token
```

Token ini diberi semua role development: `Admin`, `Owner`, `Sales Order`, `Finance`, `Engineering`, dan `Purchasing`. Di luar `Development`, token ini otomatis tidak berlaku.

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
      └── Production.API menyimpan hasil review Owner pada production order

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

Role operasional utama:

- Sales Order
- Finance
- Engineering
- Purchasing
- Owner

Role sistem:

- Admin

Catatan: Admin dipakai untuk manajemen sistem dan User CRUD. Tidak ada role terpisah bernama QC atau Production pada MVP ini. Engineering hanya melakukan upload/input file gambar engineering. Engineering tidak melakukan scan `Start`/`Complete` produksi, tidak mengisi checksheet QC, dan tidak mengisi kolom reject pada form QC. Karena belum ada role Production terpisah, aksi update status produksi lewat barcode/QR dipegang oleh Owner untuk MVP. Pengisian form QC/checksheet, defect notes, dan keputusan review final approve/reject juga dilakukan oleh Owner.

## Pembagian Akses Production Tracking

Production Tracking adalah workflow lintas service, bukan module yang berdiri sendiri untuk semua orang mengubah data. Data produksinya memang dibaca oleh beberapa role, tetapi aksi update tetap dibatasi.

- Sales Order membuat Sales Order dan melakukan confirm sampai sistem membuat SPK/barcode.
- Engineering melihat SPK dan upload link gambar engineering.
- Owner melakukan lookup barcode, scan `Start`, scan `Complete`, melihat progress produksi, dashboard, bottleneck, dan melanjutkan proses review lewat QC setelah produksi selesai.
- Customer/public dapat membuka link tracking produksi tanpa login untuk melihat progress order sudah sampai mana. Akses ini read-only dan tidak menampilkan data internal seperti uploader, link drawing, atau user id.
- Finance dan Purchasing dapat membaca progress produksi untuk konteks material, PR, dan planning, tetapi tidak mengubah status produksi.
- Admin mengelola user dan punya akses override sistem.

## Skenario Login dan Logout

1. User membuka aplikasi web.
2. User login memakai email yang sudah terdaftar.
3. `Identity.API` memvalidasi user dan role.
4. Sistem menerbitkan JWT dan menyimpannya sebagai cookie `access_token`.
5. Frontend menampilkan menu sesuai role user.
6. Saat logout, cookie token dihapus.

Contoh user demo:

- `owner@pjt.local`
- `sales-order@pjt.local`
- `engineering@pjt.local`
- `purchasing@pjt.local`
- `finance@pjt.local`

## Skenario Admin

Admin bertanggung jawab mengelola akses sistem.

Alur kerja:

1. Admin login ke sistem.
2. Admin membuka halaman User Management.
3. Admin membuat user baru untuk Sales Order, Finance, Engineering, Purchasing, Owner, atau Admin.
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

User Sales Order membuat order customer secara digital.

Alur kerja:

1. User Sales Order login ke sistem.
2. User membuka menu Sales Order.
3. User memilih customer dari Master Data.
4. User memilih product/part yang dipesan.
5. User mengisi quantity, target date, dan notes.
6. User menyimpan Sales Order.
7. Saat Sales Order dikonfirmasi, Production API otomatis membuat SPK/Production Order.
8. Sistem membuat barcode unik untuk setiap SPK.

Output utama:

- Sales Order
- Sales Order Item
- Production Order/SPK
- Barcode UID

## Skenario Production Tracking (Barcode/QR)

Production Tracking mengikuti cara kerja Excel lama: ada daftar pekerjaan/SPK, status pekerjaan, person in charge, progress, tanggal mulai/selesai, dan notes. Di aplikasi ini, tracking tersebut dibuat berdasarkan Sales Order dan dijalankan lewat barcode/QR.

Karena belum ada role terpisah bernama Production, aksi update status produksi untuk MVP dipegang oleh Owner. Jadi module ini tetap mencatat aktivitas produksi/shop floor, tetapi user yang melakukan scan `Start`/`Complete` adalah Owner, bukan Engineering.

Alur kerja:

1. User Owner login.
2. User membuka daftar Production Order/SPK.
3. User dapat melihat semua SPK atau filter berdasarkan Sales Order.
4. User membuka detail SPK untuk melihat link ke Sales Order, customer, product, barcode UID, status, start time, finish time, dan duration.
5. User scan barcode/QR untuk lookup SPK tanpa mengubah status.
6. User scan barcode/QR dengan action `Start` ketika produksi dimulai.
7. Sistem otomatis mengisi `started_at_utc`, mengubah status menjadi `InProgress`, dan mulai menghitung duration.
8. User scan barcode/QR dengan action `Complete` ketika produksi selesai. Action lama `Finish` tetap diterima sebagai alias.
9. Sistem otomatis mengisi `finished_at_utc`, mengubah status menjadi `Finished`, menghitung final duration, dan mengirim `ProductionFinishedEvent` untuk menyiapkan QC.
10. Sales Order, Engineering, Finance, Purchasing, Owner, atau Admin dapat membuka progress Sales Order untuk melihat jumlah SPK waiting, in progress, finished, closed, dan progress percent.
11. Customer dapat membuka public tracking memakai kode Sales Order, nomor SPK, atau barcode UID yang diberikan untuk melihat progress tanpa login. Public tracking hanya menampilkan status, progress, item, quantity, waktu mulai/selesai, dan duration.

Endpoint utama:

- `GET /api/v1/production/tracking?code={soNumberOrSpkOrBarcode}`
- `GET /api/v1/production/tracking/{soNumberOrSpkOrBarcode}`
- `GET /api/v1/production/orders`
- `GET /api/v1/production/orders?salesOrderId={salesOrderId}`
- `GET /api/v1/production/orders/{id}`
- `POST /api/v1/production/shop-floor/lookup`
- `POST /api/v1/production/shop-floor/scan`
- `GET /api/v1/production/sales-orders/{id}/progress`

Output utama:

- Production Order/SPK detail.
- Barcode UID untuk QR/webcam/mobile scan.
- Link ke Sales Order.
- Status `Waiting`, `InProgress`, `Finished`, atau `Closed`.
- `started_at_utc`, `finished_at_utc`, dan `durationSeconds`.
- Progress Sales Order.
- Public customer tracking yang read-only.

## Skenario Engineering

Engineering menangani upload file gambar engineering ke SPK. Role ini tidak melakukan scan `Start`/`Complete`, review, approve, atau reject.

Alur kerja:

1. User Engineering login.
2. User membuka daftar SPK.
3. User melihat SPK yang berasal dari Sales Order yang sudah dikonfirmasi.
4. User upload link file gambar, misalnya link Google Drive.
5. Sistem menyimpan link gambar, uploader, waktu upload, dan drawing reference.
6. Owner dapat melihat file gambar tersebut dari data SPK jika perlu review operasional.

Output utama:

- Link file gambar engineering.
- Drawing reference.
- Uploader.
- Waktu upload.

## Skenario Owner untuk QC

Owner melakukan proses QC dari scan barcode/QR, pengisian checksheet, notes defect, sampai review final approve/reject untuk menyelesaikan order. Di modul ini ada dua arti reject yang berbeda: `Reject` pada checksheet adalah hasil inspeksi teknis barang, sedangkan `Rejected` pada review Owner adalah keputusan final bahwa form QC tidak disetujui.

Alur kerja:

1. Owner login ke sistem.
2. Owner membuka menu QC dan scan barcode/QR SPK.
3. Saat SPK dibuat, QC API sudah menyiapkan form inspeksi melalui `SpkCreatedEvent`.
4. Saat produksi selesai, form berubah menjadi siap inspeksi melalui `ProductionFinishedEvent`.
5. QC API mencari inspection berdasarkan barcode UID, nomor SPK, atau nomor referensi QC.
6. User mengisi data inspeksi awal seperti inspector, sample qty, sampling method, dan measuring tool.
7. Owner mengisi visual check sesuai format checksheet: `Accept` untuk quantity barang OK, `Reject` untuk quantity barang NG, `Repair` untuk barang yang perlu repair, `Scrap` untuk barang scrap, serta NC/NCR reference dan keterangan jika ada defect.
8. User mengisi dimension check dengan data ukuran fleksibel dalam JSONB.
9. Owner mengisi hasil inspeksi teknis seperti `Accept`, `Reject`, `Repair`, atau `Scrap`.
10. Jika hasil teknis memiliki `Reject`, `Repair`, atau `Scrap`, Owner wajib mengisi defect notes.
11. Owner menyimpan/upload form QC.
12. Owner melakukan review final dengan memilih `Approve` atau `Reject`. Keputusan ini disimpan sebagai owner decision dan tidak otomatis mengubah jumlah reject pada visual check.
13. QC API mengirim `QcCheckCompletedEvent` ke Production API.
14. Jika Owner approve, Production Order berubah menjadi `Closed`.

Output utama:

- QC Inspection
- Hasil scan barcode/QR QC
- Header checksheet lama: produk, kode produk, POR/SPK, ref gambar, jumlah order, spec material, jumlah sample, metode sampling, dan alat ukur.
- Visual Check, termasuk quantity `Accept`, `Reject`, `Repair`, `Scrap`, NC/NCR reference, dan keterangan teknis.
- Dimension Check
- Inspection Result teknis dari checksheet.
- Defect Notes
- Owner Review Status: Approved / Rejected.

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

## Skenario Owner Dashboard

Owner melihat kondisi pabrik secara high-level.

Alur kerja:

1. Owner login ke sistem.
2. Owner membuka Executive Dashboard.
3. Owner melihat jumlah order yang masih waiting, in progress, finished, dan closed.
4. Owner melihat hasil QC berdasarkan review final: approved dan rejected.
5. Owner melihat rejection rate.
6. Owner memakai data ini untuk melihat bottleneck produksi dan kualitas barang.

Output utama:

- Ringkasan status produksi.
- Ringkasan hasil review QC.
- Rejection rate.
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

## CI/CD

Workflow GitHub Actions untuk test service tersedia di:

```text
.github/workflows/qc-tests.yml
.github/workflows/production-tests.yml
```

Setiap Pull Request akan menjalankan:

```powershell
dotnet test tests/Services/QC.API.Tests/QC.API.Tests.csproj --configuration Release --no-restore
dotnet test tests/Services/Production.API.Tests/Production.API.Tests.csproj --configuration Release --no-restore
```

Test ini fokus ke logic QC: scan barcode/QR, upload checksheet, validasi defect notes, approval Owner, event `QcCheckCompletedEvent`, dan pembatasan endpoint QC hanya untuk `Owner`/`Admin`.

Test Production fokus ke logic Production Tracking: confirm Sales Order menjadi SPK/barcode, lookup barcode, scan `Start`, scan `Complete`, validasi complete sebelum start, duration otomatis, event `ProductionFinishedEvent`, dan progress per Sales Order.

## Catatan Implementasi

Project ini sudah disiapkan untuk microservices, bukan modular monolith. Karena itu relasi lintas service memakai soft reference dan sinkronisasi event.

Jika nanti sistem ingin dibuat lebih strict, validasi antar service bisa ditambah lewat:

- local replica table,
- event replay,
- API validation,
- background reconciliation job,
- dashboard monitoring untuk event gagal.
