# Main Task 02: Aplikasi Web - Konfigurasi Master Factory, Area, Line, Machine, dan Sub-Machine PLC-ABC

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 16`, `[LINGKUP WEB] 20` panel kiri Factory & Area, `[DESIGN SYSTEM] 02`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.12` Gambar 29-36 & `19.2.18` Gambar 51-52), [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md), & [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md)

---

## Expected Result
`SuperAdmin (OT/IT)` dapat memetakan dan mengelola struktur aset fisik pabrik secara berjenjang mulai dari tingkat **Factory -> Area -> Line -> Machine -> Sub-Machine** melalui Aplikasi Web, lengkap dengan pengikatan parameter konektivitas kontroler mesin asumsi generik (`PLC-ABC`, *IoT Gateway* `GW-100`, alamat IP jaringan OT, serta pemetaan sensor `SEN-S01`, `SEN-T01`, `SEN-V01`, `CNT-G01`, `CNT-R01`, dan `BUZ-01` ke register `D000-D012`). Hierarki master aset ini menjadi acuan tunggal (*single source of truth*) bagi akuisisi telemetri mesin, pengikatan konsol layar sentuh `Panel HMI-T7`, pilihan sub-mesin pada pelaporan *Downtime* dan *Kaizen*, serta filter analitik OEE di seluruh sistem.

## Prasyarat
- Pengguna telah berhasil login ke Aplikasi Web ProductionCore menggunakan akun dengan peran **`SuperAdmin (OT/IT)`** (mekanisme autentikasi dan pembatasan akses RBAC mengikuti **Main Task 01**).
- Layanan Backend API (VM1) dan Database PostgreSQL (VM2) berada dalam status aktif.

## User Journey
- `SuperAdmin` membuka grup menu `Configuration` pada *Sidebar* kiri Aplikasi Web lalu memilih menu `Factory & Area` (`[LINGKUP WEB] 20`).
- `SuperAdmin` melihat daftar *Factory* yang terdaftar, mengekspansi salah satu baris *Factory* untuk memeriksa daftar *Area* produksi di bawahnya, atau menggunakan kolom pencarian untuk memfilter nama *Factory* / *Area*.
- `SuperAdmin` menekan tombol `+ Tambah Factory` untuk mendaftarkan pabrik baru, atau menekan ikon `+` pada baris *Factory* tertentu untuk membuka modal `Tambah Area` (`Gambar 52`), mengisi satu atau beberapa nama *Area* sekaligus, lalu menekan `Simpan Area Baru`.
- `SuperAdmin` berpindah ke menu `Configuration -> Line & Machine` (`[LINGKUP WEB] 16`).
- `SuperAdmin` memilih salah satu *Area* pada panel daftar Area di sisi kiri halaman (contoh: `Unit 2 - Packing Garam`), sehingga tabel hierarki di sisi kanan menampilkan seluruh *Line* produksi milik Area tersebut.
- `SuperAdmin` menekan tombol `+ Tambah Line` (`Gambar 31`), mengisi Nama Line, memilih Kategori Line (`Packing` atau `Bulk`), secara opsional menambahkan mesin awal, lalu menekan `Simpan`.
- `SuperAdmin` mengekspansi baris *Line* untuk melihat daftar *Machine* di dalamnya (`Gambar 30`), atau menekan ikon `+` pada baris *Line* untuk membuka modal `Tambah Mesin` (`Gambar 32`), mengisi Nama Mesin, Kode Aset, parameter `PLC-ABC` / `GW-100`, serta Alamat IP jaringan OT, lalu menekan `Simpan`.
- `SuperAdmin` mengekspansi baris *Machine* (contoh: `Mesin Packing #6`) untuk melihat daftar *Sub-Machine* beserta pemetaan register sensornya, atau menekan ikon `+` pada baris *Machine* untuk membuka modal `Tambah Sub-Machine` (`Gambar 33`), mengisi Nama Sub-Machine serta pemetaan sensor/register `PLC-ABC`, lalu menekan `Simpan`.
- Apabila terdapat perubahan penamaan atau konfigurasi jaringan OT, `SuperAdmin` menekan tombol `Edit` pada baris *Factory*, *Area*, *Line* (`Gambar 34`), *Machine* (`Gambar 35`), atau *Sub-Machine* (`Gambar 36`), memperbarui data pada modal terkait, lalu menyimpan perubahan.

## Acceptance Criteria:

**A. Otorisasi Akses Modul Master Aset & Relasi dengan Main Task 01**
1. Menu `Configuration -> Factory & Area` dan `Configuration -> Line & Machine` pada *Sidebar* Aplikasi Web hanya ditampilkan dan hanya dapat diakses oleh pengguna dengan peran **`SuperAdmin (OT/IT)`** (sesuai matriks RBAC pada **Main Task 01**).
2. Pengguna dengan peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, maupun akun `Operator` `Panel HMI-T7` tidak memiliki akses tulis maupun akses halaman konfigurasi ini; akses langsung ke URL `/configuration/factory-area` atau `/configuration/line-machine` oleh peran selain `SuperAdmin` ditolak dengan status HTTP `403 Forbidden`.
3. Seluruh data *Factory*, *Area*, *Line*, *Machine*, dan *Sub-Machine* yang berstatus aktif pada modul ini otomatis menjadi sumber *dropdown* dan filter pada modul hilir (Master SKU pada **Main Task 04**, Master Downtime Reason pada **Main Task 05**, Akuisisi Telemetri `GW-100` pada **Main Task 06**, Konsol `HMI-T7` pada **Main Task 08-11**, serta Dashboard & Report Web pada **Main Task 12-16**).

**B. Halaman Daftar `Factory & Area` (`[LINGKUP WEB] 20` Panel Kiri - URS 19.2.18 Gambar 51)**
1. Bagian *header* area `Factory & Area` menampilkan:
   - Kolom pencarian `Search...`: memfilter daftar berdasarkan nama *Factory* maupun nama *Area* secara *case-insensitive* saat pengguna mengetik; jika sebuah *Area* cocok dengan kata kunci pencarian, baris induk *Factory*-nya otomatis tampil dalam kondisi terekspansi (`expanded`).
   - Tombol aksi primer `+ Tambah Factory` di sudut kanan atas.
2. Tabel hierarki `Factory & Area` menampilkan struktur pohon 2 tingkat:
   - Kolom header terdiri atas kolom `Sort` (ikon panah ekspansi), kolom `Factory` (dilengkapi tombol pengurutan abjad naik/turun A-Z / Z-A; secara *default* diurutkan A-Z berdasarkan nama *Factory*), dan kolom aksi di sisi kanan.
   - **Tingkat 1 (Baris `Factory`)**: menampilkan ikon ekspansi `>` (tertutup secara *default* kecuali *Factory* utama aktif), Nama *Factory* (contoh: `PT. XYZ - Pabrik Garam Konsumsi`), sub-informasi jumlah Area produksi aktif dan blok subnet jaringan OT (contoh: `3 Area Produksi Aktif | Jaringan OT 192.168.10.0/24`), serta 3 tombol ikon aksi di sisi kanan: `+` (*Tambah Area* di bawah Factory ini), `Edit` (*Edit Factory*), dan `Nonaktifkan / Hapus`.
   - **Tingkat 2 (Baris `Area`)**: muncul menjorok ke dalam (*indented*) di bawah baris *Factory* ketika ikon `>` diklik (ikon berubah menjadi `v`), menampilkan Nama *Area* (contoh: `Unit 1: Pencucian & Pengeringan`, `Unit 2: Pengemasan Garam Beryodium`, `Unit 3: Gudang Produk Jadi & Karton`), keterangan ringkas/jumlah mesin aktif di area tersebut, serta tombol aksi `Edit` (*Edit Area*) dan `Nonaktifkan / Hapus`.
3. Jika belum ada data *Factory* sama sekali atau hasil pencarian tidak menemukan kecocokan, tabel menampilkan *Empty State* yang jelas beserta keterangan tekstual dan tombol pintas untuk mereset pencarian atau menambah *Factory* baru.

**C. Modal Tambah / Edit Factory & Modal Tambah / Edit Area (`[LINGKUP WEB] 20` - URS 19.2.18 Gambar 52)**
1. Saat `SuperAdmin` menekan tombol `+ Tambah Factory` (atau tombol `Edit` pada baris *Factory*), sistem menampilkan modal form *Factory* dengan ketentuan:
   - Field `Nama Factory *` (wajib isi, minimal 3 karakter, wajib unik dan tidak boleh sama dengan nama *Factory* aktif lain).
   - Field `Subnet / Segmen Jaringan OT` (opsional, teks/CIDR informasi segmen LAN pabrik, contoh: `192.168.10.0/24`).
   - Field `Deskripsi / Keterangan` (opsional).
   - Tombol `Simpan` dan tombol `Batal` (`Discard`) beserta ikon tutup `X`.
2. Saat `SuperAdmin` menekan ikon `+` pada salah satu baris *Factory*, sistem menampilkan **Modal Tambah Area (`URS Gambar 52`)** dengan elemen berikut:
   - Judul header modal menampilkan identitas induk *Factory* yang dipilih (contoh: `PT. XYZ - Pabrik Garam Konsumsi`) dan tombol tutup `X`.
   - Informasi `Induk Pabrik`: *read-only / pre-filled* sesuai baris *Factory* yang dipilih.
   - Field input `Nama Area *` (wajib isi, contoh: `Unit 2B - Jalur Kemasan Refill`) yang dilengkapi tombol ikon `+` di sebelah kanan kotak input.
   - Perilaku tombol `+` di samping field `Nama Area *`: setiap kali diklik, sistem menambahkan baris input `Nama Area` baru di bawahnya (dilengkapi tombol hapus baris `-` / tempat sampah pada baris ke-2 dst.) sehingga `SuperAdmin` dapat mendaftarkan lebih dari satu Area sekaligus ke dalam *Factory* yang sama dalam satu proses simpan.
   - Tombol aksi primer `Simpan Area Baru` (`Save`) dan tombol sekunder `Batal` (`Discard`).
3. Validasi penyimpanan *Area* (baik *Tambah Area* maupun *Edit Area*):
   - Jika terdapat baris input `Nama Area *` yang dibiarkan kosong, sistem membatalkan penyimpanan dan menandai baris kosong tersebut dengan pesan validasi wajib isi.
   - Nama *Area* tidak boleh duplikat di dalam *Factory* yang sama (termasuk tidak boleh ada dua baris bernilai sama pada input multi-baris sekaligus).
   - Setelah berhasil disimpan, modal tertutup, pohon *Factory* terkait otomatis tampil dalam keadaan terekspansi (`v`) memperlihatkan *Area* baru, pilihan Area tersebut langsung tersedia pada sub-sidebar halaman `Line & Machine`, dan aksi tercatat ke *Audit Log*.

**D. Halaman Daftar Hierarki `Line & Machine` (`[LINGKUP WEB] 16` - URS 19.2.12 Gambar 29 & Gambar 30)**
1. Halaman `Line & Machine` terbagi menjadi dua panel berdampingan:
   - **Panel Kiri (`PILIH AREA PABRIK` - Area Sub-Sidebar)**: menampilkan daftar seluruh *Area* aktif dari modul `Factory & Area` (contoh: `Unit 1 - Bahan Baku`, `Unit 2 - Packing Garam`, `Unit 3 - Gudang Jadi`).
   - Secara *default* saat halaman dibuka, *Area* pertama dalam daftar (atau Area yang terakhir dipilih pengguna dalam sesi aktif) otomatis berada pada state terpilih (`selected`, latar `$bg-selected` dengan aksen `$text-brand`).
   - Ketika pengguna mengklik *Area* lain pada panel kiri, tabel hierarki di panel kanan langsung memperbarui daftar *Line*, *Machine*, dan *Sub-Machine* khusus untuk *Area* yang dipilih.
2. Bagian *toolbar* atas pada panel kanan halaman `Line & Machine` menampilkan:
   - Judul konteks Area aktif (contoh: `Hierarki Jalur & Mesin - Unit 2`).
   - Kolom pencarian `Search...`: memfilter pohon berdasarkan Nama Line, Kategori, Nama Mesin, Kode Aset Mesin, IP/PLC, atau Nama Sub-Machine di dalam Area yang sedang dipilih; saat kata kunci cocok dengan *Machine* atau *Sub-Machine*, cabang induknya otomatis diekspansi.
   - Tombol aksi primer `+ Tambah Line` (`+ Add line`).
3. Tabel pohon hierarki 3 tingkat pada panel kanan menampilkan:
   - Header kolom: `Sort` (kontrol ekspansi pohon), `Nama Line` (dilengkapi kontrol urut abjad A-Z / Z-A), `Kategori` (dilengkapi kontrol urut abjad A-Z / Z-A), dan kolom aksi kanan.
   - **Tingkat 1 - Baris `Line` (`Gambar 29`)**:
     - Secara *default* tampil tertutup (`>` collapsed), kecuali pengguna mengekspansinya menjadi `v` (`Gambar 30`).
     - Menampilkan Nama Line (contoh: `Line Packing Garam Unit 2` atau `Line Pengemasan Karung 25kg`), nilai `Kategori` (`Packing` / `Automatic Sachet Packing` atau `Bulk` / `Bulk Bagging`), serta 3 tombol aksi di sisi kanan: `+` (membuka modal `Tambah Mesin` pada Line ini), `Edit Line` (`Gambar 34`), dan `Nonaktifkan / Hapus`.
   - **Tingkat 2 - Baris `Machine` di bawah Line yang diekspansi (`Gambar 30 Default Machine Line`)**:
     - Muncul menjorok 1 level di bawah baris `Line` saat baris `Line` dibuka (`v`).
     - Menampilkan ikon ekspansi `>` / `v`, Nama Mesin beserta badge status **`(Utama)` / `Default Machine Line`** apabila mesin tersebut ditetapkan sebagai mesin acuan utama counter lini (contoh: `Mesin Packing #6 (Utama)`), ringkasan identitas teknis kontroler generik (`PLC-ABC | GW-100 | 192.168.10.20`), serta 3 tombol aksi di sisi kanan: `+` / `+ Sub-Mesin` (membuka modal `Tambah Sub-Machine` pada Mesin ini), `Edit Mesin` (`Gambar 35`), dan `Nonaktifkan / Hapus`.
   - **Tingkat 3 - Baris `Sub-Machine` di bawah Machine yang diekspansi (`Gambar 30`)**:
     - Muncul menjorok 2 level di bawah baris `Machine` saat baris `Machine` dibuka (`v`).
     - Menampilkan Nama Sub-Machine (contoh: `Sub: Rotary Cutter & Main Drive`, `Sub: Vertical Heater Sealer`, `Sub: Auger Filler & Photo Counter`, `Sub: Alarm Tower & Buzzer`), ringkasan pemetaan sensor dan register `PLC-ABC` (contoh: `SEN-T01 -> D005 (Setpoint 165C)`), serta tombol aksi `Edit Sub` (`Gambar 36`) dan `Nonaktifkan / Hapus`.

**E. Modal `Tambah Line` & `Edit Line` (`[LINGKUP WEB] 16` - URS 19.2.12 Gambar 31 & Gambar 34)**
1. Saat `SuperAdmin` menekan tombol `+ Tambah Line`, sistem membuka modal **Tambah Line (`Gambar 31`)** yang memuat:
   - Konteks `Area`: otomatis terikat pada *Area* yang sedang dipilih di panel kiri.
   - Field `Nama Line *` (wajib isi, *placeholder* `Masukkan nama line...`, wajib unik di dalam *Area* yang sama).
   - Dropdown `Kategori *` (wajib pilih, *placeholder* `Pilih kategori...`, dengan pilihan standar produksi: `Packing` / `Automatic Sachet Packing` dan `Bulk` / `Bulk Bagging`).
   - Field opsional `Machine` (*input nama mesin awal*) yang dilengkapi tombol ikon `+` di sebelah kanan: memungkinkan `SuperAdmin` langsung mendaftarkan 1 atau lebih nama mesin awal saat membuat Line baru (jika dibiarkan kosong, Line tetap dapat disimpan tanpa mesin dan mesin dapat ditambahkan kemudian melalui modal `Tambah Mesin`).
   - Tombol sekunder `Batal` (`Discard`), tombol primer `Simpan` (`Save`), dan ikon tutup `X`.
2. Saat `SuperAdmin` menekan aksi `Edit Line` pada salah satu baris *Line*, sistem membuka modal **Edit Line (`Gambar 34`)** yang memuat:
   - Field `Nama Line *` (terisi nilai saat ini, wajib isi dan unik dalam *Area* yang sama).
   - Dropdown `Kategori *` (terisi kategori saat ini).
   - Tombol `Batal` (`Discard`) dan `Simpan` (`Save`) (tanpa field tambah mesin massal, karena pengelolaan mesin dilakukan melalui modal Mesin tersendiri).

**F. Modal `Tambah Mesin` & `Edit Mesin` Beserta Parameter Integrasi OT `PLC-ABC` (`[LINGKUP WEB] 16` - URS 19.2.12 Gambar 32 & Gambar 35)**
1. Saat `SuperAdmin` menekan tombol `+` pada baris *Line*, sistem membuka modal **Tambah Mesin (`Gambar 32`)**; saat menekan `Edit Mesin` pada baris *Machine*, sistem membuka modal **Edit Mesin (`Gambar 35`)** dengan field yang telah terisi nilai eksisting.
2. Field yang ditampilkan dan divalidasi pada konfigurasi Mesin meliputi:
   - Dropdown `Nama Line *` (*pre-filled* dengan Line tempat tombol `+` atau `Edit Mesin` diklik; wajib dipilih dari daftar Line aktif pada Area tersebut).
   - Field `Nama Mesin *` (wajib isi, contoh: `Mesin Packing #6`; pada mode `Tambah Mesin` mendukung tombol `+` sesuai `Gambar 32` untuk menambah entri mesin baru di bawah Line yang sama).
   - Field `Kode Aset Mesin *` (wajib isi, format alfanumerik/tanda hubung unik lintas pabrik, contoh: `MCN-U2-PK06`, digunakan sebagai identifier `{machine_id}` pada topik MQTT `mes/unit2/{machine_id}/telemetry`).
   - Field/Dropdown `Tipe PLC & Gateway *` (wajib isi untuk mesin terotomasi IoT, menggunakan penamaan generik modular seperti `PLC-ABC Series via Edge Gateway GW-100 (Modbus TCP / Ethernet)`).
   - Field `Alamat IP, Port & Switch OT *` (contoh: `192.168.10.20:502` dan referensi switch `SWH-8P`; sistem memvalidasi format alamat IPv4 dan menolak penyimpanan jika kombinasi `Alamat IP + Port / Unit ID` sudah dipakai oleh mesin aktif lain).
   - Pilihan `Kondisi Lingkungan Material` (pilihan: `Corrosive (Garam / Lembap Tinggi)` atau `Normal`; secara *default* untuk Area Pengemasan Garam bernilai `Corrosive`, digunakan sebagai penanda aturan perawatan preventif TPM).
   - Toggle/Checkbox `Jadikan Mesin Utama Line (Default Machine Line)`: jika diaktifkan, mesin ini ditetapkan sebagai sumber utama perhitungan output akhir Line (hanya boleh ada maksimal 1 mesin berstatus *Default/Utama* dalam 1 Line; jika dialihkan ke mesin lain di Line yang sama, status utama pada mesin sebelumnya otomatis dilepas setelah konfirmasi).
   - Tombol `Batal` (`Discard`) dan `Simpan` (`Save`).

**G. Modal `Tambah Sub-Machine` & `Edit Sub-Machine` Beserta Register Sensor (`[LINGKUP WEB] 16` - URS 19.2.12 Gambar 33 & Gambar 36)**
1. Saat `SuperAdmin` menekan tombol `+` / `+ Sub-Mesin` pada baris *Machine*, sistem membuka modal **Tambah Sub-Machine (`Gambar 33`)**; saat menekan `Edit Sub` pada baris *Sub-Machine*, sistem membuka modal **Edit Sub-Machine (`Gambar 36`)** dengan data terisi.
2. Field yang ditampilkan dan divalidasi pada konfigurasi Sub-Machine meliputi:
   - Dropdown `Induk Mesin (Machine Name) *` (*pre-filled* sesuai baris Mesin induk yang dipilih; wajib terisi).
   - Field `Nama Sub-Machine *` (wajib isi, unik di bawah Mesin induk yang sama, contoh: `Vertical Heater Sealer (Anti-Korosi SS316)`, `Rotary Cutter & Main Drive`, `Auger Filler & Photo Counter`, `Alarm Tower & Buzzer`; pada mode `Tambah Sub-Machine` mendukung tombol `+` di kanan input sesuai `Gambar 33` untuk menambahkan beberapa komponen sub-mesin sekaligus).
   - Field `Pemetaan Sensor & Register PLC-ABC` (opsional bagi sub-mesin mekanis pasif, namun jika diisi wajib mencantumkan kode sensor generik dan alamat register `PLC-ABC` yang valid dalam rentang register mesin seperti `SEN-S01 -> D002`, `SEN-T01 -> D005`, `SEN-V01 -> D006`, `CNT-G01 -> D003`, `CNT-R01 -> D004`, atau `BUZ-01 -> D000/D009`, beserta catatan setpoint/ambang batas seperti `Setpoint 165C / Kritis >185C` atau `Vibrasi >4.5 mm/s`).
   - Tombol `Batal` (`Discard`) dan `Simpan Sub-Machine` (`Save`).
3. Setiap penambahan atau perubahan *Sub-Machine* langsung tersinkronisasi ke daftar pilihan `Sub-Machine` pada form pengajuan *Kaizen* (baik di konsol `Panel HMI-T7` **Main Task 11** maupun di Aplikasi Web **Main Task 15**).

**H. Aturan Penghapusan Aman (Soft Delete / Proteksi Integritas Data Historis) & Audit Trail**
1. Sesuai prinsip integritas *Audit Trail* produksi (tidak boleh ada *hard delete* yang merusak histori OEE), saat `SuperAdmin` menekan ikon tempat sampah (`Hapus / Nonaktifkan`) pada *Factory*, *Area*, *Line*, *Machine*, atau *Sub-Machine*:
   - Sistem selalu menampilkan dialog konfirmasi sebelum mengeksekusi perubahan.
   - Jika entitas tersebut masih memiliki entitas anak aktif (misal *Factory* masih memiliki *Area* aktif, atau *Line* masih memiliki *Machine* aktif) atau sedang memiliki sesi produksi *Running* aktif pada `Panel HMI-T7`, sistem **menolak** penonaktifan/penghapusan dan menampilkan pesan penjelas entitas mana yang masih bergantung padanya.
   - Jika entitas tersebut sudah pernah tercatat dalam riwayat `ProductionLog`, `DowntimeEvent`, `ShiftReport`, atau `KaizenItem`, sistem hanya mengizinkan status **Nonaktif (`is_active = false` / *soft archive*)** sehingga aset tidak muncul lagi pada pilihan input produksi baru, namun seluruh laporan historis tetap utuh dan terbaca.
2. Setiap aksi tambah, ubah, pengalihan *Default Machine Line*, dan penonaktifan pada *Factory*, *Area*, *Line*, *Machine*, maupun *Sub-Machine* wajib dicatat otomatis ke *Audit Log* (mencakup nilai sebelum dan sesudah perubahan, `user_id` SuperAdmin, dan `timestamp`) serta dapat ditelusuri pada **Main Task 17**.
3. Seluruh modal (`Tambah/Edit Factory`, `Area`, `Line`, `Machine`, `Sub-Machine`) mendukung penutupan dengan tombol `Esc` dan navigasi fokus keyboard ber-indikator *focus ring* `2px` `#FF4081`.

## Catatan
- **Rekonsiliasi Teks `CRU` pada Tabel 17 URS vs Ikon Tempat Sampah pada Mockup Gambar 31-36 & 52**: Teks Tabel 17 URS baris 3405 menuliskan proses `CRU` (*Create, Read, Update*) untuk *Line, Machine, and Submachine*, namun seluruh gambar mockup terkait (`Gambar 31, 33, 34, 36, 52`) menampilkan ikon tempat sampah (*Delete*) di sisi kanan baris tabel. Pada AC Bagian H, kontradiksi ini diselesaikan dengan mekanisme *Soft Delete / Nonaktifkan* berproteksi relasi agar selaras dengan tampilan mockup sekaligus mematuhi NFR Audit Trail PRD (*dilarang hard delete data historis produksi*).
- **Rekonsiliasi Tombol `+ Add factory` pada Gambar 51 vs Gambar 52 URS**: Pada `Gambar 51 Mockup Factory & Area` tombol `+ Add factory` tidak tampak di kanan atas, tetapi pada `Gambar 52 Mockup Add Area` tombol `+ Add factory` muncul di kanan atas sejajar kolom `Search...`. Mengikuti `Gambar 52` dan desain [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 20`), tombol `+ Tambah Factory` ditetapkan selalu tampil di halaman utama `Factory & Area`.
- **Pembersihan Duplikasi Menu Sidebar URS**: Pada gambar sidebar mockup URS halaman 64-77, item `SKU` tercetak dua kali di bawah grup `Configuration` dan item `Factory & Area` tidak tampak di daftar sidebar kiri. Mengikuti komponen `Component / [WEB] Sidebar` pada [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) dan **Main Task 01**, duplikasi `SKU` telah dihapus dan `Factory & Area` ditempatkan secara konsisten di bawah grup `Configuration`.
- **Parameter Integrasi OT Generik pada Modal Mesin & Sub-Mesin**: Mockup URS asli (`Gambar 32-36`) hanya menampilkan field nama generik (`Line Name`, `Machine`, `Sub Machine Name`), tetapi agar mesin dapat benar-benar berkomunikasi dengan *Edge IoT Gateway* `GW-100` dan `PLC-ABC` sesuai [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md) serta desain `[LINGKUP WEB] 16`, field konektivitas `Kode Aset`, `Tipe PLC & Gateway`, `Alamat IP/Port`, dan `Pemetaan Sensor & Register D000-D012` disertakan langsung di dalam modal konfigurasi Mesin & Sub-Mesin.
