---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [web, analytics, losses, availability, performance, quality, mt14]
---

# Main Task 14 - Analitik Mendalam Availability Loss, Performance Speed Loss, dan Quality Loss

## 1. Login Supervisor dan Buka Halaman Analitik Loss
Buka {{base_url}}/login dan masuk menggunakan {{spv_user}} dan {{spv_password}}.
Verifikasi login berhasil dan buka menu "Report > Analitik Loss".
Verifikasi URL berpindah ke {{base_url}}/web/analytics/loss.
Verifikasi halaman memuat filter Area, Line/Machine, Periode, dan pilihan nomor Production Order.
Verifikasi 3 pilar segmented tabs ditampilkan: "1. Availability Loss", "2. Performance Loss", dan "3. Quality Loss".

## 2. Eksplorasi Pilar Availability Loss dan Pareto Downtime
Klik tab "1. Availability Loss".
Verifikasi grafik Pareto Unplanned Downtime menampilkan batang durasi henti mesin diurutkan menurun dengan garis kumulatif 0-100%.
Verifikasi tabel rekapitulasi memisahkan Equipment Failure (L-01) dan Setup & Adjustment (L-02).
Klik ikon mata (Losses Detail) pada salah satu baris alasan downtime.
Verifikasi halaman Losses Detail terbuka menampilkan riwayat setiap kejadian downtime individual lengkap dengan waktu mulai, selesai, dan durasi.

## 3. Eksplorasi Pilar Performance Loss dan Grafik Per Jam
Klik tab "2. Performance Loss".
Verifikasi grafik garis tren per jam menampilkan perbandingan: Target Capacity / Cycle Time, Total Production, dan Actual Good Production.
Verifikasi grafik degradasi kecepatan rata-rata D002 (pcs/menit) dibandingkan terhadap kecepatan nominal desain 41.67 pcs/menit.
Verifikasi indikator kerugian waktu Reduced Speed (L-04) dan Small Stop (L-03) ditampilkan.

## 4. Eksplorasi Pilar Quality Loss dan Rekapitulasi Berat Cacat
Klik tab "3. Quality Loss".
Verifikasi Quality Loss Pareto menampilkan penyebab cacat kemasan: Bocor Sealing, Potongan Miring, dan Scrap Garam K3.
Verifikasi grafik korelasi suhu sealer SEN-T01 D005 terhadap kejadian reject kemasan.
Verifikasi tabel konversi unit menampilkan jumlah cacat dalam satuan primer pcs dan konversi kilogram garam.

## 5. Ekspor Data Analitik
Klik tombol "Download CSV / PDF" di bagian kontrol toolbar atas.
Verifikasi berkas data analitik losses berhasil diekspor.

