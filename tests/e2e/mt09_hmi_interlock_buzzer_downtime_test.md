---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400/hmi
tags: [hmi, downtime, interlock, buzzer, small-stop, mt09]
---

# Main Task 09 - Panel HMI-T7 Interlock Alarm Buzzer Downtime dan Klasifikasi Penyebab Henti

## 1. Pemicu Interlock Pop-up Layar Penuh Auto-Downtime
Buka {{hmi_url}} dalam kondisi operator {{operator_user}} telah login.
Kirim sinyal telemetri darurat D000=3 (FAULT), D001=4 (Suhu Heater Sealer Overheat), dan D011=1 (Buzzer ON).
Verifikasi dalam waktu kurang dari 1 detik layar HMI tertutup oleh Full-Screen Interlock Pop-up merah bertuliskan "[STOP] DOWNTIME".
Verifikasi garis diagonal bahaya merah tampil di tepi atas dan bawah layar.
Verifikasi timer durasi henti mesin berjalan bertambah setiap detik.
Verifikasi tombol darurat besar "Matikan Buzzer & Isi Alasan Downtime" ditampilkan.

## 2. Acknowledge Matikan Buzzer dan Klasifikasi Alasan Henti
Sentuh tombol besar "Matikan Buzzer & Isi Alasan Downtime".
Verifikasi perintah mute dikirim ke register PLC D011=0 (buzzer mati).
Verifikasi modal "Klasifikasi Alasan Downtime" langsung terbuka di atas layar.
Pilih Kategori Loss "L-01 Equipment Failure".
Pilih Alasan Downtime "Heater Sealer Temperature Overheat / Elemen Rusak".
Ketik "Pembersihan kerak garam pada rahang sealer dan reset termokopel" pada field Tindakan Perbaikan.
Sentuh tombol "Simpan Alasan Downtime".
Verifikasi modal tertutup dan status henti mesin tercatat ke histori downtime.

## 3. Deteksi Small Stop Pop-up Kuning Tanpa Sirine Buzzer
Kirim sinyal telemetri jeda singkat tanpa output D000=1, D002=0, D009=1 (Minor Stop selama lebih dari 120 detik).
Verifikasi layar menampilkan Pop-up kuning "[WARN] SMALL STOP" tanpa sirine buzzer BUZ-01.
Verifikasi terdapat hitung mundur eskalasi otomatis menuju batas 5 menit.
Sentuh tombol "Selesaikan Small Stop" setelah produk kembali berjalan.
Verifikasi pop-up tertutup dan kejadian tercatat sebagai pilar L-03 Idle & Minor Stoppage.

## 4. Antrean Downtime Unreason Queue
Simulasikan henti mesin baru dan tutup modal klasifikasi tanpa mengisi alasan.
Verifikasi indikator angka badge merah "1" muncul pada ikon tab Home dan kartu Downtime Unreason Queue di kiri bawah.
Sentuh item henti mesin pada antrean Unreason Queue tersebut.
Verifikasi modal klasifikasi alasan kembali terbuka untuk diselesaikan sebelum sesi shift berakhir.

