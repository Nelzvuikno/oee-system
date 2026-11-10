# Main Task 14: Aplikasi Web - Analitik Mendalam Availability Loss, Performance Speed Loss, dan Quality Defect/Scrap Loss

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 08`, `[LINGKUP WEB] 09`, `[LINGKUP WEB] 10`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.22` Gambar 66-67, `19.2.23` Gambar 68, `19.2.24` Gambar 69, & Tabel 15-17 baris 2963-2971, 3042-3073, 3232-3240, 3311-3320, 4515-4550) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)` dapat menelusuri akar penyebab kehilangan efektivitas mesin secara mendalam pada halaman terpadu **`Losses Analysis`** yang terbagi atas tiga pilar utama:
1. **`Availability Loss`** (Pareto `Unplanned` & `Planned Downtime` dengan rincian frekuensi *action tag*, rekapitulasi `Equipment Failure L-01` vs `Setup & Adjustment L-02`, serta *drill-down* **`Losses Detail`** ke setiap kejadian henti mesin individual beserta koreksi klasifikasi downtime),
2. **`Performance Loss`** (analisis penurunan kecepatan `Reduced Speed L-04` dan `Idle & Minor Stoppages L-03`, grafik garis per jam `Cycle Time Target vs Total Production vs Actual Good Production`, serta komparasi kecepatan aktual `SEN-S01 D002` terhadap kecepatan ideal `41.67 pcs/mnt`), dan
3. **`Quality Loss`** (Pareto penyebab cacat kemasan `Process Defect L-05` dan `Rework / Scrap Garam K3 L-06`, grafik komparasi kualitas per jam, korelasi suhu elemen pemanas `SEN-T01 D005`, serta tabel konversi unit kemasan aktual ke satuan primer/berat bersih).

## Prasyarat
- Pengguna telah login pada Aplikasi Web dengan peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, atau `SuperAdmin (OT/IT)` (mengikuti **Main Task 01**).
- Struktur aset `Area`, `Line`, `Machine`, dan `Sub-Machine` (**Main Task 02**), Master `SKU`, hierarki konversi kemasan, dan `Ideal Cycle Time` (**Main Task 04**), serta Master `Downtime Category & Reason` (**Main Task 05**) telah terdaftar aktif.
- Layanan akuisisi Edge `Gateway GW-100` dan *Rule Engine* OEE (**Main Task 06**) telah merekam data kejadian downtime (`D000`, `D001`, `D009`, `D010`), kecepatan putaran (`D002`), counter output/reject (`D003`, `D004`, `D007`, `D008`), serta pembacaan suhu sealer (`D005`).

## User Journey
- Pengguna masuk ke halaman **`Losses Analysis`** melalui tombol pintas ekspansi **`↗`** pada kartu `Losses` di halaman **`Line Detail`** (**Main Task 12**), dari detail **`Report by Shift / By Product`** (**Main Task 16**), dari tombol **`↗`** grafik Pareto di **`OEE Performance`** (**Main Task 13**), atau langsung melalui menu navigasi **`Production Running > Losses Analysis`**.
- Di bagian atas halaman, pengguna memilih cakupan `Area`, `Line / Machine`, `Periode / Shift`, serta memfilter berdasarkan kode **`Production Order`** (`Semua Order`, masing-masing nomor `No. Production` yang berjalan, atau tab **`Without No. Production`** untuk memeriksa kerugian waktu di luar order aktif).
- Pada tab pertama **`1. Availability Loss`** (`[LINGKUP WEB] 08` / `Gambar 66`), pengguna memeriksa grafik **`Pareto Unplanned Downtime`** (atau beralih ke sub-tab **`Planned Downtime`**), mengarahkan kursor ke batang penyebab tertinggi untuk melihat rincian frekuensi *action tag* perbaikan yang paling sering dilakukan, meninjau tabel rekapitulasi `Breakdown (L-01)` vs `Setup & Adjustment (L-02)`, lalu mengklik ikon mata **`👁`** pada salah satu baris tabel `Downtime Reason`.
- Sistem membuka tampilan *drill-down* **`Losses Detail`** untuk alasan downtime tersebut (`Gambar 67`), menampilkan daftar seluruh kejadian individual lengkap dengan `Downtime ID`, `No. Production`, `Start`, `End`, `Duration`, `Input by`, tombol **`View history`**, ikon **`👁` (`View Detail`)**, serta ikon **`✎` (`Edit Downtime`)** untuk mengoreksi klasifikasi alasan selama laporan shift belum `Released`.
- Pengguna berpindah ke tab kedua **`2. Performance Loss`** (`[LINGKUP WEB] 09` / `Gambar 68`) untuk mengevaluasi kehilangan waktu terbesar mesin pengemasan garam (`Reduced Speed L-04` dan `Idle & Minor Stop L-03`), menganalisis grafik garis per jam (`Target Capacity / Cycle Time`, `Total Production`, dan `Actual Good Production`) maupun tren degradasi kecepatan rata-rata `D002 (pcs/mnt)` terhadap kapasitas desain `41.67 pcs/mnt`.
- Pengguna berpindah ke tab ketiga **`3. Quality Loss`** (`[LINGKUP WEB] 10` / `Gambar 69`) untuk memeriksa **`Quality Loss Pareto`** (seperti *Seal Tidak Rapat akibat Korosi Heater*, *Potongan Sachet Miring*, *Berat Kurang*, dan *Garam Tercecer di Hopper/Lantai K3*), memantau stabilitas suhu `SEN-T01`, melihat perbandingan `Finish Good`, `Reject`, `Rework/Scrap`, dan `Anomali` per jam, serta meninjau tabel rincian cacat beserta konversi unit kemasan (`Actual Unit` ke `Conversion Unit` `pcs` & `kg`).

## Acceptance Criteria:

**A. Kerangka Navigasi Terpadu `Losses Analysis`, Konteks Filter `Production Order`, & Hak Akses**
1. Halaman `Losses Analysis` dapat diakses oleh peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)`; apabila dibuka melalui pintasan `↗` dari `Line Detail` (**Main Task 12**), `OEE Performance` (**Main Task 13**), atau `Report Detail` (**Main Task 16**), konteks filter `Area`, `Line / Machine`, `Tanggal / Shift`, dan pilar tab tujuan otomatis terisi (*pre-applied*), serta tombol kembali `<- Losses` mengembalikan pengguna ke halaman asal.
2. Bilah kontrol atas halaman `Losses Analysis` wajib menyediakan:
   - Filter cakupan **`Area`**, **`Line / Machine`**, dan **`Periode`** (mode `Shift / Harian` untuk analisis per jam, atau mode `Rentang Tanggal / Bulanan` untuk evaluasi tren pra-TPM vs pasca-TPM),
   - Pemilih cakupan **`No. Production / Production Order`** (`Gambar 66 & 68`):
     - **`Semua Aktivitas`** (menggabungkan seluruh order dan jeda antar-order pada periode terpilih),
     - Daftar tab/pilihan dinamis setiap **`No. Production`** yang berjalan pada shift/hari terpilih (contoh: `PO-20230526-U206`), dan
     - Tab khusus **`Without No. Production`** untuk memisahkan kejadian downtime atau pemanasan/sanitasi mesin yang tercatat oleh `PLC-ABC` saat tidak ada `Production Order` aktif,
   - Sakelar berpindah antar 3 pilar utama (**Segmented Pillar Tabs**): **`1. Availability Loss`**, **`2. Performance Loss`**, dan **`3. Quality Loss`** tanpa kehilangan filter `Area`, `Line`, dan `Periode` yang sedang dipilih, serta
   - Tombol **`Download CSV / PDF`** untuk mengekspor grafik dan tabel pilar yang sedang aktif.

**B. Pilar 1: `Availability Loss` - Grafik Pareto dengan *Tooltip Action-Tag* & Tabel Agregasi (`[LINGKUP WEB] 08` - URS 19.2.22 Gambar 66)**
1. Di bagian atas konten `Availability Loss`, tersedia sakelar sub-kategori henti mesin (`Gambar 66`):
   - **`Unplanned Downtime`** (terpilih secara *default*, mencakup kategori `L-01 Equipment Failure / Breakdown` dan `L-02 Setup & Adjustment` tak terencana), dan
   - **`Planned Downtime`** (mencakup kegiatan terjadwal seperti *Sanitasi Endapan Garam*, *Briefing Shift & Pemanasan Awal Sealer*, *Preventive Maintenance*, serta *Schedule Loss*).
2. **Kartu Grafik `Pareto Unplanned / Planned Downtime`**:
   - Menampilkan diagram kombinasi batang vertikal (`Minutes of Downtime` pada sumbu Y kiri, terurut menurun dari durasi tertinggi di kiri ke terendah di kanan) dan kurva garis persentase kumulatif (`0% - 100%` pada sumbu Y kanan).
   - **Tooltip Rincian *Action Tag* & Frekuensi (`Gambar 66`)**: saat pengguna mengarahkan kursor (*hover*) ke salah satu batang alasan downtime, *tooltip* wajib menampilkan:
     - Nama `Downtime Reason` dan `Downtime Category`,
     - Total durasi (`menit` & format `Xj Ym`), total frekuensi kejadian (`<N>x`), serta persentase kontribusi individual dan kumulatif (`%`), dan
     - Daftar rincian **`Action Tags` (Tindakan Perbaikan)** yang diambil pada alasan tersebut beserta frekuensi masing-masing *tag* (contoh: `Kalibrasi ulang rotary cutter: 12x`, `Ganti pisau SS316: 4x`, `Pelumasan food-grade: 2x`).
3. **Kartu Ringkasan Diagnostik `L-01` vs `L-02` & Tabel Rekapitulasi Periode (`[LINGKUP WEB] 08`)**:
   - Menampilkan ringkasan pemisahan kontribusi **`Equipment Failure (L-01)`** (durasi `menit` & `%` terhadap `Loading Time`) dan **`Setup & Adjustment (L-02)`** (durasi `menit` & `%` terhadap `Loading Time`), indikator perubahan `Availability (%)` terhadap periode pembanding, serta referensi sumber akuisisi `PLC-ABC D000 & D001`.
   - Pada mode analisis lintas periode (`Rentang Tanggal / Bulanan`), menampilkan tabel rekapitulasi `Availability Loss` dengan kolom: `Periode`, `Loading Time (mnt)`, `Breakdown L-01 (mnt & %)`, `Setup & Adj L-02 (mnt & %)`, `Total Downtime (mnt)`, `Operating Time (mnt)`, dan `Availability (%)`.
4. **Tabel Agregasi `Downtime Reason` (`Gambar 66` Bawah)**:
   - Menampilkan daftar teragregasi per alasan downtime dengan kolom:
     - `Downtime Category` (contoh: `L-02 Setup & Adjustment`, `L-01 Equipment Failure`),
     - `Downtime Reason` (contoh: `Setup & Setting Pisau Pemotong`, `Korosi Elemen Heater Sealer`),
     - `Freq.` (jumlah kejadian dalam angka bulat),
     - `Total Duration` (akumulasi durasi dalam `menit` dan konversi `jam`), dan
     - `Actions`: tombol ikon mata **`👁` (`Lihat Rincian Kejadian`)**.

**C. Tampilan Drill-Down `Losses Detail` per Alasan Downtime (`[LINGKUP WEB] 08` Drawer / Sub-Halaman - URS Gambar 67)**
1. Mengklik ikon mata **`👁`** pada baris tabel agregasi `Downtime Reason` (atau mengklik langsung salah satu batang pada grafik `Pareto Downtime`) membuka tampilan **`Losses Detail`** untuk `Downtime Reason` terpilih (`Gambar 67`).
2. Header `Losses Detail` menampilkan:
   - Tombol kembali `<- <Nama Downtime Reason>` beserta *breadcrumb* `Losses > Availability Loss > <Nama Downtime Reason>`,
   - Stempel waktu pembaruan data `Last update: DD/MM/YYYY at HH:mm`, dan
   - Tombol **`View history`**: menampilkan log riwayat perubahan/koreksi klasifikasi yang pernah dilakukan oleh `Supervisor` atau `Shift Leader` pada kelompok alasan downtime tersebut.
3. Tabel kejadian individual pada `Losses Detail` (`Gambar 67`) menampilkan seluruh peristiwa henti mesin penyusun alasan tersebut dengan kolom:
   - `#` (nomor urut baris),
   - `Downtime ID` (kode unik kejadian, contoh: `DT-20230526-01`),
   - `Machine` (beserta `Sub-Machine` bila tercatat),
   - `No. Production` (kode `Production Order` saat kejadian berlangsung, atau tanda `-` apabila kejadian berlangsung di luar order aktif / *Without No. Production*),
   - `Start` (`DD/MM/YYYY, HH:mm:ss` dari `PLC-ABC`),
   - `End` (`DD/MM/YYYY, HH:mm:ss` dari `PLC-ABC`, atau `Ongoing`),
   - `Duration` (`menit` / `Xm Ys`),
   - `Input by` (nama akun `Operator` `Panel HMI-T7` atau `PLC-AUTO`), dan
   - **2 Tombol Ikon Aksi**:
     - Ikon mata **`👁` (`View Detail`)**: menampilkan modal/panel baca rincian lengkap (`Sumber Trigger PLC-ABC`, `Detail Reason`, daftar `Action Tags`, dan riwayat pengubah).
     - Ikon pensil **`✎` (`Edit Downtime`)**: membuka *slide-over drawer* **`Edit Downtime Reason` (`Gambar 65`)** untuk mengoreksi kategori, alasan, detail, atau tindakan dengan mematuhi aturan penguncian `Start / End / Duration` *read-only* serta pemblokiran edit (`[Locked]`) apabila laporan shift terkait telah berstatus `Released` (mengikuti mekanisme **Main Task 12** Bagian G).

**D. Pilar 2: `Performance Loss` - KPI Kecepatan, Grafik Multi-Seri Per Jam, & Komparasi Degradasi Speed (`[LINGKUP WEB] 09` - URS 19.2.23 Gambar 68 & Baris 3318-3320)**
1. **Deretan 4 Kartu KPI `Performance Loss`**:
   - **`Reduced Speed Loss (L-04)`**: total waktu produksi yang hilang akibat mesin berjalan di bawah kecepatan ideal (`menit` & `%` terhadap `Loading Time`) beserta nilai **`Avg. Reduced Speed`** (`selisih rata-rata pcs/mnt atau pcs/jam di bawah standar` sesuai header `Gambar 68`).
   - **`Idle & Minor Stoppages (L-03)`**: total akumulasi waktu jeda singkat `< 5 menit` (`register D009=1`, dalam `menit`, `%` terhadap `Loading Time`, dan total frekuensi kejadian *small stop*).
   - **`Kecepatan Ideal vs Avg. Actual Cycle Time (SEN-S01)`**: menampilkan kapasitas kecepatan desain SKU aktif dari **Main Task 04** (contoh: `41.67 pcs/mnt` / `Ideal Cycle Time 0.024 mnt/pcs` = `2,500 pcs/jam`) disandingkan dengan kecepatan/waktu siklus rata-rata aktual (`Avg. Cycle Time` dari `PLC-ABC D002`).
   - **`Performance Rate (%)`**: persentase efisiensi kecepatan aktual (`(Total Production x Ideal Cycle Time) / Operating Time x 100%`) beserta selisihnya terhadap periode *baseline* dan target JIPM (`>= 95.00%`).
2. **Grafik Analitik Kecepatan & Output (2 Mode Tampilan Sesuai Cakupan Waktu)**:
   - **Mode `Shift / Harian` - Grafik Garis Multi-Seri Per Jam (`07:00 .. 15:00` sesuai `Gambar 68` & URS Baris 3318-3320)**:
     - Menampilkan grafik garis seri waktu per jam sepanjang shift/hari dengan 3 seri berlegenda jelas:
       1. Garis referensi horizontal merah **`Standard Capacity / Ideal Cycle Time`** yang nilainya dihitung secara dinamis dari `Ideal Cycle Time` dan konversi unit kemasan `SKU` yang sedang berjalan pada jam tersebut (mendukung peralihan satuan sumbu Y antara `pcs/jam`, `pcs/mnt`, atau satuan kemasan sekunder `box / bag / karton per jam` sesuai hierarki **Main Task 04**),
       2. Kurva hijau **`Total Production`** per jam (`Finish Good + Process Defect + Scrap` yang tercatat setiap jam), dan
       3. Kurva biru **`Actual Good Production`** per jam (`Finish Good` bersih per jam).
     - *Hover tooltip* pada setiap titik jam menampilkan: rentang jam, `SKU Aktif`, kecepatan rata-rata `SEN-S01 (D002)`, `Total Production`, `Actual Good Production`, durasi `Small Stop (L-03)` pada jam tersebut, menit `Reduced Speed (L-04)`, serta status deteksi otomatis (`Reduced Speed Detected` bila `D002 < 38.0 pcs/mnt`).
   - **Mode `Lintas Periode / Bulanan` - Grafik Komparasi Degradasi Kecepatan Aktual vs Ideal (`[LINGKUP WEB] 09`)**:
     - Menampilkan diagram batang perbandingan kecepatan rata-rata aktual (`pcs/mnt`) antarbulan/hari terhadap batang acuan **`Ideal Design (100% Speed = 41.67 pcs/mnt)`** lengkap dengan label `Performance Rate (%)` pada tiap periode.
3. **Tabel Rincian `Performance Loss` (`[LINGKUP WEB] 09`)**:
   - Menampilkan tabulasi terstruktur per jam (pada mode `Shift/Harian`) atau per bulan/tanggal (pada mode `Lintas Periode`) dengan kolom: `Periode / Jam`, `Operating Time (mnt)`, `Total Diproses (pcs)`, `Kecepatan Rata-Rata (pcs/mnt)`, `Idle & Minor Stop L-03 (mnt & %)`, `Reduced Speed L-04 (mnt & %)`, `Net Operating Time (mnt)`, dan `Performance (%)`.

**E. Pilar 3: `Quality Loss` - Pareto Penyebab Cacat, Grafik Kualitas Per Jam, & Tabel Konversi Kemasan (`[LINGKUP WEB] 10` - URS 19.2.24 Gambar 69 & Baris 3266-3267, 3315-3317)**
1. **Deretan 4 Kartu KPI `Quality Loss`**:
   - **`Process Defect Kemasan / Seal (L-05)`**: total produk cacat proses (`CNT-R01 D004` + input manual `HMI-T7 D007` dalam `pcs`), ekuivalen waktu produksi yang terbuang (`menit` = `Defect_pcs x Ideal_Cycle_Time`), dan `%` terhadap `Loading Time`.
   - **`Rework & Scrap Garam K3 (L-06)`**: total produk rework dan garam tercecer tidak layak kemas (`input HMI-T7 D008` dalam `pcs` dan konversi berat `kg`), ekuivalen waktu terbuang (`menit`), dan `%` terhadap `Loading Time`.
   - **`Indikator Suhu Sealer (SEN-T01 D005)`**: menampilkan rata-rata suhu elemen pemanas vertikal (`C`) terhadap pita batas aman penyegelan plastik PE (`160.0 C - 170.0 C`) beserta jumlah insiden deviasi suhu (`< 155.0 C` atau `> 185.0 C`) pada periode tersebut.
   - **`Quality Rate (%)`**: persentase rasio produk baik (`Finish Good / Total Production x 100%`) beserta selisihnya terhadap *baseline* dan target JIPM (`>= 99.00%`).
2. **Grafik 1 - `Quality Loss Pareto` (`Gambar 69` Atas & `[LINGKUP WEB] 10`)**:
   - Menampilkan diagram kombinasi batang vertikal (`Total Reject / Scrap [unit / pcs]` pada sumbu Y kiri, terurut menurun dari kiri ke kanan) dan kurva garis persentase kumulatif (`0% - 100%` pada sumbu Y kanan) untuk setiap alasan cacat kemasan dan scrap/rework (contoh: `Seal Tidak Rapat [Heater Korosi]`, `Potongan Sachet Miring [Pisau]`, `Berat Sachet < 248g [Auger]`, `Garam Tercecer Hopper [Scrap K3]`), dilengkapi label *tag* sumber sensor/input (`SEN-T01 D005`, `CNT-R01 D004`, `Input HMI D007/D008`).
3. **Grafik 2 - Komparasi Kualitas Per Jam (`Finish Good vs Reject vs Rework/Scrap vs Anomali`) (URS Baris 3266-3267 & 3315-3317)**:
   - Menyediakan tampilan diagram batang per jam (*hourly bar chart*) sepanjang shift yang membandingkan kuantitas `Finish Good`, `Reject (Process Defect L-05)`, `Rework / Scrap K3 (L-06)`, serta indikator **`Anomali Kualitas`** (ditandai otomatis apabila dalam suatu jam nilai `Reject + Scrap` melampaui ambang batas peringatan kualitas atau terjadi selisih tidak wajar pada total counter).
4. **Tabel Rincian `Reject, Rework & Scrap` Beserta Konversi Hierarki Unit Kemasan (`Gambar 69` Bawah & `[LINGKUP WEB] 10`)**:
   - Menampilkan total ringkasan unit di sudut kanan atas header tabel serta daftar rincian per kategori/alasan kehilangan kualitas dengan kolom:
     - `#` (nomor urut),
     - `Kategori & Alasan Kualitas (Reject / Rework / Scrap Reason)` (hanya memuat master alasan cacat/rework/scrap yang sah, contoh: `Seal vertikal bocor / suhu heater drop`, `Potongan miring`, `Garam lembap/tercecer di lantai K3`),
     - `Machine` & `Sumber Akuisisi` (`CNT-R01 Otomatis` atau `Input HMI-T7`),
     - `Actual Unit` (kuantitas dalam unit pencatatan aktual beserta satuan hierarki kemasan dari **Main Task 04**, contoh: `pcs / sachet`, `inner / pack`, atau `carton / bag`),
     - `Conversion Unit` (hasil konversi otomatis ke satuan kemasan standar lini `pcs` sekaligus bobot bersih `kg` garam, contoh: `398 pcs (99.50 kg)` untuk `SKU 250g`),
     - `Waktu Loss (menit)` (`Conversion_pcs x Ideal_Cycle_Time`), dan
     - `Actions`: tombol ikon mata **`👁` (`Lihat Detail Pencatatan`)** yang membuka panel rincian log waktu pencatatan per jam/shift, `No. Production`, nama operator pencatat di `Panel HMI-T7`, serta korelasi suhu `SEN-T01` pada jam kejadian.
   - Pada mode evaluasi lintas periode, menyediakan pula tabulasi rekapitulasi kualitas per periode (`Periode`, `Total Diproses`, `Produk Baik`, `Defect Seal [pcs]`, `Scrap K3 [pcs]`, `Waktu Loss [mnt]`, dan `Quality Rate [%]`).

## Catatan
- **Penyeragaman Template Mockup `Gambar 69 (Quality Loss)` & Koreksi Teks `downtime-reason` pada Kolom `Reject Reason` (`Halaman 90 URS`)**: Pada dokumen URS, `Gambar 66` (*Availability Loss*) dan `Gambar 68` (*Performance Loss*) menggunakan kerangka halaman `<- Losses` dengan 3 tab pilar (`Availability Loss | Performance Loss | Quality Loss`), sedangkan `Gambar 69` (*Quality Loss*) ditempel dari template lama berjudul `<- Detail Report` yang memuat *sidebar* usang (`ROCE`, `OEE Yearly Target`), 4 tab (`Schedule Loss` di samping ketiga loss), serta kesalahan salin-tempel pada baris ke-4 s.d. ke-6 tabel bawah di mana kolom `Reject Reason` malah berisi teks `downtime-reason`. Pada AC Bagian A dan Bagian E.4, ketiga pilar disatukan dalam satu kerangka halaman `Losses Analysis` yang konsisten, kehilangan jadwal terencana dianalisis pada sub-tab `Planned Downtime`, dan tabel `Quality Loss` hanya memuat alasan cacat/rework/scrap yang valid.
- **Pelurusan Tab Duplikat `No. Production` (`Gambar 66 & 68`) & Garis Target Statis `50 box/jam` (`Gambar 68`)**: Label tab ganda `No. Production | No. Production | Without No. Production` pada mockup `Gambar 66` dan `Gambar 68` diluruskan menjadi daftar dinamis nomor `Production Order` aktual yang berjalan pada periode terpilih (ditambah opsi `Semua Aktivitas` dan `Without No. Production`). Selain itu, garis referensi merah pada grafik `Performance Loss` (`Gambar 68`, tertulis statis `50 box/jam`) wajib dihitung secara dinamis dari `Ideal Cycle Time` dan konversi kemasan Master SKU (**Main Task 04**).
