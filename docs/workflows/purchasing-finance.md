# Workflow Pengajuan Pembelian (Purchasing) & Finance

Modul Pengajuan Pembelian memfasilitasi kebutuhan pengadaan barang dari tingkat shop floor hingga proses negosiasi dan pembayaran oleh Finance. Seluruh alur ini memiliki tingkat persetujuan berjenjang.

## 1. Pengajuan Kebutuhan (Material Request)
- **Sumber:** Permintaan dapat dipicu dari Sales Order yang sudah `Confirmed` (memunculkan *Material Requirements*), atau dapat berupa pengajuan manual dari Engineering/Produksi untuk alat, aset, atau *consumables*.
- Kategori item meliputi: `Asset`, `Consumable`, `Tools`, `Project`, atau `Maintenance`.
- **Engineering Worker** mengisi spesifikasi, urgensi (`Normal`, `Urgent`, `Critical`), serta referensi opsional ke SO tertentu.
- Status item menjadi `Requested`.

## 2. Supervisor Approval
- **Engineering SPV** meninjau pengajuan yang masih berstatus `Requested`.
- Supervisor dapat menolak atau menerima (*Accept/Reject*) berdasarkan kebutuhan operasional di lapangan.
- Jika disetujui, status pengajuan berubah menjadi `SupervisorApproved` dan masuk ke antrean Finance.

## 3. Finance Approval (Cost Control)
- **Finance** meninjau pengajuan dari perspektif anggaran perusahaan.
- Finance menyetujui pengajuan tersebut agar dilanjutkan ke proses pengadaan.
- Jika disetujui, item berubah menjadi `FinanceApproved` / `Approved` dan diteruskan ke Purchasing.

## 4. Pembuatan PO (Purchasing)
- **Purchasing** melihat daftar permintaan yang telah disetujui Finance.
- Purchasing melakukan negosiasi harga, menentukan *Supplier* akhir, dan menerbitkan nomor *Purchase Order (PO)*.
- Purchasing mengisi *Total Harga* dan *Estimasi Kedatangan*. Harga satuan dihitung otomatis (`Total Harga / Quantity`).
- Sistem menyediakan format cetak **Print PO A4 Profesional** yang siap diberikan kepada Supplier (format bersih, responsif cetak, ukuran teks besar, no-margin web).
- Item berubah menjadi `Ordered`.

## 5. Penerimaan Barang & Invoice
- Saat material dari Supplier tiba, Purchasing memverifikasi barang fisik dan memperbarui status menjadi `Received`. Sistem akan otomatis meng-update *track* material di Sales Order terkait jika itu adalah pembelian project.
- **Finance Invoicing:** Finance menerbitkan *Invoice* untuk pelanggan (Sales Order). Ini memiliki form yang mirip dengan PO, mencetak invoice profesional dengan rekening Bank tujuan. Sistem mencatat pembayaran lunas atau parsial, serta mencetak *Surat Penagihan* otomatis jika telah lewat jatuh tempo.
