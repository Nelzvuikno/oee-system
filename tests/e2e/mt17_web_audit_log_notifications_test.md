---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [web, audit-log, notifications, rbac, immutable, mt17]
---

# Main Task 17 - Pusat Audit Log Aktivitas Terpusat dan Notifikasi Real-Time Lintas Peran

## 1. Verifikasi Lonceng Notifikasi di Topbar Web
Buka {{base_url}}/login dan masuk menggunakan {{superadmin_user}} dan {{superadmin_password}}.
Verifikasi login berhasil dan amati ikon Lonceng Notifikasi di Topbar kanan.
Verifikasi badge angka merah unread count menampilkan jumlah notifikasi penting yang belum dibaca.
Klik ikon lonceng untuk membuka dropdown notifikasi cepat.
Verifikasi notifikasi teratas memuat jenis peringatan: henti mesin lama (Fault), laporan menunggu approval, atau tiket Kaizen selesai diperbaiki.

## 2. Navigasi ke Halaman Activity & Notification Terpadu
Buka menu navigasi sidebar "Production Running > Activity & Notification" atau rute {{base_url}}/web/audit-log.
Verifikasi halaman menggunakan tata letak terpadu 2 kolom:
Kolom kiri: "Riwayat Aktivitas Sistem & Telemetri (Audit Log Feed)"
Kolom kanan: "Panel Notifikasi Penting".

## 3. Interaksi dan Penandaan Notifikasi Penting
Pada Panel Notifikasi Penting di sisi kanan, pilih notifikasi laporan shift "Laporan Shift Menunggu Validasi".
Klik tombol aksi kontekstual "Tinjau Laporan".
Verifikasi sistem menandai notifikasi tersebut sebagai sudah dibaca (read) dan badge angka unread berkurang.
Kembali ke halaman notifikasi dan klik tombol "Tandai Semua Dibaca".
Verifikasi seluruh notifikasi pada panel berubah status menjadi terbaca.

## 4. Pencarian dan Filter Kategori Audit Trail
Pada kolom Audit Log Feed di sisi kiri, klik filter kategori chip "Konfigurasi Master".
Verifikasi daftar audit log hanya menampilkan aktivitas perubahan topologi aset atau master data.
Pilih filter kategori chip "Autentikasi".
Verifikasi rekaman login sukses, login gagal, dan logout tercatat lengkap dengan stempel waktu dan IP address.
Ketik "superadmin" pada kolom pencarian teks bebas.
Verifikasi log yang dilakukan oleh user superadmin difilter secara tepat.

## 5. Inspeksi Rincian Nilai Sebelum dan Sesudah (Before -> After)
Cari baris audit log yang mencatat perubahan data (misal koreksi alasan downtime atau perubahan master SKU).
Klik pada baris aktivitas tersebut untuk membuka modal atau panel detail inspeksi audit.
Verifikasi panel menampilkan perbandingan nilai sebelum perubahan (Before) dan nilai sesudah perubahan (After).
Verifikasi data historis audit log bersifat immutable (tidak ada tombol ubah atau hapus).
Klik tombol "Unduh Log CSV / PDF" untuk mengekspor rekam jejak audit resmi.

