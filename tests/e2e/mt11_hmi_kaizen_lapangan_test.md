---
mode: testing
max_steps: 40
url: http://127.0.0.1:3400/hmi
tags: [hmi, kaizen, tpm, maintenance, verification, mt11]
---

# Main Task 11 - Panel HMI-T7 Pelaporan Kaizen Lapangan, Perbaikan Teknisi, dan Verifikasi Operator

## 1. Navigasi ke Tab Kaizen di Panel HMI-T7
Buka {{hmi_url}} dengan login operator produksi aktif.
Sentuh tab "Kaizen" pada Bottom Navigation HMI.
Verifikasi daftar tiket perbaikan Kaizen khusus untuk Mesin Packing #6 ditampilkan dengan sakelar filter "Open" dan "Close".
Verifikasi kartu tiket menampilkan ID Kaizen, Judul Masalah, Sub-Mesin, Kategori (Maintenance / Production), dan status verifikasi.

## 2. Pembuatan Tiket Maintenance Kaizen Baru oleh Operator
Sentuh tombol apung bulat "+" di sudut kanan bawah.
Pilih jenis tiket "Maintenance" pada dialog pemilihan tipe.
Verifikasi formulir "Buat Tiket Maintenance Kaizen" terbuka dengan field tanggal, Area, Line, dan Mesin terisi otomatis.
Pilih Sub-Mesin "Rotary Cutter & Main Drive".
Ketik "Pisau Rotary Cutter Berkarat dan Tumpul Akibat Kerak Garam" pada Judul Masalah.
Ketik "Kemasan garam sering tidak putus sempurna dan robek di bagian sealer ujung" pada Deskripsi Masalah.
Pilih Kategori "Kerusakan Komponen / Part Wear" dan pilih Kriteria "Kualitas & Downtime".
Pilih PIC Teknisi Maintenance "{{technician_user}}".
Sentuh tombol "Simpan Tiket".
Verifikasi tiket baru diterbitkan berstatus "OPEN | NOT OK" dan tercantum pada daftar Open Kaizen.

## 3. Input Penyelesaian Perbaikan oleh Teknisi Maintenance
Ganti sesi pengguna atau masuk sebagai Teknisi "{{technician_user}}" dengan PIN "{{technician_pin}}".
Buka tab Kaizen dan pilih tiket pisau Rotary Cutter yang baru dibuat.
Sentuh tombol "Input Perbaikan (Step 2)".
Verifikasi formulir "Improvement Information" terbuka.
Ketik "Kristal NaCl menumpuk di sela bantalan pisau rotary karena seal pelindung aus" pada Analisis Akar Masalah.
Ketik "Penggantian mata pisau stainless SS316 baru dan pelumasan bearing dengan food grade grease" pada Tindakan Perbaikan.
Pilih Jenis Penyelesaian "Penggantian Part Baru".
Sentuh tombol "Selesai Perbaikan".
Verifikasi status tiket berubah menjadi "CLOSED | NOT VERIFIED" dan dialihkan untuk verifikasi operator produksi.

## 4. Verifikasi Lapangan dan Penerimaan Hasil (Verifikasi OK)
Masuk kembali sebagai Operator Produksi "{{operator_user}}".
Buka tab Kaizen dan sentuh tiket pisau rotary yang telah diperbaiki.
Verifikasi layar menampilkan detail tindakan perbaikan teknisi beserta tombol "Verifikasi OK (CLOSED)" dan "Minta Revisi (NOT OK)".
Setelah mesin beroperasi stabil dan potongan kemasan garam rapi, sentuh tombol "Verifikasi OK (CLOSED)".
Verifikasi status tiket diperbarui menjadi "CLOSED | OK" dan berpindah ke daftar tab Close.

## 5. Alur Permintaan Revisi (Minta Revisi NOT OK)
Buka tiket Kaizen lain berstatus CLOSED | NOT VERIFIED.
Sentuh tombol "Minta Revisi (NOT OK)".
Ketik alasan penolakan "Hasil pemotongan masih terdapat gerigi kasar di sisi kiri sachet".
Sentuh konfirmasi kirim revisi.
Verifikasi status tiket berubah menjadi "REVISE | NOT OK" dan kembali masuk ke daftar kerja Open teknisi.

