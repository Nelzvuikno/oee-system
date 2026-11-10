---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [master, users, rbac, mt03]
---

# Main Task 03 - Master User Management dan Otorisasi Peran

## 1. Login SuperAdmin dan Buka Modul User Management
Buka {{base_url}}/login dan masuk menggunakan {{superadmin_user}} dan {{superadmin_password}}.
Verifikasi login berhasil dan klik menu "User Management" pada sidebar kiri.
Verifikasi URL berpindah ke {{base_url}}/web/master/users dan breadcrumb menampilkan "User Management".
Verifikasi tabel memuat daftar pengguna awal termasuk "Rizal Mahendra" sebagai SuperAdmin dan "Hendra Wijaya" sebagai Admin / Manager.
Verifikasi badge peran ditampilkan dengan warna semantik yang sesuai untuk setiap peran.

## 2. Pencarian dan Filter Peran Pengguna
Ketik "Hendra" pada kolom pencarian pengguna.
Verifikasi tabel hanya menampilkan baris pengguna "Hendra Wijaya" (EMP-0102).
Kosongkan kolom pencarian.
Pilih opsi "Supervisor (SPV)" pada dropdown filter peran.
Verifikasi tabel hanya menampilkan pengguna dengan peran Supervisor seperti "Dian Pratama".
Kembalikan filter peran ke "Semua Peran" dan verifikasi seluruh daftar pengguna kembali muncul.

## 3. Pemeriksaan Drawer Rincian Pengguna dan Izin Akses
Klik pada baris pengguna "Rizal Mahendra".
Verifikasi panel geser drawer "Detail User" terbuka dari sisi kanan layar.
Verifikasi drawer menampilkan rincian NIK "EMP-0001", Username "superadmin", Departemen "IT & OT Automation", dan Jabatan "OT Systems Administrator".
Verifikasi bagian daftar Izin Akses menampilkan hak akses seperti "Dapat Access Web", "Dapat Access Hmi", dan "Dapat Manage Master System".
Tekan tombol keyboard "Escape" dan verifikasi drawer tertutup kembali.

## 4. Pendaftaran Pengguna Baru dan Penerbitan Kredensial Sementara
Klik tombol "+ Tambah Akun" di kanan atas halaman.
Verifikasi modal formulir "Tambah Akun Pengguna" terbuka.
Ketik "Agus Setiawan" pada field Nama Lengkap.
Ketik "EMP-0301" pada field NIK / ID Karyawan.
Ketik "agus.setiawan" pada field Username.
Ketik "agus.setiawan@ptxyz.co.id" pada field Email Korporat.
Ketik "Packaging Line A" pada field Departemen.
Ketik "Operator Pengemasan" pada field Jabatan.
Pilih "Operator (HMI-T7 Only)" pada dropdown Peran RBAC.
Pilih "Production" pada dropdown Tipe Pengguna.
Ketik "TempPass123" pada field Kata Sandi Sementara.
Klik tombol "Simpan Akun Pengguna".
Verifikasi modal konfirmasi "Akun Berhasil Dibuat" muncul dan menampilkan kredensial sementara sekali pakai.
Klik tombol "Saya Sudah Mencatat" untuk menutup dialog konfirmasi.
Verifikasi akun baru "Agus Setiawan" (EMP-0301) kini tercantum di tabel daftar pengguna.

## 5. Atur Ulang Kata Sandi dan PIN HMI Pengguna
Cari akun "Agus Setiawan" di dalam tabel lalu klik tombol aksi "Detail".
Pada panel drawer yang terbuka, klik tombol "Atur Ulang Kata Sandi / PIN".
Verifikasi modal konfirmasi "Atur Ulang Kata Sandi / PIN Operator" muncul.
Centang opsi "Reset PIN HMI-T7 (6 digit)".
Klik tombol "Terbitkan Kredensial Sementara".
Verifikasi dialog menampilkan PIN HMI-T7 sementara baru 6 digit dengan opsi salin.
Tutup dialog konfirmasi kredensial sementara.

## 6. Penonaktifan dan Pengaktifan Kembali Akun (Soft Deactivate)
Cari akun "Agus Setiawan" pada tabel lalu klik ikon status nonaktifkan.
Verifikasi modal konfirmasi "Nonaktifkan Akun" muncul dengan penjelasan bahwa seluruh sesi aktif akan diputus dan data historis tetap terjaga.
Klik tombol "Ya, Nonaktifkan".
Verifikasi baris akun "Agus Setiawan" kini menampilkan status "Nonaktif".
Klik kembali ikon aktifkan pada baris akun yang sama, lalu klik "Ya, Aktifkan" pada modal konfirmasi.
Verifikasi status akun "Agus Setiawan" kembali menjadi "Aktif".

