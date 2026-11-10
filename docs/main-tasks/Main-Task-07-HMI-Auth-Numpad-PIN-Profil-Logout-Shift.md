# Main Task 07: Panel HMI-T7 - Autentikasi Operator Numpad PIN, Pemulihan Akses ke SPV, Profil, dan Logout Shift

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP HMI] 01`, `[LINGKUP HMI] 02`, `[LINGKUP HMI] 09`, `[LINGKUP HMI] 10` panel kanan Logout, `Component / [HMI] Topbar`, `Component / [HMI] Bottom Nav`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.3.1` Gambar 71, `19.3.2` Gambar 72, `19.3.3` Gambar 73-74, `19.3.9` Gambar 90, `19.3.10` Gambar 91, & Tabel 15), [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md), & [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md)

---

## Expected Result
`Operator` lini produksi (termasuk `Teknisi Maintenance` lapangan dan `Shift Leader` / `Supervisor` saat melakukan otorisasi di mesin) dapat masuk dengan cepat dan ergonomis ke konsol layar sentuh industri **`Panel HMI-T7` (`1280 x 800 px`)** menggunakan *Touch Numeric Keypad (Numpad)* ramah sarung tangan pabrik, mengajukan tiket pemulihan lupa PIN langsung ke konsol Aplikasi Web Supervisor/SuperAdmin di dalam jaringan tertutup OT, memeriksa profil akun aktif secara *read-only*, memperbarui PIN/kata sandi HMI, serta mengakhiri sesi shift melalui validasi prakeluar (*pre-logout checklist*) tanpa menghentikan akuisisi data latar belakang `PLC-ABC` & `GW-100`.

## Prasyarat
- Perangkat layar sentuh industri `Panel HMI-T7` (`1280 x 800 px`, IP54/IP65) telah terikat (*hardware-bound*) pada satu mesin/lini spesifik dari **Main Task 02** (contoh: `Mesin Packing #6 - Unit 2 Garam`, `PLC-ABC 192.168.10.20` via `SWH-8P`).
- Akun personel lapangan (`Operator`, `Operator Teknisi`, `Shift Leader`, `Supervisor`, atau `SuperAdmin`) telah didaftarkan dan berstatus `is_active = true` beserta kredensial PIN/kata sandi melalui **Main Task 03**.
- Layanan akuisisi latar belakang `PLC-ABC -> GW-100 -> VM1` telah aktif sesuai **Main Task 06** (atau mode *cache* lokal `Panel HMI-T7` aktif saat jaringan ke server sedang terputus sementara).

## User Journey
- Operator berdiri di depan `Panel HMI-T7` pada awal shift dan melihat layar Login Operator (`[LINGKUP HMI] 01`) lengkap dengan status koneksi `PLC-ABC` di bilah atas.
- Operator menyentuh field `ID Operator / Username *` (memasukkan NIK atau username akunnya), menyentuh field `Kata Sandi / PIN Shift *`, menekan tombol angka berukuran besar pada kartu `Numpad PIN Shift Cepat` (`1-9`, `0`, `CLR`, `OK`), lalu menyentuh `Masuk & Aktifkan Sesi Shift` (atau tombol `OK` pada Numpad).
- Apabila operator menggunakan `TEMP-PIN` sementara hasil pendaftaran baru atau reset dari SuperAdmin (**Main Task 03**), sistem langsung memunculkan modal `Ubah PIN / Kata Sandi` (`Gambar 91`) dan mewajibkan pembuatan PIN pribadi baru sebelum masuk ke layar produksi.
- Apabila operator lupa PIN shiftnya, operator menyentuh tautan `Lupa PIN / Kata Sandi?`, berpindah ke layar Pemulihan PIN HMI (`[LINGKUP HMI] 02` / `Gambar 72`), memasukkan `ID Operator / NIK Terdaftar *`, lalu menyentuh `Kirim Permintaan Reset ke SPV` sehingga tiket permintaan reset terkirim ke Aplikasi Web dan status tiket tampil di layar HMI.
- Setelah berhasil login, sistem memuat *App Shell* `Panel HMI-T7` (*Topbar* konteks mesin/shift dan *Bottom Navigation* 5 tab tanpa menu *Configuration Master*) lalu mengarahkan operator ke tab `Home` (`Production Running`, **Main Task 08**).
- Selama shift berjalan, operator menyentuh tab `Profile` pada *Bottom Navigation* (`[LINGKUP HMI] 09` / `Gambar 90`) untuk memeriksa identitas akun dan kebijakan otorisasi sesi mesin, atau menyentuh tombol `Ubah PIN / Kata Sandi` (`Change password`) untuk membuka modal pembaruan PIN (`Gambar 91`).
- Di akhir jam kerja shift, operator menyentuh tombol merah lebar penuh `Keluar Shift / Logout HMI-T7` (`Gambar 73`), memeriksa kartu `Checklist Penutupan Sesi Shift` beserta modal `Konfirmasi Logout HMI-T7` (`Gambar 74`), lalu menyentuh `Ya, Keluar Shift` untuk menutup sesi akunnya sementara `PLC-ABC` dan `GW-100` tetap mengakuisisi telemetri mesin di latar belakang hingga operator shift berikutnya login.

## Acceptance Criteria:

**A. Pembatasan Lingkup Perangkat, Ergonomi Sentuh Industri, & Relasi dengan Task Lain**
1. Antarmuka `Panel HMI-T7` dioptimalkan khusus untuk layar sentuh panel industri resolusi **`1280 x 800 px`** di lingkungan pengemasan garam yang lembap/berdebu dengan ketentuan ergonomi wajib (sesuai NFR PRD Bagian 3.4 & `[DESIGN SYSTEM] 03`):
   - Seluruh tombol interaktif, baris input, dan tab navigasi wajib memiliki ukuran bidang sentuh minimal **`48 x 48 px`** (serta **`>= 56 x 56 px`** untuk tombol *Numpad* dan *Bottom Navigation*) agar akurat ditekan menggunakan sarung tangan kerja pabrik.
   - Ukuran teks isi utama (*body/value*) minimal **`16 px` (`16pt`)** dengan rasio kontras tinggi sesuai standar WCAG AA.
2. **Pemisahan Tegas Lingkup HMI vs Aplikasi Web (`[DESIGN SYSTEM] 03`)**:
   - `Panel HMI-T7` **sama sekali tidak menampilkan** grup menu `Configuration` (*Master Factory/Area, Master Line/Machine, Master SKU, Master Downtime Reason, User Management, Upload Guideline*) maupun fitur *Approval / Release Shift Report* dan *Business Impact*.
   - Akun yang diizinkan login ke `Panel HMI-T7` adalah akun aktif (`is_active = true` dari **Main Task 03**) dengan peran `Operator (HMI-T7 Only)` (baik tipe `Production` maupun `Technical / Maintenance`), `Shift Leader`, `Supervisor (SPV)`, dan `SuperAdmin (OT/IT)` yang ditugaskan pada *Area / Mesin* terkait (atau memiliki hak lintas pabrik).
3. **Kontinuitas Akuisisi Saat Belum Ada Operator Login (URS Tabel 15 Baris 2733-2740)**:
   - Akuisisi counter produksi, deteksi *downtime*, dan pencatatan *losses* oleh `PLC-ABC` dan `GW-100` (**Main Task 06**) **tetap berjalan penuh 24/7 di latar belakang** meskipun belum ada operator yang login atau saat terjadi jeda pergantian sesi antarshift.
   - Seluruh aksi tulis pada `Panel HMI-T7` (memulai/mengubah order produksi, mengisi alasan downtime, menambah counter *Reject/Rework/Scrap K3*, membuat/memverifikasi *Kaizen*, dan mengubah PIN) **wajib dalam kondisi sudah login**; apabila layar melihat status mesin tanpa sesi aktif, setiap sentuhan aksi langsung mengarahkan pengguna ke layar Login `Panel HMI-T7`.

**B. App Shell `Panel HMI-T7`: `Component / [HMI] Topbar` & `Component / [HMI] Bottom Nav`**
1. Setelah operator berhasil login, setiap layar utama `Panel HMI-T7` dibungkus oleh komponen *Topbar* di bagian atas dan *Bottom Navigation* 5 tab di bagian bawah (tanpa *Sidebar* kiri).
2. **`Component / [HMI] Topbar`** menampilkan 3 kelompok informasi *real-time* (sesuai URS baris 2661-2672 & `Gambar 73, 75, 90`):
   - **Identitas Konsol & Koneksi Mesin (Kiri)**: emblem `PC`, label lingkup `[HMI-T7] Panel Operator Lini`, kode/IP kontroler `PLC-ABC | 192.168.10.20`, serta badge status jaringan (`ONLINE`, atau `OFFLINE - Data Queued` berwarna peringatan apabila koneksi ke Backend `VM1` sedang terputus namun penyimpanan antrean lokal aktif).
   - **Metadata Sesi Produksi Berjalan (Tengah)**: menampilkan pasangan label dan nilai aktual untuk `AREA` (contoh: `Unit 2 Garam`), `LINE` (contoh: `Mesin Packing #6`), `SKU` (contoh: `GRM-250G (250g)`, atau `-` saat mesin `STANDBY` belum ada order aktif), rentang waktu `START` & `END` / jam kerja shift aktif (contoh: `SHIFT 1: 07:00 - 15:00`), serta `TARGET` produksi order aktif (contoh: `12,000 pcs`).
   - **Identitas Operator & Shift Aktif (Kanan)**: menampilkan `USER / OPERATOR` yang sedang login (kode/nama operator aktif, contoh: `OPR-U2-01`) beserta nomor `SHIFT` aktif (`1`, `2`, atau `3`).
3. **`Component / [HMI] Bottom Nav`** (`tinggi >= 56 px`) menampilkan tepat **5 tab sentuh** secara horizontal dengan ikon + label teks serta indikator warna aktif (`$text-brand` / `$primary-subtle`) pada tab yang sedang dibuka:
   - Tab 1: **`Home`** (`Production Running` - menampilkan *badge* angka merah di sudut ikon apabila jumlah antrean **`Downtime Unreason Queue > 0`** sesuai URS baris 2741; detail perilaku pada **Main Task 08 & 09**).
   - Tab 2: **`Log Activity`** (riwayat aktivitas lokal mesin; detail pada **Main Task 10**).
   - Tab 3: **`Prev. Production`** (evaluasi produksi & Pareto downtime shift sebelumnya; detail pada **Main Task 10**).
   - Tab 4: **`Kaizen`** (tiket perbaikan produksi & maintenance lapangan; detail pada **Main Task 11**).
   - Tab 5: **`Profile`** (profil operator aktif, ubah PIN/sandi, akses baca SOP digital, dan keluar shift).

**C. Layar Login Operator & *Touch Numeric Keypad* (`[LINGKUP HMI] 01` - URS 19.3.1 Gambar 71)**
1. Bilah status atas (*Auth Strip*) pada layar Login menampilkan penanda lingkup `LINGKUP HMI-T7 | KONSOL LOGIN OPERATOR LINI` serta status komunikasi langsung ke PLC mesin yang terikat (`[ONLINE] PLC-ABC 192.168.10.20 | Mesin Packing #6 Unit 2` atau `[OFFLINE]`).
2. Layar Login menampilkan 2 kartu berdampingan untuk mempercepat proses masuk operator bersarung tangan:
   - **Kartu Kiri - Formulir `Login Operator HMI-T7` (`Gambar 71`)**:
     - Emblem `PC`, judul `Login Operator HMI-T7`, dan subjudul petunjuk kontrol sentuh.
     - Field input `ID Operator / Username *` (*placeholder* `enter your username...` / `Masukkan ID Operator atau Username...`, tinggi kontrol `>= 48 px`; menerima `NIK / ID Personel` seperti `OPR-U2-01` maupun `Username` seperti `opr.shift1.pack6`, serta mendukung pemilih cepat daftar kode operator aktif Unit 2 agar tidak perlu mengetik panjang).
     - Field input `Kata Sandi / PIN Shift *` (*placeholder* `enter your password...` / `Masukkan PIN 6 digit atau kata sandi...`, karakter tersamar `********` secara *default*, dilengkapi tombol sentuh ikon mata *show/hide*).
     - Tautan sentuh `Lupa PIN / Kata Sandi?` (`Forgot password?`) yang membuka layar Pemulihan PIN (`[LINGKUP HMI] 02`).
     - Tombol aksi primer lebar penuh (`tinggi >= 52 px`) `Masuk & Aktifkan Sesi Shift` (`Login`).
   - **Kartu Kanan - `Numpad PIN Shift Cepat` (`TOUCH >= 56px`)**:
     - Papan tombol angka sentuh 4x3 berisi tombol `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `CLR` (hapus input PIN), `0`, dan `OK` (kirim/konfirmasi login), masing-masing berukuran minimal `56 x 56 px`.
     - Saat fokus berada pada field `Kata Sandi / PIN Shift *` (atau operator memilih kode operatornya), ketukan pada tombol angka `0-9` langsung mengisi digit PIN secara responsif (`< 100 ms`), `CLR` menghapus digit yang dimasukkan, dan `OK` mengeksekusi validasi login yang sama dengan tombol `Masuk & Aktifkan Sesi Shift`.
3. Validasi autentikasi, pergantian wajib `TEMP-PIN`, dan ketahanan *offline*:
   - Jika field `ID Operator / Username *` atau `Kata Sandi / PIN Shift *` kosong, sistem menandai field kosong dengan warna error (`$danger-solid`) dan menampilkan pesan wajib isi.
   - Jika kredensial salah, sistem menampilkan pesan error `ID Operator atau PIN tidak sesuai. Akun dikunci sementara setelah 5 percobaan gagal.`
   - Jika gagal **5 kali berturut-turut** pada akun yang sama, akun dikunci sementara selama **15 menit** (atau hingga di-reset oleh `SuperAdmin` melalui **Main Task 03**) dan kejadian dicatat ke *Log Activity / Audit Log*.
   - Jika akun berstatus `is_active = false` atau tidak memiliki otorisasi pada mesin/area tersebut, sistem menolak login dengan pesan penolakan akses yang jelas.
   - **Wajib Ganti `TEMP-PIN` Awal**: apabila akun login menggunakan `TEMP-PIN` atau Kata Sandi Sementara hasil pembuatan akun baru / *Reset Password* dari **Main Task 03** (`must_change_credential = true`), sistem langsung membuka modal `Ubah PIN / Kata Sandi` (Bagian F) dan menahan akses ke menu lain sampai pengguna menyimpan PIN pribadi barunya.
   - **Ketahanan Login Saat Server `VM1` Terputus (*Offline Auth Cache*)**: `Panel HMI-T7` menyimpan *cache* terenkripsi (`bcrypt` hash) daftar operator aktif yang ditugaskan di Area tersebut dari sinkronisasi terakhir; apabila koneksi LAN ke `VM1` sedang terputus saat pergantian shift, operator tetap dapat login secara lokal menggunakan PIN yang cocok, bekerja dalam mode *Offline Queue* (`maksimal buffer antrean input 4 jam` sesuai dokumen integrasi Bagian 10.A), dan seluruh log login disinkronkan otomatis ke `VM1` saat koneksi pulih.

**D. Layar Pemulihan Akses / Lupa PIN HMI (`[LINGKUP HMI] 02` - URS 19.3.2 Gambar 72)**
1. Karena `Panel HMI-T7` beroperasi pada jaringan OT lantai produksi yang tertutup tanpa akses email pribadi/internet publik, alur `Lupa PIN / Kata Sandi?` menghubungkan permintaan bantuan operator langsung ke konsol pengawas internal sesuai ketentuan teks Tabel 15 URS & `Gambar 72`:
   - **Kartu Langkah 1 - Pengajuan Reset / Instruksi Administrator (`Gambar 72`)**:
     - Menampilkan judul `Lupa PIN / Kata Sandi Operator HMI` beserta petunjuk bahwa pemulihan akses dilakukan melalui otorisasi Supervisor / SuperAdmin (`Please call your administrator to help you to reset your account password`).
     - Menyediakan field input `ID Operator / NIK Terdaftar *` (terisi otomatis apabila operator sudah mengetik ID-nya di layar Login sebelumnya).
     - Tombol sekunder `Kembali Login` (`Close`) untuk kembali ke layar Login, dan tombol primer `Kirim Permintaan Reset ke SPV`.
   - **Kartu Langkah 2 - Status Tiket Pemulihan `HMI -> Web`**:
     - Saat `Kirim Permintaan Reset ke SPV` disentuh pada kondisi *online* dengan `ID Operator / NIK` yang terdaftar, sistem menerbitkan tiket permintaan reset (contoh: `Tiket #RST-xxxx`), mendorong notifikasi *real-time* ke lonceng notifikasi Aplikasi Web (**Main Task 17**) dan modul `User Management` (**Main Task 03**), serta menampilkan kartu status `[MENUNGGU OTORISASI WEB]` di layar HMI beserta instruksi penggunaan `TEMP-PIN` setelah di-reset.
     - Untuk mencegah penyalahgunaan tombol, akun yang sama hanya dapat mengirim maksimal 1 tiket permintaan reset aktif dalam selang waktu `15 menit`.
     - Apabila jaringan ke `VM1` sedang *offline*, sistem menampilkan kotak dialog instruksi langsung sesuai `Gambar 72` agar operator menghubungi Shift Leader / Supervisor / SuperAdmin OT/IT secara langsung untuk penerbitan reset PIN ketika koneksi tersambung.

**E. Halaman `Profile` Operator Aktif (`[LINGKUP HMI] 09` - URS 19.3.9 Gambar 90 & 19.3.3 Gambar 73)**
1. Saat operator menyentuh tab `Profile` pada *Bottom Navigation*, sistem menampilkan sakelar sub-tampilan (*segmented switch*) 2 tab di bagian atas area konten sesuai `Gambar 73, 90, 92`:
   - Sub-tab **`Profile`** (`Profile & Ubah PIN`, terpilih secara *default* saat tab `Profile` dibuka).
   - Sub-tab **`Guideline`** (`View Guideline SOP Digital`, mengalihkan tampilan ke pembaca SOP *read-only* `Gambar 92` yang diatur secara rinci pada **Main Task 10**).
2. Pada sub-tab `Profile`, sistem menampilkan data akun operator yang sedang login dalam tata letak 2 kolom yang **seluruhnya bersifat *read-only*** (tanpa tombol *Edit Profile* di HMI, sesuai Tabel 15 URS & `Gambar 90`):
   - `ID Operator / NIK` (contoh: `OPR-U2-01`).
   - `Username` (contoh: `opr.shift1.pack6`).
   - `Nama Lengkap (Full Name)` (nama personel atau label jabatan operator).
   - `Email` (menampilkan alamat email jika terdaftar, atau tanda `-` jika akun operator non-email).
   - `Departemen (Department Name)` (contoh: `Produksi Garam Unit 2` atau `Maintenance`).
   - `Jabatan (Job Title)` (contoh: `Operator Mesin Packing`).
   - `Peran RBAC (Role)` (contoh: `Operator`).
   - `Tipe Pengguna (User Type)` (contoh: `Production` atau `Technical`).
3. Selain atribut akun, halaman `Profile` menampilkan kartu ringkasan **`Status Hak Akses & Pengikatan Perangkat`** (`[LINGKUP HMI] 09`):
   - Cakupan `[HAK OPERATOR]`, penjelasan `[BATAS LINGKUP]` bahwa menu *Master Data* & *Approval Report* hanya ada di Aplikasi Web, informasi `[AUDIT TRAIL]` pencatatan otomatis `user_id` & waktu `GW-100`, serta strip pengikatan mesin `[TERIKAT KE LINI] Mesin Packing #6 - Unit 2 Garam | PLC-ABC | SWH-8P`.
4. Di bagian bawah kartu `Profile` (di atas *Bottom Navigation*) terdapat 2 tombol aksi sentuh berukuran besar sesuai `Gambar 73 & 90`:
   - Tombol sekunder `Ubah PIN / Kata Sandi` (`Change password` berikon gembok, membuka modal `Gambar 91` pada Bagian F).
   - Tombol destruktif primer lebar penuh (`$danger-solid`, tinggi `>= 52 px`) **`Keluar Shift / Logout HMI-T7`** (`Logout` berikon pintu keluar, membuka alur konfirmasi keluar shift pada Bagian G).

**F. Modal `Ubah PIN / Kata Sandi HMI` (`[LINGKUP HMI] 09` - URS 19.3.10 Gambar 91)**
1. Saat operator menyentuh tombol `Ubah PIN / Kata Sandi` (`Change password`), sistem menampilkan modal **`Ubah PIN / Kata Sandi` (`Change your password` - `Gambar 91`)** di atas latar yang diredupkan, dilengkapi tombol tutup `X` (tombol `X` dan `Batal` disembunyikan khusus apabila modal dipicu oleh kewajiban ganti `TEMP-PIN` pada login pertama).
2. Modal memuat 3 field input bertipe *password/PIN* (masing-masing tersamar secara *default*, dilengkapi ikon mata *show/hide*, dan terintegrasi dengan *on-screen Numpad/Keyboard*):
   - `PIN / Kata Sandi Lama *` (`Old Password *`, *placeholder* `enter your old password...`).
   - `PIN / Kata Sandi Baru *` (`New Password *`, *placeholder* `enter your new password...`).
   - `Konfirmasi PIN / Kata Sandi Baru *` (`Confirm Password *`, *placeholder* `confirm your new password...`).
   - Tombol sekunder `Batal` (`Discard`) dan tombol primer `Simpan PIN / Kata Sandi` (`Save password`).
3. Aturan validasi saat `Simpan PIN / Kata Sandi` disentuh:
   - Jika salah satu dari ketiga field kosong, sistem menampilkan pesan validasi wajib isi pada field tersebut.
   - Jika `PIN / Kata Sandi Lama *` tidak sesuai dengan kredensial aktif pengguna saat ini, sistem menolak perubahan dengan pesan `PIN / kata sandi lama tidak sesuai.`
   - Untuk akun `Operator (HMI-T7 Only)`, `PIN Baru *` wajib terdiri atas **minimal 6 digit angka** (agar kompatibel penuh dengan login cepat `Numpad PIN Shift Cepat`) dan tidak boleh menggunakan urutan angka berulang identik seluruhnya (misal `000000` atau `111111`); untuk peran hibrida (`Shift Leader` / `SPV`), sistem mengizinkan pembaruan PIN 6 digit HMI maupun kata sandi sesuai aturan kompleksitas akunnya.
   - `PIN / Kata Sandi Baru *` tidak boleh sama persis dengan `PIN / Kata Sandi Lama *`, dan `Konfirmasi PIN / Kata Sandi Baru *` wajib sama persis dengan `PIN / Kata Sandi Baru *`.
   - Perubahan PIN hanya dapat dieksekusi saat `Panel HMI-T7` terhubung ke Backend `VM1` (*online*) agar *hash* `bcrypt` di database pusat dan *cache* lokal langsung sinkron, menghapus flag `must_change_credential`, mencatat aktivitas ke *Log Activity* & *Audit Log*, serta menampilkan notifikasi sukses.

**G. Validasi Serah Terima Shift & Modal `Konfirmasi Logout HMI-T7` (`[LINGKUP HMI] 10` - URS 19.3.3 Gambar 73 & Gambar 74)**
1. Saat operator menyentuh tombol merah `Keluar Shift / Logout HMI-T7`, sistem **tidak langsung menutup sesi**, melainkan menampilkan ringkasan **`Checklist Penutupan Sesi Shift`** beserta modal **`Konfirmasi Logout HMI-T7` (`Logout Confirmation` - `Gambar 74`)**.
2. Ringkasan prakeluar & isi modal konfirmasi wajib menampilkan:
   - Judul konfirmasi: `Akhiri Sesi Operator Shift <N>?` (`Logout Confirmation`).
   - Ringkasan status data shift berjalan pada mesin tersebut:
     - Total `Finish Good Tercatat` (`pcs` & konversi `kg`).
     - Total `Defect & Scrap K3 Tercatat`.
     - Status **`Antrean Unreasoned Downtime`**: menampilkan `[OK] 0 antrean tersisa` apabila seluruh henti mesin sudah diklasifikasikan, atau peringatan mencolok **`[!] Terdapat <X> antrean Downtime belum diklasifikasi`** apabila masih ada henti mesin tanpa alasan disertai tombol pintas `Isi Alasan Downtime Sekarang`.
   - Informasi jaminan kontinuitas telemetri: `Anda akan keluar dari akun operator. Pastikan seluruh pencatatan shift telah tersimpan. Data produksi mesin tetap diakuisisi otomatis di latar belakang oleh PLC-ABC & Gateway GW-100 selama pergantian operator.`
   - Tombol sentuh sekunder `Batal` (`Cancel`) dan tombol aksi destruktif primer (`$danger-solid`) `Ya, Keluar Shift` (`Yes, log out`).
3. Perilaku saat tombol modal disentuh:
   - Jika operator menyentuh `Batal` (`Cancel`) atau ikon tutup `X`, modal tertutup dan operator tetap berada pada halaman `Profile`.
   - Jika operator menyentuh `Isi Alasan Downtime Sekarang`, modal tertutup dan aplikasi langsung membuka tab `Home` fokus pada daftar `Downtime Unreason Queue` (**Main Task 09**).
   - Jika operator menyentuh `Ya, Keluar Shift` (`Yes, log out`):
     - Apabila sedang terdapat *Full-Screen Interlock Buzzer* aktif yang belum di-*acknowledge* (`BUZ-01 = ON`), sistem meminta operator mematikan/mengisi interlock darurat terlebih dahulu atau menyerahkannya pada login operator pengganti.
     - Sistem mencatat kejadian `Logout` operator ke `Log Activity` lokal mesin (**Main Task 10**) dan *Audit Log* pusat (**Main Task 17**), menyertakan catatan jumlah *Unreasoned Downtime* tersisa (bila ada) untuk ditindaklanjuti operator shift berikutnya atau `Shift Leader`, menghapus sesi operator aktif di `Panel HMI-T7` (tanpa menghapus antrean *offline sync* yang belum terkirim ke server), dan mengembalikan tampilan ke layar Login `Panel HMI-T7` (`[LINGKUP HMI] 01`).

## Catatan
- **Penambahan `Numpad PIN Shift Cepat` Pendamping Form Login (`Gambar 71` URS vs Ergonomi Pabrik Garam `[LINGKUP HMI] 01`)**: Pada `Gambar 71 Mockup Login` URS hanya tergambar kotak input `Username *` dan `Password *` polos tanpa papan ketik layar. Mengingat `Panel HMI-T7` adalah layar sentuh tanpa keyboard fisik yang dioperasikan menggunakan sarung tangan di area pengemasan garam yang lembap/korosif, desain `[LINGKUP HMI] 01` di [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) menyandingkan kartu `Numpad PIN Shift Cepat` (`>= 56 px`) langsung di sebelah kartu Login.
- **Peningkatan Dialog `Forgot Password` Statis (`Gambar 72` URS vs Tiket Internal `[LINGKUP HMI] 02`)**: Pada `Gambar 72 Mockup Forget Password` URS hanya tampil pesan statis *"Please call your administrator to help you to reset your account password"*. Pada AC Bagian D, pesan tersebut tetap dipertahankan untuk kondisi *offline*, sekaligus dilengkapi tombol pengiriman tiket permintaan reset internal (`HMI -> Web`) saat jaringan LAN lokal aktif agar `Supervisor` / `SuperAdmin` langsung menerima notifikasi akun mana yang meminta reset PIN pada **Main Task 03**.
- **Rekonsiliasi Duplikasi Gambar `Gambar 73 Mockup Logout` vs `Gambar 90 Mockup Profile` & Field `NIK` pada `Gambar 74`**: Di dalam dokumen URS, `Gambar 73` (halaman 92) dan `Gambar 90` (halaman 101) menampilkan layar `Profile` yang sama (hanya bertukar posisi baris `Full Name` dan `Username`), sedangkan pada latar belakang `Gambar 74` (halaman 93) muncul tambahan field `NIK` di baris kiri paling atas. AC Bagian E menyatukan seluruh field tersebut (`ID Operator / NIK`, `Username`, `Nama Lengkap`, `Email`, `Departemen`, `Jabatan`, `Peran`, `Tipe Pengguna`) secara konsisten dalam satu halaman `Profile` *read-only*, lengkap dengan ringkasan validasi serah terima shift sebelum modal `Konfirmasi Logout` (`Gambar 74`).
