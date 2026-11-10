---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [web, kaizen, tpm, verification, report, mt15]
---

# Main Task 15 - Manajemen Papan Kaizen TPM, Evaluasi Verifikasi, dan Laporan Dampak Sebelum vs Sesudah TPM

## 1. Login Supervisor dan Buka Halaman Kaizen Web
Buka {{base_url}}/login dan masuk menggunakan {{spv_user}} dan {{spv_password}}.
Verifikasi login berhasil dan buka menu "Report > Kaizen & TPM".
Verifikasi URL berpindah ke {{base_url}}/web/kaizen.
Verifikasi halaman memuat dua tab utama: "Daftar Tiket Kaizen" dan "Laporan Dampak TPM (Kaizen Report)".
Verifikasi sakelar filter status Open vs Closed dan filter status rinci (OPEN | NOT OK, CLOSED | NOT VERIFIED, REVISE | NOT OK, CLOSED | OK).

## 2. Pembuatan Usulan Kaizen Baru Berbasis Diagram Fishbone
Klik tombol "+ Tambah Kaizen" di kanan atas halaman.
Pilih jenis "Production Kaizen".
Verifikasi formulir Step 1 Issue Detail terbuka.
Ketik "Optimasi Penyetelan Ketegangan Belt Penarik Film Garam" pada Judul Isu.
Pilih Faktor Fishbone "Mesin" dan "Metode".
Pilih Target Penurunan Six Big Losses "L-04 Reduced Speed".
Pilih Sub-Machine "Rotary Cutter & Main Drive".
Pilih Reviewer Supervisor "{{spv_user}}".
Klik tombol "Simpan Tiket".
Verifikasi tiket baru terdaftar berstatus "OPEN | NOT OK" dan tersinkronisasi ke papan Kaizen HMI-T7.

## 3. Input Hasil Perbaikan Improvement Information
Buka tiket yang baru dibuat dan klik tombol "Improvement Information (Step 2)".
Verifikasi formulir penyelesaian perbaikan terbuka.
Ketik "Belt penarik film kendor 3 mm menyebabkan slip saat motor servo berputar di atas 38 ppm" pada Akar Masalah.
Ketik "Penyetelan ulang tensioner belt dan penggantian pegas penekan stainless anti karat" pada Uraian Perbaikan.
Pilih Jenis Penyelesaian "Penyetelan Ulang & Modifikasi".
Klik tombol "Simpan Perbaikan".
Verifikasi status tiket berubah menjadi "CLOSED | NOT VERIFIED" dan dialihkan ke tahap verifikasi akhir.

## 4. Evaluasi Verifikasi Akhir Berbasis Bukti Telemetri PLC-ABC
Buka tampilan "Detail & Verifikasi Kaizen" pada tiket tersebut.
Verifikasi kotak bukti telemetri PLC-ABC menampilkan perbandingan sebelum vs sesudah tanggal perbaikan:
kecepatan D002 stabil naik menjadi 41.5 pcs/menit dan frekuensi henti berkurang.
Klik tombol "Setujui (CLOSED | OK)".
Verifikasi status tiket diperbarui menjadi "CLOSED | OK" dan berpindah ke kelompok Closed.

## 5. Tab Kaizen Report Komparasi Sebelum vs Sesudah TPM
Klik tab "Laporan Dampak TPM (Kaizen Report)".
Pilih periode Baseline "Juli - November 2022" dan periode Evaluasi Pasca-TPM "Mei 2023".
Verifikasi kartu rekapitulasi menampilkan kenaikan OEE dari 68.4% menjadi 86.2% (melampaui target JIPM 85%).
Verifikasi tabel matriks Fishbone menampilkan penurunan masalah kategori Mesin dan Metode.
Klik tombol "Unduh Laporan TPM" untuk mengekspor berkas PDF/CSV evaluasi program Kaizen.

