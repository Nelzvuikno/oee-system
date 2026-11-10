# Main Task 01: Aplikasi Web - Autentikasi, Pemulihan Kata Sandi, Profil Pengguna, dan Navigasi Role-Based (RBAC)

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 01`, `[LINGKUP WEB] 02`, `[LINGKUP WEB] 03`, `[DESIGN SYSTEM] 02`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.1` Gambar 13, `19.2.1` Gambar 14, `19.2.2` Gambar 15, `19.2.3` Gambar 16-17, `19.2.11` Gambar 26-28) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
Personel berwenang pada lingkup pengawasan dan manajemen pabrik (`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)`) dapat masuk ke Aplikasi Web ProductionCore secara aman, memulihkan akses kata sandi, mengelola profil serta kata sandi akunnya, dan keluar dari sesi kerja dengan konfirmasi pengaman. Setelah berhasil masuk, sistem membatasi visibilitas menu navigasi *Sidebar* serta izin akses rute URL secara ketat sesuai peran RBAC pengguna sehingga fungsi konfigurasi *master data* maupun persetujuan laporan tidak dapat diakses oleh peran yang tidak berwenang.

## Prasyarat
- Layanan Backend API (VM1), Database PostgreSQL (VM2), dan layanan autentikasi JWT telah aktif di jaringan internal pabrik PT. XYZ.
- Data akun pengguna minimal untuk masing-masing peran Web (`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, `SuperAdmin (OT/IT)`) telah terdaftar di tabel `User` dengan status `is_active = true` dan kata sandi tersimpan dalam bentuk *hash* `bcrypt`.
- Pengguna mengakses Aplikasi Web ProductionCore menggunakan peramban (*browser*) desktop dengan resolusi standar ruang kontrol/kantor (`1440 x 1024 px`).

## User Journey
- Pengguna membuka URL Aplikasi Web ProductionCore melalui peramban desktop saat belum memiliki sesi login aktif.
- Sistem mengarahkan pengguna secara otomatis ke halaman Login Aplikasi Web (`[LINGKUP WEB] 01`).
- Pengguna memasukkan identitas akun (Nomor Telepon, Username, atau Email Korporat) beserta Kata Sandi, memilih opsi ingat perangkat bila diperlukan, lalu menekan tombol `Masuk ke Konsol OEE` (atau menekan tombol `Enter`).
- Apabila pengguna lupa kata sandi, pengguna menekan tautan `Lupa kata sandi?`, berpindah ke halaman Pemulihan Kata Sandi (`[LINGKUP WEB] 02`), memasukkan Email Terdaftar atau NIK, menekan `Kirim Tautan Pemulihan`, dan melihat konfirmasi pengiriman tautan beserta petunjuk alternatif reset melalui SuperAdmin.
- Setelah kredensial login tervalidasi, sistem menerbitkan sesi autentikasi, mencatat aktivitas login ke *Audit Log*, dan mengarahkan pengguna ke halaman utama *default* sesuai peran RBAC pengguna beserta komponen *Topbar* dan *Sidebar* yang hanya memuat menu milik peran tersebut.
- Pengguna membuka halaman Profil Pengguna (`[LINGKUP WEB] 03`) melalui menu profil di *Topbar* atau *Sidebar* untuk melihat rincian identitas akunnya.
- Pengguna memperbarui field profil yang diizinkan lalu menekan `Simpan Perubahan Profil`, atau berpindah ke panel/tab `Ubah Kata Sandi` untuk mengganti kata sandi lama dengan kata sandi baru.
- Pengguna berpindah ke tab `Panduan Penggunaan / Guideline` dari halaman profil apabila ingin membaca dokumen panduan operasional sesuai perannya.
- Saat selesai bertugas, pengguna menekan tombol `Keluar Sesi`, melihat modal `Konfirmasi Keluar Sistem`, lalu menekan `Ya, Keluar Sekarang` untuk mengakhiri sesi dan kembali ke halaman Login Web (atau menekan `Batal` / tombol `Esc` untuk tetap berada di dalam aplikasi).

## Acceptance Criteria:

**A. Halaman Login Aplikasi Web (`[LINGKUP WEB] 01` - URS 19.2.1 Gambar 14)**
1. Saat pengguna yang belum terautentikasi mengakses rute mana pun di Aplikasi Web, sistem secara otomatis mengarahkan pengguna ke halaman Login Aplikasi Web (`/login`) dan tidak menampilkan komponen *Sidebar* maupun *Topbar* internal.
2. Bagian *header strip* halaman Login menampilkan informasi identitas lingkungan kerja:
   - Label kiri identitas konsol: `PRODUCTIONCORE WEB CONSOLE` dan keterangan lokasi `PT. XYZ - Unit 2 Pengemasan Garam`.
   - Indikator status koneksi *gateway* di sisi kanan: menampilkan status koneksi `Gateway GW-100: ONLINE` (atau `OFFLINE` jika broker tidak menerima *heartbeat* `GW-100`), tanpa menghalangi proses login ke Aplikasi Web.
3. Kartu utama Login menampilkan elemen-elemen form berikut secara berurutan:
   - Emblem inisial aplikasi `PC`, judul utama `Masuk ke ProductionCore`, dan subjudul `Sistem Monitoring OEE & TPM Mesin Packing #6`.
   - Field input `Nomor Telepon, Username, atau Email Korporat *` (wajib isi, teks satu baris, menerima salah satu dari ketiga pengenal akun yang terdaftar di tabel `User`).
   - Field input `Kata Sandi *` (wajib isi, bertipe *password* yang secara *default* menyamarkan karakter input menjadi simbol bintang/titik, dilengkapi tombol ikon mata *show/hide password* untuk menampilkan atau menyembunyikan teks kata sandi).
   - *Checkbox* `Ingat perangkat ruang kontrol`: secara *default* tidak tercentang (`unchecked`); jika dicentang sebelum login, masa berlaku sesi diperpanjang sesuai kebijakan perangkat ruang kontrol (misal sesi persisten 7 hari dibandingkan sesi standar 1 shift / 8 jam).
   - Tautan teks `Lupa kata sandi?` yang mengarahkan pengguna ke halaman Pemulihan Kata Sandi (`/forgot-password`).
   - Tombol aksi primer `Masuk ke Konsol OEE`.
   - Catatan kaki informasi otorisasi: `Akses khusus personel berwenang PT. XYZ Unit 2 (Shift Leader, SPV, Admin, SuperAdmin).`
4. Aturan interaksi dan validasi saat pengguna menekan tombol `Masuk ke Konsol OEE` atau menekan `Enter`:
   - Jika field identitas atau field `Kata Sandi *` kosong, sistem membatalkan pengiriman API, menandai border input yang kosong dengan warna error (`$danger-solid`), dan menampilkan pesan validasi inline di bawah field terkait bahwa field wajib diisi.
   - Saat permintaan login sedang diproses ke server, tombol `Masuk ke Konsol OEE` berubah ke kondisi *loading/disabled* agar mencegah klik ganda (*double submit*).
   - Jika kombinasi identitas dan kata sandi tidak cocok, sistem menampilkan banner pesan error pada kartu login: `Kata sandi tidak cocok. Akun dikunci sementara setelah 5 percobaan gagal.` tanpa membocorkan apakah username/email tersebut terdaftar atau tidak.
   - Jika pengguna gagal memasukkan kata sandi sebanyak **5 kali berturut-turut** pada akun yang sama, sistem mengunci sementara percobaan login akun tersebut selama **15 menit** (atau hingga dibuka kembali melalui reset oleh SuperAdmin), menolak percobaan login ke-6 dst. selama masa kunci aktif, dan mencatat kejadian penguncian ke *Audit Log*.
   - Jika akun memiliki status `is_active = false` (dinonaktifkan oleh SuperAdmin) atau memiliki peran murni `Operator` yang hanya diizinkan pada konsol `Panel HMI-T7`, sistem menolak login ke Aplikasi Web dan menampilkan pesan error otorisasi bahwa akun tidak memiliki izin akses konsol Web Manajemen.

**B. Halaman Pemulihan Kata Sandi / Forgot Password Web (`[LINGKUP WEB] 02` - URS 19.2.2 Gambar 15)**
1. Halaman Pemulihan Kata Sandi terdiri atas alur 2 tahap visual beserta kotak informasi alternatif bagi akun non-email di jaringan internal pabrik.
2. Pada **Tahap 1 dari 2 (Verifikasi Akun)**, sistem menampilkan:
   - Judul `Pulihkan Akses Akun` dan instruksi: `Masukkan email korporat atau NIK yang terdaftar pada Unit 2 Pengemasan untuk menerima tautan atur ulang kata sandi.`
   - Field input `Email Terdaftar atau NIK *` (wajib isi).
   - Tombol aksi primer `Kirim Tautan Pemulihan`.
   - Tombol/tautan sekunder `Kembali ke Halaman Login` yang mengembalikan pengguna ke halaman `/login`.
3. Saat pengguna menekan tombol `Kirim Tautan Pemulihan`:
   - Jika field `Email Terdaftar atau NIK *` kosong atau format tidak valid, sistem menampilkan pesan validasi error inline dan tidak berpindah ke Tahap 2.
   - Jika input terisi dengan akun yang memiliki alamat email korporat aktif, sistem mengirim email berisi tautan *reset password* sekali pakai yang memiliki masa berlaku **15 menit**, mencatat permintaan reset pada *Activity & Audit Log*, lalu mengubah tampilan ke **Tahap 2 (Tautan Terkirim)**.
   - Pada **Tahap 2 (Tautan Terkirim)**, sistem menampilkan judul `Periksa Kotak Masuk Email` dan keterangan: `Tautan atur ulang kata sandi telah dikirim ke <email pengguna>. Tautan berlaku selama 15 menit.`
   - Jika tautan pemulihan sudah melewati batas waktu **15 menit** atau sudah pernah dipakai sebelumnya, saat tautan dibuka sistem menolak perubahan sandi dan mengarahkan pengguna untuk meminta tautan pemulihan baru.
4. Pada halaman yang sama, sistem selalu menampilkan panel informasi **Akun Tanpa Email Korporat / Jaringan Tertutup Pabrik** (selaras dengan ketentuan teks URS):
   - Menampilkan judul `Akun Operator Tanpa Email?` dan petunjuk: `Hubungi SuperAdmin OT/IT untuk reset PIN/kata sandi melalui modul User Management (URS 19.2.13 Gambar 41).`
   - Jika pengguna memasukkan NIK akun internal yang terdaftar tanpa email korporat pada Tahap 1, sistem meneruskan tiket notifikasi permintaan reset kata sandi ke lonceng notifikasi SuperAdmin di Aplikasi Web dan menampilkan pemberitahuan kepada pengguna untuk menghubungi SuperAdmin OT/IT.

**C. App Shell: Topbar & Navigasi Sidebar Berbasis Peran / RBAC (`[DESIGN SYSTEM] 02`, `Component / [WEB] Sidebar`, `Component / [WEB] Topbar` - URS 19.1 Gambar 13)**
1. Setelah autentikasi berhasil, seluruh halaman internal Aplikasi Web dibungkus oleh *App Shell* yang terdiri atas *Sidebar* kiri (`lebar 244 px`) dan *Topbar* atas (`tinggi 64 px`).
2. Komponen `Component / [WEB] Sidebar` menampilkan elemen tetap berikut:
   - Header identitas aplikasi: emblem `PC`, nama `ProductionCore`, dan sub-identitas `PT. XYZ | Unit 2 OEE`.
   - Penanda lingkup aplikasi (*workspace badge*): `WORKSPACE WEB | Unit 2` berwarna `$primary-subtle` dengan teks `$on-primary-subtle` untuk membedakan secara tegas konsol Web Manajemen dari konsol layar sentuh `Panel HMI-T7`.
   - Pohon menu navigasi model *accordion* (dapat dibuka/tutup per grup menu) dengan penanda visual aktif (`$bg-selected` dan teks `$text-brand` tebal) pada halaman yang sedang dibuka, sedangkan menu lain berada pada state *not clicked / default*.
   - Footer *Sidebar*: status koneksi real-time `[ONLINE] PLC-ABC / GW-100` (berubah sesuai *heartbeat* aktual `GW-100`) dan versi aplikasi `ProductionCore v1.0 | URS Rev.2`.
3. Komponen `Component / [WEB] Topbar` menampilkan elemen berikut pada setiap halaman internal:
   - Judul halaman aktif dan jejak navigasi *breadcrumb* (contoh: `Dashboard / OEE Performance / Mesin Packing #6`).
   - Badge telemetri ringkas status mesin utama `PLC-ABC` (contoh: `PLC-ABC: D000=1 (RUN)`, `STOP`, atau `FAULT`, selalu menyertakan teks status selain warna).
   - Tombol sakelar tema `Light / Dark`: secara *default* aplikasi menggunakan tema **Light** (`#FFF5F8` canvas / `#FFFFFF` surface); saat diklik, tema beralih seketika antara **Light** dan **Dark** tanpa merusak tata letak, font, maupun rasio kontras WCAG AA, serta menyimpan preferensi tema pengguna.
   - Chip profil pengguna yang sedang login: menampilkan avatar berbasis **2 huruf inisial nama/peran** (bukan foto fiktif), Nama Lengkap / Jabatan singkat, serta membuka akses ke halaman Profil Pengguna dan aksi `Keluar Sesi`.
4. Visibilitas grup menu pada *Sidebar* dan halaman *default* tujuan setelah login wajib menyesuaikan peran RBAC pengguna secara ketat sesuai matriks `URS Gambar 13`:
   - **Peran 1: `Shift Leader`**
     - Halaman *default* setelah login: `Production Running -> Production Active` (`[LINGKUP WEB] 06`).
     - Menu yang ditampilkan: grup **Production Running** (`Production Active`, `Line Detail` termasuk koreksi alasan downtime shift berjalan, `Kaizen`, `Activity Log`), grup **Report** (`By Shift` dengan hak *Submit Draft / Approve tingkat Shift Leader*, `By Product` mode *View*), serta akses **Profile & Guideline** (`User Profile`, `View Guideline SOP`).
     - Menu yang disembunyikan dan diblokir akses URL-nya: grup **Dashboard** eksekutif (`Business Impact`) dan seluruh grup **Configuration** (*Master Data*).
   - **Peran 2: `Supervisor (SPV)`**
     - Halaman *default* setelah login: `Dashboard -> OEE Performance` (`[LINGKUP WEB] 05`).
     - Menu yang ditampilkan: grup **Dashboard** (`OEE Performance`), grup **Report** (`By Shift` dengan hak *Approve* & *Release*, `By Product` dengan hak *Approve*), grup **Production Running** (`Production Active`, `Line Detail`, `Losses Analysis` mencakup *Availability / Performance / Quality Loss*, `Kaizen` termasuk verifikasi, `Activity Log`), serta akses **Profile & Guideline** (`User Profile`, `View Guideline SOP`).
     - Menu yang disembunyikan dan diblokir akses URL-nya: `Dashboard -> Business Impact` (khusus Manager/Admin & SuperAdmin) serta seluruh grup **Configuration** (*Master Data*).
   - **Peran 3: `Admin / Manager`**
     - Halaman *default* setelah login: `Dashboard -> Business Impact` (`[LINGKUP WEB] 04`).
     - Menu yang ditampilkan: grup **Dashboard** (`Business Impact`, `OEE Performance`), grup **Report** (`By Shift` dengan hak *Release*, `By Product` dengan hak *Release*, `Kaizen Report`), grup **Production Running** (`Production Active`, `Line Detail`, `Losses Analysis`, `Kaizen`, `Activity Log`), grup **Configuration** terbatas pada master operasional produksi (`SKU Master`, `Downtime Reason`, `Guideline SOP` termasuk *Upload/Edit*), serta **User Profile**.
     - Menu yang disembunyikan dan diblokir akses URL-nya: `Configuration -> Factory & Area`, `Configuration -> Line & Machine (PLC-ABC)`, dan `Configuration -> User Management` (eksklusif `SuperAdmin`).
   - **Peran 4: `SuperAdmin (OT/IT)`**
     - Halaman *default* setelah login: `Dashboard -> Business Impact` (`[LINGKUP WEB] 04`).
     - Menu yang ditampilkan: **Akses Penuh** ke seluruh grup **Dashboard** (`Business Impact`, `OEE Performance`), **Report** (`By Shift`, `By Product`), **Production Running** (`Production Active`, `Line Detail`, `Losses Analysis`, `Kaizen`, `Activity Log`), dan seluruh submenu **Configuration** (`Factory & Area`, `Line & Machine`, `SKU Master`, `Downtime Reason`, `User Management`, `Guideline SOP`), serta **User Profile**.
5. Apabila pengguna mengetik langsung URL halaman yang berada di luar hak peran RBAC-nya pada bilah alamat peramban (contoh: `Shift Leader` mengakses `/configuration/users`), sistem menolak akses tersebut (HTTP `403 Forbidden` / halaman penolakan akses) dan menyediakan tombol kembali ke halaman *default* perannya.

**D. Halaman Profil Pengguna & Edit Profil (`[LINGKUP WEB] 03` Tab Profil - URS 19.2.11 Gambar 26 & Gambar 27)**
1. Halaman Profil Pengguna memiliki 3 tab navigasi di bagian atas:
   - Tab `Profil & Edit Profil` (terpilih secara *default* saat halaman Profil dibuka).
   - Tab `Ubah Kata Sandi`.
   - Tab `Panduan Penggunaan / Guideline`.
2. Pada bagian header kartu `Profil & Edit Profil`, sistem menampilkan:
   - Avatar lingkaran berinisial 2 huruf nama/peran pengguna (contoh: `SP`), Nama Lengkap pengguna yang sedang login, dan kode `ID` sistem pengguna.
3. Rincian field akun pada kartu `Profil & Edit Profil` ditampilkan dalam tata letak 2 kolom dengan pemisahan tegas antara field administratif *read-only* dan field profil yang dapat diedit (*editable*):
   - `NIK / ID Personel`: *read-only* (tidak dapat diubah sendiri oleh pengguna).
   - `Username Sistem`: *read-only* (tidak dapat diubah sendiri oleh pengguna).
   - `Peran RBAC`: *read-only* (contoh: `SPV`, hanya dapat diubah oleh `SuperAdmin` melalui modul *User Management*).
   - `Tipe Pengguna`: *read-only* (contoh: `Production` / `Maintenance` / `Management`, hanya dapat diubah oleh `SuperAdmin`).
   - `Nama Lengkap`: *editable* (wajib isi, minimal 3 karakter).
   - `Email Notifikasi`: *editable* (opsional bagi akun non-email, tetapi jika diisi wajib berformat email valid dan belum dipakai akun lain).
   - `Departemen`: *editable* (pilihan/teks departemen kerja, contoh: `Produksi Garam Konsumsi Unit 2`).
   - `Jabatan`: *editable* (teks jabatan pengguna, contoh: `Production Supervisor`).
   - `Area Kerja Utama`: *read-only* atau mengikuti penugasan lini pengguna (contoh: `Unit 2 - Mesin Packing #6`).
4. Pada bagian bawah kartu Profil terdapat dua tombol aksi:
   - Tombol sekunder destruktif `Keluar Sesi` (memicu modal Konfirmasi Logout pada Bagian G).
   - Tombol primer `Simpan Perubahan Profil` (secara *default* *disabled* jika belum ada perubahan nilai field, dan aktif saat pengguna mengubah minimal satu field *editable*).
5. Saat pengguna menekan `Simpan Perubahan Profil`:
   - Jika validasi lolos, sistem memperbarui data profil di database, memperbarui tampilan nama/inisial di *Topbar* secara langsung tanpa memaksa logout, mencatat perubahan ke *Audit Log*, dan menampilkan notifikasi sukses.
   - Jika `Email Notifikasi` sudah digunakan oleh pengguna lain atau formatnya tidak valid, sistem membatalkan penyimpanan dan menampilkan pesan error inline pada field email.

**E. Tab / Panel Ubah Kata Sandi (`[LINGKUP WEB] 03` - URS 19.2.11 Gambar 28)**
1. Pada tab/panel `Ubah Kata Sandi`, sistem menampilkan 3 field input bertipe *password* (masing-masing dilengkapi ikon mata *show/hide*) beserta tombol simpan:
   - `Kata Sandi Saat Ini *` (wajib isi).
   - `Kata Sandi Baru (Min. 8 karakter, huruf & angka) *` (wajib isi).
   - `Konfirmasi Kata Sandi Baru *` (wajib isi).
   - Tombol aksi primer `Perbarui Kata Sandi`.
2. Aturan validasi saat pengguna menekan `Perbarui Kata Sandi`:
   - Jika salah satu dari ketiga field kosong, sistem menampilkan pesan error inline bahwa field wajib diisi.
   - Jika `Kata Sandi Saat Ini *` tidak cocok dengan *hash* `bcrypt` kata sandi aktif pengguna di database, sistem menolak perubahan dan menampilkan pesan error `Kata sandi saat ini tidak sesuai.`
   - Jika `Kata Sandi Baru` kurang dari **8 karakter** atau tidak mengandung kombinasi **minimal 1 huruf dan 1 angka**, sistem menolak perubahan dan menampilkan pesan validasi aturan kompleksitas kata sandi.
   - Jika `Kata Sandi Baru` sama persis dengan `Kata Sandi Saat Ini`, sistem menolak perubahan dan meminta kata sandi baru yang berbeda dari kata sandi lama.
   - Jika `Konfirmasi Kata Sandi Baru *` tidak sama persis dengan `Kata Sandi Baru`, sistem menampilkan pesan error `Konfirmasi kata sandi baru tidak cocok.`
   - Jika seluruh validasi terpenuhi, sistem menyimpan *hash* `bcrypt` kata sandi baru ke database, mencatat aksi pergantian kata sandi ke *Audit Log*, mengosongkan kembali ketiga field password, dan menampilkan notifikasi berhasil.

**F. Tab Panduan Penggunaan / View Guideline dari Profil (`[LINGKUP WEB] 03` - URS 19.2.11)**
1. Saat pengguna memilih tab `Panduan Penggunaan / Guideline` dari halaman Profil (atau memilih menu `View Guideline SOP` bagi peran `Shift Leader` dan `Supervisor`), sistem menampilkan daftar dokumen buku panduan aplikasi dan SOP digital yang telah diunggah pada modul *Guideline* (mekanisme unggah dan kelola dokumen oleh Admin/SuperAdmin mengikuti **Main Task 05**).
2. Pada tampilan ini, pengguna non-Admin (`Shift Leader` dan `Supervisor`) hanya memiliki akses **baca dan unduh/pratinjau dokumen (*read-only*)** tanpa tombol unggah, edit, maupun hapus dokumen.

**G. Aksi Keluar Sesi & Modal Konfirmasi Logout Web (`[LINGKUP WEB] 03` - URS 19.2.3 Gambar 16 & Gambar 17)**
1. Pengguna dapat memicu proses keluar sistem melalui tombol `Keluar Sesi` di halaman Profil maupun opsi `Keluar Sesi` pada menu *dropdown* chip profil di *Topbar* (`Gambar 16`).
2. Saat tombol `Keluar Sesi` diklik, sistem **tidak langsung mengeluarkan pengguna**, melainkan wajib memunculkan dialog modal `Konfirmasi Keluar Sistem` (`Gambar 17`) di atas latar halaman aktif.
3. Modal `Konfirmasi Keluar Sistem` menampilkan:
   - Judul `Konfirmasi Keluar Sistem`.
   - Pesan peringatan: `Anda akan keluar dari sesi pengawasan ProductionCore Unit 2. Pastikan seluruh koreksi alasan downtime dan persetujuan laporan shift telah disimpan.`
   - Petunjuk aksesibilitas keyboard: `Pintasan Keyboard: Tekan [Esc] untuk membatalkan dialog.`
   - Tombol sekunder `Batal`.
   - Tombol aksi destruktif primer (`$danger-solid`) `Ya, Keluar Sekarang`.
4. Perilaku tombol pada modal `Konfirmasi Keluar Sistem`:
   - Jika pengguna menekan tombol `Batal`, mengklik area *backdrop* di luar modal, atau menekan tombol `Esc` pada keyboard, modal tertutup dan pengguna tetap berada di halaman semula tanpa kehilangan data form yang sedang dibuka.
   - Jika pengguna menekan tombol `Ya, Keluar Sekarang`, sistem menghapus/menginvalidasi token sesi JWT aktif pengguna, mencatat aktivitas logout ke *Audit Log*, mengarahkan pengguna kembali ke halaman Login Aplikasi Web (`/login`), dan mencegah pengguna kembali ke halaman internal melalui tombol *Back* pada peramban.

**H. Proteksi Sesi, Keamanan JWT, Audit Trail, dan Aksesibilitas Keyboard**
1. Setiap sesi login menggunakan token JWT dengan masa kedaluwarsa terukur; apabila token sesi kedaluwarsa saat pengguna sedang membuka aplikasi, sistem mengarahkan pengguna kembali ke halaman `/login` dengan pemberitahuan bahwa sesi telah berakhir.
2. Seluruh kejadian autentikasi berikut wajib tercatat otomatis ke tabel *Audit Log* (terhubung ke **Main Task 17**) dengan informasi `timestamp`, `user_id` / `username`, `ip_address`, dan jenis aksi:
   - Login berhasil, percobaan login gagal, dan penguncian sementara akun (5x gagal).
   - Permintaan *Forgot Password* / tiket reset kata sandi.
   - Pembaruan data profil dan pergantian kata sandi.
   - Logout pengguna.
3. Seluruh kontrol interaktif pada halaman Login, Forgot Password, Sidebar, Topbar, Profil, Ubah Kata Sandi, dan Modal Logout dapat dinavigasi penuh menggunakan keyboard (`Tab` / `Shift+Tab` untuk berpindah fokus, `Enter` / `Space` untuk mengaktifkan tombol/checkbox, `Esc` untuk menutup modal/dropdown) dengan indikator *focus ring* `2px` berwarna `#FF4081` (`$border-focus`) yang terlihat jelas pada setiap elemen yang sedang fokus.

## Catatan
- **Rekonsiliasi Forgot Password Web (Teks Tabel 16/17 URS vs Mockup Gambar 15)**: Pada teks Tabel 16 & Tabel 17 URS disebutkan bahwa fitur *Forgot Password* memberitahu pengguna untuk menghubungi Admin guna me-reset password, sedangkan pada `Gambar 15 Mockup Forgot Password` ditampilkan form pengiriman pemulihan mandiri. Pada AC Bagian B di atas, kedua mekanisme diakomodasi sekaligus: pengiriman tautan email (berlaku 15 menit) untuk akun manajerial yang memiliki email korporat, serta panel petunjuk & tiket notifikasi ke SuperAdmin untuk akun internal pabrik tanpa email korporat (dieksekusi via *Reset Password* di **Main Task 03**).
- **Rekonsiliasi Peran Pengguna Web vs HMI (Tabel 15 & Baris 3355 URS vs Gambar 13 Sidebar & PRD)**: Teks URS baris 3355 menyebut peran `operator, SPV, superadmin dan admin`, sementara Tabel 15 berjudul `Fitur Shift Leader` namun memuat kolom `Tab / HMI`. Mengikuti pemisahan tegas lingkup pada [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[DESIGN SYSTEM] 02` & `03`) serta [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md), akun murni `Operator` lini produksi menggunakan konsol layar sentuh `Panel HMI-T7` (**Main Task 07**), sedangkan 4 peran yang masuk ke **Aplikasi Web** adalah `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin (OT/IT)`. Apabila personel `Maintenance` memerlukan akses pantau Web (sesuai matriks PRD Bagian 3.2), akunnya dapat diberikan peran baca setara *Viewer/Maintenance* atau melalui konfigurasi role pada **Main Task 03** (perlu konfirmasi final saat implementasi tabel RBAC).
- **Rekonsiliasi Edit Profile (Teks Tabel 16/17 URS vs Mockup Gambar 27)**: Teks Tabel 16 & 17 URS hanya menuliskan sub-fitur `Ganti Password` di bawah menu *Profile*, namun Bab 19 memuat `Gambar 27 Mockup Edit Profile`. AC Bagian D mengakomodasi *Gambar 27* dengan mengizinkan edit pada atribut kontak/jabatan personal (`Nama Lengkap`, `Email Notifikasi`, `Departemen`, `Jabatan`) sambil mengunci atribut identitas & otorisasi (`NIK`, `Username`, `Peran RBAC`, `Tipe Pengguna`) sebagai *read-only*.
