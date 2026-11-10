---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [master, downtime-reasons, sop, guidelines, mt05]
---

# Main Task 05 - Master Downtime Reason (Six Big Losses) dan Dokumen Guideline SOP

## 1. Login Admin Manager dan Buka Modul Downtime Reason
Buka {{base_url}}/login dan masuk menggunakan {{manager_user}} dan {{manager_password}}.
Verifikasi login berhasil dan arahkan ke rute {{base_url}}/web/master/downtime-reasons.
Verifikasi halaman menggunakan tata letak dua panel dengan sub-sidebar Area di kiri dan daftar alasan di kanan.
Pilih area "Unit 2 Garam Konsumsi" pada sub-sidebar kiri.
Verifikasi tabel memuat daftar alasan henti mesin terstandarisasi Six Big Losses.

## 2. Filter Kategori Six Big Losses dan Pencarian Alasan
Pilih opsi "L-01 Equipment Failure" pada dropdown filter kategori loss.
Verifikasi tabel hanya menampilkan alasan kerusakan mesin seperti "Film Jam / Kusut" atau "Heater Sealer Temperature Drop".
Ketik "D001" pada kolom pencarian.
Verifikasi baris alasan yang terhubung ke kode register alarm PLC-ABC D001 ditampilkan.
Kembalikan filter ke "Semua Kategori" dan kosongkan pencarian.

## 3. Tambah Alasan Downtime Baru dengan Tag Register PLC-ABC
Klik tombol "+ Tambah Alasan" di atas tabel.
Verifikasi modal formulir "Tambah Alasan Downtime" terbuka.
Pilih Kategori Loss "L-02 Setup & Adjustment".
Pilih Line "Line Packing A - VFFS Sachet 250g" dan Mesin "Mesin Packing #6".
Ketik "DT-SU-005" pada field Kode Alasan.
Ketik "D001:5" pada field Kode Register PLC-ABC.
Ketik "Pergantian Roll Film PE Tebal 60 Micron" pada field Nama Alasan Downtime.
Klik tombol "Simpan ke Master".
Verifikasi modal tertutup dan alasan baru "DT-SU-005" terdaftar pada tabel serta tersinkronisasi ke kamus interlock HMI-T7.

## 4. Navigasi ke Modul Guideline SOP dan Pratinjau Dokumen
Arahkan ke rute {{base_url}}/web/master/guidelines.
Verifikasi halaman memuat daftar pustaka dokumen SOP digital di panel kiri.
Verifikasi dokumen "SOP Pengoperasian Standar Mesin VFFS Packing #6" tercantum dengan kategori "SOP_OPERASIONAL".
Klik pada judul dokumen tersebut untuk membuka panel pratinjau pembaca PDF di panel kanan.
Verifikasi informasi versi "v2.3" dan nama pengunggah ditampilkan.

## 5. Unggah Dokumen Panduan SOP Baru
Klik tombol "+ Unggah Dokumen" di atas daftar dokumen.
Verifikasi modal "Unggah Dokumen Panduan" terbuka.
Ketik "SOP Kalibrasi Berkala Timbangan Checkweigher" pada Judul Dokumen Guideline.
Pilih Kategori "Autonomous Maintenance" dan pilih Distribusi Peran "Semua Peran (Web & HMI)".
Ketik "Revisi 1.0 - Kalibrasi mingguan sensor berat" pada Catatan Revisi.
Klik tombol simpan / terbitkan dokumen.
Verifikasi dokumen baru ditambahkan ke dalam daftar pustaka dan tersedia bagi operator di Panel HMI-T7.

