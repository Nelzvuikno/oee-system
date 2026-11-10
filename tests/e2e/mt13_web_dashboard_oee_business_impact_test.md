---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [web, dashboard, oee, business-impact, executive, mt13]
---

# Main Task 13 - Dashboard Eksekutif Business Impact dan Evaluasi OEE Performance

## 1. Login Admin Manager dan Buka Dashboard Business Impact
Buka {{base_url}}/login dan masuk menggunakan {{manager_user}} dan {{manager_password}}.
Verifikasi login berhasil dan otomatis mendarat di {{base_url}}/web/dashboard/business-impact.
Verifikasi halaman memuat judul "Business Impact" dengan filter Periode, Factory, dan Area.
Verifikasi 3 kartu metrik dampak finansial ditampilkan: Volume Produksi & Revenue, Reject & Scrap Opportunity Loss (FRL), dan Time Opportunity Loss (FOL).

## 2. Analisis Grafik Finansial FOL dan FRL
Verifikasi grafik Time & Financial Opportunity Loss menampilkan tren kerugian waktu henti dalam nilai Rupiah (IDR).
Verifikasi grafik Reject & Scrap Loss menampilkan perbandingan volume cacat Process Defect vs Scrap Garam K3.
Klik tombol "Download" di kanan atas filter.
Verifikasi berkas laporan ringkasan eksekutif dampak bisnis berhasil diunduh.

## 3. Navigasi ke Dashboard OEE Performance
Klik menu "Dashboard > OEE & Performance" pada sidebar kiri.
Verifikasi URL berpindah ke {{base_url}}/web/dashboard/oee-performance.
Verifikasi kartu skor KPI OEE menampilkan: OEE %, TEEP %, Utility %, Availability %, Performance %, Quality %, dan Achievement Rate %.
Verifikasi garis pembanding target JIPM World Class 85.00% tercantum pada grafik tren.

## 4. Analisis Peringkat Six Big Losses dan Donat Alokasi Waktu
Verifikasi kartu peringkat Six Big Losses (#1 hingga #6) mengurutkan jenis kerugian terbesar (contoh: L-01 Equipment Failure atau L-04 Reduced Speed).
Verifikasi diagram donat Calendar vs Operating Time menampilkan proporsi Planned Downtime, Unplanned Downtime, dan Net Operating Time.
Verifikasi 4 grafik kombinasi Pareto ditampilkan: Downtime Pareto, Pareto Action, Planned Loss Pareto, dan Quality Loss Pareto.

## 5. Matriks Kalender Heatmap Harian Pabrik
Gulir ke bagian kalender performa harian "OEE & TEEP Factory Daily Performance".
Verifikasi sel kalender harian diwarnai berdasarkan ambang batas OEE (Hijau: >= 85%, Kuning: 75-84%, Merah: < 75%).
Klik salah satu tanggal pada kalender untuk melihat rincian laporan shift pada hari tersebut.
Verifikasi sistem menampilkan pop-up atau tautan menuju rekap shift harian terkait.

