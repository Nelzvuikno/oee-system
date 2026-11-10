import {
  calculateCounterDelta,
  calculateOeeMetrics,
  convertPackagingUnits,
  evaluateTelemetryAnomalies,
  round1,
  round2
} from './oee-engine.mjs';

export function recordAuditLog(db, entry) {
  const res = db.prepare(`
    INSERT INTO audit_logs (
      event_code, category, title, actor_id, actor_label, source_channel,
      area_id, line_id, machine_id, shift_report_id,
      entity_type, entity_id, before_json, after_json, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.eventCode || `EVT-${entry.category}-${Date.now().toString(36).toUpperCase()}`,
    entry.category,
    entry.title,
    entry.actorId ?? null,
    entry.actorLabel || 'System',
    entry.sourceChannel || 'WEB',
    entry.areaId ?? 1,
    entry.lineId ?? null,
    entry.machineId ?? null,
    entry.shiftReportId ?? null,
    entry.entityType || '',
    String(entry.entityId ?? ''),
    entry.before !== undefined && entry.before !== null ? JSON.stringify(entry.before) : null,
    entry.after !== undefined && entry.after !== null ? JSON.stringify(entry.after) : null,
    entry.ipAddress || '127.0.0.1',
    entry.createdAt || new Date().toISOString()
  );
  return Number(res.lastInsertRowid);
}

export function pushNotification(db, notif, sseHub = null) {
  const createdAt = notif.createdAt || new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO notifications (
      severity, tag_label, title, body, target_roles_json, target_user_id,
      area_id, machine_id, cta_label, cta_route, entity_type, entity_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    notif.severity,
    notif.tagLabel,
    notif.title,
    notif.body,
    JSON.stringify(notif.targetRoles || ['SPV', 'ADMIN_MANAGER', 'SUPERADMIN']),
    notif.targetUserId ?? null,
    notif.areaId ?? 1,
    notif.machineId ?? null,
    notif.ctaLabel || 'Lihat Detail',
    notif.ctaRoute || '/web/production-active',
    notif.entityType || '',
    String(notif.entityId ?? ''),
    createdAt
  );
  const id = Number(res.lastInsertRowid);
  if (sseHub) {
    sseHub.broadcast('notification', { id, ...notif, createdAt });
  }
  return id;
}

export function recalculateShiftReport(db, shiftReportId) {
  const report = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(Number(shiftReportId));
  if (!report) return null;

  // Released reports are immutable historical snapshots.
  if (report.approval_status === 'RELEASED') {
    return report;
  }

  const downtimes = db.prepare(`
    SELECT * FROM downtime_events WHERE shift_report_id = ?
  `).all(report.id);

  let plannedDt = 0;
  let l01Min = 0;
  let l01Count = 0;
  let l02Min = 0;
  let l03SmallStopMin = 0;
  let unplannedFreq = 0;

  for (const dt of downtimes) {
    const dur = Math.max(0, Number(dt.duration_minutes) || 0);
    if (dt.is_planned === 1 || dt.loss_category_code === 'PLANNED') {
      plannedDt += dur;
    } else if (dt.is_small_stop === 1 || dt.loss_category_code === 'L-03') {
      l03SmallStopMin += dur;
    } else if (dt.loss_category_code === 'L-02') {
      l02Min += dur;
      unplannedFreq += 1;
    } else {
      // Unclassified auto-downtime counts against L-01 Availability until classified.
      l01Min += dur;
      l01Count += 1;
      unplannedFreq += 1;
    }
  }

  const orders = db.prepare(`
    SELECT p.*, s.ideal_cycle_time_min, s.pcs_per_secondary, s.pcs_per_tertiary, s.net_weight_grams
    FROM production_orders p
    JOIN skus s ON s.id = p.sku_id
    WHERE p.shift_report_id = ?
  `).all(report.id);

  const primaryOrder = orders[0] || null;
  const idealCt = primaryOrder ? Number(primaryOrder.ideal_cycle_time_min) : 0.024;

  const totalTarget = orders.length > 0
    ? orders.reduce((s, o) => s + Number(o.target_qty_pcs || 0), 0)
    : Number(report.target_production_pcs || 0);
  const totalProcessed = orders.length > 0
    ? orders.reduce((s, o) => s + Number(o.total_processed_pcs || 0), 0)
    : Number(report.total_processed_pcs || 0);
  const totalDefect = orders.length > 0
    ? orders.reduce((s, o) => s + Number(o.auto_reject_pcs || 0) + Number(o.manual_defect_pcs || 0), 0)
    : Number(report.defect_pcs || 0);
  const totalScrap = orders.length > 0
    ? orders.reduce((s, o) => s + Number(o.scrap_k3_pcs || 0), 0)
    : Number(report.scrap_k3_pcs || 0);
  const totalRework = orders.length > 0
    ? orders.reduce((s, o) => s + Number(o.rework_pcs || 0), 0)
    : Number(report.rework_pcs || 0);
  const totalGood = Math.max(0, totalProcessed - totalDefect);

  const effectivePlanned = plannedDt > 0 ? plannedDt : Number(report.planned_downtime_minutes || 45);
  const effectiveMinorStop = Math.max(Number(report.minor_stop_l03_minutes || 0), l03SmallStopMin);

  const metrics = calculateOeeMetrics({
    calendarMinutes: report.calendar_minutes,
    plannedDowntimeMinutes: effectivePlanned,
    breakdownL01Minutes: l01Min,
    breakdownL01Count: l01Count,
    setupL02Minutes: l02Min,
    minorStopL03Minutes: effectiveMinorStop,
    totalProcessedPcs: totalProcessed,
    goodOutputPcs: totalGood,
    defectPcs: totalDefect,
    scrapK3Pcs: totalScrap,
    reworkPcs: totalRework,
    idealCycleTimeMin: idealCt,
    targetProductionPcs: totalTarget
  });

  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE shift_reports
    SET
      planned_downtime_minutes = ?,
      loading_minutes = ?,
      breakdown_l01_minutes = ?,
      breakdown_l01_count = ?,
      setup_l02_minutes = ?,
      unplanned_downtime_minutes = ?,
      downtime_freq = ?,
      operating_minutes = ?,
      minor_stop_l03_minutes = ?,
      active_operating_minutes = ?,
      reduced_speed_l04_minutes = ?,
      net_operating_minutes = ?,
      defect_l05_minutes = ?,
      scrap_l06_minutes = ?,
      value_added_minutes = ?,
      target_production_pcs = ?,
      total_processed_pcs = ?,
      good_output_pcs = ?,
      defect_pcs = ?,
      scrap_k3_pcs = ?,
      rework_pcs = ?,
      avg_speed_pcs_min = ?,
      mttr_minutes = ?,
      mtbf_minutes = ?,
      availability_pct = ?,
      performance_pct = ?,
      quality_pct = ?,
      oee_pct = ?,
      teep_pct = ?,
      utility_pct = ?,
      achievement_pct = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    metrics.plannedDowntimeMinutes,
    metrics.loadingMinutes,
    metrics.breakdownL01Minutes,
    metrics.breakdownL01Count,
    metrics.setupL02Minutes,
    metrics.unplannedDowntimeMinutes,
    unplannedFreq,
    metrics.operatingMinutes,
    metrics.minorStopL03Minutes,
    metrics.activeOperatingMinutes,
    metrics.reducedSpeedL04Minutes,
    metrics.netOperatingMinutes,
    metrics.defectL05Minutes,
    metrics.scrapL06Minutes,
    metrics.valueAddedMinutes,
    metrics.targetProductionPcs,
    metrics.totalProcessedPcs,
    metrics.goodOutputPcs,
    metrics.defectPcs,
    metrics.scrapK3Pcs,
    metrics.reworkPcs,
    metrics.avgSpeedPcsMin,
    metrics.mttrMinutes,
    metrics.mtbfMinutes,
    metrics.availabilityPct,
    metrics.performancePct,
    metrics.qualityPct,
    metrics.oeePct,
    metrics.teepPct,
    metrics.utilityPct,
    metrics.achievementPct,
    nowIso,
    report.id
  );

  if (primaryOrder) {
    const units = convertPackagingUnits(metrics.goodOutputPcs, primaryOrder);
    db.prepare(`
      UPDATE product_batch_reports
      SET
        loading_minutes = ?,
        operating_minutes = ?,
        target_pcs = ?,
        total_processed_pcs = ?,
        good_output_pcs = ?,
        good_output_cartons = ?,
        good_output_kg = ?,
        defect_pcs = ?,
        scrap_k3_pcs = ?,
        rework_pcs = ?,
        downtime_minutes = ?,
        downtime_freq = ?,
        availability_pct = ?,
        performance_pct = ?,
        quality_pct = ?,
        oee_pct = ?,
        updated_at = ?
      WHERE shift_report_id = ?
    `).run(
      metrics.loadingMinutes,
      metrics.operatingMinutes,
      metrics.targetProductionPcs,
      metrics.totalProcessedPcs,
      metrics.goodOutputPcs,
      units.tertiary,
      units.weightKg,
      metrics.defectPcs,
      metrics.scrapK3Pcs,
      metrics.reworkPcs,
      metrics.unplannedDowntimeMinutes,
      unplannedFreq,
      metrics.availabilityPct,
      metrics.performancePct,
      metrics.qualityPct,
      metrics.oeePct,
      nowIso,
      report.id
    );
  }

  return db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(report.id);
}

export function getMachineContext(db, machineIdentifier) {
  const isNumeric = /^\d+$/.test(String(machineIdentifier));
  const machine = isNumeric
    ? db.prepare(`
        SELECT m.*, l.code AS line_code, l.name AS line_name, l.area_id, a.code AS area_code, a.name AS area_name
        FROM machines m
        JOIN lines l ON l.id = m.line_id
        JOIN areas a ON a.id = l.area_id
        WHERE m.id = ?
      `).get(Number(machineIdentifier))
    : db.prepare(`
        SELECT m.*, l.code AS line_code, l.name AS line_name, l.area_id, a.code AS area_code, a.name AS area_name
        FROM machines m
        JOIN lines l ON l.id = m.line_id
        JOIN areas a ON a.id = l.area_id
        WHERE UPPER(m.code) = UPPER(?)
      `).get(String(machineIdentifier));

  if (!machine) return null;

  const registers = db.prepare(`SELECT * FROM plc_register_states WHERE machine_id = ?`).get(machine.id);
  const activeOrder = db.prepare(`
    SELECT po.*, s.code AS sku_code, s.name AS sku_name, s.net_weight_grams,
           s.primary_unit, s.secondary_unit, s.pcs_per_secondary, s.tertiary_unit, s.pcs_per_tertiary,
           s.ideal_cycle_time_min, s.ideal_speed_pcs_per_min, s.reduced_speed_trigger_pcs_per_min,
           s.unit_price_idr, s.cogs_idr
    FROM production_orders po
    JOIN skus s ON s.id = po.sku_id
    WHERE po.machine_id = ? AND po.status IN ('RUNNING', 'PAUSED')
    ORDER BY po.id DESC
    LIMIT 1
  `).get(machine.id);

  const latestReport = activeOrder?.shift_report_id
    ? db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(activeOrder.shift_report_id)
    : db.prepare(`
        SELECT * FROM shift_reports
        WHERE machine_id = ? AND granularity = 'SHIFT'
        ORDER BY report_date DESC, shift_number DESC, id DESC
        LIMIT 1
      `).get(machine.id);

  const activeDowntime = db.prepare(`
    SELECT d.*, dr.code AS reason_code, dr.name AS reason_name, sm.name AS sub_machine_name, sm.code AS sub_machine_code
    FROM downtime_events d
    LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
    LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
    WHERE d.machine_id = ? AND (d.end_time IS NULL OR d.classification_status = 'UNCLASSIFIED')
    ORDER BY d.end_time IS NULL DESC, d.id DESC
    LIMIT 1
  `).get(machine.id);
  if (activeDowntime) {
    activeDowntime.sub_machine = activeDowntime.sub_machine_name || 'Vertical Heater Sealer';
  }

  const unclassifiedCount = db.prepare(`
    SELECT COUNT(*) AS c FROM downtime_events
    WHERE machine_id = ? AND classification_status = 'UNCLASSIFIED'
  `).get(machine.id).c;

  const anomalies = evaluateTelemetryAnomalies(registers || {}, machine, activeOrder);

  return {
    machine,
    registers,
    activeOrder,
    latestReport,
    activeDowntime,
    unclassifiedCount,
    anomalies
  };
}

export function ingestPlcRegisters(db, payload, sseHub = null) {
  const ctx = getMachineContext(db, payload.machineId ?? payload.machineCode);
  if (!ctx) {
    return { ok: false, status: 404, message: 'Mesin tidak ditemukan.' };
  }

  const { machine, registers: prev, activeOrder, latestReport } = ctx;
  const nowIso = payload.ts || new Date().toISOString();

  const next = {
    d000_status: payload.d000_status !== undefined ? Number(payload.d000_status) : prev.d000_status,
    d001_stop_code: payload.d001_stop_code !== undefined ? Number(payload.d001_stop_code) : prev.d001_stop_code,
    d002_speed_pcs_min: payload.d002_speed_pcs_min !== undefined ? round1(Number(payload.d002_speed_pcs_min)) : prev.d002_speed_pcs_min,
    d003_good_count: payload.d003_good_count !== undefined ? Number(payload.d003_good_count) : prev.d003_good_count,
    d004_auto_reject_count: payload.d004_auto_reject_count !== undefined ? Number(payload.d004_auto_reject_count) : prev.d004_auto_reject_count,
    d005_sealer_temp_c: payload.d005_sealer_temp_c !== undefined ? round1(Number(payload.d005_sealer_temp_c)) : prev.d005_sealer_temp_c,
    d006_vibration_mms: payload.d006_vibration_mms !== undefined ? round1(Number(payload.d006_vibration_mms)) : prev.d006_vibration_mms,
    d007_hmi_defect_count: payload.d007_hmi_defect_count !== undefined ? Number(payload.d007_hmi_defect_count) : prev.d007_hmi_defect_count,
    d008_hmi_scrap_k3_count: payload.d008_hmi_scrap_k3_count !== undefined ? Number(payload.d008_hmi_scrap_k3_count) : prev.d008_hmi_scrap_k3_count,
    d009_minor_stop_flag: payload.d009_minor_stop_flag !== undefined ? Number(payload.d009_minor_stop_flag) : prev.d009_minor_stop_flag,
    d010_auto_downtime_flag: payload.d010_auto_downtime_flag !== undefined ? Number(payload.d010_auto_downtime_flag) : prev.d010_auto_downtime_flag,
    d011_buzzer_relay: payload.d011_buzzer_relay !== undefined ? Number(payload.d011_buzzer_relay) : prev.d011_buzzer_relay,
    d012_heartbeat_seq: payload.d012_heartbeat_seq !== undefined
      ? Number(payload.d012_heartbeat_seq)
      : ((prev.d012_heartbeat_seq + 1) % 65536),
    connection_status: payload.connection_status || prev.connection_status || 'ONLINE',
    sync_progress_registers: payload.sync_progress_registers !== undefined
      ? Number(payload.sync_progress_registers)
      : (payload.connection_status === 'ONLINE' ? 13 : prev.sync_progress_registers)
  };

  const deltaGood = calculateCounterDelta(prev.d003_good_count, next.d003_good_count);
  const deltaRejectAuto = calculateCounterDelta(prev.d004_auto_reject_count, next.d004_auto_reject_count);

  let triggeredDowntime = null;

  // Transition into STOP (2) or FAULT (3) raises Auto-Downtime D010=1 and activates BUZ-01 D011=1.
  const hasOpenDt = db.prepare(`SELECT id FROM downtime_events WHERE machine_id = ? AND end_time IS NULL`).get(machine.id);
  const isEnteringStopOrFault = (next.d000_status === 2 || next.d000_status === 3) && (prev.d000_status === 1 || !hasOpenDt);

  if (isEnteringStopOrFault) {
    next.d010_auto_downtime_flag = 1;
    const suggestedReason = db.prepare(`
      SELECT * FROM downtime_reasons WHERE default_plc_stop_code = ? LIMIT 1
    `).get(next.d001_stop_code);

    let subMachine = null;
    if (next.d001_stop_code === 4 || next.d005_sealer_temp_c > 185) {
      subMachine = db.prepare(`SELECT * FROM sub_machines WHERE machine_id = ? AND (name LIKE '%Heater%' OR code = 'SUB-SEA') LIMIT 1`).get(machine.id);
    } else if (next.d001_stop_code === 5 || next.d001_stop_code === 7 || next.d006_vibration_mms > 7.1) {
      subMachine = db.prepare(`SELECT * FROM sub_machines WHERE machine_id = ? AND (name LIKE '%Cutter%' OR code = 'SUB-CUT') LIMIT 1`).get(machine.id);
    } else if (next.d001_stop_code === 6) {
      subMachine = db.prepare(`SELECT * FROM sub_machines WHERE machine_id = ? AND (name LIKE '%Auger%' OR code = 'SUB-AUG') LIMIT 1`).get(machine.id);
    }
    if (!subMachine) {
      subMachine = db.prepare(`SELECT * FROM sub_machines WHERE machine_id = ? ORDER BY id ASC LIMIT 1`).get(machine.id) || { id: 2, name: 'Vertical & Horizontal Heater Sealer' };
    }

    const isPurePlanned = suggestedReason?.is_planned === 1 && next.d000_status === 2;
    next.d011_buzzer_relay = isPurePlanned ? 0 : 1;

    const dtCode = `DT-${Date.now().toString(36).toUpperCase()}`;
    const res = db.prepare(`
      INSERT INTO downtime_events (
        downtime_code, machine_id, sub_machine_id, production_order_id, shift_report_id,
        plc_trigger_register, plc_stop_code, is_small_stop, is_planned,
        loss_category_code, reason_id, detail_reason, classification_status,
        start_time, duration_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'UNCLASSIFIED', ?, ?)
    `).run(
      dtCode,
      machine.id,
      subMachine?.id ?? 2,
      activeOrder?.id ?? null,
      latestReport?.id ?? null,
      `D000=${next.d000_status}|D010=1 (D001=${next.d001_stop_code})`,
      next.d001_stop_code,
      isPurePlanned ? 1 : 0,
      suggestedReason?.loss_category_code ?? 'L-01',
      suggestedReason?.id ?? (next.d001_stop_code === 4 ? 4 : null),
      suggestedReason?.name ?? 'Suhu Heater Sealer Overheat',
      nowIso,
      Number(payload.simulatedDurationMinutes ?? 5.0)
    );
    triggeredDowntime = db.prepare(`
      SELECT d.*, sm.name AS sub_machine_name, sm.code AS sub_machine_code, dr.name AS reason_name, dr.code AS reason_code
      FROM downtime_events d
      LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
      LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
      WHERE d.id = ?
    `).get(Number(res.lastInsertRowid));
    if (triggeredDowntime) {
      triggeredDowntime.sub_machine = triggeredDowntime.sub_machine_name || 'Vertical Heater Sealer';
    }

    recordAuditLog(db, {
      category: 'STOP',
      title: `Auto-Downtime ${dtCode} terpicu pada ${machine.name} (D000=${next.d000_status}, D001=${next.d001_stop_code})`,
      actorLabel: 'GW-100 / PLC-ABC',
      sourceChannel: 'GW-100',
      areaId: machine.area_id,
      lineId: machine.line_id,
      machineId: machine.id,
      shiftReportId: latestReport?.id ?? null,
      entityType: 'downtime_events',
      entityId: dtCode,
      before: { d000_status: prev.d000_status, d011_buzzer_relay: prev.d011_buzzer_relay },
      after: { d000_status: next.d000_status, d001_stop_code: next.d001_stop_code, d011_buzzer_relay: next.d011_buzzer_relay }
    });

    if (!isPurePlanned) {
      pushNotification(
        db,
        {
          severity: 'CRITICAL',
          tagLabel: 'AUTO-DOWNTIME INTERLOCK',
          title: `${machine.name} Berhenti (${next.d000_status === 3 ? 'FAULT' : 'STOP'} D001=${next.d001_stop_code})`,
          body: `Rekaman ${dtCode} menunggu klasifikasi alasan pada Panel HMI-T7. Sirine BUZ-01 aktif. Terikat sub-mesin ${subMachine?.name || 'Vertical Heater Sealer'}.`,
          targetRoles: ['SHIFT_LEADER', 'SPV', 'ADMIN_MANAGER', 'SUPERADMIN'],
          areaId: machine.area_id,
          machineId: machine.id,
          ctaLabel: `Buka Detail ${machine.name}`,
          ctaRoute: `/web/production-active/${machine.code}`,
          entityType: 'downtime_events',
          entityId: dtCode
        },
        sseHub
      );
    }
  }

  // Recovery back to RUN (1) closes any open downtime timestamp while keeping UNCLASSIFIED status intact.
  if (next.d000_status === 1 && (prev.d000_status === 2 || prev.d000_status === 3)) {
    next.d010_auto_downtime_flag = 0;
    const openDt = db.prepare(`
      SELECT * FROM downtime_events
      WHERE machine_id = ? AND end_time IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(machine.id);

    if (openDt) {
      const elapsedMin = Math.max(
        Number(openDt.duration_minutes || 0.5),
        round2((new Date(nowIso).getTime() - new Date(openDt.start_time).getTime()) / 60000)
      );
      db.prepare(`
        UPDATE downtime_events
        SET end_time = ?, duration_minutes = ?, updated_at = ?
        WHERE id = ?
      `).run(nowIso, elapsedMin > 0 ? elapsedMin : 5.0, nowIso, openDt.id);
    }
  }

  const anomalies = evaluateTelemetryAnomalies(next, machine, activeOrder);
  let diag = `${machine.plc_model} ${next.connection_status}`;
  if (next.d000_status === 3) {
    diag = `FAULT D001=${next.d001_stop_code} - Suhu ${next.d005_sealer_temp_c} C, Vibrasi ${next.d006_vibration_mms} mm/s`;
  } else if (anomalies.tempState === 'CRITICAL_HIGH') {
    next.d011_buzzer_relay = 1;
    diag = `ALARM OVERHEAT SEN-T01 (${next.d005_sealer_temp_c} C > ${machine.sealer_temp_max_c} C)`;
  } else if (anomalies.vibrationState === 'CRITICAL') {
    diag = `ALARM VIBRASI KRITIS SEN-V01 (${next.d006_vibration_mms} mm/s > ${machine.vib_critical_mms} mm/s)`;
  } else if (anomalies.reducedSpeedFlag) {
    diag = `Reduced Speed (${anomalies.reducedSpeedLevel}): ${next.d002_speed_pcs_min} pcs/mnt < ${anomalies.warningSpeedPpm} pcs/mnt`;
  } else if (next.d000_status === 1) {
    diag = `Running Normal ${next.d002_speed_pcs_min} pcs/mnt - Sealer ${next.d005_sealer_temp_c} C`;
  }

  let reducedSpeedLoss = null;
  if (anomalies.reducedSpeedFlag || (next.d000_status === 1 && next.d002_speed_pcs_min < 38.0)) {
    const ideal = anomalies.idealSpeedPpm || 41.67;
    const actual = next.d002_speed_pcs_min;
    const perfRate = round2(ideal > 0 ? (actual / ideal) * 100 : 100);
    reducedSpeedLoss = {
      lossCategory: 'L-04',
      lossCategoryName: 'Reduced Speed Loss',
      lossCode: 'L-04',
      actualSpeedPcsMin: actual,
      idealSpeedPcsMin: ideal,
      speedGapPcsMin: round2(Math.max(0, ideal - actual)),
      performanceRatePct: perfRate,
      impactOnPerformance: `Reduced Speed Loss (L-04) tercatat pada perhitungan OEE Performance Rate: kecepatan ${actual} pcs/menit berada di bawah ideal ${ideal} pcs/menit (Performance Rate ${perfRate}%)`,
      status: 'RECORDED',
      isReducedSpeed: true,
      level: anomalies.reducedSpeedLevel || 'SEVERE'
    };

    recordAuditLog(db, {
      category: 'SPEED',
      title: `Reduced Speed Loss (L-04) tercatat pada ${machine.name}: ${actual} pcs/menit (OEE Performance Rate ${perfRate}%)`,
      actorLabel: 'GW-100 / Rule Engine',
      sourceChannel: 'GW-100',
      areaId: machine.area_id,
      lineId: machine.line_id,
      machineId: machine.id,
      shiftReportId: latestReport?.id ?? null,
      entityType: 'shift_reports',
      entityId: latestReport?.report_code ?? 'L-04',
      before: { speed: prev.d002_speed_pcs_min },
      after: { speed: actual, performanceRatePct: perfRate, loss: 'L-04' }
    });

    if (latestReport) {
      db.prepare(`
        UPDATE shift_reports
        SET reduced_speed_l04_minutes = MAX(reduced_speed_l04_minutes, 15.0),
            performance_pct = MIN(performance_pct, ?),
            updated_at = ?
        WHERE id = ?
      `).run(perfRate, nowIso, latestReport.id);
    }
  }

  db.prepare(`
    UPDATE plc_register_states
    SET
      d000_status = ?, d001_stop_code = ?, d002_speed_pcs_min = ?,
      d003_good_count = ?, d004_auto_reject_count = ?, d005_sealer_temp_c = ?, d006_vibration_mms = ?,
      d007_hmi_defect_count = ?, d008_hmi_scrap_k3_count = ?, d009_minor_stop_flag = ?,
      d010_auto_downtime_flag = ?, d011_buzzer_relay = ?, d012_heartbeat_seq = ?,
      connection_status = ?, sync_progress_registers = ?, diagnostic_message = ?,
      last_heartbeat_at = ?, updated_at = ?
    WHERE machine_id = ?
  `).run(
    next.d000_status, next.d001_stop_code, next.d002_speed_pcs_min,
    next.d003_good_count, next.d004_auto_reject_count, next.d005_sealer_temp_c, next.d006_vibration_mms,
    next.d007_hmi_defect_count, next.d008_hmi_scrap_k3_count, next.d009_minor_stop_flag,
    next.d010_auto_downtime_flag, next.d011_buzzer_relay, next.d012_heartbeat_seq,
    next.connection_status, next.sync_progress_registers, diag,
    nowIso, nowIso,
    machine.id
  );

  if (activeOrder && (deltaGood > 0 || deltaRejectAuto > 0)) {
    const newGood = activeOrder.good_qty_pcs + deltaGood;
    const newAutoReject = activeOrder.auto_reject_pcs + deltaRejectAuto;
    const newTotal = newGood + newAutoReject + activeOrder.manual_defect_pcs;
    db.prepare(`
      UPDATE production_orders
      SET good_qty_pcs = ?, auto_reject_pcs = ?, total_processed_pcs = ?, updated_at = ?
      WHERE id = ?
    `).run(newGood, newAutoReject, newTotal, nowIso, activeOrder.id);
  }

  if (latestReport && latestReport.approval_status !== 'RELEASED') {
    recalculateShiftReport(db, latestReport.id);
  }

  const updatedCtx = getMachineContext(db, machine.id);
  if (sseHub) {
    sseHub.broadcast('telemetry', {
      machineId: machine.id,
      machineCode: machine.code,
      registers: updatedCtx.registers,
      anomalies: updatedCtx.anomalies,
      report: updatedCtx.latestReport,
      activeOrder: updatedCtx.activeOrder,
      activeDowntime: updatedCtx.activeDowntime,
      unclassifiedCount: updatedCtx.unclassifiedCount
    });
  }

  return {
    ok: true,
    status: 'tersimpan',
    message: 'Telemetri berhasil disimpan',
    deltaGood,
    deltaRejectAuto,
    reducedSpeedLoss,
    oeePerformanceRate: reducedSpeedLoss ? {
      lossCategory: 'L-04 Reduced Speed Loss',
      idealSpeed: reducedSpeedLoss.idealSpeedPcsMin,
      actualSpeed: reducedSpeedLoss.actualSpeedPcsMin,
      performancePct: reducedSpeedLoss.performanceRatePct,
      status: 'RECORDED'
    } : null,
    anomalies,
    triggeredDowntime,
    context: updatedCtx
  };
}

