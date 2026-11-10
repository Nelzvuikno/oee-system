# Main Task 03: Aplikasi Web - Konfigurasi Master User Management dan Otorisasi Peran

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[LINGKUP WEB] 17`, `[DESIGN SYSTEM] 02`, `[DESIGN SYSTEM] 03`)  
**Referensi Spesifikasi:** [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (`19.2.13` Gambar 37-41 & Bagian 16 Tabel 17) & [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md)

---

## Expected Result
`SuperAdmin (OT/IT)` dapat mendaftarkan, melihat rincian, mengubah atribut akun dan otorisasi peran (RBAC), mengatur ulang kata sandi Aplikasi Web maupun PIN numerik 6 digit `Panel HMI-T7`, serta menonaktifkan akun personel pabrik (`Operator`, `Teknisi Maintenance`, `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, dan `SuperAdmin`) secara terpusat melalui modul `Configuration -> User Management` di Aplikasi Web. Pengelolaan akun terpusat ini menjamin pembatasan hak akses antara konsol lapangan `Panel HMI-T7` dan konsol manajemen Aplikasi Web berjalan konsisten sekaligus menjaga keutuhan penelusuran identitas `user_id` pada seluruh histori *Audit Trail* produksi.

## Prasyarat
- Pengguna telah berhasil login ke Aplikasi Web ProductionCore menggunakan akun dengan peran **`SuperAdmin (OT/IT)`** (mekanisme autentikasi dan pembatasan akses RBAC mengikuti **Main Task 01**).
- Data hierarki *Factory*, *Area*, *Line*, dan *Machine* telah terdaftar pada modul Master Aset (**Main Task 02**) untuk kebutuhan pengikatan area/mesin kerja personel produksi.
- Layanan Backend API (VM1) dan Database PostgreSQL (VM2) berada dalam status aktif.

## User Journey
- `SuperAdmin` membuka grup menu `Configuration` pada *Sidebar* kiri Aplikasi Web lalu memilih menu `User Management` (`[LINGKUP WEB] 17`).
- `SuperAdmin` melihat tabel daftar seluruh akun personel yang terdaftar, mengetikkan kata kunci pada kolom `Search...` untuk memfilter akun, atau berpindah halaman daftar melalui kontrol paginasi di bagian bawah tabel.
- Untuk mengubah peran RBAC pengguna secara cepat dari tabel, `SuperAdmin` mengklik *badge* pada kolom `Peran RBAC` (`Role`) di baris akun terkait, memilih peran baru dari *dropdown inline* (`Gambar 38`), dan menyimpan perubahan peran tersebut.
- Untuk mendaftarkan personel baru, `SuperAdmin` menekan tombol `+ Tambah Akun` (`+ Add user`), mengisi formulir `Tambah Pengguna` (`Gambar 39`) yang mencakup identitas personel, departemen, jabatan, tipe pengguna, peran RBAC, serta penugasan area/mesin, lalu menekan `Simpan Akun Pengguna`.
- Sistem membuat akun baru dan menampilkan kredensial sementara sekali pakai (Kata Sandi Sementara untuk pengguna Web dan/atau `TEMP-PIN` 6 digit untuk pengguna `Panel HMI-T7`) guna diserahkan atau dikirimkan ke personel terkait.
- Untuk memeriksa informasi lengkap pengguna, `SuperAdmin` mengklik baris pengguna atau menu aksi `⋮` lalu memilih `Lihat Detail` sehingga panel geser kanan (*drawer*) `Detail User` terbuka (`Gambar 40`).
- Dari panel `Detail User`, `SuperAdmin` menekan tombol `Edit` untuk memperbarui atribut akun pada formulir `Edit User` (`Gambar 41` latar) lalu menekan `Simpan`, atau menekan tombol `Reset password` untuk membuka modal konfirmasi `Atur Ulang Kata Sandi / PIN Operator` (`Gambar 41`).
- Pada modal `Atur Ulang Kata Sandi / PIN Operator`, `SuperAdmin` memeriksa identitas akun target lalu menekan `Terbitkan Kata Sandi Sementara` (`Yes, reset anyway`) untuk membatalkan kredensial lama, memutus sesi aktif akun tersebut, dan menerbitkan kredensial sementara baru yang wajib diganti pada login berikutnya.

## Acceptance Criteria:

**A. Otorisasi Akses Modul User Management & Relasi dengan Task Lain**
1. Menu `Configuration -> User Management` pada *Sidebar* Aplikasi Web hanya ditampilkan dan hanya dapat diakses oleh pengguna dengan peran **`SuperAdmin (OT/IT)`** (sesuai matriks RBAC pada **Main Task 01**).
2. Pengguna dengan peran `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, maupun akun `Operator` ditolak dengan status HTTP `403 Forbidden` apabila mencoba mengakses rute URL `/configuration/users` atau endpoint manajemen pengguna.
3. Seluruh akun, status aktif, peran RBAC, kata sandi Web, dan PIN HMI yang dikelola pada modul ini langsung mengendalikan:
   - Izin login, visibilitas menu *Sidebar*, serta pemrosesan tiket permintaan reset kata sandi akun non-email pada Aplikasi Web (**Main Task 01**).
   - Izin login *Numpad* PIN 6 digit, pemulihan lupa PIN, serta otorisasi supervisor/teknisi pada konsol layar sentuh `Panel HMI-T7` (**Main Task 07** dan **Main Task 11**).
4. Pilihan penugasan `Area Kerja / Mesin Utama` pada formulir pengguna mengambil daftar *Area*, *Line*, dan *Machine* berstatus aktif secara dinamis dari **Main Task 02**.

**B. Halaman Daftar `User Management` (`[LINGKUP WEB] 17` - URS 19.2.13 Gambar 37)**
1. Bagian *toolbar* atas halaman `User Management` menampilkan:
   - Kolom pencarian `Search...`: memfilter daftar pengguna secara *case-insensitive* berdasarkan `ID Personel / NIK`, `Username`, `Nama Lengkap` (`Full Name`), `Email`, `Departemen`, atau `Jabatan` (`Job Title`).
   - Kontrol filter cepat `Tipe` dan `Peran RBAC` (secara *default* menampilkan `Semua Tipe` dan `Semua Peran`) untuk menyaring personel berdasarkan kelompok kerja atau tingkat otorisasi.
   - Tombol aksi primer `+ Tambah Akun` (`+ Add user`) di sisi kanan atas.
2. Tabel `User Management` menampilkan kolom-kolom berikut secara berurutan (`Gambar 37` & `[LINGKUP WEB] 17`):
   - `#` / `ID Personel`: nomor urut baris beserta kode unik NIK / ID Personel (contoh: `OPR-U2-01`, `TEK-U2-01`, `SL-U2-01`, `SPV-U2-01`, `MGR-U2-01`, `ADM-OT-01`).
   - `Username`: username unik akun login pengguna (contoh: `opr.shift1.pack6`, `spv.packing.unit2`).
   - `Nama Lengkap` (`Full Name`): nama lengkap personel atau label jabatan fungsional.
   - `Email`: alamat email pengguna (menampilkan tanda `-` apabila akun operator lantai produksi tidak memiliki email korporat).
   - `Departemen` (`Department`): nama departemen pengguna (contoh: `Produksi Unit 2`, `Maintenance`, `Manajemen Pabrik`, `OT / IT Sistem`).
   - `Jabatan` (`Job Title`): nama jabatan personel.
   - `Tipe` (`Type`): klasifikasi fungsi pengguna (`Production`, `Technical`, `Management` / `Non-Production`, atau `System`).
   - `Peran RBAC` (`Role`): komponen *pill badge* interaktif dilengkapi ikon panah bawah `v` yang menampilkan peran aktif pengguna dengan pembeda teks dan warna semantik per peran.
   - Kolom Status & Menu Aksi `⋮` (tiga titik vertikal di sisi paling kanan setiap baris): menampilkan penanda apabila akun berstatus `Nonaktif` atau `Terkunci Sementara`, serta menyediakan menu aksi baris (`Lihat Detail`, `Edit Akun`, `Reset Kata Sandi / PIN`, dan `Nonaktifkan / Aktifkan Akun`).
3. Aturan paginasi dan tampilan tabel:
   - Secara *default*, tabel menampilkan **10 baris per halaman** dengan halaman `1` berada pada state aktif, diurutkan secara *default* berdasarkan kode/urutan pendaftaran akun.
   - Kontrol paginasi di kanan bawah tabel (`< 1 2 3 4 5 ... N >`) memungkinkan perpindahan halaman, dengan tombol `<` *disabled* saat berada di halaman `1` dan tombol `>` *disabled* saat berada di halaman terakhir.
   - Saat kata kunci `Search...` atau filter diubah, paginasi otomatis kembali ke halaman `1`.
   - Jika hasil pencarian atau filter tidak menemukan pengguna yang cocok, tabel menampilkan *Empty State* informatif beserta tombol `Reset Pencarian`.

**C. Pengubahan Peran Cepat (*Inline Change Role Dropdown*) (`[LINGKUP WEB] 17` - URS 19.2.13 Gambar 38)**
1. Saat `SuperAdmin` mengklik *pill badge* pada kolom `Peran RBAC` (`Role`) di salah satu baris tabel, sistem membuka *popover dropdown* tepat di bawah sel tersebut (`Gambar 38`) dengan tanda aktif/terpilih pada peran pengguna saat ini.
2. Pilihan peran yang tersedia di dalam *dropdown* `Change Role` beserta cakupan lingkup aksesnya adalah:
   - `Operator (HMI-T7 Only)`: khusus login konsol layar sentuh `Panel HMI-T7` menggunakan PIN 6 digit; tidak diizinkan login ke Aplikasi Web.
   - `Shift Leader`: memiliki akses Aplikasi Web sesuai matriks `Shift Leader` (**Main Task 01**) serta akses serah terima/otorisasi shift pada `Panel HMI-T7`.
   - `Supervisor (SPV)`: memiliki akses Aplikasi Web sesuai matriks `SPV` (**Main Task 01**) serta otorisasi supervisor pada `Panel HMI-T7`.
   - `Admin / Manager`: memiliki akses Aplikasi Web sesuai matriks `Admin / Manager` (**Main Task 01**, termasuk dashboard eksekutif *Business Impact*, *Release Report*, dan master operasional `SKU`, `Downtime Reason`, `Guideline SOP`).
   - `SuperAdmin (OT/IT)`: memiliki akses penuh ke seluruh modul Aplikasi Web termasuk `Factory & Area`, `Line & Machine`, dan `User Management`.
3. Validasi dan pengamanan saat `SuperAdmin` memilih peran baru pada *dropdown* `Change Role`:
   - Jika peran yang diklik sama dengan peran pengguna saat ini, *dropdown* tertutup tanpa melakukan pemanggilan API.
   - **Proteksi Anti-Lockout SuperAdmin**: sistem **menolak** pengubahan peran apabila akun yang diturunkan perannya adalah akun `SuperAdmin` yang sedang login sendiri (*self-demotion*) atau merupakan satu-satunya akun `SuperAdmin` aktif yang tersisa di dalam sistem, lalu menampilkan pesan peringatan bahwa sistem wajib memiliki minimal 1 `SuperAdmin` aktif.
   - Jika akun diubah dari `Operator (HMI-T7 Only)` menjadi salah satu peran berakses Aplikasi Web dan akun tersebut belum pernah memiliki kata sandi Web, sistem meminta konfirmasi penerbitan **Kata Sandi Sementara** Web (dan pengisian email jika wajib) sebelum menyimpan peran baru.
   - Jika akun diubah menjadi peran yang membutuhkan akses `Panel HMI-T7` (`Operator` / `Shift Leader`) namun belum memiliki PIN 6 digit, sistem otomatis menerbitkan **`TEMP-PIN` 6 digit** sekali pakai.
   - Setelah perubahan peran dikonfirmasi, sistem memperbarui peran di database, memaksa pembaruan hak akses pada sesi aktif pengguna terkait, menampilkan notifikasi berhasil, dan mencatat perubahan (`role_lama -> role_baru`) ke *Audit Log*.

**D. Formulir `Tambah Pengguna / Add User` (`[LINGKUP WEB] 17` - URS 19.2.13 Gambar 39)**
1. Saat `SuperAdmin` menekan tombol `+ Tambah Akun` (`+ Add user`), sistem menampilkan formulir **`Tambah Pengguna` (`Configuration > User > Add User`)** dalam tata letak 2 kolom (`Gambar 39`).
2. Formulir `Tambah Pengguna` memuat field dan aturan input berikut:
   - `NIK / ID Personel *` (wajib isi, kode identitas unik personel contoh `SL-U2-02`, hanya karakter alfanumerik dan tanda hubung, tidak boleh sama dengan akun lain).
   - `Username *` (wajib isi, *placeholder* `enter username...` / `Masukkan username...`, minimal 4 karakter tanpa spasi, wajib unik secara *case-insensitive* di seluruh tabel `User`).
   - `Nama Lengkap (Full Name) *` (wajib isi, *placeholder* `enter full name...` / `Masukkan nama lengkap...`, minimal 3 karakter).
   - `Email` (*placeholder* `enter email...` / `Masukkan email...`):
     - **Wajib isi (`*`)**, berformat email valid (termasuk domain jaringan internal seperti `@pt-xyz.local`), dan wajib unik apabila `Peran RBAC` yang dipilih adalah peran Aplikasi Web (`Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, atau `SuperAdmin`).
     - **Opsional** apabila `Peran RBAC` yang dipilih adalah `Operator (HMI-T7 Only)` tanpa fasilitas email korporat (konsisten dengan **Main Task 01** Bagian B.4); jika diisi, tetap wajib berformat valid dan unik.
   - `Departemen (Department) *` (wajib pilih dari *dropdown*, *placeholder* `select department...` / `Pilih departemen...`, contoh: `Produksi Garam Unit 2`, `Maintenance`, `Quality Assurance`, `Manajemen Pabrik`, `OT / IT Sistem`).
   - `Jabatan (Job Title) *` (wajib pilih/isi, *placeholder* `select job title...` / `Pilih jabatan...`, contoh: `Operator Mesin Packing`, `Teknisi TPM`, `Shift Leader`, `Production Supervisor`, `Operational Manager`, `OT/IT Administrator`).
   - `Tipe Pengguna (Type) *` (wajib pilih dari *dropdown*, *placeholder* `select user type...` / `Pilih tipe pengguna...`, pilihan: `Production`, `Technical` [Maintenance], `Non-Production` / `Management`, dan `System`; pilihan `Production` vs `Technical` menjadi penentu kewenangan antrian tiket *Kaizen Production* vs *Kaizen Technical* pada **Main Task 11** dan **Main Task 15**).
   - `Peran RBAC (Role) *` (wajib pilih dari *dropdown*, *placeholder* `select user role...` / `Pilih peran pengguna...`, pilihan mengikuti 5 peran standar pada Bagian C.2).
   - `Penugasan Area / Mesin Utama & Shift` (wajib pilih minimal *Area* / *Machine* aktif dari **Main Task 02** untuk peran operasional `Operator`, `Shift Leader`, dan `Supervisor`, misal `Unit 2 - Mesin Packing #6`, serta pilihan shift `Shift 1`, `Shift 2`, `Shift 3`, atau `Rotasi`; opsional/lintas pabrik bagi `Admin / Manager` dan `SuperAdmin`).
   - Tombol aksi sekunder `Batal` (`Cancel`) dan tombol aksi primer `Simpan Akun Pengguna` (`Save`).
3. Validasi penyimpanan dan penerbitan kredensial awal saat `Simpan Akun Pengguna` ditekan:
   - Jika terdapat field bertanda wajib (`*`) yang belum diisi atau belum dipilih, sistem menolak pengiriman form, menandai field dengan warna error (`$danger-solid`), dan menampilkan pesan validasi inline di bawah field tersebut.
   - Jika `NIK / ID Personel`, `Username`, atau `Email` sudah terdaftar pada akun lain (baik akun aktif maupun nonaktif), sistem menolak penyimpanan dan menampilkan pesan duplikasi spesifik pada field terkait.
   - Jika seluruh validasi lolos, sistem membuat akun baru dengan status `is_active = true`, menyimpan kredensial awal dalam bentuk *hash* `bcrypt`, mengaktifkan flag wajib ganti kredensial pada login pertama, dan menampilkan dialog ringkasan kredensial awal **hanya satu kali**:
     - Menampilkan **Kata Sandi Sementara** sekali pakai (minimal 8 karakter kombinasi huruf & angka) untuk peran berakses Aplikasi Web, sekaligus mengirimkan informasi kredensial ke email pengguna apabila server email aktif.
     - Menampilkan **`TEMP-PIN` numerik 6 digit** sekali pakai untuk akun yang memiliki akses konsol `Panel HMI-T7` (`Operator`, `Operator Teknisi`, `Shift Leader`).
   - Jika `SuperAdmin` menekan `Batal` (`Cancel`) ketika sebagian field sudah diisi, sistem menampilkan konfirmasi pembatalan agar mencegah kehilangan input secara tidak sengaja.

**E. Panel Geser `Detail User` & Formulir `Edit User` (`[LINGKUP WEB] 17` - URS 19.2.13 Gambar 40 & Latar Gambar 41)**
1. Saat `SuperAdmin` mengklik baris pengguna pada tabel atau memilih `Lihat Detail` pada menu `⋮`, sistem membuka panel geser kanan (*slide-over drawer*) **`Detail User` (`Gambar 40`)** di atas latar tabel yang diredupkan (*backdrop overlay*), dilengkapi judul `Detail User` dan tombol tutup `X` di kanan atas.
2. Panel `Detail User` menampilkan seluruh atribut akun dalam kondisi *read-only*:
   - `NIK / ID Personel`
   - `Username`
   - `Nama Lengkap (Full Name)`
   - `Email`
   - `Nama Departemen (Department Name)`
   - `Jabatan (Job Title)`
   - `Peran RBAC (Role)`
   - `Tipe Pengguna (User Type)`
   - `Area / Mesin Ditugaskan & Shift` serta `Status Akun` (`Aktif`, `Nonaktif`, atau `Terkunci Sementara` beserta informasi waktu login terakhir).
3. Di bagian bawah panel `Detail User`, tersedia 2 tombol aksi sesuai `Gambar 40`:
   - Tombol `Reset password` (berikon gembok): memicu modal konfirmasi `Atur Ulang Kata Sandi / PIN Operator` (`Gambar 41` pada Bagian F).
   - Tombol `Edit` (berikon pensil): membuka formulir **`Edit User` (`Configuration > User > Edit User`, latar `Gambar 41`)** dengan seluruh field telah terisi nilai akun saat ini.
4. Aturan pada formulir `Edit User`:
   - Field `NIK / ID Personel` dan `Username` ditampilkan sebagai *read-only* apabila akun sudah pernah memiliki catatan aktivitas produksi atau *Audit Log* guna menjaga konsistensi referensi historis; field `Nama Lengkap *`, `Email`, `Departemen *`, `Jabatan *`, `Tipe Pengguna *`, `Peran RBAC *`, dan `Penugasan Area / Mesin` dapat diperbarui.
   - Berlaku seluruh aturan validasi keunikan `Email`, kewajiban email berdasarkan peran, serta proteksi *Anti-Lockout SuperAdmin* yang sama seperti Bagian C.3 dan Bagian D.2.
   - Tombol `Batal` (`Discard`) menutup mode edit tanpa menyimpan perubahan; tombol `Simpan` (`Save`) memperbarui data akun, mencatat perubahan nilai sebelum dan sesudah ke *Audit Log*, serta menampilkan notifikasi berhasil.

**F. Modal Konfirmasi `Atur Ulang Kata Sandi / PIN Operator` (`[LINGKUP WEB] 17` - URS 19.2.13 Gambar 41)**
1. Saat `SuperAdmin` menekan tombol `Reset password` dari panel `Detail User`, halaman `Edit User`, menu baris `⋮`, atau tautan tindak lanjut tiket lupa kata sandi/PIN dari lonceng notifikasi, sistem memunculkan modal konfirmasi **`Atur Ulang Kata Sandi / PIN Operator` (`Reset password` - `Gambar 41`)**.
2. Modal konfirmasi menampilkan elemen-elemen berikut:
   - Judul modal: `Atur Ulang Kata Sandi / PIN Operator` (`Reset password`).
   - Deskripsi konfirmasi eksplisit yang memuat identitas akun target: `Apakah Anda yakin ingin mengatur ulang kata sandi / PIN untuk <ID Personel> (<username>)? Tindakan ini tidak dapat dibatalkan. Kata sandi atau PIN sementara hanya berlaku satu kali dan wajib diganti pada login berikutnya.`
   - Kotak indikator status penerbitan: `TEMP-PIN / TEMP-PASS: [ GENERATED-ON-SUBMIT ]`.
   - Tombol sekunder `Batal` (`Cancel`) dan tombol aksi destruktif primer (`$danger-solid`) `Terbitkan Kata Sandi Sementara` (`Yes, reset anyway`).
3. Perilaku sistem saat `SuperAdmin` menekan `Terbitkan Kata Sandi Sementara` (`Yes, reset anyway`):
   - Sistem membangkitkan kredensial sementara acak baru (Kata Sandi Sementara untuk akses Aplikasi Web dan/atau `TEMP-PIN` numerik 6 digit untuk akses `Panel HMI-T7`), menyimpannya dalam bentuk *hash* `bcrypt`, dan menetapkan flag wajib ganti kredensial pada login berikutnya (`must_change_credential = true`).
   - Apabila akun target sedang berada dalam status *lockout* sementara akibat 5 kali gagal login (**Main Task 01** atau **Main Task 07**), status penguncian otomatis dihapus sehingga pengguna dapat langsung login menggunakan kredensial sementara baru.
   - Seluruh sesi JWT Aplikasi Web aktif milik akun target langsung diinvalidasi (dan sesi `Panel HMI-T7` diakhiri secara aman apabila akun tidak sedang menahan dialog interlock downtime mesin).
   - Sistem menampilkan Kata Sandi Sementara / `TEMP-PIN` baru **hanya satu kali** di layar konfirmasi beserta tombol `Salin` (serta mengirimkannya ke email korporat pengguna jika terdaftar); setelah modal ditutup, teks polos kredensial sementara tidak pernah disimpan atau ditampilkan kembali.
   - Apabila reset dilakukan atas tiket permintaan *Forgot Password* (**Main Task 01**) atau *Lupa PIN HMI* (**Main Task 07**), tiket permintaan terkait otomatis berubah status menjadi selesai (`Resolved`).
   - Jika `SuperAdmin` menekan `Batal` (`Cancel`) atau tombol `Esc`, modal tertutup tanpa mengubah kata sandi/PIN eksisting pengguna.

**G. Penonaktifan Akun (*Soft Deactivate*), Integritas Audit Trail, dan Aksesibilitas Keyboard**
1. Sesuai spesifikasi `CRU` (*Create, Read, Update*) untuk entitas *User* pada Tabel 17 URS dan aturan NFR *Audit Trail* PRD, sistem **melarang penghapusan permanen (`hard delete`)** terhadap data akun di tabel `User`:
   - Pencabutan akses personel dilakukan melalui aksi **`Nonaktifkan Akun` (`is_active = false`)** dengan dialog konfirmasi.
   - Sistem menolak penonaktifan terhadap akun `SuperAdmin` yang sedang login sendiri maupun satu-satunya `SuperAdmin` aktif yang tersisa.
   - Akun berstatus `is_active = false` segera dicabut seluruh sesi aktifnya dan ditolak saat mencoba login di Aplikasi Web maupun `Panel HMI-T7`, namun seluruh nama dan `ID Personel` pada riwayat `ProductionLog`, `DowntimeEvent`, `ShiftReport`, `KaizenItem`, dan `Audit Log` tetap utuh dan terbaca.
   - Akun nonaktif dapat diaktifkan kembali (`is_active = true`) oleh `SuperAdmin` melalui aksi `Aktifkan Akun`.
2. Seluruh transaksi pada modul `User Management` (pembuatan akun, perubahan data profil/area pengguna, perubahan `Peran RBAC`, eksekusi *Reset Password / PIN*, penonaktifan/pengaktifan akun, dan pembukaan *lockout*) wajib tercatat otomatis pada *Audit Log* (**Main Task 17**) dengan mencantumkan `timestamp`, `actor_user_id` (`SuperAdmin`), `target_user_id`, jenis aksi, serta nilai sebelum dan sesudah perubahan (tanpa pernah mencatat nilai kata sandi atau PIN dalam bentuk teks polos).
3. Seluruh komponen interaktif pada tabel, *dropdown inline Change Role*, panel *drawer* `Detail User`, formulir `Add/Edit User`, dan modal `Reset Password` dapat dioperasikan menggunakan keyboard (`Tab` / `Shift+Tab`, `Arrow Up/Down` & `Enter` pada *dropdown*, serta `Esc` untuk menutup *popover*, *drawer*, atau modal) dengan indikator *focus ring* `2px` `#FF4081`.

## Catatan
- **Rekonsiliasi Daftar Peran (`Gambar 37-38` & Baris 3355 URS vs Matriks RBAC Main Task 01 & PRD)**: Pada `Gambar 37-38` dan teks URS baris 3355 tercantum 4 opsi role (`Operator`, `SPV`, `superadmin`, `admin`), sedangkan Tabel 15 URS dan PRD Bagian 3.2 memisahkan kewenangan `Shift Leader` dari `Operator` lini produksi serta membedakan personel `Maintenance` dari `Production`. Selaras dengan `[LINGKUP WEB] 17` di [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) dan **Main Task 01**, kolom `Peran RBAC` menyediakan 5 peran (`Operator (HMI-T7 Only)`, `Shift Leader`, `Supervisor (SPV)`, `Admin / Manager`, `SuperAdmin (OT/IT)`), sementara pembedaan fungsi Produksi vs Teknisi Maintenance dikelola melalui kolom `Tipe Pengguna` (`Production` vs `Technical`).
- **Ketiadaan Gambar Mockup Terpisah untuk `Kaizen Classification` pada URS (Teks URS Baris 3392-3400 vs Gambar 37)**: Teks URS Bagian 16 nomor 5 menyebut sub-fitur `Kaizen Classification` untuk pengaturan role/warna berdasarkan departemen, namun URS Bab 19.2 tidak memiliki gambar mockup untuk halaman tersebut (hanya terdapat ikon gerigi kecil di samping tombol `+ Add user` pada `Gambar 37-38`). Agar tidak menciptakan halaman tanpa acuan desain, klasifikasi antrian tiket *Kaizen Production* vs *Kaizen Technical* diikat langsung pada kombinasi field `Tipe Pengguna` (`Production` vs `Technical`) dan `Departemen`, sedangkan warna *badge* peran menggunakan token warna semantik tetap pada `[DESIGN SYSTEM] 01`.
- **Pembersihan Data Contoh Selebritas pada Mockup URS (`Gambar 40-41`)**: Mockup URS asli menggunakan nama selebritas fiktif (`Jennie Kim / jenniekim@mail.co`) pada `Gambar 40-41` dan nilai mentah `[JobTitle-Name]` / `Marketing` / `HR` pada `Gambar 37`. Pada kanvas `[LINGKUP WEB] 17` dan spesifikasi ini, contoh identitas diganti menggunakan kode fungsional industri berpenanda `[PLACEHOLDER]` jujur (`OPR-U2-01`, `SL-U2-01`, `SPV-U2-01`, dst.).
- **Dukungan Kredensial Ganda (Kata Sandi Web & PIN 6 Digit HMI-T7)**: Karena Aplikasi Web menggunakan kata sandi alfanumerik sedangkan `Panel HMI-T7` menggunakan autentikasi *Numpad* (`URS 19.3.1-19.3.2 Gambar 71-72`), alur `Tambah Pengguna` dan `Reset Password` pada AC Bagian D & F menangani penerbitan Kata Sandi Sementara maupun `TEMP-PIN` 6 digit sesuai lingkup akses peran yang dipilih.
