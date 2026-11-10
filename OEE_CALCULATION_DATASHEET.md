# 📊 TECHNICAL DATASHEET: SPESIFIKASI KALKULASI OEE & DATASET BENCHMARK
**Dokumen Referensi Teknis Perhitungan Overall Equipment Effectiveness (OEE) & Six Big Losses**  
*Standar: Japan Institute of Plant Maintenance (JIPM) & Total Productive Maintenance (TPM)*  
*Basis Data Empiris: Studi Kasus Lini Pengemasan (Unit 2 Packaging Line - Jurnal Teknika 2023)*  
*Klasifikasi: White-label / Abstracted Industrial Specification (Nusantara MES Standard)*

---

## 1. Arsitektur Hirarki Waktu Operasional (Time Hierarchy)

Sebelum menghitung OEE, waktu kerja pabrik dipetakan ke dalam hirarki standar JIPM:

```
[ Total Calendar Time / Total Jam Kerja (24 Jam / 480 Menit per Shift) ]
  ├── 1. Planned Downtime (Terencana) ──> Istirahat Resmi, Salat, Briefing, Preventive Maintenance Terjadwal
  └── 2. Loading Time (Planned Production Time)
        ├── 2.1 Unplanned Downtime (Kerugian Ketersediaan) ──> Breakdown Mesin, Setup & Ganti Film
        └── 2.2 Operating Time (Waktu Operasi Nyata)
              ├── 2.2.1 Speed Losses (Kerugian Kecepatan) ──> Penurunan RPM, Idling, Minor Stoppage (Jamming)
              └── 2.2.2 Net Operating Time
                    ├── 2.2.2.1 Quality Losses (Kerugian Kualitas) ──> Reject Kemasan, Scrap, Rework
                    └── 2.2.2.2 Fully Productive Time (Waktu 100% Efektif Menghasilkan Produk Baik)
```

---

## 2. Rumus Matematika Inti OEE (Core Mathematical Formulations)

OEE dihitung dari perkalian tiga rasio kinerja fundamental:

$$\text{OEE} = \text{Availability Rate (A)} \times \text{Performance Rate (P)} \times \text{Quality Rate (Q)} \times 100\%$$

---

### A. Availability Rate (Ketersediaan Mesin)
Mengukur rasio waktu operasional aktual terhadap waktu yang direncanakan untuk berproduksi (*Loading Time*).

$$\text{Loading Time} = \text{Total Shift Time} - \text{Planned Downtime}$$

$$\text{Operating Time} = \text{Loading Time} - \text{Unplanned Downtime}$$

$$\text{Availability Rate (A)} = \left( \frac{\text{Operating Time}}{\text{Loading Time}} \right) \times 100\%$$

*Komponen Pengurang:*
- Kerusakan Mesin (*Equipment Failure*)
- Waktu Penggantian Produk & Penyetelan (*Setup & Adjustment*)

---

### B. Performance Rate (Kinerja / Kecepatan Mesin)
Mengukur rasio jumlah output aktual yang dihasilkan terhadap kapasitas teoritis ideal mesin selama waktu operasi berjalan.

$$\text{Performance Rate (P)} = \left( \frac{\text{Ideal Cycle Time} \times \text{Total Processed Amount}}{\text{Operating Time}} \right) \times 100\%$$

Atau menggunakan rasio kecepatan produksi:

$$\text{Performance Rate (P)} = \left( \frac{\text{Total Processed Output} / \text{Operating Time}}{\text{Design Speed (Ideal Speed)}} \right) \times 100\%$$

*Komponen Pengurang:*
- Penurunan Kecepatan Mesin (*Reduced Speed Losses*)
- Mesin Berhenti Sejenak / Macet Singkat (*Idling & Minor Stoppage < 5 Menit*)

---

### C. Quality Rate (Tingkat Kualitas Produk)
Mengukur rasio produk yang memenuhi standar mutu (*Good Product*) terhadap total produk yang diproses oleh mesin.

$$\text{Good Product Amount} = \text{Total Processed Amount} - \text{Defect / Reject Amount}$$

$$\text{Quality Rate (Q)} = \left( \frac{\text{Good Product Amount}}{\text{Total Processed Amount}} \right) \times 100\%$$

*Komponen Pengurang:*
- Kemasan Rusak / Bocor / Cacat (*Process Defects*)
- Berat di Luar Toleransi (*Underweight / Overweight Checkweigher*)
- Kerugian Awal Produksi (*Startup Scrap Losses*)

---

## 3. Klasifikasi *Six Big Losses* (Enam Kerugian Utama)

Sesuai standar TPM, waktu yang hilang selama *Loading Time* diklasifikasikan ke dalam 6 kelompok:

| Kategori OEE | Kode Loss | Nama Kerugian (*Six Big Losses*) | Definisi Operasional | Contoh Kejadian Lapangan |
| :--- | :---: | :--- | :--- | :--- |
| **Availability Loss** | **L-01** | **Equipment Failure** | Kerusakan mesin fatal tak terencana $\ge 5$ menit | Motor servo terbakar, rantai conveyor putus |
| **Availability Loss** | **L-02** | **Setup & Adjustment** | Waktu pergantian roll, SKU, dan kalibrasi mesin | Penggantian roll film kemasan, setting coding |
| **Performance Loss** | **L-03** | **Idling & Minor Stoppages** | Mesin berhenti singkat $< 5$ menit (bisa direset operator) | Kantong tersangkut di gripper, sensor feeding terhalang |
| **Performance Loss** | **L-04** | **Reduced Speed** | Mesin beroperasi di bawah kecepatan desain (*rated speed*) | RPM diturunkan karena sealing bar kurang panas |
| **Quality Loss** | **L-05** | **Process Defects & Rework** | Produk tidak lolos QA selama proses produksi reguler | Tanggal kedaluwarsa buram, seal bocor/miring |
| **Quality Loss** | **L-06** | **Reduced Yield / Scrap** | Produk cacat saat startup / transisi awal mesin | Pengaturan awal pemanasan sealing bar, film terbuang |

Rumus kontribusi persentase tiap loss terhadap total waktu:

$$\% \text{Loss}_i = \left( \frac{\text{Waktu Hilang Loss}_i}{\text{Total Loading Time}} \right) \times 100\%$$

---

## 4. Dataset Riil Empiris (Benchmark Data Jurnal Teknika 2023)

Data berikut diambil dari hasil pengukuran riil lini mesin packing (*Packaging Machine Unit 2*) selama periode 5 bulan dengan total waktu pembebanan (**Loading Time: 144.180 menit**).

### A. Rekapitulasi Metrik OEE Bulanan (Time-Series)

| Bulan Observasi | Loading Time (Menit) | Operating Time (Menit) | Availability Rate (%) | Performance Rate (%) | Quality Rate (%) | OEE Aktual (%) | Deviasi vs Standar JIPM (85%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Juli 2022** | 28.560 | 24.502 | **85.79%** | **77.16%** | **97.98%** | **64.86%** | -20.14% |
| **Agustus 2022** | 29.400 | 24.540 | **83.47%** | **83.71%** | **98.14%** | **68.58%** | -16.42% |
| **September 2022** | 28.840 | 24.667 | **85.53%** | **79.63%** | **98.05%** | **66.78%** | -18.22% |
| **Oktober 2022** | 28.980 | 25.149 | **86.78%** | **82.77%** | **97.90%** | **70.32%** | -14.68% |
| **November 2022** | 28.400 | 24.901 | **87.68%** | **80.88%** | **98.03%** | **69.52%** | -15.48% |
| **RATA-RATA** | **28.836** | **24.752** | **85.85%** | **80.83%** | **98.02%** | **68.01%** | **-16.99%** |

> **Standar Internasional World-Class (JIPM Standard):**
> - Availability: $\ge 90.0\%$
> - Performance: $\ge 95.0\%$
> - Quality: $\ge 99.0\%$
> - **OEE Target: $\ge 85.0\%$**

---

### B. Distribusi Riil Six Big Losses (Pareto Analysis Basis)

Total waktu yang hilang akibat kerugian teknis selama 5 bulan adalah **59.858 menit (41.52% dari seluruh Loading Time)**:

| Peringkat Pareto | Jenis Kerugian (*Loss Category*) | Durasi Akumulasi (Menit) | Porsi terhadap Loading Time (%) | Kumulatif (%) | Rekomendasi Mitigasi Teknis (Kaizen) |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **Reduced Speed Losses** | **23.776** | **16.47%** | 39.72% | Optimalisasi elemen pemanas sealing & tuning feeder |
| **2** | **Setup and Adjustment** | **14.366** | **9.97%** | 63.72% | SMED (*Single-Minute Exchange of Die*), auto-splice film |
| **3** | **Idle and Minor Stoppages** | **13.435** | **9.35%** | 86.17% | Sensor cleaning rutin, kalibrasi vacuum cup position |
| **4** | **Equipment Failure** | **6.010** | **4.18%** | 96.21% | Autonomous maintenance, lubrikasi terjadwal |
| **5** | **Process Defect Losses** | **1.974** | **1.37%** | 99.50% | Verifikasi kode cetak barcode visual, kontrol tensi film |
| **6** | **Scrap Losses** | **297** | **0.20%** | 100.00% | Standarisasi pemanasan awal jaw sealer sebelum running |
| — | **Total Kerugian (Total Losses)** | **59.858** | **41.52%** | — | — |

---

## 5. Simulasi Perhitungan Langkah demi Langkah (Sample Shift Scenario)

Berikut contoh perhitungan konkret untuk **1 Shift Produksi (Shift 1: 07:00 - 15:00)**:

### Data Input Operasional Shift:
- **Total Shift Time:** 8 Jam = $480\text{ menit}$
- **Planned Downtime:** Istirahat $45\text{ menit}$ + Briefing $15\text{ menit} = 60\text{ menit}$
- **Unplanned Stoppage:** Ganti Roll Film $20\text{ menit}$ + Jamming Sealer $15\text{ menit} = 35\text{ menit}$
- **Kecepatan Desain Mesin (*Ideal Speed*):** $60\text{ packs / menit}$ (Ideal Cycle Time $= 1.0\text{ detik/pack} = 0.01667\text{ menit/pack}$)
- **Total Output Tercetak (Aktual):** $19.200\text{ packs}$
- **Jumlah Produk Cacat / Reject:** $320\text{ packs}$ (Checkweigher underweight: 180, Seal miring: 140)

---

### Langkah 1: Hitung Availability (A)
$$\text{Loading Time} = 480 - 60 = 420\text{ menit}$$
$$\text{Operating Time} = 420 - 35 = 385\text{ menit}$$
$$\text{Availability (A)} = \frac{385}{420} \times 100\% = \mathbf{91.67\%}$$

### Langkah 2: Hitung Performance (P)
Output teoritis maksimal jika berjalan pada kecepatan desain selama 385 menit:
$$\text{Ideal Output} = 385\text{ menit} \times 60\text{ packs/menit} = 23.100\text{ packs}$$
$$\text{Performance (P)} = \frac{19.200}{23.100} \times 100\% = \mathbf{83.12\%}$$
*(Terdapat kehilangan kecepatan setara dengan $3.900\text{ packs}$ atau $\sim 65\text{ menit}$ waktu operasi).*

### Langkah 3: Hitung Quality (Q)
$$\text{Good Product} = 19.200 - 320 = 18.880\text{ packs}$$
$$\text{Quality (Q)} = \frac{18.880}{19.200} \times 100\% = \mathbf{98.33\%}$$

### Langkah 4: Hitung OEE Total
$$\text{OEE} = 91.67\% \times 83.12\% \times 98.33\% = \mathbf{74.92\%}$$

---

## 6. Dampak Finansial: Korelasi OEE terhadap ROCE (Return on Capital Employed)

Kenaikan OEE berdampak langsung pada kenaikan laba operasional (*Operating Profit*) tanpa menambah modal aset pabrik:

$$\text{ROCE} = \left( \frac{\text{Operating Profit (EBIT)}}{\text{Capital Employed (Aset Mesin \& Modal Kerja)}} \right) \times 100\%$$

$$\Delta \text{EBIT} = \left( \Delta \text{Output Lolos QA} \times \text{Margin Kontribusi / Pack} \right) - \text{Biaya Scrap Bahan Kemasan} - \text{Biaya Lembur}$$

### Model Finansial Mesin Packing:
- **Baseline OEE:** $68.01\%$ $\rightarrow$ Output: $1.150.000\text{ pack/bulan}$
- **Target OEE (TPM Implemented):** $77.78\%$ (+9.77%) $\rightarrow$ Output: $1.315.000\text{ pack/bulan}$
- **Tambahan Output:** $+165.000\text{ packs/bulan}$
- **Margin Kontribusi:** $\text{Rp } 1.200\text{ / pack}$
- **Potensi Penghematan / Tambahan EBIT:** $\mathbf{\text{Rp } 198.000.000\text{ / bulan}}$
- **Kenaikan ROCE:** Dari $16.4\%$ menjadi $19.2\%$ per tahun.

---

## 7. Skema Integrasi Kode TypeScript (`engineSchema.ts`)

Struktur data berikut siap diimpor langsung ke dalam file `historicalEngine.ts` dan `simulationEngine.ts`:

```typescript
// Interface Spesifikasi Perhitungan OEE
export interface OEEMetrics {
  timestamp: string;
  shiftId: 'SHIFT-1' | 'SHIFT-2' | 'SHIFT-3';
  lineId: string;                 // cth: "LINE-PK01"
  machineId: string;              // cth: "PACK-UNIT-02"
  
  // Waktu (Menit)
  totalShiftMinutes: number;      // 480
  plannedDowntimeMinutes: number; // 60
  loadingTimeMinutes: number;     // 420
  unplannedDowntimeMinutes: number; // 35
  operatingTimeMinutes: number;   // 385

  // Output (Pcs / Packs)
  idealCycleTimeSeconds: number;  // 1.0 (60 packs/min)
  totalOutputPcs: number;         // 19200
  goodOutputPcs: number;          // 18880
  rejectOutputPcs: number;        // 320

  // Hasil Rasio OEE
  availability: number;           // 0.9167 (91.67%)
  performance: number;            // 0.8312 (83.12%)
  quality: number;                // 0.9833 (98.33%)
  oee: number;                    // 0.7492 (74.92%)

  // Breakdown Six Big Losses (Menit)
  lossesBreakdown: {
    equipmentFailureMin: number;    // L-01
    setupAdjustmentMin: number;     // L-02
    minorStoppagesMin: number;      // L-03
    reducedSpeedMin: number;        // L-04
    processDefectsMin: number;      // L-05
    scrapMin: number;               // L-06
  };
}

// Probabilitas Bobot Simulasi Real-Time (Berdasarkan Data Empiris Jurnal)
export const EMPIRICAL_SIMULATION_WEIGHTS = {
  REDUCED_SPEED_PROBABILITY: 0.1647,    // 16.47% waktu hilang
  SETUP_ADJUSTMENT_PROBABILITY: 0.0997, // 9.97% waktu hilang
  MINOR_STOPPAGE_PROBABILITY: 0.0935,   // 9.35% waktu hilang
  EQUIPMENT_FAILURE_PROBABILITY: 0.0418,// 4.18% waktu hilang
  PROCESS_DEFECT_RATE: 0.0137,          // 1.37% reject rate
  SCRAP_RATE: 0.0020                    // 0.20% scrap rate
};
```

---
*Datasheet disusun untuk standarisasi implementasi sistem eksekusi manufaktur (MES) berbasis data saintifik dan standar industri global JIPM.*

