# Workflow Quality Control (QC)

Modul QC dijalankan di akhir fase produksi, memastikan kualitas sebelum barang masuk ke pengemasan dan dikirim ke customer. Pada versi terbaru PJT ERP, pendekatan QC dipermudah dengan menggabungkan inspeksi ke dalam keputusan tunggal (`Go`/`NoGo`).

## 1. Kesiapan Inspeksi
- Secara otomatis, saat operator menekan tombol "Finish" di halaman Production Tracker, *Production API* menerbitkan event `ProductionFinishedEvent`.
- *QC API* mendeteksi event ini dan memunculkan Sales Order tersebut di antrean QC milik Engineering Supervisor.

## 2. Inspeksi oleh Engineering SPV
- **Engineering SPV** membuka tiket QC.
- Supervisor melakukan unggah (upload) bukti berupa **Foto Barang** atau **Form PDF Laporan QC** eksternal. Aplikasi tidak lagi menyimpan rincian form checklist ukuran/dimensi tabel secara native di sistem untuk mempercepat proses.
- Supervisor mengisi *Notes* (opsional, namun penting jika ditemukan kecacatan ringan).
- Supervisor mengambil **Keputusan Final**:
  - **Go**: Barang lolos standar kualitas dan siap dikemas.
  - **NoGo**: Barang gagal memenuhi standar dan mungkin harus dikerjakan ulang atau discrap.

## 3. Penyelesaian Sales Order
- Saat keputusan dibuat, *QC API* mengirimkan `QcCheckCompletedEvent`.
- Jika keputusannya adalah **Go**, sistem akan otomatis menutup jalur produksi, menandai status SO menjadi `Completed`.
- Event penyelesaian SO ini (*SalesOrderReadyForInvoiceEvent*) akan men-trigger *Finance API* untuk secara otomatis memunculkan SO tersebut di daftar kandidat penagihan/invoice akhir.

## 4. Analisis No-Go Rate (Owner)
- Owner dapat melihat statistik **No-Go Rate** secara real-time di Executive Dashboard, memungkinkan pelacakan kualitas pabrik per periode secara ringkas.
