---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [master, topology, machine, mt02]
---

# Main Task 02 - Master Factory, Area, Line, Machine, dan Sub-Machine

## 1. Login SuperAdmin dan Buka Menu Factory & Area
Buka {{base_url}}/login dan masuk menggunakan {{superadmin_user}} dan {{superadmin_password}}.
Verifikasi login berhasil dan buka menu "Factory & Area" dari sidebar kiri.
Verifikasi URL berpindah ke {{base_url}}/web/master/topology.
Verifikasi daftar Factory menampilkan pabrik "PT. XYZ - Pabrik Garam Konsumsi Beryodium" dengan kode "PT-XYZ".
Verifikasi di bawah Factory terdapat Area "Unit 2 Garam Konsumsi" dengan kode "AREA-U2".

## 2. Pencarian dan Filter Factory & Area
Ketik "Unit 2" pada field pencarian di bagian atas.
Verifikasi baris pabrik PT. XYZ dan Area Unit 2 tetap terlihat.
Ketik "Area Tidak Ada 999" pada field pencarian.
Verifikasi seluruh kartu pabrik disembunyikan dari tampilan.
Kosongkan kembali field pencarian dan verifikasi seluruh daftar pabrik kembali muncul.

## 3. Tambah Area Baru pada Factory
Klik tombol "+ Area" pada kartu pabrik PT. XYZ.
Verifikasi dialog modal "Tambah Area: PT. XYZ - Pabrik Garam Konsumsi Beryodium" terbuka.
Ketik "Area Gudang Bahan Baku Garam Kasar" pada field Nama Area.
Ketik "AREA-RAW-01" pada field Kode Area.
Ketik "Penyimpanan garam mentah sebelum rafinasi" pada field Deskripsi.
Klik tombol "Simpan Area Baru".
Verifikasi modal tertutup dan area baru "Area Gudang Bahan Baku Garam Kasar" muncul di dalam daftar area pabrik.

## 4. Navigasi ke Line & Machine dan Verifikasi Split Layout
Klik menu "Line & Machine" pada sidebar kiri.
Verifikasi URL berpindah ke {{base_url}}/web/master/machines.
Verifikasi halaman menggunakan tata letak split panel dengan panel kiri daftar Area dan panel kanan hierarki mesin.
Klik item area "Unit 2 Garam Konsumsi" pada panel kiri.
Verifikasi panel kanan menampilkan judul area "Unit 2 Garam Konsumsi" beserta tombol "+ Tambah Line".
Verifikasi Line "Line Packing A - VFFS Sachet 250g" dan "Line Packing B - VFFS Pouch 500g" ditampilkan pada panel kanan.

## 5. Ekspansi Mesin dan Verifikasi Parameter PLC-ABC
Klik tombol panah ekspansi pada baris "Line Packing A - VFFS Sachet 250g".
Verifikasi mesin "Mesin Packing #6" dengan kode aset "MCN-U2-PK06" muncul di bawah Line Packing A.
Verifikasi metadata mesin menampilkan model "PLC-ABC", alamat IP "192.168.10.20", dan gateway "GW-100".
Klik tombol panah ekspansi pada "Mesin Packing #6" untuk melihat sub-mesin.
Verifikasi daftar sub-mesin menampilkan komponen "Vertical Heater Sealer (SS316)" dengan sensor "SEN-T01" dan register "D005".

## 6. Tambah Sub-Machine Komponen Sensor Baru
Klik tombol "+ Sub" pada baris Mesin Packing #6.
Verifikasi modal "Tambah Sub-Machine: Mesin Packing #6" terbuka.
Ketik "Sensor Getaran Bearing Drive" pada Nama Sub-Machine.
Ketik "SEN-V02" pada Kode Sensor.
Ketik "D007" pada Register PLC-ABC.
Ketik "Ambang getaran kritis > 4.8 mm/s" pada Setpoint / Ambang Batas.
Klik tombol "Simpan Sub-Machine".
Verifikasi modal tertutup dan sub-mesin "Sensor Getaran Bearing Drive" dengan sensor "SEN-V02" dan register "D007" tercantum pada daftar komponen Mesin Packing #6.

## 7. Verifikasi Dialog Konfirmasi Nonaktifkan Aset
Klik ikon tempat sampah pada baris sub-mesin yang baru dibuat.
Verifikasi dialog konfirmasi "Nonaktifkan Sub-Machine" muncul dengan pesan bahwa data historis produksi akan tetap terjaga (soft archive).
Klik tombol "Batal" dan verifikasi dialog tertutup tanpa menghapus sub-mesin.
Klik kembali ikon tempat sampah, lalu klik tombol "Ya, Nonaktifkan".
Verifikasi status aset diperbarui tanpa terjadi hard delete pada database.

