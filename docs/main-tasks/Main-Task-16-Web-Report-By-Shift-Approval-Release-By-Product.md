# Main Task 16: Aplikasi Web - Laporan Otomatis Report by Shift, Alur Persetujuan Berjenjang (Approval & Release), dan Report by Product

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 14`, `[LINGKUP WEB] 15`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.19` Gambar 55-62 & Tabel 15-17 baris 2947-3027, 3190-3260) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
Sistem secara otomatis mengompilasi laporan kinerja produksi setiap pergantian shift ke dalam modul **`Report > By Shift`** dan **`Report > By Product`**, sehingga `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)` dapat meninjau rincian `OEE`, pita `Event Timeline`, rincian per nomor order (`No.PRO`) dengan konversi satuan kemasan (`pcs`, `karton`, `kg`), `MTTR / MTBF`, `Losses`, `Waterfall Analysis`, `Log Activity` shift, serta daftar `Downtime`, lalu menjalankan **Alur Persetujuan Berjenjang (`NEEDS APPROVAL` -> `APPROVED` -> `RELEASED`)** yang mengunci integritas data produksi secara permanen untuk keperluan audit manajemen dan ekspor laporan resmi (`.pdf` / `.csv`).

## Prasyarat
- Pengguna telah login pada Aplikasi Web dengan peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, atau `SuperAdmin (OT/IT)` (mengikuti **Main Task 01**).
- Struktur aset `Area`, `Line`, dan `Machine` (**Main Task 02**), Master `SKU` beserta konversi hierarki kemasan & bobot bersih (**Main Task 04**), serta Master `Downtime Category & Reason` (**Main Task 05**) telah terdaftar aktif.
- Layanan *Rule Engine* OEE pada server `VM1` (**Main Task 06**) telah merekam telemetri shift, pencatatan order produksi & reject/scrap dari `Panel HMI-T7` (**Main Task 08**), serta klasifikasi downtime (**Main Task 09 & 12**).

## User Journey
- Tepat saat jam shift berakhir (`Shift 1: 15:00`, `Shift 2: 23:00`, `Shift 3: 07:00`), sistem menerbitkan rekaman laporan otomatis berstatus **`[● NEEDS APPROVAL]`** dan mengirimkan notifikasi peninjauan kepada `Shift Leader` dan `Supervisor (SPV)` (**Main Task 17**).
- Pengguna membuka menu **`Report > By Shift`** (`[LINGKUP WEB] 14` / `Gambar 55`), memfilter `Area` (`Unit 2 Garam Konsumsi`), memilih lini pada panel daftar `Line` di sisi kiri (contoh: `Mesin Packing #6`), memilih `Tahun`, `Bulan`, dan `Shift`, lalu mengklik ikon mata **`👁`** pada baris shift berstatus `NEEDS APPROVAL`.
- Pada halaman **`Detail Report by Shift`** (`Gambar 56`), `Supervisor (SPV)` memeriksa skor `OEE / A / P / Q`, pita `Event Timeline`, membuka *accordion* masing-masing **`No.PRO - Product`** yang berjalan pada shift tersebut untuk memverifikasi angka `Finish Good` (`pcs`, `karton`, dan `kg`), `Reject`, serta `Rework / Scrap K3`, membuka panel **`Log activity`** untuk mengaudit aktivitas operator selama shift, dan memeriksa tabel **`Downtime`** di bagian bawah.
- Apabila masih terdapat baris downtime yang belum terklasifikasi, `SPV` melengkapinya terlebih dahulu melalui menu `Edit`; setelah seluruh data valid, `SPV` mengklik tombol biru **`✓ Approve`** di kanan atas sehingga status laporan naik menjadi **`[▲ APPROVED]`** (`Gambar 57`) dan tombol aksi beralih menjadi **`✓ Release`** untuk tahap pengesahan akhir.
- `Admin / Manager` (atau pejabat rilis yang berwenang) membuka laporan berstatus `APPROVED` tersebut (`Gambar 57`), melakukan verifikasi akhir, lalu mengklik tombol **`✓ Release`** dan mengonfirmasi penguncian laporan sehingga status berubah menjadi **`[■ RELEASED]`** (`Gambar 58`), tombol edit downtime terkunci permanen (`[Locked]`), dan dokumen siap diunduh melalui tombol **`Download`**.
- Untuk mengevaluasi capaian kuantitas, *yield* kualitas, dan konversi kemasan spesifik per SKU garam lintas shift/batch, pengguna membuka menu **`Report > By Product`** (`[LINGKUP WEB] 15` / `Gambar 60`), memfilter `Product / SKU` (contoh: `SKU-GRM-250 Garam Beryodium 250g`), lalu membuka **`Detail Report by Product`** (`Gambar 61-62`) untuk meninjau maupun menyetujui/merilis laporan per batch produk.

## Acceptance Criteria:

**A. Pembentukan Otomatis Laporan Shift & Mesin Status Persetujuan Berjenjang (*Approval & Release Workflow*)**
1. Sistem wajib membentuk draf laporan otomatis pada setiap penutupan jadwal shift (`07:00`, `15:00`, dan `23:00` waktu server `VM1`, atau sesuai konfigurasi jam shift pabrik) dengan status awal **`NEEDS APPROVAL`**.
2. Alur status laporan (`ShiftReport` maupun `ProductBatchReport`) memiliki 3 tahap berurutan dengan pembagian hak akses RBAC sesuai **Main Task 01**:
   - **Tahap 1 - `NEEDS APPROVAL` (`[● NEEDS APPROVAL]` - `Gambar 55, 56, 61`)**:
     - Selama berstatus `NEEDS APPROVAL`, koreksi klasifikasi `Downtime Reason` masih diizinkan bagi `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin`.
     - **Gerbang Validasi Sebelum Persetujuan (*Pre-Approval Validation Gate*)**: sistem wajib memeriksa apakah masih ada kejadian *Unplanned Downtime* pada shift/batch tersebut yang berstatus `Belum Diisi / Unknown Reason`. Jika masih ada, saat tombol `✓ Approve` diklik sistem memblokir transisi status, menampilkan pesan peringatan jumlah kejadian yang belum diklasifikasi, dan menggulir/menyorot baris merah tersebut agar dilengkapi terlebih dahulu.
     - Tombol **`✓ Approve`** dapat dieksekusi oleh `Supervisor (SPV)` (setelah pengajuan/pemeriksaan `Shift Leader`) atau `SuperAdmin`; saat disetujui, status berubah menjadi **`APPROVED`**, sistem merekam `approved_by` dan `approved_at`, serta mengirim notifikasi pengesahan rilis ke `Admin / Manager` (**Main Task 17**).
   - **Tahap 2 - `APPROVED` (`[▲ APPROVED SPV]` - `Gambar 57`)**:
     - Menampilkan tombol **`✓ Release`** bagi `Admin / Manager` (serta `SuperAdmin`, atau `Supervisor` apabila diberi delegasi hak rilis penuh pada **Main Task 03**) dan tombol sekunder **`Kembalikan untuk Revisi`** (mengembalikan status ke `NEEDS APPROVAL` disertai catatan alasan pengembalian wajib isi).
     - Saat **`✓ Release`** diklik, sistem menampilkan modal konfirmasi: *"Setelah laporan di-release, seluruh data downtime dan produksi pada shift ini akan dikunci permanen dan tidak dapat diubah kembali. Lanjutkan?"*
   - **Tahap 3 - `RELEASED` (`[■ RELEASED]` - `Gambar 58 & 62`)**:
     - Setelah dikonfirmasi, status berubah menjadi **`RELEASED`**, sistem merekam `released_by` dan `released_at`, menyembunyikan tombol `Approve` / `Release`, serta **mengunci permanen (`[Locked]`)** seluruh aksi edit downtime dan penyesuaian data pada shift/batch tersebut di seluruh modul Aplikasi Web (**Main Task 12, 14, & 16**) maupun `Panel HMI-T7`.
3. Sinkronisasi status antara `Report by Shift` dan `Report by Product`: apabila suatu `ShiftReport` diubah menjadi `APPROVED` atau `RELEASED`, seluruh rekaman batch `No.PRO / SKU` yang selesai di dalam shift tersebut otomatis mewarisi status penguncian yang sama agar tidak terjadi konflik status antar-laporan.

**B. Halaman Daftar `Report > By Shift` (Tata Letak 2 Panel & Multi-Granularitas) (`[LINGKUP WEB] 14` Atas - URS 19.2.19 Gambar 55 & Tabel 16/17 Baris 2947-3005)**
1. Bilah kontrol & filter atas pada halaman `Report > By Shift` menyediakan:
   - Dropdown **`Area`** (default `Semua Area` atau area kerja utama pengguna, contoh `Unit 2 Garam Konsumsi`),
   - Pemilih **`Year`**, **`Month`**, dan **`Tanggal`** disertai mode agregasi tampilan (**`Per Shift`** [default], **`Rekap Harian / By Day`**, dan **`Rekap Bulanan / By Month`** sesuai URS baris 2948 & 3000),
   - Dropdown **`Shift`** (`Semua Shift`, `Shift 1`, `Shift 2`, `Shift 3`),
   - Dropdown **`Status`** (`Semua Status`, `Needs Approval`, `Approved`, `Released`),
   - Kolom pencarian `Search...` (berdasarkan kode laporan, nama mesin/lini, atau kode `No.PRO`), serta
   - Tombol **`Download`** (mengekspor tabel rekapitulasi laporan terfilter ke berkas `.csv` atau `.pdf`).
2. Area konten bawah menggunakan tata letak 2 panel sesuai `Gambar 55`:
   - **Panel Kiri (`Daftar Filter Line / Mesin`)**: memiliki kotak pencarian cepat `Search line...` dan daftar `Line / Machine` di bawah `Area` terpilih (termasuk opsi `Semua Lini`) untuk memfilter tabel di panel kanan secara instan.
   - **Panel Kanan (`Tabel Report by Shift`)**: menampilkan daftar laporan dengan pengurutan kolom (*sortable*) dan penomoran halaman (*pagination* `< 1 2 3 ... >`), memuat kolom:
     - `Date / Periode` (`DD/MM/YYYY` beserta jam shift),
     - `Shift` (`Shift 1`, `Shift 2`, `Shift 3`, atau label rekap `Harian` / `Bulanan`),
     - `Line / Mesin` (contoh: `Mesin Packing #6`),
     - `Loading Time` (`menit`),
     - `OEE (%)`,
     - `Availability (%)`,
     - `Performance (%)`,
     - `Quality (%)`,
     - `Status Approval` (*badge* warna + simbol aksesibel: `[● NEEDS APPROVAL]`, `[▲ APPROVED SPV]`, atau `[■ RELEASED]`), dan
     - `Action`: ikon mata **`👁` (`Lihat Detail Report`)** (serta tautan cepat `Unduh PDF` untuk baris `RELEASED`).

**C. Halaman `Detail Report by Shift` & Panel `Log Activity` Shift (`[LINGKUP WEB] 14` Bawah - URS Gambar 56, 57, 58, & 59)**
1. Header halaman `Detail Report by Shift` menampilkan:
   - Tombol kembali `<- Detail Report` beserta *breadcrumb* `Report > By Shift > Detail Report`,
   - Baris identitas shift: `Date`, `Shift`, `Area & Line / Machine`, serta *badge* `Status Approval` aktif beserta jejak nama & waktu penyetuju/perilis,
   - Kelompok tombol aksi kanan atas:
     - Tombol **`Log activity`** (ikon riwayat jam): saat diklik, membuka *slide-over drawer* yang menampilkan daftar kronologis seluruh aktivitas operasional pada mesin & shift tersebut (login/logout operator HMI, mulai/selesai `No.PRO`, penambahan reject/scrap, input & koreksi alasan downtime oleh operator/SPV, eskalasi Kaizen, hingga riwayat klik `Approve / Release`),
     - Tombol **`Download`**: mengekspor dokumen lengkap `Detail Report by Shift` ke format `.pdf` resmi siap cetak (memuat kop informasi pabrik, tanda tangan digital nama akun `Approved by` & `Released by`, grafik, dan tabel) atau `.csv`,
     - Tombol aksi persetujuan kontekstual sesuai Bagian A.2 (`✓ Approve`, `Kembalikan untuk Revisi`, atau `✓ Release`).
2. **Kartu Ringkasan OEE Shift & Pita `Event Timeline`**:
   - Menampilkan nilai agregat shift untuk `OEE (%)`, `Availability (%)`, `Performance (%)`, dan `Quality (%)`, diikuti pita horizontal **`Event Timeline`** sepanjang jam shift lengkap dengan legenda status dan *tooltip* segmen.
3. **Daftar *Accordion* Multi-Order `No.PRO - Product` beserta Konversi Kemasan & Berat (`Gambar 56-58`)**:
   - Menampilkan daftar panel lipat (*collapsible accordion*) untuk setiap `Production Order` yang berjalan selama shift tersebut (contoh: `No.PRO PO-20230526-U206 - Garam Beryodium 250g`).
   - Saat *accordion* dibuka (order pertama terbuka secara *default*), sistem menampilkan 10 metrik produksi order tersebut:
     - `Finish Good (Unit Kemasan)`: menampilkan satuan kemasan primer `pcs` sekaligus konversi satuan kemasan sekunder `karton / bag` dari Master SKU **Main Task 04** (contoh: `31,070 pcs / 776.75 karton`),
     - `Finish Good (Berat Bersih)`: hasil konversi bobot bersih dalam `kg` (contoh: `7,767.50 kg`),
     - `Production Target` (`pcs` & konversi kemasan),
     - `Total Production` (`pcs` & konversi kemasan),
     - `Actual Production` (`pcs` & konversi kemasan),
     - `Total Downtime` (`menit`),
     - `Downtime Freq.` (jumlah frekuensi kejadian),
     - `Reject / Process Defect` (`pcs` & ekuivalen `kg`),
     - `Rework / Scrap K3` (`pcs` & ekuivalen `kg`), dan
     - `Created By` (nama akun `Operator` yang mengoperasikan order di `Panel HMI-T7`).
4. **Blok Keandalan (`Run Time, MTTR, MTBF`), Ringkasan `Losses` (`↗`), Grafik `Waterfall Analysis`, & Tabel `Downtime` Shift**:
   - Menampilkan kartu `Run Time`, `MTTR`, dan `MTBF` (mengikuti formula aman tanpa pembagian nol pada **Main Task 12** Bagian D.1), kartu batang horizontal `Losses` beserta tombol `↗` menuju **Main Task 14**, serta grafik **`Waterfall Analysis`** shift tersebut.
   - Bagian bawah menampilkan **Tabel Kejadian Downtime Shift** (lengkap dengan sub-tampilan pengelompokan per **`Downtime Reason` `Gambar 59`**) yang menyediakan menu `View detail` (`👁`) serta menu `Edit` (`✎` membuka form koreksi `Gambar 65` **hanya jika laporan belum berstatus `RELEASED`**).

**D. Halaman Daftar `Report > By Product` & Evaluasi Konversi SKU (`[LINGKUP WEB] 15` - URS Gambar 60)**
1. Bagian atas halaman `Report > By Product` menampilkan:
   - **4 Kartu Ringkasan KPI Produk (`[LINGKUP WEB] 15`)**: `SKU Terpantau & Rasio Kemasan`, `Total Good Output & Rata-Rata Yield (%)` (dalam `pcs`, `karton`, dan `kg`), `Jumlah Batch Menunggu Persetujuan ([NEED APPROVAL])`, serta `Jumlah Rekap Telah Dirilis ([RELEASED])`.
   - **Bilah Filter Atas (`Gambar 60`)**: dropdown `Area`, pemilih `Tanggal / Periode`, tombol **`Download`** (`.csv` / `.pdf`), dropdown `Shift` (`Semua Shift` / `Shift 1..3`), dropdown **`Product / SKU`** (`Semua Produk` atau SKU spesifik dari **Main Task 04**), serta kolom `Search...`.
2. Area konten bawah menggunakan tata letak 2 panel (daftar pemilih `Line` di kiri dan tabel di kanan) dengan kolom tabel yang wajib mencantumkan identitas produk secara eksplisit:
   - `Kode SKU & Nama Produk` (contoh: `SKU-GRM-250 - Garam Beryodium 250g`),
   - `Date & Shift / Nomor Batch (No.PRO)`,
   - `Line / Mesin`,
   - `Total Diproses` (`pcs`),
   - `Good Output` (`pcs` serta konversi otomatis `karton` / `kg` pada sub-label atau *tooltip*),
   - `Cacat Seal + Scrap K3` (`pcs`),
   - `Quality Rate (%)` & `OEE Batch (%)`,
   - `Status` (`[● NEED APPROVAL]`, `[▲ APPROVED]`, atau `[■ RELEASED]`), dan
   - `Action`: ikon mata **`👁` (`Lihat Detail Report Produk`)**.

**E. Halaman `Detail Report by Product` (`URS Gambar 61 Need Approval` & `Gambar 62 Released`)**
1. Mengklik ikon mata **`👁`** pada baris `Report > By Product` membuka halaman **`Detail Report by Product`** dengan *breadcrumb* yang tepat: `Report > By Product > Detail Report` (mengoreksi salah *breadcrumb* `By Shift` pada `Gambar 61`).
2. Berbeda dari `Detail Report by Shift` yang memuat seluruh *accordion* multi-produk dalam 1 shift, halaman `Detail Report by Product` **memfokuskan seluruh indikator (`OEE / A / P / Q`, `Event Timeline`, kartu kuantitas & konversi unit kemasan `pcs / karton / kg`, `Run Time / MTTR / MTBF`, `Losses`, `Waterfall Analysis`, dan `Tabel Downtime`) khusus pada 1 batch `No.PRO - SKU` yang dipilih**.
3. Header kanan atas menyediakan tombol **`Log activity`**, **`Download`** (`.pdf` / `.csv`), serta tombol alur persetujuan **`✓ Approve`** (`Gambar 61`) -> **`✓ Release`** -> terkunci **`RELEASED`** (`Gambar 62`) sesuai kewenangan peran pada Bagian A.2.

## Catatan
- **Penambahan Kolom `Kode SKU & Nama Produk` yang Terlewat pada Tabel Mockup `Gambar 60` (`Halaman 81 URS`)**: Pada mockup `Gambar 60 Mockup Report by Product`, meskipun terdapat filter dropdown `all product` di bagian atas, kolom tabel di bawahnya hanya menyalin struktur `Date | Shift | Line | Status | Action` dari halaman `Report by Shift` tanpa menampilkan nama/kode produknya sama sekali. Pada AC Bagian D.2, kolom `Kode SKU & Nama Produk`, `Total Diproses`, `Good Output (konversi kemasan)`, `Cacat + Scrap K3`, dan `Quality / OEE` wajib ditampilkan agar laporan produk bermakna bagi evaluasi produksi.
- **Pelurusan Duplikasi Gambar `Gambar 59` dengan `Gambar 67` & Salah *Breadcrumb* pada `Gambar 57, 58, 61, 62` (`Halaman 79-83 URS`)**: Pada dokumen URS halaman 81 atas, `Gambar 59 Mockup Report by Shift (Downtime Reason)` menempelkan gambar yang identik sama persis dengan `Gambar 67` (`Availability Loss > Downtime Reason`); pada sistem ini, sub-tampilan tersebut bekerja terfilter khusus pada shift yang sedang diinspeksi. Selain itu, *breadcrumb* pada `Gambar 57, 58, 62` yang tertulis `Heading > Heading > Heading` dan pada `Gambar 61` yang masih tertulis `Report > By Shift > Detail Report` telah diluruskan sesuai konteks halamannya masing-masing.
- **Penanganan Tahap Antara `APPROVED` (`Gambar 57`) pada Daftar Tabel (`Gambar 55 & 60`)**: Pada mockup daftar `Gambar 55` dan `Gambar 60`, kolom `Status` hanya memperlihatkan contoh baris `need approval` dan `released`, sedangkan halaman detail `Gambar 57` berjudul `Mockup Report by Shift (Approved)` dengan tombol `Release`. AC Bagian A.2 menyatukan ketiganya secara utuh ke dalam 3 status eksplisit: `NEEDS APPROVAL` -> `APPROVED` -> `RELEASED`.
