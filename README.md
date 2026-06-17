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

`EventBus.Messages` berisi kontrak event antar service, seperti `MasterDataUpdatedEvent`, `SalesOrderConfirmedEvent`, `SpkCreatedEvent`, `MaterialRequestSubmittedEvent`, `ProductionFinishedEvent`, `QcCheckCompletedEvent`, `SalesOrderReadyForInvoiceEvent`, dan `PurchaseRequestReviewedEvent`.

`Shared.Auth` berisi konfigurasi JWT, validasi token, dan helper penerbit token untuk login.

`Shared.Infrastructure` berisi PGMQ event bus, transactional outbox, unit of work abstraction, dan Postgres-backed distributed cache.

`Shared.Logging` berisi konfigurasi logging standar untuk semua service.

## Service Backend

`Identity.API` menangani user, role, login, logout, dan penerbitan JWT. Service ini menjadi tempat fitur User CRUD.

`MasterData.API` menangani data master seperti customer dan product/part. Data ini dipakai oleh Sales Order dan Engineering, tetapi tidak dibuat sebagai foreign key lintas database.

`Production.API` menangani Sales Order sebagai pusat tracking produksi: item SO, assignment engineer worker/reviewer, barcode/QR lookup berbasis SO, start/finish produksi oleh worker yang ditugaskan, tracking waktu otomatis, progress per Sales Order, dan dashboard owner. Record production order di database hanya dipakai sebagai state internal workflow, bukan identitas yang ditampilkan ke user.

`QC.API` menangani QC Inspection sederhana oleh Engineering Supervisor: upload foto/form QC, notes, dan keputusan `Go`/`NoGo`. Tidak ada lagi form checklist visual/dimension di aplikasi.

`Purchasing.API` menangani kebutuhan material dari Sales Order, daftar item untuk purchasing, visibilitas stok, pengajuan pembelian dari Engineering/Production, approval Engineering Supervisor, approval Finance, proses pembelian oleh Purchasing, informasi supplier/PO/estimasi harga/tanggal pembelian, serta tracking bahan baku sampai diterima.

`Finance.API` menangani kandidat invoice dari Sales Order yang sudah selesai QC, pembuatan invoice dari item SO, termin DP/pelunasan berbasis persentase, pencatatan pembayaran, filter jatuh tempo/pelanggan, surat penagihan, dan dashboard finance global atau per customer.

`Web.Gateway` adalah API Gateway berbasis YARP. Semua request frontend masuk lewat gateway, lalu diteruskan ke service yang sesuai.

## Alur End-to-End ERP Terbaru

Alur utama sistem dimulai dari pembuatan pesanan berupa Sales Order (SO). Sales membuat SO untuk customer baru atau existing, mengisi detail produk, quantity, target tanggal, referensi desain, dan link gambar/customer drawing. Jika desain dari customer belum lengkap, status desain SO menjadi `PendingDesign` dan akan masuk ke antrean tugas desain Engineering.

Engineering Supervisor memonitor antrean desain dan pesanan dikerjakan oleh tim Engineer. Engineer melengkapi gambar teknik dan menyusun rincian BOM (Bill of Materials) di dalam SO, lalu mengirimkannya ke Engineering Supervisor untuk approval desain. Jika desain disetujui, SO dilanjutkan ke Finance untuk Costing (perhitungan harga).

Finance menghitung harga jual berdasarkan BOM yang telah disusun oleh Engineer, serta menambahkan harga ke dalam SO. Negosiasi harga dengan pelanggan dicatat pada SO. Setelah pelanggan sepakat dengan harga tersebut, Finance menyiapkan Invoice DP (Down Payment) atau tagihan pertama sesuai termin (misalnya 50% di awal). Setiap invoice punya catatan jatuh tempo serta riwayat pembayaran.

Produksi hanya berjalan setelah DP diverifikasi lunas sesuai termin yang ditetapkan Finance. Setelah verifikasi Finance, sistem secara otomatis mengubah status pesanan (Sales Order) menjadi Confirmed, yang diterjemahkan menjadi "Ready for Production". Sales Order tersebut langsung masuk ke dalam antrean (Pending Assignment) milik Supervisor Produksi/Engineering untuk penugasan Engineer/Operator lapangan. Operator dapat melihat link gambar dari SO, termasuk customer drawing dan engineering drawing. Production Tracker juga membaca gambar dari SO supaya tidak ada file produksi yang terpisah dari order.

Jika saat persiapan produksi ada material, tools, consumable, asset, project item, atau kebutuhan maintenance yang kurang, Engineer membuat Material Request (MR) multi-item. MR tersebut masuk ke Supervisor untuk approval operasional, lalu Purchasing menyiapkan PO yang tetap perlu approval Finance sebelum pembelian dijalankan. Consumable tidak wajib terikat ke satu SO karena bisa dipakai lintas banyak SO; satu PO juga boleh merujuk banyak MR dan banyak SO.

Setelah material lengkap, produksi berjalan sampai selesai, lalu QC memberikan keputusan `Go` atau `NoGo`. Setelah `Go`, barang masuk packing dan pengiriman. Owner berada di luar jalur operasional harian, tetapi dapat memantau dashboard, mengganti role untuk membuka halaman lain, dan melihat performa per module.

Catatan data penting:

- Sales Order menyimpan customer email, customer code, link gambar customer, dan link gambar engineering.
- Material Request dan Purchase Order memakai daftar item, bukan satu field material tunggal.
- Purchasing mengisi total harga; harga satuan dihitung otomatis dari total harga dibagi quantity.
- Kategori PO adalah `Asset`, `Consumable`, `Tools`, `Project`, atau `Maintenance`.
- Finance menyediakan filter jatuh tempo, filter customer, sort tanggal/jatuh tempo lama-terbaru, surat penagihan terpisah dari invoice, dan dashboard analitik per customer.
- Invoice printout perlu menampilkan rekening tujuan transfer di area kiri bawah.

## Port

Saat dijalankan dengan Docker Compose:

- Gateway: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- Identity API: `http://localhost:5001`
- MasterData API: `http://localhost:5002`
- Production API: `http://localhost:5003`
- QC API: `http://localhost:5004`
- Purchasing API: `http://localhost:5005`
- Finance API: `http://localhost:5006`
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
- Finance: `/openapi/finance/v1.json`

Untuk testing cepat, semua service menerima dev master token hanya di environment `Development`:

```text
Authorization: Bearer dev-master-token
```

Alternatif header:

```text
X-Dev-Master-Token: dev-master-token
```

Token ini diberi semua role development: `Admin`, `Owner`, `Sales Order`, `Finance`, `Engineering Worker`, `Engineering Supervisor`, dan `Purchasing`. Di luar `Development`, token ini otomatis tidak berlaku.

## Database dan Microservices

Project ini memakai pendekatan microservices dari awal. Artinya setiap service punya database sendiri:

- `pjt_identity`
- `pjt_masterdata`
- `pjt_production`
- `pjt_qc`
- `pjt_purchasing`
- `pjt_finance`
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
  │   ├── QC.API membuat form inspeksi awal
  │   └── Purchasing.API membuat material requirement awal untuk kebutuhan bahan baku
  └── ProductionFinishedEvent
      └── QC.API menandai inspeksi siap dikerjakan

Production.API
  └── SalesOrderConfirmedEvent
      └── Purchasing.API menyimpan snapshot Sales Order untuk tracking bahan baku

Production.API
  └── MaterialRequestSubmittedEvent
      └── Purchasing.API membuat Material Request multi-item dari kebutuhan shop-floor

QC.API
  └── QcCheckCompletedEvent
      └── Production.API menyimpan hasil review Engineering Supervisor pada production order

Production.API
  └── SalesOrderReadyForInvoiceEvent
      └── Finance.API membuat kandidat invoice dari Sales Order yang sudah selesai QC

Purchasing.API
  └── PurchaseRequestReviewedEvent
      └── siap dipakai untuk dashboard/reporting acceptance Material Request

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

Catatan: Admin dipakai untuk manajemen sistem dan User CRUD. Engineering dibagi menjadi worker dan reviewer. Worker yang ditugaskan di Sales Order meng-upload link gambar engineering serta melakukan start/finish produksi melalui endpoint Sales Order, sedangkan reviewer yang ditugaskan hanya melakukan QC dengan upload gambar/form QC, notes, dan keputusan `Go`/`NoGo`. Barcode/QR hanya shortcut lookup tracking, bukan mekanisme scan untuk mengubah status.

## Pembagian Akses Production Tracking

Production Tracking adalah workflow lintas service, bukan module yang berdiri sendiri untuk semua orang mengubah data. Data produksinya memang dibaca oleh beberapa role, tetapi aksi update tetap dibatasi.

- Sales Order membuat Sales Order, mengisi item, dan assign engineer worker/reviewer.
- Engineering Worker melihat Sales Order yang ditugaskan, upload link gambar engineering, dan melakukan start/finish produksi.
- Engineering Supervisor mengerjakan QC review setelah produksi selesai.
- Owner melakukan lookup barcode berbasis SO, melihat progress produksi, dashboard, dan bottleneck.
- Customer/public dapat membuka link tracking produksi tanpa login untuk melihat progress order sudah sampai mana. Akses ini read-only dan tidak menampilkan data internal seperti uploader, link drawing, atau user id.
- Finance dan Purchasing dapat membaca progress produksi untuk konteks material, pengajuan pembelian, dan planning, tetapi tidak mengubah status produksi.
- Admin mengelola user dan punya akses override sistem.

## Skenario Login dan Logout

1. User membuka aplikasi web.
2. User login memakai email yang sudah terdaftar.
3. `Identity.API` memvalidasi user dan role.
4. Sistem menerbitkan JWT dan menyimpannya sebagai cookie `access_token`.
5. Frontend menampilkan menu sesuai role user.
6. Saat logout, cookie token dihapus.

Contoh user demo:

- `owner@test.com`
- `admin@test.com`
- `finance@test.com`
- `sales@test.com`
- `engineering@test.com`

## Skenario Admin

Admin bertanggung jawab mengelola akses sistem.

Alur kerja:

1. Admin login ke sistem.
2. Admin membuka halaman User Management.
3. Admin membuat user baru untuk Sales Order, Finance, Engineering Worker, Engineering Supervisor, Purchasing, Owner, atau Admin.
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
5. User mengisi quantity, target date, notes, referensi desain, dan link gambar/customer drawing jika ada.
6. User menyimpan Sales Order.
7. Engineering Supervisor mengubah status desain menjadi `Approved`, `RevisionRequired`, atau `Rejected`.
8. Setelah Sales Order dikonfirmasi otomatis melalui verifikasi pembayaran Finance, Production API menyiapkan state produksi internal untuk SO tersebut tanpa perlu konfirmasi manual Owner.
9. Sistem membuat barcode unik berbasis Sales Order.

Output utama:

- Sales Order
- Sales Order Item
- Customer email dan kode customer.
- Link gambar/customer drawing dari Sales Order.
- Status dan referensi desain.
- Barcode UID berbasis SO

## Skenario Production Tracking (Barcode/QR)

Production Tracking mengikuti cara kerja Excel lama: status pekerjaan, person in charge, progress, tanggal mulai/selesai, dan notes. Di aplikasi ini, tracking tersebut dibuat berdasarkan Sales Order; barcode/QR hanya menjadi shortcut lookup ke Sales Order.

Sales Order adalah identitas utama. Record production order di database hanya menyimpan state internal seperti status, barcode, timestamp, duration, dan QC decision.

Alur kerja:

1. User membuka progress Sales Order.
2. Barcode/QR dapat dipakai untuk lookup Sales Order tanpa mengubah status.
3. Engineering Worker yang ditugaskan upload link gambar engineering pada Sales Order.
4. Engineering Worker yang sama melakukan start produksi pada Sales Order.
5. Sistem mengisi `started_at_utc`, mengubah production status menjadi `InProgress`, dan mulai menghitung duration.
6. Engineering Worker yang sama melakukan finish produksi pada Sales Order.
7. Sistem mengisi `finished_at_utc`, mengubah production status menjadi `Finished`, menghitung final duration, dan mengirim `ProductionFinishedEvent` untuk menyiapkan QC.
8. Sales Order, Engineering Worker, Finance, Purchasing, Owner, atau Admin dapat membuka progress Sales Order.
9. Customer dapat membuka public tracking memakai kode Sales Order atau barcode UID yang diberikan untuk melihat progress tanpa login. Public tracking hanya menampilkan status, progress, item, quantity, waktu mulai/selesai, dan duration.

Endpoint utama:

- `GET /api/v1/production/tracking?code={soNumberOrBarcode}`
- `GET /api/v1/production/tracking/{soNumberOrBarcode}`
- `POST /api/v1/production/tracking/lookup`
- `GET /api/v1/production/sales-orders/{id}/progress`
- `PUT /api/v1/production/sales-orders/{id}/design-status`
- `PUT /api/v1/production/sales-orders/{id}/production/start`
- `PUT /api/v1/production/sales-orders/{id}/production/finish`
- `PUT /api/v1/production/sales-orders/{id}/engineering-drawing`

Output utama:

- Sales Order tracking detail.
- Barcode UID untuk lookup via QR/webcam/mobile.
- Status `Waiting`, `InProgress`, `Finished`, atau `Closed`.
- `started_at_utc`, `finished_at_utc`, dan `durationSeconds`.
- Progress Sales Order.
- Link gambar/customer drawing dari SO untuk Production Tracker internal.
- Public customer tracking yang read-only.

## Skenario Engineering

Engineering Worker menangani upload link gambar engineering ke Sales Order sekaligus start/finish produksi. Engineering Supervisor menangani approval desain dan QC.

Alur kerja:

1. User Engineering Worker login.
2. User membuka daftar Sales Order yang ditugaskan.
3. User melihat item pekerjaan dari Sales Order yang sudah dikonfirmasi.
4. User upload link file gambar, misalnya link Google Drive.
5. Sistem menyimpan link gambar, uploader, waktu upload, dan drawing reference.
6. User melakukan start/finish produksi dari Sales Order yang sama.
7. Owner dapat melihat file gambar tersebut dari data Sales Order jika perlu review operasional.

Output utama:

- Link file gambar engineering.
- Drawing reference.
- Uploader.
- Waktu upload.
- Approval desain: `PendingDesign`, `WaitingApproval`, `Approved`, `RevisionRequired`, atau `Rejected`.

## Skenario Engineering Supervisor untuk QC

Engineering Supervisor melakukan QC sederhana setelah produksi selesai: upload foto/form QC, isi notes, lalu memberi keputusan `Go` atau `NoGo`. Aplikasi tidak menyimpan tabel hasil inspeksi visual/dimension.

Alur kerja:

1. Engineering Supervisor login ke sistem.
2. Reviewer membuka menu QC.
3. Saat SO dikonfirmasi, QC API menyiapkan inspection internal melalui event workflow.
4. Saat produksi selesai, inspection berubah menjadi siap QC melalui `ProductionFinishedEvent`.
5. Reviewer upload foto/form QC, mengisi notes, dan memilih `Go` atau `NoGo`.
6. QC API mengirim `QcCheckCompletedEvent` ke Production API.
7. Jika reviewer memberi keputusan `Go`, production status SO berubah menjadi `Closed` dan Sales Order berubah menjadi `Completed`.

Output utama:

- QC Inspection
- Sales Order number
- QC image/form URL
- Notes
- Reviewer decision: Go / NoGo.

## Skenario Pengajuan, Finance, dan Purchasing

Pengajuan pembelian dibuat dari menu Engineering, karena Engineering yang mengetahui kebutuhan material produksi. Setelah request dibuat, Engineering Supervisor harus approve/reject terlebih dahulu. Setelah Supervisor approve, request terlihat di Finance untuk approval biaya. Purchasing baru boleh memproses pembelian setelah Finance approve.

Modul ini mengikuti form lama "Form Pembelian Barang dan Material": nama barang, ukuran/spesifikasi, jumlah, satuan, urgensi, kategori pembelian, referensi SO opsional, pemohon, supplier, nomor PO, total harga, estimasi tiba, catatan, dan status penerimaan.

Alur kerja:

1. Sales Order dikonfirmasi dan Production API menyiapkan state produksi internal.
2. Production API mengirim event workflow Sales Order.
3. Purchasing API menyimpan snapshot Sales Order dan membuat `MaterialRequirement` per item SO sebagai daftar item yang perlu dipantau.
4. Engineering membuka tab `Pengajuan Purchasing`, atau operator membuka halaman Produksi dan membuat MR langsung dari SO saat persiapan material.
5. Engineering/Production membuat Material Request (MR) baru dari satu atau beberapa material requirement, atau mengajukan item manual dengan referensi SO opsional. Item seperti consumable, tools, asset, atau maintenance boleh tidak terikat ke SO.
6. Engineering mengisi nama barang/material, spesifikasi/ukuran, jumlah, satuan, urgensi (`Normal`, `Urgent`, atau `Critical`), kategori (`Asset`, `Consumable`, `Tools`, `Project`, atau `Maintenance`), referensi SO opsional, supplier suggestion, dan catatan kebutuhan.
7. Status item pembelian masuk sebagai `Requested`, lalu material requirement berubah menjadi `PurchaseRequested`.
8. Engineering Supervisor membuka daftar MR yang masih `Submitted`, lalu memilih `Accept` atau `Reject`. Jika accepted, status request menjadi `SupervisorApproved`.
9. Finance membuka daftar MR/PO yang sudah `SupervisorApproved`.
10. Finance memilih `Accept` atau `Reject`; jika reject, Finance mengisi alasan penolakan. Jika accepted, status request menjadi `FinanceApproved`, item menjadi `Approved`, dan material requirement berubah menjadi `PurchaseApproved`.
11. Purchasing membuka menu `Manajemen Pembelian` untuk melihat request yang sudah Finance approved, diproses, selesai, atau ditolak.
12. Purchasing memproses item accepted dengan mengisi supplier final, nomor PO, total harga, kategori pembelian, estimasi tanggal tiba, dan catatan purchasing. Harga satuan dihitung otomatis dari `totalPrice / qty`. Status item menjadi `Ordered`.
13. Purchasing dapat menolak item request jika tidak valid pada tahap pembelian. Status item menjadi `Rejected`.
14. Saat barang datang, Purchasing mengisi tanggal penerimaan aktual. Status item menjadi `Received` dan tracking bahan baku Sales Order ikut naik.

Endpoint utama:

- `GET /api/v1/purchasing/material-requirements`
- `GET /api/v1/purchasing/material-requirements?salesOrderId={salesOrderId}`
- `GET /api/v1/purchasing/sales-orders/{salesOrderId}/material-tracking`
- `POST /api/v1/production/sales-orders/{id}/material-requests`
- `PUT /api/v1/purchasing/material-requirements/{id}/stock`
- `GET /api/v1/purchasing/purchase-requests`
- `GET /api/v1/purchasing/purchase-requests/{id}`
- `POST /api/v1/purchasing/purchase-requests`
- `POST /api/v1/purchasing/purchase-requests/{id}/supervisor-review`
- `POST /api/v1/purchasing/purchase-requests/{id}/finance-review`
- `POST /api/v1/purchasing/purchase-requests/{id}/review` sebagai alias Finance review
- `PUT /api/v1/purchasing/purchase-requests/{id}/items/{itemId}/process`
- `PUT /api/v1/purchasing/purchase-requests/{id}/items/{itemId}/reject`
- `PUT /api/v1/purchasing/purchase-requests/{id}/items/{itemId}/receive`
- `PUT /api/v1/purchasing/purchase-requests/{id}/items/{itemId}/purchase-info`

Output utama:

- Material Requirement dari Sales Order.
- Material Request dan Material Request Item.
- Supervisor approval dan Finance approval: reviewer, waktu review, status approved/rejected, dan alasan penolakan jika ada.
- Informasi supplier, nomor PO, kategori pembelian, total harga, harga satuan hasil hitung, estimasi datang, tanggal diterima, status pembelian, dan alasan penolakan item jika ada.
- Tracking bahan baku per Sales Order.

## Skenario Finance

Finance membuat invoice dari Sales Order yang sudah selesai QC. Item invoice tidak diinput manual dari nol; sistem mengambil daftar item dari Sales Order yang sudah masuk sebagai kandidat invoice.

Alur kerja:

1. Engineering Supervisor memberi keputusan QC `Go`.
2. Production API menutup production order, mengubah Sales Order menjadi `Completed`, lalu mengirim `SalesOrderReadyForInvoiceEvent`.
3. Finance API membuat invoice candidate berisi customer, email, nomor SO, target date, dan list item SO.
4. User Finance membuat invoice dengan mengisi harga satuan per item, pajak, tanggal invoice, jatuh tempo, rekening transfer, dan termin pembayaran seperti DP 25%, DP 50%, atau pelunasan.
5. User Finance mencatat pembayaran. Sistem menghitung `paidAmount`, `remainingAmount`, `paymentPercent`, dan status invoice.
6. Riwayat transaksi bisa difilter berdasarkan customer, status, rentang jatuh tempo, serta sort tanggal/jatuh tempo paling lama atau terbaru.
7. Jika pembayaran lewat jatuh tempo dan belum lunas, Finance dapat membuat Surat Penagihan terpisah dari invoice.
8. Dashboard Finance bisa dibaca global atau difilter untuk satu customer spesifik.

Endpoint utama:

- `GET /api/v1/finance/invoice-candidates`
- `GET /api/v1/finance/invoices`
- `GET /api/v1/finance/invoices/{invoiceId}`
- `POST /api/v1/finance/invoices`
- `POST /api/v1/finance/invoices/{invoiceId}/payments`
- `POST /api/v1/finance/invoices/{invoiceId}/collection-letters`
- `GET /api/v1/finance/dashboard`

Output utama:

- Invoice Candidate dari Sales Order completed.
- Invoice dengan list item SO, total, pajak, rekening transfer, termin pembayaran, dan payment progress.
- Riwayat pembayaran dan surat penagihan.
- Dashboard finance global atau per customer.

## Skenario Owner Dashboard

Owner melihat kondisi pabrik secara high-level.

Alur kerja:

1. Owner login ke sistem.
2. Owner membuka Executive Dashboard.
3. Owner melihat jumlah order yang masih waiting, in progress, finished, dan closed.
4. Owner melihat ringkasan hasil QC dari Engineering Supervisor: `Go` dan `NoGo`.
5. Owner melihat NoGo rate.
6. Owner memakai data ini untuk melihat bottleneck produksi dan kualitas barang.

Output utama:

- Ringkasan status produksi.
- Ringkasan hasil review QC.
- NoGo rate.
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

Workflow GitHub Actions dipisah untuk frontend dan backend:

```text
.github/workflows/frontend-build.yml
.github/workflows/backend-ci.yml
```

Setiap Pull Request akan menjalankan:

```powershell
npm ci
npm run build
dotnet build PtPjtErp.slnx --configuration Release --no-restore
dotnet test tests/Services/QC.API.Tests/QC.API.Tests.csproj --configuration Release --no-restore
dotnet test tests/Services/Production.API.Tests/Production.API.Tests.csproj --configuration Release --no-restore
dotnet test tests/Services/Purchasing.API.Tests/Purchasing.API.Tests.csproj --configuration Release --no-restore
dotnet test tests/Services/Finance.API.Tests/Finance.API.Tests.csproj --configuration Release --no-restore
```

Test ini fokus ke logic QC: upload image/form QC, notes, keputusan `Go`/`NoGo` dari Engineering Supervisor, event `QcCheckCompletedEvent`, dan pembatasan endpoint QC ke supervisor/admin.

Test Production fokus ke logic Production Tracking berbasis Sales Order: confirm SO menyiapkan barcode SO, lookup barcode read-only, start/finish oleh assigned worker, validasi finish sebelum start, duration otomatis, event `ProductionFinishedEvent`, dan progress per Sales Order.

Test Purchasing fokus ke material requirement dari event Sales Order, submit Material Request multi-item dari Engineering Worker, approval Engineering Supervisor, approval Finance, proses/reject/receive item oleh Purchasing, update informasi pembelian/stok, tracking bahan baku per Sales Order, dan pembatasan role endpoint.

Test Finance fokus ke kandidat invoice dari event Sales Order completed, pembuatan invoice dari item SO, termin DP/pelunasan, pencatatan pembayaran, surat penagihan overdue, dashboard per customer, dan pembatasan role endpoint.

## Catatan Implementasi

Project ini sudah disiapkan untuk microservices, bukan modular monolith. Karena itu relasi lintas service memakai soft reference dan sinkronisasi event.

Jika nanti sistem ingin dibuat lebih strict, validasi antar service bisa ditambah lewat:

- local replica table,
- event replay,
- API validation,
- background reconciliation job,
- dashboard monitoring untuk event gagal.
