# Main Task 04: Aplikasi Web - Konfigurasi Master SKU Garam, Hierarki Kemasan, dan Parameter Ideal Cycle Time

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 18`, `[DESIGN SYSTEM] 02`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.14` Gambar 42-44, `19.2.15` Gambar 45, & Bagian 16 Tabel 17) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`Admin / Manager` dan `SuperAdmin (OT/IT)` dapat mendaftarkan serta mengelola data master *Stock Keeping Unit* (SKU) produk garam konsumsi maupun garam industri secara terpusat melalui modul `Configuration -> SKU Master` di Aplikasi Web, mencakup struktur kemasan bertingkat (*Multi-Packaging*) maupun kemasan tunggal (*Single-Packaging*), batas toleransi berat timbangan QC (`Min Weight` dan `Max Weight`), rasio konversi antarkemasan, parameter **Ideal Cycle Time** (acuan empiris `0.024 menit/pcs` setara `41.67 pcs/menit` untuk kemasan garam beryodium 250g pada Mesin Packing #6), parameter finansial (`Price` dan `COGS`), serta pengikatan *Area* dan *Line* produksi. Data master SKU ini disinkronkan secara otomatis ke *Edge Gateway* `GW-100` dan konsol `Panel HMI-T7` sebagai acuan tunggal perhitungan *Performance Rate*, deteksi *Reduced Speed Loss* (`L-04`), konversi waktu *Process Defect* (`L-05`) & *Scrap* (`L-06`), serta kalkulasi *Opportunity Loss* finansial.

## Prasyarat
- Pengguna telah berhasil login ke Aplikasi Web ProductionCore menggunakan akun dengan peran **`Admin / Manager`** atau **`SuperAdmin (OT/IT)`** (mekanisme autentikasi dan pembatasan akses RBAC mengikuti **Main Task 01**).
- Data hierarki *Area*, *Line*, dan *Machine* telah terdaftar dan berstatus aktif melalui modul Master Aset (**Main Task 02**).
- Layanan Backend API (VM1) dan Database PostgreSQL (VM2) berada dalam status aktif.

## User Journey
- Pengguna (`Admin / Manager` atau `SuperAdmin`) membuka grup menu `Configuration` pada *Sidebar* kiri Aplikasi Web lalu memilih menu `SKU Master` (`[LINGKUP WEB] 18`).
- Pengguna melihat tabel daftar seluruh SKU garam yang terdaftar beserta ringkasan `Kode SKU`, `Nama Produk`, `Cycle Time`, `Speed Ideal`, `Batas Berat`, `Struktur Kemasan`, `Area`, dan *chip* `Jalur / Line`, atau mencari SKU tertentu melalui kolom `Search...`.
- Pengguna menekan tombol `+ Tambah SKU` (`+ Add SKU`) untuk membuka formulir pendaftaran SKU baru (`Gambar 43` / `Gambar 44`).
- Pengguna mengisi `Kode SKU *` dan `Nama Produk / SKU Name *`, lalu mengisi baris pertama (`Tier #1`) pada tabel `Packaging *` sebagai `Main Unit` lengkap dengan pilihan jenis kemasan, berat standar, berat minimum, dan berat maksimum.
- Apabila produk menggunakan kemasan bertingkat (contoh: Sachet PE 250g -> Inner Pack Lusin -> Master Karton Box), pengguna menekan tombol `+ Add packaging` (`Gambar 43`), menambahkan baris tingkat ke-2 dan ke-3, lalu mengisi angka rasio konversi pada bagian `Conversion *` yang muncul otomatis di bawah tabel kemasan.
- Apabila produk hanya menggunakan 1 tingkat kemasan (contoh: Karung PE 25kg), pengguna membiarkan tabel `Packaging *` hanya berisi 1 baris sehingga bagian `Conversion *` tetap disembunyikan (`Gambar 44`).
- Pengguna mengisi nilai `Ideal Cycle Time *` beserta pilihan satuannya (sistem otomatis menghitung pasangan kecepatan ideal timbal-baliknya), mengisi `Price` dan `Cost Of Goods Sold (COGS)` jika data tarif finansial tersedia, memilih `Area *` dan satu atau lebih `Line *`, lalu menekan `Simpan Master SKU` (`Save`).
- Untuk memeriksa spesifikasi rinci, referensi parameter sensor `PLC-ABC`, serta akumulasi histori kualitas produksi suatu produk, pengguna mengklik baris SKU pada tabel (atau memilih `Lihat Detail SKU` pada menu `⋮`) untuk membuka tampilan `Detail SKU` (`Gambar 45`), lalu menekan tombol `Edit` apabila perlu memperbarui data SKU tersebut.

## Acceptance Criteria:

**A. Otorisasi Akses Modul SKU Master & Relasi dengan Task Lain**
1. Menu `Configuration -> SKU Master` pada *Sidebar* Aplikasi Web ditampilkan dan dapat diakses oleh peran **`Admin / Manager`** dan **`SuperAdmin (OT/IT)`** (sesuai matriks RBAC **Main Task 01**).
2. Akses ke rute `/configuration/sku` maupun endpoint tulis Master SKU oleh peran `Shift Leader`, `Supervisor (SPV)`, atau akun `Operator` ditolak dengan status HTTP `403 Forbidden` (peran operasional hanya memiliki akses baca tidak langsung terhadap daftar SKU aktif saat menjalankan produksi dan melihat laporan).
3. Pilihan `Area *` dan `Line *` pada formulir SKU bersumber secara dinamis dari data *Area* dan *Line* aktif yang dikelola pada **Main Task 02**.
4. Data Master SKU aktif yang disimpan pada modul ini langsung digunakan sebagai parameter acuan pada modul hilir berikut:
   - Evaluasi *Reduced Speed Loss* (`L-04`) melalui perbandingan kecepatan aktual register `D002` `PLC-ABC` terhadap `Speed Ideal` SKU aktif pada **Main Task 06**.
   - Pilihan SKU saat `Input Order Produksi Shift`, perhitungan otomatis estimasi durasi produksi (`Target Produksi x Ideal Cycle Time`), serta pengisian otomatis satuan `Main Unit` dan konversi berat (`kg`) saat operator menginput *Reject / Rework / Scrap* di `Panel HMI-T7` pada **Main Task 08**.
   - Perhitungan *Performance Rate* (`P`), konversi kehilangan waktu *Process Defect* (`L-05`) & *Scrap* (`L-06`), kalkulasi dampak finansial *Business Impact* (**Main Task 13**), dan filter *Report by Product* (**Main Task 16**).

**B. Halaman Daftar `Master SKU` (`[LINGKUP WEB] 18` - URS 19.2.14 Gambar 42)**
1. Bagian *toolbar* atas halaman `SKU Master` menampilkan:
   - Kolom pencarian `Search...`: memfilter tabel secara *case-insensitive* berdasarkan `Kode SKU` (`ID`), `Nama Produk` (`SKU Name`), nama `Area`, atau nama `Line / Jalur`.
   - Tombol pengaturan referensi `Jenis Kemasan` (ikon gerigi di samping tombol tambah sesuai `Gambar 42`) untuk mengelola daftar pilihan dropdown nama kemasan standar pabrik (tersedia opsi bawaan: `Sachet PE Primer` / `Pouch`, `Inner Pack Lusin` / `Inner`, `Master Karton Box` / `Karton`, dan `Karung PE`).
   - Tombol aksi primer `+ Tambah SKU` (`+ Add SKU`) di sudut kanan atas.
2. Tabel `Master SKU` menampilkan kolom-kolom berikut secara berurutan (`Gambar 42` & `[LINGKUP WEB] 18`):
   - `#`: nomor urut baris.
   - `Kode SKU` (`ID`): kode unik SKU (contoh: `SKU-GRM-250`, `SKU-GRM-500`, `SKU-GRM-100`, `SKU-GRM-25K`).
   - `Nama Produk` (`SKU Name`): nama lengkap produk garam (contoh: `Garam Konsumsi Beryodium 250g`).
   - `Cycle Time`: nilai waktu siklus ideal per `Main Unit` dalam menit (contoh: `0.024 mnt/pcs` atau `0.250 mnt/bag`).
   - `Speed Ideal`: kecepatan nominal produksi per menit hasil konversi `1 / Cycle Time` (contoh: `41.67 pcs/mnt` atau `4.00 bag/mnt`).
   - `Batas Berat`: rentang toleransi berat `Min Berat - Max Berat` untuk `Main Unit` (contoh: `248 - 253 g` atau `24.9 - 25.2 kg`).
   - `Struktur Kemasan`: label ringkas tipe kemasan tunggal atau bertingkat beserta rasio tertingginya (contoh: `Multi: 40 Sachet = 1 Karton` atau `Single: 1 Karung PE`).
   - `Area` & `Jalur` (`Line`): nama *Area* produksi beserta kumpulan *pill tags* untuk setiap *Line / Mesin* yang diikat ke SKU tersebut (contoh: `[Packing #6] [Packing #5]`).
   - Menu Aksi `⋮` di ujung kanan baris: berisi aksi `Lihat Detail SKU`, `Edit SKU`, dan `Nonaktifkan / Hapus SKU`.
3. Paginasi dan tampilan tabel:
   - Secara *default*, tabel menampilkan **10 baris per halaman** dengan halaman `1` terpilih aktif dan diurutkan berdasarkan `Kode SKU` (A-Z) atau waktu pendaftaran terbaru.
   - Kontrol paginasi `< 1 2 3 4 5 ... N >` tampil di kanan bawah tabel; saat pengguna mengetik pada kolom `Search...`, paginasi otomatis kembali ke halaman `1`.
   - Jika pencarian tidak menghasilkan kecocokan, tabel menampilkan *Empty State* informatif dengan tombol `Reset Pencarian`.

**C. Formulir `Tambah SKU` - Identitas Produk & Tabel Hierarki `Packaging *` (`[LINGKUP WEB] 18` - URS 19.2.14 Gambar 43 & Gambar 44)**
1. Saat pengguna menekan `+ Tambah SKU`, sistem membuka formulir **`Add SKU` (`Configuration > SKU > Add SKU`)** dengan bagian identitas utama di atas:
   - `Kode SKU *` (wajib isi, format alfanumerik/tanda hubung tanpa spasi, wajib unik di seluruh sistem, contoh: `SKU-GRM-250`).
   - `Nama Produk / SKU Name *` (wajib isi, *placeholder* `input SKU name here...` / `Masukkan nama produk SKU...`, minimal 3 karakter, wajib unik di dalam *Area* yang sama).
2. Di bawah identitas produk terdapat tabel dinamis **`Packaging *`** yang secara *default* memuat **1 baris awal (`Tier #1`)** dengan kolom-kolom berikut (`Gambar 43-44`):
   - `⋮⋮` & `#` (`Tier`): *drag handle* pengubah urutan baris kemasan dan nomor tingkat kemasan (`1`, `2`, `3`, dst. berurutan dari kemasan terkecil hingga kemasan luar).
   - `Main Unit (?)`: tombol *radio* (`(o)`) dilengkapi ikon informasi `(?)` dengan *tooltip* penjelas bahwa `Main Unit` adalah satuan dasar perhitungan pulsa sensor `CNT-G01` / `CNT-R01`, satuan *default* input *Reject / Rework* di `Panel HMI-T7`, serta basis satuan `Cycle Time`, `Price`, dan `COGS`. Hanya **tepat 1 baris** pada tabel `Packaging *` yang boleh terpilih sebagai `Main Unit`; secara *default* baris `#1` terpilih aktif (`(o) Ya`).
   - `Jenis Kemasan` (`Packaging *`): *dropdown* wajib pilih (*placeholder* `select`), mengambil daftar referensi jenis kemasan; jenis kemasan yang sama tidak boleh dipilih lebih dari sekali di dalam satu SKU.
   - `Berat Standar` (`Weight *`): input angka desimal positif (`> 0`, *placeholder* `input value...`) dilengkapi satuan berat (`g` atau `kg`, secara *default* `g`, contoh: `250 g`).
   - `Min Berat` (`Min Weight *`): input angka desimal positif (`> 0`, *placeholder* `input value...`) dengan satuan berat yang sama sebagai batas bawah toleransi timbangan QC (*under-weight*, contoh: `248 g`).
   - `Max Berat` (`Max Weight *`): input angka desimal positif (`> 0`, *placeholder* `input value...`) dengan satuan berat yang sama sebagai batas atas toleransi timbangan QC (*over-weight*, contoh: `253 g`).
   - Tombol hapus baris kemasan: hanya aktif apabila jumlah baris kemasan lebih dari 1; jika baris yang dihapus sedang terpilih sebagai `Main Unit`, status `Main Unit` otomatis dialihkan kembali ke baris `#1`.
3. Di bawah tabel `Packaging *` terdapat tombol lebar penuh **`+ Add packaging`** (`+ Tambah Tingkat Kemasan`) yang menambahkan baris tingkat kemasan baru di bawah baris terakhir.
4. Validasi batas toleransi berat pada setiap baris `Packaging *`:
   - Setiap baris wajib memenuhi pertidaksamaan **`0 < Min Berat <= Berat Standar <= Max Berat`**; apabila `Min Berat > Berat Standar` atau `Berat Standar > Max Berat`, sistem menandai input terkait dengan pesan error validasi dan membatalkan penyimpanan.

**D. Bagian Kondisional `Conversion *` (*Multi-Packaging* Gambar 43 vs *Single-Packaging* Gambar 44)**
1. **Perilaku Kemasan Tunggal (`Jumlah baris Packaging == 1` - `URS Gambar 44`)**:
   - Apabila tabel `Packaging *` hanya memiliki **1 baris** (contoh: `SKU-GRM-25K` `Single: 1 Karung PE 25kg`), bagian **`Conversion *` wajib disembunyikan sepenuhnya** dari formulir, dan sistem secara otomatis menetapkan faktor konversi tunggal berdasarkan `Berat Standar` baris `#1` ke satuan kilogram (`kg`).
2. **Perilaku Kemasan Bertingkat (`Jumlah baris Packaging > 1` - `URS Gambar 43`)**:
   - Apabila pengguna menambahkan baris kemasan ke-2 atau seterusnya melalui `+ Add packaging` (atau mengurangi kembali baris hingga tersisa > 1), bagian **`Conversion *` otomatis muncul** di bawah tombol `+ Add packaging` dengan jumlah baris konversi sebanyak `(N - 1)` untuk setiap tingkat kemasan selain `Main Unit`.
   - Setiap baris pada bagian `Conversion *` menampilkan 2 kolom:
     - `Value *`: input bilangan bulat positif (`>= 2`, wajib isi, *placeholder* `value`, contoh: `12` untuk tingkat `#2` Inner Pack Lusin dan `40` untuk tingkat `#3` Master Karton Box).
     - `Unit`: field teks *read-only* terisi otomatis (*autofill*) berdasarkan pasangan nama kemasan `Main Unit` terhadap nama kemasan tingkat terkait dengan format `<Nama Main Unit> per <Nama Kemasan Tier #k>` (contoh sesuai `Gambar 43` & `Gambar 45`: `sachet per inner` / `pouch per inner` pada baris konversi `#2`, dan `sachet per karton` / `pouch per karton` pada baris konversi `#3`).
   - Validasi rasio konversi bertingkat: nilai `Value` pada tingkat kemasan yang lebih luar (`#3`) wajib lebih besar daripada nilai `Value` tingkat kemasan di dalamnya (`#2`); rasio ini digunakan secara otomatis untuk mengonversi total output *Good Product* menjadi satuan kemasan luar (misal jumlah Karton utuh + sisa Sachet) pada layar `Production Running` Web & `Panel HMI-T7`.

**E. Parameter `Ideal Cycle Time`, Tarif `Price / COGS`, Pengikatan `Area & Line`, dan Profil Teknis SKU**
1. Baris parameter kecepatan siklus produksi terdiri atas 2 kolom yang terhubung secara matematis (`Gambar 43-45` & `[LINGKUP WEB] 18`):
   - Kolom kiri `Ideal Cycle Time *` (`Cycle Time *`): input numerik desimal positif (`> 0`, mendukung presisi hingga 4 angka di belakang koma, *placeholder* `input cycle time...`, contoh empiris jurnal: `0.024`).
   - Kolom kanan `Satuan Siklus` (`Unit Cycle Time *`): *dropdown* wajib pilih (*placeholder* `select unit...`) dengan 2 opsi satuan timbal-balik terhadap `Main Unit`:
     - `menit / <Main Unit>` (contoh: `menit/pcs` atau `menit/bag`, terpilih secara *default* sesuai formula OEE jurnal).
     - `<Main Unit> / menit` (contoh: `pcs/menit` atau `bag/menit`).
   - Setiap kali nilai angka atau satuan diubah, sistem otomatis menampilkan hasil konversi pasangannya secara *real-time* (contoh: input `0.024` `menit/pcs` langsung menampilkan ekuivalensi `Speed Ideal: 41.67 pcs/mnt`; sebaliknya input `41.67` `pcs/menit` menyimpan `ideal_cycle_time_min = 0.0240 menit/pcs`) sehingga mesin kalkulasi OEE selalu menggunakan `ideal_cycle_time_min` dalam satuan **menit per Main Unit** tanpa risiko kesalahan satuan.
2. Profil referensi teknis mesin & kualitas produk pada SKU (ditampilkan pada panel `Detail SKU` `[LINGKUP WEB] 18`):
   - `Ambang Deteksi Reduced Speed (D002)`: secara *default* bernilai `90%` dari `Speed Ideal` (contoh: `< 38.0 pcs/mnt` untuk target `41.67 pcs/mnt`, dapat disesuaikan per SKU) sebagai acuan pemicu peringatan *Reduced Speed* pada **Main Task 06**.
   - `Setpoint Referensi Suhu Sealer (D005)` (opsional, untuk jalur kemasan plastik PE contoh: `Setpoint 165 C | Alarm < 155 C`) dan `Catatan Standar Mutu` (opsional, contoh: `SNI 3556 | KIO3 >= 30 ppm | NaCl >= 94.7%`).
3. Baris parameter finansial terdiri atas 2 kolom bermata uang `rupiah` (`Gambar 43-45`):
   - Kolom kiri `Harga Jual per Unit` (`Price`, teks bantu: `selling price per unit` / `harga jual per unit`): input angka `>= 0` dengan akhiran `rupiah`.
   - Kolom kanan `Cost Of Goods Sold (COGS)` (`COGS`, teks bantu: `cost of goods sold per unit` / `harga pokok penjualan per unit`): input angka `>= 0` dengan akhiran `rupiah`.
   - Apabila tarif finansial belum ditetapkan oleh tim Finance pabrik, sistem mengizinkan penyimpanan dengan nilai kosong/`null` (ditandai sebagai `[PLACEHOLDER: Diisi Finance Pabrik]` sehingga dashboard *Business Impact* pada **Main Task 13** menampilkan status tarif belum dikonfigurasi dan tidak menampilkan estimasi Rupiah semu); apabila keduanya diisi dan nilai `COGS > Price`, sistem memunculkan peringatan konfirmasi sebelum menyimpan.
4. Baris pengikatan lokasi produksi terdiri atas 2 kolom berjenjang (`Gambar 43-45`):
   - Kolom kiri `Area *`: *dropdown* wajib pilih (*placeholder* `select area`), menampilkan daftar *Area* aktif dari **Main Task 02**.
   - Kolom kanan `Line *`: *multi-select dropdown* wajib pilih minimal 1 lini/mesin (*placeholder* `select one or more line`), hanya menampilkan *Line* aktif yang berada di bawah `Area *` terpilih, dan merender pilihan sebagai *chip* yang dapat dihapus (`[Packing #6 x] [Packing #5 x]`).
5. Tombol aksi formulir di kanan bawah:
   - `Batal` (`Discard`): membatalkan pembuatan/perubahan SKU (meminta konfirmasi jika pengguna sudah mengisi sebagian form).
   - `Simpan Master SKU` (`Save`): memvalidasi seluruh aturan di atas, menyimpan data SKU dalam satu transaksi database, mencatat ke *Audit Log*, dan menyinkronkan pembaruan parameter SKU ke `GW-100` serta `Panel HMI-T7`.

**F. Halaman `Detail SKU` & Mode `Edit SKU` (`[LINGKUP WEB] 18` - URS 19.2.15 Gambar 45)**
1. Saat pengguna mengklik salah satu baris SKU pada tabel utama atau memilih `Lihat Detail SKU` dari menu `⋮`, sistem membuka tampilan **`Detail SKU` (`Configuration > SKU > Detail SKU` - `Gambar 45`)** dengan navigasi kembali `<- Detail SKU`.
2. Tampilan `Detail SKU` menampilkan seluruh atribut produk dalam kondisi *read-only*:
   - `Kode SKU` dan `Nama Produk` (contoh: `SKU-GRM-250 - Garam Konsumsi Beryodium 250g`).
   - Tabel lengkap hierarki `Packaging` (seluruh tier `#1..#N`, penanda `Main Unit`, `Jenis Kemasan`, `Berat Standar`, `Min Berat`, `Max Berat`) serta tabel `Conversion` (apabila produk memiliki > 1 tingkat kemasan).
   - Parameter `Ideal Cycle Time` (`menit/pcs`), `Speed Ideal` (`pcs/mnt`), referensi `Parameter PLC-ABC D002`, referensi `Parameter Sealer D005`, dan `Standar Mutu & Yodium`.
   - Nilai `Price` (`rupiah`), `Cost Of Goods Sold (COGS)` (`rupiah`), `Area`, dan *chip* `Line` yang terhubung.
   - Ringkasan akumulasi performa historis SKU yang dihitung otomatis dari rekaman `ProductionLog` di database (total output *Good Product* dan rata-rata *Quality Rate* `%`), beserta indikator status sinkronisasi ke perangkat tepi (`[SYNCED] Parameter cycle time dikirim ke HMI-T7 & GW-100`).
3. Pada sudut kanan bawah `Detail SKU` terdapat tombol **`Edit` (`Gambar 45`)** yang mengalihkan tampilan ke mode **`Edit SKU`** dengan seluruh field terisi nilai saat ini:
   - `Kode SKU` terkunci (*read-only*) apabila SKU sudah pernah dipakai dalam transaksi produksi agar konsistensi histori tetap terjaga.
   - **Proteksi Snapshot Historis OEE**: apabila `Admin / Manager` atau `SuperAdmin` mengubah `Ideal Cycle Time`, rasio `Conversion`, `Price`, atau `COGS` pada SKU yang sudah memiliki histori produksi, perubahan tersebut **hanya berlaku untuk sesi order produksi baru setelah waktu perubahan disimpan**; seluruh `OEEResult` dan `ShiftReport` masa lalu tetap menggunakan snapshot parameter SKU yang berlaku saat shift tersebut dijalankan.
   - Apabila SKU yang diedit sedang berstatus *Running* aktif pada suatu mesin di `Panel HMI-T7`, sistem memberi tahu pengguna bahwa parameter baru akan berlaku mulai sesi order produksi berikutnya pada mesin tersebut.

**G. Proteksi Penonaktifan SKU (*Soft Delete*), Sinkronisasi Edge, dan Audit Trail**
1. Demi menjaga keutuhan laporan historis (*dilarang hard delete data historis produksi*):
   - Penghapusan permanen hanya diizinkan jika SKU belum pernah dirujuk pada satu pun rekaman `ProductionLog` atau `ShiftReport`.
   - Jika SKU sudah pernah memiliki riwayat produksi, aksi hapus dijalankan sebagai **Nonaktifkan SKU (`is_active = false`)** setelah dialog konfirmasi; SKU nonaktif otomatis disembunyikan dari daftar pilihan *Start Production* di `Panel HMI-T7`, tetapi seluruh laporan historis tetap utuh.
   - Sistem menolak penonaktifan terhadap SKU yang sedang berjalan (*Running*) pada lini produksi aktif.
2. Seluruh transaksi penambahan SKU, perubahan struktur kemasan/konversi, perubahan `Ideal Cycle Time` atau harga/`COGS`, serta penonaktifan SKU wajib dicatat ke *Audit Log* (**Main Task 17**) dengan mencantumkan nilai sebelum dan sesudah perubahan, `user_id`, serta `timestamp`.
3. Seluruh elemen interaktif pada daftar SKU, pengurutan tingkat kemasan, tombol *radio* `Main Unit`, *dropdown multi-select* `Line`, dan halaman `Detail / Edit SKU` dapat dinavigasi penuh via keyboard dengan *focus ring* `2px` `#FF4081`.

## Catatan
- **Rekonsiliasi Satuan `Cycle Time *` vs `Unit Cycle Time (unit/minute) *` (`Gambar 43-45` URS vs Formula OEE Jurnal PT. XYZ)**: Pada `Gambar 43-45` URS, label dropdown tertulis `Unit Cycle Time (unit/minute) *` dengan nilai contoh *dummy* `99` dan `99` pada `Gambar 45`. Secara matematis `unit/minute` adalah kecepatan (*Speed*, contoh `41.67 pcs/menit`), sedangkan `Ideal Cycle Time` pada formula OEE jurnal PT. XYZ (`Performance = Total Produksi x Ideal Cycle Time / Operation Time`) wajib bersatuan `menit/unit` (`0.024 menit/pcs`). Pada AC Bagian E.1, potensi salah input ini dieliminasi melalui konversi timbal-balik otomatis antara `menit / Main Unit` dan `Main Unit / menit` dengan penyimpanan internal terstandar dalam `menit / Main Unit`.
- **Rekonsiliasi Label `Cost Of Goods Sold (COGS)` (`Gambar 43 & 45`) vs `Cost` (`Gambar 44`) & Placeholder Tarif Finansial**: Pada `Gambar 44` label tertulis `Cost *`, sedangkan `Gambar 43`, `Gambar 45`, dan teks URS baris 3384 menggunakan istilah `Cost Of Goods Sold (COGS)`. Spesifikasi ini menyeragamkan label menjadi `Cost Of Goods Sold (COGS)`. Selain itu, karena jurnal penelitian PT. XYZ tidak mencantumkan data harga jual maupun HPP garam per sachet, field `Price` dan `COGS` diizinkan dikosongkan (`null` / `[PLACEHOLDER: Diisi Finance Pabrik]`) agar tidak menghambat operasional perhitungan OEE teknis di lantai produksi.
- **Rekonsiliasi Item Sidebar `Reject Reason` & `Tabel 9` URS tanpa Mockup di Bab 19**: Pada potongan sidebar mockup URS halaman 68-76 tercantum item `Reject Reason` (dan duplikasi item `SKU`), serta teks Bagian 16 nomor 9 menyebut daftar *Reject Reason*, tetapi URS Bab 19.2 tidak menyediakan satu pun gambar mockup untuk halaman `Reject Reason`. Mengikuti struktur bersih pada [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen), parameter batas toleransi gramasi QC (`Min Berat` & `Max Berat`) ditempatkan langsung pada Master SKU ini, sedangkan alasan cacat produk *Process Defect (`L-05`)* dan *Scrap (`L-06`)* dikelola bersama taksonomi kerugian produksi (*Six Big Losses*) pada **Main Task 05** dan digunakan pada input *Reject/Scrap* `Panel HMI-T7` (**Main Task 08**).
