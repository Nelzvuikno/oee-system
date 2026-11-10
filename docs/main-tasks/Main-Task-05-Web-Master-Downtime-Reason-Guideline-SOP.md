# Main Task 05: Aplikasi Web - Konfigurasi Master Downtime Reason (Six Big Losses) dan Pengelolaan Dokumen Guideline SOP

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 19`, `[LINGKUP WEB] 20` panel kanan Downtime Reason, `[DESIGN SYSTEM] 02`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.16` Gambar 46-48, `19.2.17` Gambar 49-50, Tabel 8, Tabel 9, & Bagian 16 Tabel 17), [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md), & [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md)

---

## Expected Result
`Admin / Manager` dan `SuperAdmin (OT/IT)` dapat mengelola kamus standar **Master Downtime & Loss Reason** yang dipetakan ke pilar *Six Big Losses* (`Planned Downtime`, `L-01 Equipment Failure`, `L-02 Setup & Adjustment`, `L-03 Idle & Minor Stoppages / Small Stop`, serta klasifikasi alasan cacat `L-05 Process Defect` & `L-06 Scrap`) beserta kode pemicu register `PLC-ABC` (`D001` / `D009`), sekaligus mengelola pustaka dokumen digital **Guideline & SOP TPM** berformat PDF (`maksimal 10 MB`). Seluruh kamus alasan henti mesin dan dokumen SOP yang diterbitkan langsung tersinkronisasi ke *Rule Engine* akuisisi telemetri serta konsol layar sentuh `Panel HMI-T7` agar operator lapangan mengklasifikasikan gangguan dan menjalankan prosedur *Autonomous Maintenance* tanpa inkonsistensi istilah.

## Prasyarat
- Pengguna telah berhasil login ke Aplikasi Web ProductionCore menggunakan akun dengan peran **`Admin / Manager`** atau **`SuperAdmin (OT/IT)`** untuk akses kelola penuh (atau `Shift Leader` / `Supervisor` khusus akses baca dokumen *Guideline* sesuai **Main Task 01**).
- Data master *Area*, *Line*, dan *Machine* telah terdaftar dan berstatus aktif melalui **Main Task 02**.
- Layanan Backend API (VM1), penyimpanan berkas dokumen internal, dan Database PostgreSQL (VM2) berada dalam status aktif.

## User Journey
- Pengguna (`Admin / Manager` atau `SuperAdmin`) membuka grup menu `Configuration` pada *Sidebar* kiri Aplikasi Web lalu memilih menu `Downtime Reason` (`[LINGKUP WEB] 20` panel kanan).
- Pengguna memilih *Area* produksi pada daftar *Area* di sub-sidebar kiri (contoh: `Unit 2: Pengemasan Garam Beryodium`), memfilter tabel menggunakan dropdown kategori (`Semua Kategori` atau pilar *loss* tertentu) maupun kolom `Search...`, dan meninjau daftar kode alasan waktu henti beserta pemetaan `Tag PLC`, `Line`, dan `Machine`.
- Pengguna menekan tombol `+ Tambah Alasan` (`+ Add reason`) untuk membuka modal `Tambah Alasan Downtime` (`Gambar 50`), memeriksa field `Area *` yang sudah terisi otomatis mengikuti pilihan sub-sidebar, memilih `Line *`, memilih satu atau lebih `Machine *`, memilih `Kategori Loss *`, mengisi `Kode Alasan *`, `Kode Register PLC-ABC` (bila terhubung alarm otomatis), serta `Nama Alasan Downtime *`, lalu menekan `Simpan ke Master & Sinkronkan ke HMI-T7`.
- Apabila perlu memperbarui penamaan alasan atau pemetaan kode register PLC, pengguna menekan ikon `Edit` pada baris tabel, mengubah nilai pada modal `Edit Alasan Downtime`, lalu menyimpan perubahan.
- Selanjutnya pengguna berpindah ke menu `Configuration -> Guideline SOP` (`[LINGKUP WEB] 19`).
- Pengguna melihat daftar judul dokumen panduan dan SOP aktif di panel kiri serta membaca isi berkas PDF secara langsung pada panel pratinjau dokumen di sisi kanan (`Gambar 47`) menggunakan kontrol halaman `Previous / Next`, pembesaran layar penuh, atau unduh PDF.
- Pengguna menekan tombol `+ Unggah Dokumen` (`+ Upload file`), mengisi modal `Unggah Dokumen Panduan` (`Gambar 46`) yang meliputi `Judul Dokumen Guideline *`, `Distribusi Peran & Perangkat *`, `Nomor Revisi & Catatan`, serta mengunggah berkas PDF (`maks. 10 MB`), lalu menekan `Terbitkan ke Web & HMI` (`Upload`).
- Untuk merevisi judul atau mengganti berkas PDF SOP dengan revisi terbaru, pengguna menekan ikon `Edit` pada baris dokumen di panel kiri sehingga modal `Edit Guideline` (`Gambar 48`) terbuka, menghapus berkas PDF lama bila ingin mengganti berkas baru, lalu menekan `Simpan Perubahan` (`Save`).

## Acceptance Criteria:

**A. Otorisasi Akses Modul & Relasi dengan Task Lain**
1. Menu `Configuration -> Downtime Reason` dan fungsi tulis pada `Configuration -> Guideline SOP` (*Upload*, *Edit*, *Hapus/Arsipkan*) hanya ditampilkan dan hanya dapat diakses oleh pengguna dengan peran **`Admin / Manager`** dan **`SuperAdmin (OT/IT)`** (sesuai matriks RBAC **Main Task 01**).
2. Pengguna dengan peran `Shift Leader` dan `Supervisor (SPV)`:
   - Ditolak dengan status HTTP `403 Forbidden` apabila mengakses rute konfigurasi `/configuration/downtime-reason` atau endpoint tulis `/configuration/guidelines`.
   - Tetap dapat membuka pustaka `Guideline SOP` dalam mode **baca saja (*read-only*)** melalui halaman Profil / menu `View Guideline SOP` (**Main Task 01** Bagian F) tanpa tombol `+ Upload file`, ikon `Edit`, maupun ikon `Hapus`.
3. Daftar *Area*, *Line*, dan *Machine* pada modul `Downtime Reason` bersumber secara dinamis dari entitas aktif pada **Main Task 02**.
4. Data yang dikelola pada task ini langsung dikonsumsi oleh modul hilir berikut:
   - Pemetaan otomatis kode register `PLC-ABC` (`D001` & `D009`) menjadi rekaman `DowntimeEvent` awal pada *Rule Engine* Backend & `GW-100` (**Main Task 06**).
   - Pilihan alasan pada dialog interlock *Pop-up Downtime / Small Stop* (**Main Task 09**), pilihan alasan cacat saat input *Reject / Scrap* (**Main Task 08**), serta pustaka *Pembaca SOP Digital* di `Panel HMI-T7` (**Main Task 10**).
   - Pilihan koreksi alasan downtime oleh Supervisor (**Main Task 12**) serta pengelompokan Pareto *Six Big Losses* dan analisis kerugian `L-01..L-06` (**Main Task 13**, **Main Task 14**, dan **Main Task 16**).

**B. Halaman Daftar `Master Downtime Reason` (`[LINGKUP WEB] 20` Panel Kanan - URS 19.2.17 Gambar 49)**
1. Halaman `Downtime Reason` menggunakan tata letak 2 panel berdampingan sesuai `Gambar 49`:
   - **Panel Kiri (Sub-Sidebar `Area`)**: menampilkan daftar seluruh *Area* produksi aktif; secara *default* saat halaman dibuka, *Area* pertama dalam daftar terpilih aktif (`selected`), dan klik pada *Area* lain langsung memperbarui isi tabel di panel kanan khusus untuk *Area* tersebut.
   - **Panel Kanan (Daftar & Filter Alasan Waktu Henti)**: menampilkan *toolbar* filter di bagian atas dan tabel daftar alasan di bawahnya.
2. Bagian *toolbar* di atas tabel `Downtime Reason` memuat:
   - *Dropdown* filter kategori (`all category` / `Semua Kategori` terpilih secara *default`): menyaring daftar berdasarkan kategori kerugian (`Planned Downtime / Schedule Loss`, `L-01 Equipment Failure (Unplanned)`, `L-02 Setup & Adjustment`, `L-03 Idle & Minor Stoppages (Small Stop)`, serta kategori alasan cacat kualitas `L-05 Process Defect` dan `L-06 Scrap / Startup Reject`).
   - Kolom pencarian `Search...`: memfilter baris tabel secara *case-insensitive* berdasarkan `Kode`, `Tag PLC`, nama `Line`, nama `Machine`, atau teks `Alasan Waktu Henti`.
   - Tombol aksi primer `+ Tambah Alasan` (`+ Add reason`) di sudut kanan atas.
3. Tabel `Master Downtime Reason` menampilkan kolom-kolom berikut secara berurutan (`Gambar 49` & `[LINGKUP WEB] 20`):
   - `#`: nomor urut baris.
   - `Kode` (`Code`): kode singkat unik alasan gangguan/kerugian (contoh: `DT-01`, `DT-02`, `DT-03`, `DT-04`, `DT-05`, `DT-06`, atau `RJ-01`).
   - `Tag PLC`: alamat & nilai register pemicu pada kontroler generik `PLC-ABC` (contoh: `D001=1`, `D001=2`, `D001=4`, `D009=1`, atau label `Manual HMI` apabila alasan dipilih manual oleh operator tanpa kode alarm spesifik dari PLC).
   - `Pilar Loss` & `Tipe` (`Downtime Category`): menampilkan pilar *Six Big Losses* dan sifat waktu hentinya (contoh: `Planned / Planned DT`, `L-02 Setup / Setup & Adj`, `L-01 Failure / Unplanned`, `L-03 Minor / Small Stop`, `L-05 Defect`, `L-06 Scrap`).
   - `Line`: nama *Line* tempat alasan tersebut berlaku.
   - `Machine`: nama *Machine* yang terikat dengan alasan tersebut.
   - `Alasan Waktu Henti` (`Downtime Reason`): deskripsi operasional alasan gangguan (contoh empiris PT. XYZ: `Briefing Shift & Pemanasan Awal`, `Setting Sparepart & Pisau Potong`, `Sanitasi Kerak Garam Korosif`, `Elemen Heater Sealer Putus/Drop`, `Kerusakan Bearing / Rantai Drive`, `Garam Menggumpal di Hopper (<5m)`).
   - Kolom Aksi di ujung kanan baris: tombol ikon `Edit` (`Edit Alasan`) dan opsi `Nonaktifkan Alasan`.
4. Paginasi dan tampilan tabel:
   - Secara *default*, tabel menampilkan **10 baris per halaman** dengan halaman `1` aktif dan kontrol paginasi `< 1 2 3 4 5 ... N >` di kanan bawah tabel.
   - Perubahan pilihan `Area`, filter kategori, atau kata kunci `Search...` otomatis mengembalikan paginasi ke halaman `1`; jika tidak ditemukan data yang cocok, tabel menampilkan *Empty State* informatif.

**C. Modal `Tambah Alasan Downtime` & `Edit Alasan Downtime` (`[LINGKUP WEB] 20` - URS 19.2.17 Gambar 50)**
1. Saat pengguna menekan tombol `+ Tambah Alasan` (`+ Add reason`), sistem membuka modal **`Tambah Alasan Downtime` (`Add Downtime Reason` - `Gambar 50`)**; saat pengguna menekan ikon `Edit` pada baris tabel, sistem membuka modal **`Edit Alasan Downtime`** dengan field terisi nilai eksisting.
2. Field yang ditampilkan dan divalidasi pada modal konfigurasi alasan meliputi:
   - `Area *`: field *read-only* yang **terisi otomatis berdasarkan *Area* yang sedang dipilih pada sub-sidebar kiri** (sesuai ketentuan `Gambar 50`: *automatic area based on select on sidebar*, contoh: `Unit 2: Pengemasan Garam Beryodium`).
   - `Line *`: *dropdown* wajib pilih (*placeholder* `select line...`), memuat daftar *Line* aktif di bawah `Area *` tersebut.
   - `Machine *`: *multi-select dropdown* wajib pilih minimal 1 mesin (*placeholder* `select one or more machine...`), memuat daftar *Machine* aktif di bawah `Line *` terpilih sehingga satu definisi alasan downtime yang sama dapat diterapkan ke satu atau beberapa mesin pengemasan sekaligus.
   - `Kategori Loss / Downtime Category *`: *dropdown* wajib pilih (*placeholder* `select downtime category`), dengan pilihan terstruktur yang menentukan rumus OEE mana yang dipengaruhi:
     - `Planned Downtime (Schedule Loss)`: mengurangi *Planned Production Time* menjadi *Loading Time* (contoh: istirahat terjadwal, briefing shift terjadwal, jadwal PM terencana).
     - `L-01 Equipment Failure (Unplanned Downtime)`: mengurangi *Operation Time* (`Availability`) dan masuk perhitungan MTTR/MTBF.
     - `L-02 Setup & Adjustment`: mengurangi *Operation Time* (`Availability`) pada pilar Setup/Pergantian Roll Film/Setting Pisau/Sanitasi Kerak Garam selama pergantian batch.
     - `L-03 Idle & Minor Stoppages (Small Stop)`: henti singkat `< 5 menit` (seperti garam menggumpal di hopper atau sensor foto tertutup debu garam) yang dipicu dari `D009=1` atau henti singkat `D000=2`.
     - `L-05 Process Defect (Reject Produksi)` & `L-06 Scrap (Startup / Kemasan Rusak)`: alasan cacat kualitas untuk pencatatan *Reject / Scrap* di `Panel HMI-T7`.
   - `Kode Alasan *` (`Code *`): wajib isi, format kode singkat alfanumerik unik (contoh: `DT-07`, `RJ-04`, maksimal 12 karakter, tidak boleh duplikat dengan kode aktif lain).
   - `Kode Register PLC-ABC` (opsional untuk alasan manual, contoh: `D001=7` atau `D009=1` beserta catatan ambang sensor seperti `Alarm Vibrasi SEN-V01 > 7.1 mm/s`): jika diisi, sistem memvalidasi bahwa pasangan `Machine + Register + Nilai Kode` belum dipakai oleh alasan aktif lain pada mesin yang sama agar tidak terjadi tabrakan pemetaan otomatis dari `GW-100`.
   - `Nama Alasan Downtime *` (`Downtime Reason *`): wajib isi (*placeholder* `input downtime reason`), minimal 3 karakter, tidak boleh duplikat pada kombinasi `Machine + Kategori Loss` yang sama.
   - Tombol aksi primer lebar penuh `Simpan ke Master & Sinkronkan ke HMI-T7` (`Save`), tombol sekunder lebar penuh `Batal` (`Discard`), dan tombol tutup `X`.
3. Setelah berhasil disimpan, alasan baru langsung tampil pada tabel, tersinkronisasi ke *cache* daftar alasan di `GW-100` dan `Panel HMI-T7`, serta dicatat ke *Audit Log*.

**D. Halaman Pustaka & Pembaca Dokumen `Guideline SOP` (`[LINGKUP WEB] 19` - URS 19.2.16 Gambar 47)**
1. Halaman `Guideline SOP` terbagi menjadi 2 panel berdampingan sesuai `Gambar 47`:
   - **Panel Kiri (Daftar Dokumen Guideline & SOP)**:
     - Menampilkan tombol aksi primer lebar penuh **`+ Unggah Dokumen` (`+ Upload file`)** di bagian paling atas panel kiri (tombol ini **hanya tampil** untuk peran `Admin / Manager` dan `SuperAdmin`, serta disembunyikan bagi `Shift Leader` dan `Supervisor`).
     - Menampilkan kolom pencarian cepat judul/kode SOP dan daftar kartu/baris dokumen aktif yang memuat `Kode SOP`, `Judul Dokumen Panduan`, `Target Peran`, serta badge `Status & Versi` (contoh: `SOP-TPM-01 | Pembersihan Kerak & Korosi Garam Packing #6 | Operator & Teknisi | [AKTIF v2.1]`).
     - Secara *default* saat halaman dibuka, dokumen pertama di dalam daftar otomatis terpilih aktif (`selected`) dan isinya ditampilkan pada panel pratinjau kanan; pengguna dengan peran terbatas hanya melihat dokumen yang ditargetkan untuk perannya atau `Semua Peran`, sedangkan `Admin / Manager` dan `SuperAdmin` melihat seluruh dokumen.
     - Pada baris dokumen yang dipilih atau diarahkan kursor (*hover*), khusus bagi peran `Admin / Manager` dan `SuperAdmin`, tampil 2 tombol ikon aksi di sisi kanan baris sesuai `Gambar 47`: ikon **`Edit`** (membuka modal `Edit Guideline` `Gambar 48`) dan ikon **`Hapus / Arsipkan`** (membuka dialog konfirmasi penghapusan/pengarsipan dokumen).
   - **Panel Kanan (Pembaca & Pratinjau PDF Tersemat - *Embedded Document Viewer*)**:
     - Bilah kontrol (*viewer toolbar*) di bagian atas pratinjau dokumen menampilkan (`Gambar 47`):
       - Tombol `< Previous` (nonaktif saat berada di halaman `1`), indikator halaman aktif terhadap total halaman `1 / N` (mendukung input lompat ke nomor halaman tertentu), dan tombol `Next >` (nonaktif saat berada di halaman terakhir `N`).
       - Tombol ikon mode layar penuh / sesuaikan lebar (`Fullscreen / Fit Width`).
       - Tombol ikon `Unduh PDF` (`Download`) di sudut kanan atas bilah pratinjau untuk menyimpan salinan berkas PDF dari konsol Aplikasi Web.
     - Area kanvas baca di bawah bilah kontrol merender halaman berkas PDF secara langsung di dalam aplikasi tanpa mengharuskan pengguna mengunduh berkas terlebih dahulu.
     - Jika belum ada satu pun dokumen *Guideline* yang diunggah, panel kiri dan kanan menampilkan *Empty State* yang jelas disertai tombol pintas `+ Unggah Dokumen` (bagi `Admin / Manager` & `SuperAdmin`).

**E. Modal `Unggah Dokumen Panduan / Upload Guideline` (`[LINGKUP WEB] 19` - URS 19.2.16 Gambar 46)**
1. Saat `Admin / Manager` atau `SuperAdmin` menekan `+ Unggah Dokumen` (`+ Upload file`), sistem menampilkan modal **`Unggah Dokumen Panduan` (`Upload Guideline` - `Gambar 46`)** dengan tombol tutup `X` di kanan atas.
2. Field dan kontrol unggah pada modal meliputi:
   - `Judul Dokumen Guideline *` (`Guideline Title *`, termasuk kode SOP bila digunakan, *placeholder* `input title here...` / `Masukkan kode & judul dokumen SOP...`, wajib isi, minimal 3 karakter, wajib unik di antara dokumen aktif).
   - `Distribusi Peran & Perangkat *`: pilihan wajib untuk menentukan siapa yang dapat membaca dokumen tersebut (`Semua Peran`, `Operator HMI-T7 & Teknisi`, `Shift Leader & SPV`, atau `Admin / Manajemen`) beserta opsi centang `Tampilkan di Konsol Panel HMI-T7` (secara *default* tercentang apabila target mencakup `Operator` atau `Semua Peran`) dan pengikatan opsional ke *Area / Machine* tertentu (contoh: `Unit 2 - Mesin Packing #6`).
   - `Nomor Revisi & Catatan` (opsional/disarankan untuk kendali dokumen mutu ISO/SNI, contoh: `Revisi 2.1 - Penambahan batas waktu sanitasi 35 menit`).
   - `Berkas Dokumen / Guideline File *`: area unggah *drag-and-drop* atau klik pilih berkas (`Click to upload or drag and drop`) dengan keterangan eksplisit **`PDF File (max 10MB)`**.
   - Tombol aksi primer lebar penuh `Terbitkan ke Web & HMI` (`Upload`) dan tombol sekunder lebar penuh `Batal` (`Discard`).
3. Validasi saat berkas dipilih atau saat tombol `Terbitkan ke Web & HMI` ditekan:
   - Jika `Judul Dokumen Guideline *` kosong atau belum ada berkas yang dipilih, sistem menolak pengunggahan dan menampilkan pesan error inline.
   - Jika berkas yang dipilih **bukan berformat PDF** (validasi ekstensi `.pdf` dan *MIME type* `application/pdf`, menolak berkas eksekusi atau format lain) atau ukuran berkas **melebihi `10 MB`**, sistem langsung menolak berkas tersebut dan menampilkan pesan error spesifik (`Format berkas wajib PDF dengan ukuran maksimal 10 MB.`).
   - Selama proses unggah berlangsung, tombol `Terbitkan ke Web & HMI` menampilkan indikator progres/*loading* dan dinonaktifkan sementara untuk mencegah unggah ganda.
   - Setelah unggah berhasil, modal tertutup, dokumen baru langsung muncul dan terpilih di daftar panel kiri beserta pratinjau PDF-nya di panel kanan, disinkronkan ke daftar SOP `Panel HMI-T7` (**Main Task 10**) bila opsi distribusi HMI aktif, dan dicatat ke *Audit Log*.

**F. Modal `Perbarui Dokumen Panduan / Edit Guideline` & Hapus/Arsipkan Dokumen (`[LINGKUP WEB] 19` - URS 19.2.16 Gambar 48)**
1. Saat `Admin / Manager` atau `SuperAdmin` menekan ikon `Edit` pada salah satu dokumen di daftar kiri, sistem membuka modal **`Perbarui Dokumen Panduan` (`Edit Guideline` - `Gambar 48`)** dengan field yang telah terisi data dokumen saat ini:
   - Field `Judul Dokumen Guideline *`, `Distribusi Peran & Perangkat *`, dan `Nomor Revisi & Catatan` terisi nilai aktif saat ini.
   - Bagian `Guideline File` menampilkan kartu berkas PDF yang sedang terpasang lengkap dengan ikon dokumen, nama berkas, ukuran berkas dalam `KB` / `MB` (contoh: `SOP-TPM-01-Rev2.1.pdf`, `1.8 MB`), serta **ikon tempat sampah (hapus berkas)** di sisi kanan kartu berkas sesuai `Gambar 48`.
   - Tombol aksi primer lebar penuh `Simpan Perubahan` (`Save`) dan tombol sekunder lebar penuh `Batal` (`Discard`).
2. Perilaku penggantian berkas dan penyimpanan pada modal `Edit Guideline`:
   - Apabila pengguna hanya mengubah `Judul`, `Distribusi Peran`, atau `Nomor Revisi` tanpa menghapus kartu berkas PDF yang ada, menekan `Simpan Perubahan` memperbarui metadata dokumen dan mempertahankan berkas PDF lama.
   - Apabila pengguna menekan ikon tempat sampah pada kartu berkas PDF (atau tombol `Ganti Berkas`), kartu berkas lama digantikan oleh area *dropzone* `PDF File (max 10MB)` sehingga pengguna wajib memilih berkas PDF pengganti baru; tombol `Simpan Perubahan` menolak penyimpanan apabila berkas lama sudah dilepas tetapi berkas PDF baru belum dipilih.
   - Berkas PDF pengganti melewati validasi tipe `application/pdf` dan batas ukuran `<= 10 MB` yang sama dengan Bagian E.3, dan setelah tersimpan otomatis memperbarui berkas yang dibaca pada Aplikasi Web maupun `Panel HMI-T7`.
3. Saat `Admin / Manager` atau `SuperAdmin` menekan ikon tempat sampah pada baris dokumen di daftar panel kiri (`Gambar 47`):
   - Sistem selalu menampilkan modal konfirmasi penghapusan/pengarsipan dokumen terlebih dahulu.
   - Setelah dikonfirmasi, dokumen dinonaktifkan/diarsipkan dari daftar baca aktif di Aplikasi Web dan `Panel HMI-T7`, pratinjau berpindah ke dokumen aktif berikutnya, dan aksi dicatat ke *Audit Log*.

**G. Proteksi Integritas Historis Downtime Reason, Audit Trail, dan Aksesibilitas Keyboard**
1. Demi menjaga keutuhan perhitungan Pareto *Six Big Losses* historis (*dilarang hard delete data historis produksi*):
   - Alasan *Downtime / Loss* yang sudah pernah direferensikan oleh rekaman `DowntimeEvent`, `ProductionLog`, atau `ShiftReport` **tidak boleh dihapus permanen (`hard delete`)** dan **tidak boleh diubah lintas pilar `Kategori Loss`** secara surut; untuk alasan yang tidak digunakan lagi, sistem menyediakan status **Nonaktif (`is_active = false`)** sehingga tidak muncul pada pilihan operator di `Panel HMI-T7` untuk shift baru, namun label historis pada laporan lama tetap utuh.
   - Apabila pabrik membutuhkan pemetaan alasan yang sama ke pilar *Kategori Loss* baru, pengguna menonaktifkan kode lama dan membuat kode alasan baru untuk periode berjalan.
2. Seluruh transaksi penambahan, pengubahan, dan penonaktifan `Downtime Reason` maupun pengunggahan, penggantian berkas, pengeditan metadata, dan pengarsipan dokumen `Guideline SOP` wajib tercatat otomatis ke *Audit Log* (**Main Task 17**) lengkap dengan `timestamp`, `user_id`, dan rincian perubahan.
3. Seluruh kontrol interaktif pada sub-sidebar `Area`, filter kategori, tabel `Downtime Reason`, daftar & pembaca PDF `Guideline`, serta seluruh modal mendukung operasi keyboard penuh (`Tab`, `Enter`, `Esc`) dengan indikator *focus ring* `2px` `#FF4081`.

## Catatan
- **Penambahan Kolom Input `Kode Alasan *` & `Kode Register PLC-ABC` pada Modal `Add Downtime Reason` (`Gambar 49` vs `Gambar 50` URS)**: Pada `Gambar 49 Mockup Downtime Reason` tabel menampilkan kolom `Code` (`AB`) dan `Tabel 8` URS mendefinisikan `Code Trouble`, tetapi pada `Gambar 50 Mockup Add Downtime Reason` field input `Code` terlewat tidak tergambar di dalam modal. Selaras dengan desain `[LINGKUP WEB] 20` di [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) dan spesifikasi integrasi `PLC-ABC`, field `Kode Alasan *` dan `Kode Register PLC-ABC` (`D001` / `D009`) disertakan secara eksplisit di dalam modal `Tambah / Edit Alasan Downtime`.
- **Ketiadaan Gambar Mockup `Edit Downtime Reason` Terpisah di URS**: Pada `Gambar 49` setiap baris tabel `Downtime Reason` memiliki ikon `Edit` di ujung kanan, namun URS tidak menyertakan gambar terpisah untuk modal *Edit Downtime Reason*. Pada AC Bagian C, aksi ikon `Edit` tersebut menggunakan struktur modal yang sama dengan `Gambar 50` dalam keadaan *pre-filled* beserta proteksi integritas pilar loss historis (Bagian G.1).
- **Koreksi Salah Ketik Label Mockup Guideline & Format Berkas (`Gambar 46-48` vs Teks URS Baris 3390)**: Pada `Gambar 46` dan `Gambar 47` URS terdapat salah ketik judul `"Upload Guidelineline"` dan `"User Guidelineline"`, serta ekstensi contoh `"Guideline-FINAL.PFD"` pada `Gambar 48`; seluruhnya dikoreksi menjadi istilah baku (`Upload Guideline` / `Guideline SOP` dan `.pdf`). Selain itu, teks URS baris 3390 sempat menyebut kata `"SCROM"` (salah ketik dari SCORM), namun `Gambar 46` secara eksplisit menetapkan batas **`PDF File (max 10MB)`**; spesifikasi ini menstandarkan format dokumen pada **PDF maksimal 10 MB** agar dapat dirender secara ringan dan konsisten baik di peramban Web maupun di layar sentuh embedded `Panel HMI-T7` tanpa ketergantungan pemutar paket eksternal.
