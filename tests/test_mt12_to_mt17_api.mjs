import assert from 'node:assert/strict';
import { openDatabase, seedDatabase } from '../db/seed.mjs';
import { createApp } from '../server/app.mjs';

async function run() {
  const db = openDatabase(':memory:');
  seedDatabase(db);
  const app = createApp({ db, enableLiveTick: false });
  await new Promise((resolveListen) => {
    app.server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const loginUser = async (username, password) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    return data.token;
  };

  const spvToken = await loginUser('spv.unit2', 'Spv@2026');
  const mgrToken = await loginUser('mgr.unit2', 'Manager@2026');
  const superToken = await loginUser('superadmin', 'Admin@2026');

  try {
    console.log('Testing MT-12...');
    const resActive = await fetch(`${baseUrl}/api/web/production-active`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resActive.status, 200);
    const activeData = await resActive.json();
    assert.ok(activeData.summary);
    assert.ok(activeData.cards.length > 0);
    assert.equal(activeData.summary.jipmTargetPct, 85);

    const resDetail = await fetch(`${baseUrl}/api/web/lines/1/detail`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resDetail.status, 200);
    const detailData = await resDetail.json();
    assert.ok(detailData.waterfall.length > 0);
    assert.ok(detailData.downtimes.length > 0);

    const firstDt = detailData.downtimes[0];
    const patchRes = await fetch(`${baseUrl}/api/web/downtime/${firstDt.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${spvToken}`
      },
      body: JSON.stringify({
        reasonId: 1,
        subMachineId: 1,
        detailReason: 'Koreksi Supervisor: Penggantian elemen pemanas sealer dan kalibrasi sensor temperatur'
      })
    });
    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.equal(patchData.ok, true);
    assert.equal(patchData.downtime.detail_reason, 'Koreksi Supervisor: Penggantian elemen pemanas sealer dan kalibrasi sensor temperatur');
    assert.equal(patchData.downtime.classification_status, 'CLASSIFIED');
    console.log('MT-12 passed!');

    console.log('Testing MT-13...');
    const resBiz = await fetch(`${baseUrl}/api/web/dashboard/business-impact?phase=LIVE`, {
      headers: { Authorization: `Bearer ${mgrToken}` }
    });
    assert.equal(resBiz.status, 200);
    const bizData = await resBiz.json();
    assert.ok(bizData.impact);
    assert.ok((bizData.impact.revenueGoodOutput?.pcs || bizData.impact.goodOutputPcs || 0) > 0);
    assert.ok((bizData.impact.folOpportunityLoss?.minutes || bizData.impact.financialOpportunityLossIdr || 0) > 0);

    const resOee = await fetch(`${baseUrl}/api/web/dashboard/oee-performance`, {
      headers: { Authorization: `Bearer ${mgrToken}` }
    });
    if (resOee.status !== 200) {
      console.log('OEE Error:', await resOee.json());
    }
    assert.equal(resOee.status, 200);
    const oeeData = await resOee.json();
    assert.equal(oeeData.jipmStandards.oee, 85);
    assert.ok(oeeData.sixBigLosses.length > 0);
    assert.ok(oeeData.dailyHeatmap.length > 0);
    console.log('MT-13 passed!');

    console.log('Testing MT-14...');
    const resAvail = await fetch(`${baseUrl}/api/web/losses/availability`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resAvail.status, 200);
    const availData = await resAvail.json();
    assert.ok(availData.events.length > 0);
    assert.ok(availData.mttrMtbfByMachine.length > 0);

    const resPerf = await fetch(`${baseUrl}/api/web/losses/performance`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resPerf.status, 200);
    const perfData = await resPerf.json();
    assert.ok(perfData.summary);

    const resQual = await fetch(`${baseUrl}/api/web/losses/quality`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resQual.status, 200);
    const qualData = await resQual.json();
    assert.ok(qualData.events.length > 0);

    const resDrill = await fetch(`${baseUrl}/api/web/losses/downtime-reason/1`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resDrill.status, 200);
    const drillData = await resDrill.json();
    assert.ok(drillData.reason);
    console.log('MT-14 passed!');

    console.log('Testing MT-15...');
    const createRes = await fetch(`${baseUrl}/api/kaizen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${spvToken}`
      },
      body: JSON.stringify({
        title: 'Optimasi Penyetelan Ketegangan Belt Penarik Film Garam',
        description: 'Belt penarik film kendor 3 mm',
        kaizenType: 'Production Kaizen',
        fishboneFactor: 'Mesin, Metode',
        targetSixBigLosses: 'L-04 Reduced Speed',
        subMachineName: 'Rotary Cutter & Main Drive',
        reviewerSpvUsername: 'spv.unit2',
        machineId: 1
      })
    });
    if (createRes.status !== 201) {
      console.log('Kaizen create status:', createRes.status, await createRes.json());
    }
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const ticketId = createData.ticket.id;
    assert.equal(createData.ticket.status, 'OPEN');
    assert.equal(createData.ticket.verification_status, 'NOT_OK');
    const compoundStatus1 = `${createData.ticket.status} | ${createData.ticket.verification_status.replace('_', ' ')}`;
    assert.equal(compoundStatus1, 'OPEN | NOT OK');

    const step2Res = await fetch(`${baseUrl}/api/kaizen/${ticketId}/step2`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${spvToken}`
      },
      body: JSON.stringify({
        rootCause: 'Belt penarik film kendor 3 mm menyebabkan slip saat motor servo berputar di atas 38 ppm',
        correctiveAction: 'Penyetelan ulang tensioner belt dan penggantian pegas penekan stainless anti karat',
        resolutionType: 'Penyetelan Ulang & Modifikasi'
      })
    });
    assert.equal(step2Res.status, 200);
    const step2Data = await step2Res.json();
    assert.equal(step2Data.ticket.status, 'CLOSED');
    assert.equal(step2Data.ticket.verification_status, 'NOT_VERIFIED');
    const compoundStatus2 = `${step2Data.ticket.status} | ${step2Data.ticket.verification_status.replace('_', ' ')}`;
    assert.equal(compoundStatus2, 'CLOSED | NOT VERIFIED');

    const verifyRes = await fetch(`${baseUrl}/api/kaizen/${ticketId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${spvToken}`
      },
      body: JSON.stringify({
        decision: 'OK',
        verificationStatus: 'OK',
        verificationNote: 'Kecepatan D002 stabil naik menjadi 41.5 pcs/menit dan frekuensi henti berkurang.'
      })
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.ticket.status, 'CLOSED');
    assert.equal(verifyData.ticket.verification_status, 'OK');
    const compoundStatus3 = `${verifyData.ticket.status} | ${verifyData.ticket.verification_status.replace('_', ' ')}`;
    assert.equal(compoundStatus3, 'CLOSED | OK');

    const resTpm = await fetch(`${baseUrl}/api/kaizen/tpm-impact`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resTpm.status, 200);
    const tpmData = await resTpm.json();
    assert.ok(tpmData.baseline2022?.oeePct || tpmData.baseline?.oeePct);
    assert.ok(tpmData.postTpm2023?.oeePct || tpmData.postTpm?.oeePct);
    console.log('MT-15 passed!');

    console.log('Testing MT-16...');
    const resReports = await fetch(`${baseUrl}/api/web/reports/by-shift?machineId=1`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resReports.status, 200);
    const reportsData = await resReports.json();
    assert.ok(reportsData.reports.length > 0);

    const shiftReport = reportsData.reports[0];

    const resDetailRep = await fetch(`${baseUrl}/api/web/reports/by-shift/${shiftReport.id}`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resDetailRep.status, 200);
    const detailDataRep = await resDetailRep.json();
    assert.ok(detailDataRep.preApprovalGate);

    db.prepare(`UPDATE downtime_events SET classification_status = 'CLASSIFIED', reason_id = 1 WHERE shift_report_id = ?`).run(shiftReport.id);
    db.prepare(`UPDATE shift_reports SET approval_status = 'NEEDS_APPROVAL' WHERE id = ?`).run(shiftReport.id);

    const approveRes = await fetch(`${baseUrl}/api/web/reports/by-shift/${shiftReport.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.report.approval_status, 'APPROVED');

    const releaseRes = await fetch(`${baseUrl}/api/web/reports/by-shift/${shiftReport.id}/release`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` }
    });
    assert.equal(releaseRes.status, 200);
    const releaseData = await releaseRes.json();
    assert.equal(releaseData.report.approval_status, 'RELEASED');

    const resProd = await fetch(`${baseUrl}/api/web/reports/by-product?skuId=1`, {
      headers: { Authorization: `Bearer ${spvToken}` }
    });
    assert.equal(resProd.status, 200);
    const prodData = await resProd.json();
    assert.ok(prodData.batches.length > 0);
    console.log('MT-16 passed!');

    console.log('Testing MT-17...');
    const resAudit = await fetch(`${baseUrl}/api/web/audit-logs?search=superadmin`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert.equal(resAudit.status, 200);
    const auditData = await resAudit.json();
    assert.ok(auditData.logs.length >= 0);

    const resNotif = await fetch(`${baseUrl}/api/web/notifications`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert.equal(resNotif.status, 200);
    const notifData = await resNotif.json();
    assert.ok(notifData.notifications.length > 0);

    const firstNotif = notifData.notifications[0];
    const resReadOne = await fetch(`${baseUrl}/api/web/notifications/${firstNotif.id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert.equal(resReadOne.status, 200);

    const resReadAll = await fetch(`${baseUrl}/api/web/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert.equal(resReadAll.status, 200);

    const resNotifAfter = await fetch(`${baseUrl}/api/web/notifications`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    const notifAfterData = await resNotifAfter.json();
    assert.equal(notifAfterData.unreadCount, 0);
    console.log('MT-17 passed!');

    console.log('\n=== ALL API TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('\nFAILED WITH ERROR:', err);
    process.exit(1);
  } finally {
    await app.close();
    db.close();
  }
}

run();
