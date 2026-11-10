# PRD Skeleton: ProductionCore - Sistem Digitalisasi OEE Mesin Packing Unit 2

## Background
Pengukuran efektivitas Mesin Packing #6 pada Unit Produksi 2 pengemasan garam beryodium PT. XYZ selama periode Juli s.d. November 2022 masih dilakukan secara manual menggunakan formulir kertas di akhir shift. Akibat ketiadaan akuisisi telemetri real-time dari mesin, ketiadaan peringatan dini saat kecepatan mesin turun (*reduced speed*) di lingkungan pabrik garam yang korosif, serta rekapitulasi yang rentan salah hitung pada *loading time* hingga 28.080 menit/bulan, nilai rata-rata *Overall Equipment Effectiveness* (OEE) tertahan di angka **68.01%** (*Availability* **85.85%**, *Performance* **80.83%**, *Quality* **98.02%**), di bawah standar JIPM sebesar **85.00%**. Tiga *losses* terbesar (*Reduced Speed Losses* **16.47%** / 23.776 menit, *Setup & Adjustment Losses* **9.97%** / 14.366 menit, serta *Idle & Minor Stoppages* **9.35%** / 13.435 menit) menyumbang **86.17% kumulatif** dari seluruh kehilangan waktu efektif tanpa terdeteksi saat shift berlangsung.

ProductionCore dibangun untuk mendigitalisasi akuisisi sinyal otomatis dari kontroler mesin asumsi generik (`PLC-ABC` beserta sensor `SEN-S01`, `SEN-T01`, `SEN-V01` melalui *IoT Gateway* `GW-100`), memisahkan secara tegas eksekusi lantai produksi pada konsol layar sentuh operator `HMI-T7` (`1280x800`) dari pengawasan, analitik *Six Big Losses*, manajemen *Kaizen* TPM, persetujuan laporan berjenjang, dan konfigurasi *master data* pada Aplikasi Web (`1440x1024`).

## Goals & Success Metrics
- Mengotomatisasi akuisisi counter produksi, deteksi *Unplanned Downtime*, *Small Stop*, serta *Reduced Speed* dari `PLC-ABC` ke *server* melalui `GW-100` dengan siklus pembacaan data `1 detik` dan pembaruan dashboard `<= 60 detik`.
- Meningkatkan dan menjaga capaian OEE Mesin Packing #6 dari *baseline* manual **68.01%** melewati capaian evaluasi awal TPM **77.78%** menuju standar *World-Class* JIPM **>= 85.00%**.
- Menurunkan proporsi *Reduced Speed Losses* dari *baseline* **16.47%** menjadi **< 10.00%** terhadap *loading time* melalui deteksi penurunan kecepatan aktual di bawah `80%` kecepatan ideal (`41.67 pcs/menit` atau *Ideal Cycle Time* `0.024 menit/pcs`).
- Mencapai tingkat kelengkapan klasifikasi alasan henti mesin (*Zero Unreason Downtime* sebelum tutup shift) sebesar **100%** pada panel `HMI-T7` melalui mekanisme *interlock pop-up* dan *buzzer* `BUZ-01`.
- Memangkas waktu penyusunan, verifikasi, dan *approval* laporan OEE per shift (*Draft -> Needs Approval -> Approved -> Released*) oleh Shift Leader dan Supervisor menjadi otomatis sesaat setelah shift berakhir tanpa rekalkulasi manual.
- Menjaga ketersediaan pencatatan produksi lantai pabrik minimal **99.5%** selama jam operasional 3 shift dengan dukungan penyangga data lokal (*offline buffer*) pada `GW-100` / `HMI-T7` saat jaringan LAN terputus sementara.

## Platforms Affected
- **Aplikasi Web Manajemen & Analitik (`1440x1024` Desktop Browser)** untuk peran Shift Leader, Supervisor (SPV), Admin / Manager Produksi, dan SuperAdmin OT/IT (`[LINGKUP WEB]` pada [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen)).
- **Aplikasi Konsol Panel Sentuh Operator `HMI-T7` (`1280x800` Industrial Touchscreen IP65)** di Mesin Packing #6 untuk peran Operator Lini Produksi dan Teknisi Maintenance Lapangan (`[LINGKUP HMI]` pada [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen)).
- **Backend API, Rule Engine Kalkulasi OEE/Six Big Losses, MQTT Broker & Integrasi Edge IoT Gateway `GW-100` <-> `PLC-ABC`** (On-Premise Server VM1 & Database PostgreSQL VM2).

## Requirements
1. Aplikasi Web - Autentikasi, Pemulihan Kata Sandi, Profil Pengguna, dan Navigasi Role-Based (RBAC)
2. Aplikasi Web - Konfigurasi Master Factory, Area, Line, Machine, dan Sub-Machine PLC-ABC
3. Aplikasi Web - Konfigurasi Master User Management dan Otorisasi Peran
4. Aplikasi Web - Konfigurasi Master SKU Garam, Hierarki Kemasan, dan Parameter Ideal Cycle Time
5. Aplikasi Web - Konfigurasi Master Downtime Reason (Six Big Losses) dan Pengelolaan Dokumen Guideline SOP
6. Integrasi Edge OT & Backend - Akuisisi Telemetri PLC-ABC via Gateway GW-100 dan Rule Engine Deteksi Losses Otomatis
7. Panel HMI-T7 - Autentikasi Operator Numpad PIN, Pemulihan Akses ke SPV, Profil, dan Logout Shift
8. Panel HMI-T7 - Konsol Utama Production Running, Input Order Produksi Shift, dan Counter Sentuh Reject/Scrap K3
9. Panel HMI-T7 - Interlock Pop-up Alarm Buzzer Downtime/Small Stop dan Klasifikasi Penyebab Henti Mesin
10. Panel HMI-T7 - Log Aktivitas Lokal Mesin, Rekap Serah Terima Shift Sebelumnya (Prev. Production & Pareto), dan Pembaca SOP Digital
11. Panel HMI-T7 - Pelaporan Tiket Kaizen Lapangan, Input Perbaikan Teknisi Maintenance, dan Verifikasi Operator Produksi
12. Aplikasi Web - Monitoring Real-Time Production Active Multi-Lini, Detail Lini, dan Koreksi Downtime oleh Supervisor
13. Aplikasi Web - Dashboard Eksekutif Business Impact dan Evaluasi OEE Performance & Six Big Losses
14. Aplikasi Web - Analitik Mendalam Availability Loss, Performance Speed Loss, dan Quality Defect/Scrap Loss
15. Aplikasi Web - Manajemen Papan Kaizen TPM, Evaluasi Verifikasi Akhir, dan Laporan Dampak Sebelum vs Sesudah TPM
16. Aplikasi Web - Laporan Otomatis Report by Shift, Alur Persetujuan Berjenjang (Approval & Release), dan Report by Product
17. Aplikasi Web - Pusat Audit Log Aktivitas Terpusat dan Notifikasi Real-Time Lintas Peran
