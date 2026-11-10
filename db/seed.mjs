import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { hashSecret } from '../server/auth.mjs';
import { calculateOeeMetrics, convertPackagingUnits, round2 } from '../server/oee-engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH = resolve(__dirname, 'productioncore.sqlite');
export const SCHEMA_PATH = resolve(__dirname, 'schema.sql');

export function openDatabase(dbPath = DEFAULT_DB_PATH) {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  const schemaSql = readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);
  return db;
}

export function seedDatabase(db) {
  const existingFactory = db.prepare(`SELECT COUNT(*) AS count FROM factories`).get();
  if (existingFactory && existingFactory.count > 0) {
    return { seeded: false, reason: 'already_populated' };
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    const factoryRes = db.prepare(`
      INSERT INTO factories (code, name, location, timezone, calendar_hours_per_day, shifts_per_day, jipm_oee_target_pct)
      VALUES ('PT-XYZ', 'PT. XYZ - Pabrik Garam Konsumsi Beryodium', 'Kawasan Industri Pesisir Jawa Timur', 'Asia/Jakarta', 24, 3, 85.0)
    `).run();
    const factoryId = Number(factoryRes.lastInsertRowid);

    const insertShiftDef = db.prepare(`
      INSERT INTO shift_definitions (factory_id, shift_number, name, start_time, end_time, duration_minutes)
      VALUES (?, ?, ?, ?, ?, 480)
    `);
    insertShiftDef.run(factoryId, 1, 'Shift 1 (Pagi)', '07:00', '15:00');
    insertShiftDef.run(factoryId, 2, 'Shift 2 (Sore)', '15:00', '23:00');
    insertShiftDef.run(factoryId, 3, 'Shift 3 (Malam)', '23:00', '07:00');

    const areaRes = db.prepare(`
      INSERT INTO areas (factory_id, code, name, description, environment_notes)
      VALUES (
        ?, 'AREA-U2', 'Unit 2 Garam Konsumsi',
        'Area pengemasan akhir garam halus beryodium sachet & pouch PE',
        'Kelembapan relatif > 78% dan debu NaCl korosif; wajib inspeksi rutin SEN-T01 & bearing SEN-V01'
      )
    `).run(factoryId);
    const areaId = Number(areaRes.lastInsertRowid);

    const lineARes = db.prepare(`
      INSERT INTO lines (area_id, code, name, sequence_no)
      VALUES (?, 'LN-PK01', 'Line Packing A - VFFS Sachet 250g', 1)
    `).run(areaId);
    const lineAId = Number(lineARes.lastInsertRowid);

    const lineBRes = db.prepare(`
      INSERT INTO lines (area_id, code, name, sequence_no)
      VALUES (?, 'LN-PK02', 'Line Packing B - VFFS Pouch 500g', 2)
    `).run(areaId);
    const lineBId = Number(lineBRes.lastInsertRowid);

    const insertMachine = db.prepare(`
      INSERT INTO machines (
        line_id, code, name, machine_type, plc_model, plc_ip, plc_port, plc_protocol,
        gateway_code, gateway_ip, hmi_code, buzzer_code,
        sealer_temp_setpoint_c, sealer_temp_min_c, sealer_temp_max_c,
        vib_warning_mms, vib_critical_mms, minor_stop_threshold_sec, reduced_speed_threshold_pct
      ) VALUES (?, ?, ?, 'Vertical Form Fill Seal (VFFS)', 'PLC-ABC', ?, 502, 'MODBUS_TCP', 'GW-100', '192.168.10.10', 'HMI-T7', 'BUZ-01', 165.0, 155.0, 185.0, 4.5, 7.1, 300, 91.2)
    `);

    const m6Id = Number(insertMachine.run(lineAId, 'MCN-U2-PK06', 'Mesin Packing #6', '192.168.10.20').lastInsertRowid);
    const m5Id = Number(insertMachine.run(lineAId, 'MCN-U2-PK05', 'Mesin Packing #5', '192.168.10.21').lastInsertRowid);
    const m4Id = Number(insertMachine.run(lineBId, 'MCN-U2-PK04', 'Mesin Packing #4', '192.168.10.22').lastInsertRowid);
    const m7Id = Number(insertMachine.run(lineBId, 'MCN-U2-PK07', 'Mesin Packing #7', '192.168.10.23').lastInsertRowid);

    const insertSubMachine = db.prepare(`
      INSERT INTO sub_machines (machine_id, code, name, sensor_tags, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const subMap = {};
    for (const machineId of [m6Id, m5Id, m4Id, m7Id]) {
      subMap[machineId] = {
        cutter: Number(
          insertSubMachine.run(
            machineId,
            'SUB-CUT',
            'Rotary Cutter & Main Drive',
            'SEN-S01, SEN-V01',
            'Penggerak utama film & pisau pemotong sachet; rentan aus bearing akibat debu garam'
          ).lastInsertRowid
        ),
        sealer: Number(
          insertSubMachine.run(
            machineId,
            'SUB-SEA',
            'Vertical & Horizontal Heater Sealer',
            'SEN-T01',
            'Elemen pemanas perekat kemasan PE setpoint 165.0 C; rentan kerak garam menghambat panas'
          ).lastInsertRowid
        ),
        auger: Number(
          insertSubMachine.run(
            machineId,
            'SUB-AUG',
            'Auger Filler & Salt Hopper',
            'CNT-G01',
            'Corong takar garam beryodium; rawan jembatan garam lembap (clumping)'
          ).lastInsertRowid
        ),
        conveyor: Number(
          insertSubMachine.run(
            machineId,
            'SUB-CNV',
            'Discharge Conveyor & Checkweigher',
            'CNT-R01',
            'Konveyor keluaran sachet & pemisah otomatis produk underweight/seal gagal'
          ).lastInsertRowid
        )
      };
    }

    const insertUser = db.prepare(`
      INSERT INTO users (
        nik, username, full_name, email, department, job_title,
        role, user_type, primary_area_id, primary_line_id, primary_machine_id,
        password_hash, hmi_pin_hash, theme_preference, can_release_reports
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'light', ?)
    `);

    const uSuper = Number(
      insertUser.run(
        'EMP-0001', 'superadmin', 'Rizal Mahendra', 'rizal.mahendra@ptxyz.co.id',
        'IT & OT Automation', 'OT Systems Administrator',
        'SUPERADMIN', 'SYSTEM', areaId, lineAId, m6Id,
        hashSecret('Admin@2026'), hashSecret('990011'), 1
      ).lastInsertRowid
    );
    const uMgr = Number(
      insertUser.run(
        'EMP-0102', 'mgr.unit2', 'Hendra Wijaya', 'hendra.wijaya@ptxyz.co.id',
        'Production Management', 'Plant Manager Unit 2',
        'ADMIN_MANAGER', 'MANAGEMENT', areaId, lineAId, null,
        hashSecret('Manager@2026'), null, 1
      ).lastInsertRowid
    );
    const uSpv = Number(
      insertUser.run(
        'EMP-0201', 'spv.unit2', 'Dian Pratama', 'dian.pratama@ptxyz.co.id',
        'Production Unit 2', 'Production Supervisor Unit 2',
        'SPV', 'PRODUCTION', areaId, lineAId, m6Id,
        hashSecret('Spv@2026'), hashSecret('778899'), 0
      ).lastInsertRowid
    );
    const uLeader = Number(
      insertUser.run(
        'EMP-0301', 'leader.s1', 'Bagus Santoso', 'bagus.santoso@ptxyz.co.id',
        'Production Unit 2', 'Shift Leader Packing A',
        'SHIFT_LEADER', 'PRODUCTION', areaId, lineAId, m6Id,
        hashSecret('Leader@2026'), hashSecret('334455'), 0
      ).lastInsertRowid
    );
    const uTech = Number(
      insertUser.run(
        'EMP-0350', 'tech.maint', 'Arif Kurniawan', 'arif.kurniawan@ptxyz.co.id',
        'Maintenance & Engineering', 'Teknisi Mekanik & Instrumentasi OT',
        'SHIFT_LEADER', 'TECHNICAL', areaId, lineAId, m6Id,
        hashSecret('Tech@2026'), hashSecret('556677'), 0
      ).lastInsertRowid
    );
    const uOpSlamet = Number(
      insertUser.run(
        'EMP-0401', 'op.slamet', 'Slamet Riyadi', null,
        'Production Unit 2', 'Operator VFFS Packing #6',
        'OPERATOR', 'PRODUCTION', areaId, lineAId, m6Id,
        null, hashSecret('123456'), 0
      ).lastInsertRowid
    );
    const uOpWahyu = Number(
      insertUser.run(
        'EMP-0402', 'op.wahyu', 'Wahyu Saputra', null,
        'Production Unit 2', 'Operator VFFS Packing #5',
        'OPERATOR', 'PRODUCTION', areaId, lineAId, m5Id,
        null, hashSecret('234567'), 0
      ).lastInsertRowid
    );
    const uOpRini = Number(
      insertUser.run(
        'EMP-0403', 'op.rini', 'Rini Handayani', null,
        'Production Unit 2', 'Operator VFFS Packing #6 Shift 2',
        'OPERATOR', 'PRODUCTION', areaId, lineAId, m6Id,
        null, hashSecret('345678'), 0
      ).lastInsertRowid
    );

    const insertSku = db.prepare(`
      INSERT INTO skus (
        code, name, area_id, default_line_id, net_weight_grams,
        primary_unit, secondary_unit, pcs_per_secondary, tertiary_unit, pcs_per_tertiary,
        ideal_cycle_time_min, ideal_speed_pcs_per_min, reduced_speed_trigger_pcs_per_min,
        unit_price_idr, cogs_idr
      ) VALUES (?, ?, ?, ?, ?, 'pcs', 'inner', 10, 'karton', ?, ?, ?, ?, NULL, NULL)
    `);
    const sku250Id = Number(
      insertSku.run(
        'SKU-GRM-250', 'Garam Konsumsi Beryodium Halus 250g (Sachet PE)',
        areaId, lineAId, 250, 40, 0.024, 41.67, 38.0
      ).lastInsertRowid
    );
    const sku500Id = Number(
      insertSku.run(
        'SKU-GRM-500', 'Garam Konsumsi Beryodium Dapur 500g (Pouch PE)',
        areaId, lineBId, 500, 20, 0.030, 33.33, 30.0
      ).lastInsertRowid
    );

    const insertRate = db.prepare(`
      INSERT INTO sku_machine_rates (sku_id, machine_id, ideal_cycle_time_min, ideal_speed_pcs_per_min)
      VALUES (?, ?, ?, ?)
    `);
    for (const mId of [m6Id, m5Id]) {
      insertRate.run(sku250Id, mId, 0.024, 41.67);
      insertRate.run(sku500Id, mId, 0.030, 33.33);
    }
    for (const mId of [m4Id, m7Id]) {
      insertRate.run(sku500Id, mId, 0.030, 33.33);
      insertRate.run(sku250Id, mId, 0.025, 40.0);
    }

    const insertLossCat = db.prepare(`
      INSERT INTO loss_categories (code, pillar, name, six_big_loss_number, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLossCat.run('PLANNED', 'SCHEDULE', 'Planned Schedule & Autonomous Cleaning', null, 'Istirahat resmi, briefing shift, dan autonomous maintenance terjadwal');
    insertLossCat.run('L-01', 'AVAILABILITY', 'Equipment Failure Losses', 1, 'Kerusakan mendadak komponen mekanis/elektrikal/pemanas >= 5 menit');
    insertLossCat.run('L-02', 'AVAILABILITY', 'Setup & Adjustment Losses', 2, 'Pergantian roll film PE, kalibrasi pisau rotary, dan sanitasi tak terencana');
    insertLossCat.run('L-03', 'PERFORMANCE', 'Idle & Minor Stoppage Losses', 3, 'Henti singkat < 5 menit akibat garam lembap menggumpal atau film tersangkut');
    insertLossCat.run('L-04', 'PERFORMANCE', 'Reduced Speed Losses', 4, 'Penurunan RPM di bawah kecepatan ideal 41.67 pcs/mnt');
    insertLossCat.run('L-05', 'QUALITY', 'Process Defect Losses', 5, 'Sachet bocor seal, kode kedaluwarsa buram, atau berat di luar toleransi');
    insertLossCat.run('L-06', 'QUALITY', 'Scrap & Startup Yield Losses', 6, 'Sachet gagal awal pemanasan jaw sealer dan garam tumpah lantai (K3)');

    const insertDtReason = db.prepare(`
      INSERT INTO downtime_reasons (
        code, loss_category_code, area_id, machine_id, name,
        default_plc_stop_code, recommended_actions_json, is_planned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const dtBriefing = Number(
      insertDtReason.run(
        'DTR-PLN-01', 'PLANNED', areaId, null, 'Istirahat Resmi & Briefing Pergantian Shift',
        1, JSON.stringify(['Pastikan hopper tertutup rapat', 'Catat counter akhir shift']), 1
      ).lastInsertRowid
    );
    const dtRollSetup = Number(
      insertDtReason.run(
        'DTR-L02-01', 'L-02', areaId, null, 'Pergantian Roll Film PE & Splicing Kemasan',
        2, JSON.stringify(['Gunakan jig SMED splicing', 'Cek ketegangan dancer roller', 'Uji 3 sachet pertama']), 0
      ).lastInsertRowid
    );
    const dtBladeAdj = Number(
      insertDtReason.run(
        'DTR-L02-02', 'L-02', areaId, null, 'Setting Sparepart Pisau Rotary & Sanitasi Kerak Garam',
        3, JSON.stringify(['Bersihkan kristal garam pada dudukan pisau', 'Setel celah anvil 0.05 mm']), 0
      ).lastInsertRowid
    );
    const dtHeaterFault = Number(
      insertDtReason.run(
        'DTR-L01-01', 'L-01', areaId, null, 'Drop Suhu Heater Sealer Temperature Drop / Kerusakan Termokopel SEN-T01',
        4, JSON.stringify(['Cek kabel termokopel SEN-T01', 'Bersihkan kerak garam pada jaw sealer', 'Eskalasi Kaizen Maintenance bila drop > 10 C']), 0
      ).lastInsertRowid
    );
    const dtBearingFault = Number(
      insertDtReason.run(
        'DTR-L01-02', 'L-01', areaId, null, 'Kerusakan Bearing Penggerak Utama / Vibrasi Tinggi SEN-V01',
        7, JSON.stringify(['Ukur vibrasi bearing utama', 'Ganti seal pelindung korosi & grease food-grade']), 0
      ).lastInsertRowid
    );
    const dtSaltClump = Number(
      insertDtReason.run(
        'DTR-L03-01', 'L-03', areaId, null, 'Garam Lembap Menggumpal di Corong Auger Hopper',
        6, JSON.stringify(['Aktifkan agitator hopper', 'Bersihkan mulut auger dari gumpalan lembap']), 0
      ).lastInsertRowid
    );
    const dtFilmJam = Number(
      insertDtReason.run(
        'DTR-L03-02', 'L-03', areaId, null, 'Film Sachet Tersangkut di Forming Collar (Small Stop)',
        5, JSON.stringify(['Luruskan jalur penarik film', 'Lap permukaan forming tube dengan kain kering']), 0
      ).lastInsertRowid
    );

    const insertQualityReason = db.prepare(`
      INSERT INTO quality_reasons (code, loss_category_code, sku_id, quality_type, name, sensor_source)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const qrSealLeak = Number(insertQualityReason.run('QLR-L05-01', 'L-05', sku250Id, 'REJECT', 'Seal Vertikal/Horizontal Bocor (Suhu Jaw Tidak Stabil)', 'CNT-R01').lastInsertRowid);
    const qrUnderweight = Number(insertQualityReason.run('QLR-L05-02', 'L-05', sku250Id, 'REWORK', 'Berat Sachet Di Bawah Standar 250g (Auger Bridging)', 'CHECKWEIGHER').lastInsertRowid);
    const qrExpiryBlur = Number(insertQualityReason.run('QLR-L05-03', 'L-05', null, 'REJECT', 'Cetakan Kode Kedaluwarsa / Nomor Lot Buram', 'HMI_MANUAL').lastInsertRowid);
    const qrScrapK3 = Number(insertQualityReason.run('QLR-L06-01', 'L-06', null, 'SCRAP_K3', 'Garam Tumpah Lantai (Scrap K3) & Sachet Trial Awal Pemanasan', 'HMI_MANUAL').lastInsertRowid);

    const insertGuideline = db.prepare(`
      INSERT INTO guidelines (code, title, category, area_id, machine_id, file_name, file_type, file_size_bytes, content_markdown, version, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, 'MARKDOWN', ?, ?, ?, ?)
    `);
    insertGuideline.run(
      'SOP-U2-001',
      'SOP Pengoperasian Standar Mesin VFFS Packing #6 (Garam 250g)',
      'SOP_OPERASIONAL',
      areaId,
      m6Id,
      'SOP-U2-001-Operasional-VFFS-PK06.md',
      4820,
      '1. Pastikan suhu Vertical & Horizontal Heater Sealer stabil pada **165.0 C** (rentang aman 155.0 - 185.0 C) sebelum menekan tombol Start Order.\n2. Periksa kelembapan garam di dalam hopper; pastikan agitator berputar bebas tanpa kerak.\n3. Pantau kecepatan nominal pada **41.67 pcs/menit** (`Ideal Cycle Time 0.024 mnt/pcs`). Bila turun di bawah **38.0 pcs/menit**, periksa ketegangan sabuk penarik film.',
      'v2.3',
      uMgr
    );
    insertGuideline.run(
      'SOP-U2-002',
      'Autonomous Maintenance Harian: Pembersihan Kerak Garam & Pelumasan Anti-Korosi',
      'AUTONOMOUS_MAINTENANCE',
      areaId,
      null,
      'SOP-U2-002-Autonomous-Maintenance-Garam.md',
      5340,
      '1. Lakukan pembersihan kering (*dry brushing*) pada rahang *jaw sealer* dan dudukan pisau *rotary* setiap akhir shift.\n2. Dilarang menyemprotkan air bertekanan dekat panel `PLC-ABC` dan sensor `SEN-T01`.\n3. Periksa indikator vibrasi `SEN-V01`; bila melebihi **4.5 mm/s**, lumasi *housing bearing* dengan *food-grade anti-seize grease*.',
      'v1.8',
      uSpv
    );
    insertGuideline.run(
      'SOP-U2-003',
      'Troubleshooting PLC-ABC D000-D012 & Kalibrasi Termokopel SEN-T01',
      'TROUBLESHOOTING_PLC',
      areaId,
      null,
      'SOP-U2-003-Troubleshooting-PLC-SENT01.md',
      6120,
      '1. Apabila `D000 = 3 (FAULT)` disertai `D001 = 4`, matikan sirine `BUZ-01` melalui tombol **Mute Buzzer** pada `Panel HMI-T7`.\n2. Periksa pembacaan `D005`; jika drop mendadak `< 130 C`, cek sambungan kabel kompensasi termokopel tipe-K dari korosi putih.\n3. Jika indikator koneksi berubah menjadi `SYNCING`, biarkan `GW-100` mengunggah antrean FIFO lokal hingga `13/13` register sinkron.',
      'v1.4',
      uSuper
    );
    insertGuideline.run(
      'SOP-U2-004',
      'Panduan SMED Pergantian Roll Film PE < 10 Menit',
      'USER_MANUAL',
      areaId,
      null,
      'SOP-U2-004-SMED-Roll-Film.md',
      3980,
      '1. Siapkan roll film PE cadangan pada *mandrel* sebelum sisa roll mencapai diameter 12 cm.\n2. Gunakan meja *splicing* magnetik agar penyambungan pita perekat tepat pada tanda registrasi *eyemark*.\n3. Target waktu henti `L-02 Setup & Adjustment` maksimal **8 menit** per pergantian roll.',
      'v2.0',
      uMgr
    );

    const insertPlcState = db.prepare(`
      INSERT INTO plc_register_states (
        machine_id, d000_status, d001_stop_code, d002_speed_pcs_min,
        d003_good_count, d004_auto_reject_count, d005_sealer_temp_c, d006_vibration_mms,
        d007_hmi_defect_count, d008_hmi_scrap_k3_count, d009_minor_stop_flag,
        d010_auto_downtime_flag, d011_buzzer_relay, d012_heartbeat_seq,
        connection_status, sync_progress_registers, diagnostic_message, last_heartbeat_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const nowIso = '2026-10-30T15:10:00Z';
    insertPlcState.run(
      m6Id, 1, 0, 38.4,
      14620, 112, 164.8, 3.8,
      28, 19, 0,
      0, 0, 4821,
      'ONLINE', 13, 'PLC-ABC Normal - Running mendekati ambang Reduced Speed 38.0 pcs/mnt', nowIso
    );
    insertPlcState.run(
      m5Id, 3, 4, 0.0,
      8940, 95, 118.0, 4.9,
      34, 22, 0,
      1, 1, 4190,
      'ONLINE', 13, 'FAULT D001=4: Suhu Vertical Sealer Drop (118.0 C < 155.0 C) & Vibrasi 4.9 mm/s', nowIso
    );
    insertPlcState.run(
      m4Id, 1, 0, 31.8,
      11200, 64, 165.4, 2.6,
      14, 10, 0,
      0, 0, 3104,
      'SYNCING', 8, 'GW-100 sedang memutar ulang buffer FIFO lokal (8/13 register tersinkron)', nowIso
    );
    insertPlcState.run(
      m7Id, 0, 0, 0.0,
      0, 0, 31.5, 0.2,
      0, 0, 0,
      0, 0, 1290,
      'ONLINE', 13, 'STANDBY - Menunggu pembuatan Order Produksi baru pada Panel HMI-T7', nowIso
    );

    const insertShiftReport = db.prepare(`
      INSERT INTO shift_reports (
        report_code, area_id, line_id, machine_id, report_date, shift_number,
        granularity, period_label, phase_tag,
        calendar_minutes, planned_downtime_minutes, loading_minutes,
        breakdown_l01_minutes, breakdown_l01_count, setup_l02_minutes,
        unplanned_downtime_minutes, downtime_freq, operating_minutes,
        minor_stop_l03_minutes, active_operating_minutes,
        reduced_speed_l04_minutes, net_operating_minutes,
        defect_l05_minutes, scrap_l06_minutes, value_added_minutes,
        target_production_pcs, total_processed_pcs, good_output_pcs,
        defect_pcs, scrap_k3_pcs, rework_pcs, avg_speed_pcs_min,
        mttr_minutes, mtbf_minutes,
        availability_pct, performance_pct, quality_pct, oee_pct,
        teep_pct, utility_pct, achievement_pct,
        timeline_segments_json, approval_status, submitted_by, approved_by, approved_at, released_by, released_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `);

    // 5-month empirical baseline from Jurnal Teknika 2023 (Total Loading Time = 144,180 minutes, Mean OEE = 68.01%).
    const baselineMonths = [
      {
        code: 'RPT-202207-PK06-M', date: '2022-07-31', label: 'Juli 2022',
        cal: 33120, plan: 4560, load: 28560, l01: 1190, l01Cnt: 14, l02: 2868, op: 24502,
        l03: 413, activeOp: 24089, totalPcs: 774487, defectPcs: 15607, scrapPcs: 2410,
        a: 85.79, p: 77.16, q: 97.98, oee: 64.86
      },
      {
        code: 'RPT-202208-PK06-M', date: '2022-08-31', label: 'Agustus 2022',
        cal: 34080, plan: 4680, load: 29400, l01: 1420, l01Cnt: 16, l02: 3440, op: 24540,
        l03: 1101, activeOp: 23439, totalPcs: 817533, defectPcs: 15203, scrapPcs: 2480,
        a: 83.47, p: 83.71, q: 98.14, oee: 68.58
      },
      {
        code: 'RPT-202209-PK06-M', date: '2022-09-30', label: 'September 2022',
        cal: 33440, plan: 4600, load: 28840, l01: 1215, l01Cnt: 13, l02: 2958, op: 24667,
        l03: 3980, activeOp: 25786, totalPcs: 855611, defectPcs: 16681, scrapPcs: 2520,
        a: 85.53, p: 79.63, q: 98.05, oee: 66.78
      },
      {
        code: 'RPT-202210-PK06-M', date: '2022-10-31', label: 'Oktober 2022',
        cal: 33600, plan: 4620, load: 28980, l01: 1145, l01Cnt: 12, l02: 2686, op: 25149,
        l03: 4120, activeOp: 24056, totalPcs: 829669, defectPcs: 18509, scrapPcs: 2490,
        a: 86.78, p: 82.77, q: 97.90, oee: 70.32
      },
      {
        code: 'RPT-202211-PK06-M', date: '2022-11-30', label: 'November 2022',
        cal: 32960, plan: 4560, load: 28400, l01: 1040, l01Cnt: 11, l02: 2414, op: 24901,
        l03: 3821, activeOp: 26434, totalPcs: 890536, defectPcs: 16256, scrapPcs: 2475,
        a: 87.68, p: 80.88, q: 98.03, oee: 69.52
      }
    ];

    for (const bm of baselineMonths) {
      const netOp = round2(bm.totalPcs * 0.024);
      const l04 = round2(Math.max(0, bm.op - bm.l03 - netOp));
      const l05 = round2(bm.defectPcs * 0.024);
      const l06 = round2(bm.scrapPcs * 0.024);
      const va = round2(Math.max(0, netOp - l05 - l06));
      const good = bm.totalPcs - bm.defectPcs;
      const target = Math.round(bm.load / 0.024);
      const utility = round2((bm.load / bm.cal) * 100);
      const teep = round2((bm.oee / 100) * (utility / 100) * 100);
      insertShiftReport.run(
        bm.code, areaId, lineAId, m6Id, bm.date, 0,
        'MONTHLY', bm.label, 'BASELINE_2022',
        bm.cal, bm.plan, bm.load,
        bm.l01, bm.l01Cnt, bm.l02,
        bm.l01 + bm.l02, bm.l01Cnt + 22, bm.op,
        bm.l03, bm.activeOp,
        l04, netOp,
        l05, l06, va,
        target, bm.totalPcs, good,
        bm.defectPcs, bm.scrapPcs, 0, round2(bm.totalPcs / bm.activeOp),
        round2(bm.l01 / bm.l01Cnt), round2(bm.op / bm.l01Cnt),
        bm.a, bm.p, bm.q, bm.oee,
        teep, utility, round2((good / target) * 100),
        '[]', 'RELEASED', uLeader, uSpv, `${bm.date}T16:00:00Z`, uMgr, `${bm.date}T17:00:00Z`
      );
    }

    // Golden Fixture 26/05/2023 from Tabel 13 & 14 (OEE = 77.52%).
    const gf26 = calculateOeeMetrics({
      calendarMinutes: 1440,
      plannedDowntimeMinutes: 225,
      loadingMinutes: 1215,
      breakdownL01Minutes: 76,
      breakdownL01Count: 2,
      setupL02Minutes: 35,
      minorStopL03Minutes: 230,
      totalProcessedPcs: 31468,
      goodOutputPcs: 31070,
      defectPcs: 398,
      scrapK3Pcs: 48,
      idealCycleTimeMin: 0.024,
      targetProductionPcs: 34000
    });

    const rpt26Id = Number(
      insertShiftReport.run(
        'RPT-20230526-PK06-D', areaId, lineAId, m6Id, '2023-05-26', 0,
        'DAILY', '26 Mei 2023 (Post-TPM Hari 1)', 'POST_TPM_2023',
        gf26.calendarMinutes, gf26.plannedDowntimeMinutes, gf26.loadingMinutes,
        gf26.breakdownL01Minutes, gf26.breakdownL01Count, gf26.setupL02Minutes,
        gf26.unplannedDowntimeMinutes, 4, gf26.operatingMinutes,
        gf26.minorStopL03Minutes, gf26.activeOperatingMinutes,
        gf26.reducedSpeedL04Minutes, gf26.netOperatingMinutes,
        gf26.defectL05Minutes, gf26.scrapL06Minutes, gf26.valueAddedMinutes,
        gf26.targetProductionPcs, gf26.totalProcessedPcs, gf26.goodOutputPcs,
        gf26.defectPcs, gf26.scrapK3Pcs, 0, gf26.avgSpeedPcsMin,
        gf26.mttrMinutes, gf26.mtbfMinutes,
        gf26.availabilityPct, gf26.performancePct, gf26.qualityPct, gf26.oeePct,
        gf26.teepPct, gf26.utilityPct, gf26.achievementPct,
        JSON.stringify([
          { start: '07:00', end: '07:45', state: 'PLANNED', label: 'Briefing & Pemanasan Sealer' },
          { start: '07:45', end: '11:30', state: 'RUNNING', label: 'Produksi Normal SKU-GRM-250' },
          { start: '11:30', end: '12:46', state: 'DOWNTIME', label: 'Setting Sparepart Pisau Rotary (76m)' },
          { start: '12:46', end: '18:30', state: 'RUNNING', label: 'Produksi Normal Shift 2' },
          { start: '18:30', end: '19:05', state: 'DOWNTIME', label: 'Sanitasi Kerak Garam (35m)' },
          { start: '19:05', end: '23:00', state: 'RUNNING', label: 'Produksi Normal Akhir Shift' }
        ]),
        'RELEASED', uLeader, uSpv, '2023-05-27T08:00:00Z', uMgr, '2023-05-27T09:30:00Z'
      ).lastInsertRowid
    );

    // Post-TPM Day 2 (27/05/2023, OEE = 78.03%).
    const gf27 = calculateOeeMetrics({
      calendarMinutes: 1080,
      plannedDowntimeMinutes: 180,
      loadingMinutes: 900,
      breakdownL01Minutes: 0,
      breakdownL01Count: 0,
      setupL02Minutes: 103,
      minorStopL03Minutes: 56,
      totalProcessedPcs: 27450,
      goodOutputPcs: 27204,
      defectPcs: 246,
      scrapK3Pcs: 77,
      idealCycleTimeMin: 0.024,
      targetProductionPcs: 29000
    });

    const rpt27Id = Number(
      insertShiftReport.run(
        'RPT-20230527-PK06-D', areaId, lineAId, m6Id, '2023-05-27', 0,
        'DAILY', '27 Mei 2023 (Post-TPM Hari 2)', 'POST_TPM_2023',
        gf27.calendarMinutes, gf27.plannedDowntimeMinutes, gf27.loadingMinutes,
        gf27.breakdownL01Minutes, gf27.breakdownL01Count, gf27.setupL02Minutes,
        gf27.unplannedDowntimeMinutes, 2, gf27.operatingMinutes,
        gf27.minorStopL03Minutes, gf27.activeOperatingMinutes,
        gf27.reducedSpeedL04Minutes, gf27.netOperatingMinutes,
        gf27.defectL05Minutes, gf27.scrapL06Minutes, gf27.valueAddedMinutes,
        gf27.targetProductionPcs, gf27.totalProcessedPcs, gf27.goodOutputPcs,
        gf27.defectPcs, gf27.scrapK3Pcs, 0, gf27.avgSpeedPcsMin,
        gf27.mttrMinutes, gf27.mtbfMinutes,
        gf27.availabilityPct, gf27.performancePct, gf27.qualityPct, gf27.oeePct,
        gf27.teepPct, gf27.utilityPct, gf27.achievementPct,
        '[]', 'RELEASED', uLeader, uSpv, '2023-05-28T08:00:00Z', uMgr, '2023-05-28T09:15:00Z'
      ).lastInsertRowid
    );

    // Recent October 2026 daily trend rows for the OEE Heatmap & Trend analytics.
    const recentDays = [
      { d: '2026-10-24', s: 1, m: m6Id, l: lineAId, l01: 12, l01c: 1, l02: 18, l03: 22, pcs: 13840, def: 132, scr: 24, st: 'RELEASED' },
      { d: '2026-10-25', s: 1, m: m6Id, l: lineAId, l01: 0, l01c: 0, l02: 16, l03: 18, pcs: 14680, def: 118, scr: 18, st: 'RELEASED' },
      { d: '2026-10-26', s: 1, m: m6Id, l: lineAId, l01: 18, l01c: 1, l02: 14, l03: 25, pcs: 13520, def: 145, scr: 21, st: 'RELEASED' },
      { d: '2026-10-27', s: 1, m: m6Id, l: lineAId, l01: 0, l01c: 0, l02: 12, l03: 15, pcs: 15120, def: 108, scr: 15, st: 'RELEASED' },
      { d: '2026-10-28', s: 1, m: m6Id, l: lineAId, l01: 8, l01c: 1, l02: 15, l03: 19, pcs: 14450, def: 124, scr: 17, st: 'RELEASED' },
      { d: '2026-10-29', s: 1, m: m6Id, l: lineAId, l01: 0, l01c: 0, l02: 10, l03: 12, pcs: 15640, def: 96, scr: 14, st: 'RELEASED' }
    ];

    for (const rd of recentDays) {
      const m = calculateOeeMetrics({
        calendarMinutes: 480,
        plannedDowntimeMinutes: 45,
        breakdownL01Minutes: rd.l01,
        breakdownL01Count: rd.l01c,
        setupL02Minutes: rd.l02,
        minorStopL03Minutes: rd.l03,
        totalProcessedPcs: rd.pcs,
        defectPcs: rd.def,
        scrapK3Pcs: rd.scr,
        idealCycleTimeMin: 0.024,
        targetProductionPcs: 16000
      });
      insertShiftReport.run(
        `RPT-${rd.d.replaceAll('-', '')}-PK06-S${rd.s}`, areaId, rd.l, rd.m, rd.d, rd.s,
        'SHIFT', `${rd.d} Shift ${rd.s}`, 'LIVE',
        m.calendarMinutes, m.plannedDowntimeMinutes, m.loadingMinutes,
        m.breakdownL01Minutes, m.breakdownL01Count, m.setupL02Minutes,
        m.unplannedDowntimeMinutes, rd.l01c + 1, m.operatingMinutes,
        m.minorStopL03Minutes, m.activeOperatingMinutes,
        m.reducedSpeedL04Minutes, m.netOperatingMinutes,
        m.defectL05Minutes, m.scrapL06Minutes, m.valueAddedMinutes,
        m.targetProductionPcs, m.totalProcessedPcs, m.goodOutputPcs,
        m.defectPcs, m.scrapK3Pcs, 0, m.avgSpeedPcsMin,
        m.mttrMinutes, m.mtbfMinutes,
        m.availabilityPct, m.performancePct, m.qualityPct, m.oeePct,
        m.teepPct, m.utilityPct, m.achievementPct,
        '[]', rd.st, uOpSlamet, uSpv, `${rd.d}T15:20:00Z`, uMgr, `${rd.d}T16:00:00Z`
      );
    }

    // Active operational shift reports for 2026-10-30 covering APPROVED (ready for Release) and NEEDS_APPROVAL workflows.
    const s1Pk06 = calculateOeeMetrics({
      calendarMinutes: 480,
      plannedDowntimeMinutes: 45,
      breakdownL01Minutes: 0,
      breakdownL01Count: 0,
      setupL02Minutes: 14,
      minorStopL03Minutes: 16,
      totalProcessedPcs: 15240,
      defectPcs: 118,
      scrapK3Pcs: 16,
      reworkPcs: 22,
      idealCycleTimeMin: 0.024,
      targetProductionPcs: 16000
    });
    const rptLivePk06S1 = Number(
      insertShiftReport.run(
        'RPT-20261030-PK06-S1', areaId, lineAId, m6Id, '2026-10-30', 1,
        'SHIFT', '30 Okt 2026 - Shift 1 (Pagi)', 'LIVE',
        s1Pk06.calendarMinutes, s1Pk06.plannedDowntimeMinutes, s1Pk06.loadingMinutes,
        s1Pk06.breakdownL01Minutes, s1Pk06.breakdownL01Count, s1Pk06.setupL02Minutes,
        s1Pk06.unplannedDowntimeMinutes, 1, s1Pk06.operatingMinutes,
        s1Pk06.minorStopL03Minutes, s1Pk06.activeOperatingMinutes,
        s1Pk06.reducedSpeedL04Minutes, s1Pk06.netOperatingMinutes,
        s1Pk06.defectL05Minutes, s1Pk06.scrapL06Minutes, s1Pk06.valueAddedMinutes,
        s1Pk06.targetProductionPcs, s1Pk06.totalProcessedPcs, s1Pk06.goodOutputPcs,
        s1Pk06.defectPcs, s1Pk06.scrapK3Pcs, s1Pk06.reworkPcs, s1Pk06.avgSpeedPcsMin,
        s1Pk06.mttrMinutes, s1Pk06.mtbfMinutes,
        s1Pk06.availabilityPct, s1Pk06.performancePct, s1Pk06.qualityPct, s1Pk06.oeePct,
        s1Pk06.teepPct, s1Pk06.utilityPct, s1Pk06.achievementPct,
        JSON.stringify([
          { start: '07:00', end: '07:15', state: 'PLANNED', label: 'Briefing & Pemanasan Jaw Sealer' },
          { start: '07:15', end: '10:20', state: 'RUNNING', label: 'Produksi Normal 40.5 pcs/mnt' },
          { start: '10:20', end: '10:34', state: 'DOWNTIME', label: 'Pergantian Roll Film PE SMED (14m)' },
          { start: '10:34', end: '12:00', state: 'RUNNING', label: 'Produksi Normal 41.0 pcs/mnt' },
          { start: '12:00', end: '12:30', state: 'PLANNED', label: 'Istirahat Terjadwal Shift 1' },
          { start: '12:30', end: '15:00', state: 'RUNNING', label: 'Produksi Normal Akhir Shift 1' }
        ]),
        'APPROVED', uOpSlamet, uSpv, '2026-10-30T15:05:00Z', null, null
      ).lastInsertRowid
    );

    const s2Pk06 = calculateOeeMetrics({
      calendarMinutes: 480,
      plannedDowntimeMinutes: 45,
      breakdownL01Minutes: 12,
      breakdownL01Count: 1,
      setupL02Minutes: 10,
      minorStopL03Minutes: 14,
      totalProcessedPcs: 14760,
      defectPcs: 140,
      scrapK3Pcs: 19,
      reworkPcs: 18,
      idealCycleTimeMin: 0.024,
      targetProductionPcs: 16000
    });
    const rptLivePk06S2 = Number(
      insertShiftReport.run(
        'RPT-20261030-PK06-S2', areaId, lineAId, m6Id, '2026-10-30', 2,
        'SHIFT', '30 Okt 2026 - Shift 2 (Sore)', 'LIVE',
        s2Pk06.calendarMinutes, s2Pk06.plannedDowntimeMinutes, s2Pk06.loadingMinutes,
        s2Pk06.breakdownL01Minutes, s2Pk06.breakdownL01Count, s2Pk06.setupL02Minutes,
        s2Pk06.unplannedDowntimeMinutes, 2, s2Pk06.operatingMinutes,
        s2Pk06.minorStopL03Minutes, s2Pk06.activeOperatingMinutes,
        s2Pk06.reducedSpeedL04Minutes, s2Pk06.netOperatingMinutes,
        s2Pk06.defectL05Minutes, s2Pk06.scrapL06Minutes, s2Pk06.valueAddedMinutes,
        s2Pk06.targetProductionPcs, s2Pk06.totalProcessedPcs, s2Pk06.goodOutputPcs,
        s2Pk06.defectPcs, s2Pk06.scrapK3Pcs, s2Pk06.reworkPcs, s2Pk06.avgSpeedPcsMin,
        s2Pk06.mttrMinutes, s2Pk06.mtbfMinutes,
        s2Pk06.availabilityPct, s2Pk06.performancePct, s2Pk06.qualityPct, s2Pk06.oeePct,
        s2Pk06.teepPct, s2Pk06.utilityPct, s2Pk06.achievementPct,
        JSON.stringify([
          { start: '15:00', end: '15:15', state: 'PLANNED', label: 'Serah Terima Shift & Cek Sealer' },
          { start: '15:15', end: '17:40', state: 'RUNNING', label: 'Produksi SKU-GRM-250' },
          { start: '17:40', end: '17:52', state: 'DOWNTIME', label: 'Kalibrasi Termokopel SEN-T01 (12m)' },
          { start: '17:52', end: '19:30', state: 'SLOW', label: 'Reduced Speed 38.4 pcs/mnt' },
          { start: '19:30', end: '19:40', state: 'DOWNTIME', label: 'Ganti Roll Film PE (10m)' },
          { start: '19:40', end: '22:30', state: 'RUNNING', label: 'Produksi Normal' }
        ]),
        'NEEDS_APPROVAL', uOpRini, null, null, null, null
      ).lastInsertRowid
    );

    const s2Pk05 = calculateOeeMetrics({
      calendarMinutes: 480,
      plannedDowntimeMinutes: 45,
      breakdownL01Minutes: 42,
      breakdownL01Count: 2,
      setupL02Minutes: 19,
      minorStopL03Minutes: 28,
      totalProcessedPcs: 9069,
      defectPcs: 129,
      scrapK3Pcs: 22,
      reworkPcs: 15,
      idealCycleTimeMin: 0.024,
      targetProductionPcs: 15000
    });
    const rptLivePk05S2 = Number(
      insertShiftReport.run(
        'RPT-20261030-PK05-S2', areaId, lineAId, m5Id, '2026-10-30', 2,
        'SHIFT', '30 Okt 2026 - Shift 2 (Mesin #5)', 'LIVE',
        s2Pk05.calendarMinutes, s2Pk05.plannedDowntimeMinutes, s2Pk05.loadingMinutes,
        s2Pk05.breakdownL01Minutes, s2Pk05.breakdownL01Count, s2Pk05.setupL02Minutes,
        s2Pk05.unplannedDowntimeMinutes, 3, s2Pk05.operatingMinutes,
        s2Pk05.minorStopL03Minutes, s2Pk05.activeOperatingMinutes,
        s2Pk05.reducedSpeedL04Minutes, s2Pk05.netOperatingMinutes,
        s2Pk05.defectL05Minutes, s2Pk05.scrapL06Minutes, s2Pk05.valueAddedMinutes,
        s2Pk05.targetProductionPcs, s2Pk05.totalProcessedPcs, s2Pk05.goodOutputPcs,
        s2Pk05.defectPcs, s2Pk05.scrapK3Pcs, s2Pk05.reworkPcs, s2Pk05.avgSpeedPcsMin,
        s2Pk05.mttrMinutes, s2Pk05.mtbfMinutes,
        s2Pk05.availabilityPct, s2Pk05.performancePct, s2Pk05.qualityPct, s2Pk05.oeePct,
        s2Pk05.teepPct, s2Pk05.utilityPct, s2Pk05.achievementPct,
        JSON.stringify([
          { start: '15:00', end: '15:19', state: 'DOWNTIME', label: 'Sanitasi Tanpa Order (19m)' },
          { start: '15:19', end: '18:10', state: 'RUNNING', label: 'Produksi SKU-GRM-250' },
          { start: '18:10', end: '18:34', state: 'DOWNTIME', label: 'Vibrasi Bearing Tinggi (24m)' },
          { start: '18:34', end: '20:42', state: 'RUNNING', label: 'Produksi Lambat 35.8 pcs/mnt' },
          { start: '20:42', end: '21:00', state: 'FAULT', label: 'FAULT D001=4 Suhu Sealer Drop 118C (Unclassified)' }
        ]),
        'NEEDS_APPROVAL', uOpWahyu, null, null, null, null
      ).lastInsertRowid
    );

    const s2Pk04 = calculateOeeMetrics({
      calendarMinutes: 480,
      plannedDowntimeMinutes: 45,
      breakdownL01Minutes: 0,
      breakdownL01Count: 0,
      setupL02Minutes: 16,
      minorStopL03Minutes: 15,
      totalProcessedPcs: 11278,
      defectPcs: 78,
      scrapK3Pcs: 10,
      idealCycleTimeMin: 0.030,
      targetProductionPcs: 13000
    });
    const rptLivePk04S2 = Number(
      insertShiftReport.run(
        'RPT-20261030-PK04-S2', areaId, lineBId, m4Id, '2026-10-30', 2,
        'SHIFT', '30 Okt 2026 - Shift 2 (Mesin #4)', 'LIVE',
        s2Pk04.calendarMinutes, s2Pk04.plannedDowntimeMinutes, s2Pk04.loadingMinutes,
        s2Pk04.breakdownL01Minutes, s2Pk04.breakdownL01Count, s2Pk04.setupL02Minutes,
        s2Pk04.unplannedDowntimeMinutes, 1, s2Pk04.operatingMinutes,
        s2Pk04.minorStopL03Minutes, s2Pk04.activeOperatingMinutes,
        s2Pk04.reducedSpeedL04Minutes, s2Pk04.netOperatingMinutes,
        s2Pk04.defectL05Minutes, s2Pk04.scrapL06Minutes, s2Pk04.valueAddedMinutes,
        s2Pk04.targetProductionPcs, s2Pk04.totalProcessedPcs, s2Pk04.goodOutputPcs,
        s2Pk04.defectPcs, s2Pk04.scrapK3Pcs, 0, s2Pk04.avgSpeedPcsMin,
        s2Pk04.mttrMinutes, s2Pk04.mtbfMinutes,
        s2Pk04.availabilityPct, s2Pk04.performancePct, s2Pk04.qualityPct, s2Pk04.oeePct,
        s2Pk04.teepPct, s2Pk04.utilityPct, s2Pk04.achievementPct,
        '[]', 'NEEDS_APPROVAL', uLeader, null, null, null, null
      ).lastInsertRowid
    );

    const insertOrder = db.prepare(`
      INSERT INTO production_orders (
        order_no, machine_id, sku_id, shift_report_id, production_date, shift_number,
        target_qty_pcs, total_processed_pcs, good_qty_pcs, auto_reject_pcs,
        manual_defect_pcs, scrap_k3_pcs, rework_pcs, status, started_at, ended_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ord26 = Number(
      insertOrder.run(
        'PO-20230526-PK06-01', m6Id, sku250Id, rpt26Id, '2023-05-26', 1,
        34000, 31468, 31070, 290, 108, 48, 0, 'COMPLETED',
        '2023-05-26T00:00:00Z', '2023-05-26T23:59:00Z', uOpSlamet
      ).lastInsertRowid
    );
    const ordLivePk06S1 = Number(
      insertOrder.run(
        'PO-20261030-PK06-S1', m6Id, sku250Id, rptLivePk06S1, '2026-10-30', 1,
        16000, 15240, 15122, 88, 30, 16, 22, 'COMPLETED',
        '2026-10-30T00:00:00Z', '2026-10-30T08:00:00Z', uOpSlamet
      ).lastInsertRowid
    );
    const ordLivePk06S2 = Number(
      insertOrder.run(
        'PO-20261030-PK06-S2', m6Id, sku250Id, rptLivePk06S2, '2026-10-30', 2,
        16000, 14760, 14620, 112, 28, 19, 18, 'RUNNING',
        '2026-10-30T08:00:00Z', null, uOpRini
      ).lastInsertRowid
    );
    const ordLivePk05S2 = Number(
      insertOrder.run(
        'PO-20261030-PK05-S2', m5Id, sku250Id, rptLivePk05S2, '2026-10-30', 2,
        15000, 9069, 8940, 95, 34, 22, 15, 'PAUSED',
        '2026-10-30T08:19:00Z', null, uOpWahyu
      ).lastInsertRowid
    );
    const ordLivePk04S2 = Number(
      insertOrder.run(
        'PO-20261030-PK04-S2', m4Id, sku500Id, rptLivePk04S2, '2026-10-30', 2,
        13000, 11278, 11200, 64, 14, 10, 0, 'RUNNING',
        '2026-10-30T08:00:00Z', null, uLeader
      ).lastInsertRowid
    );

    const insertBatchReport = db.prepare(`
      INSERT INTO product_batch_reports (
        batch_code, shift_report_id, production_order_id, sku_id, machine_id,
        period_label, report_date, shift_number,
        loading_minutes, operating_minutes, target_pcs, total_processed_pcs,
        good_output_pcs, good_output_cartons, good_output_kg,
        defect_pcs, scrap_k3_pcs, rework_pcs, downtime_minutes, downtime_freq,
        availability_pct, performance_pct, quality_pct, oee_pct,
        approval_status, approved_by, approved_at, released_by, released_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sku250Ref = { pcs_per_secondary: 10, pcs_per_tertiary: 40, net_weight_grams: 250 };
    const sku500Ref = { pcs_per_secondary: 10, pcs_per_tertiary: 20, net_weight_grams: 500 };

    const u26 = convertPackagingUnits(31070, sku250Ref);
    insertBatchReport.run(
      'BCH-20230526-GRM250', rpt26Id, ord26, sku250Id, m6Id,
      '26 Mei 2023 - Garam 250g', '2023-05-26', 1,
      1215, 1104, 34000, 31468,
      31070, u26.tertiary, u26.weightKg,
      398, 48, 0, 111, 4,
      gf26.availabilityPct, gf26.performancePct, gf26.qualityPct, gf26.oeePct,
      'RELEASED', uSpv, '2023-05-27T08:00:00Z', uMgr, '2023-05-27T09:30:00Z'
    );

    const uS1 = convertPackagingUnits(15122, sku250Ref);
    insertBatchReport.run(
      'BCH-20261030-PK06-S1', rptLivePk06S1, ordLivePk06S1, sku250Id, m6Id,
      '30 Okt 2026 Shift 1 - Garam 250g', '2026-10-30', 1,
      s1Pk06.loadingMinutes, s1Pk06.operatingMinutes, 16000, 15240,
      15122, uS1.tertiary, uS1.weightKg,
      118, 16, 22, 14, 1,
      s1Pk06.availabilityPct, s1Pk06.performancePct, s1Pk06.qualityPct, s1Pk06.oeePct,
      'APPROVED', uSpv, '2026-10-30T15:05:00Z', null, null
    );

    const uS2 = convertPackagingUnits(14620, sku250Ref);
    insertBatchReport.run(
      'BCH-20261030-PK06-S2', rptLivePk06S2, ordLivePk06S2, sku250Id, m6Id,
      '30 Okt 2026 Shift 2 - Garam 250g', '2026-10-30', 2,
      s2Pk06.loadingMinutes, s2Pk06.operatingMinutes, 16000, 14760,
      14620, uS2.tertiary, uS2.weightKg,
      140, 19, 18, 22, 2,
      s2Pk06.availabilityPct, s2Pk06.performancePct, s2Pk06.qualityPct, s2Pk06.oeePct,
      'NEEDS_APPROVAL', null, null, null, null
    );

    const uPk05 = convertPackagingUnits(8940, sku250Ref);
    insertBatchReport.run(
      'BCH-20261030-PK05-S2', rptLivePk05S2, ordLivePk05S2, sku250Id, m5Id,
      '30 Okt 2026 Shift 2 - Garam 250g (Mesin #5)', '2026-10-30', 2,
      s2Pk05.loadingMinutes, s2Pk05.operatingMinutes, 15000, 9069,
      8940, uPk05.tertiary, uPk05.weightKg,
      129, 22, 15, 61, 3,
      s2Pk05.availabilityPct, s2Pk05.performancePct, s2Pk05.qualityPct, s2Pk05.oeePct,
      'NEEDS_APPROVAL', null, null, null, null
    );

    const uPk04 = convertPackagingUnits(11200, sku500Ref);
    insertBatchReport.run(
      'BCH-20261030-PK04-S2', rptLivePk04S2, ordLivePk04S2, sku500Id, m4Id,
      '30 Okt 2026 Shift 2 - Garam 500g (Mesin #4)', '2026-10-30', 2,
      s2Pk04.loadingMinutes, s2Pk04.operatingMinutes, 13000, 11278,
      11200, uPk04.tertiary, uPk04.weightKg,
      78, 10, 0, 16, 1,
      s2Pk04.availabilityPct, s2Pk04.performancePct, s2Pk04.qualityPct, s2Pk04.oeePct,
      'NEEDS_APPROVAL', null, null, null, null
    );

    // 4 Kaizen tickets covering all valid combinations of status & verification_status.
    const insertKaizen = db.prepare(`
      INSERT INTO kaizen_tickets (
        code, kaizen_type, status, verification_status,
        area_id, line_id, machine_id, sub_machine_id,
        fishbone_factor, criteria, loss_category_code,
        issue_title, issue_description, issue_docs_json,
        assigned_department, assigned_pic_ids_json, reviewer_id,
        start_date, due_date,
        root_cause, solution_type, improvement_description, improvement_docs_json,
        improvement_by, improvement_date, lead_time_days,
        before_telemetry_json, after_telemetry_json,
        revision_reason, verified_by, verified_at, source_channel, created_by
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    const kzn1Id = Number(
      insertKaizen.run(
        'KZN-2026-01', 'MAINTENANCE', 'OPEN', 'NOT_OK',
        areaId, lineAId, m5Id, subMap[m5Id].sealer,
        'MESIN', 'Breakdown Elimination', 'L-01',
        'Suhu Vertical Heater Sealer Mesin #5 Drop ke 118.0 C Akibat Korosi Termokopel SEN-T01',
        'Pembacaan D005 turun dari setpoint 165.0 C ke 118.0 C dan memicu D000=3 FAULT (D001=4). Terlihat kerak garam putih menumpuk pada selongsong kabel termokopel.',
        JSON.stringify([{ name: 'foto-kerak-sent01-pk05.jpg', note: 'Kondisi terminal termokopel berkerak garam' }]),
        'Maintenance & Engineering', JSON.stringify([uTech]), uSpv,
        '2026-10-30', '2026-11-01',
        '', null, '', '[]',
        null, null, null,
        JSON.stringify({ sealerTempC: 118.0, oeePct: 58.6, defectRatePct: 1.42 }),
        '{}',
        '', null, null, 'HMI', uOpWahyu
      ).lastInsertRowid
    );

    const kzn2Id = Number(
      insertKaizen.run(
        'KZN-2026-02', 'MAINTENANCE', 'CLOSED', 'OK',
        areaId, lineAId, m6Id, subMap[m6Id].cutter,
        'LINGKUNGAN', 'Reduced Speed Mitigation', 'L-04',
        'Pemasangan Seal Pelindung Debu Garam & Pelumasan Bearing Utama Rotary Cutter Mesin #6',
        'Vibrasi SEN-V01 sempat menyentuh 5.4 mm/s sehingga kecepatan aktual tertahan di 36.2 pcs/mnt (L-04 Reduced Speed).',
        JSON.stringify([{ name: 'before-bearing-pk06.jpg', note: 'Debu garam masuk ke celah housing bearing' }]),
        'Maintenance & Engineering', JSON.stringify([uTech]), uSpv,
        '2026-10-22', '2026-10-25',
        'Celah rumah bearing utama belum memakai double-lip V-ring sehingga partikel NaCl mengeringkan pelumas.',
        'PERMANENT',
        'Mengganti bearing utama, memasang pelindung V-ring karet viton tahan garam, serta menjadwalkan greasing food-grade tiap 72 jam.',
        JSON.stringify([{ name: 'after-vring-pk06.jpg', note: 'Vibrasi turun stabil ke 3.8 mm/s' }]),
        uTech, '2026-10-24', 2.0,
        JSON.stringify({ avgSpeedPpm: 36.2, vibrationMms: 5.4, oeePct: 68.01 }),
        JSON.stringify({ avgSpeedPpm: 40.8, vibrationMms: 3.8, oeePct: 77.78 }),
        '', uSpv, '2026-10-25T10:15:00Z', 'WEB', uSpv
      ).lastInsertRowid
    );

    const kzn3Id = Number(
      insertKaizen.run(
        'KZN-2026-03', 'PRODUCTION', 'CLOSED', 'NOT_VERIFIED',
        areaId, lineAId, m6Id, subMap[m6Id].auger,
        'MATERIAL', 'Minor Stoppage Reduction', 'L-03',
        'Penambahan Sekat Anti-Clumping pada Hopper Auger Filler Garam Halus 250g',
        'Terjadi 6 kali Small Stop (< 3 menit) per shift akibat garam lembap membentuk jembatan di mulut corong auger.',
        JSON.stringify([{ name: 'hopper-bridging.jpg', note: 'Gumpalan garam di bibir corong auger' }]),
        'Production Unit 2', JSON.stringify([uLeader, uOpSlamet]), uSpv,
        '2026-10-28', '2026-10-31',
        'Sudut jatuh garam lembap terlalu curam tanpa pemecah aliran di atas ulir auger.',
        'PERMANENT',
        'Memasang kisi pemecah gumpalan stainless SUS316L yang terhubung ke poros agitator hopper.',
        JSON.stringify([{ name: 'baffle-sus316l-installed.jpg', note: 'Kisi SUS316L terpasang pada hopper #6' }]),
        uLeader, '2026-10-30', 2.0,
        JSON.stringify({ minorStopMinutesPerShift: 26, smallStopCount: 6 }),
        JSON.stringify({ minorStopMinutesPerShift: 14, smallStopCount: 2 }),
        '', null, null, 'HMI', uOpSlamet
      ).lastInsertRowid
    );

    const kzn4Id = Number(
      insertKaizen.run(
        'KZN-2026-04', 'PRODUCTION', 'REVISE', 'NOT_OK',
        areaId, lineBId, m4Id, subMap[m4Id].sealer,
        'METODE', 'SMED Setup Reduction', 'L-02',
        'Standarisasi Tanda Eyemark pada Meja Splicing Pergantian Roll Film Pouch 500g',
        'Waktu pergantian roll film Pouch 500g masih memakan 16 menit karena penyesuaian ulang sensor eyemark.',
        JSON.stringify([{ name: 'splicing-lineb.jpg', note: 'Posisi sambungan pita belum sejajar eyemark' }]),
        'Production Unit 2', JSON.stringify([uLeader]), uSpv,
        '2026-10-27', '2026-11-02',
        'Tidak ada garis acuan jarak potong ke sensor optik pada papan splicing.',
        'TEMPORARY',
        'Menempelkan pita penanda jarak eyemark pada papan splicing.',
        '[]',
        uLeader, '2026-10-29', 2.0,
        JSON.stringify({ setupMinutesPerRoll: 16 }),
        JSON.stringify({ setupMinutesPerRoll: 11 }),
        'Mohon ganti pita tempel sementara dengan ukiran garis permanen pada pelat stainless dan lampirkan foto bukti setelah diuji 3 kali ganti roll.',
        uSpv, '2026-10-29T16:40:00Z', 'WEB', uLeader
      ).lastInsertRowid
    );

    const insertComment = db.prepare(`
      INSERT INTO kaizen_comments (kaizen_id, author_id, comment_text, created_at)
      VALUES (?, ?, ?, ?)
    `);
    insertComment.run(kzn1Id, uOpWahyu, 'Sirine BUZ-01 sudah dimatikan dari HMI-T7, menunggu tim Maintenance cek termokopel SEN-T01.', '2026-10-30T14:46:00Z');
    insertComment.run(kzn1Id, uTech, 'Sparepart termokopel tipe-K lapis teflon sudah disiapkan, menuju Line Packing A sekarang.', '2026-10-30T14:52:00Z');
    insertComment.run(kzn3Id, uLeader, 'Sudah diuji selama Shift 1 dan Shift 2, frekuensi small stop turun signifikan. Mohon verifikasi SPV.', '2026-10-30T15:00:00Z');
    insertComment.run(kzn4Id, uSpv, 'Dikembalikan ke status REVISE agar garis acuan dibuat permanen tahan lap alkohol/garam.', '2026-10-29T16:41:00Z');

    const insertDowntime = db.prepare(`
      INSERT INTO downtime_events (
        downtime_code, machine_id, sub_machine_id, production_order_id, shift_report_id,
        plc_trigger_register, plc_stop_code, is_small_stop, is_planned,
        loss_category_code, reason_id, detail_reason, action_tags_json,
        classification_status, buzzer_muted_at, start_time, end_time, duration_minutes,
        input_by, last_corrected_by, corrected_at, escalated_kaizen_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDowntime.run(
      'DT-2023-0526-01', m6Id, subMap[m6Id].cutter, ord26, rpt26Id,
      'D010=1 (D001=3)', 3, 0, 0,
      'L-01', dtBladeAdj, 'Setting sparepart pisau rotary & pembersihan kristal garam keras',
      JSON.stringify(['Setel celah anvil 0.05 mm', 'Bersihkan kristal garam']),
      'CLASSIFIED', '2023-05-26T11:30:20Z', '2023-05-26T11:30:00Z', '2023-05-26T12:46:00Z', 76.0,
      uOpSlamet, null, null, null
    );
    insertDowntime.run(
      'DT-2023-0526-02', m6Id, subMap[m6Id].sealer, ord26, rpt26Id,
      'D010=1 (D001=3)', 3, 0, 0,
      'L-02', dtBladeAdj, 'Sanitasi kerak garam pada rahang jaw sealer vertikal',
      JSON.stringify(['Dry brushing jaw sealer']),
      'CLASSIFIED', '2023-05-26T18:30:18Z', '2023-05-26T18:30:00Z', '2023-05-26T19:05:00Z', 35.0,
      uOpRini, null, null, null
    );

    insertDowntime.run(
      'DT-2026-001', m6Id, subMap[m6Id].cutter, ordLivePk06S1, rptLivePk06S1,
      'D010=1 (D001=2)', 2, 0, 0,
      'L-02', dtRollSetup, 'Pergantian roll film PE 250g dengan meja splicing SMED',
      JSON.stringify(['Gunakan jig SMED splicing', 'Uji 3 sachet pertama']),
      'CLASSIFIED', '2026-10-30T03:20:15Z', '2026-10-30T03:20:00Z', '2026-10-30T03:34:00Z', 14.0,
      uOpSlamet, null, null, null
    );
    insertDowntime.run(
      'DT-2026-002', m6Id, subMap[m6Id].sealer, ordLivePk06S2, rptLivePk06S2,
      'D010=1 (D001=4)', 4, 0, 0,
      'L-01', dtHeaterFault, 'Pembersihan kerak garam pada ujung sensor SEN-T01 dan kalibrasi ulang PID 165C',
      JSON.stringify(['Cek kabel termokopel SEN-T01', 'Bersihkan kerak garam pada jaw sealer']),
      'CLASSIFIED', '2026-10-30T10:40:12Z', '2026-10-30T10:40:00Z', '2026-10-30T10:52:00Z', 12.0,
      uOpRini, null, null, null
    );
    insertDowntime.run(
      'DT-2026-003', m6Id, subMap[m6Id].cutter, ordLivePk06S2, rptLivePk06S2,
      'D010=1 (D001=2)', 2, 0, 0,
      'L-02', dtRollSetup, 'Pergantian roll film PE kedua Shift 2',
      JSON.stringify(['Gunakan jig SMED splicing']),
      'CLASSIFIED', '2026-10-30T12:30:10Z', '2026-10-30T12:30:00Z', '2026-10-30T12:40:00Z', 10.0,
      uOpRini, null, null, null
    );
    insertDowntime.run(
      'DT-2026-004', m6Id, subMap[m6Id].auger, ordLivePk06S2, rptLivePk06S2,
      'D009=1 (SMALL_STOP)', 6, 1, 0,
      'L-03', dtSaltClump, 'Small stop 2.4 menit: gumpalan garam lembap pada bibir hopper dipecah manual',
      JSON.stringify(['Aktifkan agitator hopper']),
      'CLASSIFIED', null, '2026-10-30T13:15:00Z', '2026-10-30T13:17:24Z', 2.4,
      uOpRini, null, null, null
    );

    // Without No. Production downtime on Mesin Packing #5 (occurs before order PO-20261030-PK05-S2 started).
    insertDowntime.run(
      'DT-2026-005', m5Id, subMap[m5Id].sealer, null, rptLivePk05S2,
      'D010=1 (WITHOUT_PO)', 3, 0, 0,
      'L-02', dtBladeAdj, 'Sanitasi kerak garam sebelum order produksi Shift 2 dibuka (Without No. Production)',
      JSON.stringify(['Bersihkan kristal garam pada dudukan pisau']),
      'CLASSIFIED', '2026-10-30T08:00:25Z', '2026-10-30T08:00:00Z', '2026-10-30T08:19:00Z', 19.0,
      uOpWahyu, null, null, null
    );
    insertDowntime.run(
      'DT-2026-006', m5Id, subMap[m5Id].cutter, ordLivePk05S2, rptLivePk05S2,
      'D010=1 (D001=7)', 7, 0, 0,
      'L-01', dtBearingFault, 'Pengecekan vibrasi bearing utama 4.9 mm/s dan penambahan grease anti-korosi',
      JSON.stringify(['Ukur vibrasi bearing utama']),
      'CLASSIFIED', '2026-10-30T11:10:14Z', '2026-10-30T11:10:00Z', '2026-10-30T11:34:00Z', 24.0,
      uOpWahyu, null, null, null
    );

    // Active UNCLASSIFIED Auto-Downtime on Mesin Packing #5 blocking Shift Approval & triggering HMI Interlock + BUZ-01!
    insertDowntime.run(
      'DT-2026-007', m5Id, subMap[m5Id].sealer, ordLivePk05S2, rptLivePk05S2,
      'D000=3|D010=1 (D001=4)', 4, 0, 0,
      null, null, '',
      '[]',
      'UNCLASSIFIED', null, '2026-10-30T13:42:00Z', null, 18.0,
      null, null, null, kzn1Id
    );

    const insertQualityEvent = db.prepare(`
      INSERT INTO quality_loss_events (
        machine_id, production_order_id, shift_report_id, quality_reason_id,
        loss_category_code, quality_type, qty_actual_unit, actual_unit_name,
        qty_pcs, weight_kg, time_loss_minutes, source_channel,
        sealer_temp_c_snapshot, recorded_by, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQualityEvent.run(m6Id, ordLivePk06S2, rptLivePk06S2, qrSealLeak, 'L-05', 'REJECT', 112, 'pcs', 112, 28.0, round2(112 * 0.024), 'CNT-R01', 164.2, null, '2026-10-30T13:30:00Z');
    insertQualityEvent.run(m6Id, ordLivePk06S2, rptLivePk06S2, qrExpiryBlur, 'L-05', 'REJECT', 28, 'pcs', 28, 7.0, round2(28 * 0.024), 'HMI-T7', 164.8, uOpRini, '2026-10-30T13:45:00Z');
    insertQualityEvent.run(m6Id, ordLivePk06S2, rptLivePk06S2, qrUnderweight, 'L-05', 'REWORK', 18, 'pcs', 18, 4.5, round2(18 * 0.024), 'HMI-T7', 165.0, uOpRini, '2026-10-30T14:00:00Z');
    insertQualityEvent.run(m6Id, ordLivePk06S2, rptLivePk06S2, qrScrapK3, 'L-06', 'SCRAP_K3', 19, 'pcs', 19, 4.75, round2(19 * 0.024), 'HMI-T7', 158.0, uOpRini, '2026-10-30T08:18:00Z');
    insertQualityEvent.run(m5Id, ordLivePk05S2, rptLivePk05S2, qrSealLeak, 'L-05', 'REJECT', 95, 'pcs', 95, 23.75, round2(95 * 0.024), 'CNT-R01', 124.5, null, '2026-10-30T13:40:00Z');
    insertQualityEvent.run(m5Id, ordLivePk05S2, rptLivePk05S2, qrScrapK3, 'L-06', 'SCRAP_K3', 22, 'pcs', 22, 5.5, round2(22 * 0.024), 'HMI-T7', 140.0, uOpWahyu, '2026-10-30T08:25:00Z');

    const insertBucket = db.prepare(`
      INSERT INTO hourly_telemetry_buckets (
        machine_id, production_order_id, shift_report_id, bucket_date, shift_number, hour_label,
        ideal_capacity_pcs, total_production_pcs, good_production_pcs, reject_pcs, rework_scrap_pcs, anomaly_pcs,
        avg_speed_pcs_min, avg_sealer_temp_c, avg_vibration_mms,
        operating_minutes, minor_stop_minutes, reduced_speed_minutes
      ) VALUES (?, ?, ?, '2026-10-30', 2, ?, 2500, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pk06Hourly = [
      ['15:00-16:00', 1840, 1815, 16, 9, 0, 40.9, 165.1, 3.5, 45, 0, 2.1],
      ['16:00-17:00', 2410, 2388, 18, 4, 0, 40.8, 165.0, 3.6, 60, 1, 1.8],
      ['17:00-18:00', 1860, 1836, 20, 4, 0, 39.6, 162.4, 3.7, 48, 1, 4.3],
      ['18:00-19:00', 2240, 2214, 21, 5, 6, 37.9, 163.8, 3.8, 60, 2, 6.2],
      ['19:00-20:00', 1920, 1898, 17, 5, 4, 38.4, 164.6, 3.8, 50, 2, 3.9],
      ['20:00-21:00', 2260, 2236, 19, 5, 0, 39.2, 164.9, 3.8, 58, 4, 3.2],
      ['21:00-22:00', 2230, 2233, 29, 5, 0, 38.4, 164.8, 3.8, 58, 4, 4.5]
    ];
    for (const h of pk06Hourly) {
      insertBucket.run(m6Id, ordLivePk06S2, rptLivePk06S2, h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8], h[9], h[10], h[11]);
    }

    const insertQueue = db.prepare(`
      INSERT INTO edge_sync_queue (source_device, machine_id, sequence_no, event_type, payload_json, recorded_at, sync_status)
      VALUES ('GW-100', ?, ?, 'TELEMETRY_SNAPSHOT', ?, ?, 'BUFFERED')
    `);
    insertQueue.run(m4Id, 3102, JSON.stringify({ d000: 1, d002: 31.6, d003: 11185, d005: 165.3 }), '2026-10-30T15:08:00Z');
    insertQueue.run(m4Id, 3103, JSON.stringify({ d000: 1, d002: 31.8, d003: 11200, d005: 165.4 }), '2026-10-30T15:09:00Z');

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (
        event_code, category, title, actor_id, actor_label, source_channel,
        area_id, line_id, machine_id, shift_report_id,
        entity_type, entity_id, before_json, after_json, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAudit.run(
      'EVT-STOP-007', 'STOP', 'Auto-Downtime terdeteksi pada Mesin Packing #5 (D000=3 FAULT, D001=4 Suhu Sealer 118.0 C) & BUZ-01 aktif',
      null, 'GW-100 / PLC-ABC', 'GW-100', areaId, lineAId, m5Id, rptLivePk05S2,
      'downtime_events', 'DT-2026-007',
      JSON.stringify({ d000_status: 1, d005_sealer_temp_c: 156.2, d011_buzzer_relay: 0 }),
      JSON.stringify({ d000_status: 3, d001_stop_code: 4, d005_sealer_temp_c: 118.0, d011_buzzer_relay: 1 }),
      '192.168.10.10', '2026-10-30T13:42:00Z'
    );
    insertAudit.run(
      'EVT-SPEED-019', 'SPEED', 'Peringatan L-04 Reduced Speed pada Mesin Packing #6: kecepatan 38.4 pcs/mnt mendekati ambang 38.0 pcs/mnt',
      null, 'GW-100 / SEN-S01', 'GW-100', areaId, lineAId, m6Id, rptLivePk06S2,
      'plc_register_states', String(m6Id),
      JSON.stringify({ speed_ppm: 40.6, ideal_speed_ppm: 41.67 }),
      JSON.stringify({ speed_ppm: 38.4, trigger_ppm: 38.0 }),
      '192.168.10.10', '2026-10-30T14:25:00Z'
    );
    insertAudit.run(
      'EVT-REASON-003', 'REASON', 'Operator Rini Handayani mengklasifikasikan Downtime DT-2026-003 sebagai Pergantian Roll Film PE (10 menit)',
      uOpRini, 'Rini Handayani (EMP-0403)', 'HMI-T7', areaId, lineAId, m6Id, rptLivePk06S2,
      'downtime_events', 'DT-2026-003',
      JSON.stringify({ classification_status: 'UNCLASSIFIED', reason: null }),
      JSON.stringify({ classification_status: 'CLASSIFIED', reason: 'DTR-L02-01 Pergantian Roll Film PE' }),
      '192.168.10.30', '2026-10-30T12:40:25Z'
    );
    insertAudit.run(
      'EVT-QUAL-012', 'QUALITY', 'Input manual Scrap K3 (19 pcs / 4.75 kg) pada Mesin Packing #6',
      uOpRini, 'Rini Handayani (EMP-0403)', 'HMI-T7', areaId, lineAId, m6Id, rptLivePk06S2,
      'quality_loss_events', '4',
      null,
      JSON.stringify({ loss_category: 'L-06', quality_type: 'SCRAP_K3', qty_pcs: 19, weight_kg: 4.75 }),
      '192.168.10.30', '2026-10-30T08:18:00Z'
    );
    insertAudit.run(
      'EVT-RPT-009', 'REPORT', 'Supervisor Dian Pratama menyetujui (Approve) Laporan Shift 1 Mesin Packing #6 (OEE 83.24%)',
      uSpv, 'Dian Pratama (SPV)', 'WEB', areaId, lineAId, m6Id, rptLivePk06S1,
      'shift_reports', 'RPT-20261030-PK06-S1',
      JSON.stringify({ approval_status: 'NEEDS_APPROVAL' }),
      JSON.stringify({ approval_status: 'APPROVED', approved_by: 'Dian Pratama' }),
      '192.168.10.50', '2026-10-30T15:05:00Z'
    );
    insertAudit.run(
      'EVT-KZN-001', 'KAIZEN', 'Operator Wahyu Saputra menerbitkan Tiket Kaizen Maintenance KZN-2026-01 dari konsol HMI-T7',
      uOpWahyu, 'Wahyu Saputra (EMP-0402)', 'HMI-T7', areaId, lineAId, m5Id, rptLivePk05S2,
      'kaizen_tickets', 'KZN-2026-01',
      null,
      JSON.stringify({ code: 'KZN-2026-01', type: 'MAINTENANCE', status: 'OPEN', verification_status: 'NOT_OK' }),
      '192.168.10.31', '2026-10-30T13:48:00Z'
    );

    const insertNotif = db.prepare(`
      INSERT INTO notifications (
        severity, tag_label, title, body, target_roles_json, target_user_id,
        area_id, machine_id, cta_label, cta_route, entity_type, entity_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertNotif.run(
      'CRITICAL', 'AUTO-DOWNTIME & ALARM SUHU',
      'Mesin Packing #5 Berhenti (FAULT D001=4: Suhu Sealer Drop 118.0 C)',
      'Auto-Downtime DT-2026-007 belum diklasifikasikan selama 18 menit. Sirine BUZ-01 aktif dan vibrasi bearing tercatat 4.9 mm/s.',
      JSON.stringify(['SHIFT_LEADER', 'SPV', 'ADMIN_MANAGER', 'SUPERADMIN']), null,
      areaId, m5Id, 'Buka Detail Mesin #5', '/web/production-active/MCN-U2-PK05', 'downtime_events', 'DT-2026-007',
      '2026-10-30T13:42:05Z'
    );
    insertNotif.run(
      'WARNING', 'EARLY WARNING L-04 & VIBRASI',
      'Kecepatan Mesin Packing #6 Turun ke 38.4 pcs/mnt (Ideal 41.67 pcs/mnt)',
      'Terdeteksi potensi L-04 Reduced Speed pada Line Packing A. Periksa ketegangan penarik film PE dan kebersihan rahang sealer.',
      JSON.stringify(['SHIFT_LEADER', 'SPV', 'ADMIN_MANAGER', 'SUPERADMIN']), null,
      areaId, m6Id, 'Analitik Performance Loss', '/web/losses/performance', 'machines', 'MCN-U2-PK06',
      '2026-10-30T14:25:10Z'
    );
    insertNotif.run(
      'APPROVAL', 'MENUNGGU RELEASE LAPORAN',
      'Laporan Shift 1 Mesin Packing #6 Telah Disetujui SPV & Siap Di-Release',
      'RPT-20261030-PK06-S1 telah lolos verifikasi kelengkapan alasan downtime oleh SPV Dian Pratama dan menunggu penguncian Release.',
      JSON.stringify(['ADMIN_MANAGER', 'SUPERADMIN']), null,
      areaId, m6Id, 'Buka Report By Shift', '/web/reports/by-shift', 'shift_reports', 'RPT-20261030-PK06-S1',
      '2026-10-30T15:05:10Z'
    );
    insertNotif.run(
      'KAIZEN', 'MENUNGGU VERIFIKASI SPV',
      'Kaizen KZN-2026-03 (Sekat Anti-Clumping Hopper #6) Menunggu Verifikasi Efektivitas',
      'Shift Leader Bagus Santoso telah menyelesaikan langkah perbaikan Step 2. Frekuensi small stop turun dari 6 menjadi 2 kejadian/shift.',
      JSON.stringify(['SPV', 'ADMIN_MANAGER', 'SUPERADMIN']), null,
      areaId, m6Id, 'Verifikasi Tiket Kaizen', '/web/kaizen/KZN-2026-03', 'kaizen_tickets', 'KZN-2026-03',
      '2026-10-30T15:00:15Z'
    );
    insertNotif.run(
      'SECURITY', 'BUFFER SINKRONISASI OT',
      'Gateway GW-100 Sedang Menyinkronkan Buffer FIFO Mesin Packing #4 (8/13 Register)',
      'Koneksi LAN Line Packing B sempat terputus 90 detik; paket telemetri lokal sedang diputar ulang tanpa kehilangan counter.',
      JSON.stringify(['SPV', 'SUPERADMIN']), null,
      areaId, m4Id, 'Pantau Audit Log OT', '/web/audit-logs', 'machines', 'MCN-U2-PK04',
      '2026-10-30T15:08:30Z'
    );

    db.exec('COMMIT;');
    return {
      seeded: true,
      factoryId,
      areaId,
      machines: { m6Id, m5Id, m4Id, m7Id },
      users: { uSuper, uMgr, uSpv, uLeader, uTech, uOpSlamet, uOpWahyu, uOpRini }
    };
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = openDatabase(DEFAULT_DB_PATH);
  const result = seedDatabase(db);
  const counts = {
    machines: db.prepare(`SELECT COUNT(*) AS c FROM machines`).get().c,
    users: db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c,
    skus: db.prepare(`SELECT COUNT(*) AS c FROM skus`).get().c,
    shiftReports: db.prepare(`SELECT COUNT(*) AS c FROM shift_reports`).get().c,
    downtimeEvents: db.prepare(`SELECT COUNT(*) AS c FROM downtime_events`).get().c,
    kaizenTickets: db.prepare(`SELECT COUNT(*) AS c FROM kaizen_tickets`).get().c
  };
  console.log(JSON.stringify({ dbPath: DEFAULT_DB_PATH, ...result, counts }, null, 2));
  db.close();
}

