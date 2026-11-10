# Main Task 13: Aplikasi Web - Dashboard Eksekutif Business Impact dan Evaluasi OEE Performance & Six Big Losses

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 04`, `[LINGKUP WEB] 05`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.4` Gambar 18, `19.2.5` Gambar 19, & Tabel 17 baris 3154-3189) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
Manajemen pabrik (`Admin / Manager` dan `SuperAdmin`) dapat mengevaluasi dampak kerugian operasional secara fisik maupun finansial pada dashboard **`Business Impact`** (mencakup volume `Finish Good` & `Revenue`, kehilangan waktu `Time & Financial Opportunity Loss / FOL`, serta kehilangan produk cacat/scrap `Financial Reject Loss / FRL`), sementara `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin` dapat menganalisis kinerja menyeluruh peralatan pada dashboard **`OEE Performance`** (mencakup skor `OEE`, `TEEP`, `Utility`, `Availability`, `Performance`, `Quality`, `Achievement Rate`, peringkat **Six Big Losses**, tren historis terhadap standar **JIPM World Class `85.00%`**, proporsi donat waktu/kerugian, 4 grafik kombinasi **Pareto**, serta matriks kalender *heatmap* harian pabrik).

## Prasyarat
- Pengguna telah login pada Aplikasi Web sesuai kewenangan perannya pada **Main Task 01**:
  - `Admin / Manager` atau `SuperAdmin (OT/IT)` untuk mengakses **`Dashboard > Business Impact`** dan **`Dashboard > OEE Performance`**.
  - `Supervisor (SPV)` untuk mengakses **`Dashboard > OEE Performance`** (halaman *landing default* `SPV`).
- Master hierarki `Factory`, `Area`, `Line`, dan `Machine` (**Main Task 02**), Master `SKU` beserta `Ideal Cycle Time` dan parameter opsional `Harga / Tarif Valuasi Standar (IDR)` (**Main Task 04**), serta Master `Downtime Category & Reason` (**Main Task 05**) telah terkonfigurasi.
- Data produksi historis dan/atau *real-time* dari *Rule Engine* OEE `VM1` (**Main Task 06**) telah tersimpan pada basis data seri waktu.

## User Journey
- Saat `Admin / Manager` atau `SuperAdmin` login ke Aplikasi Web, sistem menampilkan halaman utama **`Dashboard > Business Impact`** (`[LINGKUP WEB] 04` / `Gambar 18`).
- Pengguna memilih filter `Periode / Tahun` (misal membandingkan periode *baseline* `Jul-Nov 2022` dengan periode evaluasi pasca-TPM `Mei 2023`, atau tahun berjalan), `Factory` (`PT. XYZ`), dan `Area` (`Unit 2 Garam Konsumsi`).
- Pengguna meninjau 3 kartu ringkasan dampak bisnis di bagian atas (`Volume Produksi & Revenue`, `Reject & Scrap Opportunity Loss / FRL`, dan `Time Opportunity Loss / FOL`), memeriksa grafik tren bulanan/harian **`Time & Financial Opportunity Loss`** serta **`Reject & Scrap Loss (Process Defect + Scrap K3)`** per lini, lalu mengunduh laporan ringkasannya melalui tombol **`Download`**.
- Selanjutnya pengguna (atau `Supervisor (SPV)` saat pertama kali login) membuka halaman **`Dashboard > OEE Performance`** (`[LINGKUP WEB] 05` / `Gambar 19`), lalu menetapkan cakupan analisis (`Factory / Area / Line / Machine`) dan granularitas waktu (`Monthly` atau `Yearly`).
- Pengguna memeriksa deretan kartu KPI (`OEE`, `TEEP`, `Utility`, `Availability`, `Performance`, `Quality`, `Achievement Rate`, dan `Ideal Cycle Time`) beserta selisihnya terhadap target **JIPM `85.00%`**, mengidentifikasi penyumbang kerugian terbesar pada kartu peringkat **`Six Big Losses (#1 s.d. #6)`**, serta memantau pergerakan grafik **`OEE & TEEP Trend`**.
- Pengguna menggulir ke bawah untuk melihat komposisi 2 grafik donat (**`Calendar / Loading vs Operating Time`** dan **`OEE Losses Breakdown`**), menganalisis akar masalah 80/20 pada 4 grafik kombinasi **`Pareto`** (`Downtime Pareto`, `Pareto Action`, `Schedule / Planned Loss Pareto`, `Quality Loss Pareto`), dan memindai konsistensi performa harian sepanjang tahun pada matriks kalender **`OEE & TEEP Factory Daily Performance`**, lalu mengklik salah satu sel tanggal merah (`[LOW < 75%]`) untuk menelusuri detail laporan shift hari tersebut.

## Acceptance Criteria:

**A. Pembatasan Hak Akses (RBAC) & Bilah Filter Global Dashboard**
1. Otorisasi akses halaman di bawah grup menu `Dashboard` wajib ditegakkan sesuai matriks **Main Task 01**:
   - **`Dashboard > Business Impact`**: hanya dapat diakses oleh `Admin / Manager` dan `SuperAdmin (OT/IT)` (menjadi *default landing page* pasca-login bagi kedua peran tersebut). Akses langsung via URL oleh `Shift Leader` atau `Supervisor (SPV)` wajib ditolak (`HTTP 403 Forbidden`).
   - **`Dashboard > OEE Performance`**: dapat diakses oleh `Supervisor (SPV)` (menjadi *default landing page* pasca-login bagi `SPV`), `Admin / Manager`, dan `SuperAdmin (OT/IT)`. Akses langsung via URL oleh `Shift Leader` wajib ditolak (`HTTP 403 Forbidden`).
2. Setiap perubahan nilai filter pada bilah filter atas (`Periode / Tahun / Bulan`, `Factory`, `Area`, `Line`, atau `Machine`) wajib memperbarui seluruh kartu KPI dan grafik pada halaman secara sinkron dengan menampilkan indikator *loading* non-destruktif; apabila kombinasi filter belum memiliki riwayat produksi, sistem menampilkan *empty state* informatif (`"Belum ada rekaman produksi pada cakupan aset dan periode terpilih"`).

**B. Halaman `Dashboard > Business Impact` - Filter, Mode Dual-Valuasi KPI, & Ekspor (`[LINGKUP WEB] 04` - URS 19.2.4 Gambar 18 & Tabel 17 Baris 3154-3160)**
1. Bilah kontrol atas halaman `Business Impact` menyediakan:
   - Pemilih **`Periode / Year`**: mendukung pemilihan tahun penuh (`Jan - Dec`), bulan spesifik, atau rentang tanggal kustom (termasuk komparasi sebelum vs sesudah TPM).
   - Dropdown **`Factory`**: memuat pabrik aktif dari **Main Task 02** (secara *default* pabrik utama, contoh `PT. XYZ`).
   - Dropdown **`Area`**: memuat area aktif di bawah `Factory` terpilih (secara *default* `Semua Area`, dengan opsi memfilter ke `Unit 2 Garam Konsumsi` serta sub-filter opsional `Line`).
   - Tombol **`Download`** di sudut kanan atas: mengekspor ringkasan KPI dampak bisnis beserta tabel data seri waktu grafik ke dalam berkas `.csv` atau `.pdf`.
2. **Deretan 3 Kartu KPI Utama `Business Impact` (Mode Dual-Valuasi Fisik & Finansial)**:
   - **Kartu 1 - `Volume Produksi & Revenue`**:
     - Menampilkan total akumulasi kuantitas produk baik (`Finish Good` dalam satuan `pcs` dan konversi `kg`).
     - Apabila parameter `Harga Jual / Tarif Valuasi Standar (IDR/pcs)` telah diisi pada Master SKU (**Main Task 04**), kartu menampilkan nilai **`Revenue (IDR)`** (`SUM(Finish_Good_SKU x Harga_SKU)`) serta estimasi `Profit (IDR)` apabila parameter biaya/margin SKU tersedia.
   - **Kartu 2 - `Reject & Scrap Opportunity Loss` (`Financial Reject Loss / FRL`)**:
     - Menampilkan total akumulasi kehilangan produk akibat cacat kemasan dan tumpahan garam tidak layak konsumsi (`Process Defect L-05 + Scrap Garam K3 L-06` dalam `pcs`, `kg`, serta `%` terhadap total produksi).
     - Menampilkan nilai kerugian finansial **`Financial Reject Loss / FRL (IDR)`** dengan warna teks peringatan merah sesuai `Gambar 18` ketika tarif SKU telah terkonfigurasi.
   - **Kartu 3 - `Time Opportunity Loss` (`Financial Opportunity Loss / FOL`)**:
     - Menampilkan total akumulasi waktu produksi efektif yang hilang akibat henti mesin tidak terencana dan penurunan kecepatan (`Unplanned Downtime [L-01 + L-02] + Idle & Minor Stop [L-03] + Reduced Speed [L-04]` dalam format `menit` serta `Xj Ym Zs`), disertai ekuivalen kehilangan potensi kemasan (`Time_Loss_Menit / Ideal_Cycle_Time` dalam `pcs`).
     - Menampilkan nilai potensi kehilangan pendapatan **`Financial Opportunity Loss / FOL (IDR)`**.
3. **Aturan Perhitungan Valuasi Finansial & *Graceful Fallback* Tanpa Data Fiktif**:
   - Untuk kejadian kehilangan waktu atau produk cacat yang berlangsung pada `Production Order` aktif, nilai `FOL (IDR)` dan `FRL (IDR)` dihitung menggunakan tarif `SKU` aktual pada order tersebut; sedangkan untuk kehilangan waktu lini saat tidak terikat pada satu SKU spesifik (atau saat pengguna mengaktifkan opsi valuasi konservatif URS sesuai sub-judul `Gambar 18`), sistem menghitungnya berdasarkan harga `SKU` tertinggi yang terdaftar aktif pada lini tersebut (*"price of the most expensive SKU in line"*) dengan keterangan metode perhitungan yang jelas pada *tooltip* info (`i`).
   - Apabila `Tarif Valuasi (IDR)` pada Master SKU (**Main Task 04**) belum diisi (`NULL`), sistem **wajib tetap menampilkan angka fisik terverifikasi (`pcs`, `kg`, dan `menit`) secara akurat** tanpa mengarang angka Rupiah semu, serta menampilkan penanda `[Tarif SKU belum dikonfigurasi]` disertai tautan pintas menuju Master SKU.

**C. Grafik Tren `Time / Financial Opportunity Loss` & `Reject / Scrap Loss` (`[LINGKUP WEB] 04` - URS Gambar 18)**
1. **Kartu Grafik 1 - Tren `Time & Financial Opportunity Loss (FOL)`**:
   - Menampilkan grafik garis/batang seri waktu per bulan (`Jan - Dec` pada tampilan tahunan) atau per hari/periode komparasi, dipecah per `Line / Machine` dengan legenda klik-interaktif di bagian bawah grafik (`Line 1 .. Line N`).
   - Menyediakan sakelar tampilan sumbu Y antara satuan **`Waktu Hilang (Menit)`** (dilengkapi keterangan `Loading Time` pembanding dan *callout* rata-rata downtime harian) dan satuan **`Finansial FOL (IDR)`** (sumbu Y wajib berformat mata uang `Rp 0 .. Rp N`, tanpa salah label `0%`).
   - *Hover tooltip* pada titik/batang data menampilkan: tanggal/periode, nama lini/mesin, durasi `Downtime` & `Reduced Speed` (`menit`), rasio terhadap `Loading Time`, ekuivalen kemasan hilang (`pcs`), dan nilai `FOL (Rp)`.
2. **Kartu Grafik 2 - Tren `Kehilangan Kualitas: Process Defect & Scrap Loss (FRL)`**:
   - Menampilkan grafik seri waktu per bulan/hari yang membandingkan kehilangan kualitas akibat **`[■ Merah] Process Defect Kemasan (L-05)`** (dari counter otomatis `CNT-R01` + input defect `HMI-T7`) dan **`[▲ Kuning] Scrap Garam K3 (L-06)`** (dari input scrap `HMI-T7`), dengan sakelar tampilan satuan **`Kuantitas Fisik (pcs / kg)`** atau **`Finansial FRL (IDR)`**.
   - *Hover tooltip* menampilkan tanggal/periode, nama lini/mesin, jumlah `Defect (pcs)`, jumlah `Scrap K3 (pcs)`, persentase cacat gabungan, dan nilai `FRL (Rp)`.

**D. Halaman `Dashboard > OEE Performance` - Filter Multi-Level, KPI Strip, Peringkat `Six Big Losses`, & Tren OEE (`[LINGKUP WEB] 05` - URS 19.2.5 Gambar 19 & Tabel 17 Baris 3161-3189)**
1. Bilah kontrol atas halaman `OEE Performance` menyediakan:
   - Sakelar granularitas periode: **`Monthly`** (menampilkan tren harian `1..31` dalam bulan terpilih) dan **`Yearly`** (menampilkan tren bulanan `Jan..Dec` atau perbandingan lintas periode dalam tahun terpilih), disertai pemilih `Tahun` / `Bulan`.
   - Filter cakupan aset berjenjang: **`Factory`** -> **`Area`** -> **`Line`** -> **`Machine`** (memungkinkan agregasi tingkat pabrik/area maupun fokus pada satu mesin spesifik seperti `Mesin Packing #6`).
   - Sakelar mode tinjauan ringkasan (`OEE & Six Big Losses` vs `Tabulasi Waterfall & APQ per Area` sesuai Tabel 17 baris 3165 & 3186).
   - Tombol **`Download`** (`dropdown` ekspor: `Download PDF` dan `Download CSV`).
2. **Deretan Kartu KPI Efektivitas Peralatan (`Top KPI Strip`)**:
   - Menampilkan nilai persentase aktual beserta indikator *delta/gap* terhadap standar **JIPM World Class** (`OEE >= 85.00%`, `A >= 90.00%`, `P >= 95.00%`, `Q >= 99.00%`) dan periode pembanding untuk metrik berikut (`Gambar 19` & `[LINGKUP WEB] 05`):
     - **`OEE (%)`** (`Availability x Performance x Quality`),
     - **`Availability (%)`** (`Operating Time / Loading Time x 100%`),
     - **`Performance (%)`** (`(Total Production x Ideal Cycle Time) / Operating Time x 100%`),
     - **`Quality Rate (%)`** (`Finish Good / Total Production x 100%`),
     - **`Achievement Rate (%)`** (`Finish Good / Production Target x 100%`),
     - **`TEEP (%)`** (*Total Effective Equipment Performance* = `Value Added Operating Time / Calendar Time x 100%`),
     - **`Utility / Utilization (%)`** (`Loading Time / Calendar Time x 100%`), serta referensi **`Ideal Cycle Time`** (`mnt/pcs` & `pcs/mnt`) dan ringkasan kuantitas total (`Finish Good`, `Target`, `Total Production`, `Total Downtime & Frekuensi`, `Reject & Rework/Scrap` sesuai Tabel 17 baris 3187-3189).
3. **Kartu Peringkat `Six Big Losses` (`#1 s.d. #6`)**:
   - Mengurutkan secara dinamis keenam kategori *Six Big Losses* berdasarkan durasi waktu hilang (`menit` / `jam & menit`) dari yang terbesar hingga terkecil:
     - `[L-01] Equipment Failure / Breakdown`,
     - `[L-02] Setup & Adjustment`,
     - `[L-03] Idle & Minor Stoppages`,
     - `[L-04] Reduced Speed Loss`,
     - `[L-05] Process Defect (Seal / Kemasan)`, dan
     - `[L-06] Scrap / Reduced Yield (Garam K3)`.
   - Setiap baris peringkat menampilkan nomor urut `#1..#6`, nama kategori *loss* beserta sub-penyebab dominan & nama mesin/lini di bawahnya, durasi waktu hilang (`menit` dan format `Xj Ym`), persentase terhadap `Loading Time`, persentase porsi terhadap `Total Losses`, serta bilah proporsi visual dengan *hover tooltip* rincian.
4. **Kartu Grafik `OEE & TEEP Trend` terhadap Target JIPM (`85.00%`)**:
   - Menampilkan grafik garis/batang tren `OEE (%)` (dan opsi seri `TEEP (%)` serta perbandingan antar `Area / Line / Machine`) sepanjang sumbu waktu (`Tanggal 1..31` pada mode `Monthly`, `Bulan Jan..Dec` atau periode komparasi pada mode `Yearly`).
   - Menampilkan garis referensi horizontal tegas **`TARGET JIPM WORLD CLASS: 85.00%`**, serta *tooltip* per titik waktu yang merinci nilai `OEE`, `TEEP`, `Availability`, `Performance`, dan `Quality`.
   - Saat pengguna mengaktifkan tab `APQ Value by Area` pada cakupan `Factory`, sistem menampilkan grafik batang berkelompok (*grouped bar chart*) yang membandingkan nilai `A`, `P`, `Q`, dan `OEE` antar-Area sesuai Tabel 17 baris 3186.

**E. Dua Grafik Donat Proporsi Waktu & Komposisi Kerugian (`[LINGKUP WEB] 05` - URS Gambar 19 & Tabel 17 Baris 3167-3177)**
1. **Donut Chart 1 - `Calendar / Loading vs Operating Time`**:
   - Menampilkan proporsi pemanfaatan waktu antara waktu operasi efektif (`VA / Operating Time`), kehilangan jadwal (`Schedule Loss` & `Planned Downtime`), serta kehilangan waktu henti tak terencana (`Unplanned Losses`), dengan nilai persentase/jam utama di tengah cincin dan legenda simbol + warna (`[■]`, `[▲]`) yang merinci `Calendar Time`, `Loading Time`, dan `Operating Time`.
2. **Donut Chart 2 - `Komposisi OEE Losses`**:
   - Memvisualisasikan pembagian total waktu yang hilang (`Total Losses` di tengah cincin) ke dalam komponen `Schedule Loss`, `Availability Loss` (`[●]`), `Performance Loss` (`[◆]`), dan `Quality Loss` (`[■]`), lengkap dengan persentase kontribusi masing-masing dan *hover tooltip* daftar 3 alasan terbesar pada tiap irisan donat (`Gambar 19`).

**F. Grid 4 Grafik Kombinasi Pareto (`2x2 Pareto Charts`) (`URS Gambar 19` Tengah-Bawah & Tabel 17 Baris 3182-3184)**
1. Di bawah baris grafik donat, halaman `OEE Performance` menampilkan *grid* 2 kolom x 2 baris berisi **4 Grafik Kombinasi Pareto** (menggabungkan diagram batang vertikal durasi `Minutes` pada sumbu Y kiri, label `Alasan / Tindakan + Machine/Line` pada sumbu X terurut menurun dari kiri ke kanan, serta kurva garis persentase kumulatif `0% - 100%` pada sumbu Y kanan):
   - **Pareto 1 - `Downtime Pareto`**: memeringkat alasan *Unplanned Downtime* (`L-01` & `L-02`) penyumbang menit henti terbesar.
   - **Pareto 2 - `Pareto Action`**: memeringkat jenis *Tindakan Perbaikan (Action)* yang paling banyak menyerap durasi waktu pemulihan mesin.
   - **Pareto 3 - `Schedule / Planned Loss Pareto`**: memeringkat alasan kehilangan waktu terjadwal (*Planned Downtime* seperti *Sanitasi Kerak Garam*, *Briefing & Pemanasan Awal Sealer*, *Preventive Maintenance*, serta *No Schedule*).
   - **Pareto 4 - `Quality Loss Pareto`**: memeringkat penyebab *Process Defect & Scrap Garam K3* berdasarkan ekuivalen menit waktu produksi yang hilang (disertai kuantitas `pcs` dan `kg` pada *tooltip*).
2. Setiap kartu Pareto memiliki tombol ikon ekspansi **`↗`** di sudut kanan atas: saat diklik, membuka tampilan modal perbesaran penuh atau mengarahkan pengguna langsung ke halaman analitik mendalam terkait (**Main Task 14**: `Availability Loss`, `Performance Loss`, atau `Quality Loss`) dengan filter aktif yang terbawa otomatis.

**G. Matriks Kalender Harian (`OEE & TEEP Factory Daily Performance Heatmap`) (`[LINGKUP WEB] 05` Bawah - URS Gambar 19 Bawah & Tabel 17 Baris 3178-3179, 3185)**
1. Bagian paling bawah halaman `OEE Performance` menampilkan matriks kalender harian (**`12 Bulan [Jan - Dec]` pada baris vertikal x `Tanggal [1 - 31]` pada kolom horizontal** sesuai `Gambar 19`, atau tampilan baris bulan terfokus saat mode `Monthly` aktif) dengan tab pemilih metrik matriks:
   - Tab **`OEE Factory Daily Performance`** (aktif secara *default*),
   - Tab **`TEEP Factory Daily Performance`**, dan
   - Tab **`Kaizen Activity Heatmap`** (menampilkan kepadatan tiket Kaizen yang dibuka/diselesaikan per hari sesuai Tabel 17 baris 3185).
2. **Standar Ambang Klasifikasi Warna & Penanda Simbol Aksesibel**:
   - Setiap sel tanggal diberi warna sekaligus teks/simbol kategori kinerja yang mematuhi kontras WCAG AA dan standar **JIPM World Class** (selaras studi empiris mesin pengemasan garam PT. XYZ):
     - **Hijau (`[WC >= 85.0%]`)**: *World Class JIPM* (`Nilai >= 85.00%`),
     - **Kuning / Amber (`[TPM 75.0% - 84.9%]`)**: *Middle Range / Transisi Pasca-TPM* (`75.00% <= Nilai < 85.00%`),
     - **Merah (`[LOW < 75.0%]`)**: *Low Range / Di Bawah Standar* (`Nilai < 75.00%`),
     - **Abu-abu (`[OFF / No Production]`)**: Tidak ada aktivitas produksi terjadwal pada tanggal tersebut.
3. Mengarahkan kursor (*hover*) pada sel tanggal menampilkan *tooltip* ringkas (`Tanggal`, `OEE %`, `TEEP %`, `A / P / Q %`, `Output Finish Good pcs`, `Total Downtime mnt`), dan **mengklik sel tanggal yang memiliki data produksi** mengarahkan pengguna ke daftar laporan **`Report by Shift`** (**Main Task 16**) yang sudah terfilter pada tanggal dan cakupan aset tersebut.

## Catatan
- **Penanganan Ketidaktersediaan Harga Jual Rupiah pada Studi Empiris PT. XYZ & Koreksi Label Sumbu Y `0%` (`Gambar 18`, Halaman 54 URS)**: Pada mockup `Gambar 18`, ditampilkan nilai finansial `Revenue`, `FOL`, dan `FRL` dengan keterangan *"calculation based on the price of the most expensive SKU in line"*, serta terdapat salah ketik label `0%` pada titik dasar sumbu vertikal `FOL (Rp)`. Karena jurnal referensi PT. XYZ memuat data produksi dan kerugian waktu secara lengkap namun tidak mencantumkan tarif harga jual Rupiah per kemasan garam, AC Bagian B.2-B.3 merancang mode dual-valuasi: seluruh metrik fisik (`pcs`, `kg`, `menit`) selalu tampil utuh, sedangkan konversi `IDR` otomatis aktif begitu `Admin / SuperAdmin` mengisi tarif pada Master SKU (**Main Task 04**) tanpa mengarang angka Rupiah fiktif, dan label sumbu Y finansial diluruskan menjadi `Rp 0`.
- **Pelurusan Ambang *Heatmap* `World Class (> 65%)` pada `Gambar 19` ke Standar JIPM (`>= 85.00%`)**: Pada legenda *heatmap* bawah `Gambar 19` URS, tertulis `World Class (> 65%)`, `Middle Range (> 60%)`, dan `Low Range (< 60%)`. Ambang `> 65%` tersebut bertentangan dengan kaidah internasional **JIPM World Class (`OEE >= 85.00%`)** dan akan menyebabkan nilai OEE *baseline* mesin pengemasan garam PT. XYZ sebelum perbaikan (`68.01%`) keliru diklasifikasikan sebagai *World Class* hijau. Pada AC Bagian G.2, ambang warna *default* telah diluruskan mengikuti standar JIPM (`>= 85.00%` *World Class*, `75.00% - 84.99%` *Middle/Transisi TPM*, `< 75.00%` *Low*).
- **Pembersihan Duplikasi Pohon Navigasi & Menu Tak Berdokumen (`ROCE`, `OEE Yearly Target`) pada Sidebar Lama `Gambar 18-19`**: Pada tangkapan layar *sidebar* revisi awal di `Gambar 18` dan `Gambar 19`, terdapat menu `ROCE` dan `OEE Yearly Target` serta pengulangan sub-pohon `Machine / Line / Area / Factory` di bawah `OEE Performance` dan `Report` yang tidak memiliki deskripsi maupun mockup di seluruh dokumen URS (dan tidak lagi muncul pada *sidebar* URS halaman 56-90). Sesuai struktur navigasi bersih pada **Main Task 01**, pemilihan granularitas `Monthly / Yearly` serta level `Factory / Area / Line / Machine` disatukan pada bilah filter atas halaman `OEE Performance`.
