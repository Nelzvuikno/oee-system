---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400/hmi
tags: [hmi, log-activity, pareto, handover, sop-reader, mt10]
---

# Main Task 10 - Panel HMI-T7 Log Aktivitas Lokal, Serah Terima Shift Prev Production, dan Pembaca SOP Digital

## 1. Navigasi ke Tab Log Activity Lokal Mesin
Buka {{hmi_url}} dengan sesi login operator aktif.
Sentuh tab "Log Activity" pada navigasi bawah HMI.
Verifikasi daftar log aktivitas lokal khusus untuk Mesin Packing #6 ditampilkan secara kronologis.
Verifikasi setiap baris log memuat stempel waktu, nama operator, jenis aktivitas, dan rincian perubahan.

## 2. Filter Kategori Aktivitas Mesin
Sentuh filter kategori aktivitas dan pilih opsi "Downtime & Small Stop".
Verifikasi daftar log hanya memuat rekaman kejadian henti mesin dan klasifikasi downtime.
Ketik "Order" pada kolom pencarian aktivitas.
Verifikasi log yang memuat kata kunci order produksi difilter secara langsung.
Kembalikan filter ke "Semua Log Shift".

## 3. Tab Prev Production untuk Serah Terima Shift
Sentuh tab "Prev. Production" pada bilah navigasi bawah HMI.
Verifikasi halaman memuat ringkasan performa shift sebelumnya: OEE %, Availability %, Performance %, Quality %, dan total Finish Good.
Verifikasi batang Event Timeline shift lalu ditampilkan dengan penanda warna visual.
Verifikasi tabel rekapitulasi waktu henti shift lalu menampilkan kolom Alasan, Frekuensi, dan Total Durasi (menit).

## 4. Modal Diagram Pareto Downtime Shift Lalu
Sentuh tombol "Lihat Pareto" di atas tabel downtime shift lalu.
Verifikasi modal "Pareto Downtime Shift Sebelumnya" terbuka.
Verifikasi diagram batang Pareto menampilkan urutan gangguan dari durasi terpanjang ke terpendek dengan pemisahan Planned vs Unplanned Downtime.
Tutup modal Pareto.

## 5. Mode Kiosk Pembaca Dokumen SOP Digital
Sentuh tab "Profile" lalu sentuh sub-tab "Guideline SOP".
Verifikasi daftar dokumen SOP yang relevan untuk mesin packing garam ditampilkan.
Sentuh dokumen "SOP Pengoperasian Standar Mesin VFFS Packing #6".
Verifikasi panel pratinjau dokumen PDF terbuka dalam mode kiosk read-only.
Verifikasi operator dapat membaca prosedur tanpa dapat keluar dari aplikasi HMI.

