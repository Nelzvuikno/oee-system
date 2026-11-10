# Main Task 10: Panel HMI-T7 - Log Aktivitas Lokal Mesin, Rekap Serah Terima Shift Sebelumnya (Prev. Production & Pareto), dan Pembaca SOP Digital

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP HMI] 06`, `[LINGKUP HMI] 07`, `[LINGKUP HMI] 10` panel kiri Pembaca SOP Digital, `Component / [HMI] Topbar`, `Component / [HMI] Bottom Nav`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.3.6` Gambar 82, `19.3.7` Gambar 83-84, `19.3.11` Gambar 92, & Tabel 15 baris 2795-2828, 2879-2881) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`Operator` lini produksi (beserta `Teknisi Maintenance` dan `Shift Leader`) pada konsol layar sentuh `Panel HMI-T7` dapat menelusuri jejak audit aktivitas lokal mesin secara *real-time* pada tab **`Log Activity`**, memeriksa rekap performa OEE (`Availability`, `Performance`, `Quality`, `OEE`), garis waktu operasi, dan diagram **Pareto Downtime** dari shift sebelumnya pada tab **`Prev. Production`** untuk kelancaran serah terima antarshift (*shift handover*), serta membaca dokumen panduan kerja & **SOP TPM Digital** dalam mode *kiosk read-only* (termasuk saat jaringan ke server sedang terputus) tanpa risiko keluar dari antarmuka panel mesin.

## Prasyarat
- Pengguna telah berhasil login pada konsol `Panel HMI-T7` yang terikat ke mesin aktif (contoh: `Mesin Packing #6 - Unit 2 Garam`, mekanisme autentikasi dan *App Shell* 5 tab mengikuti **Main Task 07**).
- Transaksi operasional mesin (telemetri & auto-downtime dari **Main Task 06**, order produksi & input *Reject/Rework/Scrap K3* dari **Main Task 08**, klasifikasi downtime dari **Main Task 09**, serta tiket *Kaizen* dari **Main Task 11**) telah menghasilkan rekaman log pada mesin terkait.
- Dokumen PDF `Guideline SOP` yang ditargetkan untuk `Panel HMI-T7` telah diunggah dan diterbitkan melalui Aplikasi Web pada **Main Task 05**.

## User Journey
- Selama bertugas, operator menyentuh tab `Log Activity` pada *Bottom Navigation* (`[LINGKUP HMI] 06` / `Gambar 82`) untuk memastikan aksi yang baru dilakukannya atau sinyal otomatis `PLC-ABC` telah tercatat.
- Operator menyentuh *chip*/*dropdown* filter kategori (contoh: `Downtime PLC-ABC`, `Order Produksi`, `Rework & Scrap K3`, `Kaizen HMI`) atau mengetik pada kolom `Cari aktivitas shift...` untuk menyaring riwayat kejadian lokal mesin tersebut.
- Saat awal pergantian shift (misal operator Shift 2 baru masuk menggantikan Shift 1), operator menyentuh tab `Prev. Production` pada *Bottom Navigation* (`[LINGKUP HMI] 07` / `Gambar 83`) untuk mempelajari hasil kinerja shift sebelumnya.
- Operator meninjau kartu capaian `OEE`, `Availability`, `Performance`, `Quality`, `Finish Good` (`Karton / pcs | kg`), `Reject`, `Rework / Scrap K3`, `Reduced Speed`, pita `Event Timeline` shift lalu, serta tabel rekapitulasi frekuensi dan total durasi `Downtime` shift sebelumnya.
- Operator menyentuh tombol `Lihat Pareto` (`view`) di atas tabel downtime (atau ikon mata pada salah satu baris alasan downtime) untuk membuka modal **`Pareto Downtime Shift Sebelumnya` (`Gambar 84`)** yang menampilkan grafik batang Pareto beserta daftar kronologis tiap kejadian henti mesin pada shift lalu.
- Ketika hendak menjalankan prosedur sanitasi kerak garam atau menyetel suhu elemen *Vertical Heater Sealer* `165 °C`, operator menyentuh tab `Profile` lalu menyentuh sakelar sub-tab **`Guideline`** (`[LINGKUP HMI] 10` / `Gambar 92`), memilih dokumen SOP terkait (contoh: `SOP-TPM-01`), dan menggulir halaman panduan secara *read-only* langsung di layar sentuh mesin.

## Acceptance Criteria:

**A. Pembatasan Cakupan Data Lokal Mesin & Mode Baca Saja (*Read-Only*)**
1. Ketiga fitur pada task ini (`Log Activity`, `Prev. Production`, dan `View Guideline`) bersifat **100% *read-only*** (tidak ada aksi ubah atau hapus catatan historis dari layar ini).
2. Data yang ditampilkan pada `Log Activity` dan `Prev. Production` dibatasi secara otomatis hanya untuk **mesin/lini tempat `Panel HMI-T7` tersebut terikat** (contoh: `Mesin Packing #6 - Unit 2 Garam`) sehingga operator tidak terbebani atau terdistraksi oleh log mesin lain.
3. Selama operator berpindah ke tab `Log Activity`, `Prev. Production`, maupun `Profile -> Guideline`, indikator angka merah `Downtime Unreason Queue` pada ikon tab `Home` di *Bottom Navigation* (**Main Task 07 & 09**) tetap diperbarui secara *real-time*, dan interupsi *pop-up* alarm `Gambar 80/81` (**Main Task 09**) tetap dapat muncul di atas layar jika mesin tiba-tiba mengalami *Auto-Downtime*.

**B. Tab `Log Activity` Lokal Mesin (`[LINGKUP HMI] 06` - URS 19.3.6 Gambar 82 & Tabel 15 Baris 2795-2813)**
1. Bagian atas halaman `Log Activity` menampilkan bilah filter & pencarian ramah sentuh (`tinggi kontrol >= 48 px`):
   - **Filter Kategori Aktivitas** (*chip* sentuh cepat & *dropdown* kategori, secara *default* terpilih pada `Semua Log Shift` beserta jumlah item): wajib mendukung penyaringan untuk **9 jenis aktivitas HMI** sesuai spesifikasi Tabel 15 URS baris 2805-2813 ditambah kejadian otomatis PLC:
     1. `Production Running`: order produksi dimulai (`started`), dihentikan lebih awal oleh operator (`stopped`), atau selesai sesuai jadwal (`ended`).
     2. `Downtime & Small Stop`: deteksi otomatis henti mesin/small stop oleh `PLC-ABC / GW-100` serta input/perubahan klasifikasi alasan & tindakan oleh operator (`Input downtime - <kategori - alasan> - <tindakan>`).
     3. `Rework`: penambahan kuantitas produk *rework* beserta satuan dan konversi `kg`.
     4. `Reject & Scrap K3`: penambahan kuantitas `L-05 Process Defect` maupun `L-06 Scrap Garam K3` beserta satuan, berat `kg`, dan alasan cacat.
     5. `Kaizen`: pembuatan tiket *Production / Maintenance Kaizen* baru, pembaruan tindakan perbaikan teknisi, serta verifikasi `OK / Not OK` dari panel HMI.
     6. `Login`: pencatatan operator/teknisi masuk ke sesi `Panel HMI-T7`.
     7. `Logout`: pencatatan operator keluar dari sesi `Panel HMI-T7` (termasuk catatan status antrean saat serah terima).
     8. `Extra Time`: penambahan waktu ekstra `+30 menit` pada sesi *Production Order* aktif.
     9. `Change Target`: pengubahan angka `Target Shift` (mencantumkan target lama -> target baru).
   - **Kolom Pencarian Sentuh (`Search...` / `Cari aktivitas shift...`)**: memfilter daftar log secara *case-insensitive* berdasarkan kata kunci deskripsi aktivitas, nomor *Production Order*, kode SKU, alasan downtime/defect, atau ID pelaku (`OPR-xx` / `PLC-ABC`).
2. Daftar umpan aktivitas (`HMI Log Feed` - `Gambar 82`) menampilkan baris-baris log dengan aturan berikut:
   - Secara *default* memuat seluruh log shift berjalan (dengan opsi gulir / muat log shift sebelumnya hingga 24 jam terakhir pada mesin tersebut) dan diurutkan secara kronologis dari **kejadian terbaru ke terlama (*descending timestamp*)**.
   - Setiap baris log wajib menampilkan:
     - *Badge* kategori aktivitas dengan label teks eksplisit (`[DOWNTIME]`, `[SMALL STOP]`, `[PRODUKSI]`, `[REWORK]`, `[REJECT / SCRAP K3]`, `[KAIZEN]`, `[EXTRA TIME]`, `[CHANGE TARGET]`, `[AUTH HMI]`).
     - Kalimat deskripsi aktivitas yang terstruktur jelas dan tidak terpotong.
     - Identitas pencatat: `Dicatat oleh: <ID / Nama Pengguna>` untuk aksi sentuh manusia, atau `Dicatat oleh: PLC-ABC / GW-100` untuk kejadian otomatis telemetri.
     - Stempel tanggal dan jam kejadian (`DD/MM/YYYY HH:mm` WIB) di sisi kanan baris, ditambah penanda `[Menunggu Sinkronisasi]` apabila log dicatat saat `Panel HMI-T7` sedang berada dalam mode *Offline Queue*.
   - Jika belum ada aktivitas pada filter yang dipilih, layar menampilkan *Empty State* yang jelas beserta tombol sentuh `Tampilkan Semua Log`.

**C. Tab `Prev. Production` - Ringkasan KPI, Timeline, & Tabel Downtime Shift Sebelumnya (`[LINGKUP HMI] 07` - URS 19.3.7 Gambar 83 & Tabel 15 Baris 2814-2828)**
1. Saat pengguna menyentuh tab `Prev. Production`, sistem memuat rekapitulasi lengkap dari **sesi shift produksi terakhir yang telah selesai tepat sebelum shift aktif saat ini** pada mesin tersebut (dilengkapi label identitas jelas mengenai tanggal, nomor shift sebelumnya, SKU yang dijalankan, dan operator shift sebelumnya; apabila tersedia lebih dari 1 order SKU di dalam shift sebelumnya, pengguna dapat melihat total gabungan shift sebelumnya maupun memfilter per order SKU dalam shift tersebut).
2. Bagian atas halaman `Prev. Production` menampilkan **2 baris kartu ringkasan KPI shift sebelumnya** sesuai `Gambar 83` & `[LINGKUP HMI] 07`:
   - **Baris KPI Utama (OEE & Pencapaian Produksi)**:
     - `OEE Shift Lalu` (`%`, contoh: `77.52%`).
     - `Availability (A)` (`%`, contoh: `90.86%`).
     - `Performance (P)` (`%`, contoh: `86.41%`).
     - `Quality (Q)` (`%`, contoh: `98.74%`).
     - `Target` (`Main Unit`, contoh: `12,000 pcs`).
     - `Achievement` (`%`, `Finish Good / Target x 100%`).
     - `Finish Good` (format ganda kemasan terluar / `Main Unit` `|` berat `kg`, contoh: `258.9 Karton / 10,356 pcs | 2,589 kg`).
     - `Total Prod.` (`Total Diproses` dalam `Main Unit`).
   - **Baris KPI Kerugian Kualitas & Kecepatan (`Gambar 83`)**:
     - `Reject / Process Defect (L-05)` (format ganda `kg | pcs`, contoh: `33.0 kg | 132 pcs`).
     - `Rework & Scrap K3 (L-06)` (format ganda `kg | pcs`, contoh: `4.0 kg | 16 pcs`).
     - `Reduced Speed (L-04)` (total akumulasi waktu hilang akibat penurunan kecepatan dalam format `Xh Ym Zs` atau `menit`, contoh: `39 mnt`).
     - `<Nama Mesin> Output` (total keluaran kotor counter mesin dalam `Main Unit`).
3. Di bawah kartu KPI terdapat pita **`Event Timeline Shift Sebelumnya`** dalam mode *read-only* dari jam mulai hingga jam selesai shift lalu dengan kode 5 status visual yang sama seperti layar `Home` (**Main Task 08** Bagian A.2: `Planned Downtime` Biru, `Unplanned Downtime` Merah, `Small Stop` Kuning, `Run Time` Hijau, `Available / Calendar Time` Abu-abu); menyentuh segmen menampilkan *popover* jam mulai, jam selesai, dan durasi segmen.
4. Bagian bawah halaman `Prev. Production` menampilkan panel **`Rekap Downtime Shift Sebelumnya` (`Gambar 83`)**:
   - Header panel menampilkan judul `Downtime`, tombol sentuh **`Lihat Pareto` (`view` berikon mata)**, serta 4 metrik ringkasan total di sebelah kanan header sesuai `Gambar 83`:
     - `Schedule Loss`: total durasi *Planned Downtime* shift lalu.
     - `Availability Loss`: total durasi *Unplanned Downtime* shift lalu.
     - `DT Freq`: total frekuensi kejadian downtime shift lalu (`<N>x`).
     - `Small Stop`: total akumulasi durasi `L-03 Small Stop` shift lalu.
   - Tabel rekapitulasi grup alasan downtime diurutkan dari **`Total Duration` terbesar ke terkecil** dengan kolom-kolom berikut (`Gambar 83`):
     - `#`: nomor peringkat durasi terbesar.
     - `Downtime Category`: kategori / pilar *Six Big Losses* (contoh: `L-02 Setup & Adj`, `L-03 Small Stop`, `L-01 Equipment Failure`).
     - `Downtime Reason`: nama alasan waktu henti (contoh: `Setting pisau potong & penyesuaian heater`, `Pembersihan kerak garam corong hopper`).
     - `Freq.`: jumlah kemunculan alasan tersebut selama shift lalu.
     - `Total Duration`: total durasi kumulatif alasan tersebut (`Xh Ym Zs` / `mnt`).
     - `Action`: tombol ikon mata (`Lihat Detail`) yang membuka modal `Pareto Downtime` (`Gambar 84`) dengan sorotan pada kejadian-kejadian dari alasan tersebut.
   - Menampilkan baris `Catatan Handover` di bagian bawah apabila terdapat rekomendasi otomatis *Rule Engine* atau catatan serah terima dari shift sebelumnya (contoh: `Pantau suhu heater D005 pada awal Shift 2`).
   - Jika mesin belum memiliki data shift sebelumnya sama sekali (misal hari pertama komisioning mesin baru), halaman menampilkan *Empty State* informatif tanpa angka error/`NaN`.

**D. Modal `Pareto Downtime Shift Sebelumnya` (`[LINGKUP HMI] 07` Kanan - URS 19.3.7 Gambar 84)**
1. Saat operator menyentuh tombol `Lihat Pareto` (`view`) atau ikon mata pada baris tabel `Prev. Production`, sistem membuka modal **`Pareto Downtime` (`Pareto Losses Shift Sebelumnya` - `Gambar 84`)** dilengkapi tombol tutup `X` berukuran ramah sentuh (`>= 48 x 48 px`).
2. Isi modal `Pareto Downtime` terbagi menjadi 2 bagian vertikal sesuai `Gambar 84`:
   - **Bagian Atas - Grafik Batang Pareto Downtime**:
     - Menampilkan diagram batang vertikal yang mengurutkan penyebab waktu henti/losses shift sebelumnya dari durasi menit tertinggi di sisi kiri hingga terendah di sisi kanan.
     - Sumbu Y kiri menampilkan `Durasi Downtime (Menit)` (`Minutes of Downtime`), sumbu Y kanan menampilkan persentase kontribusi kumulatif (`0%` s.d. `100%`), dan sumbu X menampilkan nama singkat masing-masing alasan beserta label angka menit di atas tiap batang.
   - **Bagian Bawah - Daftar Rincian Kejadian Individual (`Downtime List`)**:
     - Menampilkan daftar kronologis setiap kejadian downtime/small stop pada shift sebelumnya (`Downtime #<nomor>`, `Mulai: DD/MM/YYYY HH:mm`, `Selesai: DD/MM/YYYY HH:mm`, `Durasi: XX menit`, kategori/alasan, dan tindakan perbaikan yang dicatat operator shift lalu) dalam mode *read-only*.

**E. Pembaca Dokumen `View Guideline SOP Digital` Mode Kiosk (`[LINGKUP HMI] 10` Kiri - URS 19.3.11 Gambar 92)**
1. Saat pengguna berada di tab `Profile` dan menyentuh sakelar sub-tab **`Guideline`** (`Gambar 92`, terhubung dari **Main Task 07** Bagian E.1), tampilan beralih ke halaman **`View Guideline SOP Digital`** dengan badge penanda **`MODE BACA SAJA`**.
2. Daftar dokumen yang dimuat pada `Panel HMI-T7`:
   - Hanya menampilkan dokumen `Guideline SOP` berstatus aktif dari **Main Task 05** yang memiliki opsi distribusi **`Tampilkan di Konsol Panel HMI-T7`** dan sesuai dengan peran pengguna login serta *Area / Mesin* tempat panel terikat (contoh: `SOP-TPM-01: Pembersihan Kerak & Korosi Garam Packing #6`, `SOP-OPR-02: Standar Setting Pisau & Suhu Sealer 165 °C`, `SOP-HMI-03: Panduan Klasifikasi Downtime & Scrap K3`).
   - Menyediakan pemilih dokumen ramah sentuh di bagian atas/samping untuk berpindah antarjudul SOP, dengan dokumen pertama terpilih secara *default*.
3. Kontrol baca dokumen PDF/SOP tersemat pada `Panel HMI-T7`:
   - Bilah navigasi halaman sentuh (`tinggi >= 48 px`): tombol `< Previous` (nonaktif di halaman `1`), indikator halaman `1 / N`, tombol `Next >` (nonaktif di halaman terakhir `N`), serta kontrol perbesar/perkecil tampilan (`Zoom + / -` & `Fit Width`) dan gulir sentuh vertikal (*touch scroll*) yang mulus.
   - **Proteksi Keamanan Mode Kiosk Industri**: berbeda dari pembaca Web pada **Main Task 05** Bagian D, pada `Panel HMI-T7` **tidak ditampilkan tombol unggah, edit, hapus, maupun dialog unduh sistem operasi (*OS Save-File Dialog*)** agar operator tidak dapat keluar dari layar aplikasi kiosk menuju sistem berkas sistem operasi panel.
   - **Penyimpanan *Cache* SOP Lokal (*Offline-Ready SOP*)**: `Panel HMI-T7` menyimpan salinan lokal berkas PDF SOP aktif yang disinkronkan dari `VM1` sehingga operator dan teknisi tetap dapat membuka dan membaca langkah-langkah *troubleshooting* mesin meskipun jaringan LAN ke server pusat sedang terputus.

## Catatan
- **Koreksi Artefak *Copy-Paste* Mockup `Gambar 92 Mockup View Guideline` di URS**: Pada `Gambar 92` halaman 102 URS, ilustrasi pembaca dokumen di dalam bingkai HMI menyalin langsung gambar pembaca Web Admin lengkap dengan teks besar `"User Guidelineline for Admin"` (salah ketik `"Guidelineline"` dan konteks peran `"for Admin"`) serta ikon unduh berkas browser di kanan atas. Pada AC Bagian E dan desain `[LINGKUP HMI] 10` di [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen), konten disesuaikan dengan konteks aktual operator mesin (`SOP-TPM-01`, `SOP-OPR-02`, dst. dalam `MODE BACA SAJA`) dan tombol unduh sistem berkas dinonaktifkan demi keamanan *kiosk mode* panel industri, digantikan oleh *offline cache* lokal otomatis.
- **Ketersediaan Riwayat `Prev. Production` pada Pergantian 3 Shift Harian**: Mengikuti pola operasi pabrik garam PT. XYZ (**3 shift @ 8 jam**), tab `Prev. Production` secara otomatis menyajikan data shift terakhir yang baru berakhir pada mesin tersebut (misal Shift 3 malam kemarin saat dilihat oleh Shift 1 pagi, Shift 1 pagi saat dilihat oleh Shift 2 siang, dan Shift 2 siang saat dilihat oleh Shift 3 malam) agar serah terima kondisi mesin (seperti fluktuasi suhu sealer `D005` atau frekuensi *small stop* corong garam) selalu kontekstual.
