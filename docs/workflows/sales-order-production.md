# Workflow Sales Order & Production Tracking

Modul ini adalah pusat dari seluruh aliran kerja manufaktur. PJT ERP menggunakan **Sales Order (SO)** sebagai identitas utama untuk melacak pesanan dari tahap desain hingga pengiriman.

## 1. Pembuatan Sales Order (Sales)
- Sales membuat pesanan digital untuk pelanggan baru atau yang sudah ada (Master Data).
- Sales mengisi item, quantity, target tanggal, catatan, referensi desain, dan **link gambar customer/drawing**.
- Jika desain belum lengkap, SO berstatus `PendingDesign` dan masuk ke antrean tugas tim Engineering.

## 2. Proses Desain (Engineering Worker & Supervisor)
- **Engineering Worker** mengerjakan gambar teknik dan BOM (Bill of Materials), kemudian mengunggah link dokumen tersebut ke dalam SO.
- **Engineering SPV** mereview dokumen desain. Status dapat berupa `Approved`, `RevisionRequired`, atau `Rejected`.
- Setelah desain disetujui, SO masuk ke Finance untuk Costing & Negosiasi.

## 3. Costing & Verifikasi Pembayaran (Finance)
- Finance menghitung Harga Pokok Produksi berdasarkan BOM dari Engineer dan mengirimkan penawaran harga.
- Setelah harga disetujui, Finance mengeluarkan Invoice DP (Down Payment).
- **CRITICAL:** Produksi **tidak akan dimulai** sampai Finance melakukan Verifikasi Pembayaran Lunas (sesuai termin awal). 
- Setelah diverifikasi, status pesanan otomatis berubah menjadi `Confirmed` (Ready for Production) tanpa perlu persetujuan manual Owner. Sistem akan membuatkan *Barcode/QR* unik berbasis SO.

## 4. Production Tracking (Shop Floor)
- Production Tracker membaca file desain langsung dari SO, memastikan operator tidak menggunakan gambar yang salah/terpisah.
- Operator dapat memindai **Barcode/QR** untuk mencari SO tanpa bisa mengubah status secara paksa.
- **Start Produksi:** Engineering Worker/Operator yang ditugaskan menekan tombol "Start". Sistem mencatat `started_at_utc`, mengubah status menjadi `InProgress`, dan mulai menghitung durasi.
- **Material Request:** Jika material kurang, operator dapat membuat Material Request (MR) langsung melalui SO tersebut, yang akan masuk ke antrean Purchasing.
- **Finish Produksi:** Operator menekan "Finish". Sistem mencatat `finished_at_utc`, menghitung durasi akhir, dan mengirim event `ProductionFinishedEvent` ke modul QC.

## 5. Pemantauan & Transparansi
- **Owner:** Dapat memantau status produksi, mengecek *bottleneck*, dan melihat *duration* tanpa perlu terjun ke operasional harian.
- **Pelanggan:** Diberikan link **Public Tracking** (Read-Only) menggunakan kode SO atau scan barcode untuk melacak pesanan mereka secara real-time tanpa perlu login. Public view menyembunyikan identitas uploader, dokumen internal, dan data sensitif lainnya.
