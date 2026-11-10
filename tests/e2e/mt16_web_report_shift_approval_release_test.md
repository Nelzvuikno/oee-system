---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [web, report, shift-report, approval, release, mt16]
---

# Main Task 16 - Laporan Otomatis Report by Shift, Alur Persetujuan Berjenjang, dan Report by Product

## 1. Login Supervisor dan Buka Halaman Report by Shift
Buka {{base_url}}/login dan masuk menggunakan {{spv_user}} dan {{spv_password}}.
Verifikasi login berhasil dan buka menu "Report > Report by Shift".
Verifikasi URL berpindah ke {{base_url}}/web/report/shift.
Verifikasi halaman memuat tata letak dua panel dengan daftar Line di kiri dan daftar shift di kanan.
Pilih mesin "Mesin Packing #6" pada panel Line kiri.
Verifikasi daftar laporan shift ditampilkan dengan filter Tahun, Bulan, Shift, dan status laporan.

## 2. Pemeriksaan Rincian Report by Shift Status Needs Approval
Cari baris laporan shift berstatus "NEEDS APPROVAL" pada daftar.
Klik ikon mata (Detail Report) pada baris laporan tersebut.
Verifikasi halaman Detail Report by Shift terbuka.
Verifikasi skor KPI OEE, Availability, Performance, dan Quality ditampilkan.
Verifikasi pita Event Timeline shift lengkap dengan durasi Run Time, Planned Downtime, dan Unplanned Downtime.
Buka accordion rincian produk No.PRO dan verifikasi kuantitas Finish Good (pcs, karton, kg), Reject, dan Scrap K3.

## 3. Gerbang Validasi Pre-Approval Gate dan Koreksi Downtime
Periksa tabel Downtime di bagian bawah laporan.
Jika terdapat kejadian henti mesin Unplanned yang belum terisi alasannya, klik tombol "Approve" di kanan atas.
Verifikasi sistem memblokir persetujuan dan memunculkan peringatan Pre-Approval Gate bahwa seluruh alasan downtime wajib diisi terlebih dahulu.
Klik tombol aksi edit pada baris downtime yang belum terklasifikasi, isi alasan downtime yang sesuai, dan simpan.

## 4. Persetujuan Laporan Shift oleh Supervisor (Approve SPV)
Setelah seluruh kejadian downtime terklasifikasi valid, klik tombol "Approve" di kanan atas.
Verifikasi status laporan shift diperbarui menjadi "APPROVED".
Verifikasi stempel waktu persetujuan dan nama approved_by (Supervisor) tercatat pada metadata laporan.
Verifikasi tombol di kanan atas berubah menjadi "Release" bagi pejabat berwenang.

## 5. Pengesahan Akhir Laporan oleh Plant Manager (Release)
Ganti sesi pengguna atau masuk sebagai Plant Manager {{manager_user}} dengan password {{manager_password}}.
Buka laporan shift berstatus "APPROVED" tadi.
Klik tombol "Release" di kanan atas halaman.
Verifikasi modal konfirmasi muncul dengan peringatan bahwa seluruh data produksi dan downtime pada shift ini akan dikunci permanen.
Klik tombol konfirmasi release laporan.
Verifikasi status laporan berubah menjadi "RELEASED".
Verifikasi seluruh tombol koreksi downtime dan data produksi menjadi terkunci permanen [Locked].
Klik tombol "Download PDF / CSV" untuk mengekspor laporan resmi shift berstempel rilis.

## 6. Laporan Berdasarkan Produk (Report by Product)
Arahkan ke rute {{base_url}}/web/report/product.
Pilih produk garam "SKU-GRM-250 (Garam Konsumsi 250g)".
Verifikasi halaman Detail Report by Product menampilkan akumulasi produksi, yield kualitas, dan rincian per batch order.
Verifikasi status penguncian rilis otomatis diwarisi dari shift report yang menaunginya.

