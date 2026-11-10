import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { openDatabase, seedDatabase } from '../db/seed.mjs';
import { createApp } from '../server/app.mjs';
import { calculateCounterDelta, calculateOeeMetrics } from '../server/oee-engine.mjs';

describe('ProductionCore OEE Engine, SQLite Schema Integrity, and Full REST API (Main Tasks 01-17)', () => {
  let db;
  let app;
  let baseUrl;

  async function api(path, { method = 'GET', token = null, body = undefined } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }

  before(async () => {
    db = openDatabase(':memory:');
    seedDatabase(db);
    app = createApp({ db, enableLiveTick: false });
    await new Promise((resolveListen) => {
      app.server.listen(0, '127.0.0.1', () => resolveListen());
    });
    const addr = app.server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await app.close();
    db.close();
  });

  it('reproduces Jurnal Teknika 2023 Golden Fixture 26/05/2023 and 27/05/2023 OEE metrics to 2 decimals', () => {
    const day26 = calculateOeeMetrics({
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
      idealCycleTimeMin: 0.024
    });

    assert.equal(day26.availabilityPct, 90.86);
    assert.equal(day26.performancePct, 86.41);
    assert.equal(day26.qualityPct, 98.74);
    assert.equal(day26.oeePct, 77.52);
    assert.equal(day26.mttrMinutes, 38);
    assert.equal(day26.mtbfMinutes, 552);

    const day27 = calculateOeeMetrics({
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
      idealCycleTimeMin: 0.024
    });

    assert.equal(day27.availabilityPct, 88.56);
    assert.equal(day27.performancePct, 88.91);
    assert.equal(day27.qualityPct, 99.1);
    assert.equal(day27.oeePct, 78.03);
    assert.equal(day27.mttrMinutes, null);
    assert.equal(day27.mtbfMinutes, null);

    assert.equal(calculateCounterDelta(100, 125), 25);
    assert.equal(calculateCounterDelta(14500, 12), 12);
    assert.equal(calculateCounterDelta(65530, 10, 65535), 16);
  });

  it('enforces SQLite triggers for immutable PLC timestamps, RELEASED report lock, Kaizen state guard, and append-only audit logs', () => {
    const closedDt = db.prepare(`SELECT * FROM downtime_events WHERE downtime_code = 'DT-2026-002'`).get();
    assert.throws(() => {
      db.prepare(`UPDATE downtime_events SET duration_minutes = 99 WHERE id = ?`).run(closedDt.id);
    }, /immutable/);

    const releasedDt = db.prepare(`SELECT * FROM downtime_events WHERE downtime_code = 'DT-2023-0526-01'`).get();
    assert.throws(() => {
      db.prepare(`UPDATE downtime_events SET detail_reason = 'Tamper released' WHERE id = ?`).run(releasedDt.id);
    }, /RELEASED/);
    assert.throws(() => {
      db.prepare(`DELETE FROM downtime_events WHERE id = ?`).run(releasedDt.id);
    }, /RELEASED/);

    assert.throws(() => {
      db.prepare(`UPDATE kaizen_tickets SET status = 'OPEN', verification_status = 'OK' WHERE code = 'KZN-2026-01'`).run();
    }, /CHECK constraint failed/);

    assert.throws(() => {
      db.prepare(`UPDATE audit_logs SET title = 'Modified' WHERE id = 1`).run();
    }, /append-only/);
    assert.throws(() => {
      db.prepare(`DELETE FROM audit_logs WHERE id = 1`).run();
    }, /append-only/);
  });

  it('enforces Web vs HMI-T7 channel separation, 5-attempt PIN lockout, SPV PIN unlock, and 5-role RBAC guards', async () => {
    const opWebTry = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'op.slamet', password: 'any' }
    });
    assert.equal(opWebTry.status, 403);
    assert.equal(opWebTry.data.code, 'ROLE_HMI_ONLY');

    const mgrHmiTry = await api('/api/hmi/auth/login', {
      method: 'POST',
      body: { nik: 'EMP-0102', pin: '123456', machineId: 1 }
    });
    assert.equal(mgrHmiTry.status, 403);
    assert.equal(mgrHmiTry.data.code, 'ROLE_WEB_ONLY');

    // Trigger 5 failed PIN attempts on op.rini (EMP-0403) and verify 423 lockout.
    for (let i = 1; i <= 4; i += 1) {
      const bad = await api('/api/hmi/auth/login', {
        method: 'POST',
        body: { nik: 'EMP-0403', pin: '000000', machineId: 1 }
      });
      assert.equal(bad.status, 401);
    }
    const locked = await api('/api/hmi/auth/login', {
      method: 'POST',
      body: { nik: 'EMP-0403', pin: '000000', machineId: 1 }
    });
    assert.equal(locked.status, 423);
    assert.equal(locked.data.code, 'HMI_PIN_LOCKED');

    // SPV logs in to Web and unlocks op.rini's PIN.
    const spvLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'spv.unit2', password: 'Spv@2026' }
    });
    assert.equal(spvLogin.status, 200);
    const spvToken = spvLogin.data.token;

    const riniRow = db.prepare(`SELECT id FROM users WHERE username = 'op.rini'`).get();
    const unlockRes = await api(`/api/master/users/${riniRow.id}`, {
      method: 'PATCH',
      token: spvToken,
      body: { hmiPin: '345678', unlockAccount: true }
    });
    assert.equal(unlockRes.status, 200);

    const riniHmiOk = await api('/api/hmi/auth/login', {
      method: 'POST',
      body: { nik: 'EMP-0403', pin: '345678', machineId: 1, shiftNumber: 2 }
    });
    assert.equal(riniHmiOk.status, 200);

    // Shift Leader is view-only on Web downtime edits and Master Area creation.
    const leaderLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'leader.s1', password: 'Leader@2026' }
    });
    assert.equal(leaderLogin.status, 200);
    const dt2 = db.prepare(`SELECT id FROM downtime_events WHERE downtime_code = 'DT-2026-002'`).get();

    const leaderEditDt = await api(`/api/web/downtime/${dt2.id}`, {
      method: 'PATCH',
      token: leaderLogin.data.token,
      body: { reasonId: 2 }
    });
    assert.equal(leaderEditDt.status, 403);

    // Admin/Manager can manage operational Master SKU, but only SuperAdmin can create Master Area.
    const mgrLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'mgr.unit2', password: 'Manager@2026' }
    });
    assert.equal(mgrLogin.status, 200);
    const mgrAreaTry = await api('/api/master/areas', {
      method: 'POST',
      token: mgrLogin.data.token,
      body: { code: 'AREA-U3', name: 'Unit 3 Garam Industri' }
    });
    assert.equal(mgrAreaTry.status, 403);
  });

  it('handles HMI-T7 Buzzer Mute without closing Interlock, Quality +5 input, and GW-100 FIFO offline replay', async () => {
    const wahyuLogin = await api('/api/hmi/auth/login', {
      method: 'POST',
      body: { nik: 'EMP-0402', pin: '234567', machineId: 2, shiftNumber: 2 }
    });
    assert.equal(wahyuLogin.status, 200);
    const hmiToken = wahyuLogin.data.token;

    const muteRes = await api('/api/hmi/buzzer/mute', {
      method: 'POST',
      token: hmiToken,
      body: { machineId: 2 }
    });
    assert.equal(muteRes.status, 200);
    assert.equal(muteRes.data.buzzerRelay, 0);
    assert.equal(muteRes.data.interlockStillActive, true);

    const qualRes = await api('/api/hmi/quality-events', {
      method: 'POST',
      token: hmiToken,
      body: { machineId: 1, qualityType: 'REJECT', qty: 5, unitName: 'pcs' }
    });
    assert.equal(qualRes.status, 201);
    assert.equal(qualRes.data.context.registers.d007_hmi_defect_count, 33);

    const replayRes = await api('/api/edge/replay', {
      method: 'POST',
      token: hmiToken,
      body: { machineId: 3 }
    });
    assert.equal(replayRes.status, 200);
    assert.equal(replayRes.data.replayedCount, 2);

    const m4State = db.prepare(`SELECT connection_status, sync_progress_registers FROM plc_register_states WHERE machine_id = 3`).get();
    assert.equal(m4State.connection_status, 'ONLINE');
    assert.equal(m4State.sync_progress_registers, 13);
  });

  it('supports Dual-Valuation Business Impact, Pre-Approval Unreasoned Gate, SPV Correction, and Permanent Release Lock', async () => {
    const spvToken = (await api('/api/auth/login', { method: 'POST', body: { identifier: 'spv.unit2', password: 'Spv@2026' } })).data.token;
    const mgrToken = (await api('/api/auth/login', { method: 'POST', body: { identifier: 'mgr.unit2', password: 'Manager@2026' } })).data.token;

    // Initially SKU unit_price_idr is NULL -> honest non-monetary fallback.
    const impactBefore = await api('/api/web/dashboard/business-impact?phase=LIVE', { token: mgrToken });
    assert.equal(impactBefore.status, 200);
    assert.equal(impactBefore.data.impact.valuationConfigured, false);
    assert.equal(impactBefore.data.impact.folOpportunityLoss.idr, null);
    assert.ok(impactBefore.data.impact.folOpportunityLoss.pcs > 0);

    // Configure SKU-GRM-250 price & COGS via Master SKU and verify IDR valuation activates immediately.
    const skuPatch = await api('/api/master/skus/1', {
      method: 'PATCH',
      token: mgrToken,
      body: { unitPriceIdr: 2500, cogsIdr: 1650 }
    });
    assert.equal(skuPatch.status, 200);

    const impactAfter = await api('/api/web/dashboard/business-impact?phase=LIVE', { token: mgrToken });
    assert.equal(impactAfter.data.impact.valuationConfigured, true);
    assert.ok(impactAfter.data.impact.revenueGoodOutput.idr > 0);
    assert.ok(impactAfter.data.impact.folOpportunityLoss.idr > 0);
    assert.ok(impactAfter.data.impact.frlRealQualityLoss.idr > 0);

    // Mesin Packing #5 Shift 2 report has UNCLASSIFIED DT-2026-007 -> Pre-Approval Gate must reject Approve with 409.
    const pk05Report = db.prepare(`SELECT id FROM shift_reports WHERE report_code = 'RPT-20261030-PK05-S2'`).get();
    const blockedApprove = await api(`/api/web/reports/by-shift/${pk05Report.id}/approve`, {
      method: 'POST',
      token: spvToken
    });
    assert.equal(blockedApprove.status, 409);
    assert.equal(blockedApprove.data.error, 'UNREASONED_DOWNTIME_EXISTS');

    // SPV classifies DT-2026-007 via Web Line Detail (closing end_time first as machine recovers, or classifying active fault).
    const dt7 = db.prepare(`SELECT id FROM downtime_events WHERE downtime_code = 'DT-2026-007'`).get();
    const heaterReason = db.prepare(`SELECT id FROM downtime_reasons WHERE code = 'DTR-L01-01'`).get();
    const spvClassify = await api(`/api/web/downtime/${dt7.id}`, {
      method: 'PATCH',
      token: spvToken,
      body: {
        reasonId: heaterReason.id,
        detailReason: 'Penggantian konektor termokopel SEN-T01 yang berkerak garam'
      }
    });
    assert.equal(spvClassify.status, 200);
    assert.equal(spvClassify.data.downtime.classification_status, 'CLASSIFIED');

    // Now SPV Approve succeeds, followed by Manager Release, permanently locking DT-2026-007!
    const okApprove = await api(`/api/web/reports/by-shift/${pk05Report.id}/approve`, {
      method: 'POST',
      token: spvToken
    });
    assert.equal(okApprove.status, 200);
    assert.equal(okApprove.data.report.approval_status, 'APPROVED');

    // SPV cannot Release (403); Admin/Manager can Release (200).
    const spvReleaseTry = await api(`/api/web/reports/by-shift/${pk05Report.id}/release`, {
      method: 'POST',
      token: spvToken
    });
    assert.equal(spvReleaseTry.status, 403);

    const mgrRelease = await api(`/api/web/reports/by-shift/${pk05Report.id}/release`, {
      method: 'POST',
      token: mgrToken
    });
    assert.equal(mgrRelease.status, 200);
    assert.equal(mgrRelease.data.report.approval_status, 'RELEASED');

    // Editing DT-2026-007 after RELEASED is rejected by DB trigger with 409.
    const editAfterRelease = await api(`/api/web/downtime/${dt7.id}`, {
      method: 'PATCH',
      token: mgrToken,
      body: { reasonId: heaterReason.id, detailReason: 'Attempt edit after release' }
    });
    assert.equal(editAfterRelease.status, 409);
  });

  it('enforces 2-Track Kaizen workflow (Track B Maintenance repair + SPV REVISE/OK verification) and per-user Notification read isolation', async () => {
    const opHmiToken = (await api('/api/hmi/auth/login', { method: 'POST', body: { nik: 'EMP-0402', pin: '234567', machineId: 2 } })).data.token;
    const techWebToken = (await api('/api/auth/login', { method: 'POST', body: { identifier: 'tech.maint', password: 'Tech@2026' } })).data.token;
    const spvToken = (await api('/api/auth/login', { method: 'POST', body: { identifier: 'spv.unit2', password: 'Spv@2026' } })).data.token;
    const superToken = (await api('/api/auth/login', { method: 'POST', body: { identifier: 'superadmin', password: 'Admin@2026' } })).data.token;

    const kzn1 = db.prepare(`SELECT id FROM kaizen_tickets WHERE code = 'KZN-2026-01'`).get();

    // Production Operator cannot submit Step 2 repair on Track B MAINTENANCE Kaizen.
    const opStep2Try = await api(`/api/kaizen/${kzn1.id}/step2`, {
      method: 'PATCH',
      token: opHmiToken,
      body: { rootCause: 'Coba tutup sendiri', solutionType: 'TEMPORARY', improvementDescription: 'Tes' }
    });
    assert.equal(opStep2Try.status, 403);

    // Maintenance Technician submits Step 2 -> CLOSED | NOT_VERIFIED.
    const techStep2 = await api(`/api/kaizen/${kzn1.id}/step2`, {
      method: 'PATCH',
      token: techWebToken,
      body: {
        rootCause: 'Konektor kabel kompensasi SEN-T01 teroksidasi uap garam lembap',
        solutionType: 'TEMPORARY',
        improvementDescription: 'Pembersihan kontak dan pelapisan heat-shrink sementara',
        afterTelemetry: { sealerTempC: 164.5 }
      }
    });
    assert.equal(techStep2.status, 200);
    assert.equal(techStep2.data.ticket.status, 'CLOSED');
    assert.equal(techStep2.data.ticket.verification_status, 'NOT_VERIFIED');

    // SPV returns ticket for REVISE -> REVISE | NOT_OK.
    const spvRevise = await api(`/api/kaizen/${kzn1.id}/verify`, {
      method: 'POST',
      token: spvToken,
      body: {
        decision: 'REVISE',
        revisionReason: 'Ganti dengan gland kabel IP68 tahan korosi agar permanen.'
      }
    });
    assert.equal(spvRevise.status, 200);
    assert.equal(spvRevise.data.ticket.status, 'REVISE');
    assert.equal(spvRevise.data.ticket.verification_status, 'NOT_OK');

    // Technician completes permanent fix -> SPV verifies OK -> CLOSED | OK.
    await api(`/api/kaizen/${kzn1.id}/step2`, {
      method: 'PATCH',
      token: techWebToken,
      body: {
        rootCause: 'Konektor kabel kompensasi SEN-T01 teroksidasi uap garam lembap',
        solutionType: 'PERMANENT',
        improvementDescription: 'Pemasangan thermowell SUS316L & cable gland IP68',
        afterTelemetry: { sealerTempC: 165.0 }
      }
    });
    const spvOk = await api(`/api/kaizen/${kzn1.id}/verify`, {
      method: 'POST',
      token: spvToken,
      body: { decision: 'OK' }
    });
    assert.equal(spvOk.status, 200);
    assert.equal(spvOk.data.ticket.status, 'CLOSED');
    assert.equal(spvOk.data.ticket.verification_status, 'OK');

    // Per-user notification read isolation between SPV and SuperAdmin.
    const superNotifBefore = await api('/api/web/notifications', { token: superToken });
    assert.ok(superNotifBefore.data.unreadCount > 0);

    await api('/api/web/notifications/read-all', { method: 'POST', token: spvToken });
    const spvNotifAfter = await api('/api/web/notifications', { token: spvToken });
    const superNotifAfter = await api('/api/web/notifications', { token: superToken });

    assert.equal(spvNotifAfter.data.unreadCount, 0);
    assert.equal(superNotifAfter.data.unreadCount, superNotifBefore.data.unreadCount);
  });
});

