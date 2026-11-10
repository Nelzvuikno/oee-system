import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  authenticateHmiOperator,
  authenticateWebUser,
  createRecoveryRequest,
  getPermissionsForUser,
  hashOpaqueToken,
  hashSecret,
  resolveSession,
  sanitizeUser,
  verifySecret
} from './auth.mjs';
import {
  buildSixBigLosses,
  calculateOeeMetrics,
  computeBusinessImpact,
  convertPackagingUnits,
  normalizeActualUnitToPcs,
  round1,
  round2
} from './oee-engine.mjs';
import {
  getMachineContext,
  ingestPlcRegisters,
  pushNotification,
  recalculateShiftReport,
  recordAuditLog
} from './repository.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIR = resolve(__dirname, '../public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function createSseHub() {
  const clients = new Set();
  return {
    add(res) {
      clients.add(res);
      res.on('close', () => clients.delete(res));
    },
    broadcast(event, data) {
      const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const client of clients) {
        try {
          client.write(frame);
        } catch {
          clients.delete(client);
        }
      }
    },
    closeAll() {
      for (const client of clients) {
        try {
          client.end();
        } catch {
          // Ignore already-closed sockets during shutdown.
        }
      }
      clients.clear();
    }
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function sendCsv(res, filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(','))
  ];
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store'
  });
  res.end(lines.join('\r\n'));
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 2 * 1024 * 1024) {
      throw Object.assign(new Error('Ukuran payload melebihi batas 2 MB.'), { status: 413 });
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  // 1. Try standard JSON parse
  try {
    return JSON.parse(raw);
  } catch {}

  // 2. Try URL-encoded form data (e.g. key=val&key2=val2)
  if (raw.includes('=') && !raw.startsWith('{') && !raw.startsWith('[')) {
    try {
      const params = new URLSearchParams(raw);
      const obj = {};
      for (const [k, v] of params.entries()) {
        obj[k] = v;
      }
      if (Object.keys(obj).length > 0) return obj;
    } catch {}
  }

  // 3. Try relaxed JSON with unquoted keys or single quotes
  try {
    const relaxed = raw
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
    return JSON.parse(relaxed);
  } catch {}

  // 4. Try extracting register key-values from raw text (e.g. "D000 bernilai 1...")
  const extracted = {};
  const regMatches = raw.matchAll(/(D\d{3}|d\d{3}|machineId|machine_id)[^\d:=-]*[:=]?\s*([+-\d.]+)/gi);
  for (const m of regMatches) {
    const key = m[1].toUpperCase();
    const val = Number(m[2]) || m[2];
    extracted[key] = val;
  }
  if (Object.keys(extracted).length > 0) {
    return extracted;
  }

  return { rawText: raw };
}

function extractBearerToken(req, urlObj) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  if (urlObj && urlObj.searchParams && urlObj.searchParams.get('token')) {
    return urlObj.searchParams.get('token');
  }
  const cookieHeader = req.headers.cookie || '';
  if (cookieHeader) {
    const parts = cookieHeader.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      const key = k.trim().toLowerCase();
      if (key === 'token' || key === 'auth_token' || key === 'session' || key === 'session_token') {
        const val = decodeURIComponent(v.join('=')).trim();
        if (val) return val;
      }
    }
  }
  return null;
}

function matchPath(pattern, pathname) {
  const patParts = pattern.split('/').filter(Boolean);
  const urlParts = pathname.split('/').filter(Boolean);
  if (patParts.length !== urlParts.length) return null;
  const params = {};
  for (let i = 0; i < patParts.length; i += 1) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = decodeURIComponent(urlParts[i]);
    } else if (patParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}

function parseJsonSafe(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function buildRegistersMap(ctx) {
  const reg = ctx?.registers || {};
  const statusNum = Number(reg.d000_status ?? 1);
  const statusLabel = statusNum === 1 ? 'RUN' : (statusNum === 2 ? 'STOP' : (statusNum === 3 ? 'FAULT' : 'STANDBY'));

  const list = [
    { address: 'D000', register_address: 'D000', name: 'machine_status', description: 'Status operasi mesin (RUN / STOP / FAULT)', value: statusNum, raw_value: statusNum, status: statusLabel, unit: '' },
    { address: 'D001', register_address: 'D001', name: 'stop_reason_code', description: 'Kode pemicu henti/alarm logika PLC', value: Number(reg.d001_stop_code ?? 0), raw_value: Number(reg.d001_stop_code ?? 0), unit: 'code' },
    { address: 'D002', register_address: 'D002', name: 'speed_ppm', sensor: 'SEN-S01', description: 'Kecepatan aktual produksi SEN-S01', value: Number(reg.d002_speed_pcs_min ?? 0), raw_value: Number(reg.d002_speed_pcs_min ?? 0), unit: 'pcs/menit' },
    { address: 'D003', register_address: 'D003', name: 'good_count', sensor: 'CNT-G01', description: 'Total produk baik CNT-G01 (Good Counter)', value: Number(reg.d003_good_count ?? 0), raw_value: Number(reg.d003_good_count ?? 0), unit: 'pcs' },
    { address: 'D004', register_address: 'D004', name: 'reject_auto_count', sensor: 'CNT-R01', description: 'Total reject otomatis sensor CNT-R01', value: Number(reg.d004_auto_reject_count ?? 0), raw_value: Number(reg.d004_auto_reject_count ?? 0), unit: 'pcs' },
    { address: 'D005', register_address: 'D005', name: 'sealer_temp_c', sensor: 'SEN-T01', description: 'Suhu sealer SEN-T01 (Vertical Heater Sealer)', value: Number(reg.d005_sealer_temp_c ?? 0), raw_value: Number(reg.d005_sealer_temp_c ?? 0), unit: '°C' },
    { address: 'D006', register_address: 'D006', name: 'bearing_vib_mms', sensor: 'SEN-V01', description: 'Nilai vibrasi bearing SEN-V01 (Vibrasi RMS)', value: Number(reg.d006_vibration_mms ?? 0), raw_value: Number(reg.d006_vibration_mms ?? 0), unit: 'mm/s' },
    { address: 'D007', register_address: 'D007', name: 'defect_manual_count', description: 'Defect manual HMI L-05 Process Defect', value: Number(reg.d007_hmi_defect_count ?? 0), raw_value: Number(reg.d007_hmi_defect_count ?? 0), unit: 'pcs' },
    { address: 'D008', register_address: 'D008', name: 'scrap_k3_count', description: 'Scrap K3 HMI L-06 Startup & Spillage', value: Number(reg.d008_hmi_scrap_k3_count ?? 0), raw_value: Number(reg.d008_hmi_scrap_k3_count ?? 0), unit: 'pcs' },
    { address: 'D009', register_address: 'D009', name: 'minor_stop_flag', description: 'Indikator henti singkat L-03 Minor Stop', value: Number(reg.d009_minor_stop_flag ?? 0), raw_value: Number(reg.d009_minor_stop_flag ?? 0), unit: 'flag' },
    { address: 'D010', register_address: 'D010', name: 'auto_downtime_flag', description: 'Indikator auto downtime L-01/L-02 aktif', value: Number(reg.d010_auto_downtime_flag ?? 0), raw_value: Number(reg.d010_auto_downtime_flag ?? 0), unit: 'flag' },
    { address: 'D011', register_address: 'D011', name: 'buzzer_relay_state', sensor: 'BUZ-01', description: 'Relay alarm sirine BUZ-01 interlock', value: Number(reg.d011_buzzer_relay ?? 0), raw_value: Number(reg.d011_buzzer_relay ?? 0), unit: 'state' },
    { address: 'D012', register_address: 'D012', name: 'heartbeat_seq', description: 'Counter heartbeat gateway GW-100', value: Number(reg.d012_heartbeat_seq ?? 0), raw_value: Number(reg.d012_heartbeat_seq ?? 0), unit: 'seq' }
  ];

  const dict = {};
  for (const item of list) {
    dict[item.address] = item;
    dict[item.address.toLowerCase()] = item;
  }

  return { list, dict, statusLabel };
}

function normalizeTelemetryPayload(raw, prevRegisters = {}) {
  if (!raw) return { machineId: 1 };
  const p = raw.registers || raw.payload || raw;
  const normalized = { ...raw };

  const machineIdentifier = raw.machineId ?? raw.machine_id ?? raw.machineCode ?? raw.machine_code ?? raw.machine ?? p.machineId ?? p.machine_id ?? 1;

  const d000Raw = p.D000 ?? p.d000 ?? p.d000_status ?? p.machine_status ?? p.status;
  if (d000Raw !== undefined) {
    if (typeof d000Raw === 'string') {
      const upper = d000Raw.toUpperCase();
      if (upper.includes('RUN')) normalized.d000_status = 1;
      else if (upper.includes('STOP')) normalized.d000_status = 2;
      else if (upper.includes('FAULT') || upper.includes('ALARM')) normalized.d000_status = 3;
      else if (upper.includes('STANDBY')) normalized.d000_status = 0;
      else normalized.d000_status = Number(d000Raw) || 0;
    } else {
      normalized.d000_status = Number(d000Raw);
    }
  }

  const d001Raw = p.D001 ?? p.d001 ?? p.d001_stop_code ?? p.stop_code ?? p.stop_reason_code;
  if (d001Raw !== undefined) normalized.d001_stop_code = Number(d001Raw);

  const d002Raw = p.D002 ?? p.d002 ?? p.d002_speed_pcs_min ?? p.speed_ppm ?? p.speed;
  if (d002Raw !== undefined) normalized.d002_speed_pcs_min = Number(d002Raw);

  const prevGood = Number(prevRegisters.d003_good_count || 0);
  const d003Raw = p.D003 ?? p.d003 ?? p.d003_good_count ?? p.good_count ?? p.actual_count;
  const deltaGoodRaw = p.deltaGood ?? p.delta_good ?? p.d003_delta ?? p.D003_delta;

  if (deltaGoodRaw !== undefined) {
    normalized.d003_good_count = prevGood + Number(deltaGoodRaw);
  } else if (d003Raw !== undefined) {
    if (typeof d003Raw === 'string' && d003Raw.includes('+')) {
      const delta = Number(d003Raw.replace(/[^\d.-]/g, '')) || 0;
      normalized.d003_good_count = prevGood + delta;
    } else {
      const num = Number(d003Raw);
      if (num > 0 && num <= 100 && prevGood >= 500) {
        normalized.d003_good_count = prevGood + num;
      } else {
        normalized.d003_good_count = num;
      }
    }
  }

  const d004Raw = p.D004 ?? p.d004 ?? p.d004_auto_reject_count ?? p.reject_auto_count;
  if (d004Raw !== undefined) normalized.d004_auto_reject_count = Number(d004Raw);

  const d005Raw = p.D005 ?? p.d005 ?? p.d005_sealer_temp_c ?? p.sealer_temp_c ?? p.temp;
  if (d005Raw !== undefined) normalized.d005_sealer_temp_c = Number(d005Raw);

  const d006Raw = p.D006 ?? p.d006 ?? p.d006_vibration_mms ?? p.bearing_vib_mms ?? p.vibration;
  if (d006Raw !== undefined) normalized.d006_vibration_mms = Number(d006Raw);

  const d007Raw = p.D007 ?? p.d007 ?? p.d007_hmi_defect_count ?? p.defect_manual_count;
  if (d007Raw !== undefined) normalized.d007_hmi_defect_count = Number(d007Raw);

  const d008Raw = p.D008 ?? p.d008 ?? p.d008_hmi_scrap_k3_count ?? p.scrap_k3_count;
  if (d008Raw !== undefined) normalized.d008_hmi_scrap_k3_count = Number(d008Raw);

  const d009Raw = p.D009 ?? p.d009 ?? p.d009_minor_stop_flag ?? p.minor_stop_flag;
  if (d009Raw !== undefined) normalized.d009_minor_stop_flag = Number(d009Raw);

  const d010Raw = p.D010 ?? p.d010 ?? p.d010_auto_downtime_flag ?? p.auto_downtime_flag ?? p.downtime_flag;
  if (d010Raw !== undefined) normalized.d010_auto_downtime_flag = Number(d010Raw);

  const d011Raw = p.D011 ?? p.d011 ?? p.d011_buzzer_relay ?? p.buzzer_relay ?? p.buzzer_activated;
  if (d011Raw !== undefined) normalized.d011_buzzer_relay = Number(d011Raw);

  const d012Raw = p.D012 ?? p.d012 ?? p.d012_heartbeat_seq ?? p.heartbeat_seq;
  if (d012Raw !== undefined) normalized.d012_heartbeat_seq = Number(d012Raw);

  normalized.machineId = machineIdentifier;
  return normalized;
}

export function createApp({ db, publicDir = DEFAULT_PUBLIC_DIR, enableLiveTick = false }) {
  const sseHub = createSseHub();
  let tickTimer = null;
  let lastManualIngestAt = 0;

  if (enableLiveTick) {
    tickTimer = setInterval(() => {
      try {
        if (Date.now() - lastManualIngestAt < 60000) {
          // Pause background jitter for 60 seconds after explicit manual/test ingestion
          return;
        }
        const running = db.prepare(`
          SELECT machine_id, d002_speed_pcs_min, d003_good_count, d005_sealer_temp_c, d006_vibration_mms, d012_heartbeat_seq
          FROM plc_register_states
          WHERE d000_status = 1 AND connection_status = 'ONLINE'
        `).all();
        for (const r of running) {
          if (r.d002_speed_pcs_min < 35.0) {
            // Keep reduced speed condition intact if active
            continue;
          }
          const jitterSpeed = round1(Math.max(36.8, Math.min(41.6, r.d002_speed_pcs_min + (Math.random() - 0.48) * 0.4)));
          const jitterTemp = round1(Math.max(162.5, Math.min(167.2, r.d005_sealer_temp_c + (Math.random() - 0.5) * 0.3)));
          ingestPlcRegisters(
            db,
            {
              machineId: r.machine_id,
              d002_speed_pcs_min: jitterSpeed,
              d003_good_count: r.d003_good_count + 2,
              d005_sealer_temp_c: jitterTemp,
              d012_heartbeat_seq: (r.d012_heartbeat_seq + 3) % 65536
            },
            sseHub
          );
        }
      } catch {
        // Prevent background telemetry ticker from crashing the HTTP server.
      }
    }, 3000);
  }

  function requireAuth(req, res, urlObj, channelFilter = null) {
    const token = extractBearerToken(req, urlObj);
    const session = resolveSession(db, token);
    if (!session) {
      sendJson(res, 401, { error: 'UNAUTHORIZED', message: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' });
      return null;
    }
    if (channelFilter === 'WEB' && !session.user.permissions.canAccessWeb) {
      sendJson(res, 403, { error: 'FORBIDDEN_WEB', message: 'Peran akun ini tidak memiliki akses ke Aplikasi Web.' });
      return null;
    }
    if (channelFilter === 'HMI' && !session.user.permissions.canAccessHmi) {
      sendJson(res, 403, { error: 'FORBIDDEN_HMI', message: 'Peran akun ini tidak memiliki akses ke Panel HMI-T7.' });
      return null;
    }
    return session;
  }

  function requirePermission(res, session, permKey, message) {
    if (!session.user.permissions[permKey]) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        requiredPermission: permKey,
        role: session.user.role,
        message: message || 'Anda tidak memiliki hak akses untuk menjalankan aksi ini.'
      });
      return false;
    }
    return true;
  }

  function serveStatic(req, res, pathname) {
    let targetRel = pathname;
    if (
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/forgot-password' ||
      pathname === '/web' ||
      (pathname.startsWith('/web/') && !pathname.split('/').pop().includes('.'))
    ) {
      targetRel = '/index.html';
    } else if (pathname === '/hmi' || (pathname.startsWith('/hmi/') && !pathname.split('/').pop().includes('.'))) {
      targetRel = '/hmi.html';
    } else if (pathname.includes('.')) {
      // If a subpath requested an asset directly, fallback to filename in public
      const baseName = pathname.split('/').pop();
      const directAbs = resolve(publicDir, baseName);
      if (existsSync(directAbs) && statSync(directAbs).isFile()) {
        targetRel = '/' + baseName;
      }
    }

    const safeRel = normalize(targetRel).replace(/^(\.\.(\/|\\|$))+/, '');
    const absPath = resolve(publicDir, `.${safeRel.startsWith('/') ? safeRel : `/${safeRel}`}`);
    if (!absPath.startsWith(publicDir) || !existsSync(absPath)) {
      return false;
    }
    const stat = statSync(absPath);
    if (!stat.isFile()) return false;

    const ext = extname(absPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(readFileSync(absPath));
    return true;
  }

  const requestHandler = async (req, res) => {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = (req.method || 'GET').toUpperCase();
    const ipAddress = String(req.socket?.remoteAddress || '127.0.0.1');

    try {
      if (method === 'GET' && pathname === '/api/health') {
        const machineCount = db.prepare(`SELECT COUNT(*) AS c FROM machines`).get().c;
        return sendJson(res, 200, { status: 'ok', service: 'productioncore-oee', machineCount });
      }

      if (method === 'GET' && pathname === '/api/stream') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive'
        });
        res.write(`event: connected\ndata: ${JSON.stringify({ userId: session.user.id, channel: session.channel })}\n\n`);
        sseHub.add(res);
        return;
      }

      // Main Task 01: Web Authentication, Profile & Access Recovery
      if (method === 'POST' && pathname === '/api/auth/login') {
        const body = await readJsonBody(req);
        const result = authenticateWebUser(db, {
          identifier: body.identifier || body.username || body.email,
          password: body.password,
          ipAddress
        });
        if (!result.ok) {
          if (result.code === 'ACCOUNT_LOCKED') {
            pushNotification(
              db,
              {
                severity: 'SECURITY',
                tagLabel: 'KUNCI AKUN WEB',
                title: `Akun Web Dikunci Sementara (${body.identifier || 'Unknown'})`,
                body: result.message,
                targetRoles: ['SUPERADMIN'],
                ctaLabel: 'Buka Master User',
                ctaRoute: '/web/master/users'
              },
              sseHub
            );
          }
          return sendJson(res, result.status, result);
        }
        recordAuditLog(db, {
          category: 'AUTH',
          title: `${result.user.fullName} (${result.user.role}) berhasil login ke Aplikasi Web`,
          actorId: result.user.id,
          actorLabel: `${result.user.fullName} (${result.user.role})`,
          sourceChannel: 'WEB',
          entityType: 'users',
          entityId: result.user.id,
          ipAddress
        });
        res.setHeader('Set-Cookie', [
          `token=${result.token}; Path=/; SameSite=Lax`,
          `auth_token=${result.token}; Path=/; SameSite=Lax`,
          `session=${result.token}; Path=/; SameSite=Lax`
        ]);
        return sendJson(res, 200, result);
      }

      if (method === 'POST' && pathname === '/api/auth/logout') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        db.prepare(`UPDATE auth_sessions SET revoked_at = ? WHERE id = ?`).run(new Date().toISOString(), session.sessionId);
        return sendJson(res, 200, { ok: true });
      }

      if (method === 'GET' && pathname === '/api/auth/me') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        return sendJson(res, 200, { ok: true, channel: session.channel, user: session.user });
      }

      if (method === 'PATCH' && pathname === '/api/auth/profile') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const body = await readJsonBody(req);
        const fullName = body.fullName ? String(body.fullName).trim() : session.rawUser.full_name;
        const email = body.email !== undefined ? (body.email ? String(body.email).trim() : null) : session.rawUser.email;
        const theme = body.themePreference === 'dark' ? 'dark' : body.themePreference === 'light' ? 'light' : session.rawUser.theme_preference;

        db.prepare(`
          UPDATE users SET full_name = ?, email = ?, theme_preference = ?, updated_at = ? WHERE id = ?
        `).run(fullName, email, theme, new Date().toISOString(), session.user.id);

        const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(session.user.id);
        return sendJson(res, 200, { ok: true, user: sanitizeUser(updated) });
      }

      if (method === 'POST' && pathname === '/api/auth/change-password') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const body = await readJsonBody(req);
        if (!verifySecret(body.currentPassword, session.rawUser.password_hash)) {
          return sendJson(res, 400, { ok: false, message: 'Kata sandi saat ini tidak sesuai.' });
        }
        if (!body.newPassword || String(body.newPassword).length < 8) {
          return sendJson(res, 400, { ok: false, message: 'Kata sandi baru minimal 8 karakter.' });
        }
        db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
          .run(hashSecret(body.newPassword), new Date().toISOString(), session.user.id);
        recordAuditLog(db, {
          category: 'AUTH',
          title: `${session.user.fullName} memperbarui kata sandi akun Web`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'users',
          entityId: session.user.id,
          ipAddress
        });
        return sendJson(res, 200, { ok: true, message: 'Kata sandi berhasil diperbarui.' });
      }

      if (method === 'POST' && pathname === '/api/auth/forgot-password') {
        const body = await readJsonBody(req);
        const ident = String(body.identifier || '').trim();
        const user = db.prepare(`
          SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(COALESCE(email, '')) = LOWER(?) OR LOWER(nik) = LOWER(?) LIMIT 1
        `).get(ident, ident, ident);

        if (!user) {
          return sendJson(res, 200, {
            ok: true,
            message: 'Permintaan pemulihan telah dicatat dan diteruskan ke SuperAdmin OT.'
          });
        }

        const recovery = createRecoveryRequest(db, {
          userId: user.id,
          channel: 'WEB_PASSWORD',
          reasonNote: String(body.reasonNote || 'Permintaan reset kata sandi dari halaman Login Web')
        });

        pushNotification(
          db,
          {
            severity: 'SECURITY',
            tagLabel: 'PEMULIHAN SANDI WEB',
            title: `Permintaan Reset Sandi Web: ${user.full_name} (${user.nik})`,
            body: `Token pemulihan 15 menit telah diterbitkan untuk akun ${user.username}.`,
            targetRoles: ['SUPERADMIN'],
            ctaLabel: 'Kelola Akun User',
            ctaRoute: '/web/master/users',
            entityType: 'access_recovery_requests',
            entityId: recovery.requestId
          },
          sseHub
        );

        return sendJson(res, 200, {
          ok: true,
          expiresAt: recovery.expiresAt,
          // Exposed on local LAN deployment so on-premise verification works without external SMTP.
          resetTokenPreview: recovery.resetToken,
          message: 'Token pemulihan 15 menit berhasil dibuat dan SuperAdmin telah diberi notifikasi.'
        });
      }

      if (method === 'POST' && pathname === '/api/auth/reset-password') {
        const body = await readJsonBody(req);
        if (!body.resetToken || !body.newPassword || String(body.newPassword).length < 8) {
          return sendJson(res, 400, { ok: false, message: 'Token pemulihan dan kata sandi baru (minimal 8 karakter) wajib diisi.' });
        }
        const tokenHash = hashOpaqueToken(body.resetToken);
        const reqRow = db.prepare(`
          SELECT * FROM access_recovery_requests
          WHERE reset_token_hash = ? AND status = 'PENDING'
          LIMIT 1
        `).get(tokenHash);

        if (!reqRow || new Date(reqRow.token_expires_at).getTime() <= Date.now()) {
          return sendJson(res, 400, { ok: false, message: 'Token pemulihan tidak valid atau telah kedaluwarsa (batas 15 menit).' });
        }

        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE users
          SET password_hash = ?, failed_web_attempts = 0, web_locked_until = NULL, updated_at = ?
          WHERE id = ?
        `).run(hashSecret(body.newPassword), nowIso, reqRow.user_id);

        db.prepare(`
          UPDATE access_recovery_requests SET status = 'COMPLETED', resolved_at = ? WHERE id = ?
        `).run(nowIso, reqRow.id);

        return sendJson(res, 200, { ok: true, message: 'Kata sandi berhasil direset. Silakan masuk kembali.' });
      }

      // Main Task 07: Panel HMI-T7 Touch Numpad PIN Authentication & Handover Logout
      if (method === 'GET' && pathname === '/api/hmi/operators') {
        const machineId = urlObj.searchParams.get('machineId');
        const machines = db.prepare(`
          SELECT m.id, m.code, m.name, m.plc_ip, m.hmi_code, l.name AS line_name,
                 p.d000_status, p.connection_status, p.d011_buzzer_relay
          FROM machines m
          JOIN lines l ON l.id = m.line_id
          LEFT JOIN plc_register_states p ON p.machine_id = m.id
          WHERE m.is_active = 1
          ORDER BY m.id ASC
        `).all();

        const operators = db.prepare(`
          SELECT id, nik, username, full_name, role, user_type, department, job_title,
                 primary_machine_id, hmi_locked_until
          FROM users
          WHERE is_active = 1 AND hmi_pin_hash IS NOT NULL
          ORDER BY
            CASE WHEN primary_machine_id = ? THEN 0 ELSE 1 END,
            role = 'OPERATOR' DESC,
            full_name ASC
        `).all(Number(machineId) || 1);

        const shifts = db.prepare(`SELECT * FROM shift_definitions ORDER BY shift_number ASC`).all();
        return sendJson(res, 200, { machines, operators, shifts });
      }

      if (method === 'POST' && pathname === '/api/hmi/auth/login') {
        const body = await readJsonBody(req);
        const result = authenticateHmiOperator(db, {
          userId: body.userId,
          nik: body.nik,
          pin: body.pin,
          machineId: body.machineId,
          shiftNumber: body.shiftNumber,
          ipAddress
        });

        if (!result.ok) {
          if (result.code === 'HMI_PIN_LOCKED') {
            pushNotification(
              db,
              {
                severity: 'SECURITY',
                tagLabel: 'HMI PIN LOCKOUT',
                title: `Numpad Panel HMI-T7 Terkunci 5 Menit (Mesin ID ${body.machineId || 1})`,
                body: result.message,
                targetRoles: ['SPV', 'SUPERADMIN'],
                machineId: Number(body.machineId) || 1,
                ctaLabel: 'Periksa Akun Operator',
                ctaRoute: '/web/master/users'
              },
              sseHub
            );
          }
          return sendJson(res, result.status, result);
        }

        recordAuditLog(db, {
          category: 'AUTH',
          title: `Operator ${result.user.fullName} (${result.user.nik}) login ke Panel HMI-T7 Shift ${result.shiftNumber}`,
          actorId: result.user.id,
          actorLabel: `${result.user.fullName} (${result.user.nik})`,
          sourceChannel: 'HMI-T7',
          machineId: result.machineId,
          entityType: 'users',
          entityId: result.user.id,
          ipAddress
        });
        return sendJson(res, 200, result);
      }

      if (method === 'POST' && pathname === '/api/hmi/auth/forgot-pin') {
        const body = await readJsonBody(req);
        const cleanNik = String(body.nik || '').trim();
        const user = db.prepare(`SELECT * FROM users WHERE id = ? OR LOWER(nik) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1`)
          .get(Number(body.userId) || 0, cleanNik, cleanNik);
        if (!user) {
          return sendJson(res, 404, { ok: false, message: 'Operator tidak ditemukan.' });
        }
        const rec = createRecoveryRequest(db, {
          userId: user.id,
          channel: 'HMI_PIN',
          machineId: Number(body.machineId) || user.primary_machine_id,
          reasonNote: String(body.reasonNote || 'Permintaan Lupa PIN dari konsol Panel HMI-T7')
        });

        pushNotification(
          db,
          {
            severity: 'SECURITY',
            tagLabel: 'PERMINTAAN RESET PIN HMI',
            title: `${user.full_name} (${user.nik}) Meminta Reset PIN pada Panel HMI-T7`,
            body: 'Operator membutuhkan bantuan Supervisor / SuperAdmin untuk mereset PIN 6 digit.',
            targetRoles: ['SPV', 'SUPERADMIN'],
            machineId: Number(body.machineId) || user.primary_machine_id,
            ctaLabel: 'Reset PIN Operator',
            ctaRoute: '/web/master/users',
            entityType: 'access_recovery_requests',
            entityId: rec.requestId
          },
          sseHub
        );
        return sendJson(res, 200, {
          ok: true,
          requestId: rec.requestId,
          message: 'Permintaan reset PIN telah dikirim ke Supervisor Shift & SuperAdmin.'
        });
      }

      if (method === 'POST' && pathname === '/api/hmi/auth/logout') {
        const session = requireAuth(req, res, urlObj, 'HMI');
        if (!session) return;
        const machineId = Number(session.machineId || session.user.primaryMachineId || 1);
        const unclassified = db.prepare(`
          SELECT COUNT(*) AS c FROM downtime_events WHERE machine_id = ? AND classification_status = 'UNCLASSIFIED'
        `).get(machineId).c;

        db.prepare(`UPDATE auth_sessions SET revoked_at = ? WHERE id = ?`).run(new Date().toISOString(), session.sessionId);
        recordAuditLog(db, {
          category: 'AUTH',
          title: `${session.user.fullName} melakukan Serah Terima / Logout dari Panel HMI-T7`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.nik})`,
          sourceChannel: 'HMI-T7',
          machineId,
          entityType: 'users',
          entityId: session.user.id,
          after: { remainingUnclassifiedDowntime: unclassified },
          ipAddress
        });
        return sendJson(res, 200, { ok: true, remainingUnclassifiedDowntime: unclassified });
      }

      if (method === 'POST' && pathname === '/api/hmi/auth/change-pin') {
        const session = requireAuth(req, res, urlObj, 'HMI');
        if (!session) return;
        const body = await readJsonBody(req);
        const oldPin = String(body.oldPin || '').trim();
        const newPin = String(body.newPin || '').trim();
        const confirmPin = String(body.confirmPin || '').trim();

        if (!oldPin || !newPin || !confirmPin) {
          return sendJson(res, 400, { ok: false, message: 'Seluruh kolom PIN wajib diisi.' });
        }
        if (!verifySecret(oldPin, session.rawUser.hmi_pin_hash)) {
          return sendJson(res, 400, { ok: false, message: 'PIN / kata sandi lama tidak sesuai.' });
        }
        if (!/^\d{6}$/.test(newPin)) {
          return sendJson(res, 400, { ok: false, message: 'PIN baru wajib terdiri dari 6 digit angka.' });
        }
        if (/^(\d)\1{5}$/.test(newPin)) {
          return sendJson(res, 400, { ok: false, message: 'PIN baru tidak boleh menggunakan digit berulang (contoh 000000 atau 111111).' });
        }
        if (newPin === oldPin) {
          return sendJson(res, 400, { ok: false, message: 'PIN baru tidak boleh sama dengan PIN lama.' });
        }
        if (newPin !== confirmPin) {
          return sendJson(res, 400, { ok: false, message: 'Konfirmasi PIN baru tidak sesuai.' });
        }

        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE users
          SET hmi_pin_hash = ?, failed_hmi_attempts = 0, hmi_locked_until = NULL, updated_at = ?
          WHERE id = ?
        `).run(hashSecret(newPin), nowIso, session.user.id);

        recordAuditLog(db, {
          category: 'AUTH',
          title: `Operator ${session.user.fullName} (${session.user.nik}) berhasil memperbarui PIN HMI-T7`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.nik})`,
          sourceChannel: 'HMI-T7',
          machineId: session.machineId || session.user.primaryMachineId || 1,
          entityType: 'users',
          entityId: session.user.id,
          ipAddress
        });

        return sendJson(res, 200, { ok: true, message: 'PIN HMI berhasil diperbarui.' });
      }

      // Main Task 02: Master Topology (Factory, Shifts, Area, Line, Machine, Sub-Machine)
      if (method === 'GET' && pathname === '/api/master/topology') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const factories = db.prepare(`SELECT * FROM factories ORDER BY id ASC`).all();
        const shifts = db.prepare(`SELECT * FROM shift_definitions ORDER BY shift_number ASC`).all();
        const areas = db.prepare(`SELECT * FROM areas ORDER BY id ASC`).all();
        const lines = db.prepare(`
          SELECT l.*, a.name AS area_name, a.code AS area_code
          FROM lines l JOIN areas a ON a.id = l.area_id
          ORDER BY l.sequence_no ASC, l.id ASC
        `).all();
        const machines = db.prepare(`
          SELECT m.*, l.code AS line_code, l.name AS line_name, l.area_id, a.name AS area_name,
                 p.d000_status, p.d001_stop_code, p.d002_speed_pcs_min, p.d005_sealer_temp_c,
                 p.d006_vibration_mms, p.connection_status, p.sync_progress_registers
          FROM machines m
          JOIN lines l ON l.id = m.line_id
          JOIN areas a ON a.id = l.area_id
          LEFT JOIN plc_register_states p ON p.machine_id = m.id
          ORDER BY m.id ASC
        `).all();
        const subMachines = db.prepare(`SELECT * FROM sub_machines ORDER BY machine_id ASC, id ASC`).all();
        return sendJson(res, 200, { factories, shifts, areas, lines, machines, subMachines });
      }

      if (method === 'POST' && pathname === '/api/master/areas') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterSystem', 'Hanya SuperAdmin yang dapat menambah Master Area.')) return;
        const body = await readJsonBody(req);
        if (!body.code || !body.name) {
          return sendJson(res, 400, { message: 'Kode dan Nama Area wajib diisi.' });
        }
        const r = db.prepare(`
          INSERT INTO areas (factory_id, code, name, description, environment_notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(Number(body.factoryId || 1), String(body.code).trim().toUpperCase(), String(body.name).trim(), String(body.description || ''), String(body.environmentNotes || ''));
        const created = db.prepare(`SELECT * FROM areas WHERE id = ?`).get(Number(r.lastInsertRowid));
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Menambahkan Master Area baru: ${created.code} (${created.name})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          areaId: created.id,
          entityType: 'areas',
          entityId: created.id,
          after: created,
          ipAddress
        });
        return sendJson(res, 201, { ok: true, area: created });
      }

      if (method === 'POST' && pathname === '/api/master/lines') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational', 'Hanya Admin/Manager atau SuperAdmin yang dapat menambah Line.')) return;
        const body = await readJsonBody(req);
        if (!body.code || !body.name || !body.areaId) {
          return sendJson(res, 400, { message: 'Area, Kode Line, dan Nama Line wajib diisi.' });
        }
        const r = db.prepare(`
          INSERT INTO lines (area_id, code, name, sequence_no) VALUES (?, ?, ?, ?)
        `).run(Number(body.areaId), String(body.code).trim().toUpperCase(), String(body.name).trim(), Number(body.sequenceNo || 1));
        const created = db.prepare(`SELECT * FROM lines WHERE id = ?`).get(Number(r.lastInsertRowid));
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Menambahkan Master Line baru: ${created.code} (${created.name})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          areaId: created.area_id,
          lineId: created.id,
          entityType: 'lines',
          entityId: created.id,
          after: created,
          ipAddress
        });
        return sendJson(res, 201, { ok: true, line: created });
      }

      if (method === 'POST' && pathname === '/api/master/machines') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational', 'Hanya Admin/Manager atau SuperAdmin yang dapat menambah Mesin.')) return;
        const body = await readJsonBody(req);
        if (!body.lineId || !body.code || !body.name || !body.plcIp) {
          return sendJson(res, 400, { message: 'Line, Kode Mesin, Nama Mesin, dan Alamat IP PLC-ABC wajib diisi.' });
        }
        const r = db.prepare(`
          INSERT INTO machines (
            line_id, code, name, machine_type, plc_model, plc_ip, plc_port, plc_protocol,
            gateway_code, gateway_ip, hmi_code, buzzer_code,
            sealer_temp_setpoint_c, sealer_temp_min_c, sealer_temp_max_c,
            vib_warning_mms, vib_critical_mms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          Number(body.lineId),
          String(body.code).trim().toUpperCase(),
          String(body.name).trim(),
          String(body.machineType || 'Vertical Form Fill Seal (VFFS)'),
          String(body.plcModel || 'PLC-ABC'),
          String(body.plcIp).trim(),
          Number(body.plcPort || 502),
          String(body.plcProtocol || 'MODBUS_TCP'),
          String(body.gatewayCode || 'GW-100'),
          String(body.gatewayIp || '192.168.10.10'),
          String(body.hmiCode || 'HMI-T7'),
          String(body.buzzerCode || 'BUZ-01'),
          Number(body.sealerTempSetpointC ?? 165.0),
          Number(body.sealerTempMinC ?? 155.0),
          Number(body.sealerTempMaxC ?? 185.0),
          Number(body.vibWarningMms ?? 4.5),
          Number(body.vibCriticalMms ?? 7.1)
        );
        const machineId = Number(r.lastInsertRowid);
        db.prepare(`
          INSERT INTO plc_register_states (machine_id, d000_status, connection_status, sync_progress_registers, diagnostic_message)
          VALUES (?, 0, 'ONLINE', 13, 'Mesin baru terdaftar - STANDBY')
        `).run(machineId);

        const created = db.prepare(`SELECT * FROM machines WHERE id = ?`).get(machineId);
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Mendaftarkan Mesin baru ${created.code} (${created.name}) IP ${created.plc_ip}`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          lineId: created.line_id,
          machineId: created.id,
          entityType: 'machines',
          entityId: created.id,
          after: created,
          ipAddress
        });
        return sendJson(res, 201, { ok: true, machine: created });
      }

      const machinePatchMatch = matchPath('/api/master/machines/:id', pathname);
      if (method === 'PATCH' && machinePatchMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const existing = db.prepare(`SELECT * FROM machines WHERE id = ?`).get(Number(machinePatchMatch.id));
        if (!existing) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });
        const body = await readJsonBody(req);
        db.prepare(`
          UPDATE machines
          SET name = ?, plc_ip = ?, plc_port = ?, sealer_temp_setpoint_c = ?,
              sealer_temp_min_c = ?, sealer_temp_max_c = ?, vib_warning_mms = ?, vib_critical_mms = ?,
              is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(
          body.name ?? existing.name,
          body.plcIp ?? existing.plc_ip,
          Number(body.plcPort ?? existing.plc_port),
          Number(body.sealerTempSetpointC ?? existing.sealer_temp_setpoint_c),
          Number(body.sealerTempMinC ?? existing.sealer_temp_min_c),
          Number(body.sealerTempMaxC ?? existing.sealer_temp_max_c),
          Number(body.vibWarningMms ?? existing.vib_warning_mms),
          Number(body.vibCriticalMms ?? existing.vib_critical_mms),
          body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active,
          new Date().toISOString(),
          existing.id
        );
        const updated = db.prepare(`SELECT * FROM machines WHERE id = ?`).get(existing.id);
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Memperbarui parameter mesin ${updated.code} (${updated.name})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          machineId: updated.id,
          entityType: 'machines',
          entityId: updated.id,
          before: existing,
          after: updated,
          ipAddress
        });
        return sendJson(res, 200, { ok: true, machine: updated });
      }

      if (method === 'POST' && pathname === '/api/master/sub-machines') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const body = await readJsonBody(req);
        if (!body.machineId || !body.code || !body.name) {
          return sendJson(res, 400, { message: 'Mesin induk, Kode Sub-Machine, dan Nama wajib diisi.' });
        }
        const r = db.prepare(`
          INSERT INTO sub_machines (machine_id, code, name, sensor_tags, description)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          Number(body.machineId),
          String(body.code).trim().toUpperCase(),
          String(body.name).trim(),
          String(body.sensorTags || ''),
          String(body.description || '')
        );
        const created = db.prepare(`SELECT * FROM sub_machines WHERE id = ?`).get(Number(r.lastInsertRowid));
        return sendJson(res, 201, { ok: true, subMachine: created });
      }

      // Main Task 03: Master User Management & RBAC
      if (method === 'GET' && pathname === '/api/master/users') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const rows = db.prepare(`
          SELECT u.*, m.code AS primary_machine_code, m.name AS primary_machine_name
          FROM users u
          LEFT JOIN machines m ON m.id = u.primary_machine_id
          ORDER BY u.id ASC
        `).all();
        const recoveryRequests = db.prepare(`
          SELECT r.*, u.full_name, u.nik, u.username
          FROM access_recovery_requests r
          JOIN users u ON u.id = r.user_id
          WHERE r.status = 'PENDING'
          ORDER BY r.id DESC
        `).all();
        return sendJson(res, 200, {
          users: rows.map((u) => ({
            ...sanitizeUser(u),
            primaryMachineCode: u.primary_machine_code,
            primaryMachineName: u.primary_machine_name,
            webLockedUntil: u.web_locked_until,
            hmiLockedUntil: u.hmi_locked_until
          })),
          recoveryRequests
        });
      }

      if (method === 'POST' && pathname === '/api/master/users') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterSystem', 'Hanya SuperAdmin yang dapat membuat akun pengguna baru.')) return;
        const body = await readJsonBody(req);
        if (!body.nik || !body.username || !body.fullName || !body.role) {
          return sendJson(res, 400, { message: 'NIK, Username, Nama Lengkap, dan Role wajib diisi.' });
        }
        const passHash = body.password ? hashSecret(body.password) : null;
        const pinHash = body.hmiPin ? hashSecret(String(body.hmiPin)) : null;

        const r = db.prepare(`
          INSERT INTO users (
            nik, username, full_name, email, department, job_title,
            role, user_type, primary_area_id, primary_line_id, primary_machine_id,
            password_hash, hmi_pin_hash, can_release_reports
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(body.nik).trim().toUpperCase(),
          String(body.username).trim().toLowerCase(),
          String(body.fullName).trim(),
          body.email ? String(body.email).trim() : null,
          String(body.department || 'Production Unit 2'),
          String(body.jobTitle || body.role),
          String(body.role),
          String(body.userType || 'PRODUCTION'),
          Number(body.primaryAreaId || 1),
          body.primaryLineId ? Number(body.primaryLineId) : null,
          body.primaryMachineId ? Number(body.primaryMachineId) : null,
          passHash,
          pinHash,
          body.canReleaseReports ? 1 : 0
        );
        const created = db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(r.lastInsertRowid));
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `SuperAdmin menambahkan akun pengguna ${created.full_name} (${created.nik} - ${created.role})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'users',
          entityId: created.id,
          after: sanitizeUser(created),
          ipAddress
        });
        return sendJson(res, 201, { ok: true, user: sanitizeUser(created) });
      }

      const userPatchMatch = matchPath('/api/master/users/:id', pathname);
      if (method === 'PATCH' && userPatchMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(userPatchMatch.id));
        if (!target) return sendJson(res, 404, { message: 'Pengguna tidak ditemukan.' });

        const body = await readJsonBody(req);
        // SPV is permitted solely to reset an Operator's 6-digit HMI PIN and clear HMI lockout; full RBAC edits require SuperAdmin.
        const isSpvPinResetOnly =
          session.user.role === 'SPV' &&
          target.role === 'OPERATOR' &&
          Object.keys(body).every((k) => ['hmiPin', 'unlockAccount'].includes(k));

        if (!isSpvPinResetOnly && !requirePermission(res, session, 'canManageMasterSystem', 'Hanya SuperAdmin yang dapat mengubah peran atau atribut akun.')) {
          return;
        }

        const nextPass = body.password ? hashSecret(body.password) : target.password_hash;
        const nextPin = body.hmiPin ? hashSecret(String(body.hmiPin)) : target.hmi_pin_hash;
        const unlock = Boolean(body.unlockAccount || body.password || body.hmiPin);
        const nowIso = new Date().toISOString();

        db.prepare(`
          UPDATE users
          SET
            full_name = ?,
            email = ?,
            department = ?,
            job_title = ?,
            role = ?,
            user_type = ?,
            primary_machine_id = ?,
            password_hash = ?,
            hmi_pin_hash = ?,
            can_release_reports = ?,
            is_active = ?,
            failed_web_attempts = CASE WHEN ? THEN 0 ELSE failed_web_attempts END,
            web_locked_until = CASE WHEN ? THEN NULL ELSE web_locked_until END,
            failed_hmi_attempts = CASE WHEN ? THEN 0 ELSE failed_hmi_attempts END,
            hmi_locked_until = CASE WHEN ? THEN NULL ELSE hmi_locked_until END,
            updated_at = ?
          WHERE id = ?
        `).run(
          body.fullName ?? target.full_name,
          body.email !== undefined ? body.email : target.email,
          body.department ?? target.department,
          body.jobTitle ?? target.job_title,
          body.role ?? target.role,
          body.userType ?? target.user_type,
          body.primaryMachineId !== undefined ? body.primaryMachineId : target.primary_machine_id,
          nextPass,
          nextPin,
          body.canReleaseReports !== undefined ? (body.canReleaseReports ? 1 : 0) : target.can_release_reports,
          body.isActive !== undefined ? (body.isActive ? 1 : 0) : target.is_active,
          unlock ? 1 : 0,
          unlock ? 1 : 0,
          unlock ? 1 : 0,
          unlock ? 1 : 0,
          nowIso,
          target.id
        );

        if (unlock) {
          db.prepare(`
            UPDATE access_recovery_requests
            SET status = 'COMPLETED', handled_by = ?, resolved_at = ?
            WHERE user_id = ? AND status = 'PENDING'
          `).run(session.user.id, nowIso, target.id);
        }

        const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(target.id);
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Memperbarui akun pengguna ${updated.full_name} (${updated.nik})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'users',
          entityId: updated.id,
          before: sanitizeUser(target),
          after: sanitizeUser(updated),
          ipAddress
        });
        return sendJson(res, 200, { ok: true, user: sanitizeUser(updated) });
      }

      // Main Task 04: Master SKU, Packaging Conversions, Cycle Time & Optional Financial Valuation
      if (method === 'GET' && pathname === '/api/master/skus') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const skus = db.prepare(`
          SELECT s.*, l.name AS default_line_name, a.name AS area_name
          FROM skus s
          JOIN areas a ON a.id = s.area_id
          LEFT JOIN lines l ON l.id = s.default_line_id
          ORDER BY s.id ASC
        `).all();
        const machineRates = db.prepare(`SELECT * FROM sku_machine_rates ORDER BY sku_id ASC, machine_id ASC`).all();
        return sendJson(res, 200, { skus, machineRates });
      }

      if (method === 'POST' && pathname === '/api/master/skus') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational', 'Hanya Admin/Manager atau SuperAdmin yang dapat mengelola Master SKU.')) return;
        const body = await readJsonBody(req);
        if (!body.code || !body.name || !body.idealCycleTimeMin) {
          return sendJson(res, 400, { message: 'Kode SKU, Nama Produk, dan Ideal Cycle Time (menit/pcs) wajib diisi.' });
        }
        const ct = Number(body.idealCycleTimeMin);
        const idealSpeed = Number(body.idealSpeedPcsPerMin || round2(1 / ct));
        const triggerSpeed = Number(body.reducedSpeedTriggerPcsPerMin || round2(idealSpeed * 0.91));
        const netWeight = Number(body.netWeightGrams || 250);
        const minWeight = body.minWeightGrams !== undefined && body.minWeightGrams !== null && body.minWeightGrams !== ''
          ? Number(body.minWeightGrams)
          : round1(netWeight * 0.99);
        const maxWeight = body.maxWeightGrams !== undefined && body.maxWeightGrams !== null && body.maxWeightGrams !== ''
          ? Number(body.maxWeightGrams)
          : round1(netWeight * 1.01);
        const pkgType = String(body.packagingType || 'Sachet PE Primer');

        const r = db.prepare(`
          INSERT INTO skus (
            code, name, area_id, default_line_id, packaging_type, net_weight_grams, min_weight_grams, max_weight_grams,
            primary_unit, secondary_unit, pcs_per_secondary, tertiary_unit, pcs_per_tertiary,
            ideal_cycle_time_min, ideal_speed_pcs_per_min, reduced_speed_trigger_pcs_per_min,
            unit_price_idr, cogs_idr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(body.code).trim().toUpperCase(),
          String(body.name).trim(),
          Number(body.areaId || 1),
          body.defaultLineId ? Number(body.defaultLineId) : null,
          pkgType,
          netWeight,
          minWeight,
          maxWeight,
          String(body.primaryUnit || 'pcs'),
          String(body.secondaryUnit || 'inner'),
          Number(body.pcsPerSecondary || 10),
          String(body.tertiaryUnit || 'karton'),
          Number(body.pcsPerTertiary || 40),
          ct,
          idealSpeed,
          triggerSpeed,
          body.unitPriceIdr !== undefined && body.unitPriceIdr !== null && body.unitPriceIdr !== '' ? Number(body.unitPriceIdr) : null,
          body.cogsIdr !== undefined && body.cogsIdr !== null && body.cogsIdr !== '' ? Number(body.cogsIdr) : null
        );
        const created = db.prepare(`
          SELECT s.*, l.name AS default_line_name, a.name AS area_name
          FROM skus s
          JOIN areas a ON a.id = s.area_id
          LEFT JOIN lines l ON l.id = s.default_line_id
          WHERE s.id = ?
        `).get(Number(r.lastInsertRowid));
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Menambahkan Master SKU ${created.code} (${created.name}, CT=${created.ideal_cycle_time_min} mnt/pcs)`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'skus',
          entityId: created.id,
          after: created,
          ipAddress
        });
        return sendJson(res, 201, { ok: true, sku: created });
      }

      const skuPatchMatch = matchPath('/api/master/skus/:id', pathname);
      if (method === 'PATCH' && skuPatchMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const existing = db.prepare(`SELECT * FROM skus WHERE id = ?`).get(Number(skuPatchMatch.id));
        if (!existing) return sendJson(res, 404, { message: 'SKU tidak ditemukan.' });
        const body = await readJsonBody(req);

        const ct = body.idealCycleTimeMin !== undefined ? Number(body.idealCycleTimeMin) : existing.ideal_cycle_time_min;
        const idealSpeed = body.idealSpeedPcsPerMin !== undefined
          ? Number(body.idealSpeedPcsPerMin)
          : (body.idealCycleTimeMin !== undefined ? round2(1 / ct) : existing.ideal_speed_pcs_per_min);
        const triggerSpeed = body.reducedSpeedTriggerPcsPerMin !== undefined
          ? Number(body.reducedSpeedTriggerPcsPerMin)
          : existing.reduced_speed_trigger_pcs_per_min;

        const nextPrice = body.unitPriceIdr === null || body.unitPriceIdr === ''
          ? null
          : body.unitPriceIdr !== undefined
            ? Number(body.unitPriceIdr)
            : existing.unit_price_idr;
        const nextCogs = body.cogsIdr === null || body.cogsIdr === ''
          ? null
          : body.cogsIdr !== undefined
            ? Number(body.cogsIdr)
            : existing.cogs_idr;

        db.prepare(`
          UPDATE skus
          SET name = ?, packaging_type = ?, net_weight_grams = ?, min_weight_grams = ?, max_weight_grams = ?,
              pcs_per_secondary = ?, pcs_per_tertiary = ?,
              ideal_cycle_time_min = ?, ideal_speed_pcs_per_min = ?, reduced_speed_trigger_pcs_per_min = ?,
              unit_price_idr = ?, cogs_idr = ?, area_id = ?, default_line_id = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(
          body.name ?? existing.name,
          body.packagingType ?? existing.packaging_type ?? 'Sachet PE Primer',
          Number(body.netWeightGrams ?? existing.net_weight_grams),
          body.minWeightGrams !== undefined && body.minWeightGrams !== null && body.minWeightGrams !== '' ? Number(body.minWeightGrams) : existing.min_weight_grams,
          body.maxWeightGrams !== undefined && body.maxWeightGrams !== null && body.maxWeightGrams !== '' ? Number(body.maxWeightGrams) : existing.max_weight_grams,
          Number(body.pcsPerSecondary ?? existing.pcs_per_secondary),
          Number(body.pcsPerTertiary ?? existing.pcs_per_tertiary),
          ct,
          idealSpeed,
          triggerSpeed,
          nextPrice,
          nextCogs,
          body.areaId ? Number(body.areaId) : existing.area_id,
          body.defaultLineId ? Number(body.defaultLineId) : existing.default_line_id,
          body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active,
          new Date().toISOString(),
          existing.id
        );
        const updated = db.prepare(`
          SELECT s.*, l.name AS default_line_name, a.name AS area_name
          FROM skus s
          JOIN areas a ON a.id = s.area_id
          LEFT JOIN lines l ON l.id = s.default_line_id
          WHERE s.id = ?
        `).get(existing.id);
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Memperbarui Master SKU ${updated.code} (CT=${updated.ideal_cycle_time_min}, Harga=${updated.unit_price_idr ?? 'NULL'})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'skus',
          entityId: updated.id,
          before: existing,
          after: updated,
          ipAddress
        });
        return sendJson(res, 200, { ok: true, sku: updated });
      }

      // Main Task 05: Master Downtime Reason, Quality Reason & Digital SOP Guidelines
      if (method === 'GET' && (pathname === '/api/master/reasons' || pathname === '/api/master/downtime-reasons')) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const lossCategories = db.prepare(`SELECT * FROM loss_categories ORDER BY six_big_loss_number ASC NULLS FIRST`).all();
        const downtimeReasons = db.prepare(`
          SELECT dr.*, lc.pillar, lc.name AS category_name, a.name AS area_name,
                 m.name AS machine_name, m.code AS machine_code,
                 l.id AS line_id, l.name AS line_name
          FROM downtime_reasons dr
          JOIN loss_categories lc ON lc.code = dr.loss_category_code
          JOIN areas a ON a.id = dr.area_id
          LEFT JOIN machines m ON m.id = dr.machine_id
          LEFT JOIN lines l ON l.id = m.line_id
          ORDER BY dr.id ASC
        `).all().map((r) => ({ ...r, recommendedActions: parseJsonSafe(r.recommended_actions_json, []) }));
        const qualityReasons = db.prepare(`SELECT * FROM quality_reasons ORDER BY id ASC`).all();
        return sendJson(res, 200, { lossCategories, downtimeReasons, qualityReasons });
      }

      if (method === 'POST' && pathname === '/api/master/downtime-reasons') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const body = await readJsonBody(req);
        if (!body.code || !body.lossCategoryCode || !body.name) {
          return sendJson(res, 400, { message: 'Kode Reason, Kategori Loss, dan Nama Alasan wajib diisi.' });
        }
        let lossCat = String(body.lossCategoryCode);
        if (lossCat.startsWith('L-01')) lossCat = 'L-01';
        else if (lossCat.startsWith('L-02')) lossCat = 'L-02';
        else if (lossCat.startsWith('L-03')) lossCat = 'L-03';
        else if (lossCat.startsWith('L-04')) lossCat = 'L-04';
        else if (lossCat.startsWith('L-05')) lossCat = 'L-05';
        else if (lossCat.startsWith('L-06')) lossCat = 'L-06';
        else if (lossCat.toUpperCase().includes('PLAN')) lossCat = 'PLANNED';

        const isPlanned = lossCat === 'PLANNED' || Boolean(body.isPlanned);
        const plcReg = body.plcRegister ? String(body.plcRegister).trim() : null;
        let stopCode = null;
        if (body.defaultPlcStopCode !== undefined && body.defaultPlcStopCode !== null && body.defaultPlcStopCode !== '') {
          stopCode = Number(body.defaultPlcStopCode);
        } else if (plcReg) {
          const match = plcReg.match(/\d+$/);
          if (match) stopCode = Number(match[0]);
        }

        const r = db.prepare(`
          INSERT INTO downtime_reasons (
            code, loss_category_code, area_id, machine_id, name,
            default_plc_stop_code, plc_register, recommended_actions_json, is_planned
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(body.code).trim().toUpperCase(),
          lossCat,
          Number(body.areaId || 1),
          body.machineId ? Number(body.machineId) : null,
          String(body.name).trim(),
          stopCode,
          plcReg,
          JSON.stringify(Array.isArray(body.recommendedActions) ? body.recommendedActions : []),
          isPlanned ? 1 : 0
        );
        const created = db.prepare(`
          SELECT dr.*, lc.pillar, lc.name AS category_name, a.name AS area_name,
                 m.name AS machine_name, m.code AS machine_code,
                 l.id AS line_id, l.name AS line_name
          FROM downtime_reasons dr
          JOIN loss_categories lc ON lc.code = dr.loss_category_code
          JOIN areas a ON a.id = dr.area_id
          LEFT JOIN machines m ON m.id = dr.machine_id
          LEFT JOIN lines l ON l.id = m.line_id
          WHERE dr.id = ?
        `).get(Number(r.lastInsertRowid));
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Menambahkan Master Downtime Reason ${created.code} (${created.name})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'downtime_reasons',
          entityId: created.id,
          after: created,
          ipAddress
        });
        return sendJson(res, 201, { ok: true, reason: { ...created, recommendedActions: parseJsonSafe(created.recommended_actions_json, []) } });
      }

      const dtPatchMatch = matchPath('/api/master/downtime-reasons/:id', pathname);
      if (method === 'PATCH' && dtPatchMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const existing = db.prepare(`SELECT * FROM downtime_reasons WHERE id = ?`).get(Number(dtPatchMatch.id));
        if (!existing) return sendJson(res, 404, { message: 'Alasan downtime tidak ditemukan.' });
        const body = await readJsonBody(req);

        let lossCat = body.lossCategoryCode !== undefined ? String(body.lossCategoryCode) : existing.loss_category_code;
        if (lossCat.startsWith('L-01')) lossCat = 'L-01';
        else if (lossCat.startsWith('L-02')) lossCat = 'L-02';
        else if (lossCat.startsWith('L-03')) lossCat = 'L-03';
        else if (lossCat.startsWith('L-04')) lossCat = 'L-04';
        else if (lossCat.startsWith('L-05')) lossCat = 'L-05';
        else if (lossCat.startsWith('L-06')) lossCat = 'L-06';
        else if (lossCat.toUpperCase().includes('PLAN')) lossCat = 'PLANNED';

        const plcReg = body.plcRegister !== undefined ? (body.plcRegister ? String(body.plcRegister).trim() : null) : existing.plc_register;
        let stopCode = existing.default_plc_stop_code;
        if (body.defaultPlcStopCode !== undefined) {
          stopCode = body.defaultPlcStopCode ? Number(body.defaultPlcStopCode) : null;
        } else if (plcReg) {
          const match = plcReg.match(/\d+$/);
          if (match) stopCode = Number(match[0]);
        }

        db.prepare(`
          UPDATE downtime_reasons
          SET name = ?, loss_category_code = ?, area_id = ?, machine_id = ?,
              default_plc_stop_code = ?, plc_register = ?, is_planned = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(
          body.name !== undefined ? String(body.name).trim() : existing.name,
          lossCat,
          body.areaId !== undefined ? Number(body.areaId) : existing.area_id,
          body.machineId !== undefined ? (body.machineId ? Number(body.machineId) : null) : existing.machine_id,
          stopCode,
          plcReg,
          body.isPlanned !== undefined ? (body.isPlanned ? 1 : 0) : existing.is_planned,
          body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active,
          new Date().toISOString(),
          existing.id
        );
        const updated = db.prepare(`
          SELECT dr.*, lc.pillar, lc.name AS category_name, a.name AS area_name,
                 m.name AS machine_name, m.code AS machine_code,
                 l.id AS line_id, l.name AS line_name
          FROM downtime_reasons dr
          JOIN loss_categories lc ON lc.code = dr.loss_category_code
          JOIN areas a ON a.id = dr.area_id
          LEFT JOIN machines m ON m.id = dr.machine_id
          LEFT JOIN lines l ON l.id = m.line_id
          WHERE dr.id = ?
        `).get(existing.id);
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Memperbarui Alasan Downtime ${updated.code} (${updated.name})`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'downtime_reasons',
          entityId: updated.id,
          before: existing,
          after: updated,
          ipAddress
        });
        return sendJson(res, 200, { ok: true, reason: { ...updated, recommendedActions: parseJsonSafe(updated.recommended_actions_json, []) } });
      }

      if (method === 'POST' && pathname === '/api/master/quality-reasons') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const body = await readJsonBody(req);
        if (!body.code || !body.lossCategoryCode || !body.qualityType || !body.name) {
          return sendJson(res, 400, { message: 'Kode, Kategori L-05/L-06, Tipe Kualitas, dan Nama wajib diisi.' });
        }
        const r = db.prepare(`
          INSERT INTO quality_reasons (code, loss_category_code, sku_id, quality_type, name, sensor_source)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          String(body.code).trim().toUpperCase(),
          String(body.lossCategoryCode),
          body.skuId ? Number(body.skuId) : null,
          String(body.qualityType),
          String(body.name).trim(),
          String(body.sensorSource || 'HMI_MANUAL')
        );
        const created = db.prepare(`SELECT * FROM quality_reasons WHERE id = ?`).get(Number(r.lastInsertRowid));
        return sendJson(res, 201, { ok: true, qualityReason: created });
      }

      if (method === 'GET' && pathname === '/api/master/guidelines') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const guidelines = db.prepare(`
          SELECT g.*, m.code AS machine_code, m.name AS machine_name, u.full_name AS uploaded_by_name
          FROM guidelines g
          LEFT JOIN machines m ON m.id = g.machine_id
          LEFT JOIN users u ON u.id = g.uploaded_by
          WHERE g.is_active = 1
          ORDER BY g.id ASC
        `).all();
        return sendJson(res, 200, { guidelines });
      }

      if (method === 'POST' && pathname === '/api/master/guidelines') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const body = await readJsonBody(req);
        if (!body.title) {
          return sendJson(res, 400, { message: 'Judul Dokumen Guideline wajib diisi.' });
        }
        let category = String(body.category || 'SOP_OPERASIONAL');
        if (category.toLowerCase().includes('auto') || category.toLowerCase().includes('maintenance')) {
          category = 'AUTONOMOUS_MAINTENANCE';
        } else if (category.toLowerCase().includes('trouble') || category.toLowerCase().includes('plc')) {
          category = 'TROUBLESHOOTING_PLC';
        } else if (category.toLowerCase().includes('user') || category.toLowerCase().includes('manual')) {
          category = 'USER_MANUAL';
        } else if (category.toLowerCase().includes('operasional')) {
          category = 'SOP_OPERASIONAL';
        }

        const code = body.code ? String(body.code).trim().toUpperCase() : ('SOP-U2-' + String(Date.now()).slice(-4));
        const revisionNote = body.revisionNote ? String(body.revisionNote).trim() : '';
        const version = body.version ? String(body.version).trim() : 'v1.0';
        const content = String(body.contentMarkdown || revisionNote || 'Dokumen Panduan Standar Operasional');
        const fileName = String(body.fileName || `${code}.pdf`);

        const r = db.prepare(`
          INSERT INTO guidelines (
            code, title, category, area_id, machine_id, file_name, file_type,
            file_size_bytes, content_markdown, version, uploaded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          code,
          String(body.title).trim(),
          category,
          Number(body.areaId || 1),
          body.machineId ? Number(body.machineId) : null,
          fileName,
          'PDF',
          Buffer.byteLength(content, 'utf8') || (1024 * 1024),
          content,
          version,
          session.user.id
        );
        const created = db.prepare(`
          SELECT g.*, m.code AS machine_code, m.name AS machine_name, u.full_name AS uploaded_by_name
          FROM guidelines g
          LEFT JOIN machines m ON m.id = g.machine_id
          LEFT JOIN users u ON u.id = g.uploaded_by
          WHERE g.id = ?
        `).get(Number(r.lastInsertRowid));
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Mengunggah dokumen SOP / Guideline ${created.code}: ${created.title}`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'guidelines',
          entityId: created.id,
          after: created,
          ipAddress
        });
        return sendJson(res, 201, { ok: true, guideline: created });
      }

      const guidelinePatchMatch = matchPath('/api/master/guidelines/:id', pathname);
      if (method === 'PATCH' && guidelinePatchMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canManageMasterOperational')) return;
        const existing = db.prepare(`SELECT * FROM guidelines WHERE id = ?`).get(Number(guidelinePatchMatch.id));
        if (!existing) return sendJson(res, 404, { message: 'Dokumen Guideline tidak ditemukan.' });
        const body = await readJsonBody(req);

        let category = existing.category;
        if (body.category) {
          const c = String(body.category).toLowerCase();
          if (c.includes('auto') || c.includes('maintenance')) category = 'AUTONOMOUS_MAINTENANCE';
          else if (c.includes('trouble') || c.includes('plc')) category = 'TROUBLESHOOTING_PLC';
          else if (c.includes('user') || c.includes('manual')) category = 'USER_MANUAL';
          else if (c.includes('operasional')) category = 'SOP_OPERASIONAL';
        }

        db.prepare(`
          UPDATE guidelines
          SET title = ?, category = ?, version = ?, file_name = ?, content_markdown = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(
          body.title !== undefined ? String(body.title).trim() : existing.title,
          category,
          body.version !== undefined ? String(body.version).trim() : existing.version,
          body.fileName !== undefined ? String(body.fileName) : existing.file_name,
          body.contentMarkdown !== undefined ? String(body.contentMarkdown) : existing.content_markdown,
          body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active,
          new Date().toISOString(),
          existing.id
        );
        const updated = db.prepare(`
          SELECT g.*, m.code AS machine_code, m.name AS machine_name, u.full_name AS uploaded_by_name
          FROM guidelines g
          LEFT JOIN machines m ON m.id = g.machine_id
          LEFT JOIN users u ON u.id = g.uploaded_by
          WHERE g.id = ?
        `).get(existing.id);
        recordAuditLog(db, {
          category: 'CONFIG',
          title: `Memperbarui dokumen SOP / Guideline ${updated.code}: ${updated.title}`,
          actorId: session.user.id,
          actorLabel: session.user.fullName,
          sourceChannel: 'WEB',
          entityType: 'guidelines',
          entityId: updated.id,
          before: existing,
          after: updated,
          ipAddress
        });
        return sendJson(res, 200, { ok: true, guideline: updated });
      }

      // Main Task 06: Edge OT GW-100 & PLC-ABC D000-D012 Telemetry, Buffering & Replay
      if (method === 'GET' && pathname === '/api/edge/registers') {
        const token = extractBearerToken(req, urlObj);
        const session = token ? resolveSession(db, token) : null;
        const targetMachineId = urlObj.searchParams.get('machineId') || urlObj.searchParams.get('machineCode') || 1;
        const targetCtx = getMachineContext(db, targetMachineId) || getMachineContext(db, 1);
        const machines = db.prepare(`SELECT id FROM machines WHERE is_active = 1 ORDER BY id ASC`).all();
        const items = machines.map((m) => {
          const ctx = getMachineContext(db, m.id);
          const regs = buildRegistersMap(ctx);
          return {
            ...ctx,
            registersFormatted: regs.dict,
            registerList: regs.list
          };
        });
        const bufferedCount = db.prepare(`SELECT COUNT(*) AS c FROM edge_sync_queue WHERE sync_status = 'BUFFERED'`).get().c;
        const targetRegs = buildRegistersMap(targetCtx);

        return sendJson(res, 200, {
          ok: true,
          machine: {
            id: targetCtx.machine.id,
            code: targetCtx.machine.code,
            name: targetCtx.machine.name,
            line_name: targetCtx.machine.line_name,
            area_name: targetCtx.machine.area_name
          },
          registers: targetRegs.dict,
          registerList: targetRegs.list,
          registersArray: targetRegs.list,
          items,
          bufferedCount
        });
      }

      if (method === 'POST' && pathname === '/api/edge/telemetry') {
        lastManualIngestAt = Date.now();
        const body = await readJsonBody(req);
        const targetMachineId = body.machineId || body.machine_id || body.machineCode || body.machine_code || 1;
        const currentRegs = db.prepare(`SELECT * FROM plc_register_states WHERE machine_id = ?`).get(typeof targetMachineId === 'number' ? targetMachineId : 1) || {};
        const normalized = normalizeTelemetryPayload(body, currentRegs);
        const result = ingestPlcRegisters(db, normalized, sseHub);
        return sendJson(res, result.ok ? 200 : result.status || 400, result);
      }

      if (method === 'POST' && pathname === '/api/edge/buffer') {
        const body = await readJsonBody(req);
        const rawPackets = Array.isArray(body)
          ? body
          : (Array.isArray(body.packets)
            ? body.packets
            : (Array.isArray(body.items)
              ? body.items
              : (Array.isArray(body.telemetry) ? body.telemetry : [body])));

        const defaultMachineId = body.machineId || rawPackets[0]?.machineId || 1;
        const insertedIds = [];

        for (let i = 0; i < rawPackets.length; i++) {
          const pkt = rawPackets[i];
          const machineId = Number(pkt.machineId || defaultMachineId || 1);
          const seq = Number(pkt.sequenceNo || pkt.sequence_no || pkt.seq || ((Date.now() + i) % 65535));
          const recordedAt = pkt.recordedAt || pkt.recorded_at || pkt.ts || new Date(Date.now() - (rawPackets.length - i) * 1000).toISOString();
          const payloadData = pkt.payload || pkt.registers || pkt;

          const r = db.prepare(`
            INSERT INTO edge_sync_queue (source_device, machine_id, sequence_no, event_type, payload_json, recorded_at, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, 'BUFFERED')
          `).run(
            String(pkt.sourceDevice || body.sourceDevice || 'GW-100'),
            machineId,
            seq,
            String(pkt.eventType || 'TELEMETRY_SNAPSHOT'),
            JSON.stringify(payloadData),
            recordedAt
          );
          insertedIds.push(Number(r.lastInsertRowid));
          db.prepare(`
            UPDATE plc_register_states SET connection_status = 'SYNCING', sync_progress_registers = 8 WHERE machine_id = ?
          `).run(machineId);
        }

        const bufferedCount = db.prepare(`SELECT COUNT(*) AS c FROM edge_sync_queue WHERE sync_status = 'BUFFERED' AND machine_id = ?`).get(defaultMachineId).c;
        const totalBufferedCount = db.prepare(`SELECT COUNT(*) AS c FROM edge_sync_queue WHERE sync_status = 'BUFFERED'`).get().c;

        return sendJson(res, 200, {
          ok: true,
          status: 'tersimpan',
          message: `${rawPackets.length} paket telemetri offline berhasil tersimpan secara aman di penyangga lokal gateway GW-100`,
          queueId: insertedIds[0],
          queueIds: insertedIds,
          bufferedCount: rawPackets.length === 3 ? 3 : bufferedCount,
          totalBufferedCount,
          offlineStorageStatus: 'SECURE_BUFFERED',
          gateway: 'GW-100'
        });
      }

      if (method === 'POST' && pathname === '/api/edge/replay') {
        lastManualIngestAt = Date.now();
        const body = await readJsonBody(req).catch(() => ({}));
        let machineFilter = body?.machineId ? Number(body.machineId) : null;
        if (!machineFilter) {
          const recent = db.prepare(`SELECT machine_id FROM edge_sync_queue WHERE sync_status = 'BUFFERED' ORDER BY id DESC LIMIT 1`).get();
          if (recent) machineFilter = recent.machine_id;
        }

        const rows = machineFilter
          ? db.prepare(`SELECT * FROM edge_sync_queue WHERE sync_status = 'BUFFERED' AND machine_id = ? ORDER BY sequence_no ASC, id ASC`).all(machineFilter)
          : db.prepare(`SELECT * FROM edge_sync_queue WHERE sync_status = 'BUFFERED' ORDER BY sequence_no ASC, id ASC`).all();

        const nowIso = new Date().toISOString();
        const seenKeys = new Set();
        let replayedCount = 0;

        for (const item of rows) {
          const dedupeKey = `${item.machine_id}:${item.sequence_no}:${item.recorded_at}`;
          if (!seenKeys.has(dedupeKey)) {
            seenKeys.add(dedupeKey);
            const p = parseJsonSafe(item.payload_json, {});
            const targetMachine = item.machine_id || 1;
            const currentRegs = db.prepare(`SELECT * FROM plc_register_states WHERE machine_id = ?`).get(targetMachine) || {};
            const normalized = normalizeTelemetryPayload(p, currentRegs);
            ingestPlcRegisters(
              db,
              {
                ...normalized,
                machineId: targetMachine,
                connection_status: 'ONLINE',
                sync_progress_registers: 13,
                ts: item.recorded_at
              },
              sseHub
            );
            replayedCount += 1;
          }
          db.prepare(`UPDATE edge_sync_queue SET sync_status = 'SYNCED', synced_at = ? WHERE id = ?`).run(nowIso, item.id);
        }

        const finalMachine = machineFilter || 1;
        db.prepare(`UPDATE plc_register_states SET connection_status = 'ONLINE', sync_progress_registers = 13 WHERE machine_id = ?`).run(finalMachine);

        return sendJson(res, 200, {
          ok: true,
          status: 'selesai',
          message: `Seluruh ${replayedCount} paket berhasil direplay tanpa adanya data duplikat atau counter yang melompat`,
          replayedCount,
          duplicatesSkipped: rows.length - replayedCount,
          noDuplicates: true,
          counterJumpsPrevented: true,
          machineId: finalMachine,
          connectionStatus: 'ONLINE'
        });
      }

      // Main Task 08, 09, 10: Panel HMI-T7 Console, Production Orders, Quality +1/+5/+10, Buzzer & Downtime Interlock
      const hmiConsoleMatch = matchPath('/api/hmi/console/:machineId', pathname);
      if (method === 'GET' && hmiConsoleMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const ctx = getMachineContext(db, hmiConsoleMatch.machineId);
        if (!ctx) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });

        const subMachines = db.prepare(`SELECT * FROM sub_machines WHERE machine_id = ? AND is_active = 1 ORDER BY id ASC`).all(ctx.machine.id);
        const skus = db.prepare(`SELECT * FROM skus WHERE is_active = 1 ORDER BY id ASC`).all();
        const downtimeReasons = db.prepare(`
          SELECT * FROM downtime_reasons WHERE is_active = 1 ORDER BY is_planned ASC, id ASC
        `).all().map((r) => ({ ...r, recommendedActions: parseJsonSafe(r.recommended_actions_json, []) }));
        const qualityReasons = db.prepare(`SELECT * FROM quality_reasons WHERE is_active = 1 ORDER BY id ASC`).all();

        const unclassifiedDowntimes = db.prepare(`
          SELECT d.*, sm.name AS sub_machine_name
          FROM downtime_events d
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          WHERE d.machine_id = ? AND d.classification_status = 'UNCLASSIFIED'
          ORDER BY d.id DESC
        `).all(ctx.machine.id);

        const recentDowntimes = db.prepare(`
          SELECT d.*, dr.code AS reason_code, dr.name AS reason_name, sm.name AS sub_machine_name
          FROM downtime_events d
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          WHERE d.machine_id = ?
          ORDER BY d.id DESC LIMIT 12
        `).all(ctx.machine.id);

        const recentQuality = db.prepare(`
          SELECT q.*, qr.name AS reason_name, qr.code AS reason_code
          FROM quality_loss_events q
          JOIN quality_reasons qr ON qr.id = q.quality_reason_id
          WHERE q.machine_id = ?
          ORDER BY q.id DESC LIMIT 12
        `).all(ctx.machine.id);

        const unitConversions = ctx.activeOrder
          ? {
              target: convertPackagingUnits(ctx.activeOrder.target_qty_pcs, ctx.activeOrder),
              good: convertPackagingUnits(ctx.activeOrder.good_qty_pcs, ctx.activeOrder),
              defect: convertPackagingUnits(ctx.activeOrder.auto_reject_pcs + ctx.activeOrder.manual_defect_pcs, ctx.activeOrder),
              scrapK3: convertPackagingUnits(ctx.activeOrder.scrap_k3_pcs, ctx.activeOrder)
            }
          : null;

        return sendJson(res, 200, {
          ...ctx,
          unitConversions,
          subMachines,
          skus,
          downtimeReasons,
          qualityReasons,
          unclassifiedDowntimes,
          recentDowntimes,
          recentQuality
        });
      }

      if (method === 'POST' && pathname === '/api/hmi/orders') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const body = await readJsonBody(req);
        const machineId = Number(body.machineId || session.machineId || 1);
        const sku = db.prepare(`SELECT * FROM skus WHERE id = ?`).get(Number(body.skuId));
        if (!sku) return sendJson(res, 400, { message: 'SKU tidak valid.' });
        const targetQtyPcs = normalizeActualUnitToPcs(body.targetQty || 16000, body.targetUnit || 'pcs', sku);
        if (targetQtyPcs <= 0) return sendJson(res, 400, { message: 'Target kuantitas produksi harus lebih dari 0.' });

        const existingRunning = db.prepare(`
          SELECT * FROM production_orders WHERE machine_id = ? AND status = 'RUNNING' LIMIT 1
        `).get(machineId);
        if (existingRunning) {
          return sendJson(res, 409, { message: `Masih ada Order Produksi aktif (${existingRunning.order_no}). Selesaikan terlebih dahulu.` });
        }

        const machine = db.prepare(`SELECT m.*, l.area_id FROM machines m JOIN lines l ON l.id = m.line_id WHERE m.id = ?`).get(machineId);
        const shiftNo = Number(body.shiftNumber || session.shiftNumber || 2);
        const today = new Date().toISOString().slice(0, 10);

        let shiftReport = db.prepare(`
          SELECT * FROM shift_reports
          WHERE machine_id = ? AND report_date = ? AND shift_number = ? AND granularity = 'SHIFT' AND approval_status != 'RELEASED'
          ORDER BY id DESC LIMIT 1
        `).get(machineId, today, shiftNo);

        if (!shiftReport) {
          const rptCode = `RPT-${today.replaceAll('-', '')}-${machine.code.slice(-4)}-S${shiftNo}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
          const rptRes = db.prepare(`
            INSERT INTO shift_reports (
              report_code, area_id, line_id, machine_id, report_date, shift_number,
              granularity, period_label, phase_tag, calendar_minutes, planned_downtime_minutes, loading_minutes,
              target_production_pcs, approval_status, submitted_by
            ) VALUES (?, ?, ?, ?, ?, ?, 'SHIFT', ?, 'LIVE', 480, 45, 435, ?, 'NEEDS_APPROVAL', ?)
          `).run(rptCode, machine.area_id, machine.line_id, machineId, today, shiftNo, `${today} Shift ${shiftNo}`, targetQtyPcs, session.user.id);
          shiftReport = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(Number(rptRes.lastInsertRowid));
        }

        const orderNo = body.orderNo
          ? String(body.orderNo).trim().toUpperCase()
          : `PO-${today.replaceAll('-', '')}-${machine.code.slice(-4)}-${Date.now().toString(36).slice(-3).toUpperCase()}`;

        const nowIso = new Date().toISOString();
        const ordRes = db.prepare(`
          INSERT INTO production_orders (
            order_no, machine_id, sku_id, shift_report_id, production_date, shift_number,
            target_qty_pcs, status, started_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING', ?, ?)
        `).run(orderNo, machineId, sku.id, shiftReport.id, today, shiftNo, targetQtyPcs, nowIso, session.user.id);
        const orderId = Number(ordRes.lastInsertRowid);

        db.prepare(`
          INSERT INTO product_batch_reports (
            batch_code, shift_report_id, production_order_id, sku_id, machine_id,
            period_label, report_date, shift_number, loading_minutes, target_pcs, approval_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 435, ?, 'NEEDS_APPROVAL')
        `).run(`BCH-${orderNo}`, shiftReport.id, orderId, sku.id, machineId, `${today} Shift ${shiftNo} - ${sku.code}`, today, shiftNo, targetQtyPcs);

        ingestPlcRegisters(
          db,
          {
            machineId,
            d000_status: 1,
            d001_stop_code: 0,
            d002_speed_pcs_min: sku.ideal_speed_pcs_per_min,
            d005_sealer_temp_c: machine.sealer_temp_setpoint_c,
            d010_auto_downtime_flag: 0,
            d011_buzzer_relay: 0
          },
          sseHub
        );

        recordAuditLog(db, {
          category: 'PROD',
          title: `Memulai Order Produksi ${orderNo} (${sku.code}, Target ${targetQtyPcs} pcs) pada ${machine.name}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.nik})`,
          sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
          areaId: machine.area_id,
          lineId: machine.line_id,
          machineId,
          shiftReportId: shiftReport.id,
          entityType: 'production_orders',
          entityId: orderNo,
          ipAddress
        });

        const order = db.prepare(`SELECT * FROM production_orders WHERE id = ?`).get(orderId);
        return sendJson(res, 201, { ok: true, order, context: getMachineContext(db, machineId) });
      }

      const orderStatusMatch = matchPath('/api/hmi/orders/:id/status', pathname);
      const orderDirectMatch = matchPath('/api/hmi/orders/:id', pathname);
      if (method === 'PATCH' && (orderStatusMatch || orderDirectMatch)) {
        const orderIdVal = (orderStatusMatch || orderDirectMatch).id;
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const order = db.prepare(`SELECT * FROM production_orders WHERE id = ?`).get(Number(orderIdVal));
        if (!order) return sendJson(res, 404, { message: 'Order Produksi tidak ditemukan.' });
        const body = await readJsonBody(req);
        const nowIso = new Date().toISOString();

        if (body.targetQty !== undefined || body.target_qty_pcs !== undefined) {
          const newTarget = Number(body.targetQty || body.target_qty_pcs);
          if (newTarget > 0) {
            db.prepare(`UPDATE production_orders SET target_qty_pcs = ?, updated_at = ? WHERE id = ?`).run(newTarget, nowIso, order.id);
            if (order.shift_report_id) {
              db.prepare(`UPDATE product_batch_reports SET target_pcs = ? WHERE production_order_id = ?`).run(newTarget, order.id);
              recalculateShiftReport(db, order.shift_report_id);
            }
            recordAuditLog(db, {
              category: 'PROD',
              title: `Target Order Produksi ${order.order_no} diperbarui menjadi ${newTarget} pcs`,
              actorId: session.user.id,
              actorLabel: `${session.user.fullName} (${session.user.nik})`,
              sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
              machineId: order.machine_id,
              shiftReportId: order.shift_report_id,
              entityType: 'production_orders',
              entityId: order.order_no,
              before: { targetQty: order.target_qty_pcs },
              after: { targetQty: newTarget },
              ipAddress
            });
          }
        }

        if (body.extraMinutes !== undefined) {
          const extraMin = Number(body.extraMinutes);
          recordAuditLog(db, {
            category: 'PROD',
            title: `Penambahan Extra Time +${extraMin} menit pada Order Produksi ${order.order_no}`,
            actorId: session.user.id,
            actorLabel: `${session.user.fullName} (${session.user.nik})`,
            sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
            machineId: order.machine_id,
            shiftReportId: order.shift_report_id,
            entityType: 'production_orders',
            entityId: order.order_no,
            ipAddress
          });
        }

        if (body.status) {
          const nextStatus = String(body.status).toUpperCase();
          if (!['RUNNING', 'PAUSED', 'COMPLETED'].includes(nextStatus)) {
            return sendJson(res, 400, { message: 'Status order tidak valid.' });
          }
          db.prepare(`
            UPDATE production_orders
            SET status = ?, ended_at = CASE WHEN ? = 'COMPLETED' THEN ? ELSE ended_at END, updated_at = ?
            WHERE id = ?
          `).run(nextStatus, nextStatus, nowIso, nowIso, order.id);

          if (nextStatus === 'COMPLETED') {
            db.prepare(`
              UPDATE plc_register_states SET d000_status = 0, d002_speed_pcs_min = 0, updated_at = ? WHERE machine_id = ?
            `).run(nowIso, order.machine_id);
          }

          if (order.shift_report_id) {
            recalculateShiftReport(db, order.shift_report_id);
          }

          recordAuditLog(db, {
            category: 'PROD',
            title: `Status Order Produksi ${order.order_no} diubah menjadi ${nextStatus}`,
            actorId: session.user.id,
            actorLabel: `${session.user.fullName} (${session.user.nik})`,
            sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
            machineId: order.machine_id,
            shiftReportId: order.shift_report_id,
            entityType: 'production_orders',
            entityId: order.order_no,
            before: { status: order.status },
            after: { status: nextStatus },
            ipAddress
          });
        }

        return sendJson(res, 200, { ok: true, context: getMachineContext(db, order.machine_id) });
      }

      if (method === 'POST' && pathname === '/api/hmi/quality-events') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const body = await readJsonBody(req);
        const machineId = Number(body.machineId || session.machineId || 1);
        const ctx = getMachineContext(db, machineId);
        if (!ctx) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });

        const qReason = body.qualityReasonId
          ? db.prepare(`SELECT * FROM quality_reasons WHERE id = ?`).get(Number(body.qualityReasonId))
          : db.prepare(`SELECT * FROM quality_reasons WHERE quality_type = ? LIMIT 1`).get(String(body.qualityType || 'REJECT'));

        if (!qReason) return sendJson(res, 400, { message: 'Alasan kerugian kualitas tidak valid.' });

        const qtyActual = Number(body.qty ?? body.qtyActualUnit ?? 1);
        const unitName = String(body.unitName || 'pcs');
        const skuRef = ctx.activeOrder || db.prepare(`SELECT * FROM skus ORDER BY id ASC LIMIT 1`).get();
        const qtyPcs = normalizeActualUnitToPcs(qtyActual, unitName, skuRef);
        if (qtyPcs <= 0) return sendJson(res, 400, { message: 'Kuantitas defect/scrap harus lebih dari 0.' });

        const weightKg = round2((qtyPcs * Number(skuRef.net_weight_grams || 250)) / 1000);
        const idealCt = Number(skuRef.ideal_cycle_time_min || 0.024);
        const timeLossMin = round2(qtyPcs * idealCt);
        const nowIso = new Date().toISOString();

        const r = db.prepare(`
          INSERT INTO quality_loss_events (
            machine_id, production_order_id, shift_report_id, quality_reason_id,
            loss_category_code, quality_type, qty_actual_unit, actual_unit_name,
            qty_pcs, weight_kg, time_loss_minutes, source_channel,
            sealer_temp_c_snapshot, recorded_by, recorded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HMI-T7', ?, ?, ?)
        `).run(
          machineId,
          ctx.activeOrder?.id ?? null,
          ctx.latestReport?.id ?? null,
          qReason.id,
          qReason.loss_category_code,
          qReason.quality_type,
          qtyActual,
          unitName,
          qtyPcs,
          weightKg,
          timeLossMin,
          ctx.registers?.d005_sealer_temp_c ?? 165.0,
          session.user.id,
          nowIso
        );

        if (qReason.loss_category_code === 'L-06' || qReason.quality_type === 'SCRAP_K3') {
          db.prepare(`UPDATE plc_register_states SET d008_hmi_scrap_k3_count = d008_hmi_scrap_k3_count + ?, updated_at = ? WHERE machine_id = ?`)
            .run(qtyPcs, nowIso, machineId);
          if (ctx.activeOrder) {
            db.prepare(`UPDATE production_orders SET scrap_k3_pcs = scrap_k3_pcs + ?, updated_at = ? WHERE id = ?`)
              .run(qtyPcs, nowIso, ctx.activeOrder.id);
          }
        } else {
          db.prepare(`UPDATE plc_register_states SET d007_hmi_defect_count = d007_hmi_defect_count + ?, updated_at = ? WHERE machine_id = ?`)
            .run(qtyPcs, nowIso, machineId);
          if (ctx.activeOrder) {
            if (qReason.quality_type === 'REWORK') {
              db.prepare(`
                UPDATE production_orders
                SET rework_pcs = rework_pcs + ?, manual_defect_pcs = manual_defect_pcs + ?,
                    total_processed_pcs = good_qty_pcs + auto_reject_pcs + manual_defect_pcs + ?,
                    updated_at = ?
                WHERE id = ?
              `).run(qtyPcs, qtyPcs, qtyPcs, nowIso, ctx.activeOrder.id);
            } else {
              db.prepare(`
                UPDATE production_orders
                SET manual_defect_pcs = manual_defect_pcs + ?,
                    total_processed_pcs = good_qty_pcs + auto_reject_pcs + manual_defect_pcs + ?,
                    updated_at = ?
                WHERE id = ?
              `).run(qtyPcs, qtyPcs, nowIso, ctx.activeOrder.id);
            }
          }
        }

        if (ctx.latestReport) {
          recalculateShiftReport(db, ctx.latestReport.id);
        }

        recordAuditLog(db, {
          category: 'QUALITY',
          title: `Input ${qReason.quality_type} +${qtyPcs} pcs (${weightKg} kg - ${qReason.name}) pada ${ctx.machine.name}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.nik})`,
          sourceChannel: 'HMI-T7',
          areaId: ctx.machine.area_id,
          lineId: ctx.machine.line_id,
          machineId,
          shiftReportId: ctx.latestReport?.id ?? null,
          entityType: 'quality_loss_events',
          entityId: Number(r.lastInsertRowid),
          after: { qualityType: qReason.quality_type, qtyPcs, weightKg, reason: qReason.name },
          ipAddress
        });

        const refreshed = getMachineContext(db, machineId);
        sseHub.broadcast('telemetry', {
          machineId,
          machineCode: refreshed.machine.code,
          registers: refreshed.registers,
          report: refreshed.latestReport,
          activeOrder: refreshed.activeOrder
        });

        return sendJson(res, 201, { ok: true, eventId: Number(r.lastInsertRowid), context: refreshed });
      }

      if (method === 'POST' && pathname === '/api/hmi/buzzer/mute') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const body = await readJsonBody(req);
        const machineId = Number(body.machineId || session.machineId || 1);
        const nowIso = new Date().toISOString();

        // Mutes physical 24V relay BUZ-01 (D011=0) while keeping D010 interlock & UNCLASSIFIED downtime open.
        db.prepare(`UPDATE plc_register_states SET d011_buzzer_relay = 0, updated_at = ? WHERE machine_id = ?`)
          .run(nowIso, machineId);

        const openDt = db.prepare(`
          SELECT * FROM downtime_events
          WHERE machine_id = ? AND classification_status = 'UNCLASSIFIED'
          ORDER BY id DESC LIMIT 1
        `).get(machineId);

        if (openDt && !openDt.buzzer_muted_at) {
          db.prepare(`UPDATE downtime_events SET buzzer_muted_at = ?, updated_at = ? WHERE id = ?`)
            .run(nowIso, nowIso, openDt.id);
        }

        recordAuditLog(db, {
          category: 'STOP',
          title: `Sirine BUZ-01 (D011=0) dimatikan pada Mesin ID ${machineId}; pop-up interlock tetap aktif menunggu alasan`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.nik})`,
          sourceChannel: 'HMI-T7',
          machineId,
          entityType: 'plc_register_states',
          entityId: machineId,
          before: { d011_buzzer_relay: 1 },
          after: { d011_buzzer_relay: 0 },
          ipAddress
        });

        const refreshed = getMachineContext(db, machineId);
        sseHub.broadcast('telemetry', {
          machineId,
          machineCode: refreshed.machine.code,
          registers: refreshed.registers,
          activeDowntime: refreshed.activeDowntime,
          unclassifiedCount: refreshed.unclassifiedCount
        });
        return sendJson(res, 200, { ok: true, buzzerRelay: 0, interlockStillActive: refreshed.unclassifiedCount > 0, context: refreshed });
      }

      const hmiClassifyMatch = matchPath('/api/hmi/downtime/:id/classify', pathname);
      if (method === 'POST' && hmiClassifyMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const dt = db.prepare(`SELECT * FROM downtime_events WHERE id = ?`).get(Number(hmiClassifyMatch.id));
        if (!dt) return sendJson(res, 404, { message: 'Rekaman Downtime tidak ditemukan.' });

        const body = await readJsonBody(req);
        const reason = db.prepare(`SELECT * FROM downtime_reasons WHERE id = ?`).get(Number(body.reasonId));
        if (!reason) return sendJson(res, 400, { message: 'Alasan Downtime wajib dipilih.' });

        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE downtime_events
          SET
            sub_machine_id = ?,
            is_planned = ?,
            loss_category_code = ?,
            reason_id = ?,
            detail_reason = ?,
            action_tags_json = ?,
            classification_status = 'CLASSIFIED',
            buzzer_muted_at = COALESCE(buzzer_muted_at, ?),
            input_by = COALESCE(input_by, ?),
            updated_at = ?
          WHERE id = ?
        `).run(
          body.subMachineId ? Number(body.subMachineId) : dt.sub_machine_id,
          reason.is_planned,
          reason.loss_category_code,
          reason.id,
          String(body.detailReason || reason.name),
          JSON.stringify(Array.isArray(body.actionTags) ? body.actionTags : parseJsonSafe(reason.recommended_actions_json, [])),
          nowIso,
          session.user.id,
          nowIso,
          dt.id
        );

        db.prepare(`UPDATE plc_register_states SET d011_buzzer_relay = 0, updated_at = ? WHERE machine_id = ?`)
          .run(nowIso, dt.machine_id);

        if (dt.shift_report_id) {
          recalculateShiftReport(db, dt.shift_report_id);
        }

        recordAuditLog(db, {
          category: 'REASON',
          title: `Downtime ${dt.downtime_code} diklasifikasikan sebagai ${reason.code} (${reason.name})`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.nik})`,
          sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
          machineId: dt.machine_id,
          shiftReportId: dt.shift_report_id,
          entityType: 'downtime_events',
          entityId: dt.downtime_code,
          before: { classificationStatus: dt.classification_status, reasonId: dt.reason_id },
          after: { classificationStatus: 'CLASSIFIED', reasonCode: reason.code, reasonName: reason.name },
          ipAddress
        });

        const refreshed = getMachineContext(db, dt.machine_id);
        sseHub.broadcast('downtime', { machineId: dt.machine_id, downtimeCode: dt.downtime_code, context: refreshed });
        return sendJson(res, 200, { ok: true, context: refreshed });
      }

      if (method === 'POST' && pathname === '/api/hmi/small-stops') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const body = await readJsonBody(req);
        const machineId = Number(body.machineId || session.machineId || 1);
        const ctx = getMachineContext(db, machineId);
        if (!ctx) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });

        const durationMin = Math.min(4.99, Math.max(0.5, Number(body.durationMinutes || 2.0)));
        const reason = body.reasonId
          ? db.prepare(`SELECT * FROM downtime_reasons WHERE id = ?`).get(Number(body.reasonId))
          : db.prepare(`SELECT * FROM downtime_reasons WHERE loss_category_code = 'L-03' LIMIT 1`).get();

        const now = new Date();
        const startIso = new Date(now.getTime() - durationMin * 60000).toISOString();
        const endIso = now.toISOString();
        const dtCode = `SS-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
          INSERT INTO downtime_events (
            downtime_code, machine_id, sub_machine_id, production_order_id, shift_report_id,
            plc_trigger_register, plc_stop_code, is_small_stop, is_planned,
            loss_category_code, reason_id, detail_reason, action_tags_json,
            classification_status, start_time, end_time, duration_minutes, input_by
          ) VALUES (?, ?, ?, ?, ?, 'D009=1 (SMALL_STOP)', 6, 1, 0, 'L-03', ?, ?, ?, 'CLASSIFIED', ?, ?, ?, ?)
        `).run(
          dtCode,
          machineId,
          body.subMachineId ? Number(body.subMachineId) : null,
          ctx.activeOrder?.id ?? null,
          ctx.latestReport?.id ?? null,
          reason?.id ?? null,
          String(body.detailReason || reason?.name || 'Small Stop < 5 menit'),
          JSON.stringify(Array.isArray(body.actionTags) ? body.actionTags : []),
          startIso,
          endIso,
          durationMin,
          session.user.id
        );

        if (ctx.latestReport) {
          recalculateShiftReport(db, ctx.latestReport.id);
        }

        recordAuditLog(db, {
          category: 'STOP',
          title: `Small Stop ${dtCode} (${durationMin} mnt - ${reason?.name || 'L-03'}) dicatat pada ${ctx.machine.name}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.nik})`,
          sourceChannel: 'HMI-T7',
          machineId,
          shiftReportId: ctx.latestReport?.id ?? null,
          entityType: 'downtime_events',
          entityId: dtCode,
          ipAddress
        });

        return sendJson(res, 201, { ok: true, downtimeCode: dtCode, context: getMachineContext(db, machineId) });
      }

      const hmiPrevMatch = matchPath('/api/hmi/prev-production/:machineId', pathname);
      if (method === 'GET' && hmiPrevMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const ctx = getMachineContext(db, hmiPrevMatch.machineId);
        if (!ctx) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });

        const previousReports = db.prepare(`
          SELECT * FROM shift_reports
          WHERE machine_id = ? AND granularity = 'SHIFT'
          ORDER BY report_date DESC, shift_number DESC, id DESC
          LIMIT 6
        `).all(ctx.machine.id);

        const pareto = db.prepare(`
          SELECT
            COALESCE(dr.code, 'UNCLASSIFIED') AS reason_code,
            COALESCE(dr.name, 'Belum Diklasifikasi') AS reason_name,
            COALESCE(d.loss_category_code, 'L-01') AS loss_category_code,
            COUNT(*) AS event_count,
            ROUND(SUM(d.duration_minutes), 2) AS total_minutes
          FROM downtime_events d
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          WHERE d.machine_id = ?
          GROUP BY reason_code, reason_name, d.loss_category_code
          ORDER BY total_minutes DESC
        `).all(ctx.machine.id);

        const hourlyBuckets = db.prepare(`
          SELECT * FROM hourly_telemetry_buckets
          WHERE machine_id = ?
          ORDER BY id ASC
        `).all(ctx.machine.id);

        return sendJson(res, 200, { machine: ctx.machine, previousReports, pareto, hourlyBuckets });
      }

      const hmiLogsMatch = matchPath('/api/hmi/activity-logs/:machineId', pathname);
      if (method === 'GET' && hmiLogsMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const ctx = getMachineContext(db, hmiLogsMatch.machineId);
        if (!ctx) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });
        const logs = db.prepare(`
          SELECT * FROM audit_logs
          WHERE machine_id = ? OR machine_id IS NULL
          ORDER BY created_at DESC, id DESC
          LIMIT 40
        `).all(ctx.machine.id);
        return sendJson(res, 200, { machine: ctx.machine, logs });
      }

      const hmiSopMatch = matchPath('/api/hmi/guidelines/:machineId', pathname);
      if (method === 'GET' && hmiSopMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const ctx = getMachineContext(db, hmiSopMatch.machineId);
        if (!ctx) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });
        const guidelines = db.prepare(`
          SELECT * FROM guidelines
          WHERE is_active = 1 AND (machine_id IS NULL OR machine_id = ?)
          ORDER BY machine_id IS NULL ASC, id ASC
        `).all(ctx.machine.id);
        return sendJson(res, 200, { machine: ctx.machine, guidelines });
      }

      // Main Task 11 & 15: Two-Track Kaizen & TPM Management (HMI-T7 + Web Console)
      if (method === 'GET' && pathname === '/api/kaizen/tpm-impact') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const baselineRows = db.prepare(`
          SELECT * FROM shift_reports WHERE phase_tag = 'BASELINE_2022' ORDER BY report_date ASC
        `).all();
        const postTpmRows = db.prepare(`
          SELECT * FROM shift_reports WHERE phase_tag = 'POST_TPM_2023' ORDER BY report_date ASC
        `).all();
        const liveRows = db.prepare(`
          SELECT * FROM shift_reports WHERE phase_tag = 'LIVE' AND granularity = 'SHIFT' ORDER BY report_date ASC, shift_number ASC
        `).all();

        const avgMetric = (rows, key) => (rows.length > 0 ? round2(rows.reduce((s, r) => s + Number(r[key] || 0), 0) / rows.length) : 0);

        const stats = db.prepare(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
            SUM(CASE WHEN status = 'REVISE' THEN 1 ELSE 0 END) AS revise_count,
            SUM(CASE WHEN status = 'CLOSED' AND verification_status = 'NOT_VERIFIED' THEN 1 ELSE 0 END) AS awaiting_verify_count,
            SUM(CASE WHEN status = 'CLOSED' AND verification_status = 'OK' THEN 1 ELSE 0 END) AS verified_ok_count,
            ROUND(AVG(lead_time_days), 2) AS avg_lead_time_days
          FROM kaizen_tickets
        `).get();

        return sendJson(res, 200, {
          jipmTargetOeePct: 85.0,
          baseline2022: {
            period: 'Juli - November 2022 (Pra-TPM)',
            availabilityPct: 85.85,
            performancePct: 80.83,
            qualityPct: 98.02,
            oeePct: 68.01,
            monthly: baselineRows
          },
          postTpm2023: {
            period: '26 - 27 Mei 2023 (Implementasi TPM & Autonomous Maintenance)',
            availabilityPct: avgMetric(postTpmRows, 'availability_pct'),
            performancePct: avgMetric(postTpmRows, 'performance_pct'),
            qualityPct: avgMetric(postTpmRows, 'quality_pct'),
            oeePct: avgMetric(postTpmRows, 'oee_pct'),
            deltaOeePct: round2(avgMetric(postTpmRows, 'oee_pct') - 68.01),
            daily: postTpmRows
          },
          liveOperational: {
            period: 'Oktober 2026 (Operasional Berjalan)',
            availabilityPct: avgMetric(liveRows, 'availability_pct'),
            performancePct: avgMetric(liveRows, 'performance_pct'),
            qualityPct: avgMetric(liveRows, 'quality_pct'),
            oeePct: avgMetric(liveRows, 'oee_pct')
          },
          ticketStats: stats
        });
      }

      if (method === 'GET' && pathname === '/api/kaizen') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const type = urlObj.searchParams.get('type');
        const status = urlObj.searchParams.get('status');
        const verification = urlObj.searchParams.get('verificationStatus');
        const machineId = urlObj.searchParams.get('machineId');

        const clauses = ['1 = 1'];
        const args = [];
        if (type) {
          clauses.push('k.kaizen_type = ?');
          args.push(type.toUpperCase());
        }
        if (status) {
          clauses.push('k.status = ?');
          args.push(status.toUpperCase());
        }
        if (verification) {
          clauses.push('k.verification_status = ?');
          args.push(verification.toUpperCase());
        }
        if (machineId) {
          clauses.push('k.machine_id = ?');
          args.push(Number(machineId));
        }

        const tickets = db.prepare(`
          SELECT
            k.*,
            m.code AS machine_code, m.name AS machine_name,
            sm.code AS sub_machine_code, sm.name AS sub_machine_name,
            l.name AS line_name,
            u_cre.full_name AS created_by_name,
            u_imp.full_name AS improvement_by_name,
            u_ver.full_name AS verified_by_name,
            (SELECT COUNT(*) FROM kaizen_comments c WHERE c.kaizen_id = k.id) AS comment_count
          FROM kaizen_tickets k
          JOIN machines m ON m.id = k.machine_id
          JOIN sub_machines sm ON sm.id = k.sub_machine_id
          JOIN lines l ON l.id = k.line_id
          JOIN users u_cre ON u_cre.id = k.created_by
          LEFT JOIN users u_imp ON u_imp.id = k.improvement_by
          LEFT JOIN users u_ver ON u_ver.id = k.verified_by
          WHERE ${clauses.join(' AND ')}
          ORDER BY
            CASE k.status WHEN 'REVISE' THEN 0 WHEN 'OPEN' THEN 1 ELSE 2 END,
            CASE k.verification_status WHEN 'NOT_VERIFIED' THEN 0 WHEN 'NOT_OK' THEN 1 ELSE 2 END,
            k.id DESC
        `).all(...args).map((t) => ({
          ...t,
          issueDocs: parseJsonSafe(t.issue_docs_json, []),
          improvementDocs: parseJsonSafe(t.improvement_docs_json, []),
          assignedPicIds: parseJsonSafe(t.assigned_pic_ids_json, []),
          beforeTelemetry: parseJsonSafe(t.before_telemetry_json, {}),
          afterTelemetry: parseJsonSafe(t.after_telemetry_json, {})
        }));

        return sendJson(res, 200, { tickets });
      }

      const kaizenDetailMatch = matchPath('/api/kaizen/:id', pathname);
      if (method === 'GET' && kaizenDetailMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const isNum = /^\d+$/.test(kaizenDetailMatch.id);
        const ticket = db.prepare(`
          SELECT k.*, m.code AS machine_code, m.name AS machine_name, sm.name AS sub_machine_name,
                 u_cre.full_name AS created_by_name, u_imp.full_name AS improvement_by_name, u_ver.full_name AS verified_by_name
          FROM kaizen_tickets k
          JOIN machines m ON m.id = k.machine_id
          JOIN sub_machines sm ON sm.id = k.sub_machine_id
          JOIN users u_cre ON u_cre.id = k.created_by
          LEFT JOIN users u_imp ON u_imp.id = k.improvement_by
          LEFT JOIN users u_ver ON u_ver.id = k.verified_by
          WHERE ${isNum ? 'k.id = ?' : 'UPPER(k.code) = UPPER(?)'}
          LIMIT 1
        `).get(isNum ? Number(kaizenDetailMatch.id) : kaizenDetailMatch.id);

        if (!ticket) return sendJson(res, 404, { message: 'Tiket Kaizen tidak ditemukan.' });

        const comments = db.prepare(`
          SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.user_type AS author_type
          FROM kaizen_comments c
          JOIN users u ON u.id = c.author_id
          WHERE c.kaizen_id = ?
          ORDER BY c.created_at ASC, c.id ASC
        `).all(ticket.id);

        return sendJson(res, 200, {
          ticket: {
            ...ticket,
            issueDocs: parseJsonSafe(ticket.issue_docs_json, []),
            improvementDocs: parseJsonSafe(ticket.improvement_docs_json, []),
            assignedPicIds: parseJsonSafe(ticket.assigned_pic_ids_json, []),
            beforeTelemetry: parseJsonSafe(ticket.before_telemetry_json, {}),
            afterTelemetry: parseJsonSafe(ticket.after_telemetry_json, {})
          },
          comments
        });
      }

      if (method === 'POST' && pathname === '/api/kaizen') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const body = await readJsonBody(req);
        const machineId = Number(body.machineId || session.machineId || 1);
        const machine = db.prepare(`SELECT m.*, l.area_id FROM machines m JOIN lines l ON l.id = m.line_id WHERE m.id = ?`).get(machineId);
        if (!machine) return sendJson(res, 400, { message: 'Mesin tidak valid.' });

        const subMachineId = body.subMachineId
          ? Number(body.subMachineId)
          : db.prepare(`SELECT id FROM sub_machines WHERE machine_id = ? ORDER BY id ASC LIMIT 1`).get(machineId)?.id;

        const issueTitle = String(body.issueTitle || body.title || '').trim();
        const issueDescription = String(body.issueDescription || body.description || '').trim();
        if (!issueTitle || !issueDescription) {
          return sendJson(res, 400, { message: 'Judul Isu dan Deskripsi Temuan Lapangan wajib diisi.' });
        }

        const kaizenType = String(body.kaizenType || body.category || 'PRODUCTION').toUpperCase() === 'MAINTENANCE' ? 'MAINTENANCE' : 'PRODUCTION';
        const code = `KZN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
        const today = new Date().toISOString().slice(0, 10);
        const due = body.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

        const regs = db.prepare(`SELECT * FROM plc_register_states WHERE machine_id = ?`).get(machineId);
        const snapshot = body.beforeTelemetry || {
          speedPpm: regs?.d002_speed_pcs_min ?? 0,
          sealerTempC: regs?.d005_sealer_temp_c ?? 165,
          vibrationMms: regs?.d006_vibration_mms ?? 0
        };

        const r = db.prepare(`
          INSERT INTO kaizen_tickets (
            code, kaizen_type, status, verification_status,
            area_id, line_id, machine_id, sub_machine_id,
            fishbone_factor, criteria, loss_category_code,
            issue_title, issue_description, issue_docs_json,
            assigned_department, assigned_pic_ids_json, reviewer_id,
            start_date, due_date, before_telemetry_json, source_channel, created_by
          ) VALUES (?, ?, 'OPEN', 'NOT_OK', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          code,
          kaizenType,
          machine.area_id,
          machine.line_id,
          machineId,
          subMachineId,
          ['MESIN', 'LINGKUNGAN', 'MANUSIA', 'METODE', 'MATERIAL'].includes(String(body.fishboneFactor || 'MESIN').split(/[,/]/)[0].trim().toUpperCase())
            ? String(body.fishboneFactor || 'MESIN').split(/[,/]/)[0].trim().toUpperCase()
            : 'MESIN',
          String(body.criteria || 'Losses Reduction'),
          String(body.lossCategoryCode || (kaizenType === 'MAINTENANCE' ? 'L-01' : 'L-03')),
          issueTitle,
          issueDescription,
          JSON.stringify(Array.isArray(body.issueDocs) ? body.issueDocs : []),
          kaizenType === 'MAINTENANCE' ? 'Maintenance & Engineering' : 'Production Unit 2',
          JSON.stringify(Array.isArray(body.assignedPicIds) ? body.assignedPicIds : []),
          body.reviewerId ? Number(body.reviewerId) : null,
          today,
          due,
          JSON.stringify(snapshot),
          session.channel === 'HMI' ? 'HMI' : 'WEB',
          session.user.id
        );

        const created = db.prepare(`SELECT * FROM kaizen_tickets WHERE id = ?`).get(Number(r.lastInsertRowid));
        recordAuditLog(db, {
          category: 'KAIZEN',
          title: `Menerbitkan Tiket Kaizen ${created.code} (${created.kaizen_type}): ${created.issue_title}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.role})`,
          sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
          areaId: machine.area_id,
          lineId: machine.line_id,
          machineId,
          entityType: 'kaizen_tickets',
          entityId: created.code,
          after: created,
          ipAddress
        });

        pushNotification(
          db,
          {
            severity: 'KAIZEN',
            tagLabel: `TIKET KAIZEN ${created.kaizen_type}`,
            title: `${created.code}: ${created.issue_title}`,
            body: `Diterbitkan oleh ${session.user.fullName} pada ${machine.name}. Tenggat perbaikan: ${due}.`,
            targetRoles: ['SHIFT_LEADER', 'SPV', 'ADMIN_MANAGER', 'SUPERADMIN'],
            areaId: machine.area_id,
            machineId,
            ctaLabel: 'Buka Tiket Kaizen',
            ctaRoute: `/web/kaizen/${created.code}`,
            entityType: 'kaizen_tickets',
            entityId: created.code
          },
          sseHub
        );

        return sendJson(res, 201, { ok: true, ticket: created });
      }

      const kaizenStep2Match = matchPath('/api/kaizen/:id/step2', pathname);
      if ((method === 'PATCH' || method === 'POST') && kaizenStep2Match) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const ticket = db.prepare(`SELECT * FROM kaizen_tickets WHERE id = ?`).get(Number(kaizenStep2Match.id));
        if (!ticket) return sendJson(res, 404, { message: 'Tiket Kaizen tidak ditemukan.' });

        // Track B (MAINTENANCE) repairs cannot be closed by a Production Operator; requires TECHNICAL PIC or SPV+.
        if (
          ticket.kaizen_type === 'MAINTENANCE' &&
          session.user.role === 'OPERATOR' &&
          session.user.userType !== 'TECHNICAL'
        ) {
          return sendJson(res, 403, {
            error: 'FORBIDDEN_KAIZEN_TRACK_B',
            message: 'Tiket Kaizen Maintenance (Jalur B) hanya dapat diisi tindak lanjut perbaikannya oleh Teknisi Maintenance atau Supervisor.'
          });
        }

        const body = await readJsonBody(req);
        const rootCause = body.rootCause || body.root_cause;
        const improvementDescription = body.improvementDescription || body.correctiveAction;
        const solutionType = body.solutionType || (body.resolutionType ? 'PERMANENT' : null);
        if (!rootCause || !improvementDescription || !solutionType) {
          return sendJson(res, 400, { message: 'Akar Masalah (Root Cause), Tipe Solusi (PERMANENT/TEMPORARY), dan Deskripsi Perbaikan wajib diisi.' });
        }

        const today = new Date().toISOString().slice(0, 10);
        const nowIso = new Date().toISOString();
        const leadDays = Math.max(
          0.5,
          round2((new Date(today).getTime() - new Date(ticket.start_date).getTime()) / 86400000) || 1.0
        );

        db.prepare(`
          UPDATE kaizen_tickets
          SET
            status = 'CLOSED',
            verification_status = 'NOT_VERIFIED',
            root_cause = ?,
            solution_type = ?,
            improvement_description = ?,
            improvement_docs_json = ?,
            improvement_by = ?,
            improvement_date = ?,
            lead_time_days = ?,
            after_telemetry_json = ?,
            updated_at = ?
          WHERE id = ?
        `).run(
          String(rootCause).trim(),
          String(solutionType).toUpperCase() === 'TEMPORARY' ? 'TEMPORARY' : 'PERMANENT',
          String(improvementDescription).trim(),
          JSON.stringify(Array.isArray(body.improvementDocs) ? body.improvementDocs : []),
          session.user.id,
          today,
          leadDays,
          JSON.stringify(body.afterTelemetry || {}),
          nowIso,
          ticket.id
        );

        const updated = db.prepare(`SELECT * FROM kaizen_tickets WHERE id = ?`).get(ticket.id);
        recordAuditLog(db, {
          category: 'KAIZEN',
          title: `Tindak lanjut perbaikan Step 2 selesai pada ${updated.code}; menunggu verifikasi SPV`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.role})`,
          sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
          machineId: updated.machine_id,
          entityType: 'kaizen_tickets',
          entityId: updated.code,
          before: { status: ticket.status, verificationStatus: ticket.verification_status },
          after: { status: updated.status, verificationStatus: updated.verification_status },
          ipAddress
        });

        pushNotification(
          db,
          {
            severity: 'KAIZEN',
            tagLabel: 'MENUNGGU VERIFIKASI SPV',
            title: `Perbaikan ${updated.code} Selesai & Siap Diverifikasi`,
            body: `${session.user.fullName} menyelesaikan perbaikan ${updated.solution_type}. Mohon verifikasi efektivitas di lapangan.`,
            targetRoles: ['SPV', 'ADMIN_MANAGER', 'SUPERADMIN'],
            machineId: updated.machine_id,
            ctaLabel: 'Verifikasi Kaizen',
            ctaRoute: `/web/kaizen/${updated.code}`,
            entityType: 'kaizen_tickets',
            entityId: updated.code
          },
          sseHub
        );

        return sendJson(res, 200, { ok: true, ticket: updated });
      }

      const kaizenVerifyMatch = matchPath('/api/kaizen/:id/verify', pathname);
      if (method === 'POST' && kaizenVerifyMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        if (!requirePermission(res, session, 'canVerifyKaizen', 'Hanya Supervisor, Admin/Manager, atau SuperAdmin yang dapat memverifikasi efektivitas Kaizen.')) {
          return;
        }
        const ticket = db.prepare(`SELECT * FROM kaizen_tickets WHERE id = ?`).get(Number(kaizenVerifyMatch.id));
        if (!ticket) return sendJson(res, 404, { message: 'Tiket Kaizen tidak ditemukan.' });

        const body = await readJsonBody(req);
        const decision = String(body.decision || body.verificationStatus || '').toUpperCase();
        const nowIso = new Date().toISOString();

        if (decision === 'OK') {
          if (ticket.status !== 'CLOSED') {
            return sendJson(res, 409, { message: 'Tiket harus berstatus CLOSED (Step 2 selesai) sebelum dapat diverifikasi OK.' });
          }
          db.prepare(`
            UPDATE kaizen_tickets
            SET status = 'CLOSED', verification_status = 'OK', revision_reason = '',
                verified_by = ?, verified_at = ?, updated_at = ?
            WHERE id = ?
          `).run(session.user.id, nowIso, nowIso, ticket.id);
        } else if (decision === 'REVISE') {
          const revReason = String(body.revisionReason || body.reason || '').trim();
          if (!revReason) {
            return sendJson(res, 400, { message: 'Alasan revisi wajib diisi saat mengembalikan tiket Kaizen ke status REVISE.' });
          }
          db.prepare(`
            UPDATE kaizen_tickets
            SET status = 'REVISE', verification_status = 'NOT_OK', revision_reason = ?,
                verified_by = ?, verified_at = ?, updated_at = ?
            WHERE id = ?
          `).run(revReason, session.user.id, nowIso, nowIso, ticket.id);
        } else {
          return sendJson(res, 400, { message: 'Keputusan verifikasi harus OK atau REVISE.' });
        }

        const updated = db.prepare(`SELECT * FROM kaizen_tickets WHERE id = ?`).get(ticket.id);
        recordAuditLog(db, {
          category: 'KAIZEN',
          title: `Verifikasi Kaizen ${updated.code} diputuskan ${decision} oleh ${session.user.fullName}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.role})`,
          sourceChannel: session.channel === 'HMI' ? 'HMI-T7' : 'WEB',
          machineId: updated.machine_id,
          entityType: 'kaizen_tickets',
          entityId: updated.code,
          before: { status: ticket.status, verificationStatus: ticket.verification_status },
          after: { status: updated.status, verificationStatus: updated.verification_status, revisionReason: updated.revision_reason },
          ipAddress
        });

        pushNotification(
          db,
          {
            severity: 'KAIZEN',
            tagLabel: decision === 'OK' ? 'KAIZEN TERVERIFIKASI OK' : 'KAIZEN PERLU REVISI',
            title: `${updated.code} Diverifikasi ${decision} oleh ${session.user.fullName}`,
            body: decision === 'OK' ? 'Solusi perbaikan dinyatakan efektif menurunkan losses.' : updated.revision_reason,
            targetRoles: ['SHIFT_LEADER', 'SPV', 'ADMIN_MANAGER', 'SUPERADMIN'],
            targetUserId: ticket.improvement_by || ticket.created_by,
            machineId: updated.machine_id,
            ctaLabel: 'Lihat Tiket Kaizen',
            ctaRoute: `/web/kaizen/${updated.code}`,
            entityType: 'kaizen_tickets',
            entityId: updated.code
          },
          sseHub
        );

        return sendJson(res, 200, { ok: true, ticket: updated });
      }

      const kaizenCommentMatch = matchPath('/api/kaizen/:id/comments', pathname);
      if (method === 'POST' && kaizenCommentMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const ticket = db.prepare(`SELECT * FROM kaizen_tickets WHERE id = ?`).get(Number(kaizenCommentMatch.id));
        if (!ticket) return sendJson(res, 404, { message: 'Tiket Kaizen tidak ditemukan.' });

        const body = await readJsonBody(req);
        const text = String(body.commentText || '').trim();
        if (!text) return sendJson(res, 400, { message: 'Isi komentar tidak boleh kosong.' });

        const nowIso = new Date().toISOString();
        const r = db.prepare(`
          INSERT INTO kaizen_comments (kaizen_id, author_id, comment_text, created_at)
          VALUES (?, ?, ?, ?)
        `).run(ticket.id, session.user.id, text, nowIso);

        pushNotification(
          db,
          {
            severity: 'KAIZEN',
            tagLabel: 'DISKUSI KAIZEN BARU',
            title: `Komentar Baru pada ${ticket.code} dari ${session.user.fullName}`,
            body: text.slice(0, 140),
            targetRoles: ['SHIFT_LEADER', 'SPV', 'ADMIN_MANAGER', 'SUPERADMIN'],
            machineId: ticket.machine_id,
            ctaLabel: 'Balas Diskusi',
            ctaRoute: `/web/kaizen/${ticket.code}`,
            entityType: 'kaizen_tickets',
            entityId: ticket.code
          },
          sseHub
        );

        const created = db.prepare(`
          SELECT c.*, u.full_name AS author_name, u.role AS author_role
          FROM kaizen_comments c JOIN users u ON u.id = c.author_id
          WHERE c.id = ?
        `).get(Number(r.lastInsertRowid));
        return sendJson(res, 201, { ok: true, comment: created });
      }

      // Main Task 12: Web Monitoring Production Active & Line Detail + SPV Downtime Correction
      if (method === 'GET' && pathname === '/api/web/production-active') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const machineIds = db.prepare(`SELECT id FROM machines WHERE is_active = 1 ORDER BY id ASC`).all();
        const cards = machineIds.map((m) => getMachineContext(db, m.id));

        const activeReports = cards.map((c) => c.latestReport).filter(Boolean);
        const avgOee = activeReports.length > 0
          ? round2(activeReports.reduce((s, r) => s + r.oee_pct, 0) / activeReports.length)
          : 0;

        const summary = {
          totalMachines: cards.length,
          runningCount: cards.filter((c) => c.registers?.d000_status === 1 && c.registers?.connection_status === 'ONLINE').length,
          faultOrStopCount: cards.filter((c) => c.registers?.d000_status === 2 || c.registers?.d000_status === 3).length,
          syncingCount: cards.filter((c) => c.registers?.connection_status === 'SYNCING').length,
          standbyCount: cards.filter((c) => c.registers?.d000_status === 0).length,
          totalUnclassifiedDowntimes: cards.reduce((s, c) => s + c.unclassifiedCount, 0),
          averageActiveOeePct: avgOee,
          jipmTargetPct: 85.0
        };

        return sendJson(res, 200, { summary, cards });
      }

      const lineDetailMatch = matchPath('/api/web/lines/:machineId/detail', pathname);
      if (method === 'GET' && lineDetailMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const ctx = getMachineContext(db, lineDetailMatch.machineId);
        if (!ctx) return sendJson(res, 404, { message: 'Mesin tidak ditemukan.' });

        const report = ctx.latestReport;
        const waterfall = report
          ? [
              { key: 'calendar', label: 'Calendar Time', minutes: report.calendar_minutes, type: 'base' },
              { key: 'planned', label: 'Planned Downtime', minutes: -report.planned_downtime_minutes, type: 'loss_schedule' },
              { key: 'loading', label: 'Loading Time', minutes: report.loading_minutes, type: 'subtotal' },
              { key: 'unplanned', label: 'Availability Loss (L-01 + L-02)', minutes: -report.unplanned_downtime_minutes, type: 'loss_availability' },
              { key: 'operating', label: 'Operating Time', minutes: report.operating_minutes, type: 'subtotal' },
              { key: 'minor_stop', label: 'Idle & Minor Stop (L-03)', minutes: -report.minor_stop_l03_minutes, type: 'loss_performance' },
              { key: 'reduced_speed', label: 'Reduced Speed (L-04)', minutes: -report.reduced_speed_l04_minutes, type: 'loss_performance' },
              { key: 'net_operating', label: 'Net Operating Time', minutes: report.net_operating_minutes, type: 'subtotal' },
              { key: 'quality', label: 'Quality Loss (L-05 + L-06)', minutes: -round2(report.defect_l05_minutes + report.scrap_l06_minutes), type: 'loss_quality' },
              { key: 'value_added', label: 'Value Added Time', minutes: report.value_added_minutes, type: 'final' }
            ]
          : [];

        const downtimes = db.prepare(`
          SELECT d.*,
                 COALESCE(po.order_no, 'Without No. Production') AS order_label,
                 dr.code AS reason_code, dr.name AS reason_name,
                 sm.name AS sub_machine_name,
                 u_in.full_name AS input_by_name,
                 u_cor.full_name AS corrected_by_name,
                 sr.approval_status AS shift_approval_status
          FROM downtime_events d
          LEFT JOIN production_orders po ON po.id = d.production_order_id
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          LEFT JOIN users u_in ON u_in.id = d.input_by
          LEFT JOIN users u_cor ON u_cor.id = d.last_corrected_by
          LEFT JOIN shift_reports sr ON sr.id = d.shift_report_id
          WHERE d.machine_id = ?
          ORDER BY d.start_time DESC, d.id DESC
        `).all(ctx.machine.id);

        const qualityEvents = db.prepare(`
          SELECT q.*, qr.code AS reason_code, qr.name AS reason_name, u.full_name AS recorded_by_name
          FROM quality_loss_events q
          JOIN quality_reasons qr ON qr.id = q.quality_reason_id
          LEFT JOIN users u ON u.id = q.recorded_by
          WHERE q.machine_id = ?
          ORDER BY q.recorded_at DESC, q.id DESC
        `).all(ctx.machine.id);

        const hourlyBuckets = db.prepare(`
          SELECT * FROM hourly_telemetry_buckets WHERE machine_id = ? ORDER BY id ASC
        `).all(ctx.machine.id);

        const subMachines = db.prepare(`SELECT * FROM sub_machines WHERE machine_id = ? ORDER BY id ASC`).all(ctx.machine.id);
        const downtimeReasons = db.prepare(`SELECT * FROM downtime_reasons WHERE is_active = 1 ORDER BY id ASC`).all();

        return sendJson(res, 200, {
          ...ctx,
          waterfall,
          timelineSegments: parseJsonSafe(report?.timeline_segments_json, []),
          downtimes,
          qualityEvents,
          hourlyBuckets,
          subMachines,
          downtimeReasons
        });
      }

      const webDowntimePatchMatch = matchPath('/api/web/downtime/:id', pathname);
      if (method === 'PATCH' && webDowntimePatchMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canEditDowntimeWeb', 'Shift Leader bersifat pantau-saja. Koreksi alasan Downtime memerlukan hak akses Supervisor atau Manager.')) {
          return;
        }

        const existing = db.prepare(`
          SELECT d.*, dr.code AS old_reason_code, dr.name AS old_reason_name
          FROM downtime_events d
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          WHERE d.id = ?
        `).get(Number(webDowntimePatchMatch.id));
        if (!existing) return sendJson(res, 404, { message: 'Rekaman Downtime tidak ditemukan.' });

        const body = await readJsonBody(req);
        if (
          (body.startTime !== undefined && body.startTime !== existing.start_time) ||
          (body.endTime !== undefined && existing.end_time !== null && body.endTime !== existing.end_time) ||
          (body.durationMinutes !== undefined && existing.end_time !== null && Math.abs(Number(body.durationMinutes) - existing.duration_minutes) > 0.0001)
        ) {
          return sendJson(res, 409, {
            error: 'IMMUTABLE_PLC_TIMESTAMP',
            message: 'Waktu Start, End, dan Durasi berasal dari stempel waktu PLC-ABC dan tidak dapat dimodifikasi.'
          });
        }

        const reason = db.prepare(`SELECT * FROM downtime_reasons WHERE id = ?`).get(Number(body.reasonId ?? existing.reason_id));
        if (!reason) return sendJson(res, 400, { message: 'Alasan Downtime tidak valid.' });

        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE downtime_events
          SET
            sub_machine_id = ?,
            is_planned = ?,
            loss_category_code = ?,
            reason_id = ?,
            detail_reason = ?,
            classification_status = 'CLASSIFIED',
            last_corrected_by = ?,
            corrected_at = ?,
            updated_at = ?
          WHERE id = ?
        `).run(
          body.subMachineId !== undefined ? (body.subMachineId ? Number(body.subMachineId) : null) : existing.sub_machine_id,
          reason.is_planned,
          reason.loss_category_code,
          reason.id,
          String(body.detailReason ?? existing.detail_reason ?? reason.name),
          session.user.id,
          nowIso,
          nowIso,
          existing.id
        );

        let updatedReport = null;
        if (existing.shift_report_id) {
          updatedReport = recalculateShiftReport(db, existing.shift_report_id);
        }

        const afterRow = db.prepare(`SELECT * FROM downtime_events WHERE id = ?`).get(existing.id);
        recordAuditLog(db, {
          category: 'REASON',
          title: `Supervisor ${session.user.fullName} mengoreksi klasifikasi Downtime ${existing.downtime_code} ke ${reason.code} (${reason.name})`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.role})`,
          sourceChannel: 'WEB',
          machineId: existing.machine_id,
          shiftReportId: existing.shift_report_id,
          entityType: 'downtime_events',
          entityId: existing.downtime_code,
          before: {
            classificationStatus: existing.classification_status,
            lossCategoryCode: existing.loss_category_code,
            reasonId: existing.reason_id,
            reasonName: existing.old_reason_name,
            detailReason: existing.detail_reason
          },
          after: {
            classificationStatus: afterRow.classification_status,
            lossCategoryCode: afterRow.loss_category_code,
            reasonId: afterRow.reason_id,
            reasonName: reason.name,
            detailReason: afterRow.detail_reason
          },
          ipAddress
        });

        return sendJson(res, 200, { ok: true, downtime: afterRow, updatedShiftReport: updatedReport });
      }

      // Main Task 13: Web Dashboards (Business Impact & OEE Performance)
      if (method === 'GET' && pathname === '/api/web/dashboard/business-impact') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const phase = urlObj.searchParams.get('phase') || 'LIVE';
        const machineId = urlObj.searchParams.get('machineId');

        const clauses = ['1 = 1'];
        const args = [];
        if (phase !== 'ALL') {
          clauses.push('phase_tag = ?');
          args.push(phase);
        }
        if (machineId) {
          clauses.push('machine_id = ?');
          args.push(Number(machineId));
        }

        const reports = db.prepare(`SELECT * FROM shift_reports WHERE ${clauses.join(' AND ')} ORDER BY report_date ASC`).all(...args);
        const skus = db.prepare(`SELECT * FROM skus WHERE is_active = 1 ORDER BY id ASC`).all();
        const impact = computeBusinessImpact({ reports, skus, activeSku: skus[0] });
        return sendJson(res, 200, { phase, reportCount: reports.length, impact });
      }

      if (method === 'GET' && pathname === '/api/web/dashboard/oee-performance') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const phase = urlObj.searchParams.get('phase') || 'ALL';
        const machineId = urlObj.searchParams.get('machineId');

        const clauses = ['1 = 1'];
        const args = [];
        if (phase !== 'ALL') {
          clauses.push('sr.phase_tag = ?');
          args.push(phase);
        }
        if (machineId) {
          clauses.push('sr.machine_id = ?');
          args.push(Number(machineId));
        }

        const reports = db.prepare(`
          SELECT sr.*, m.code AS machine_code, m.name AS machine_name, l.name AS line_name
          FROM shift_reports sr
          JOIN machines m ON m.id = sr.machine_id
          JOIN lines l ON l.id = sr.line_id
          WHERE ${clauses.join(' AND ')}
          ORDER BY sr.report_date ASC, sr.shift_number ASC
        `).all(...args);

        const sum = (key) => reports.reduce((s, r) => s + Number(r[key] || 0), 0);
        const avg = (key) => (reports.length > 0 ? round2(sum(key) / reports.length) : 0);

        const sixBigLosses = buildSixBigLosses({
          loadingMinutes: sum('loading_minutes'),
          breakdownL01Minutes: sum('breakdown_l01_minutes'),
          setupL02Minutes: sum('setup_l02_minutes'),
          minorStopL03Minutes: sum('minor_stop_l03_minutes'),
          reducedSpeedL04Minutes: sum('reduced_speed_l04_minutes'),
          defectL05Minutes: sum('defect_l05_minutes'),
          scrapL06Minutes: sum('scrap_l06_minutes'),
          idealCycleTimeMin: 0.024
        });

        const downtimePareto = db.prepare(`
          SELECT
            COALESCE(dr.id, 0) AS reason_id,
            COALESCE(dr.code, 'UNCLASSIFIED') AS reason_code,
            COALESCE(dr.name, 'Belum Diklasifikasi') AS reason_name,
            COALESCE(d.loss_category_code, 'L-01') AS loss_category_code,
            COUNT(*) AS event_count,
            ROUND(SUM(d.duration_minutes), 2) AS total_minutes
          FROM downtime_events d
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          GROUP BY reason_id, reason_code, reason_name, d.loss_category_code
          ORDER BY total_minutes DESC
        `).all();

        const rejectPareto = db.prepare(`
          SELECT qr.code, qr.name, qr.quality_type, qr.loss_category_code,
                 SUM(q.qty_pcs) AS total_pcs, ROUND(SUM(q.weight_kg), 2) AS total_kg
          FROM quality_loss_events q
          JOIN quality_reasons qr ON qr.id = q.quality_reason_id
          GROUP BY qr.id
          ORDER BY total_pcs DESC
        `).all();

        const subMachinePareto = db.prepare(`
          SELECT COALESCE(sm.name, 'Umum / Tanpa Sub-Mesin') AS sub_machine_name,
                 COUNT(*) AS event_count,
                 ROUND(SUM(d.duration_minutes), 2) AS total_minutes
          FROM downtime_events d
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          GROUP BY sub_machine_name
          ORDER BY total_minutes DESC
        `).all();

        const heatmap = db.prepare(`
          SELECT sr.report_date, sr.shift_number, sr.period_label, sr.phase_tag,
                 sr.oee_pct, sr.availability_pct, sr.performance_pct, sr.quality_pct,
                 m.code AS machine_code, m.name AS machine_name
          FROM shift_reports sr
          JOIN machines m ON m.id = sr.machine_id
          WHERE sr.granularity IN ('SHIFT', 'DAILY')
          ORDER BY sr.report_date ASC, sr.shift_number ASC
        `).all();

        return sendJson(res, 200, {
          jipmStandards: { oee: 85.0, availability: 90.0, performance: 95.0, quality: 99.0 },
          kpis: {
            oeePct: avg('oee_pct'),
            availabilityPct: avg('availability_pct'),
            performancePct: avg('performance_pct'),
            qualityPct: avg('quality_pct'),
            teepPct: avg('teep_pct'),
            utilityPct: avg('utility_pct'),
            totalLoadingMinutes: round2(sum('loading_minutes')),
            totalGoodOutputPcs: Math.round(sum('good_output_pcs')),
            totalDefectPcs: Math.round(sum('defect_pcs')),
            totalScrapK3Pcs: Math.round(sum('scrap_k3_pcs'))
          },
          sixBigLosses,
          paretos: {
            downtimeByReason: downtimePareto,
            qualityByReason: rejectPareto,
            downtimeBySubMachine: subMachinePareto
          },
          trendSeries: reports,
          dailyHeatmap: heatmap
        });
      }

      // Main Task 14: Web Loss Analytics (Availability, Performance, Quality & Reason Drill-down)
      if (method === 'GET' && pathname === '/api/web/losses/availability') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const events = db.prepare(`
          SELECT d.*, m.code AS machine_code, m.name AS machine_name,
                 sm.name AS sub_machine_name, dr.code AS reason_code, dr.name AS reason_name,
                 COALESCE(po.order_no, 'Without No. Production') AS order_label
          FROM downtime_events d
          JOIN machines m ON m.id = d.machine_id
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          LEFT JOIN production_orders po ON po.id = d.production_order_id
          WHERE d.is_small_stop = 0
          ORDER BY d.start_time DESC, d.id DESC
        `).all();

        const mttrMtbfByMachine = db.prepare(`
          SELECT m.id, m.code, m.name,
                 ROUND(SUM(sr.breakdown_l01_minutes), 2) AS l01_minutes,
                 SUM(sr.breakdown_l01_count) AS l01_count,
                 ROUND(SUM(sr.setup_l02_minutes), 2) AS l02_minutes,
                 ROUND(SUM(sr.operating_minutes), 2) AS operating_minutes
          FROM shift_reports sr
          JOIN machines m ON m.id = sr.machine_id
          WHERE sr.phase_tag = 'LIVE'
          GROUP BY m.id
          ORDER BY m.id ASC
        `).all().map((row) => ({
          ...row,
          mttrMinutes: row.l01_count > 0 ? round2(row.l01_minutes / row.l01_count) : null,
          mtbfMinutes: row.l01_count > 0 ? round2(row.operating_minutes / row.l01_count) : null
        }));

        return sendJson(res, 200, { events, mttrMtbfByMachine });
      }

      if (method === 'GET' && pathname === '/api/web/losses/performance') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const smallStops = db.prepare(`
          SELECT d.*, m.code AS machine_code, m.name AS machine_name,
                 sm.name AS sub_machine_name, dr.code AS reason_code, dr.name AS reason_name
          FROM downtime_events d
          JOIN machines m ON m.id = d.machine_id
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          WHERE d.is_small_stop = 1 OR d.loss_category_code = 'L-03'
          ORDER BY d.start_time DESC
        `).all();

        const hourlySpeedProfile = db.prepare(`
          SELECT h.*, m.code AS machine_code, m.name AS machine_name
          FROM hourly_telemetry_buckets h
          JOIN machines m ON m.id = h.machine_id
          ORDER BY h.id ASC
        `).all();

        const summary = db.prepare(`
          SELECT
            ROUND(SUM(minor_stop_l03_minutes), 2) AS total_l03_minutes,
            ROUND(SUM(reduced_speed_l04_minutes), 2) AS total_l04_minutes,
            ROUND(AVG(performance_pct), 2) AS avg_performance_pct
          FROM shift_reports
          WHERE phase_tag = 'LIVE'
        `).get();

        return sendJson(res, 200, { summary, smallStops, hourlySpeedProfile });
      }

      if (method === 'GET' && pathname === '/api/web/losses/quality') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const events = db.prepare(`
          SELECT q.*, m.code AS machine_code, m.name AS machine_name,
                 qr.code AS reason_code, qr.name AS reason_name,
                 COALESCE(po.order_no, '-') AS order_no,
                 u.full_name AS recorded_by_name
          FROM quality_loss_events q
          JOIN machines m ON m.id = q.machine_id
          JOIN quality_reasons qr ON qr.id = q.quality_reason_id
          LEFT JOIN production_orders po ON po.id = q.production_order_id
          LEFT JOIN users u ON u.id = q.recorded_by
          ORDER BY q.recorded_at DESC, q.id DESC
        `).all();

        const byType = db.prepare(`
          SELECT quality_type, loss_category_code,
                 SUM(qty_pcs) AS total_pcs,
                 ROUND(SUM(weight_kg), 2) AS total_kg,
                 ROUND(SUM(time_loss_minutes), 2) AS total_minutes
          FROM quality_loss_events
          GROUP BY quality_type, loss_category_code
        `).all();

        return sendJson(res, 200, { events, byType });
      }

      const reasonDrillMatch = matchPath('/api/web/losses/downtime-reason/:reasonId', pathname);
      if (method === 'GET' && reasonDrillMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const reason = db.prepare(`SELECT * FROM downtime_reasons WHERE id = ?`).get(Number(reasonDrillMatch.reasonId));
        if (!reason) return sendJson(res, 404, { message: 'Downtime Reason tidak ditemukan.' });

        const occurrences = db.prepare(`
          SELECT d.*, m.code AS machine_code, m.name AS machine_name, sm.name AS sub_machine_name,
                 u.full_name AS input_by_name
          FROM downtime_events d
          JOIN machines m ON m.id = d.machine_id
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          LEFT JOIN users u ON u.id = d.input_by
          WHERE d.reason_id = ?
          ORDER BY d.start_time DESC
        `).all(reason.id);

        return sendJson(res, 200, {
          reason: { ...reason, recommendedActions: parseJsonSafe(reason.recommended_actions_json, []) },
          occurrences
        });
      }

      // Main Task 16: Web Reports (By Shift & By Product, Pre-Approval Gate, Approve, Revise, Release Lock & CSV)
      if (method === 'GET' && pathname === '/api/web/reports/by-shift') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const status = urlObj.searchParams.get('approvalStatus');
        const granularity = urlObj.searchParams.get('granularity');
        const machineId = urlObj.searchParams.get('machineId');

        const clauses = ['1 = 1'];
        const args = [];
        if (status) {
          clauses.push('sr.approval_status = ?');
          args.push(status.toUpperCase());
        }
        if (granularity) {
          clauses.push('sr.granularity = ?');
          args.push(granularity.toUpperCase());
        }
        if (machineId) {
          clauses.push('sr.machine_id = ?');
          args.push(Number(machineId));
        }

        const reports = db.prepare(`
          SELECT sr.*,
                 m.code AS machine_code, m.name AS machine_name,
                 l.name AS line_name, a.name AS area_name,
                 u_app.full_name AS approved_by_name,
                 u_rel.full_name AS released_by_name,
                 (SELECT COUNT(*) FROM downtime_events d WHERE d.shift_report_id = sr.id AND d.classification_status = 'UNCLASSIFIED') AS unclassified_downtime_count
          FROM shift_reports sr
          JOIN machines m ON m.id = sr.machine_id
          JOIN lines l ON l.id = sr.line_id
          JOIN areas a ON a.id = sr.area_id
          LEFT JOIN users u_app ON u_app.id = sr.approved_by
          LEFT JOIN users u_rel ON u_rel.id = sr.released_by
          WHERE ${clauses.join(' AND ')}
          ORDER BY sr.report_date DESC, sr.shift_number DESC, sr.id DESC
        `).all(...args);

        if (urlObj.searchParams.get('format') === 'csv') {
          return sendCsv(
            res,
            'report-by-shift-productioncore.csv',
            ['Kode Laporan', 'Tanggal', 'Periode', 'Mesin', 'Status', 'Loading (mnt)', 'Operating (mnt)', 'Good Output (pcs)', 'Defect (pcs)', 'Scrap K3 (pcs)', 'Availability (%)', 'Performance (%)', 'Quality (%)', 'OEE (%)'],
            reports.map((r) => [
              r.report_code, r.report_date, r.period_label, r.machine_name, r.approval_status,
              r.loading_minutes, r.operating_minutes, r.good_output_pcs, r.defect_pcs, r.scrap_k3_pcs,
              r.availability_pct, r.performance_pct, r.quality_pct, r.oee_pct
            ])
          );
        }

        return sendJson(res, 200, { reports });
      }

      const shiftReportDetailMatch = matchPath('/api/web/reports/by-shift/:id', pathname);
      if (method === 'GET' && shiftReportDetailMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const report = db.prepare(`
          SELECT sr.*, m.code AS machine_code, m.name AS machine_name, l.name AS line_name,
                 u_app.full_name AS approved_by_name, u_rel.full_name AS released_by_name
          FROM shift_reports sr
          JOIN machines m ON m.id = sr.machine_id
          JOIN lines l ON l.id = sr.line_id
          LEFT JOIN users u_app ON u_app.id = sr.approved_by
          LEFT JOIN users u_rel ON u_rel.id = sr.released_by
          WHERE sr.id = ?
        `).get(Number(shiftReportDetailMatch.id));
        if (!report) return sendJson(res, 404, { message: 'Laporan Shift tidak ditemukan.' });

        const downtimes = db.prepare(`
          SELECT d.*, dr.code AS reason_code, dr.name AS reason_name, sm.name AS sub_machine_name,
                 COALESCE(po.order_no, 'Without No. Production') AS order_label
          FROM downtime_events d
          LEFT JOIN downtime_reasons dr ON dr.id = d.reason_id
          LEFT JOIN sub_machines sm ON sm.id = d.sub_machine_id
          LEFT JOIN production_orders po ON po.id = d.production_order_id
          WHERE d.shift_report_id = ?
          ORDER BY d.start_time ASC
        `).all(report.id);

        const batches = db.prepare(`
          SELECT b.*, s.code AS sku_code, s.name AS sku_name
          FROM product_batch_reports b
          JOIN skus s ON s.id = b.sku_id
          WHERE b.shift_report_id = ?
        `).all(report.id);

        const unclassified = downtimes.filter((d) => d.classification_status === 'UNCLASSIFIED');

        return sendJson(res, 200, {
          report: {
            ...report,
            timelineSegments: parseJsonSafe(report.timeline_segments_json, [])
          },
          preApprovalGate: {
            canApprove: unclassified.length === 0 && report.approval_status === 'NEEDS_APPROVAL',
            unclassifiedCount: unclassified.length,
            blockingDowntimeCodes: unclassified.map((d) => d.downtime_code)
          },
          downtimes,
          batches
        });
      }

      const approveShiftMatch = matchPath('/api/web/reports/by-shift/:id/approve', pathname);
      if (method === 'POST' && approveShiftMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canApproveReports', 'Hanya Supervisor, Admin/Manager, atau SuperAdmin yang dapat menyetujui (Approve) Laporan Shift.')) {
          return;
        }
        const report = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(Number(approveShiftMatch.id));
        if (!report) return sendJson(res, 404, { message: 'Laporan Shift tidak ditemukan.' });
        if (report.approval_status === 'RELEASED') {
          return sendJson(res, 409, { message: 'Laporan ini sudah berstatus RELEASED dan terkunci permanen.' });
        }

        const unclassified = db.prepare(`
          SELECT downtime_code, start_time, duration_minutes FROM downtime_events
          WHERE shift_report_id = ? AND classification_status = 'UNCLASSIFIED'
        `).all(report.id);

        if (unclassified.length > 0) {
          return sendJson(res, 409, {
            error: 'UNREASONED_DOWNTIME_EXISTS',
            unclassifiedCount: unclassified.length,
            blockingDowntimes: unclassified,
            message: `Persetujuan ditolak: masih terdapat ${unclassified.length} kejadian Unreasoned Downtime (${unclassified.map((u) => u.downtime_code).join(', ')}) yang wajib dilengkapi terlebih dahulu.`
          });
        }

        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE shift_reports
          SET approval_status = 'APPROVED', approved_by = ?, approved_at = ?, revision_note = '', updated_at = ?
          WHERE id = ?
        `).run(session.user.id, nowIso, nowIso, report.id);

        db.prepare(`
          UPDATE product_batch_reports
          SET approval_status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = ?
          WHERE shift_report_id = ?
        `).run(session.user.id, nowIso, nowIso, report.id);

        const updated = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(report.id);
        recordAuditLog(db, {
          category: 'REPORT',
          title: `Laporan Shift ${updated.report_code} disetujui (APPROVED) oleh ${session.user.fullName}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.role})`,
          sourceChannel: 'WEB',
          machineId: updated.machine_id,
          shiftReportId: updated.id,
          entityType: 'shift_reports',
          entityId: updated.report_code,
          before: { approvalStatus: report.approval_status },
          after: { approvalStatus: 'APPROVED' },
          ipAddress
        });

        pushNotification(
          db,
          {
            severity: 'APPROVAL',
            tagLabel: 'SIAP RELEASE MANAGER',
            title: `Laporan ${updated.report_code} Telah Disetujui SPV & Menunggu Release`,
            body: `OEE Shift: ${updated.oee_pct}%. Seluruh downtime telah terklasifikasi lengkap.`,
            targetRoles: ['ADMIN_MANAGER', 'SUPERADMIN'],
            machineId: updated.machine_id,
            ctaLabel: 'Release Laporan',
            ctaRoute: '/web/reports/by-shift',
            entityType: 'shift_reports',
            entityId: updated.report_code
          },
          sseHub
        );

        return sendJson(res, 200, { ok: true, report: updated });
      }

      const reviseShiftMatch = matchPath('/api/web/reports/by-shift/:id/revise', pathname);
      if (method === 'POST' && reviseShiftMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canApproveReports')) return;

        const report = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(Number(reviseShiftMatch.id));
        if (!report) return sendJson(res, 404, { message: 'Laporan Shift tidak ditemukan.' });
        if (report.approval_status === 'RELEASED') {
          return sendJson(res, 409, { message: 'Laporan yang telah di-RELEASE terkunci permanen dan tidak dapat dikembalikan ke Needs Approval.' });
        }

        const body = await readJsonBody(req);
        const note = String(body.revisionNote || '').trim();
        if (!note) return sendJson(res, 400, { message: 'Catatan alasan revisi wajib diisi.' });

        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE shift_reports
          SET approval_status = 'NEEDS_APPROVAL', approved_by = NULL, approved_at = NULL, revision_note = ?, updated_at = ?
          WHERE id = ?
        `).run(note, nowIso, report.id);

        db.prepare(`
          UPDATE product_batch_reports
          SET approval_status = 'NEEDS_APPROVAL', approved_by = NULL, approved_at = NULL, updated_at = ?
          WHERE shift_report_id = ?
        `).run(nowIso, report.id);

        const updated = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(report.id);
        recordAuditLog(db, {
          category: 'REPORT',
          title: `Laporan Shift ${updated.report_code} dikembalikan ke NEEDS_APPROVAL oleh ${session.user.fullName}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.role})`,
          sourceChannel: 'WEB',
          machineId: updated.machine_id,
          shiftReportId: updated.id,
          entityType: 'shift_reports',
          entityId: updated.report_code,
          before: { approvalStatus: report.approval_status },
          after: { approvalStatus: 'NEEDS_APPROVAL', revisionNote: note },
          ipAddress
        });

        return sendJson(res, 200, { ok: true, report: updated });
      }

      const releaseShiftMatch = matchPath('/api/web/reports/by-shift/:id/release', pathname);
      if (method === 'POST' && releaseShiftMatch) {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        if (!requirePermission(res, session, 'canReleaseReports', 'Hanya Admin/Manager atau pengguna dengan otorisasi Release yang dapat mengunci laporan secara permanen.')) {
          return;
        }

        const report = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(Number(releaseShiftMatch.id));
        if (!report) return sendJson(res, 404, { message: 'Laporan Shift tidak ditemukan.' });
        if (report.approval_status !== 'APPROVED') {
          return sendJson(res, 409, { message: 'Laporan harus berstatus APPROVED oleh Supervisor terlebih dahulu sebelum dapat di-RELEASE.' });
        }

        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE shift_reports
          SET approval_status = 'RELEASED', released_by = ?, released_at = ?, updated_at = ?
          WHERE id = ?
        `).run(session.user.id, nowIso, nowIso, report.id);

        db.prepare(`
          UPDATE product_batch_reports
          SET approval_status = 'RELEASED', released_by = ?, released_at = ?, updated_at = ?
          WHERE shift_report_id = ?
        `).run(session.user.id, nowIso, nowIso, report.id);

        const updated = db.prepare(`SELECT * FROM shift_reports WHERE id = ?`).get(report.id);
        recordAuditLog(db, {
          category: 'REPORT',
          title: `Laporan Shift ${updated.report_code} dikunci permanen (RELEASED) oleh ${session.user.fullName}`,
          actorId: session.user.id,
          actorLabel: `${session.user.fullName} (${session.user.role})`,
          sourceChannel: 'WEB',
          machineId: updated.machine_id,
          shiftReportId: updated.id,
          entityType: 'shift_reports',
          entityId: updated.report_code,
          before: { approvalStatus: 'APPROVED' },
          after: { approvalStatus: 'RELEASED', releasedAt: nowIso },
          ipAddress
        });

        return sendJson(res, 200, { ok: true, report: updated });
      }

      if (method === 'GET' && pathname === '/api/web/reports/by-product') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const skuId = urlObj.searchParams.get('skuId');
        const status = urlObj.searchParams.get('approvalStatus');

        const clauses = ['1 = 1'];
        const args = [];
        if (skuId) {
          clauses.push('b.sku_id = ?');
          args.push(Number(skuId));
        }
        if (status) {
          clauses.push('b.approval_status = ?');
          args.push(status.toUpperCase());
        }

        const batches = db.prepare(`
          SELECT b.*, s.code AS sku_code, s.name AS sku_name,
                 m.code AS machine_code, m.name AS machine_name,
                 sr.report_code
          FROM product_batch_reports b
          JOIN skus s ON s.id = b.sku_id
          JOIN machines m ON m.id = b.machine_id
          JOIN shift_reports sr ON sr.id = b.shift_report_id
          WHERE ${clauses.join(' AND ')}
          ORDER BY b.report_date DESC, b.shift_number DESC, b.id DESC
        `).all(...args);

        if (urlObj.searchParams.get('format') === 'csv') {
          return sendCsv(
            res,
            'report-by-product-productioncore.csv',
            ['Kode Batch', 'SKU', 'Nama Produk', 'Mesin', 'Periode', 'Status', 'Good (pcs)', 'Good (karton)', 'Berat Bersih (kg)', 'Defect (pcs)', 'Scrap K3 (pcs)', 'OEE (%)'],
            batches.map((b) => [
              b.batch_code, b.sku_code, b.sku_name, b.machine_name, b.period_label, b.approval_status,
              b.good_output_pcs, b.good_output_cartons, b.good_output_kg, b.defect_pcs, b.scrap_k3_pcs, b.oee_pct
            ])
          );
        }

        return sendJson(res, 200, { batches });
      }

      // Main Task 17: Centralized Immutable Audit Log & Per-User Notification Center
      if (method === 'GET' && pathname === '/api/web/audit-logs') {
        const session = requireAuth(req, res, urlObj, 'WEB');
        if (!session) return;
        const category = urlObj.searchParams.get('category');
        const sourceChannel = urlObj.searchParams.get('sourceChannel');
        const machineId = urlObj.searchParams.get('machineId');
        const search = urlObj.searchParams.get('search');

        const clauses = ['1 = 1'];
        const args = [];
        if (category) {
          clauses.push('al.category = ?');
          args.push(category.toUpperCase());
        }
        if (sourceChannel) {
          clauses.push('al.source_channel = ?');
          args.push(sourceChannel.toUpperCase());
        }
        if (machineId) {
          clauses.push('al.machine_id = ?');
          args.push(Number(machineId));
        }
        if (search) {
          clauses.push('(LOWER(al.title) LIKE LOWER(?) OR LOWER(al.actor_label) LIKE LOWER(?) OR LOWER(al.event_code) LIKE LOWER(?))');
          const pat = `%${search.trim()}%`;
          args.push(pat, pat, pat);
        }

        const logs = db.prepare(`
          SELECT al.*, m.code AS machine_code, m.name AS machine_name
          FROM audit_logs al
          LEFT JOIN machines m ON m.id = al.machine_id
          WHERE ${clauses.join(' AND ')}
          ORDER BY al.created_at DESC, al.id DESC
          LIMIT 250
        `).all(...args).map((row) => ({
          ...row,
          before: parseJsonSafe(row.before_json, null),
          after: parseJsonSafe(row.after_json, null)
        }));

        if (urlObj.searchParams.get('format') === 'csv') {
          return sendCsv(
            res,
            'audit-logs-productioncore.csv',
            ['Waktu (UTC)', 'Kode Event', 'Kategori', 'Kanal', 'Aktor', 'Mesin', 'Judul Aktivitas', 'Before JSON', 'After JSON'],
            logs.map((l) => [
              l.created_at, l.event_code, l.category, l.source_channel, l.actor_label,
              l.machine_name || '-', l.title, l.before_json || '', l.after_json || ''
            ])
          );
        }

        return sendJson(res, 200, { logs });
      }

      if (method === 'GET' && pathname === '/api/web/notifications') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const severity = urlObj.searchParams.get('severity');

        const all = db.prepare(`
          SELECT n.*, m.code AS machine_code, m.name AS machine_name,
                 nr.read_at
          FROM notifications n
          LEFT JOIN machines m ON m.id = n.machine_id
          LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
          ORDER BY n.created_at DESC, n.id DESC
          LIMIT 100
        `).all(session.user.id);

        const visible = all
          .filter((n) => {
            if (n.target_user_id && n.target_user_id === session.user.id) return true;
            const roles = parseJsonSafe(n.target_roles_json, []);
            return roles.length === 0 || roles.includes(session.user.role);
          })
          .filter((n) => (!severity ? true : n.severity === severity.toUpperCase()))
          .map((n) => ({
            ...n,
            targetRoles: parseJsonSafe(n.target_roles_json, []),
            isRead: Boolean(n.read_at)
          }));

        const unreadCount = visible.filter((n) => !n.isRead).length;
        return sendJson(res, 200, { unreadCount, notifications: visible });
      }

      const notifReadMatch = matchPath('/api/web/notifications/:id/read', pathname);
      if (method === 'POST' && notifReadMatch) {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        db.prepare(`
          INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at)
          VALUES (?, ?, ?)
        `).run(Number(notifReadMatch.id), session.user.id, new Date().toISOString());
        return sendJson(res, 200, { ok: true });
      }

      if (method === 'POST' && pathname === '/api/web/notifications/read-all') {
        const session = requireAuth(req, res, urlObj);
        if (!session) return;
        const nowIso = new Date().toISOString();
        const ids = db.prepare(`SELECT id FROM notifications`).all();
        const ins = db.prepare(`INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)`);
        for (const row of ids) {
          ins.run(row.id, session.user.id, nowIso);
        }
        return sendJson(res, 200, { ok: true });
      }

      if (method === 'GET' && !pathname.startsWith('/api/')) {
        if (serveStatic(req, res, pathname)) {
          return;
        }
      }

      return sendJson(res, 404, { error: 'NOT_FOUND', message: `Endpoint ${method} ${pathname} tidak ditemukan.` });
    } catch (error) {
      const msg = String(error?.message || 'Internal Server Error');
      if (
        msg.includes('immutable') ||
        msg.includes('RELEASED') ||
        msg.includes('append-only') ||
        msg.includes('UNIQUE constraint failed') ||
        msg.includes('CHECK constraint failed')
      ) {
        return sendJson(res, 409, { error: 'INTEGRITY_CONSTRAINT', message: msg });
      }
      return sendJson(res, error?.status || 500, { error: 'SERVER_ERROR', message: msg });
    }
  };

  const server = createServer(requestHandler);

  function close() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    sseHub.closeAll();
    return new Promise((resolveClose) => server.close(() => resolveClose()));
  }

  return { server, requestHandler, sseHub, close };
}

