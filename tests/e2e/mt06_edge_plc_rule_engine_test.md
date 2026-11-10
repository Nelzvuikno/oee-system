---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [edge, plc, telemetry, rule-engine, mt06]
---

# Main Task 06 - Akuisisi Telemetri PLC-ABC D000-D012, Gateway GW-100, dan Rule Engine OEE

## 1. Verifikasi Endpoint Status Register PLC-ABC
Buka {{base_url}}/login dan masuk menggunakan {{superadmin_user}} dan {{superadmin_password}}.
Panggil GET {{base_url}}/api/edge/registers menggunakan otorisasi sesi aktif.
Verifikasi status respons adalah 200 OK.
Verifikasi payload JSON memuat daftar register D000 hingga D012 untuk Mesin Packing #6 (MCN-U2-PK06).
Verifikasi register D000 memuat status operasi mesin (RUN / STOP / FAULT).
Verifikasi register D005 memuat suhu sealer SEN-T01 dan register D006 memuat nilai vibrasi SEN-V01.

## 2. Ingest Paket Telemetri Siklus Normal (RUN)
Kirim POST ke {{base_url}}/api/edge/telemetry dengan body register kondisi mesin RUN:
D000 bernilai 1 (RUN), D002 bernilai 41.7 pcs/menit (kecepatan nominal), D003 bertambah 10 pcs, D004 bernilai 0, D005 bernilai 165.0 C, dan D006 bernilai 2.1 mm/s.
Verifikasi respons status adalah 200 OK dengan status tersimpan.
Buka kembali halaman {{base_url}}/web/dashboard/business-impact di peramban.
Verifikasi badge status PLC pada topbar menampilkan indikator hijau "D000=1 (RUN)".

## 3. Deteksi Otomatis Reduced Speed Loss L-04
Kirim POST ke {{base_url}}/api/edge/telemetry dengan status D000 bernilai 1 (RUN) tetapi kecepatan D002 drop menjadi 25.0 pcs/menit (di bawah ambang batas ideal 41.67 pcs/menit).
Verifikasi respons status adalah 200 OK.
Verifikasi sistem mencatat kejadian Reduced Speed Loss (L-04) pada perhitungan OEE Performance Rate.

## 4. Deteksi Auto-Downtime Kerusakan Suhu dan Pemicu Buzzer
Kirim POST ke {{base_url}}/api/edge/telemetry dengan status D000 bernilai 3 (FAULT), D001 bernilai 4 (Suhu Heater Sealer Overheat), D005 bernilai 192.0 C (kritis di atas setpoint), dan D011 bernilai 1 (BUZ-01 sirine aktif).
Verifikasi respons status adalah 200 OK.
Buka kembali halaman peramban dan verifikasi badge status PLC di topbar berubah menjadi merah "D000=3 (FAULT)".
Verifikasi sistem mencatat antrean Downtime Event awal yang terikat pada sub-mesin Vertical Heater Sealer.

## 5. Simulasi Penyangga Lokal (Buffer & Replay) saat Jaringan Terputus
Kirim POST ke {{base_url}}/api/edge/buffer dengan 3 paket telemetri terekam saat offline.
Verifikasi paket buffer tersimpan secara aman di penyimpanan offline gateway.
Kirim POST ke {{base_url}}/api/edge/replay untuk menyinkronkan antrean FIFO secara berurutan.
Verifikasi seluruh 3 paket berhasil direplay tanpa adanya data duplikat atau counter yang melompat.

