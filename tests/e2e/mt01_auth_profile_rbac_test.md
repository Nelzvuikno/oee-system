---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [auth, rbac, profile, mt01, smoke]
---

# Main Task 01 - Web Auth, Profil Pengguna, dan Navigasi RBAC

## 1. Verifikasi Akses Publik dan Header Lingkungan Login
Buka {{base_url}}/web/dashboard/business-impact tanpa token sesi.
Verifikasi halaman dialihkan secara otomatis ke halaman login {{base_url}}/login.
Verifikasi teks "PRODUCTIONCORE WEB CONSOLE" dan "PT. XYZ - Unit 2 Pengemasan Garam" tampil pada header strip.
Verifikasi indikator gateway menampilkan status "Gateway GW-100".
Verifikasi form login menampilkan emblem "PC" dan judul "Masuk ke ProductionCore".

## 2. Percobaan Login Gagal dengan Kredensial Salah
Ketik "{{superadmin_user}}" pada field input identifier.
Ketik "{{invalid_password}}" pada field input password.
Klik tombol "Masuk ke Konsol OEE".
Verifikasi banner error merah muncul dengan pesan peringatan kata sandi tidak sesuai.
Verifikasi URL tetap berada di {{base_url}}/login.

## 3. Percobaan Login Operator Ditolak dari Web Console
Ketik "{{operator_user}}" pada field input identifier.
Ketik "123456" pada field input password.
Klik tombol "Masuk ke Konsol OEE".
Verifikasi banner error merah menampilkan pesan penolakan bahwa akun hanya dapat mengakses Konsol HMI.
Verifikasi sistem tidak memberikan akses ke dalam App Shell.

## 4. Alur Pemulihan Kata Sandi Mandiri
Klik tautan "Lupa kata sandi?".
Verifikasi form berpindah ke halaman Pemulihan Kata Sandi dengan judul "Pemulihan Kata Sandi".
Ketik "{{superadmin_user}}" pada input Email Korporat atau NIK.
Klik tombol "Kirim Tautan Pemulihan".
Verifikasi konfirmasi berhasil muncul dengan informasi token pemulihan lingkungan LAN.
Klik tautan "Kembali ke Halaman Login".
Verifikasi tampilan kembali ke form login utama.

## 5. Login Sukses SuperAdmin dan Verifikasi App Shell
Ketik "{{superadmin_user}}" pada field input identifier.
Ketik "{{superadmin_password}}" pada field input password.
Klik tombol "Masuk ke Konsol OEE".
Verifikasi sistem berhasil login dan mendarat di {{base_url}}/web/dashboard/business-impact.
Verifikasi topbar menampilkan nama "Rizal Mahendra".
Verifikasi sidebar menampilkan grup menu Konfigurasi.

## 6. Verifikasi Halaman Profil dan Tab Navigasi
Buka {{base_url}}/web/profile.
Verifikasi halaman Profil Pengguna menampilkan NIK "EMP-0001" dan Username "superadmin".
Klik tab "Ubah Kata Sandi" dan verifikasi form pergantian kata sandi ditampilkan.
Klik tab "Panduan Penggunaan" dan verifikasi daftar dokumen SOP dimuat.

## 7. Verifikasi Dialog Konfirmasi Keluar Sistem
Klik menu pengguna "Rizal Mahendra" pada topbar.
Klik opsi "Keluar Sesi".
Verifikasi dialog modal "Konfirmasi Keluar Sistem" muncul.
Klik tombol "Batal" dan verifikasi dialog modal tertutup.
Klik kembali menu pengguna "Rizal Mahendra" pada topbar.
Klik opsi "Keluar Sesi".
Klik tombol "Ya, Keluar Sekarang".
Verifikasi sistem kembali ke halaman login {{base_url}}/login.

## 8. Verifikasi Login Shift Leader dan URL Guard 403 Forbidden
Ketik "{{shift_leader_user}}" pada field input identifier.
Ketik "{{shift_leader_password}}" pada field input password.
Klik tombol "Masuk ke Konsol OEE".
Verifikasi sistem mendarat di {{base_url}}/web/production-active.
Buka rute terlarang {{base_url}}/web/master/users.
Verifikasi halaman menampilkan pesan "403 Akses Ditolak".
Klik tombol "Kembali ke Halaman Utama".
Verifikasi sistem kembali ke {{base_url}}/web/production-active.
