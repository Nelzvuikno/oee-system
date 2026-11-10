---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400/hmi
tags: [hmi, auth, pin, numpad, logout, mt07]
---

# Main Task 07 - Panel HMI-T7 Autentikasi Operator Numpad PIN dan Logout Shift

## 1. Verifikasi Layar Login HMI-T7 Ergonomi Sentuh Industri
Buka {{hmi_url}} pada peramban dengan orientasi lanskap panel industri 1280x800.
Verifikasi halaman memuat judul "LOGIN OPERATOR PANEL HMI-T7".
Verifikasi kartu Numpad numerik sentuh cepat berukuran besar (tombol 1-9, 0, CLR, OK) tampil jelas di layar.
Verifikasi status gateway GW-100 dan status PLC-ABC ditampilkan pada header HMI.

## 2. Percobaan Login Gagal PIN Salah pada Numpad HMI
Sentuh field input ID Operator dan ketik "{{operator_user}}".
Sentuh tombol angka Numpad: 0, 0, 0, 0, 0, 0 (PIN salah).
Sentuh tombol "OK" pada kartu Numpad atau tombol "Masuk & Aktifkan Sesi Shift".
Verifikasi banner error merah muncul dengan pesan peringatan PIN tidak valid.
Verifikasi input PIN direset dan sesi shift belum aktif.

## 3. Alur Permintaan Bantuan Lupa PIN ke Supervisor
Sentuh tautan "Lupa PIN / Kata Sandi?".
Verifikasi layar pemulihan PIN terbuka dengan judul "Pemulihan PIN HMI".
Ketik "{{operator_user}}" pada field ID Operator / NIK Terdaftar.
Sentuh tombol "Kirim Permintaan Reset ke SPV".
Verifikasi notifikasi tiket pemulihan berhasil diterbitkan untuk diselesaikan oleh Supervisor/SuperAdmin di Web Console.
Sentuh tombol "Kembali ke Login".
Verifikasi layar kembali ke form login operator.

## 4. Login Sukses Operator Menggunakan Numpad PIN
Sentuh field ID Operator dan ketik "{{operator_user}}".
Sentuh tombol angka Numpad sesuai PIN operator: 1, 2, 3, 4, 5, 6.
Sentuh tombol "Masuk & Aktifkan Sesi Shift".
Verifikasi login berhasil dan sistem memuat App Shell HMI-T7.
Verifikasi Topbar HMI menampilkan nama operator, shift aktif, status mesin RUN/STOP, dan tombol darurat Mute Buzzer.
Verifikasi Bottom Navigation 5 tab (Home, Log Activity, Kaizen, Profile, Logout) tampil di bagian bawah.

## 5. Pemeriksaan Tab Profile dan Ubah PIN Mandiri
Sentuh tab "Profile" pada navigasi bawah HMI.
Verifikasi rincian profil operator berstatus read-only (NIK, Nama, Departemen).
Sentuh tombol "Ubah PIN / Kata Sandi".
Verifikasi modal formulir pembaruan PIN terbuka dengan field PIN lama dan PIN baru 6 digit.
Tutup modal ubah PIN.

## 6. Prosedur Logout Shift dan Validasi Checklist Penutupan
Sentuh tab atau tombol "Keluar Shift / Logout HMI-T7".
Verifikasi kartu Checklist Penutupan Sesi Shift dan modal "Konfirmasi Logout HMI-T7" ditampilkan.
Sentuh tombol "Batal" dan verifikasi sesi tetap aktif di layar profil.
Sentuh kembali tombol logout lalu sentuh tombol konfirmasi "Ya, Keluar Shift".
Verifikasi sesi shift ditutup dan layar HMI kembali ke halaman Login Operator, sementara akuisisi PLC di latar belakang tetap berjalan.

