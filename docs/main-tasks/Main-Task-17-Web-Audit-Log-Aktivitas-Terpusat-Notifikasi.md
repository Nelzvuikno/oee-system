# Main Task 17: Aplikasi Web - Pusat Audit Log Aktivitas Terpusat dan Notifikasi Real-Time Lintas Peran

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 11`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.10` Gambar 25, `19.2.25` Gambar 70, serta keterkaitan notifikasi & log pada Tabel 15-17 baris 2945-2946, 2957, 3096-3097, 3200, 3830-3836, 4552-4558) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)` dapat memantau jejak audit terpusat yang tidak dapat dimodifikasi (*immutable audit log*) atas seluruh peristiwa mesin `PLC-ABC`, aktivitas operator `Panel HMI-T7`, koreksi data produksi/downtime, siklus Kaizen, persetujuan laporan, hingga perubahan konfigurasi master dalam satu halaman **`Activity & Notification`** berbingkai *App Shell* Web, sekaligus menerima dan menindaklanjuti **Notifikasi *Real-Time* Lintas Peran** (melalui lonceng notifikasi di *Topbar* maupun panel notifikasi utama) untuk merespons cepat kejadian mesin berhenti lama, laporan menunggu persetujuan, verifikasi/komentar tiket Kaizen, maupun permintaan bantuan akses akun/PIN.

## Prasyarat
- Pengguna telah login pada Aplikasi Web dengan peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, atau `SuperAdmin (OT/IT)` (mengikuti **Main Task 01**).
- Layanan pencatatan peristiwa dari Edge `Gateway GW-100` & *Rule Engine* `VM1` (**Main Task 06**), konsol `Panel HMI-T7` (**Main Task 07 s.d. 11**), modul operasional & laporan Web (**Main Task 12 s.d. 16**), serta modul konfigurasi master (**Main Task 02 s.d. 05**) telah aktif mengirimkan *event payload* ke layanan *Audit & Notification Bus* pada `VM1`.

## User Journey
- Saat sedang bekerja di halaman mana pun pada Aplikasi Web, pengguna melihat angka penanda belum dibaca (*unread badge*) pada ikon **Lonceng Notifikasi** di `Topbar` bertambah secara *real-time* (disertai *toast alert* non-intrusif untuk peringatan berprioritas `[KRITIS | FAULT]`).
- Pengguna mengklik ikon lonceng di `Topbar` untuk melihat ringkasan notifikasi terbaru atau membuka menu **`Production Running > Activity & Notification`** (`[LINGKUP WEB] 11` / `URS 19.2.10 & 19.2.25`) yang menampilkan halaman terpadu 2 kolom: **`Riwayat Aktivitas Sistem & Telemetri (Audit Log)`** di sisi kiri dan **`Panel Notifikasi Penting`** di sisi kanan.
- Pada `Panel Notifikasi Penting`, `Supervisor (SPV)` membaca kartu peringatan `[KRITIS | FAULT] Mesin Packing #5 Stop > 15 Menit (Alasan belum diisi)`, `[APPROVAL] Laporan Shift Menunggu Validasi SPV`, dan `[KAIZEN TPM] Tiket KZN-2023-03 Selesai Diperbaiki Teknisi`, lalu mengklik tombol aksi kontekstual (contoh: **`Buka Line #5`**, **`Tinjau Laporan`**, atau **`Verifikasi Kaizen`**) sehingga notifikasi otomatis ditandai **`Sudah Dibaca`** dan sistem langsung mengarahkan pengguna ke halaman sasaran, atau mengklik **`Tandai Semua Dibaca`** untuk membersihkan daftar antrean baca.
- Untuk menelusuri kronologi operasional maupun mengaudit perubahan data, pengguna beralih ke kolom **`Audit Trail Feed`**, memilih *chip* kategori (contoh: `Downtime PLC-ABC`, `Produksi`, `Rework / Scrap K3`, `Kaizen TPM`, `Report`, `Konfigurasi Master`, atau `Autentikasi`), memfilter `Rentang Tanggal`, `Area`, `Line / Mesin`, serta mengetik kata kunci pada kotak pencarian (contoh: `D001=2` atau `PO-20230526-U206`).
- Pengguna mengklik salah satu baris aktivitas koreksi data (misal koreksi alasan downtime oleh Supervisor atau perubahan `Ideal Cycle Time` SKU oleh Admin) untuk melihat panel rincian yang memuat perbandingan **`Nilai Sebelum (Before) -> Nilai Sesudah (After)`**, lalu mengklik **`Unduh Log CSV / PDF`** guna melampirkan bukti jejak audit resmi.

## Acceptance Criteria:

**A. Cakupan Hak Akses (RBAC) & Aturan Imutabilitas Rekam Jejak (*Immutable Append-Only Log*)**
1. Halaman `Activity & Notification` serta lonceng notifikasi di `Topbar` tersedia bagi seluruh peran Aplikasi Web dengan batasan visibilitas data sesuai wewenang peran (**Main Task 01**):
   - **`Shift Leader` & `Supervisor (SPV)`**: dapat melihat seluruh log aktivitas operasional (`PLC-ABC`, `Produksi`, `Downtime`, `Quality Reject/Scrap`, `Kaizen`, `Report`, dan `Autentikasi HMI`) pada cakupan `Area / Line` tempatnya bertugas, serta menerima notifikasi yang ditujukan bagi peran dan areanya.
   - **`Admin / Manager`**: dapat melihat seluruh log operasional, laporan, Kaizen, serta perubahan master produksi (`SKU`, `Downtime Reason`, `Guideline SOP`) lintas area di pabriknya.
   - **`SuperAdmin (OT/IT)`**: memiliki visibilitas penuh atas seluruh log sistem, termasuk perubahan topologi aset & IP `PLC-ABC / GW-100` (**Main Task 02**), manajemen akun & perubahan peran RBAC (**Main Task 03**), kegagalan autentikasi/keamanan, dan status koneksi jaringan Edge OT.
2. **Larangan Mutlak Modifikasi & Penghapusan Log**: seluruh rekaman pada `Audit Trail` bersifat **hanya-tambah (*append-only / immutable*)**. Tidak ada antarmuka pengguna maupun *endpoint* API untuk mengedit atau menghapus baris log yang telah tercatat bagi peran mana pun (termasuk `SuperAdmin`), dan seluruh rekaman wajib disimpan mengikuti kebijakan retensi minimal data historis pabrik (`>= 3 tahun`).
3. Seluruh tampilan halaman ini wajib dibungkus menggunakan *App Shell* Aplikasi Web (`Component / [WEB] Sidebar` + `Component / [WEB] Topbar`) tanpa menyertakan *header* maupun *bottom navigation* milik konsol `Panel HMI-T7`.

**B. Pusat Audit Log Aktivitas Terpusat - Filter, Skema Event, & Inspeksi *Before -> After* (`[LINGKUP WEB] 11` Kiri - URS 19.2.10 Gambar 25 & 19.2.25 Gambar 70)**
1. Bilah filter & pencarian di bagian atas `Audit Trail Feed` wajib menyediakan:
   - *Category Filter Chips* beserta jumlah rekaman terfilter:
     - `Semua (<total>)`,
     - `Downtime PLC-ABC` (`[STOP]`, `[REASON]`),
     - `Produksi` (`[PROD]`),
     - `Rework / Scrap & Defect` (`[QUALITY]`),
     - `Speed & Sensor` (`[SPEED]`, `[SENSOR]`),
     - `Kaizen TPM` (`[KAIZEN]`),
     - `Laporan & Approval` (`[REPORT]`),
     - `Konfigurasi Master` (`[CONFIG]` - tampil bagi `Admin / SuperAdmin`), dan
     - `Autentikasi` (`[AUTH]`).
   - Filter tambahan: `Rentang Tanggal & Jam`, `Area`, `Line / Machine`, `Shift`, serta `Sumber Kanal` (`Semua Kanal`, `Gateway GW-100 / PLC-ABC`, `Panel HMI-T7`, `Aplikasi Web`).
   - Kolom pencarian teks bebas (`Cari tag D000-D012, nomor order/tiket, peran, nama akun, atau deskripsi...`) yang bekerja secara *case-insensitive*.
   - Tombol **`Unduh Log (CSV / PDF)`**: mengekspor seluruh baris log sesuai filter aktif lengkap dengan stempel waktu pencetakan dan identitas pengunduh.
2. **Cakupan Jenis Peristiwa yang Wajib Tercatat Otomatis**:
   - **Telemetri & Alarm `PLC-ABC / GW-100`** (**Main Task 06**): deteksi henti mesin otomatis (`D000=2/3`, kode `D001`), akumulasi *Small Stop* (`D009=1`), masuk/pulihnya zona *Reduced Speed* (`D002` terhadap ambang `38.0 pcs/mnt`), pelanggaran ambang sensor `SEN-T01 (D005)` & `SEN-V01 (D006)`, serta putus/pulihnya koneksi *heartbeat* `D012` dan sinkronisasi ulang *buffer* FIFO.
   - **Operasional Produksi & Kualitas** (**Main Task 08, 09, 12**): pembukaan (`started`), penghentian sementara (`stopped`), pembaruan target, dan penyelesaian (`ended`) `Production Order (No.PRO - SKU)`; pengisian awal alasan downtime/small stop di `Panel HMI-T7`; koreksi klasifikasi alasan downtime oleh `Supervisor` di Web; serta pencatatan `Reject / Process Defect (D004/D007)` dan `Rework / Scrap Garam K3 (D008)` beserta kuantitas, satuan, dan alasannya.
   - **Siklus Kaizen TPM** (**Main Task 11 & 15**): pembuatan tiket (`Production` / `Maintenance`), pengisian perbaikan Tahap 2, keputusan verifikasi (`CLOSED | OK` atau `REVISE | NOT OK`), serta pengiriman komentar diskusi.
   - **Alur Laporan Shift & Produk** (**Main Task 16**): penerbitan laporan otomatis (`NEEDS APPROVAL`), persetujuan (`APPROVED`), pengembalian revisi, penguncian akhir (`RELEASED`), serta pengunduhan laporan resmi.
   - **Konfigurasi Master & Keamanan Akun** (**Main Task 01 s.d. 05, 07**): pembuatan/perubahan/penonaktifan data master (`Factory/Area/Line/Machine`, `User & RBAC`, `SKU & Ideal Cycle Time`, `Downtime Reason`, `Guideline SOP`), login berhasil, kegagalan login berulang / *lockout* 5 menit, permintaan reset sandi/PIN, dan logout.
3. **Tampilan Setiap Baris Aktivitas & Panel Rincian Perubahan (`Diff Inspector`)**:
   - Setiap baris log pada daftar menampilkan: *tag* kategori berkode warna + teks (`[STOP]`, `[REASON]`, `[QUALITY]`, `[SPEED]`, `[KAIZEN]`, `[REPORT]`, `[CONFIG]`, `[AUTH]`), judul ringkasan peristiwa yang spesifik (tanpa teks placeholder `(activity goes here)`), identitas pelaku & kanal asal (`Oleh: <Nama Lengkap / NIK / Peran> via <HMI-T7 | Web | GW-100>`), serta stempel waktu server (`DD/MM/YYYY, HH:mm:ss`).
   - Mengklik salah satu baris log membuka panel rincian (*read-only drawer*) yang menampilkan metadata teknis (`Event ID`, `Area / Line / Machine`, referensi `No.PRO / Downtime ID / Kaizen ID`, alamat IP/perangkat asal) serta tabel perbandingan **`Nilai Sebelum (Before) -> Nilai Sesudah (After)`** untuk setiap aksi pengeditan atau koreksi data.

**C. Lonceng Notifikasi *Topbar* & Panel Pusat Notifikasi *Real-Time* (`[LINGKUP WEB] 11` Kanan & `Component / [WEB] Topbar` - URS 19.2.10)**
1. Pada `Component / [WEB] Topbar` di seluruh halaman internal Aplikasi Web, sistem menampilkan ikon **Lonceng Notifikasi** dengan *badge* penghitung jumlah notifikasi yang belum dibaca (`Unread Count`, disembunyikan saat `0`):
   - Mengklik ikon lonceng membuka *dropdown popover* berisi daftar 8 notifikasi terbaru, tombol `Tandai Semua Dibaca`, dan tautan `Lihat Semua Aktivitas & Notifikasi` menuju halaman `[LINGKUP WEB] 11`.
   - Notifikasi baru didorong secara *real-time* melalui koneksi WebSocket tanpa memerlukan *page refresh*; khusus notifikasi berkategori `[KRITIS | FAULT]`, sistem memunculkan *toast banner* peringatan di sudut kanan atas layar pengguna yang berwenang.
2. Pada panel kanan **`Notifikasi Penting`** di halaman `Activity & Notification` (`[LINGKUP WEB] 11`), sistem menampilkan:
   - Header panel berisi penghitung `Notifikasi Belum Dibaca (<jumlah>)`, sakelar filter `Belum Dibaca / Semua`, filter kategori prioritas, serta tombol **`Tandai Semua Dibaca`**.
   - Setiap kartu notifikasi memuat: *badge* tingkat keparahan & kategori (`[KRITIS | FAULT]`, `[PERINGATAN | OT]`, `[APPROVAL]`, `[KAIZEN TPM]`, `[KEAMANAN / AKUN]`), judul ringkas, uraian konteks masalah & stempel waktu kejadian, indikator titik belum dibaca, serta **Tombol Aksi Pintas Kontekstual (*Direct Deep-Link CTA*)**.

**D. Matriks Pemicu, Penerima, & Tautan Tindakan Langsung (*Deep-Link CTA*) Notifikasi Lintas Peran**
1. Sistem wajib menerbitkan dan mengarahkan notifikasi secara otomatis untuk skenario lintas modul berikut:
   - **Skenario 1 - Henti Mesin Kritis / *Unreasoned Downtime* Berlarut (`[KRITIS | FAULT]`)**:
     - *Pemicu*: `PLC-ABC` mengirim status `D000=3 (FAULT)`, pelanggaran ambang kritis sensor (`SEN-T01 < 155.0 C` atau `> 185.0 C`, `SEN-V01 > 7.1 mm/s`), atau *Unplanned Downtime* (`D000=2`) berlangsung melampaui batas eskalasi (`15 menit`) tanpa pengisian alasan di `Panel HMI-T7` (**Main Task 06 & 09**).
     - *Penerima*: `Shift Leader` & `Supervisor (SPV)` area tersebut (ditambah personel `Maintenance` untuk alarm sensor/fault mekanis).
     - *Tombol CTA*: **`Buka Line Detail`** -> mengarahkan langsung ke halaman `Line Detail` mesin terkait (**Main Task 12**).
   - **Skenario 2 - Putus / Pulih Koneksi Akuisisi Edge OT (`[PERINGATAN | OT]`)**:
     - *Pemicu*: *heartbeat* `D012` dari `Gateway GW-100` / `PLC-ABC` terputus `> 10 detik` (`OFFLINE`) atau tersambung kembali (**Main Task 06**).
     - *Penerima*: `SuperAdmin (OT/IT)` & `Supervisor (SPV)`.
     - *Tombol CTA*: **`Periksa Status Mesin`** -> mengarahkan ke `Production Active` / konfigurasi koneksi mesin (**Main Task 02 & 12**).
   - **Skenario 3 - Siklus Persetujuan & Rilis Laporan Shift / Produk (`[APPROVAL]`)**:
     - *Pemicu & Penerima*:
       1. Laporan otomatis terbentuk di akhir shift (`NEEDS APPROVAL`) atau dikembalikan untuk revisi -> dikirim ke `Shift Leader` & `Supervisor (SPV)`.
       2. Laporan disetujui `SPV` (`APPROVED`) dan siap dirilis -> dikirim ke `Admin / Manager`.
     - *Tombol CTA*: **`Tinjau Laporan`** / **`Rilis Laporan`** -> membuka langsung `Detail Report` shift/produk terkait (**Main Task 16**).
   - **Skenario 4 - Penugasan, Penyelesaian, Verifikasi, Revisi, Komentar, & Keterlambatan SLA Kaizen (`[KAIZEN TPM]`)**:
     - *Pemicu & Penerima*:
       1. Tiket *Maintenance Kaizen* baru diterbitkan (`OPEN | NOT OK`) atau dikembalikan (`REVISE | NOT OK`) -> dikirim ke `PIC` Teknisi Maintenance tertunjuk.
       2. Perbaikan Tahap 2 selesai (`CLOSED | NOT VERIFIED`) -> dikirim ke `Reviewer` (`SPV Produksi` untuk *Production Kaizen*) atau `Shift Leader / Operator` lini terkait (untuk *Maintenance Kaizen*).
       3. Pengguna meninggalkan komentar baru pada tiket Kaizen (URS baris 2946 & 3096) atau tiket melewati tenggat `Due Date` (`[OVERDUE]`) -> dikirim ke pembuat tiket, `PIC`, dan `Reviewer`.
     - *Tombol CTA*: **`Buka / Verifikasi Kaizen`** -> mengarahkan langsung ke halaman `Detail Kaizen` tiket tersebut (**Main Task 15**).
   - **Skenario 5 - Permintaan Reset PIN / Sandi & Penguncian Keamanan Akun (`[KEAMANAN / AKUN]`)**:
     - *Pemicu & Penerima*:
       1. Operator menyentuh bantuan `Lupa PIN` atau mengalami penguncian `5x salah PIN` di `Panel HMI-T7` (**Main Task 07**) -> dikirim ke `Supervisor (SPV)` area terkait & `SuperAdmin (OT/IT)`.
       2. Pengguna internal tanpa email mengajukan permintaan reset sandi melalui halaman `Forgot Password` Web (**Main Task 01**) -> dikirim ke `SuperAdmin (OT/IT)`.
     - *Tombol CTA*: **`Buka User Management`** (bagi `SuperAdmin` menuju **Main Task 03**) atau detail akun personel terkait.
2. Saat pengguna mengklik tombol CTA pada suatu kartu notifikasi, sistem wajib menandai status baca notifikasi tersebut menjadi `Read` untuk akun pengguna yang bersangkutan (tanpa menghapus status `Unread` milik penerima lain yang belum membacanya), memperbarui penghitung lonceng secara instan, dan membuka halaman tujuan.

## Catatan
- **Koreksi Kesalahan Penempelan Gambar Tablet HMI pada Sub-Bab Web `19.2.10 Gambar 25` (`Halaman 61 URS`) dan `19.2.25 Gambar 70` (`Halaman 90 URS`)**: Pada dokumen URS, meskipun sub-bab `19.2.10 Activity & Notification` dan `19.2.25 Activity` berada di bawah bab **`19.2 Mockup (Fitur Web)`**, penyusun URS keliru menempelkan tangkapan layar tablet `Panel HMI` pada kedua gambar tersebut (memuat bilah baterai iPad `9:41 Mon Jun 6 | 100%`, *topbar* mesin tunggal HMI, dan *Bottom Navigation* 5 ikon HMI `Home, Log Activity, Prev. Production, Kaizen, Profile`, serta pengulangan teks *placeholder* `(activity goes here) - login to account` pada `Gambar 70`) dan belum menggambar panel daftar notifikasi Web. Sesuai pemisahan tegas antara `Log Activity` lokal mesin di `Panel HMI-T7` (**Main Task 10**) dan konsol pengawasan manajemen di Aplikasi Web, spesifikasi ini menerapkan tampilan `Activity & Notification` di dalam *App Shell* Web (`[LINGKUP WEB] 11`) yang menyatukan *Audit Trail* terpusat lintas mesin beserta panel `Notifikasi Penting` dan lonceng notifikasi `Topbar`.
