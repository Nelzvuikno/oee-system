# Main Task 12: Aplikasi Web - Monitoring Real-Time Production Active Multi-Lini, Detail Lini, dan Koreksi Downtime oleh Supervisor

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 06`, `[LINGKUP WEB] 07`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.6` Gambar 20, `19.2.20` Gambar 63, `19.2.21` Gambar 64-65, & Tabel 15 baris 3255-3324) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)` dapat memantau status operasi seluruh lini dan mesin pengemasan garam secara *real-time* dalam satu layar **`Production Active`** (mencakup status jalan/berhenti `PLC-ABC`, kecepatan aktual, progres `Finish Good` terhadap target, indikator sensor suhu/getaran, dan pita *Event Timeline* per shift), melakukan *drill-down* ke halaman **`Line Detail`** untuk menganalisis indikator `OEE`, `MTTR`, `MTBF`, ringkasan `Losses`, grafik **`Waterfall Analysis`**, dan daftar kejadian henti mesin, serta melakukan pengisian atau koreksi klasifikasi **`Downtime Reason`** oleh Supervisor tanpa dapat mengubah *timestamp* asli `Start`, `End`, maupun `Duration` dari `PLC-ABC`.

## Prasyarat
- Pengguna telah login pada Aplikasi Web dengan peran `Shift Leader` (halaman *landing default* pasca-login), `Supervisor (SPV)`, `Admin / Manager`, atau `SuperAdmin (OT/IT)` (mengikuti **Main Task 01**).
- Struktur hierarki `Area`, `Line`, `Machine`, dan `Sub-Machine` beserta alamat akuisisi `PLC-ABC` telah terdaftar aktif pada **Main Task 02**.
- Master `SKU` & `Ideal Cycle Time` (**Main Task 04**) serta Master `Downtime Category & Reason` (**Main Task 05**) telah tersedia aktif.
- Layanan akuisisi Edge `Gateway GW-100` dan *Rule Engine* OEE pada server `VM1` (**Main Task 06**) telah berjalan menyuplai aliran telemetri WebSocket (`D000-D012`) dari mesin maupun pencatatan order/alasan dari `Panel HMI-T7` (**Main Task 08 & 09**).

## User Journey
- Setelah login ke Aplikasi Web, `Supervisor (SPV)` atau `Shift Leader` membuka menu **`Production Running > Production Active`** (`[LINGKUP WEB] 06` / `Gambar 63`) untuk memantau kondisi seluruh mesin pengemasan pada shift berjalan.
- Pengguna memfilter cakupan `Area` (contoh: `Unit 2 Garam Konsumsi`) dan `Line` (contoh: `Semua Mesin Packing`), lalu mengamati kartu-kartu status lini yang memperbarui data secara *live* tanpa perlu memuat ulang halaman:
  - Kartu mesin yang sedang berjalan (`[■ RUN] D000=1`),
  - Kartu mesin yang sedang mengalami gangguan/henti darurat (`[● FAULT / STOP] D000=2/3`) beserta pita peringatan alarm diagnostik,
  - Kartu mesin yang sedang sinkronisasi awal (`[SYNCING]`), dan
  - Kartu mesin yang sedang tidak memiliki jadwal order aktif (`[STANDBY] D000=0`).
- Melihat adanya peringatan henti mesin atau ingin memeriksa performa detail `Mesin Packing #6`, Supervisor mengklik tombol **`Buka Line Detail`** pada kartu mesin tersebut sehingga sistem membuka halaman **`Line Detail`** (`[LINGKUP WEB] 07` / `Gambar 20 & 64`).
- Pada halaman `Line Detail`, Supervisor meninjau ringkasan `SKU`, `Production Order`, persentase `OEE` (`Availability`, `Performance`, `Quality`, `Achievement Rate`), volume `Finish Good`, `Target`, `Reject`, `Rework / Scrap`, pita penuh **`Event Timeline`**, kartu keandalan **`Run Time, MTTR, MTBF`**, kartu ringkasan **`Losses`** (dilengkapi pintasan `↗` menuju analitik mendalam **Main Task 14**), grafik **`Waterfall Analysis`**, serta tabel riwayat **`Downtime Events`** di bagian bawah halaman.
- Apabila Supervisor menemukan baris kejadian downtime yang belum sempat diisi oleh operator lapangan (ditandai sorotan merah `Unplanned Downtime | Unknown action`) atau klasifikasi kategori *Six Big Losses*-nya perlu diluruskan sebelum laporan shift dikunci, Supervisor mengklik menu aksi **`Edit`** pada baris tersebut (atau tombol **`Isi Alasan Downtime`** dari kartu `Production Active`).
- Sistem menampilkan panel samping (*slide-over drawer* / modal) **`Edit Downtime Reason`** (`Gambar 65`) dengan field waktu `Start`, `End`, `Duration`, `Machine`, `Production No.`, `Sumber Trigger PLC-ABC`, dan `Input by` dalam kondisi terkunci (*read-only*).
- Supervisor memilih `Kategori Six Big Losses *`, memilih `Alasan Downtime *` (beserta `Sub-Machine` bila terkait kerusakan komponen), melengkapi `Detail Reason *` dan *tag* `Tindakan Perbaikan (Action) *`, lalu mengklik **`Simpan Klasifikasi`**.
- Sistem menyimpan koreksi, menghitung ulang metrik `OEE`, `MTTR/MTBF`, dan `Waterfall Analysis` secara seketika, menyinkronkan pembaruan alasan kembali ke `Panel HMI-T7`, serta merekam perubahan *before -> after* ke dalam *Audit Log*.

## Acceptance Criteria:

**A. Hak Akses Peran (RBAC) & Penyegaran Data *Real-Time* WebSocket**
1. Halaman `Production Active` dan `Line Detail` dapat diakses oleh seluruh peran Aplikasi Web (`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)`), serta menjadi halaman tujuan utama (*default landing page*) sesaat setelah `Shift Leader` berhasil login (**Main Task 01**).
2. Aksi **`Isi / Edit Downtime Reason`** (`Gambar 65`) hanya diizinkan bagi peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)` **selama laporan shift (`ShiftReport` pada Main Task 16) yang menaungi kejadian downtime tersebut belum berstatus `Released`**.
3. Pembaruan status register `PLC-ABC` (`D000-D012`), kuantitas output, durasi henti mesin aktif, serta perubahan klasifikasi downtime dari `Panel HMI-T7` wajib didorong secara *real-time* melalui koneksi WebSocket (interval pembaruan UI `<= 2 detik`) tanpa memerlukan *manual page refresh* di peramban.

**B. Halaman `Production Active` - Pemantauan Multi-Lini Pabrik (`[LINGKUP WEB] 06` - URS 19.2.20 Gambar 63)**
1. Header dan bilah filter atas menampilkan:
   - Judul halaman `Production Active` dan *breadcrumb* aktual `Production Running > Production Active` (tanpa teks placeholder `Heading > Heading > Heading`).
   - Dropdown filter **`Area`**: memuat daftar `Area` aktif dari **Main Task 02** (secara *default* memilih area utama pengguna atau `Semua Area`).
   - Dropdown filter **`Line / Jalur`**: memuat daftar `Line` aktif di bawah `Area` terpilih (secara *default* `Semua Lini / Semua Mesin Packing`).
   - Penanda **`Shift Aktif`** (contoh: `Shift 1 (07:00 - 15:00)` mengikuti jam kerja server `VM1`, dengan opsi melihat status shift berjalan secara langsung).
   - **Legenda Pita Waktu (`Timeline Legend`)** dengan pembeda warna sekaligus simbol bentuk yang aksesibel (selaras **Main Task 08**):
     - `[■ Hijau]` `Run Time`
     - `[▲ Biru]` `Planned Downtime`
     - `[● Merah]` `Unplanned Downtime`
     - `[◆ Kuning]` `Small Stop / Idle`
     - `[Abu-abu]` `Available Time` (sisa rentang waktu shift yang belum berjalan atau kondisi *standby*).
2. Area konten utama menampilkan *grid* responsif (2 kolom pada layar desktop `>= 1280 px`, 1 kolom pada layar tablet) berisi **Kartu Lini / Mesin (*Multi-Line Live Cards*)** yang wajib mendukung 4 *state* operasional secara lengkap (`[LINGKUP WEB] 06`):
   - **State 1 - `RUNNING` (`PLC-ABC D000 = 1`)**:
     - Header kartu: label `Area | Alamat IP PLC-ABC`, nama `Line / Machine` (contoh: `Mesin Packing #6`), dan *badge* hijau **`[■ RUN] D000=1 | <kecepatan aktual D002> pcs/mnt`**.
     - Baris informasi order: `SKU Aktif` (`Kode SKU + Nama`), `Production Order` (`Nomor PO`), serta `OEE Real-Time (%)` beserta ringkasan `Quality (%)`.
     - Baris progres produksi: persentase `Achievement Rate` (`Finish Good / Target x 100%`) atau `Yield`, angka `Finish Good (pcs)`, `Target (pcs)`, `Total Produksi (pcs)`, dan `Cacat / Reject (pcs)`, diikuti bilah progres visual.
     - Pita horizontal **`Shift Event Timeline Bar`** sesuai rentang jam shift aktif (contoh sumbu jam `07:00`, `09:00`, `11:00`, `13:00`, `15:00`) yang menampilkan segmen warna kronologis operasi mesin sejak awal shift; mengarahkan kursor (*hover*) pada segmen menampilkan *tooltip* jenis status, jam `Start - End`, durasi, dan alasan downtime.
     - Baris bawah (*footer*): indikator ringkas sensor kritis *live* (`SEN-T01: <suhu D005> C | SEN-V01: <vibrasi D006> mm/s` beserta status `Normal / Warning / Critical`) dan tombol **`Buka Line Detail`**.
   - **State 2 - `UNPLANNED DOWNTIME / FAULT` (`PLC-ABC D000 = 2` atau `D000 = 3`)**:
     - Header kartu menampilkan *badge* merah berkedip halus **`[● STOP / FAULT] D000=<2/3> | Stop <MMm SSs>`** dengan penghitung durasi henti yang terus bertambah setiap detik.
     - Menampilkan **Pita Peringatan Diagnostik (`Fault Alert Banner`)** berwarna merah muda/merah kontras tinggi yang memuat kode pemicu `D001` atau pelanggaran ambang sensor (contoh: `Alarm D001=4: Suhu Elemen Heater Sealer Drop (118C < 155C)`) serta keterangan apakah operator `Panel HMI-T7` sudah mengonfirmasi alasan downtime atau masih menunggu input.
     - Pita `Shift Event Timeline Bar` menampilkan segmen merah aktif di ujung waktu berjalan.
     - Baris bawah menampilkan capaian sementara (`SKU | Output Sementara: <Good> / <Target> pcs`) serta tombol pintas **`Isi Alasan Downtime`** (membuka modal `Gambar 65` secara langsung) di samping tombol **`Buka Line Detail`**.
   - **State 3 - `LOADING / SYNCING` (Jabat Tangan Awal `GW-100`)**:
     - Menampilkan kartu *skeleton loading* dengan *badge* `[SYNCING] GW-100 Handshake...`, indikator progres pembacaan paket register `D000-D012`, serta mekanisme *automatic retry* tanpa memblokir render kartu mesin lain yang sudah terhubung.
   - **State 4 - `EMPTY / STANDBY` (`PLC-ABC D000 = 0` & Tidak Ada `Production Order` Aktif)**:
     - Menampilkan *badge* netral `[STANDBY] D000=0`, informasi jelas bahwa belum ada `Production Order` aktif pada jalur tersebut untuk shift berjalan, catatan waktu operasi terakhir (contoh: `Terakhir beroperasi: Shift 3 kemarin`), serta panduan memulai order melalui `Panel HMI-T7`.

**C. Halaman `Line Detail` - Header, Ringkasan KPI Lini, & Pita *Event Timeline* (`[LINGKUP WEB] 07` - URS 19.2.6 Gambar 20 & 19.2.21 Gambar 64)**
1. Mengklik salah satu kartu lini atau tombol `Buka Line Detail` pada `Production Active` mengarahkan pengguna ke halaman **`Line Detail`** untuk mesin/lini tersebut.
2. Bilah sub-header atas `Line Detail` (`Gambar 20 & 64`) wajib menyediakan:
   - Tombol kembali `<- <Nama Line / Mesin>` menuju halaman `Production Active` beserta *breadcrumb* `Production Running > Production Active > <Nama Line / Mesin>`.
   - Keterangan waktu pembaruan terakhir `Last updated at: DD/MM/YYYY, HH:mm:ss` yang diperbarui otomatis setiap paket telemetri diterima.
   - Tombol **`Download PDF`**: mengekspor laporan ringkasan kondisi `Line Detail` saat itu (mencakup metadata order, KPI OEE, MTTR/MTBF, grafik Waterfall, dan tabel Downtime) ke dalam berkas PDF siap cetak dengan nama berkas `LineDetail_<KodeMesin>_<YYYYMMDD_HHmm>.pdf`.
   - Dropdown pemindah cepat **`Go to another line`** di sudut kanan atas: memuat daftar pasangan `Area - Line/Machine` aktif sehingga pengguna dapat berpindah langsung memantau mesin lain tanpa harus kembali ke layar `Production Active`.
3. **Kartu Ringkasan Utama Lini (`Line Summary Card`)** di bagian atas halaman menampilkan:
   - **Baris Metadata Order**: `SKU` (`Kode SKU - Nama Produk`), `Production Order` (`Nomor PO`), `Area` (`Nama Area`), dan `Created By` (nama akun `Operator` yang memulai order produksi di `Panel HMI-T7`).
   - **Baris Persentase KPI OEE**:
     - `OEE (%)` (`Availability x Performance x Quality`, dengan pewarnaan indikator merah `< 75.00%`, kuning `75.00% - 84.99%`, hijau `>= 85.00%` standar JIPM),
     - `Availability (%)`,
     - `Performance (%)`,
     - `Quality (%)`, dan
     - `Achievement Rate (%)` (`Finish Good / Production Target x 100%`).
   - **Baris Kuantitas Produksi & Henti Mesin**:
     - `Finish Good` (dalam `pcs` dan ekuivalen `kg`),
     - `Production Target` (`pcs`),
     - `Total Production` (`pcs`),
     - `Actual Production` (`pcs`),
     - `Total Downtime` (akumulasi durasi henti dalam `menit`),
     - `Downtime Freq.` (jumlah frekuensi kejadian henti mesin `<N>x`),
     - `Reject / Process Defect` (`pcs`), dan
     - `Rework / Scrap K3` (`pcs`).
   - **Pita Penuh `Event Timeline Bar`** (`07:00 .. 15:00` / sesuai jam shift aktif) beserta legenda status di bawahnya dan *hover tooltip* interaktif pada setiap segmen kejadian.

**D. Kartu Keandalan (`Run Time, MTTR, MTBF`) & Kartu Ringkasan `Losses` (`[LINGKUP WEB] 07` - URS Gambar 20 & 64)**
1. **Kartu Kiri - Indikator Keandalan Operasi (`Run Time, MTTR, MTBF`)**:
   - `Run Time`: menampilkan durasi aktual waktu operasi aktif mesin (`Operating Time` dalam format `Xj Ym Zs` dan total `menit`).
   - `MTTR` (*Mean Time To Repair*): dihitung otomatis menggunakan formula `Total Durasi Equipment Failure (L-01) / Jumlah Kejadian Breakdown (L-01)`. Apabila tidak terdapat kejadian *Equipment Failure* (`Jumlah Breakdown = 0`), sistem menampilkan `0m (0 Breakdown)` secara aman tanpa kesalahan pembagian nol.
   - `MTBF` (*Mean Time Between Failures*): dihitung otomatis menggunakan formula `Operating Time (Run Time) / Jumlah Kejadian Breakdown (L-01)`. Apabila `Jumlah Breakdown = 0`, sistem menampilkan `Run Time Penuh (0 Breakdown)` / `N/A` secara jelas dan tidak menyalin angka statis yang sama dengan `MTTR`.
2. **Kartu Kanan - Ringkasan `Losses` & Pintasan Analitik Mendalam (`↗`)**:
   - Menampilkan grafik batang horizontal komparatif durasi kehilangan waktu produksi (*time loss equivalent* dalam format `Xj Ym` / `menit`) untuk 3 kelompok kerugian:
     1. **`Availability Loss`**: total waktu henti mesin (`Unplanned Downtime` + referensi `Planned Downtime` sesuai filter konfigurasi).
     2. **`Quality Loss`**: ekuivalen waktu produksi yang terbuang akibat produk cacat dan scrap (`(Reject + Rework/Scrap) x Ideal Cycle Time`).
     3. **`Performance Loss`**: waktu produksi yang hilang akibat `Idle & Minor Stoppages (L-03)` serta penurunan kecepatan `Reduced Speed (L-04)`.
   - Di sudut kanan atas kartu `Losses` terdapat tombol ikon panah **`↗` (`Buka Detail Analitik Losses`)**: saat diklik, mengarahkan pengguna ke halaman analitik mendalam **Availability Loss, Performance Loss, dan Quality Loss** (**Main Task 14**) dengan parameter filter `Area`, `Line/Machine`, dan `Shift/Tanggal` yang otomatis terbawa (*pre-applied*).

**E. Grafik `Waterfall Analysis` Penyusutan Waktu Produksi (`[LINGKUP WEB] 07` - URS Gambar 20 & 64 & Baris 3271-3275)**
1. Kartu **`Waterfall Analysis`** memvisualisasikan air terjun penyusutan waktu produksi dari total waktu tersedia hingga waktu bernilai tambah bersih dalam satuan `menit` (dan `jam` pada sumbu/label) dengan urutan batang yang konsisten terhadap *Rule Engine* **Main Task 06**:
   - **`Available Time`** (abu-abu, waktu kalender shift/harian, contoh `480 mnt/shift` atau `1,440 mnt/hari`),
   - Dikurangi potongan **`Planned Downtime`** (label durasi di atas batang potongan) -> menghasilkan batang **`Loading / Production Time`** (biru, contoh `1,215 mnt`),
   - Dikurangi potongan **`Unplanned Downtime`** (`L-01` & `L-02`, merah) -> menghasilkan batang **`Operating Time (-DT)`** (biru, contoh `1,104 mnt`),
   - Dikurangi potongan **`Idle & Minor Stoppages`** (`L-03`, kuning) dan **`Reduced Speed`** (`L-04`, kuning/oranye) -> menghasilkan batang **`Net Operating Time`** (biru, contoh `755 mnt`; dapat menampilkan tahap antara `Active Operating (-Idle)` `874 mnt` sesuai rincian Tabel 13 jurnal),
   - Dikurangi potongan **`Quality Loss`** (`Reject / Process Defect L-05` dan `Rework / Scrap K3 L-06`, oranye/merah) -> menghasilkan batang akhir **`Value Added Time / Finish Good`** (hijau, contoh `745 mnt`).
2. Apabila terjadi kondisi anomali pembacaan di mana output melebihi kapasitas teoritis `Ideal Cycle Time` (`Up Speeds` / `Anomali Finish Good` sesuai URS baris 3274-3275), grafik menampilkan indikator penanda anomali berlabel jelas agar `Supervisor` dan `SuperAdmin` dapat memeriksa akurasi parameter `Ideal Cycle Time` SKU (**Main Task 04**) atau kalibrasi sensor `CNT-G01`.
3. Mengarahkan kursor (*hover*) pada setiap batang menampilkan *tooltip* berisi nama komponen waktu, durasi (`menit` & `jam`), persentase terhadap `Available Time` dan `Loading Time`, serta jumlah ekuivalen kemasan `pcs`.

**F. Tabel `Downtime Events` pada Halaman `Line Detail` (`[LINGKUP WEB] 07` Bawah - URS Gambar 20 & 64)**
1. Bagian bawah halaman `Line Detail` menampilkan tabel seluruh kejadian henti mesin pada lini dan shift tersebut, diurutkan secara *default* berdasarkan kejadian terbaru atau kejadian yang belum diklasifikasi berada di urutan teratas.
2. Kolom yang wajib ditampilkan pada tabel `Downtime Events`:
   - `Machine / Sub-Machine` (nama mesin beserta sub-mesin bila telah teridentifikasi),
   - `Tag PLC` (register pemicu `PLC-ABC`, contoh: `D001=2`, `D001=3`, `D009=1`),
   - `Downtime Category` (kategori *Six Big Losses* hasil klasifikasi),
   - `Reason` (alasan spesifik downtime),
   - `Action` (daftar *chip/tag* tindakan penanganan yang diambil),
   - `Downtime Start` (`DD/MM/YYYY, HH:mm:ss`),
   - `Downtime End` (`DD/MM/YYYY, HH:mm:ss`, atau `- (Ongoing)` apabila mesin masih berhenti),
   - `Duration` (durasi dalam `menit` / `Xm Ys`), dan
   - `Aksi` (menu tiga titik `⋮` atau tombol aksi langsung).
3. **Sorotan Visual Baris Downtime Belum Diklasifikasi (`Unreasoned Row`)**:
   - Apabila kejadian henti mesin otomatis dari `PLC-ABC` belum diisi alasannya oleh operator di `Panel HMI-T7`, baris tersebut wajib ditandai secara mencolok dengan teks peringatan merah pada kolom kategori, alasan, dan tindakan (`Unplanned Downtime | Belum Diisi | Unknown action` sesuai baris pertama `Gambar 20 & 64`) agar Supervisor segera menindaklanjutinya sebelum penutupan shift.
4. **Opsi Menu `Aksi` Berdasarkan Status Penguncian Shift**:
   - `View detail`: menampilkan rincian lengkap kejadian downtime (termasuk `Input by`, `Last Corrected by`, `Detail Reason`, dan log waktu PLC) dalam mode baca saja.
   - `Edit`: membuka panel/modal **`Edit Downtime Reason` (`Gambar 65`)** bagi peran yang berwenang (Bagian A.2) selama laporan shift belum `Released`.
   - `[Locked]`: ditampilkan menggantikan opsi `Edit` apabila laporan shift terkait telah berstatus **`Released`** (**Main Task 16**), dilengkapi *tooltip* `"Laporan shift telah di-release dan dikunci permanen"`.

**G. Panel Samping / Modal `Edit Downtime Reason` oleh Supervisor (`[LINGKUP WEB] 07` - URS Gambar 65 & Baris 3322-3324)**
1. Saat `Edit` diklik pada baris downtime (atau `Isi Alasan Downtime` dari kartu `Production Active`), sistem membuka panel samping (*slide-over drawer* kanan sesuai `Gambar 65` atau dialog modal terfokus) berjudul **`Edit Downtime (<Kode Kejadian>)`** dengan tombol tutup `X`.
2. **Aturan Mutlak Imutabilitas Rekaman Waktu & Identitas PLC (URS Baris 3323-3324)**:
   - Seluruh field fakta mesin berikut wajib ditampilkan dalam keadaan **terkunci (*read-only / disabled*)** dan ditolak di tingkat API apabila dimodifikasi pada *payload* permintaan:
     - `Sumber Trigger PLC-ABC` (contoh: `Register D000=2 (STOP) | D001=2`),
     - `Machine` (ditampilkan satu kali secara tunggal),
     - `Production No. / Production Order`,
     - `Start` (*timestamp* mulai henti dari `PLC-ABC`),
     - `End` (*timestamp* selesai henti dari `PLC-ABC`, atau `Masih Berlangsung`),
     - `Duration` (durasi hasil kalkulasi `End - Start`), dan
     - `Input by` (nama akun `Operator` `Panel HMI-T7` yang mengisi awal, atau `PLC-AUTO (Belum Diisi)` bila belum pernah diisi di HMI, ditambah informasi `Last Corrected by` jika sudah pernah dikoreksi).
3. **Field Klasifikasi yang Dapat Diedit oleh Supervisor**:
   - `Downtime Category / Kategori Six Big Losses *`: *dropdown* wajib pilih yang memuat kategori aktif dari Master Downtime (**Main Task 05**: `Planned Downtime`, `L-01 Equipment Failure`, `L-02 Setup & Adjustment`, `L-03 Idle & Minor Stoppages`).
   - `Sub-Machine`: *dropdown* komponen `Sub-Machine` milik mesin terkait (**Main Task 02**); bersifat wajib pilih apabila kategori yang dipilih adalah `L-01 Equipment Failure`.
   - `Reason / Alasan Downtime *`: *dropdown* berjenjang wajib pilih yang otomatis memuat daftar alasan downtime aktif pada **Main Task 05** sesuai kombinasi `Machine` dan `Downtime Category *` terpilih.
   - `Detail Reason *`: area teks multi-baris wajib isi (minimal 10 karakter, tanpa teks *dummy* *Lorem Ipsum*) untuk mencatat kronologi teknis atau catatan verifikasi Supervisor.
   - `Action / Tindakan Perbaikan *`: komponen *multi-tag chips* disertai input penambahan *tag* tindakan perbaikan konkret yang dilakukan (wajib minimal 1 *tag* tindakan terisi; setiap *tag* dapat dihapus dengan ikon `x` sebelum disimpan).
4. **Validasi, Penyimpanan, Rekalkulasi OEE, & Jejak Audit**:
   - Tombol `Batal` (`Discard`) menutup panel tanpa menyimpan perubahan (memunculkan konfirmasi apabila terdapat perubahan form yang belum disimpan).
   - Saat tombol primer **`Simpan Klasifikasi`** (`Save`) diklik dan validasi lolos:
     1. Sistem memperbarui klasifikasi kejadian downtime di server `VM1`.
     2. Sistem langsung menghitung ulang (*recalculate*) nilai `Availability`, `Performance`, `OEE`, `MTTR`, `MTBF`, ringkasan `Losses`, dan batang `Waterfall Analysis` pada shift/order terkait serta memperbarui tampilan `Line Detail` dan `Production Active` secara seketika.
     3. Sistem menyinkronkan alasan downtime yang baru ke `Panel HMI-T7` mesin tersebut (apabila kejadian tersebut sebelumnya masih memunculkan *pop-up interlock* `Belum Diisi` di `Panel HMI-T7` **Main Task 09**, *pop-up* otomatis tertutup dan beralih ke status terklasifikasi).
     4. Sistem merekam perubahan nilai lama ke nilai baru (*before -> after*), waktu perubahan, dan akun pengubah ke `Log Activity` mesin (**Main Task 10**) serta **Audit Log** terpusat Aplikasi Web (**Main Task 17**).

## Catatan
- **Konsolidasi Duplikasi Mockup `Gambar 20` (`Bab 19.2.6`, Halaman 56) dengan `Gambar 64` (`Bab 19.2.21`, Halaman 85) & Sub-Menu `Area / Line`**: Pada dokumen PDF URS, gambar yang ditempel pada `19.2.6 Gambar 20 Mockup Production Running` identik sama persis dengan `19.2.21 Gambar 64 Mockup Line Detail` (`<- Line 2`), sementara pada *sidebar* mockup tertulis item `Area` dan `Line` di atas `Production Active` tanpa spesifikasi maupun layar tersendiri (serta terdapat duplikasi item `SKU` dan `Reject Reason` di bawah *Configuration* pada *sidebar* `Gambar 64-65`). Sesuai struktur navigasi bersih yang ditetapkan pada **Main Task 01**, pemantauan multi-lini dikonsolidasikan pada halaman **`Production Active`** (menggunakan filter `Area` dan `Line` di bagian atas) yang berlanjut langsung ke **`Line Detail`**.
- **Koreksi Duplikasi Field `Machine *` & Teks *Lorem Ipsum* pada `Gambar 65` (`Halaman 86 URS`)**: Pada mockup `Gambar 65` (*Edit Downtime Reason*), field `Machine *` tercetak dua kali (pada baris ke-1 dan baris ke-5), sementara `Detail Reason *` dan *chip* `Action *` berisi teks semu `"Lorem ipsum dolor sit amet..."`. Pada implementasi sistem (AC Bagian G.2-G.3), field `Machine` hanya ditampilkan satu kali dalam mode *read-only* dan seluruh input bebas dari teks *Lorem Ipsum*.
- **Koreksi Nilai Statis `MTTR = MTBF = Run Time` & Breadcrumb `Heading` pada `Gambar 63-64`**: Pada `Gambar 63`, *breadcrumb* tertulis `Heading > Heading > Heading`; dan pada `Gambar 64`, angka `Run Time`, `MTTR`, serta `MTBF` ketiganya menyalin teks statis yang sama (`12h 59m 34s`). AC Bagian C.2 dan Bagian D.1 telah menetapkan struktur *breadcrumb* aktual serta rumus perhitungan `MTTR` dan `MTBF` yang terpisah beserta penanganan aman saat `Jumlah Breakdown = 0`.
