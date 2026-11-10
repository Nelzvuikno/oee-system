# Product Requirements Document
## Sistem Digitalisasi OEE — Mesin Packing Unit 2
### Berbasis Studi Kasus: Jurnal Teknika Vol. 1 No. 1 (2023)
**Referensi:** Muhammad Kholis Al Farichi & Hery Murnawan, Universitas 17 Agustus 1945 Surabaya  
**Studi Kasus:** PT. XYZ — Produsen Garam Beryodium, Mesin Packing No. 6, Unit Produksi 2  
**Disusun oleh:** Nusantara MES Team  
**Tanggal:** 30 Oktober 2025 | **Versi:** 1.0

---

## Pendahuluan

Dokumen ini mendefinisikan kebutuhan produk untuk membangun **sistem digitalisasi monitoring OEE** yang terinspirasi langsung dari temuan penelitian pada mesin packing di PT. XYZ.

Penelitian manual selama periode **Juli–November 2022** menemukan bahwa rata-rata OEE mesin packing hanya **68.01%** — jauh di bawah standar JIPM (Japan Institute of Plant Maintenance) sebesar **85%**. Seluruh pengukuran dilakukan secara manual dengan pencatatan form, tidak ada visibilitas real-time, dan tidak ada sistem terpusat untuk mengidentifikasi penyebab losses.

Sistem yang diusulkan hadir untuk **mendigitalisasi seluruh pipeline pengumpulan dan analisis data OEE**, sehingga masalah seperti yang ditemukan di PT. XYZ bisa terdeteksi lebih cepat dan ditindaklanjuti lebih sistematis.

---

## Konteks dari Jurnal

### Baseline OEE (Juli–November 2022)

| Bulan | Availability | Performance | Quality | OEE |
|-------|-------------|-------------|---------|-----|
| Juli | 85.79% | 77.16% | 97.98% | **64.86%** |
| Agustus | 83.47% | 83.71% | 98.14% | **68.58%** |
| September | 85.53% | 79.63% | 98.05% | **66.78%** |
| Oktober | 86.78% | 82.77% | 97.77% | **70.23%** |
| November | 87.67% | 80.85% | 98.17% | **69.59%** |
| **Rata-rata** | **85.85%** | **80.83%** | **98.02%** | **68.01%** |

### Distribusi Six Big Losses (Total Loading Time: 144.180 menit)

| Rank | Jenis Losses | Waktu (menit) | Persentase | Kumulatif |
|------|-------------|--------------|-----------|----------|
| 1 | **Reduced Speed Losses** | 23.776 | **16.47%** | 39.72% |
| 2 | Setup & Adjustment Losses | 14.366 | 9.97% | 63.72% |
| 3 | Idle & Minor Stoppages | 13.435 | 9.35% | 86.17% |
| 4 | Equipment Failure Losses | 6.010 | 4.18% | 96.21% |
| 5 | Process Defect Losses | 1.974 | 1.37% | 99.50% |
| 6 | Scrap Losses | 297 | 0.20% | 100.00% |

> **Insight Pareto:** Tiga losses teratas (Reduced Speed + Setup + Idle) menyumbang **35.79%** dari total loading time dan membentuk **86.17% kumulatif** dari seluruh losses — inilah yang harus diprioritaskan sistem.

### Hasil Setelah Implementasi TPM (Mei 2023)

| Tanggal | Availability | Performance | Quality | OEE |
|---------|-------------|-------------|---------|-----|
| 26/05/2023 | 90.86% | 86.41% | 98.74% | 77.52% |
| 27/05/2023 | 88.56% | 88.91% | 99.10% | 78.03% |
| **Rata-rata** | **89.71%** | **87.66%** | **98.92%** | **77.78%** |

Peningkatan OEE dari **68.01% → 77.78%** (+9.77 poin) setelah autonomous maintenance & preventive maintenance. Target selanjutnya: mencapai standar JIPM 85%.

---

## Asumsi Kunci

1. Sistem dibangun untuk **mesin packing di lingkungan industri pengolahan garam** — spesifik kondisi korosif dan mesin berusia tua.
2. **Ideal Cycle Time** mesin packing = **0.024 menit/pcs** (sesuai data jurnal).
3. Operasi harian: **3 shift @ 8 jam** (loading time harian: 1.440 menit dikurangi planned downtime).
4. Hardware menggunakan **asumsi penamaan generik** (misal: **PLC-ABC**, IoT Gateway GW-100, dll.) agar spesifikasi tetap berfokus pada fungsionalitas dan arsitektur tanpa terikat vendor tertentu. Mapping perangkat aktual diatur terpisah.
5. Fokus losses yang diprioritaskan sistem: **Reduced Speed + Setup & Adjustment + Idle & Minor Stoppages** (sesuai Pareto 80/20 dari jurnal).
6. Rekomendasi TPM dari jurnal (Autonomous Maintenance, Quality Maintenance, Training) menjadi fitur **Kaizen & Maintenance Scheduling** di dalam sistem.

---

## Bagian 1: Pemahaman Kebutuhan

### 1.1 Pain Point per Stakeholder (Dipetakan dari Temuan Jurnal)

| Stakeholder | Kondisi Saat Ini (Berdasarkan Jurnal) | Nilai Tambah Sistem |
|-------------|--------------------------------------|---------------------|
| **Operator** | Mesin berhenti karena korosi, operator tidak tahu threshold suhu/kecepatan yang optimal. Pencatatan manual di form, sering tidak konsisten. | Input digital via HMI touch screen. Notifikasi otomatis saat mesin berjalan di bawah ideal speed (deteksi reduced speed). |
| **Maintenance** | Perawatan bersifat reaktif — baru bertindak setelah mesin rusak. Tidak ada data MTTR/MTBF. Equipment failure losses 4.18% dari loading time. | Jadwal autonomous maintenance & preventive maintenance digital. Alert dini sebelum breakdown terjadi. Data MTTR/MTBF otomatis dari log downtime. |
| **Shift Leader** | Rekap OEE manual di akhir shift. Dengan loading time 28.080 menit/bulan (Juli), error hitung sangat mungkin. | Laporan OEE per shift ter-generate otomatis. Tinggal verifikasi & tanda tangan digital. |
| **Supervisor / QA** | Tidak ada visibilitas real-time. Tahu losses hanya setelah periode selesai — sudah terlambat. Defect rate ~2% (15.000–18.000 pcs/bulan) tidak terpantau real-time. | Dashboard real-time A, P, Q, dan OEE per jam. Alert jika defect/reject melewati threshold. |
| **Manager / Pimpinan Produksi** | Analisis Six Big Losses dilakukan manual setiap akhir periode. Tidak ada sistem untuk melacak apakah rekomendasi Pareto sudah dieksekusi. | Otomatis kalkulasi dan tampilkan Pareto Six Big Losses. Tracking progress improvement dari baseline 68.01% menuju target 85%. |

---

### 1.2 Formula OEE yang Diimplementasikan

Sesuai jurnal (Stamatis, 2017 & Kennedy, 2017):

```
Availability  = (Loading Time − Downtime) / Loading Time × 100%

Performance   = (Total Produksi × Ideal Cycle Time) / Operation Time × 100%
              → Ideal Cycle Time = 0.024 menit/pcs

Quality       = (Processed Amount − Defect Amount) / Processed Amount × 100%

OEE           = Availability × Performance × Quality
```

**Six Big Losses (formula per jurnal):**

```
L-01 Equipment Failure  = Downtime / Loading Time × 100%
L-02 Setup & Adjustment = Setup Time / Loading Time × 100%
L-03 Idle & Minor Stop  = Idle Time / Loading Time × 100%
L-04 Reduced Speed      = (Operation Time − (Ideal CT × Total Prod)) / Loading Time × 100%
L-05 Process Defect     = (Total Defect × Ideal CT) / Loading Time × 100%
L-06 Scrap              = (Total Scrap × Ideal CT) / Loading Time × 100%
```

---

## Bagian 2: Identifikasi Fitur

### 2.1 Aplikasi Web (Monitoring & Analisis)

| No | Fitur | Prioritas | Dasar dari Jurnal |
|----|-------|-----------|------------------|
| F-01 | Dashboard OEE Real-Time | P0 | Kebutuhan visibilitas yang tidak ada saat ini |
| F-02 | OEE Trend Bulanan | P0 | Rekapitulasi Juli–November 2022 dilakukan manual |
| F-03 | Six Big Losses Pareto View | P0 | Inti analisis jurnal: 3 losses dominan = 86.17% kumulatif |
| F-04 | Reduced Speed Monitoring | P0 | Loss terbesar: 16.47% / 23.776 menit |
| F-05 | Setup & Adjustment Tracker | P1 | Loss kedua: 9.97% / 14.366 menit |
| F-06 | Idle & Minor Stoppage Log | P1 | Loss ketiga: 9.35% / 13.435 menit |
| F-07 | Equipment Failure History | P1 | MTTR/MTBF tidak tersedia saat ini |
| F-08 | Quality Loss Analysis | P1 | Defect 15.000–18.500 pcs/bulan tidak terpantau |
| F-09 | Laporan Shift (Auto-Generate) | P0 | Rekap manual saat ini error-prone |
| F-10 | TPM Kaizen Board | P1 | Rekomendasi TPM jurnal: 3 pilar (AM, QM, Training) |
| F-11 | Autonomous Maintenance Schedule | P1 | Rekomendasi jurnal: inspeksi tiap 2 minggu per mesin |
| F-12 | Preventive Maintenance Schedule | P1 | Rekomendasi jurnal: PM terstruktur |
| F-13 | Troubleshooting Guideline | P2 | Rekomendasi jurnal: panduan solusi per masalah |
| F-14 | Skill Matrix & Training Tracker | P2 | Pilar Training & Education dalam TPM |
| F-15 | Perbandingan Before vs After TPM | P2 | Baseline 68.01% vs post-TPM 77.78% vs target 85% |
| F-16 | Master Data: Mesin & Komponen | P0 | Identifikasi mesin packing No. 6 Unit 2 |
| F-17 | User Management | P0 | RBAC per role |

### 2.2 Aplikasi HMI (Operator Panel di Mesin Packing)

| No | Fitur | Prioritas | Dasar dari Jurnal |
|----|-------|-----------|------------------|
| H-01 | Login Operator | P0 | Akuntabilitas per shift |
| H-02 | Production Running Display | P0 | Aktual produksi, target, FG, defect real-time |
| H-03 | Input Downtime Reason | P0 | 4 jenis downtime dari jurnal: Equipment Failure, Setup, Idle, Material |
| H-04 | Input Defect & Scrap | P0 | Defect ~15.000 pcs/bulan; scrap ~2.450 pcs/bulan (Juli) |
| H-05 | Speed Alert Indicator | P0 | Deteksi reduced speed — loss terbesar 16.47% |
| H-06 | Briefing & Setup Timer | P1 | Setup & Adjustment Loss 14.366 menit/periode |
| H-07 | Maintenance Checklist | P1 | Rekomendasi AM: cleaning, pelumasan, inspeksi harian |
| H-08 | Troubleshooting Quick Guide | P2 | Panduan per jenis kerusakan (korosi, sealer jaw, dll.) |
| H-09 | Kaizen Submit | P1 | Input improvement dari lantai produksi |

---

## Bagian 3: PRD Detail

### 3.1 User Story & Acceptance Criteria

---

#### Epic 1: Monitoring OEE Real-Time

> *Sebagai Supervisor, saya ingin melihat nilai OEE, Availability, Performance, dan Quality mesin packing No. 6 secara real-time, agar saya bisa intervensi sebelum kerugian makin besar — bukan baru tahu setelah periode selesai.*

- [P0] Dashboard menampilkan A (%), P (%), Q (%), dan OEE (%) yang diperbarui setiap ≤ 60 detik
- [P0] Indikator warna OEE: Merah < 65%, Kuning 65–84%, Hijau ≥ 85% (standar JIPM)
- [P0] Grafik trend OEE bulanan ditampilkan dengan garis referensi 85% (JIPM) dan 68.01% (baseline jurnal)
- [P1] Sistem menampilkan berapa persen gap antara OEE aktual dengan target JIPM 85%
- [P1] Dashboard bisa difilter per shift (Shift 1 / 2 / 3 / Hari)
- [P2] Tampilkan proyeksi OEE akhir shift berdasarkan tren jam pertama

---

#### Epic 2: Six Big Losses Pareto Analysis

> *Sebagai Manager Produksi, saya ingin melihat distribusi Six Big Losses secara otomatis dengan urutan Pareto, agar prioritas improvement selalu tepat sasaran dan tidak bergantung pada analisis manual di akhir periode.*

- [P0] Halaman Six Big Losses menampilkan 6 kategori losses (L-01 s.d. L-06) dengan nilai menit dan persentase terhadap loading time
- [P0] Diagram Pareto ditampilkan — bar chart descending + garis kumulatif — dengan marker 80% untuk identifikasi losses dominan
- [P0] Kalkulasi otomatis menggunakan formula jurnal (Kennedy, 2017) yang tertanam di backend
- [P1] Bisa filter per periode (harian, mingguan, bulanan)
- [P1] Sistem memberi highlight otomatis jika Reduced Speed Loss > 10% (ambang batas berdasarkan temuan jurnal: 16.47% = kondisi kritis)
- [P2] Perbandingan before vs. after: tampilkan delta losses antara periode baseline dan periode terkini

---

#### Epic 3: Input Produksi & Downtime via HMI (Operator)

> *Sebagai Operator mesin packing, saya ingin menginput data produksi, jenis downtime, dan defect langsung dari layar sentuh di sebelah mesin, agar pencatatan tidak lagi manual dan saya mendapat alert saat mesin berjalan lambat.*

- [P0] Setelah login, HMI menampilkan: total produksi aktual, target shift, finish good, defect, scrap, dan loading time yang sudah berjalan
- [P0] Saat mesin berhenti, sistem otomatis memunculkan form pilih kategori downtime: `Equipment Failure` / `Setup & Adjustment` / `Idle & Minor Stoppage` / `Material Shortage`
- [P0] Setiap kategori downtime timer otomatis berjalan sejak mesin berhenti sampai mesin kembali jalan
- [P0] Form input defect dan scrap menggunakan angka (pcs) — tidak free text
- [P1] Jika kecepatan aktual mesin < 80% dari ideal speed (0.024 menit/pcs ≈ 41.67 pcs/menit), HMI menampilkan badge kuning "REDUCED SPEED DETECTED"
- [P1] Operator bisa input durasi briefing & setup di awal shift

---

#### Epic 4: Laporan Shift & Approval

> *Sebagai Shift Leader, saya ingin laporan OEE per shift ter-generate otomatis saat shift berakhir, dengan seluruh perhitungan A, P, Q, OEE, dan six big losses sudah terisi — agar saya tidak perlu menghitung ulang dari awal.*

- [P0] Sistem auto-generate draft laporan saat operator klik "End Shift" atau saat jam shift berakhir
- [P0] Laporan berisi: tanggal, shift, loading time, downtime per kategori, total produksi, defect, scrap, nilai A / P / Q / OEE (%), dan six big losses (menit + %)
- [P0] Alur approval: `Draft → Need Approval → Approved → Released`
- [P0] Shift Leader bisa approve dari web, bukan hanya dari HMI
- [P1] Laporan status Released tidak bisa diedit — read-only
- [P1] Export laporan ke PDF / Excel
- [P2] Sistem memberi rekomendasi otomatis: jika Reduced Speed Loss di shift ini > threshold, tampilkan reminder "Cek kalibrasi sealer jaw & pelumasan bearing"

---

#### Epic 5: TPM Kaizen & Maintenance Scheduling

> *Sebagai Tim Maintenance, saya ingin mencatat seluruh aktivitas autonomous maintenance dan preventive maintenance secara digital, dengan jadwal yang bisa di-track — sesuai rekomendasi TPM dari penelitian.*

- [P1] Sistem menyediakan modul **Autonomous Maintenance Schedule**: daftar checklist per mesin (pembersihan, pelumasan, inspeksi), frekuensi per 2 minggu per mesin packing (sesuai rekomendasi jurnal)
- [P1] Checklist AM dapat diisi dari HMI oleh operator, dengan timestamp dan nama operator
- [P1] Modul **Preventive Maintenance**: jadwal PM bisa dibuat oleh Maintenance Lead, dengan alert H-7, H-3, H-1 sebelum jadwal PM tiba
- [P1] Modul **Kaizen Board**: CRUD Kaizen item dengan field: Judul, Kategori (Production / Maintenance), Deskripsi Issue, Root Cause, Action Plan, PIC, Deadline, Status (Open/In Progress/Closed)
- [P2] Kaizen bisa dibuat langsung dari halaman Six Big Losses — pre-filled losses yang dipilih sebagai issue
- [P2] Modul **Skill Matrix**: tabel operator vs. skill (operasi mesin, troubleshooting, AM, PM), bisa diupdate oleh Maintenance Lead
- [P2] Modul **Troubleshooting Guide**: upload panduan per jenis kerusakan (korosi bearing, sealer jaw overheat, film feeding jammed, dll.) — bisa diakses operator dari HMI

---

### 3.2 Role & Permission Matrix

| Fitur | Operator | Maintenance | Shift Leader | Supervisor / QA | Admin | SuperAdmin |
|-------|:--------:|:-----------:|:------------:|:---------------:|:-----:|:----------:|
| Input Produksi & Downtime (HMI) | ✅ | ✅ | ✅ | — | — | ✅ |
| Input Checklist AM (HMI) | ✅ | ✅ | — | — | — | ✅ |
| View Dashboard Web | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Six Big Losses Pareto | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve Laporan Shift | — | — | ✅ | ✅ | — | ✅ |
| Release Laporan | — | — | — | ✅ | — | ✅ |
| CRUD Kaizen | ✅ (HMI) | ✅ | ✅ | ✅ | — | ✅ |
| CRUD PM Schedule | — | ✅ | — | ✅ | — | ✅ |
| Skill Matrix Edit | — | ✅ | — | ✅ | — | ✅ |
| Upload Troubleshooting Guide | — | ✅ | — | — | ✅ | ✅ |
| CRUD Master Data | — | — | — | — | ✅ | ✅ |
| CRUD User | — | — | — | — | — | ✅ |

---

### 3.3 Data Model (Ringkasan Entity)

| Entity | Field Utama |
|--------|-------------|
| **User** | id, name, username, role, shift, machine_assigned, is_active |
| **Machine** | id, code, name, unit, ideal_cycle_time_min, nominal_speed_pcs_per_min, install_year, material_env (corrosive/normal) |
| **ProductionLog** | id, machine_id, operator_id, shift, date, processed_amount, defect_amount, scrap_amount, loading_time_min, operation_time_min |
| **DowntimeEvent** | id, machine_id, category (L-01/L-02/L-03/L-04), start_at, end_at, duration_min, input_by, source (Auto/Manual) |
| **SpeedLog** | id, machine_id, timestamp, actual_speed_ppm, ideal_speed_ppm, reduced_flag |
| **OEEResult** | id, machine_id, period_type (shift/daily/monthly), period_label, availability, performance, quality, oee, six_big_losses (JSON) |
| **ShiftReport** | id, machine_id, date, shift, status (Draft/NeedApproval/Approved/Released), approved_by |
| **KaizenItem** | id, machine_id, type (AM/PM/Production/Training), title, issue, root_cause, action, pic_id, deadline, status |
| **MaintenanceSchedule** | id, machine_id, type (AM/PM), frequency_days, last_done_at, next_due_at, checklist (JSON) |
| **SkillMatrix** | id, operator_id, skill_name, level (0–3), last_assessed_at |
| **Guideline** | id, machine_id, category (troubleshooting/SOP), title, file_url, uploaded_by |

---

### 3.4 Non-Functional Requirements

| Kategori | Requirement |
|----------|-------------|
| **Ketahanan Hardware** | Sistem dan komponen HMI harus tahan di lingkungan lembab dan berdebu (IP54 minimum) — mengingat lingkungan pabrik garam yang korosif |
| **Keamanan** | JWT auth, RBAC, password bcrypt. Data Released tidak bisa diedit. |
| **Performa** | Dashboard load < 3 detik. HMI response < 1 detik. Six Big Losses kalkulasi < 5 detik untuk data 1 bulan. |
| **Ketersediaan** | Offline mode HMI: tetap bisa input saat koneksi ke server putus, sync otomatis saat kembali online. Uptime target 99.5% jam produksi. |
| **Audit Trail** | Setiap input, downtime event, dan perubahan status tersimpan dengan timestamp + user_id. Tidak ada hard delete pada data produksi. |
| **Kalkulasi OEE** | Formula harus persis mengikuti jurnal (Kennedy, 2017 & Stamatis, 2017). Unit test wajib ada untuk setiap formula Six Big Losses. |
| **HMI UI** | Touch screen, font minimal 16pt, tombol minimal 48×48px, contrast tinggi untuk kondisi pencahayaan pabrik. |

---

### 3.5 Phasing

| Phase | Fokus | Fitur Utama |
|-------|-------|-------------|
| **Phase 1 — MVP** | Digitalisasi input + OEE monitoring | Login HMI, Input Produksi & Downtime, Dashboard OEE (A/P/Q/OEE), Report by Shift (auto + approval), Master Data (Mesin, User) |
| **Phase 2 — Analisis** | Six Big Losses + Pareto otomatis | Six Big Losses Pareto View, Reduced Speed Monitoring, Quality Loss Analysis, Kaizen Board, Laporan bulanan |
| **Phase 3 — TPM** | Maintenance digital | AM Checklist, PM Schedule, Troubleshooting Guide, Skill Matrix, Before/After Comparison |
| **Phase 4 — Skala** | Multi-mesin / multi-unit | Rollout ke seluruh mesin packing Unit 2, kemudian Unit lain |

---

*Dokumen ini mengacu pada: Jurnal TEKNIKA Vol. 1 No. 1 (2023) — "Analisis Pengukuran Efektifitas Mesin Packing di Unit 2 Menggunakan Overall Equipment Effectiveness (OEE) dengan Pendekatan Total Productive Maintenance" oleh Muhammad Kholis Al Farichi & Hery Murnawan, Universitas 17 Agustus 1945 Surabaya.*
