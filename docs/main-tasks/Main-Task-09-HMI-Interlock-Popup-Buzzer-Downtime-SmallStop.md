# Main Task 09: Panel HMI-T7 - Interlock Pop-up Alarm Buzzer Downtime/Small Stop dan Klasifikasi Penyebab Henti Mesin

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP HMI] 05`, `[LINGKUP HMI] 04` kartu tengah Klasifikasi Downtime, `[LINGKUP HMI] 03` kartu Downtime Unreason Queue)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.3.4` Gambar 75 & Gambar 78, `19.3.5` Gambar 80-81, & Tabel 15 baris 2741-2794), [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md), & [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md)

---

## Expected Result
Saat mesin pengemasan mengalami henti mendadak (*Auto-Downtime* dengan alarm fisik `BUZ-01 = ON`) maupun henti singkat berulang (*Small Stop / Idle* `> 2 menit`), konsol layar sentuh `Panel HMI-T7` secara otomatis menampilkan **interupsi *pop-up* layar penuh berpola garis bahaya (*hazard stripes*) kontras tinggi** dalam waktu `< 1 detik` sehingga operator di lantai pabrik garam yang bising dapat segera merespons, mematikan sirine `BUZ-01`, dan mengklasifikasikan penyebab henti mesin ke dalam kamus *Six Big Losses* (`Planned Downtime`, `L-01 Equipment Failure`, `L-02 Setup & Adjustment`, atau `L-03 Idle & Minor Stoppages`). Seluruh kejadian yang belum sempat diisi alasan tertampung rapi pada `Downtime Unreason Queue` dengan kategori *default* `Unplanned Downtime` agar tidak ada satu detik pun kehilangan waktu operasi yang luput dari perhitungan *Availability* dan *Performance* OEE.

## Prasyarat
- Perangkat `Panel HMI-T7` aktif dan terhubung ke jaringan mesin (`PLC-ABC` & `GW-100`), serta operator memiliki akun login aktif sesuai **Main Task 07** (interupsi *pop-up* visual tetap muncul di layar meskipun panel sedang pada layar Login, namun eksekusi penyimpanan alasan mewajibkan identifikasi operator).
- Kamus `Master Downtime Reason` beserta pemetaan pilar *Six Big Losses* dan `Tag PLC` (`D001` / `D009`) untuk mesin tersebut telah dikonfigurasi pada **Main Task 05**.
- *Rule Engine* deteksi *Minor Stop* dan *Auto-Downtime* beserta kontrol relay `BUZ-01` (`D011`) telah aktif sesuai **Main Task 06**.

## User Journey
- Mesin Packing #6 berhenti mendadak akibat gangguan elemen pemanas sealer (`D000 = 3 [FAULT]`, `D001 = 4`, `D005 = 118.4 °C`) atau tidak menghasilkan output selama `>= 5 menit` (`D010 = 1`), sehingga `PLC-ABC` menyalakan buzzer `BUZ-01` (`D011 = 1`).
- Dalam waktu `< 1 detik`, layar `Panel HMI-T7` tertutup oleh *Full-Screen Interlock Pop-up* merah **`[STOP] DOWNTIME #<nomor>`** (`[LINGKUP HMI] 05` / `Gambar 80`) yang menampilkan waktu mulai, penghitung durasi berjalan, dan ringkasan telemetri pemicu dari `PLC-ABC`.
- Operator menghampiri panel dan menyentuh tombol besar `Matikan Buzzer & Isi Alasan Downtime`, sehingga sistem mengirimkan perintah *mute* `BUZ-01` (`D011 = 0`) ke `PLC-ABC` dan langsung membuka modal `Klasifikasi Alasan Downtime` (`Gambar 78`).
- Apabila mesin hanya mengalami jeda singkat tanpa output selama `> 120 detik` (`2 menit`) s.d. `< 5 menit` (`D000 = 1`, `D002 = 0`, `D009 = 1`), layar `Panel HMI-T7` menampilkan *Pop-up* kuning **`[WARN] SMALL STOP #<nomor>`** (`Gambar 81`) tanpa sirine `BUZ-01`, lengkap dengan hitung mundur menuju batas eskalasi `5 menit`.
- Pada modal `Klasifikasi Alasan Downtime` (`[LINGKUP HMI] 04` / `Gambar 78`), operator memeriksa kategori *loss* (atau saran alasan otomatis dari `Tag PLC D001`), menyentuh salah satu penyebab henti mesin, memilih tindakan perbaikan yang dilakukan (serta mencentang pembuatan tiket *Kaizen Maintenance* bila butuh tindak lanjut teknisi), lalu menyentuh `Simpan Alasan Downtime`.
- Apabila operator perlu memperbaiki fisik mesin terlebih dahulu setelah mematikan buzzer, operator dapat menutup sementara modal ke latar belakang sehingga kejadian tersebut masuk ke daftar `Downtime Unreason Queue` pada tab `Home` (`[LINGKUP HMI] 03`) dengan penanda angka merah pada tab `Home` sampai operator menyentuh `Isi Alasan` dan menyelesaikannya sebelum keluar shift.

## Acceptance Criteria:

**A. Interupsi Layar Penuh `Downtime Notification` & Kendali Buzzer `BUZ-01` (`[LINGKUP HMI] 05` Kiri - URS 19.3.5 Gambar 80)**
1. Begitu Backend / `GW-100` menerbitkan status *Auto-Downtime* penuh (`D000 = 2 [STOP]`, `D000 = 3 [FAULT]`, atau `NO_COUNT_5MIN` `D010 = 1` dari **Main Task 06**), `Panel HMI-T7` wajib menampilkan *overlay* interupsi layar penuh **`Downtime Notification` (`Gambar 80`)** di atas tab atau modal apa pun yang sedang terbuka dalam waktu **`< 1 detik`**.
2. Tampilan visual dan informasi pada *overlay* `Downtime Notification` wajib memuat:
   - Latar gelap industri kontras tinggi (`#1D181B`) dengan **pita garis diagonal bahaya (*hazard stripes*) berwarna merah** di tepi atas dan bawah layar (`Gambar 80`).
   - Banner header merah bertuliskan **`[STOP] DOWNTIME #<nomor_urut>`** disertai ikon peringatan tanda seru.
   - Judul utama kejadian: `<Nama Mesin> Berhenti Mendadak` (atau `Mesin Berhenti - Wajib Klasifikasi Alasan`).
   - Stempel waktu mulai kejadian secara presisi (`Mulai: DD/MM/YYYY pukul HH:mm:ss WIB`) beserta **penghitung durasi berjalan (*live elapsed timer* `MMm SSs`)** yang terus bertambah setiap detik selama mesin belum kembali berproduksi.
   - Baris diagnostik telemetri pemicu dari `PLC-ABC` (contoh: `Trigger PLC-ABC: D000 = 3 (FAULT) | D001 = 4 | D005 Suhu Sealer = 118.4 °C (Batas bawah 155.0 °C) | Output Buzzer BUZ-01 = ON`).
   - Tombol sentuh aksi primer berukuran ekstra besar (`tinggi >= 56 px`): **`Matikan Buzzer & Isi Alasan Downtime`**.
3. Perilaku interaksi pada *overlay* `Downtime Notification`:
   - Menyentuh `Matikan Buzzer & Isi Alasan Downtime` langsung mengirimkan perintah *acknowledge / mute* melalui `VM1 -> GW-100 -> PLC-ABC` untuk mematikan sirine fisik `BUZ-01` (`D011 = 0`), mencatat waktu respons operator (*operator response time*), menutup *overlay* layar penuh, dan **langsung membuka modal `Klasifikasi Alasan Downtime` (`Gambar 78`)** untuk kejadian tersebut.
   - Apabila panel sedang tidak memiliki sesi operator yang login saat alarm berbunyi, menyentuh tombol tersebut mematikan kebisingan sirine `BUZ-01` (dicatat sebagai *unauthenticated buzzer mute*), meminta login PIN cepat operator (**Main Task 07**), lalu otomatis membuka modal `Klasifikasi Alasan Downtime` begitu PIN valid.
   - Sesuai aturan URS Tabel 15 baris 2783-2787, apabila downtime dipicu oleh penghentian manual/terkunci di HMI dan kondisi fisik mesin sudah selesai diperbaiki, operator juga dapat menekan aksi `Akhiri Downtime & Isi Alasan` (sedangkan untuk downtime berbasis sinyal otomatis `PLC-ABC`, waktu `end_at` tertutup otomatis saat `D000 = 1 [RUN]` dan `delta_count > 0`).

**B. Interupsi Layar Penuh `Small Stop Notification` & Eskalasi Otomatis 5 Menit (`[LINGKUP HMI] 05` Kanan - URS 19.3.5 Gambar 81)**
1. Saat *Rule Engine* (**Main Task 06**) mendeteksi kondisi **`L-03 Idle & Minor Stoppage`** yang telah berlangsung melewati **`120 detik` (`2 menit`)** namun masih **`< 5 menit` (`300 detik`)** (`D000 = 1 [RUN]`, `D002 = 0 pcs/mnt`, `D009 = 1`, `BUZ-01 = OFF`), `Panel HMI-T7` menampilkan *overlay* **`Small Stop Notification` (`Gambar 81`)**.
2. Tampilan visual dan informasi pada *overlay* `Small Stop Notification` wajib memuat:
   - Latar gelap industri dengan **pita garis diagonal bahaya berwarna kuning/amber** di tepi atas dan bawah layar (`Gambar 81`).
   - Banner header kuning/amber (`#F59F00`) dengan teks gelap kontras tinggi (`#1D181B`, rasio kontras WCAG AA `>= 8.21:1`) bertuliskan **`[WARN] SMALL STOP #<nomor_urut>`** beserta ikon peringatan.
   - Judul utama `Jeda Minor Terdeteksi (Idle > 2 Menit)`, stempel waktu mulai (`Mulai: DD/MM/YYYY pukul HH:mm:ss WIB`), serta *live elapsed timer* (`02m 00s` s.d. `04m 59s`).
   - Ringkasan pemicu telemetri (`Trigger PLC-ABC: D000 = 1 tetapi Encoder SEN-S01 D002 = 0 pcs/mnt selama > 120 detik [D009 = 1]. Dicatat otomatis sebagai L-03 Minor Stop`).
   - Keterangan eskalasi otomatis: **`Otomatis dieskalasi menjadi Unplanned Downtime & Buzzer ON apabila berhenti mencapai 05:00 menit`**.
   - Tombol sentuh aksi primer (`tinggi >= 56 px`): **`Konfirmasi & Lanjutkan Produksi`** (serta opsi cepat `Pilih Penyebab Small Stop`).
3. Perilaku transisi pada *overlay* `Small Stop Notification`:
   - Jika mesin kembali menghasilkan produk (`delta_count > 0`) sebelum mencapai `5 menit`, durasi `Small Stop` tertutup otomatis pada pilar `L-03 Idle & Minor Stoppages`; operator dapat memilih penyebab singkatnya (misal `Garam Lembap Menggumpal di Corong Hopper`) atau mengonfirmasi kembali ke layar produksi.
   - Jika mesin masih tetap tidak menghasilkan produk (`delta_count = 0`) hingga detik ke-**`300` (`5 menit`)**, *overlay* kuning `SMALL STOP` **secara otomatis berubah di tempat menjadi *overlay* merah `[STOP] DOWNTIME` (Bagian A)** lengkap dengan aktivasi `BUZ-01 = ON` tanpa mereset waktu mulai awal (`start_at`).

**C. Modal Sentuh `Klasifikasi Alasan Downtime / Add Downtime Reason` (`[LINGKUP HMI] 04` Tengah - URS 19.3.4 Gambar 78 & Tabel 15 Baris 2778-2780)**
1. Modal `Klasifikasi Alasan Downtime` dibuka baik setelah operator menekan tombol pada *overlay* `Gambar 80/81` maupun saat operator menyentuh tombol `Isi Alasan` / `Ubah` pada kartu `Downtime Unreason Queue` di layar `Home`.
2. Elemen dan field input di dalam modal meliputi:
   - Header modal: menampilkan nomor identifikasi kejadian (`Downtime #<nomor>` atau `Small Stop #<nomor>`), waktu mulai, waktu selesai (atau status `Sedang Berlangsung`), durasi (`MMm SSs`), nama mesin yang terikat otomatis, serta tombol tutup `X`.
   - `Kategori Alasan / Reason Category *` (*dropdown* atau pil kategori sentuh):
     - Secara *default* terpilih pada **`Unplanned Downtime (L-01 Equipment Failure)`** (atau otomatis menyesuaikan kategori dari `Tag PLC D001` apabila `PLC-ABC` mengirimkan kode spesifik seperti `D001=2` -> `L-02 Setup & Adjustment` atau `D009=1` -> `L-03 Idle & Minor Stop`).
     - Pilihan kategori yang tersedia: `L-01 Equipment Failure (Unplanned Downtime)`, `L-02 Setup & Adjustment`, `L-03 Idle & Minor Stoppages (Small Stop)`, dan `Planned Downtime (Schedule Loss)`.
   - `Penyebab Mesin Berhenti / Reason *` (*daftar kartu radio sentuh berukuran `>= 48 px`* / *dropdown* `select reason`):
     - Memuat daftar alasan aktif dari **Main Task 05** yang sesuai dengan `Mesin` dan `Kategori Alasan *` terpilih (contoh empiris PT. XYZ: `L-02: Setting Pisau Rotary & Celah Sealer`, `L-02: Sanitasi Endapan Kerak Garam Hopper`, `L-01: Suhu Heater Sealer Drop (< 155 °C)`, `L-01: Kerusakan Rantai / Bearing Korosi`, `L-03: Garam Lembap Menggumpal di Corong`).
     - Apabila `PLC-ABC` mengirimkan `D001 > 0` yang cocok dengan kamus master, alasan yang cocok ditandai dengan label `[Saran Otomatis PLC D001=<x>]` dan disorot di urutan teratas agar operator cukup melakukan 1 sentuhan verifikasi.
   - `Sub-Machine Terdampak` (opsional untuk `Planned Downtime`, wajib pilih untuk `L-01 Equipment Failure`, memuat daftar `Sub-Machine` aktif milik mesin tersebut dari **Main Task 02** seperti `Vertical Heater Sealer` atau `Rotary Cutter & Main Drive` guna mendukung analitik komponen MTTR/MTBF).
   - `Tindakan Perbaikan / Action *` & `Catatan Detail` (sesuai `Gambar 78` & URS baris 2780):
     - Menyediakan pilihan tindakan standar cepat (*preset dropdown/chips*, contoh: `Kalibrasi pisau SS316 selesai`, `Pembersihan kerak garam selesai`, `Penggantian komponen / panggil teknisi`) beserta kolom teks opsional `Detail Reason`.
   - **Pintasan Eskalasi `Buat Tiket Kaizen Maintenance` (Opsional)**:
     - Opsi centang sentuh `Ajukan Tiket Kaizen Maintenance dari gangguan ini`; jika dicentang saat menyimpan alasan kategori `L-01` / `L-02`, sistem otomatis membuka formulir `Add Maintenance Kaizen` (**Main Task 11**) dalam keadaan *pre-filled* dengan `Machine`, `Sub-Machine`, dan deskripsi alasan downtime tersebut.
   - Tombol sekunder `Tunda ke Antrean` (`Discard`) dan tombol aksi primer `Simpan Alasan Downtime #<nomor>` (`Save`).
3. Validasi saat `Simpan Alasan Downtime` disentuh:
   - Menolak penyimpanan apabila `Kategori Alasan *`, `Penyebab Mesin Berhenti *`, atau `Tindakan Perbaikan *` (serta `Sub-Machine` pada kategori `L-01`) belum dipilih.
   - Menyimpan klasifikasi dengan atribut `input_by = operator_id`, `timestamp` pengisian, dan `source = "Manual-HMI"` (atau `"Auto+Verified-HMI"` jika mengonfirmasi trigger PLC), menghitung ulang porsi `Availability` / *Six Big Losses* shift berjalan secara *real-time* dalam `< 1 detik`, serta mencatat aktivitas klasifikasi downtime ke `Log Activity` (**Main Task 10**).

**D. Siklus Hidup `Downtime Unreason Queue`, Aturan Kategori Default, & Koreksi Mandiri Shift Berjalan (URS Baris 2741-2794)**
1. **Aturan Kategori Default Sebelum Diisi (URS Baris 2791-2793)**:
   - Setiap rekaman downtime yang belum diisikan alasannya oleh operator (`status = Unreasoned`) **secara otomatis dan *default* dihitung ke dalam kategori `Unplanned Downtime` (`Availability Loss`)** pada kalkulasi OEE berjalan sehingga angka OEE tidak pernah tampak tinggi secara semu ketika operator menunda pengisian alasan.
2. **Perilaku Daftar `Downtime Unreason Queue` & Badge Tab `Home`**:
   - Apabila operator menekan `Tunda ke Antrean` (`Discard`) atau `X` pada modal `Gambar 78` karena harus memegang kunci perbaikan mesin terlebih dahulu, rekaman tetap berada di bagian teratas kartu `Downtime Unreason Queue` pada tab `Home`.
   - Indikator angka merah pada ikon tab `Home` di `Component / [HMI] Bottom Nav` selalu menampilkan jumlah tepat seluruh item berstatus `Unreasoned` pada mesin tersebut (`0` = badge disembunyikan).
   - Warna baris pada `Downtime Unreason Queue` wajib mengikuti status keberlangsungan henti mesin:
     - **Sedang Berlangsung (`end_at = null`)**: latar baris berwarna **merah muda/aksen bahaya** dengan penghitung durasi *live* dan tombol `Isi Alasan`.
     - **Sudah Berakhir namun Belum Diisi (`end_at != null`, `Unreasoned`)**: latar baris berwarna **putih/netral** dengan ikon peringatan `[!]` / `[◆]`, waktu `Mulai`, waktu `Selesai`, total `Durasi`, dan tombol primer `Isi Alasan`.
     - **Sudah Diklasifikasi pada Shift Berjalan (`Reasoned`)**: turun ke bawah antrean aktif dengan penanda `[OK] <Kode Loss> - <Alasan>` dan tombol sekunder `Ubah`.
3. **Batas Waktu Pengubahan Mandiri oleh Operator di `Panel HMI-T7`**:
   - Operator di `Panel HMI-T7` masih diizinkan menyentuh tombol `Ubah` untuk mengoreksi pilihan alasan downtime yang salah tekan **selama masih berada dalam sesi shift yang sama dan draf *Shift Report* belum diajukan/disetujui (`Approved / Released`)**.
   - Setiap pengubahan alasan pada item yang sudah pernah disimpan wajib mencatat alasan lama -> alasan baru ke `Log Activity` & *Audit Log*; koreksi lintas shift setelah operator logout dilakukan oleh `Shift Leader` atau `Supervisor (SPV)` melalui konsol Aplikasi Web (**Main Task 12**).
4. **Ketahanan Mode *Offline***:
   - Apabila koneksi `Panel HMI-T7` ke `VM1` sedang terputus sementara komunikasi lokal ke `GW-100 / PLC-ABC` masih terhubung di switch `SWH-8P`, interupsi `Gambar 80/81` dan pemadaman `BUZ-01` lokal tetap berfungsi, serta input alasan downtime disimpan ke *Offline Queue* `Panel HMI-T7` (`maks. 4 jam`, mekanisme sama seperti **Main Task 08** Bagian G) untuk disinkronkan FIFO saat server kembali *online*.

## Catatan
- **Koreksi Salah Cetak Daftar Gambar URS untuk `Gambar 81` (`Daftar Gambar Baris 402` vs `Halaman 96 URS`)**: Pada Daftar Gambar URS baris 402 tertulis *"Gambar 81 Mockup Planned Downtime Notification"*, namun pada isi dokumen URS halaman 96 (`19.3.5`) judul dan isi gambar yang sebenarnya adalah **`Gambar 81 Mockup Small Stop Notification`** (`SMALL STOP #0002` berbingkai kuning-hitam). AC Bagian B mengikuti isi halaman 96 yang sebenarnya (`Small Stop Notification` untuk pilar `L-03 Idle & Minor Stoppages`).
- **Penambahan Tombol Sentuh *Acknowledge & Mute Buzzer* pada `Gambar 80 & 81`**: Pada gambar mockup URS halaman 96, kotak `DOWNTIME #0002` dan `SMALL STOP #0002` hanya menampilkan teks pemberitahuan tanpa tombol aksi sentuh yang terlihat untuk mematikan buzzer atau membuka form alasan. Selaras dengan desain `[LINGKUP HMI] 05` di [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) dan spesifikasi perangkat `BUZ-01` pada **Main Task 06**, kedua *pop-up* dilengkapi diagnostik pemicu `PLC-ABC` serta tombol aksi sentuh berukuran besar (`>= 56 px`) `Matikan Buzzer & Isi Alasan Downtime` dan `Konfirmasi & Lanjutkan Produksi`.
- **Kelengkapan Field Modal `Add Downtime Reason` (`Gambar 78` vs Teks Tabel 15 Baris 2780)**: Teks Tabel 15 URS baris 2780 mewajibkan 5 atribut (`Machine, Downtime Category, Reason, Detail Reason, dan Action`), sedangkan `Gambar 78` hanya menggambar 3 dropdown (`Reason category *`, `Reason *`, `Action`). AC Bagian C menggabungkan keduanya secara ergonomis: `Machine` terisi otomatis dari pengikatan panel HMI, `Reason Category`, `Reason` (berbentuk kartu sentuh besar), dan `Action` tampil sebagai kontrol utama, dilengkapi pilihan `Sub-Machine` (untuk `L-01`) serta catatan opsional `Detail Reason`.
