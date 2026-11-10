# Main Task 15: Aplikasi Web - Manajemen Papan Kaizen TPM, Evaluasi Verifikasi Akhir, dan Laporan Dampak Sebelum vs Sesudah TPM

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 12`, `[LINGKUP WEB] 13`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.7` Gambar 21-22, `19.2.8` Gambar 23, `19.2.9` Gambar 24, Bagian 17-18 baris 3443-3523, & Tabel 16-17 baris 2925-2946, 3075-3097, 3325-3345) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, `SuperAdmin (OT/IT)`, serta personel `Maintenance (Technical)` dapat mengelola seluruh siklus tiket perbaikan berkelanjutan (**Production Kaizen** dan **Maintenance Kaizen**) lintas lini melalui Aplikasi Web yang tersinkronisasi dua arah dengan `Panel HMI-T7`, mulai dari pemantauan papan daftar tiket, pengajuan usulan Kaizen berbasis faktor **Diagram Fishbone** & **Six Big Losses**, pencatatan penyelesaian perbaikan tahap ke-2 (`Improvement Information`), diskusi komentar antar-peran, eksekusi keputusan verifikasi akhir (`Setujui -> CLOSED | OK` atau `Tolak -> REVISE | NOT OK`) berlandaskan bukti komparasi telemetri `PLC-ABC` sebelum vs sesudah perbaikan, hingga penyusunan **Laporan Evaluasi Dampak Sebelum vs Sesudah TPM (`Kaizen Report`)**.

## Prasyarat
- Pengguna telah login pada Aplikasi Web dengan peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, atau `SuperAdmin (OT/IT)` (mengikuti **Main Task 01**).
- Struktur aset `Area`, `Line`, `Machine`, dan komponen `Sub-Machine` (**Main Task 02**) serta akun personel `PIC` teknisi (`Tipe = Technical`) dan `Reviewer` (`Shift Leader / SPV / Manager`) (**Main Task 03**) telah terdaftar aktif.
- Aturan dasar mesin status (*state machine*) dua alur Kaizen dan sinkronisasi dengan konsol lapangan `Panel HMI-T7` telah berjalan mengikuti **Main Task 11**.

## User Journey
- Pengguna membuka menu **`Production Running > Kaizen`** (`[LINGKUP WEB] 12` / `Gambar 21`) untuk meninjau seluruh daftar tiket Kaizen lintas mesin pada tab **`Papan Tiket Kaizen`** atau berpindah ke tab **`Laporan Dampak TPM (Kaizen Report)`**.
- Pada `Papan Tiket Kaizen`, pengguna memfilter daftar berdasarkan status gabungan (`Semua Tiket`, `OPEN | NOT OK`, `CLOSED | NOT VERIFIED`, `REVISE | NOT OK`, `CLOSED | OK` atau sakelar cepat `Open / Closed`), lokasi `Area / Line / Machine`, jenis Kaizen (`Production` / `Maintenance`), maupun pencarian kata kunci.
- Untuk membuat inisiatif perbaikan baru dari kantor/ruang kontrol, pengguna mengklik tombol **`+ Tambah Kaizen`**, memilih jenis `Production Kaizen` atau `Maintenance Kaizen`, melengkapi formulir **`Step 1: Issue Detail`** (`Gambar 22`) termasuk pemetaan **`Faktor Fishbone`** (`Mesin`, `Lingkungan`, `Manusia`, `Metode`, `Material`) dan target penurunan **`Six Big Losses`**, mengunggah foto/dokumen kondisi awal (*before*), lalu menyimpan tiket sehingga berstatus **`OPEN | NOT OK`** dan muncul seketika di `Panel HMI-T7` mesin terkait.
- Saat perbaikan fisik telah diselesaikan, pelaksana yang berwenang membuka halaman **`Detail Kaizen`** (`Gambar 23`), mengklik tombol **`✎ Improvement Information`**, mengisi `Type of Solution / Jenis Penyelesaian *`, `Root Cause / Akar Masalah *`, `Improvement Description *`, serta lampiran foto sesudah perbaikan (*after*), lalu menyimpan sehingga status beralih ke **`CLOSED | NOT VERIFIED`**.
- `Supervisor (SPV)` (sebagai `Reviewer` tiket *Production Kaizen*, atau pemantau eskalasi tiket *Maintenance Kaizen*) membuka halaman **`Detail & Verifikasi Kaizen`** (`[LINGKUP WEB] 13` Kiri / `Gambar 24`), memeriksa alur 3 tahap, dokumentasi *before-after*, utas komentar diskusi, serta **Kotak Bukti Telemetri `PLC-ABC` Pasca-Perbaikan** (komparasi otomatis rata-rata kecepatan `D002`, frekuensi downtime `D001`, dan *Quality Rate* sebelum vs sesudah tanggal perbaikan), lalu mengklik **`✓ Setujui (CLOSED | OK)`** bila efektif atau **`✕ Tolak / Revisi (REVISE | NOT OK)`** disertai catatan revisi.
- Untuk mengevaluasi efektivitas program TPM secara makro di tingkat unit/pabrik, `Supervisor`, `Admin / Manager`, atau `SuperAdmin` membuka tab/panel **`Kaizen Report: Sebelum vs Sesudah TPM`** (`[LINGKUP WEB] 13` Kanan), memilih rentang periode *Baseline* (contoh: `Jul - Nov 2022`) dan periode *Evaluasi Pasca-TPM* (contoh: `26 - 27 Mei 2023`), meninjau kenaikan `Availability`, `Performance`, `Quality`, dan `Total OEE` beserta matriks penyelesaian tiap **Faktor Fishbone**, lalu mengklik **`Unduh Laporan TPM`** (`.pdf` / `.csv`).

## Acceptance Criteria:

**A. Hak Akses Peran (RBAC), Sinkronisasi Dua Arah `Web <-> HMI-T7`, & Mesin Status**
1. Modul `Kaizen` pada Aplikasi Web dapat diakses oleh `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)` (serta akun Web personel `Technical / Maintenance` terbatas pada tiket *Maintenance Kaizen* di area kerjanya).
2. Transisi status tiket mengikuti mesin status dua jalur yang identik dengan **Main Task 11** Bagian A.1 (`OPEN | NOT OK` -> `CLOSED | NOT VERIFIED` -> `CLOSED | OK` atau `REVISE | NOT OK`); sistem **wajib menolak** kombinasi status yang tidak sah seperti `OPEN | OK`.
3. Pembagian wewenang aksi pada Aplikasi Web:
   - **Pengajuan Tiket Baru (`Step 1: Issue Detail`)**: dapat dilakukan oleh `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin` (selain `Operator` dari `Panel HMI-T7`).
   - **Pengisian Hasil Perbaikan (`Step 2: Improvement Information`)**:
     - Untuk **`Production Kaizen`**: dapat diisi oleh pelaksana produksi (`Shift Leader`, `Supervisor`, atau `Operator` melalui `Panel HMI-T7`) serta `SuperAdmin`.
     - Untuk **`Maintenance Kaizen`**: dapat diisi oleh `PIC` personel bertipe `Technical / Maintenance` (baik melalui Web maupun `Panel HMI-T7`) atau `SuperAdmin`.
   - **Keputusan Verifikasi Akhir (`✓ OK` atau `✕ Not OK / Revise`)**:
     - Untuk **`Production Kaizen`**: dieksekusi di Aplikasi Web oleh `Supervisor (SPV)` yang ditunjuk sebagai `Reviewer` (atau `Admin / Manager` & `SuperAdmin`).
     - Untuk **`Maintenance Kaizen`**: verifikasi utama dilakukan oleh `Operator Produksi` di lapangan melalui `Panel HMI-T7` (**Main Task 11**), dan dapat pula dieksekusi/disupervisi oleh `Shift Leader` atau `Supervisor (SPV)` produksi lini tersebut melalui Aplikasi Web apabila operator sedang berganti shift.
   - **Akses `Laporan Dampak TPM (Kaizen Report)` Agregat**: tersedia bagi `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)`.
4. Setiap pembuatan tiket, pembaruan perbaikan, keputusan verifikasi, atau penambahan komentar di Aplikasi Web langsung tersinkronisasi secara *real-time* ke `Panel HMI-T7` mesin terkait dan memicu notifikasi ke pihak tertuju (**Main Task 17**).

**B. Halaman `Papan Daftar Kaizen / List Kaizen` Web (`[LINGKUP WEB] 12` Kiri - URS 19.2.7 Gambar 21)**
1. Header halaman menampilkan judul **`Kaizen`** dan *breadcrumb* `Production Running > Kaizen` (menggantikan salah label `SKU` pada mockup `Gambar 21`), serta menyediakan 2 tab pandangan utama: **`Daftar Tiket Kaizen`** (aktif secara *default*) dan **`Laporan Dampak TPM (Kaizen Report)`**.
2. Bilah kontrol & filter pada tab `Daftar Tiket Kaizen` menyediakan:
   - Sakelar kelompok utama `Open (<jumlah>)` vs `Closed (<jumlah>)` (`Gambar 21`) yang terintegrasi dengan *pill filter* status rinci (`[LINGKUP WEB] 12`):
     - `Semua Tiket (<total>)`,
     - `OPEN | NOT OK (<jumlah>)`,
     - `CLOSED | NOT VERIFIED (<jumlah>)`,
     - `REVISE | NOT OK (<jumlah>)`, dan
     - `CLOSED | OK (<jumlah>)`.
   - Filter dropdown cakupan: `Area`, `Line / Machine`, `Jenis Kaizen` (`Semua`, `Production`, `Maintenance`), `Faktor Fishbone` (`Mesin`, `Lingkungan`, `Manusia`, `Metode`, `Material`), dan `Kategori Six Big Losses` (`L-01` s.d. `L-06`).
   - Kolom pencarian `Search...`: memfilter tiket secara *case-insensitive* berdasarkan `Kode Kaizen`, `Issue Title`, `Issue Description`, nama `Sub-Machine`, nama pelapor (`Created by`), maupun `PIC / Reviewer`.
   - Tombol aksi primer **`+ Tambah Kaizen`** (`+ Add Kaizen`) di kanan atas yang membuka pilihan pembuatan **`Production Kaizen`** atau **`Maintenance Kaizen`**.
3. Setiap kartu tiket pada daftar menampilkan:
   - `Kode Kaizen` & `Issue Title` (contoh: `KZN-2023-01 - Autonomous Maintenance: Pembersihan Rutin Kerak & Korosi Garam`),
   - *Badge* status & verifikasi yang tegas (`[OPEN | NOT OK]`, `[CLOSED | NOT VERIFIED]`, `[REVISE | NOT OK]`, atau `[CLOSED | OK]`),
   - Cuplikan `Issue Description`, lokasi `Area > Line > Machine > Sub-Machine`, serta *chip* `Faktor Fishbone` & target `Six Big Losses`,
   - Baris metadata bawah: nama & peran pelapor (`Created by`), waktu pembuatan (`DD/MM/YYYY, HH:mm`), tenggat `Due Date` (disertai penanda peringatan merah **`[OVERDUE]`** apabila telah melewati `Due Date` dan status belum `CLOSED | OK`), serta *badge* jenis tiket di sudut kanan bawah (**`PRODUCTION`** atau **`MAINTENANCE`**).

**C. Formulir `Tambah & Edit Kaizen` 2-Tahap di Aplikasi Web (`[LINGKUP WEB] 12` Kanan - URS Gambar 22 & Gambar 23)**
1. Halaman/modal `Add Kaizen` (`Gambar 22`) menggunakan penanda progres 2 tahap di bagian atas: **`(1) Issue Detail`** dan **`(2) Improvement Information`**.
2. Field pada **`Step 1: Issue Detail`** beserta aturan validasinya:
   - `Jenis Kaizen *`: pilihan `Production Kaizen` atau `Maintenance Kaizen`.
   - `Start Date *`: otomatis terisi tanggal hari ini (`today`), dapat disesuaikan dalam batas periode pelaporan yang belum dikunci.
   - `Due Date *`: pemilih tanggal tenggat penyelesaian (`input due date..`, wajib `>= Start Date`; secara *default* terisi otomatis sesuai SLA kategori, misal `+14 hari kalender`, dan dapat disesuaikan oleh `Supervisor / Admin`).
   - `Created by *`: otomatis terisi nama akun pengguna yang sedang login (*read-only*).
   - `Area *`, `Line *`, `Machine *`, dan `Sub-Machine *`: *dropdown* berjenjang wajib pilih dari Master Aset **Main Task 02** (apabila pengguna memiliki satu area kerja utama, `Area` otomatis terisi awal dan tetap dapat diubah sesuai cakupan hak aksesnya).
   - `Faktor Fishbone (5M + 1E) *`: *dropdown* wajib pilih faktor akar penyebab (`Mesin`, `Lingkungan`, `Manusia`, `Metode`, `Material`) untuk pengelompokan evaluasi TPM.
   - `Criteria *` & `Kaizen Category (Target Six Big Losses) *`: *dropdown* wajib pilih kriteria TPM (`Losses Reduction`, `Autonomous Maintenance`, `Preventive Maintenance`, `Quality Maintenance`, `Safety & K3`) serta target pilar kerugian (`L-01 Equipment Failure` s.d. `L-06 Scrap`).
   - `Issue Title *`: input teks wajib isi (minimal 5 karakter, maksimal 150 karakter).
   - `Issue Description *`: area teks wajib isi (minimal 10 karakter).
   - `Issue Documentation (Foto / Dokumen Kondisi Sebelum)`: area unggah berkas *click or drag-and-drop* yang mendukung unggah **maksimal 5 berkas** per tahap dengan format **`SVG, PNG, JPG, atau PDF`** dan ukuran **maksimal `10 MB` per berkas** (sistem otomatis membuat pratinjau *thumbnail* terkompresi agar tetap ringan dibuka pada layar `Panel HMI-T7`).
   - **Field Penugasan Sesuai Jenis Kaizen**:
     - Untuk **`Production Kaizen`**: dropdown `Reviewer *` (*placeholder* `Pilih Reviewer SPV/Manager`, memuat akun aktif berperan `Supervisor (SPV)` atau `Admin / Manager` pada area tersebut).
     - Untuk **`Maintenance Kaizen`**: dropdown `Department *` (default `Maintenance`) dan *multi-select* `PIC *` (memuat satu atau lebih personel aktif bertipe `Technical / Maintenance`).
3. **Opsi Penyimpanan Tahap 1 & Pengisian Tahap 2 (`Step 2: Improvement Information`)**:
   - Saat pengguna menekan **`Simpan Usulan (Set OPEN | NOT OK)`** pada Tahap 1, tiket diterbitkan dengan status `OPEN | NOT OK` tanpa mewajibkan pengisian Tahap 2 saat itu juga.
   - Apabila perbaikan sudah langsung diselesaikan saat pencatatan di Web, pengguna berwenang dapat menekan `Lanjut ke Improvement Information (Next)` (atau menekan tombol **`✎ Improvement Information`** dari halaman `Detail Kaizen` `Gambar 23` pada tiket berstatus `OPEN` / `REVISE`) untuk mengisi:
     - `Root Cause / Akar Masalah *` (wajib isi, minimal 10 karakter),
     - `Type of Solution / Jenis Penyelesaian *` (`Tindakan Permanen / Permanent Countermeasure` atau `Tindakan Sementara / Temporary Fix` sesuai `Gambar 24`),
     - `Improvement Description *` (wajib isi, minimal 10 karakter), dan
     - `Improvement Documentation (Foto / Dokumen Kondisi Sesudah)` (mendukung hingga 5 berkas `SVG, PNG, JPG, atau PDF`, maks. `10 MB` per berkas).
   - Menyimpan Tahap 2 mengubah status tiket menjadi **`CLOSED | NOT VERIFIED`**, mencatat `Improvement Date` serta `Lead Time` penyelesaian, dan mengirimkan notifikasi permintaan verifikasi ke pemverifikasi terkait.
4. Tombol **`Edit`** di sudut kanan atas `Detail Kaizen` (`Gambar 23`) hanya aktif bagi pembuat tiket, `PIC`, `Supervisor`, atau `SuperAdmin` selama tiket **belum** mencapai status final `CLOSED | OK`; setelah `CLOSED | OK`, tiket terkunci permanen sebagai arsip TPM.

**D. Halaman `Detail Kaizen`, Bukti Telemetri `PLC-ABC`, Eksekusi Verifikasi Akhir, Komentar, & Ekspor PDF (`[LINGKUP WEB] 13` Kiri - URS 19.2.8 Gambar 23 & 19.2.9 Gambar 24)**
1. Halaman `Detail Kaizen` menampilkan informasi lengkap tiket secara bersih tanpa teks *dummy* *Lorem Ipsum*:
   - Header tiket: tombol kembali `<- Daftar Kaizen`, `Kode & Judul Tiket`, tombol **`Download`** (mengekspor lembar laporan 1 tiket Kaizen lengkap dengan foto *before-after* dan jejak verifikasi ke berkas `.pdf`), serta tombol **`Edit`** (jika belum `CLOSED | OK`).
   - Indikator progres **Alur Verifikasi 3 Tahap** (`Tahap 1: Input Isu` -> `Tahap 2: Pelaksanaan Perbaikan` -> `Tahap 3: Verifikasi Hasil`).
   - Grid metadata lengkap: jenis `Kaizen`, `Code`, `Status`, `Verification`, `Created by`, `Created Date`, `Due Date`, `Improvement Date`, `Lead Time`, `Verified by & Date`, lokasi `Area / Line / Machine / Sub-Machine`, `Faktor Fishbone`, `Criteria`, `Kaizen Category`, `Reviewer` / `PIC`, blok `Issue Detail & Documentation`, serta blok `Type of Solution, Root Cause, Improvement Description & Documentation`.
2. **Kotak Bukti Objektif Telemetri `PLC-ABC` Sebelum vs Sesudah Perbaikan (`[LINGKUP WEB] 13` Kiri)**:
   - Untuk membantu pemverifikasi mengambil keputusan berbasis data nyata mesin, halaman detail secara otomatis menarik ringkasan komparasi telemetri mesin terkait dari *Rule Engine* (**Main Task 06**) antara rata-rata `7 hari / shift sebelum Start Date` dibanding pembacaan produksi setelah `Improvement Date` (mencakup perubahan kecepatan rata-rata `D002 pcs/mnt`, frekuensi kejadian downtime pada `Sub-Machine` terkait, stabilitas sensor `SEN-T01 / SEN-V01`, serta `Quality Rate %`).
3. **Tombol Keputusan Verifikasi Akhir (`Gambar 24` Bawah & `[LINGKUP WEB] 13` Kiri)**:
   - Ketika tiket berstatus **`CLOSED | NOT VERIFIED`** dan dibuka oleh pemverifikasi yang berwenang sesuai Bagian A.3, bagian bawah halaman menampilkan 2 tombol keputusan tegas:
     - Tombol merah **`✕ Not OK (Tolak -> REVISE | NOT OK)`**: saat diklik, wajib membuka dialog input **`Catatan Alasan Revisi *`** (minimal 10 karakter), mengubah status tiket menjadi **`REVISE | NOT OK`**, mencatat alasan penolakan ke riwayat tiket, serta mengirim notifikasi revisi ke pelaksana perbaikan (`Operator` atau `PIC Teknisi`).
     - Tombol primer **`✓ OK (Setujui -> CLOSED | OK)`**: saat diklik dan dikonfirmasi, mengubah status tiket menjadi **`CLOSED | OK`**, merekam identitas pemverifikasi dan waktu persetujuan, mengunci tiket, serta memperbarui statistik pada `Laporan Dampak TPM`.
4. **Panel Diskusi Komentar & Riwayat Aktivitas Tiket (URS Tabel 16/17 Baris 2945-2946 & 3096-3097)**:
   - Di bagian bawah halaman `Detail Kaizen`, tersedia bagian **Komentar & Jejak Aktivitas** tempat pengguna lintas peran (`Shift Leader`, `SPV`, `PIC Maintenance`, `Manager`) dapat menuliskan komentar koordinasi dan melihat log kronologis perubahan status tiket.
   - Setiap kali ada pengguna yang mengirimkan komentar baru pada suatu tiket Kaizen, sistem wajib mengirim notifikasi *real-time* ke pembuat tiket, `PIC`, dan `Reviewer` tiket tersebut (**Main Task 17**).

**E. Tab / Panel `Kaizen Report: Evaluasi Dampak Sebelum vs Sesudah TPM` (`[LINGKUP WEB] 13` Kanan - URS 19.2.9 & Tabel 17)**
1. Saat pengguna (`Supervisor`, `Admin / Manager`, atau `SuperAdmin`) membuka tab **`Laporan Dampak TPM (Kaizen Report)`**, bilah filter atas menyediakan:
   - Pemilih `Area` dan `Line / Machine` (contoh: `Unit 2 -> Mesin Packing #6`),
   - Pemilih **`Periode Baseline (Sebelum TPM)`** (contoh: `Juli - November 2022`) dan **`Periode Evaluasi (Sesudah TPM)`** (contoh: `26 - 27 Mei 2023` atau rentang bulan berjalan), serta
   - Tombol **`Unduh Laporan TPM`** (`.pdf` & `.csv`).
2. **Grid 4 Kartu Komparasi Dampak OEE (`TPM Impact Grid`)**:
   - Menampilkan perbandingan nilai rata-rata *Sesudah TPM* terhadap *Sebelum TPM* beserta selisih peningkatan/penurunan (`+ / - % poin`) untuk:
     - **`Availability (%)`** (contoh: `85.85% -> 89.71% [+3.86%]`),
     - **`Performance (%)`** (contoh: `80.83% -> 87.66% [+6.83%]`),
     - **`Quality Rate (%)`** (contoh: `98.02% -> 98.92% [+0.90%]`), dan
     - **`Total OEE (%)`** (contoh: `68.01% -> 77.78% [+9.77%]`), dilengkapi ringkasan statistik jumlah total tiket Kaizen (`Total Diajukan`, `CLOSED | OK`, `Dalam Pengerjaan / REVISE`, `Overdue`, dan `Rata-Rata Lead Time Penyelesaian`).
3. **Tabel Rekapitulasi Akar Masalah *Diagram Fishbone* & Status Pilar TPM (`[LINGKUP WEB] 13` Kanan)**:
   - Menampilkan matriks evaluasi teragregasi berdasarkan 5 faktor **Diagram Fishbone** (`Mesin`, `Lingkungan`, `Manusia`, `Metode`, `Material`) dengan kolom:
     - `Faktor Fishbone`,
     - `Ringkasan Akar Masalah Dominan pada Mesin / Lini`,
     - `Tindakan Kaizen / Pilar TPM Terkait` (beserta jumlah tiket terhubung yang dapat diklik untuk memfilter daftar tiket),
     - `Rata-Rata Penurunan Losses Terkait`, dan
     - `Status Efektivitas` (`[OK] Efektif` bila tiket selesai terverifikasi `CLOSED | OK` dan metrik membaik, `[VERIFY]` bila masih menunggu verifikasi `CLOSED | NOT VERIFIED`, atau `[REVISE / OPEN]` bila masih membutuhkan perbaikan ulang).

## Catatan
- **Koreksi Salah Judul `SKU` & Status Mustahil `open - OK` pada Mockup `Gambar 21` (`Halaman 57 URS`)**: Pada tangkapan layar `Gambar 21 Mockup List Kaizen` di dokumen URS, judul halaman di kiri atas keliru tertulis `SKU` (`Heading > Heading > Heading`) dan baris kartu kedua menampilkan *badge* `open - OK` yang melanggar diagram alir URS Bagian 17 & 18 (di mana tiket `OPEN` hanya dapat berstatus verifikasi `NOT OK`, sedangkan verifikasi `OK` hanya tercapai setelah perbaikan `CLOSED`). AC Bagian A.2 dan Bagian B.1 telah meluruskan kedua ketidakkonsistenan tersebut.
- **Koreksi Salah *Placeholder* `Reviewer *` & Harmonisasi Batas Unggah Berkas antara Web (`Gambar 22`) dan HMI (`Gambar 86/88`)**: Pada mockup `Gambar 22` (*Add Production Kaizen*), field `Reviewer *` memiliki teks *placeholder* yang salah (`select department`), sementara keterangan area unggah berkas mencantumkan `max 5 file, 50MB per file` (berbeda jauh dari `max 4MB` pada mockup HMI `Gambar 86/88`). Pada AC Bagian C.2, `Reviewer *` memuat daftar personel `Supervisor / Manager`, dan batas unggah berkas diseragamkan mendukung hingga `5 berkas` (`SVG, PNG, JPG, PDF`) dengan ukuran wajar `maks. 10 MB per berkas` disertai pembuatan *thumbnail* otomatis agar sinkron dibuka di Web maupun `Panel HMI-T7`.
- **Pelurusan Tertukarnya `19.2.9 Kaizen Report (Gambar 24)` di Dokumen URS (`Halaman 59-60 URS`)**: Pada dokumen URS halaman 60, gambar yang ditempel di bawah sub-bab `19.2.9 Kaizen Report (Gambar 24)` sebenarnya adalah tampilan **`Detail Kaizen` pasca-pengisian `Improvement Information`** yang memuat tombol verifikasi `✕ Not OK` dan `✓ OK` (dengan metadata atas yang lupa diperbarui dari `Status: OPEN / not ok` serta berisi teks *Lorem Ipsum*). Agar tidak ada kebutuhan bisnis maupun tampilan URS yang hilang, AC Bagian D mengakomodasi secara utuh tampilan verifikasi `Detail Kaizen` beserta tombol `Download` PDF per tiket dari `Gambar 23-24`, sementara AC Bagian E menyediakan **`Kaizen Report: Evaluasi Dampak Sebelum vs Sesudah TPM`** bagi manajemen sesuai menu `Report -> Kaizen Report` dan `[LINGKUP WEB] 13`.
