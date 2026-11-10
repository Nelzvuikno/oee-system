# Main Task 06: Integrasi Edge OT & Backend - Akuisisi Telemetri PLC-ABC via Gateway GW-100 dan Rule Engine Deteksi Losses Otomatis

**Referensi Desain Kanvas:** [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) (`[DESIGN SYSTEM] 03`, indikator status *Topbar/Sidebar*, `[LINGKUP WEB] 06-11`, `[LINGKUP HMI] 03-06`)  
**Referensi Spesifikasi:** [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md), [PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/PRD-OEE-Mesin-Packing-Unit2-PTXYZ.md), & [URS OEE H7 Ajinomoto.docx.pdf](file:///home/npiping/Documents/Production/URS%20OEE%20H7%20Ajinomoto.docx.pdf) (Bagian 7-11 & Lampiran Formula OEE)

---

## Expected Result
*Edge IoT Gateway* generik (`GW-100`) membaca blok Holding Register `D000-D012` dari kontroler mesin pengemasan (`PLC-ABC`) setiap `1.000 ms`, memperkaya dan mempublikasikan paket telemetri melalui protokol MQTT ke Backend Server (`VM1`), serta menyangga seluruh data secara lokal tanpa kehilangan paket saat jaringan pabrik terputus. Di sisi server, *Rule Engine* memproses aliran telemetri secara *real-time* untuk mendeteksi keenam pilar *Six Big Losses* (`L-01..L-06`), memicu alarm suara `BUZ-01` dan *interlock pop-up* pada `Panel HMI-T7` saat terjadi *Auto-Downtime*, menerbitkan peringatan dini degradasi komponen akibat korosi garam (`SEN-T01` dan `SEN-V01`), serta menghitung nilai *Availability*, *Performance*, *Quality*, dan *OEE* secara presisi sesuai formula jurnal empiris PT. XYZ.

## Prasyarat
- Mesin produksi beserta alamat IP jaringan OT, referensi switch `SWH-8P`, dan pemetaan sub-mesin/sensor (`PLC-ABC`, `GW-100`, `SEN-S01`, `SEN-T01`, `SEN-V01`, `CNT-G01`, `CNT-R01`, `BUZ-01`) telah terdaftar aktif pada **Main Task 02**.
- Data Master SKU beserta parameter `Ideal Cycle Time` (contoh: `0.024 menit/pcs` setara `41.67 pcs/menit`) telah terdaftar aktif pada **Main Task 04**.
- Data `Master Downtime Reason` beserta pemetaan tag register `D001` dan `D009` telah terdaftar aktif pada **Main Task 05**.
- Layanan Broker MQTT, Backend Telemetry Consumer & Rule Engine (`VM1`), serta Database PostgreSQL (`VM2`) telah berjalan di jaringan LAN internal pabrik (`192.168.10.0/24`).

## User Journey
- Sensor lapangan (`SEN-S01` Rotary Encoder, `SEN-T01` Termokopel Sealer Jaw, `SEN-V01` Sensor Vibrasi Bearing, `CNT-G01` Good Counter, dan `CNT-R01` Reject Counter) mengirimkan sinyal kontinu ke `PLC-ABC` yang memperbarui nilai register `D000-D012` setiap siklus *scan* internal (`100 ms`).
- *Edge Gateway* `GW-100` melakukan *polling* pembacaan blok register `D000-D012` dari `PLC-ABC` melalui koneksi Ethernet / Modbus TCP setiap `1.000 ms` (`1 detik`).
- `GW-100` menghitung selisih pertambahan produksi (`delta_count`), menyertakan `timestamp` ISO 8601 zona waktu lokal pabrik (`+07:00`), `machine_id`, dan `shift` aktif, lalu mempublikasikan payload JSON ke Broker MQTT (`VM1`).
- Backend `VM1` mengonsumsi pesan MQTT, memvalidasi urutan *heartbeat* dan kenaikan counter, menyiarkan pembaruan status mesin secara *real-time* via WebSocket/SSE ke `Panel HMI-T7` dan Aplikasi Web, serta menyimpan log agregasi ke PostgreSQL (`VM2`).
- Ketika kecepatan aktual `D002` turun di bawah ambang kecepatan standar SKU saat mesin berstatus `RUN`, *Rule Engine* menandai kejadian **L-04 Reduced Speed Loss**, mencatat `SpeedLog`, memunculkan peringatan di `Panel HMI-T7` serta Aplikasi Web, dan mengeskalasi alert ke Supervisor apabila berlangsung lebih dari `15 menit`.
- Ketika suhu *sealer* `D005` atau vibrasi *bearing* `D006` melewati ambang batas aman lingkungan garam korosif, *Rule Engine* mencatat *Early Warning* dan mengirimkan notifikasi tindakan preventif ke tim `Maintenance`, `Operator`, serta `Supervisor`.
- Ketika mesin berhenti menghasilkan produk (`delta_count = 0` atau status `D000` berpindah ke `STOP`/`FAULT`), *Rule Engine* mengklasifikasikan secara otomatis apakah henti tersebut merupakan **L-03 Idle & Minor Stoppage** (`30 detik` s.d. `< 5 menit`) atau **Auto-Downtime Penuh** (`>= 5 menit` atau `D000 = 2/3`), menyalakan `BUZ-01`, dan mendorong antrean *Unreasoned Downtime* ke `Panel HMI-T7`.
- Apabila jaringan LAN antara `GW-100` dan `VM1` terputus, `GW-100` menyimpan seluruh paket telemetri ke penyimpanan lokal dan mengirimkannya kembali secara berurutan (FIFO) tanpa duplikasi saat koneksi pulih.

## Acceptance Criteria:

**A. Kontrak Pemetaan Blok Register `PLC-ABC` (`D000-D012`) & Penanganan Counter**
1. Driver akuisisi `GW-100` membaca blok 13 Holding Register berurutan `D000` s.d. `D012` dari `PLC-ABC` dengan definisi standar berikut (mendukung konfigurasi *offset* alamat register per mesin pada profil driver `GW-100` tanpa mengubah skema aplikasi):
   - **`D000` (`machine_status`)**: status utama operasi mesin (`0 = STANDBY / OFF`, `1 = RUN`, `2 = STOP [Planned / Setup / Manual Stop]`, `3 = FAULT / ALARM`).
   - **`D001` (`stop_reason_code`)**: kode pemicu henti/alarm dari logika tangga PLC (`0 = Normal`, `1..N` dipetakan secara dinamis ke `Tag PLC` pada `Master Downtime Reason` **Main Task 05**, contoh: `1 = Briefing/Warmup`, `2 = Setup/Setting Pisau`, `3 = Planned Sanitasi`, `4 = Suhu Heater Sealer Drop/Overheat`, `5 = Drive/Bearing Fault`, `7 = Vibrasi Bearing Kritis`).
   - **`D002` (`speed_ppm` - sumber `SEN-S01`)**: kecepatan aktual produksi dalam satuan `Main Unit` per menit (`pcs/menit`, resolusi `0.1 pcs/mnt`, disimpan di register PLC sebagai integer `x10` misal `384 = 38.4 pcs/mnt` atau float sesuai profil driver).
   - **`D003` (`good_count` - sumber `CNT-G01`)**: akumulasi counter produk baik (*Finish Good*) sejak awal shift/order aktif.
   - **`D004` (`reject_auto_count` - sumber `CNT-R01`)**: akumulasi counter produk cacat yang terdeteksi sensor otomatis / *checkweigher*.
   - **`D005` (`sealer_temp_c` - sumber `SEN-T01`)**: suhu aktual elemen *Vertical Heater Sealer* dalam `°C` (resolusi `0.1 °C`, setpoint referensi kemasan PE garam `165.0 °C`).
   - **`D006` (`bearing_vib_mms` - sumber `SEN-V01`)**: nilai vibrasi RMS *bearing* penggerak utama dalam `mm/s` (resolusi `0.1 mm/s`).
   - **`D007` (`defect_manual_count`)**: register sinkronisasi tambahan *Process Defect* (`L-05`) yang diinput operator melalui konsol `Panel HMI-T7` (**Main Task 08**).
   - **`D008` (`scrap_k3_count`)**: register sinkronisasi *Scrap / Startup Reject / Garam Jatuh K3* (`L-06`) yang diinput operator melalui konsol `Panel HMI-T7` (**Main Task 08**).
   - **`D009` (`minor_stop_flag`)**: indikator henti singkat dari `PLC-ABC` (`0 = Normal`, `1 = Minor Stop / Idle terdeteksi`).
   - **`D010` (`auto_downtime_flag`)**: indikator status interlock waktu henti mesin (`0 = Tidak Aktif`, `1 = Auto-Downtime Aktif`).
   - **`D011` (`buzzer_relay_state` - output `BUZ-01`)**: status aktuator alarm suara 24V di panel mesin (`0 = OFF / Muted`, `1 = ON`).
   - **`D012` (`heartbeat_seq`)**: counter detak hidup sekuensial (`0..65535`, bertambah terus setiap siklus PLC) untuk memastikan komunikasi `PLC-ABC <-> GW-100` tidak membeku (*frozen register*).
2. Aturan perhitungan selisih counter (`delta_count`) dan proteksi *rollover / reset*:
   - Pada kondisi normal (`D003[t] >= D003[t-1]`), `GW-100` menghitung `delta_good = D003[t] - D003[t-1]` dan `delta_reject_auto = D004[t] - D004[t-1]`.
   - Apabila terjadi *counter reset* ke `0` saat pergantian shift/order (`D003[t] < D003[t-1]` dan nilai dekat `0`) atau *integer rollover* batas maksimum register (`65535 -> 0` / `4294967295 -> 0`), sistem wajib menangani transisi tersebut tanpa pernah menghasilkan nilai `delta_count` negatif maupun lonjakan produksi palsu.

**B. Siklus Polling `GW-100`, Topik MQTT, Format Payload, dan Latensi Distribusi**
1. `GW-100` membaca blok register `D000-D012` setiap **`1.000 ms` (`1 detik`)** dan mempublikasikan pesan ke Broker MQTT pada `VM1` menggunakan tingkat layanan **`MQTT QoS 1` (*At Least Once*)** pada struktur topik berikut:
   - Topik telemetri reguler (`1 detik` sekali): `mes/unit2/{machine_id}/telemetry` (dengan alias kompatibilitas konfigurasi `factory/{area_code}/{machine_code}/telemetry`).
   - Topik kejadian downtime & alarm kritis (*event-driven*): `mes/unit2/{machine_id}/events`.
   - Topik kesehatan koneksi *gateway* & *Last Will and Testament* (`LWT`, interval `10 detik`): `mes/unit2/{machine_id}/health`.
   - Topik perintah balik (`VM1 -> GW-100`, untuk pembaruan parameter `Ideal Cycle Time` SKU aktif, konfirmasi pemadaman `BUZ-01` `D011=0`, dan sinkronisasi counter manual `D007`/`D008`): `mes/unit2/{machine_id}/command`.
2. Setiap payload JSON telemetri reguler wajib memuat atribut berikut:
   - `ts`: waktu akuisisi di `GW-100` dalam format ISO 8601 lengkap dengan milidetik dan offset zona waktu (`YYYY-MM-DDTHH:mm:ss.sss+07:00`).
   - `machine_id`: kode aset mesin dari **Main Task 02** (contoh: `MCN-U2-PK06` / `PKG-06-U2`).
   - `shift`: nomor shift produksi aktif (`1`, `2`, atau `3`).
   - `sku_code`: kode SKU yang sedang aktif berjalan pada mesin (atau `null` saat `STANDBY` belum ada order).
   - `machine_status` (representasi `D000`: `standby`, `running`, `stopped`, `fault`) dan `stop_reason_code` (`D001`).
   - `actual_count` (`D003`), `delta_count`, `reject_auto_count` (`D004`), `defect_manual_count` (`D007`), dan `scrap_k3_count` (`D008`).
   - `speed_ppm` (`D002`), `ideal_speed_ppm` (dari Master SKU aktif **Main Task 04**), dan `reduced_speed_flag` (`boolean`).
   - `sealer_temp_c` (`D005`) dan `bearing_vib_mms` (`D006`).
   - `minor_stop_flag` (`D009`), `downtime_flag` (`D010`), `buzzer_activated` (`D011`), `heartbeat_seq` (`D012`), serta `source: "PLC-ABC"`.
3. Target performa pengiriman *real-time* dari Backend `VM1` ke antarmuka pengguna via WebSocket / SSE:
   - Pembaruan status dan counter pada layar `Panel HMI-T7` tampil dalam waktu **`< 1 detik`** sejak perubahan register PLC.
   - Pembaruan indikator status mesin, kecepatan, dan KPI pada Aplikasi Web tampil dalam waktu **`< 3 detik`**.

**C. Rule Engine Deteksi Otomatis `L-04 Reduced Speed Loss` (Loss Terbesar 16.47%)**
1. Evaluasi *Reduced Speed* dijalankan secara kontinu saat mesin memiliki order SKU aktif, berstatus `D000 = 1 (RUN)`, dan masih menghasilkan produk (`delta_count > 0` dalam jendela evaluasi `30 detik`).
2. Sistem menerapkan deteksi 2 tingkat terhadap `ideal_speed_ppm` SKU aktif (contoh `41.67 pcs/mnt` dari `Ideal Cycle Time = 0.024 menit/pcs`):
   - **Tingkat 1 - Peringatan Penurunan Kecepatan (*Warning / Slow Speed*)**:
     - Pemicu: `speed_ppm` rata-rata jendela `30 detik` berada di bawah ambang peringatan SKU (**secara *default* `< 90% x ideal_speed_ppm`**, atau nilai kustom SKU pada **Main Task 04** seperti `< 38.0 pcs/mnt`).
     - Aksi sistem: menetapkan `reduced_speed_flag = true`, merekam entri `SpeedLog` (`timestamp`, `machine_id`, `actual_speed_ppm`, `ideal_speed_ppm`, `speed_gap_ppm`), menampilkan badge kuning `Reduced Speed Detected` pada Aplikasi Web, dan menampilkan *banner* peringatan `Kecepatan mesin di bawah standar!` pada `Panel HMI-T7`.
   - **Tingkat 2 - Penurunan Kecepatan Berat & Eskalasi Supervisor (*Severe Reduced Speed*)**:
     - Pemicu: `speed_ppm < (0.80 x ideal_speed_ppm)` (contoh `< 33.34 pcs/mnt`) ATAU kondisi `reduced_speed_flag = true` bertahan terus-menerus selama **`> 15 menit`**.
     - Aksi sistem: menaikkan tingkat keparahan menjadi **Alert Merah (Eskalasi SPV & Shift Leader)** ke pusat notifikasi Aplikasi Web (**Main Task 17**) dengan rekomendasi pemeriksaan *kalibrasi sealer jaw & pelumasan bearing*.
3. Pemulihan otomatis (*Auto-Recovery*): apabila `speed_ppm` kembali naik mencapai atau melampaui ambang batas peringatan selama minimal `30 detik` berturut-turut, sistem mengubah `reduced_speed_flag = false`, menutup episode penurunan kecepatan pada `SpeedLog`, dan mencatat pemulihan kecepatan ke *Activity Log*.

**D. Rule Engine Deteksi `L-03 Idle & Minor Stoppages` vs `Auto-Downtime` (`L-01 / L-02`) & Interlock `BUZ-01`**
1. **Deteksi `L-03 Idle & Minor Stoppages (Small Stop)`**:
   - Pemicu: mesin sedang dalam sesi order produksi aktif dengan `D000 = 1 (RUN)`, namun `delta_count = 0` (`D002 = 0 pcs/mnt`) berlangsung selama **`>= 30 detik` dan `< 5 menit` (`300 detik`)**, atau flag `D009 = 1`.
   - Aksi sistem:
     - Mencatat kejadian otomatis sebagai `MinorStoppage` (`kategori L-03`) lengkap dengan `start_at`, `end_at`, dan durasi detiknya tanpa menyalakan alarm suara `BUZ-01` pada fase henti sangat singkat (`30 - 120 detik`) agar tidak mengganggu konsentrasi operator.
     - Apabila henti singkat tersebut melewati **`120 detik` (`2 menit`)** dan masih `< 5 menit`, sistem memunculkan kartu/dialog klasifikasi *Small Stop* pada `Panel HMI-T7` (**Main Task 09**, `URS Gambar 81`) agar operator dapat menandai penyebab berulang (misal `Garam Menggumpal di Hopper` atau `Film Kemasan Tersangkut`).
2. **Deteksi `Auto-Downtime` Penuh & Aktivasi Alarm `BUZ-01`**:
   - Pemicu terjadi apabila salah satu kondisi berikut terpenuhi saat sesi produksi aktif:
     - Status register `D000` berubah menjadi `2 (STOP)` atau `3 (FAULT)`, ATAU
     - Status register `D000` masih `1 (RUN)` tetapi `delta_count = 0` berlangsung terus-menerus selama **`>= 5 menit` (`300 detik`, trigger `NO_COUNT_5MIN`)**.
   - Aturan eskalasi durasi tanpa hitung ganda: apabila kejadian berawal dari *Minor Stoppage* (`>= 30 detik`) lalu berlanjut melampaui batas `5 menit`, rekaman `MinorStoppage` tersebut **dikonversi (*promoted*) menjadi satu rekaman `DowntimeEvent` penuh** dengan `start_at` tetap dihitung sejak detik pertama mesin berhenti berproduksi sehingga tidak ada detik henti yang hilang maupun dihitung dua kali.
   - Aksi sistem saat *Auto-Downtime* terpicu:
     - Mengaktifkan `downtime_flag = true` (`D010 = 1`) dan menyalakan output alarm suara **`BUZ-01` (`D011 = 1`)** (kecuali untuk jadwal istirahat *Planned Rest* murni yang telah dijadwalkan tidak membunyikan sirine gangguan).
     - Mempublikasikan payload `DOWNTIME_START` ke topik `events`, membuat rekaman `DowntimeEvent` dengan `source = "Auto"` dan status klasifikasi `Unreasoned` (apabila `D001 > 0` cocok dengan `Tag PLC` pada **Main Task 05**, sistem mengisi *pre-suggested reason* dari `D001` namun tetap mewajibkan konfirmasi operator pada `Panel HMI-T7`).
     - Mengirimkan sinyal interupsi instan ke `Panel HMI-T7` untuk memunculkan *Full-Screen Interlock Pop-up* (**Main Task 09**) dan mengirim notifikasi *Auto-Downtime* ke Aplikasi Web (**Main Task 12 & 17**).
   - Saat mesin kembali berjalan normal (`D000 = 1` dan `delta_count > 0`), sistem otomatis menutup `end_at` dan menetapkan `duration_min` aktual berdasarkan selisih waktu PLC; apabila operator belum sempat memilih alasan saat mesin kembali jalan, rekaman tetap tersimpan di daftar **Antrean Unreasoned Downtime** hingga dilengkapi oleh Operator (**Main Task 09**) atau dikoreksi Supervisor (**Main Task 12**).

**E. Rule Engine Peringatan Dini Degradasi Komponen Korosif (*Early Warning* `SEN-T01` & `SEN-V01`)**
1. Sistem mengevaluasi pembacaan sensor kondisi fisik mesin secara otomatis dengan aturan ambang berikut:
   - **Sensor Suhu *Vertical Heater Sealer* (`SEN-T01` -> `D005`, Setpoint normal `165.0 °C`)**:
     - *Peringatan Suhu Drop (`< 155.0 °C` saat `D000 = 1 [RUN]`)**: mencatat peringatan risiko *seal sachet bocor / tidak merekat sempurna*, menampilkan indikator peringatan suhu rendah di `Panel HMI-T7` & Aplikasi Web, serta mengaitkan kode `D001=4` jika diikuti henti mesin.
     - *Alarm Suhu Kritis Overheat (`> 185.0 °C`)*: mengaktifkan `BUZ-01 = ON`, mengirimkan alert `CRITICAL` (`Suhu Sealer Jaw Melebihi Batas Aman 185 °C`) ke `Panel HMI-T7` dan Aplikasi Web (`Operator`, `Maintenance`, `Supervisor`), serta menandai korelasi otomatis pada `DowntimeEvent` apabila mesin berhenti dalam `5 menit` berikutnya.
   - **Sensor Vibrasi *Bearing Utama* (`SEN-V01` -> `D006`)**:
     - *Peringatan Dini Aus Bearing (`> 4.5 mm/s` s.d. `7.1 mm/s`)*: mencatat log `EarlyWarning` dan mengirimkan notifikasi preventif ke personel `Maintenance` & `Supervisor` (`Vibrasi bearing tinggi [> 4.5 mm/s] - periksa pelumasan & korosi garam`).
     - *Alarm Vibrasi Kritis (`> 7.1 mm/s` / `D001=7`)*: mengirimkan alert `CRITICAL` risiko patah/macet mekanis ke `Panel HMI-T7`, `Maintenance`, dan `Supervisor`.
2. Untuk mencegah banjir notifikasi berulang (*alert storm*), setiap aturan *Early Warning* menerapkan histeresis pemulihan dan masa jeda (*cooldown*, misal `15 menit` untuk tingkat alarm yang sama pada mesin yang sama kecuali nilai melonjak ke tingkat `CRITICAL`).

**F. Mesin Kalkulasi *OEE & Six Big Losses* serta Validasi *Golden Fixture* Jurnal PT. XYZ**
1. Sistem mengelola pembagian waktu shift otomatis (**3 shift harian `@ 8 jam` = `480 menit/shift` atau `1.440 menit/hari`**) dan menghitung komponen dasar waktu operasi:
   - `Loading Time = Total Waktu Kalender Shift/Periode - Planned Downtime (Schedule Loss)`.
   - `Operation Time = Loading Time - Unplanned Downtime (akumulasi waktu henti diluar Planned Schedule)`.
   - `Processed Amount = Total Produksi Aktual` (mengikuti konvensi perhitungan jurnal PT. XYZ dari total output terproses terhadap `Defect Amount` = akumulasi `D004 + D007`, serta pencatatan terpisah `Scrap Amount` = `D008`).
2. Mesin kalkulasi Backend wajib menerapkan rumus *OEE* dan *Six Big Losses* persis sesuai referensi jurnal (Stamatis, 2017 & Kennedy, 2017):
   - `Availability (%) = (Loading Time - Unplanned Downtime) / Loading Time x 100`
   - `Performance (%) = (Total Produksi x Ideal Cycle Time) / Operation Time x 100`
   - `Quality (%) = (Processed Amount - Defect Amount) / Processed Amount x 100`
   - `OEE (%) = (Availability / 100) x (Performance / 100) x (Quality / 100) x 100`
   - `L-01 Equipment Failure (%) = Equipment Failure Time / Loading Time x 100`
   - `L-02 Setup & Adjustment (%) = Setup & Adjustment Time / Loading Time x 100`
   - `L-03 Idle & Minor Stop (%) = Total Idle & Minor Stop Time / Loading Time x 100`
   - `L-04 Reduced Speed (%) = max(0, Operation Time - (Ideal Cycle Time x Total Produksi)) / Loading Time x 100`
   - `L-05 Process Defect (%) = (Total Defect x Ideal Cycle Time) / Loading Time x 100`
   - `L-06 Scrap (%) = (Total Scrap x Ideal Cycle Time) / Loading Time x 100`
3. **Pengujian Otomatis Wajib (*Golden Unit Test Fixture* Data Jurnal 26/05/2023)**:
   - Paket *unit test* Backend wajib menyertakan *fixture* data aktual Tabel 13 & Tabel 14 jurnal PT. XYZ tanggal **26 Mei 2023** (`Durasi Harian = 1.440 mnt`, `Planned Rest = 180 mnt`, `Briefing & Setup = 45 mnt`, `Loading Time = 1.215 mnt`, `Equipment Failure = 76 mnt`, `Sanitasi/Unplanned Tambahan = 35 mnt`, `Operation Time = 874 mnt`, `Idle & Minor Stop = 230 mnt`, `Total Produksi = 31.468 pcs`, `Ideal Cycle Time = 0.024 mnt/pcs`, `Process Defect = 398 pcs`, `Scrap = 48 pcs`).
   - Hasil eksekusi mesin kalkulasi pada *fixture* tersebut wajib menghasilkan nilai pembulatan 2 angka desimal yang identik: **`Availability = 90.86%`**, **`Performance = 86.41%`**, **`Quality = 98.74%`**, dan **`OEE = 77.52%`** (beserta nilai losses `L-01 = 6.25%`, `L-02 = 3.70%`, `L-03 = 18.93%`, `L-04 = 9.77%`, `L-05 = 0.79%`, `L-06 = 0.09%`).
4. Kinerja agregasi kueri: perhitungan penuh *OEE* dan *Six Big Losses* untuk data produksi **1 bulan penuh** pada satu atau seluruh mesin Unit 2 wajib selesai dalam waktu **`< 5 detik`**.

**G. Ketahanan *Offline Buffer* `GW-100`, Deteksi *Telemetry Gap*, dan Pemrosesan *Idempotent***
1. **Putus Koneksi `GW-100 -> Server VM1` (*Edge Store-and-Forward*)**:
   - Apabila Broker MQTT pada `VM1` tidak dapat dijangkau, `GW-100` wajib mengalihkan seluruh paket telemetri dan event ke penyimpanan lokal non-volatil (contoh: *ring-buffer* SQLite lokal di `GW-100`) dengan kapasitas penyimpanan minimal **`72 jam`** operasi kontinu per mesin.
   - Selama koneksi terputus, aplikasi menampilkan penanda `data_gap_detected` / `GW-100 Buffering` pada garis waktu dan **dilarang menganggap ketiadaan paket jaringan sebagai waktu henti mesin (*downtime*)**.
   - Begitu koneksi ke `VM1` pulih, `GW-100` mempublikasikan ulang seluruh antrean secara berurutan (**FIFO**) dengan mempertahankan `ts` (*timestamp* asli kejadian) dan atribut `replayed = true`.
   - Consumer Backend wajib bersifat **idempotent** berdasarkan kunci unik `(machine_id, ts)` (dan `event_uuid` pada topik `events`) sehingga pesan yang terkirim ulang akibat `MQTT QoS 1` tidak pernah menggandakan jumlah produksi maupun durasi downtime, lalu memperbarui kalkulasi OEE periode terkait secara otomatis setelah sinkronisasi selesai.
2. **Putus Koneksi `PLC-ABC -> GW-100` (*Field Communication Timeout*)**:
   - Apabila `GW-100` tidak menerima respons pembacaan register dari `PLC-ABC` atau nilai `heartbeat_seq` (`D012`) tidak berubah selama **`> 30 detik`**, `GW-100` segera mempublikasikan event `TELEMETRY_GAP` ke `VM1`.
   - Backend mengubah indikator koneksi mesin di *Topbar/Sidebar* Aplikasi Web serta `Panel HMI-T7` menjadi `PLC OFFLINE / TELEMETRY GAP`, mencatat selang waktu tersebut sebagai `unknown_status` (tidak dimasukkan sebagai *uptime* maupun *downtime* mesin), dan mengirimkan notifikasi prioritas tinggi ke `Maintenance` serta `SuperAdmin`: `Koneksi PLC-ABC terputus pada <Nama Mesin>`.

## Catatan
- **Penyelarasan Peta 13 Register `D000-D012` (`productioncore.pen` vs Tabel Ilustrasi 7 Register di Draf `HW-SW-Integration-Spec`)**: Pada draf awal [HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md](file:///home/npiping/.gemini/antigravity/brain/62e09a51-39fb-4b9e-92ae-5b48bcd1ef81/HW-SW-Integration-Spec-OEE-MesinPacking-PTXYZ.md) Bagian 5.1, tabel ilustrasi hanya mencantumkan 7 register bernomor genap (`D000, D002, D004, D006, D008, D010, D012`), sedangkan pada seluruh artboard kanvas [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) dan **Main Task 01-05** peta tersebut telah dilengkapi menjadi 13 alamat berurutan `D000-D012` (memisahkan `D000` status mesin, `D001` kode alasan stop PLC, `D003` *Good Counter* `CNT-G01`, `D004` *Auto Reject Counter* `CNT-R01`, `D005` suhu sealer `SEN-T01`, `D006` vibrasi bearing `SEN-V01`, `D007` manual defect HMI, `D008` scrap K3 HMI, `D009` flag minor stop, `D010` flag auto-downtime, `D011` relay `BUZ-01`, dan `D012` heartbeat). AC Bagian A menetapkan peta 13 register `D000-D012` ini sebagai kontrak standar aplikasi.
- **Penyelarasan Ambang *Reduced Speed* 2 Tingkat (`< 90%` Warning vs `< 80%` Severe)**: Kanvas desain `[LINGKUP WEB] 09` & `18` menampilkan ambang deteksi awal `< 38.0 pcs/mnt` (`~90%` dari `41.67 pcs/mnt`), sedangkan dokumen integrasi Bagian 6.1 menuliskan `< 80%` disertai eskalasi `> 15 menit`. AC Bagian C menyatukan keduanya menjadi peringatan kuning tingkat awal (`< 90%` / ambang SKU) dan penurunan berat/eskalasi merah ke SPV (`< 80%` atau bertahan `> 15 menit`), sementara perhitungan menit kerugian `L-04` pada laporan OEE tetap murni menggunakan rumus waktu hilang jurnal (`Operation Time - Ideal CT x Total Produksi`).
- **Standarisasi Retensi Buffer Lokal `GW-100 >= 72 Jam`**: Dokumen integrasi awal Bagian 10.B menulis buffer `24 jam`, sedangkan matriks arsitektur `[DESIGN SYSTEM] 03` di [productioncore.pen](file:///home/npiping/Documents/Production/productioncore.pen) menetapkan `>= 72 jam`; AC Bagian G.1 menetapkan batas minimal **`72 jam`** agar data tetap aman apabila terjadi gangguan server lintas akhir pekan.
