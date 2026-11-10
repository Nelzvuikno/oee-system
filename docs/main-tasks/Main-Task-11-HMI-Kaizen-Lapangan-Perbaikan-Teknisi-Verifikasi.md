# Main Task 11: Panel HMI-T7 - Pelaporan Tiket Kaizen Lapangan, Input Perbaikan Teknisi Maintenance, dan Verifikasi Operator Produksi

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP HMI] 08`, `Component / [HMI] Topbar`, `Component / [HMI] Bottom Nav`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.3.8` Gambar 85-89, Bagian 17 Flow Kaizen Production, Bagian 18 Flow Kaizen Maintenance, & Tabel 15 baris 2829-2872) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`Operator` produksi dan `Teknisi Maintenance` dapat menjalankan siklus penuh perbaikan berkelanjutan (*Total Productive Maintenance / Kaizen*) langsung dari konsol layar sentuh `Panel HMI-T7` di samping mesin, mulai dari pelaporan temuan kerusakan komponen akibat korosi garam (**Maintenance Kaizen**) maupun inisiatif perbaikan mandiri (**Production Kaizen**), pencatatan akar masalah dan tindakan penyelesaian perbaikan tahap ke-2, hingga verifikasi fisik hasil perbaikan (`Verifikasi OK` atau `Minta Revisi / NOT OK`) berdasarkan pembacaan stabilitas telemetri mesin aktual. Seluruh tiket yang dibuat atau diperbarui di `Panel HMI-T7` tersinkronisasi dua arah secara *real-time* dengan papan **Kaizen Board** pada Aplikasi Web.

## Prasyarat
- Pengguna (`Operator` bertipe `Production`, `Operator Teknisi` bertipe `Technical / Maintenance`, atau `Shift Leader` / `Supervisor`) telah login pada `Panel HMI-T7` (mengikuti **Main Task 07**).
- Struktur aset `Area`, `Line`, `Machine`, dan daftar komponen **`Sub-Machine`** (contoh: `Rotary Cutter & Main Drive`, `Vertical Heater Sealer`, `Auger Filler`) telah terdaftar aktif pada **Main Task 02**.
- Daftar personel `PIC` teknisi (`Tipe = Technical`) dan `Reviewer` (`Shift Leader / Supervisor`) telah terdaftar aktif pada **Main Task 03**.

## User Journey
- Operator menyentuh tab `Kaizen` pada *Bottom Navigation* `Panel HMI-T7` (`[LINGKUP HMI] 08` / `Gambar 85`) untuk melihat daftar tiket perbaikan pada mesin tersebut yang terkelompok dalam tab `Open` dan `Close`.
- Untuk melaporkan masalah baru (atau melalui pintasan eskalasi dari modal *Downtime* pada **Main Task 09**), operator menyentuh tombol apung bulat `+` di kanan bawah layar lalu memilih jenis tiket **`Maintenance`** atau **`Production`**.
- Apabila masalah membutuhkan penanganan teknisi (misal pisau *Rotary Cutter* tumpul/berkarat akibat kristal garam), operator memilih `Maintenance` (`Gambar 86`), memeriksa field `Start Date`, `Due Date`, `Created by`, `Area`, `Line`, dan `Machine` yang terisi otomatis, memilih `Sub-Machine *`, mengisi `Issue Title *`, `Issue Description *`, `Criteria *`, `Kaizen Category *`, memilih `Department *` dan satu atau lebih `PIC *` teknisi, lalu menyentuh `Simpan` sehingga tiket terbit berstatus **`OPEN | NOT OK`**.
- Apabila perbaikan merupakan inisiatif operasional mandiri produksi, operator memilih `Production` (`Gambar 88`), mengisi detail isu beserta pilihan `Reviewer *` (`SPV Produksi`), lalu menyentuh `Simpan` sehingga tiket terbit berstatus **`OPEN | NOT OK`**.
- Saat `Teknisi Maintenance` selesai memperbaiki komponen di mesin (untuk *Maintenance Kaizen*) atau `Operator Produksi` menyelesaikan tindakan perbaikan mandiri (untuk *Production Kaizen*), pelaksana login ke `Panel HMI-T7`, membuka tiket tersebut, masuk ke tahap ke-2 **`Improvement Information`**, mengisi akar masalah, `Improvement Description *`, `Jenis Penyelesaian *`, serta dokumentasi perbaikan, lalu menyentuh `Selesai Perbaikan` sehingga status berubah menjadi **`CLOSED | NOT VERIFIED`**.
- Untuk tiket *Maintenance Kaizen* berstatus `CLOSED | NOT VERIFIED`, `Operator Produksi` membuka tampilan `Detail & Verifikasi Kaizen` (`Gambar 89`), mengamati kelancaran operasi mesin dan indikator kecepatan/kualitas `PLC-ABC`, lalu menyentuh **`Verifikasi OK (CLOSED)`** untuk menerima hasil perbaikan (`CLOSED | OK`), atau menyentuh **`Minta Revisi (NOT OK)`** disertai alasan penolakan sehingga status berubah menjadi **`REVISE | NOT OK`** dan dikembalikan ke teknisi.

## Acceptance Criteria:

**A. Aturan Mesin Status (*State Machine*) Dua Alur Kaizen & Relasi Sinkronisasi `HMI <-> Web`**
1. Sistem wajib membedakan kewenangan pelaksana perbaikan dan pemverifikasi antara **Production Kaizen** (URS Bagian 17) dan **Maintenance Kaizen** (URS Bagian 18) dengan matriks transisi status berikut:
   - **Alur 1 - `Maintenance Kaizen` (URS Bagian 18)**:
     1. *Pembuatan Tiket (`Step 1 Issue Detail` oleh `Operator Produksi`)* -> Status tiket **`OPEN`**, status verifikasi **`NOT OK`**, dan mengirim notifikasi ke `PIC` Teknisi Maintenance terpilih (**Main Task 17**).
     2. *Input Penyelesaian Perbaikan (`Step 2 Improvement Information` oleh `Operator Teknisi / PIC Maintenance` di `Panel HMI-T7` atau Aplikasi Web)* -> Status tiket berubah menjadi **`CLOSED`**, status verifikasi berubah menjadi **`NOT VERIFIED`**, menghitung `Improvement Date` serta `Lead Time` (`Improvement Date - Submission Date`), dan mengirim notifikasi permintaan verifikasi ke `Operator Produksi`.
     3. *Verifikasi Lapangan (oleh `Operator Produksi` di `Panel HMI-T7`)*:
        - Jika disentuh **`Verifikasi OK`**: status tiket menjadi **`CLOSED`** dengan verifikasi **`OK`** (tiket tuntas).
        - Jika disentuh **`Minta Revisi (NOT OK)`** disertai catatan alasan revisi: status tiket berubah menjadi **`REVISE`** dengan verifikasi **`NOT OK`**, dan tiket kembali masuk ke daftar kerja aktif `Open` milik `PIC` Teknisi Maintenance untuk diperbaiki ulang.
   - **Alur 2 - `Production Kaizen` (URS Bagian 17)**:
     1. *Pembuatan Tiket (`Step 1 Issue Detail` oleh `Operator Produksi`)* -> Status tiket **`OPEN`**, status verifikasi **`NOT OK`**.
     2. *Input Penyelesaian Perbaikan (`Step 2 Improvement Information` oleh `Operator Produksi`)* -> Status tiket berubah menjadi **`CLOSED`**, status verifikasi berubah menjadi **`NOT VERIFIED`**, dan mengirim notifikasi permintaan verifikasi ke `Reviewer` (`SPV Produksi`) di Aplikasi Web (**Main Task 15 & 17**).
     3. *Verifikasi Hasil (oleh `SPV Produksi` pada Aplikasi Web **Main Task 15**, atau saat `SPV` login langsung di `Panel HMI-T7`)*:
        - Jika disetujui: status menjadi **`CLOSED`** dengan verifikasi **`OK`** (pada kasus khusus inisiatif lokal operator yang didelegasikan ke lini, hasil status langsung tercermin di `Panel HMI-T7`).
        - Jika ditolak/revisi: status menjadi **`REVISE`** dengan verifikasi **`NOT OK`** dan kembali ke daftar `Open` operator pembuat di `Panel HMI-T7`.
2. Seluruh tiket Kaizen pada mesin tersebut tersinkronisasi dua arah secara *real-time* antara `Panel HMI-T7` dan modul `Kaizen` pada Aplikasi Web (**Main Task 15**).

**B. Halaman `Daftar Tiket Kaizen / List Kaizen` di HMI (`[LINGKUP HMI] 08` Kiri - URS 19.3.8 Gambar 85)**
1. Saat tab `Kaizen` dibuka, ikon tab **`Kaizen`** pada `Component / [HMI] Bottom Nav` menyala sebagai tab aktif, dan daftar tiket dibatasi secara *default* pada mesin/lini tempat `Panel HMI-T7` terikat.
2. Bagian atas halaman `List Kaizen` menampilkan:
   - Sakelar filter status (*segmented switch* sesuai `Gambar 85`):
     - **`Open (<jumlah>)`** (terpilih secara *default*): menampilkan seluruh tiket yang masih membutuhkan tindakan pengerjaan atau perbaikan ulang (`OPEN | NOT OK` dan `REVISE | NOT OK`) maupun tiket yang menunggu verifikasi operator di mesin (`CLOSED | NOT VERIFIED` dengan penanda butuh verifikasi).
     - **`Close (<jumlah>)`**: menampilkan riwayat tiket pada mesin tersebut yang telah selesai diverifikasi (`CLOSED | OK`, serta opsi melihat yang `CLOSED | NOT VERIFIED`).
   - Kolom pencarian sentuh `Search...`: memfilter daftar tiket secara *case-insensitive* berdasarkan `Kode Kaizen` (contoh: `KZN-2023-01`), `Issue Title`, `Issue Description`, nama `Sub-Machine`, atau nama pembuat (`Created by`).
3. Setiap kartu tiket pada daftar `List Kaizen` (`Gambar 85`) menampilkan:
   - Kode tiket & `Issue Title` (contoh: `KZN-2023-03 - Ganti Pisau & Kalibrasi SEN-S01`).
   - *Pill badge* gabungan **Status & Verifikasi** dengan teks eksplisit: `OPEN - NOT OK`, `CLOSED - NOT VERIFIED`, `REVISE - NOT OK`, atau `CLOSED - OK`.
   - Cuplikan `Issue Description` (maksimal 2 baris ringkas).
   - Baris metadata bawah: ikon & nama pembuat (`Created by`), waktu pembuatan (`DD/MM/YYYY, HH:mm`), serta *badge* jenis Kaizen di sudut kanan bawah (**`production`** atau **`maintenance`**).
4. Di sudut kanan bawah area daftar terdapat tombol aksi apung bulat (**`+` Floating Action Button**, ukuran `>= 56 x 56 px` sesuai `Gambar 85`):
   - Menyentuh tombol `+` memunculkan menu pop-up sentuh berisi 2 pilihan: **`Production`** (membuka form `Add Production Kaizen` `Gambar 88`) dan **`Maintenance`** (membuka form `Add Maintenance Kaizen` `Gambar 86`).

**C. Formulir Tahap 1 (`Step 1: Issue Detail`) - `Add Maintenance Kaizen` & `Add Production Kaizen` (`[LINGKUP HMI] 08` - URS Gambar 86 & Gambar 88)**
1. Bagian atas formulir menampilkan indikator tahapan 2 langkah: **`(1) Issue Detail`** (aktif) dan **`(2) Improvement Information`** (terkunci pada saat pengajuan awal isu, atau dapat langsung dilanjutkan oleh pelaksana bila perbaikan diselesaikan pada saat yang sama).
2. Field yang tampil pada `Step 1: Issue Detail` beserta aturan *autofill* dan validasinya:
   - `Start Date / Submission Date *`: terisi otomatis (`today` / waktu aktual saat form dibuka, *read-only* atau dapat disesuaikan dalam shift berjalan).
   - `Due Date / Deadline *`: terisi otomatis (`(automatic)`, *read-only*) berdasarkan aturan SLA kategori Kaizen pabrik sejak `Start Date` (secara *default* `+14 hari kalender` sesuai contoh `Gambar 87/89`, atau `+3 hari` untuk kategori kritis keselamatan/breakdown mesin).
   - `Created by *`: terisi otomatis (`(account name)`, *read-only*) menggunakan identitas pengguna yang sedang login di `Panel HMI-T7`.
   - `Area *` dan `Line *`: terisi otomatis (`(autofill)`, *read-only*) sesuai pengikatan perangkat `Panel HMI-T7` dari **Main Task 02**.
   - `Machine *`: terisi otomatis secara *default* pada mesin tempat `Panel HMI-T7` terpasang (contoh: `Mesin Packing #6`).
   - `Sub-Machine *`: *dropdown* wajib pilih (*placeholder* `select sub machine`), memuat daftar `Sub-Machine` aktif milik `Machine *` tersebut dari **Main Task 02** (contoh: `Rotary Cutter & Main Drive`, `Vertical Heater Sealer`, `Auger Filler & Photo Counter`); apabila form ini dibuka melalui pintasan eskalasi modal *Downtime* (**Main Task 09** Bagian C.2), `Sub-Machine *` dan `Issue Description *` otomatis terisi awal (*pre-filled*) dari data kejadian downtime terkait.
   - `Issue Title *`: input teks satu baris wajib isi (*placeholder* `input title here...`, minimal 5 karakter).
   - `Issue Description *`: area teks multi-baris wajib isi (*placeholder* `input here...`, minimal 10 karakter, menjelaskan gejala kerusakan atau potensi peningkatan kinerja).
   - `Issue Documentation`: area lampiran opsional (`Click to upload or drag and drop` / unggah foto dari penyimpanan lokal/kamera tablet teknisi jika perangkat mendukung) dengan validasi format berkas **`SVG, PNG, JPG, atau PDF`** dan ukuran maksimal **`4 MB`** sesuai `Gambar 86 & 88` (pada panel HMI tanpa kamera, field ini boleh dikosongkan dan foto dapat dilengkapi melalui tablet teknisi atau Aplikasi Web **Main Task 15**).
   - `Criteria *`: *dropdown* wajib pilih (*placeholder* `select criteria`, pilihan pilar TPM/OEE: `Losses Reduction`, `Autonomous Maintenance (AM)`, `Preventive Maintenance (PM)`, `Quality Maintenance (QM)`, `Safety & Lingkungan Korosif K3`).
   - `Kaizen Category *`: *dropdown* wajib pilih (*placeholder* `select category`, terhubung ke pilar *Six Big Losses*: `L-01 Equipment Failure`, `L-02 Setup & Adjustment`, `L-03 Idle & Minor Stoppages`, `L-04 Reduced Speed`, `L-05 Process Defect`, `L-06 Scrap`).
   - **Field Penugasan Khusus Berdasarkan Jenis Kaizen**:
     - Pada **`Add Maintenance Kaizen` (`Gambar 86`)**: wajib memilih `Department *` (secara *default* `Maintenance`) dan `PIC *` (*multi-select dropdown* `select one or more PIC`, memuat personel aktif bertipe `Technical / Maintenance` dari **Main Task 03**).
     - Pada **`Add Production Kaizen` (`Gambar 88`)**: wajib memilih `Reviewer *` (*dropdown* `select reviewer...`, memuat personel `Supervisor (SPV)` / `Shift Leader` aktif pada area tersebut dari **Main Task 03**).
   - Tombol sentuh sekunder `Batal` (`Discard`) dan tombol aksi primer `Simpan Tiket Kaizen` (`Save`).
3. Saat `Simpan Tiket Kaizen` disentuh dan validasi lolos, sistem menghasilkan kode tiket unik (format `KZN-YYYY-XXXX`), menetapkan status `OPEN | NOT OK`, mencatat aktivitas pembuatan Kaizen ke `Log Activity` (**Main Task 10**), serta menyinkronkannya ke Aplikasi Web.

**D. Formulir Tahap 2 (`Step 2: Improvement Information`) - Input Tindakan Perbaikan Teknisi / Operator (`[LINGKUP HMI] 08` Tengah)**
1. Tiket yang berstatus `OPEN | NOT OK` atau `REVISE | NOT OK` dapat ditindaklanjuti ke formulir **`Step 2: Improvement Information`** melalui tombol `Input Perbaikan / Edit` pada halaman detail tiket oleh:
   - Personel bertipe `Technical / Maintenance` (khususnya `PIC` yang ditugaskan) atau `SuperAdmin` untuk tiket **`Maintenance Kaizen`**.
   - `Operator Produksi` pada lini tersebut (atau `Shift Leader`) untuk tiket **`Production Kaizen`**.
2. Field yang wajib diisi pada `Step 2: Improvement Information` meliputi:
   - `Akar Masalah / Root Cause *` (analisis penyebab dasar gangguan/kerugian, contoh: `Material korosif garam & jadwal pelumasan bearing/pisau terlewat`).
   - `Deskripsi Tindakan Perbaikan / Improvement Description *` (wajib isi, minimal 10 karakter, menjelaskan langkah perbaikan konkret yang telah dieksekusi, contoh: `Pasang pisau SS316 baru & set celah 0.15 mm`).
   - `Jenis Penyelesaian *` (pilihan wajib: `Tindakan Permanen / Permanent Countermeasure` atau `Tindakan Sementara / Temporary Fix`).
   - `Dokumentasi Perbaikan / Improvement Documentation` (opsional di panel mesin tanpa kamera, wajib format `SVG, PNG, JPG, atau PDF` ukuran maksimal `4 MB` apabila berkas dilampirkan).
   - Tombol sekunder `Batal` (`Discard`) dan tombol aksi primer **`Selesai Perbaikan (CLOSED | NOT VERIFIED)`**.
3. Saat `Selesai Perbaikan` disentuh, sistem memperbarui `Improvement Date` ke waktu aktual penyimpanan, menghitung `Lead Time` penyelesaian secara otomatis, mengubah status tiket menjadi **`CLOSED | NOT VERIFIED`**, mencatat ke `Log Activity`, dan mengirim notifikasi permintaan verifikasi ke pihak pemverifikasi sesuai Bagian A.1.

**E. Halaman `Detail Kaizen` & Eksekusi Verifikasi Hasil Perbaikan (`[LINGKUP HMI] 08` Kanan - URS Gambar 87 & Gambar 89)**
1. Menyentuh salah satu kartu tiket pada `List Kaizen` membuka halaman **`Detail Kaizen` (`Gambar 89`)** yang menampilkan seluruh informasi tiket secara terstruktur tanpa teks *placeholder* semu:
   - Blok Metadata Atas: jenis `Kaizen` (`maintenance` / `production`), `Code`, `Status` (`OPEN` / `CLOSED` / `REVISE`), badge `Verification` (`NOT OK`, `NOT VERIFIED`, atau `OK`), `Created by`, `Submission Date`, `Deadline`, `Improvement Date` (`-` jika belum selesai), `Lead Time` (`-` jika belum selesai), serta `Reviewer` / daftar `PIC`.
   - Blok Lokasi Aset: `Area`, `Line`, `Machine`, dan `Sub-Machine`.
   - Blok Isu Awal: `Issue Title`, `Issue Description`, pratinjau gambar/berkas `Issue Documentation` (jika ada), `Criteria`, dan `Kaizen Category`.
   - Blok Hasil Perbaikan (tampil terisi setelah Step 2 diselesaikan): `Akar Masalah`, `Improvement Description`, `Jenis Penyelesaian`, pratinjau `Improvement Documentation` (jika ada), serta riwayat catatan komentar/alasan revisi sebelumnya.
2. **Panel Verifikasi Lapangan oleh `Operator Produksi` pada `Maintenance Kaizen` (`[LINGKUP HMI] 08` Kanan)**:
   - Apabila tiket berjenis **`Maintenance Kaizen`** sedang berstatus **`CLOSED | NOT VERIFIED`** dan pengguna yang login di `Panel HMI-T7` adalah `Operator Produksi` (atau `Shift Leader` / `SPV`), halaman detail menampilkan **Kartu Indikator Referensi Telemetri Mesin Aktual** (menampilkan pembacaan *live* kecepatan `PLC-ABC D002`, suhu sealer `D005`, vibrasi `D006`, dan *Quality Rate* shift berjalan sebagai bukti objektif kelancaran mesin pasca-perbaikan) beserta 2 tombol keputusan verifikasi berukuran besar (`tinggi >= 52 px`):
     - Tombol sekunder peringatan **`Minta Revisi (NOT OK)`**: saat disentuh, mewajibkan pengisian kolom `Catatan Alasan Revisi *` (menjelaskan mengapa hasil perbaikan belum memadai, misal potongan sachet masih miring), mengubah status tiket menjadi **`REVISE | NOT OK`**, dan mengirim notifikasi revisi kembali ke `PIC` Teknisi.
     - Tombol primer sukses **`Verifikasi OK (CLOSED)`**: saat disentuh (dan dikonfirmasi), mengubah status tiket menjadi **`CLOSED | OK`**, merekam `verified_by` dan `verified_at`, serta mencatat penyelesaian verifikasi ke `Log Activity` (**Main Task 10**) dan papan Kaizen Web (**Main Task 15**).
3. Apabila koneksi `Panel HMI-T7` ke `VM1` sedang terputus sementara (*offline*), pembuatan draf teks tiket Kaizen baru dan catatan perbaikan teks tetap dapat disimpan ke *Offline Queue* lokal (`maks. 4 jam`, tanpa lampiran berkas besar hingga koneksi pulih) untuk disinkronkan FIFO saat jaringan kembali tersambung.

## Catatan
- **Koreksi Kesalahan Penempelan Gambar `Gambar 87` & Teks *Lorem Ipsum* pada URS (`Halaman 100-101 URS`)**: Pada dokumen URS halaman 100, gambar yang ditempel di atas teks *"Gambar 87 Mockup Add Maintenance (Improvement Information)"* identik sama persis dengan `Gambar 89 Mockup Detail Production Kaizen` (halaman 101) yang berisi tampilan detail baca beserta teks *dummy* `"Lorem Ipsum is simply dummy text..."`, sehingga form input tahap ke-2 (`Step 2: Improvement Information`) tidak tergambar tersendiri di PDF URS. AC Bagian D menjabarkan secara eksplisit field input `Step 2: Improvement Information` berdasarkan atribut hasil yang muncul di bagian bawah `Gambar 87/89` (`Akar Masalah`, `Improvement Description`, `Jenis Penyelesaian`, `Improvement Documentation`) dan seluruh teks *Lorem Ipsum* dilarang muncul pada sistem.
- **Koreksi Salah Ketik Pelaku Perbaikan pada Teks URS Bagian 17 Nomor 3 (`Baris 3476-3477` vs `Baris 3453`)**: Pada URS Bagian 17 (*Flow Kaizen Production*), langkah ke-2 baris 3453 menyebutkan bahwa **Operator Produksi** yang melakukan perbaikan, namun langkah ke-3 baris 3476-3477 salah menyalin kalimat dari Bab 18 (*"SPV Produksi melakukan verifikasi terhadap hasil perbaikan yang dilakukan oleh Teknisi"*). Pada AC Bagian A.1, alur ini telah diluruskan sesuai konteks masing-masing: pada **Production Kaizen**, perbaikan dilakukan oleh `Operator Produksi` dan diverifikasi oleh `SPV Produksi`; sedangkan pada **Maintenance Kaizen**, perbaikan dilakukan oleh `Operator Teknisi` dan diverifikasi di lapangan oleh `Operator Produksi`.
- **Koreksi Sorotan Tab Aktif pada `Gambar 85` & Peniadaan Tombol `Download` OS di Kiosk HMI (`Gambar 87/89`)**: Pada `Gambar 85` URS, ikon *Bottom Nav* yang menyala merah masih `Prev. Production` padahal layar sedang berada di menu `Kaizen`; sistem wajib menyalakan tab `Kaizen`. Selain itu, tombol `Download` di bagian bawah `Gambar 87/89` dikhususkan bagi konsol Aplikasi Web (**Main Task 15**) agar tidak memicu jendela *file explorer* sistem operasi pada layar *kiosk* `Panel HMI-T7`.
