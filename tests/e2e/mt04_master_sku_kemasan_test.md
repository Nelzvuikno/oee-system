---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [master, sku, packaging, cycle-time, mt04]
---

# Main Task 04 - Master SKU Garam, Hierarki Kemasan, dan Ideal Cycle Time

## 1. Login Admin Manager dan Buka Modul SKU Master
Buka {{base_url}}/login dan masuk menggunakan {{manager_user}} dan {{manager_password}}.
Verifikasi login berhasil dan arahkan ke rute {{base_url}}/web/master/skus.
Verifikasi halaman memuat judul "SKU & Kemasan" dengan daftar produk garam yang terdaftar.
Verifikasi baris produk garam 250g "SKU-GRM-250" tercantum dengan Ideal Cycle Time 0.024 menit/pcs dan kecepatan 41.67 pcs/menit.

## 2. Pencarian dan Filter Master SKU
Ketik "500" pada kolom pencarian SKU.
Verifikasi tabel hanya memuat produk garam kemasan 500g "SKU-GRM-500".
Kosongkan kembali kolom pencarian dan verifikasi seluruh SKU kembali tampil.

## 3. Tambah Master SKU Baru Multi-Packaging
Klik tombol "+ Tambah SKU" di kanan atas halaman.
Verifikasi modal formulir pendaftaran SKU baru terbuka.
Ketik "SKU-GRM-100" pada field Kode SKU.
Ketik "Garam Halus Beryodium Sachet 100g" pada field Nama Produk.
Pilih jenis kemasan utama "Sachet PE Primer" dengan berat standar 100 gram, batas minimum 98 gram, dan batas maksimum 103 gram.
Klik tombol "+ Add packaging" untuk menambahkan tier kemasan ke-2 "Inner Pack Lusin" dengan rasio konversi 12 sachet per inner pack.
Ketik "0.020" pada field Ideal Cycle Time (menit/pcs) dan verifikasi kalkulasi kecepatan ideal otomatis terisi 50.00 pcs/menit.
Ketik "1500" pada field Harga Jual Satuan dan "900" pada field COGS.
Pilih Area "Unit 2 Garam Konsumsi" dan pilih Line "Line Packing A - VFFS Sachet 250g".
Klik tombol "Simpan Master SKU".
Verifikasi modal tertutup dan produk "SKU-GRM-100" muncul di dalam daftar tabel SKU aktif.

## 4. Pemeriksaan Detail SKU dan Konversi Kemasan
Klik pada baris produk "SKU-GRM-100" untuk membuka panel atau modal detail SKU.
Verifikasi rincian menampilkan struktur kemasan 2 tier beserta rasio konversinya.
Verifikasi batas toleransi berat QC 98 - 103 gram tercantum dengan benar.
Tutup tampilan detail SKU.

## 5. Nonaktifkan SKU dan Verifikasi Proteksi Historis
Klik tombol opsi nonaktifkan pada baris SKU yang baru dibuat.
Verifikasi konfirmasi penonaktifan muncul dengan penjelasan bahwa data historis tidak akan terhapus.
Klik tombol konfirmasi nonaktifkan.
Verifikasi status SKU berubah menjadi Nonaktif dan tidak muncul pada pilihan order baru.

