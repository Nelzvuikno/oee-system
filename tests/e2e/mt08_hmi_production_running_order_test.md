---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400/hmi
tags: [hmi, production-running, order, reject, scrap, mt08]
---

# Main Task 08 - Panel HMI-T7 Konsol Production Running, Order Shift, dan Counter Reject/Scrap K3

## 1. Login Operator dan Buka Layar Production Running (Home)
Buka {{hmi_url}} dan masuk menggunakan ID "{{operator_user}}" serta PIN "{{operator_pin}}".
Verifikasi mendarat di tab utama "Home" (Production Running).
Verifikasi kartu Run Time Production Plan dan batang Event Timeline shift ditampilkan di bagian atas layar.
Verifikasi 8 kartu metrik telemetri live ditampilkan: Target Shift, Achievement %, Finish Good, Berat Bersih, Total Diproses, Speed D002, Defect D004/D007, dan Scrap K3 D008.

## 2. Mulai Order Produksi Shift Baru
Sentuh tombol "+ Tambah Order / Waktu" (+ add time) di header kartu production plan.
Verifikasi modal "Mulai Order Produksi Baru" terbuka.
Ketik "PO-2026-1101-PK06-S1" pada field Nomor Production Order.
Pilih produk garam "SKU-GRM-250 (Garam Konsumsi 250g)" pada dropdown SKU.
Verifikasi Ideal Cycle Time otomatis terisi 0.024 menit/pcs dengan kecepatan target 41.67 pcs/menit.
Ketik "10000" pada field Target Output Shift.
Sentuh tombol "Aktifkan Order ke PLC-ABC".
Verifikasi modal tertutup dan kartu Target Shift menampilkan target 10.000 pcs dengan estimasi waktu selesai.

## 3. Penyesuaian Target dan Opsi Extra Time
Sentuh ikon pensil pada kartu Target Shift.
Ubah target menjadi "12000" pcs dan simpan.
Verifikasi kartu Target Shift diperbarui menjadi 12.000 pcs.
Sentuh tombol "+ Tambah Order / Waktu" dan pilih opsi penambahan "Extra Time (+30 menit)".
Verifikasi jadwal jam selesai order pada Event Timeline bertambah 30 menit.

## 4. Input Cepat Produk Cacat (Process Defect L-05)
Sentuh tombol besar "+" pada kartu Process Defect / Rework.
Verifikasi modal input cepat cacat kualitas terbuka.
Sentuh tombol penambahan cepat "+10" dan "+5" sehingga total bertambah 15 pcs.
Pilih penyebab cacat "Bocor Sealing / Panas Kurang".
Verifikasi konversi berat otomatis menghitung 15 pcs x 0.25 kg = 3.75 kg garam rework.
Sentuh tombol "Simpan ke Register D007 & Server".
Verifikasi modal tertutup dan nilai kartu Defect bertambah 15 pcs.

## 5. Input Garam Tumpah / Scrap K3 (L-06)
Sentuh tombol besar "+" pada kartu Scrap Garam K3.
Verifikasi modal input garam non-pangan K3 terbuka.
Ketik "4.5" kg pada field berat garam tumpah di lantai area conveyor.
Pilih penyebab "Garam Tumpah saat Kalibrasi Hopper".
Sentuh tombol "Simpan ke Register D008 & Server".
Verifikasi kartu Scrap K3 menampilkan akumulasi 4.5 kg garam scrap.

## 6. Selesaikan / Hentikan Order Produksi
Buka menu rincian order aktif dan sentuh tombol "Stop Order".
Verifikasi dialog konfirmasi penghentian order muncul.
Sentuh tombol konfirmasi penghentian.
Verifikasi order berstatus selesai dan mesin kembali ke kondisi Standby siap untuk batch berikutnya.

