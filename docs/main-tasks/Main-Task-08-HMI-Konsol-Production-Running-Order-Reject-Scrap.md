# Main Task 08: Panel HMI-T7 - Konsol Utama Production Running, Input Order Produksi Shift, dan Counter Sentuh Reject/Scrap K3

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP HMI] 03`, `[LINGKUP HMI] 04` kartu kiri & kanan, `Component / [HMI] Topbar`, `Component / [HMI] Bottom Nav`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.3.4` Gambar 75-77 & Gambar 79, serta Tabel 15 baris 2628-2743), [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md), & [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md)

---

## Expected Result
`Operator` lini produksi (beserta `Shift Leader` pada konsol mesin) dapat memantau jalannya produksi secara *real-time* pada tab utama **`Home` (`Production Running`)** di `Panel HMI-T7`, memulai dan menghentikan sesi *Production Order* shift dengan parameter `Ideal Cycle Time` yang dimuat otomatis dari Master SKU, menyesuaikan target produksi maupun menambahkan waktu ekstra (`+30 menit`), serta mencatat produk cacat proses (**L-05 Process Defect / Rework**) dan garam tercecer non-pangan (**L-06 Scrap Garam K3**) menggunakan tombol sentuh cepat yang langsung mengonversi satuan kemasan ke kilogram (`kg`) dan menyinkronkannya ke register `PLC-ABC` (`D007`/`D008`) serta Backend Server.

## Prasyarat
- Operator telah berhasil login pada konsol `Panel HMI-T7` yang terikat ke mesin aktif (contoh: `Mesin Packing #6 - Unit 2 Garam`, mekanisme autentikasi dan *App Shell* mengikuti **Main Task 07**).
- Daftar produk Master SKU beserta `Main Unit`, rasio `Conversion` kemasan, `Berat Standar`, dan `Ideal Cycle Time` (`0.024 menit/pcs` = `41.67 pcs/mnt`) telah terdaftar aktif untuk lini/mesin tersebut pada **Main Task 04**.
- Daftar alasan cacat kualitas (`L-05 Process Defect` & `L-06 Scrap`) dan kategori downtime telah terdaftar aktif pada **Main Task 05**.
- Akuisisi telemetri `PLC-ABC` (`D000-D012`) melalui `GW-100` telah berjalan sesuai **Main Task 06**.

## User Journey
- Setelah login di `Panel HMI-T7`, operator masuk ke layar utama tab `Home` (`[LINGKUP HMI] 03` / `Gambar 75`).
- Saat awal shift belum memiliki sesi *Production Order* aktif, operator menyentuh tombol `+ Tambah Order / Waktu` (`+ add time`), membuka modal `Mulai Order Produksi` (`Gambar 77`), mengisi `Nomor Production Order *`, memilih `SKU Garam *` (sehingga `Cycle Time` dan parameter referensi PLC terisi otomatis), memverifikasi `Target Output Shift *` serta jam `Start *` dan `End *`, lalu menyentuh `Aktifkan Order ke PLC-ABC` (`Save`).
- Selama mesin beroperasi, operator memantau pita visual `Event Timeline` shift, `8 Kartu Telemetri Live` (`Target Shift`, `Achievement`, `Finish Good`, `Berat Bersih`, `Total Diproses`, `Speed D002`, `Defect D004/D007`, dan `Scrap K3 D008`), serta ringkasan daftar `Downtime Unreason Queue` di kiri bawah layar.
- Apabila terjadi perubahan rencana target produksi di tengah shift, operator menyentuh tombol ikon pensil `Edit` pada kartu `Target Shift`, memasukkan target baru sehingga estimasi waktu `End` diperbarui otomatis.
- Lima menit sebelum jadwal `End` berakhir (atau melalui tombol `+ Tambah Order / Waktu` saat order aktif), operator dapat menyentuh opsi penambahan **`Extra Time` (`+30 menit`)** apabila batch produksi masih perlu diselesaikan.
- Setiap kali operator menemukan kemasan cacat seal/gramasi atau menimbang garam jatuh di lantai (K3), operator menyentuh tombol besar `+` pada kartu `Process Defect / Rework` atau kartu `Scrap Garam K3` untuk membuka modal input cepat (`Gambar 79`), menekan tombol tambah cepat (`+1`, `+5`, `+10`, `+1 Box`), memilih penyebab cacat, melihat konversi berat `kg` otomatis, lalu menyentuh `Simpan ke Register D007/D008 & Server`.
- Untuk melihat rincian lengkap parameter order aktif atau mengakhiri order lebih awal setelah target tercapai, operator membuka modal `Production Running Detail` (`Gambar 76`) lalu menyentuh tombol `Stop` dan mengonfirmasi penghentian order.

## Acceptance Criteria:

**A. Kartu `Run Time Production Plan`, `Event Timeline` Shift, & Pratinjau Pareto Sesi (`[LINGKUP HMI] 03` - URS 19.3.4 Gambar 75)**
1. Bagian atas layar `Home` menampilkan kartu **`Run Time Production Plan`** untuk mesin yang terikat pada panel dengan 2 tombol kontrol di bagian header:
   - Tombol kiri **`+ Tambah Order / Waktu` (`+ add time`)**:
     - Saat belum ada sesi *Production Order* aktif pada mesin (`STANDBY`), tombol ini membuka formulir `Mulai Order Produksi Baru` (`Add New Production Active` - `Gambar 77` pada Bagian C).
     - Saat sudah terdapat sesi *Production Order* aktif yang sedang berjalan, tombol ini membuka dialog penambahan waktu produksi (**`Add Extra Time`** pada Bagian D.2) atau penjadwalan order SKU berikutnya dalam shift yang sama.
   - Tombol kanan **`Lihat Rincian Downtime` (`view downtime`)**:
     - Membuka panel/modal ringkasan **Pareto Downtime Sesi Berjalan** (sesuai URS Tabel 15 baris 2717-2724) yang menampilkan grafik batang Pareto diurutkan berdasarkan durasi terpanjang ke terpendek beserta pemisahan tegas antara **`Planned Downtime`** dan **`Unplanned Downtime`** (menit & frekuensi kejadian).
2. Di bawah header kartu terdapat batang horizontal interaktif **`Event Timeline`** yang membentang dari jam `Start` hingga `End` sesi/shift aktif lengkap dengan penanda waktu aktual berjalan (*live time marker*, contoh: `14:35 (Aktual)`) dan kode warna + simbol aksesibel berikut (sesuai URS baris 2673-2681 & `Gambar 75`):
   - **Biru (`[▲ Biru]`)**: `Schedule Loss / Planned Downtime`.
   - **Merah (`[● Merah]`)**: `Availability Loss / Unplanned Downtime`.
   - **Kuning (`[◆ Kuning]`)**: `Small Stop / Idle & Minor Stoppage (L-03)`.
   - **Hijau (`[■ Hijau]`)**: `Run Time` (mesin aktif berproduksi).
   - **Abu-abu**: `Available Time` (sisa waktu terjadwal yang belum terpakai atau sisa waktu setelah order dihentikan melalui aksi `Stop`).
3. Interaksi sentuh pada `Event Timeline`:
   - Ketika operator menyentuh salah satu segmen warna pada batang `Event Timeline`, sistem menampilkan *popover* ringkas berisi jenis status segmen, jam `Start`, jam `End` (atau `Sedang Berlangsung`), dan durasi segmen tersebut (contoh sesuai `Gambar 75`: `Run time | Start: 08:00 | End: 08:12`).
   - Menyentuh informasi header order pada *Topbar* atau judul rencana produksi membuka modal **`Production Running Detail` (`Gambar 76`)** pada Bagian D.1.

**B. Strip `8 Kartu Telemetri Live` & Peringatan Kecepatan (`[LINGKUP HMI] 03` - URS 19.3.4 Gambar 75)**
1. Di bawah kartu timeline terdapat strip **8 kartu KPI produksi *real-time*** yang diperbarui otomatis `< 1 detik` dari aliran telemetri `PLC-ABC` / `GW-100` (**Main Task 06**) dan rumus konversi Master SKU (**Main Task 04**):
   - **Kartu 1 - `Target Shift` (`Target`)**: menampilkan target produksi dalam satuan `Main Unit` (contoh: `12,000 pcs`) dan sub-konversi kemasan luar (contoh: `300 Karton` sesuai rasio konversi SKU `40 Sachet = 1 Karton`), dilengkapi **tombol sentuh ikon `Edit` (`Change Target`)** sesuai `Gambar 75`.
   - **Kartu 2 - `Achievement` (`Production Achievement`)**: menampilkan persentase pencapaian target dengan rumus `Finish Good / Target Shift x 100%` (contoh: `87.2%`) beserta sub-informasi `OEE Live` shift berjalan (contoh: `OEE Live 77.5%`).
   - **Kartu 3 - `Finish Good` (Kemasan)**: menampilkan jumlah produk baik bersih dalam `Main Unit` (contoh: `10,464 pcs` dari counter `CNT-G01 D003` dikurangi koreksi reject hilir bila ada) beserta sub-konversi kemasan terluar (contoh: `261.6 Karton` atau `261 Karton + 24 Sachet`).
   - **Kartu 4 - `Berat Bersih` (`Finish Good kg`)**: menampilkan konversi berat bersih produk baik dalam kilogram (`Finish Good x Berat Standar Main Unit`, contoh: `2,616 kg` `@250g Beryodium`).
   - **Kartu 5 - `Total Diproses` (`Total Production`)**: menampilkan total keseluruhan unit yang melewati mesin pengemasan (`Finish Good + Total Defect/Rework + Total Scrap`, contoh: `10,590 pcs`).
   - **Kartu 6 - `Speed (D002)`**: menampilkan kecepatan aktual mesin dari `SEN-S01` (`D002`, contoh: `38.4 pcs/mnt`) dibandingkan terhadap kecepatan ideal SKU (`Ideal 41.67 pcs/mnt`); apabila `reduced_speed_flag = true` dari **Main Task 06**, kartu ini menampilkan penanda peringatan kuning beserta *banner* `Kecepatan mesin di bawah standar!` (dan peringatan suhu apabila `D005 < 155.0 °C` atau `> 185.0 °C`).
   - **Kartu 7 - `Defect (D004 / D007)`**: menampilkan akumulasi `L-05 Process Defect / Rework` dalam `Main Unit` dan berat `kg` (contoh: `110 pcs` / `27.5 kg Seal`).
   - **Kartu 8 - `Scrap K3 (D008)`**: menampilkan akumulasi `L-06 Scrap Garam K3` dalam ekuivalen `Main Unit` dan berat `kg` (contoh: `16 pcs` / `4.0 kg Lantai`).
2. Sesuai aturan URS baris 2738-2740, apabila mesin fisik sudah berjalan menghasilkan pulsa `D003` sebelum operator sempat menginput *Production Order* (`Gambar 77`), sistem **tetap mengakumulasi produk yang lewat dan losses yang terjadi** ke sesi shift aktif, lalu mengikatkan akumulasi awal shift tersebut begitu operator mengaktifkan *Production Order* shift berjalan.

**C. Modal `Mulai Order Produksi Baru / Add New Production Active` (`[LINGKUP HMI] 04` Kartu Kiri - URS 19.3.4 Gambar 77)**
1. Saat operator memulai sesi produksi baru, sistem menampilkan formulir/modal **`Mulai Order Produksi` (`Add New Production Active` - `Gambar 77`)** dengan field dan aturan berikut:
   - `Nomor Production Order *` (`Production Order Number *`, *placeholder* `input production order number`, wajib isi, kode batch/order produksi unik dalam shift/hari terkait, contoh: `PO-20230527-U206`).
   - `Pilih SKU Garam *` (`SKU *`, *dropdown* wajib pilih, *placeholder* `select SKU`): hanya menampilkan daftar SKU berstatus aktif yang telah diikat ke *Line / Mesin* tersebut pada **Main Task 04** (contoh: `SKU-GRM-250 - Garam Konsumsi Beryodium 250g`).
   - `Parameter Auto-Load PLC / Cycle Time *`: field *read-only* (`(autofill)`) yang **terisi otomatis segera setelah `SKU *` dipilih**, menampilkan `Ideal Cycle Time` SKU (`0.024 mnt/pcs` | `41.67 pcs/mnt`) serta referensi suhu *sealer* SKU (`165 °C`).
   - `Waktu Mulai / Start *`: terisi otomatis secara *default* dengan waktu saat tombol dibuka (atau jam mulai shift aktif, dapat disesuaikan operator melalui pemilih waktu sentuh).
   - `Waktu Selesai / End *` dan `Target Output Shift / Target Production *`: bekerja secara **dua arah (*bidirectional autofill*)** menggunakan `Ideal Cycle Time` SKU terpilih:
     - Saat `SKU *` baru dipilih dengan rentang `Start *` s.d. akhir jam shift aktif (misal `07:00 - 15:00`), sistem menghitung saran `Target Output Shift *` secara otomatis (atau operator dapat langsung mengetik / menekan tombol panah atas-bawah pada `Target Output Shift *`, misal `12,000 pcs`, lengkap dengan keterangan konversi `300 Karton / 3,000 kg`).
     - Setiap kali operator mengubah angka `Target Output Shift *`, sistem menghitung ulang durasi rencana (`Durasi [menit] = Target Output [pcs] x Ideal Cycle Time [menit/pcs]`, ditambah jeda *Planned Rest* terjadwal bila melintasi jam istirahat) dan memperbarui jam `End * = Start + Durasi` secara otomatis.
   - Tombol sentuh sekunder `Batal` (`Discard`) dan tombol aksi primer `Aktifkan Order ke PLC-ABC` (`Save`).
2. Validasi saat `Aktifkan Order ke PLC-ABC` (`Save`) disentuh:
   - Menolak penyimpanan apabila `Nomor Production Order *` kosong, `SKU *` belum dipilih, `Target Output Shift * <= 0`, atau `End * <= Start *`.
   - Menolak aktivasi order baru apabila masih terdapat order produksi lain yang sedang berstatus `Running` pada mesin yang sama (operator wajib menyelesaikan atau menghentikan order aktif terlebih dahulu).
   - Setelah tersimpan, sistem memperbarui metadata `SKU`, `START`, `END`, dan `TARGET` pada *HMI Topbar*, mengirimkan parameter `Ideal Cycle Time` SKU aktif ke `GW-100` (**Main Task 06**) untuk acuan deteksi *Reduced Speed*, serta mencatat aktivitas `Production Running Start` ke `Log Activity` (**Main Task 10**).

**D. Modal `Production Running Detail`, Aksi `Stop`, `Change Target`, & Pengingat `Extra Time +30 Menit` (URS 19.3.4 Gambar 76 & Tabel 15)**
1. **Modal `Production Running Detail` & Aksi `Stop` (`Gambar 76`)**:
   - Menampilkan rincian lengkap order aktif dalam mode *read-only*: `SHIFT`, `AREA`, `LINE`, `SKU`, `PRODUCTION ORDER`, `START`, `END`, `CYCLE TIME`, `TARGET`, dan `CREATED BY` (nama/ID operator pembuat order), disertai tombol tutup `X` di kanan atas.
   - Memuat tombol destruktif lebar penuh **`Stop` (`Hentikan Order Produksi`)** di bagian bawah modal:
     - Saat disentuh, sistem menampilkan konfirmasi penghentian order agar tidak tertekan secara tidak sengaja.
     - Setelah dikonfirmasi, sesi order produksi ditutup pada waktu aktual penghentian; sesuai aturan URS baris 2702-2704, **sisa waktu jadwal yang belum terpakai hingga akhir shift tetap dikategorikan sebagai `Available Time` (abu-abu)** dan **tidak dihitung sebagai *Unplanned Downtime***, draf rekap produksi order disimpan untuk *Shift Report* (**Main Task 16**), dan aktivitas `Stop Production` dicatat ke `Log Activity`.
2. **Aksi `Change Target` dari Kartu `Target Shift` (`Gambar 75` & URS Baris 2730-2732)**:
   - Menyentuh ikon pensil `Edit` pada kartu `Target Shift` membuka dialog sentuh pengubahan target produksi (`Target Baru *` > 0).
   - Saat target baru disimpan, sistem otomatis memperbarui persentase `Achievement`, menghitung ulang durasi dan jam `End` pada `Event Timeline` serta *Topbar*, dan mencatat kejadian `Change Target` (nilai target lama -> target baru) ke `Log Activity` (**Main Task 10**).
3. **Notifikasi Otomatis & Aksi `Add Extra Time (+30 Menit)` (URS Baris 2725-2729)**:
   - Tepat **5 menit sebelum waktu `End` produksi berakhir** ketika order masih berstatus aktif berjalan, `Panel HMI-T7` memunculkan *banner/modal* pengingat tidak memblokir yang menawarkan penambahan waktu produksi (**`Tambah Extra Time +30 Menit`**) atau membiarkan order selesai sesuai jadwal.
   - Apabila operator menyentuh `Tambah Extra Time (+30 Menit)` (baik dari pengingat H-5 menit maupun dari tombol `+ Tambah Order / Waktu`), jam `End` produksi diperpanjang `30 menit`, rentang `Event Timeline` menyesuaikan secara dinamis, dan kejadian `Extra Time` dicatat ke `Log Activity` (**Main Task 10**).

**E. Integrasi Panel Bawah: Ringkasan `Downtime Unreason Queue` & Kartu Counter Sentuh `Defect / Scrap K3` (`[LINGKUP HMI] 03` - URS Gambar 75)**
1. Bagian bawah layar `Home` terbagi menjadi 2 kolom fungsional berdampingan:
   - **Kolom Kiri - Kartu `Downtime Unreason Queue`**:
     - Menampilkan daftar kejadian *Downtime* dan *Small Stop* shift berjalan yang diurutkan dengan kejadian `Unreasoned` berada paling atas beserta badge jumlah antrean (`<N> ANTREAN BELUM DIISI`, sinkron dengan angka badge merah pada ikon tab `Home` di *Bottom Nav* sesuai URS baris 2741).
     - Sesuai aturan URS baris 2753-2777, baris downtime yang **masih sedang berlangsung** (`end: Sedang Berlangsung`) diberi latar aksen **merah/peringatan**, sedangkan baris downtime yang **sudah selesai** (`end` dan `duration` sudah terisi) tampil dengan latar **putih/netral** beserta tombol sentuh `Isi Alasan` (atau `Ubah` bagi alasan yang sudah diisi operator dalam shift berjalan); mekanisme lengkap modal pengisian alasan (`Gambar 78`) dan interupsi layar penuh (`Gambar 80-81`) mengikuti **Main Task 09**.
   - **Kolom Kanan - 2 Kartu Counter Sentuh Kualitas & K3 (`tinggi tombol + >= 56 x 56 px`)**:
     - Kartu atas **`Process Defect / Rework (L-05 - Seal & Potongan)`**: menampilkan angka besar akumulasi `pcs`, konversi `(kg garam)`, referensi register `PLC-ABC D004 / D007`, serta tombol sentuh primer **`+`** yang membuka modal input `Gambar 79` dalam mode **`L-05 Process Defect / Rework`**.
     - Kartu bawah **`Scrap Garam K3 (L-06 - Tercecer / Startup / Non-Food)`**: menampilkan angka besar akumulasi `pcs` ekuivalen, konversi `(kg garam K3)`, referensi register `PLC-ABC D008`, serta tombol sentuh primer **`+`** yang membuka modal input `Gambar 79` dalam mode **`L-06 Scrap Garam K3`**.

**F. Modal Input Sentuh `Catat Produk Cacat / Rework & Scrap Garam K3` (`[LINGKUP HMI] 04` Kartu Kanan - URS 19.3.4 Gambar 79 & Tabel 15 Baris 2705-2716)**
1. Saat operator menyentuh tombol `+` pada salah satu dari kedua kartu kualitas di atas, sistem membuka modal **`Catat Produk Cacat / Garam K3` (`Gambar 79`)** dengan elemen berikut:
   - **Sakelar Jenis Kerugian Kualitas**: `L-05 Defect / Rework` (terpilih otomatis jika dibuka dari kartu atas) atau `L-06 Scrap K3` (terpilih otomatis jika dibuka dari kartu bawah).
   - **Dropdown `Satuan / Unit *`**: sesuai aturan URS baris 2706-2714, field ini **terisi otomatis secara *default* oleh `Main Unit` dari Master SKU aktif** (contoh: `Sachet / pcs @ 250 g`), dan menyediakan pilihan tingkat kemasan lain pada SKU tersebut (contoh: `Inner Pack`, `Master Karton`) maupun satuan timbangan langsung `Kilogram (kg)` (khususnya saat menimbang garam curah tercecer lantai pada akhir shift).
   - **Tampilan Angka Besar, Panah *Spinner* `^ / v`, & Tombol Tambah Cepat (*Quick Increment*)**:
     - Menampilkan angka kuantitas yang akan ditambahkan dalam ukuran besar (contoh: `+ 20 pcs`) beserta panah sentuh naik/turun (`^ / v` sesuai `Gambar 79`) dan tombol sentuh cepat **`+1`**, **`+5`**, **`+10`**, **`+<Konversi 1 Box/Karton>`** (contoh `+40 (1 Box)` untuk SKU 250g), serta tombol `Reset (0)`.
     - **Konversi Berat Otomatis ke `kg`**: setiap perubahan angka kuantitas atau satuan langsung memperbarui teks konversi berat bersih secara *real-time* di bawah angka utama (contoh: `+ 20 pcs -> Setara 5.0 kg Garam`, atau sebaliknya input `2.5 kg` untuk SKU 250g otomatis terkonversi ekuivalen `10 pcs` untuk perhitungan `L-06 Scrap = Total Scrap x Ideal Cycle Time / Loading Time`).
   - **Pilihan `Penyebab Cacat / Reject Reason *`**:
     - Wajib dipilih untuk pencatatan `L-05 Process Defect` dan `L-06 Scrap K3` dari daftar alasan kategori kualitas aktif pada **Main Task 05** (contoh: `Seal Plastik Tidak Rapat / Suhu Sealer Drop`, `Gramasi di Luar Toleransi Min/Max`, `Potongan Kemasan Miring / Film Terlipat`, `Startup Trial Awal Shift`, `Garam Tercecer Lantai K3`), serta opsional/catatan singkat untuk `Rework` murni yang dapat dikemas ulang.
   - Tombol sekunder `Batal` (`Discard`), tombol primer `Simpan ke Register D007/D008 & Server` (`Save`), dan tombol tutup `X`.
2. Validasi dan sinkronisasi saat `Simpan` disentuh:
   - Menolak penyimpanan apabila kuantitas bernilai `<= 0` atau `Penyebab Cacat *` belum dipilih saat wajib.
   - Menambahkan kuantitas baru ke akumulasi shift aktif (`D007` untuk `L-05 Defect` atau `D008` untuk `L-06 Scrap K3`), memperbarui nilai `Quality Rate` dan `OEE Live` pada layar `Home` dalam `< 1 detik`, menyinkronkan nilai register kembali ke `GW-100 / PLC-ABC`, serta mencatat transaksi (`Reject`, `Rework`, atau `Scrap K3` lengkap dengan `operator_id`, kuantitas `pcs`, berat `kg`, dan alasan) ke `Log Activity` (**Main Task 10**).

**G. Ketahanan Operasional Mode *Offline Queue* pada `Panel HMI-T7`**
1. Sesuai spesifikasi *Failover* Skenario A pada [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md) Bagian 10.A dan NFR PRD Bagian 3.4:
   - Apabila koneksi jaringan dari `Panel HMI-T7` ke Backend Server `VM1` terputus di tengah produksi, operator **tetap dapat menginput** order produksi, perubahan target, *extra time*, penambahan *Defect / Rework / Scrap K3*, serta klasifikasi downtime tanpa kehilangan fungsi layar.
   - Seluruh transaksi disimpan di penyimpanan lokal `Panel HMI-T7` (*local storage / IndexedDB queue* dengan kapasitas antrean minimal **`4 jam`** operasi), sedangkan *HMI Topbar* menampilkan badge peringatan **`OFFLINE - Data Queued (<N>)`**.
   - Begitu koneksi ke `VM1` pulih, `Panel HMI-T7` mengirim seluruh antrean secara berurutan (**FIFO**) dengan mempertahankan `timestamp` asli saat operator menekan tombol dan menyertakan penanda `sync_delayed = true` di Backend tanpa menduplikasi transaksi.

## Catatan
- **Rekonsiliasi Rumus Estimasi Durasi Order (`Tabel 15 Baris 2640` vs Satuan `Ideal Cycle Time` Jurnal & Salah Ketik Placeholder `Gambar 77`)**: Teks Tabel 15 URS baris 2640 menulis `Durasi = Target Produksi / Cycle Time` (mengasumsikan kecepatan dalam `unit/menit`), sedangkan `Ideal Cycle Time` standar jurnal PT. XYZ pada **Main Task 04** disimpan dalam satuan `menit/pcs` (`0.024 menit/pcs`, setara kecepatan `41.67 pcs/menit`); oleh karena itu rumus durasi pada AC Bagian C.1 ditulis secara konsisten sebagai `Durasi (menit) = Target Output (pcs) x Ideal Cycle Time (menit/pcs)`. Selain itu, salah ketik *placeholder* `"input start time"` pada kolom `End *` di `Gambar 77` URS telah dikoreksi menjadi waktu selesai (`End *`) dengan kalkulasi dua arah terhadap `Target Output Shift *`.
- **Penyatuan Modal `Add Rework` & `Add Reject / Scrap K3` (`Gambar 79` vs Teks Tabel 15 Baris 2705-2716)**: Teks Tabel 15 URS mendefinisikan dua aksi terpisah (`Add Rework` dan `Add Reject` dengan pilihan `Unit` dari `Main Unit` SKU + `Reject Reason` + konversi otomatis ke `kg`), namun URS Bab 19.3.4 hanya menyertakan `Gambar 79 Mockup Add Rework` tanpa gambar terpisah untuk `Add Reject`. Mengikuti desain `[LINGKUP HMI] 04` di [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) dan kebutuhan pencatatan 6 Big Losses jurnal PT. XYZ (`L-05 Process Defect` & `L-06 Scrap`), modal `Gambar 79` melayani kedua kategori tersebut melalui sakelar `L-05 Defect / Rework` (`D007`) dan `L-06 Scrap K3` (`D008`) lengkap dengan tombol tambah cepat ramah sarung tangan (`+1`, `+5`, `+10`, `+1 Box`).
