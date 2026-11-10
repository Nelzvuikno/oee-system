---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400
tags: [web, monitoring, production-active, line-detail, spv, mt12]
---

# Main Task 12 - Web Monitoring Production Active Multi-Lini dan Koreksi Downtime Supervisor

## 1. Login Supervisor dan Buka Halaman Production Active
Buka {{base_url}}/login dan masuk menggunakan {{spv_user}} dan {{spv_password}}.
Verifikasi login berhasil dan mendarat di {{base_url}}/web/dashboard/oee-performance.
Buka menu navigasi sidebar "Production Running > Production Active".
Verifikasi URL berpindah ke {{base_url}}/web/production-active.
Verifikasi halaman memuat judul "Production Active" dan filter Area, Line, serta Shift Aktif.
Verifikasi legenda warna pita waktu (Hijau: Run Time, Merah: Downtime, Kuning: Small Stop, Biru: Planned).

## 2. Pemantauan Kartu Status Mesin Multi-Lini Real-Time
Verifikasi kartu status untuk "Mesin Packing #6" (MCN-U2-PK06) ditampilkan di layar.
Verifikasi kartu menampilkan status operasi PLC-ABC (RUN / STOP / FAULT / STANDBY).
Verifikasi indikator kecepatan aktual D002, volume Finish Good, dan persentase pencapaian target diperbarui secara langsung.
Verifikasi jika terjadi alarm henti mesin, kartu menampilkan pita peringatan merah dan tombol "Isi Alasan Downtime".

## 3. Drill-down ke Halaman Line Detail Mesin Packing #6
Klik tombol "Buka Line Detail" pada kartu Mesin Packing #6.
Verifikasi URL berpindah ke halaman Line Detail mesin tersebut.
Verifikasi metrik keandalan mesin ditampilkan: OEE %, Availability %, Performance %, Quality %, MTTR, dan MTBF.
Verifikasi grafik Waterfall Analysis menampilkan dekomposisi waktu dari Calendar Time hingga Fully Productive Time.
Verifikasi tabel riwayat kejadian Downtime Events ditampilkan di bagian bawah halaman.

## 4. Koreksi Alasan Downtime oleh Supervisor
Cari baris kejadian downtime yang belum terisi atau berstatus Unplanned pada tabel kejadian.
Klik tombol aksi "Edit" pada baris downtime tersebut.
Verifikasi drawer samping "Edit Downtime Reason" terbuka.
Verifikasi field waktu mulai, selesai, dan durasi berstatus read-only (tidak dapat dimanipulasi).
Pilih Kategori Six Big Losses "L-01 Equipment Failure".
Pilih Alasan Downtime terstandarisasi dari daftar master.
Pilih Sub-Machine "Vertical Heater Sealer".
Ketik "Koreksi Supervisor: Penggantian elemen pemanas sealer dan kalibrasi sensor temperatur" pada Detail Reason & Tindakan.
Klik tombol "Simpan Klasifikasi".
Verifikasi drawer tertutup, nilai metrik OEE dan Pareto otomatis dihitung ulang, dan catatan perubahan tersimpan ke Audit Log.

