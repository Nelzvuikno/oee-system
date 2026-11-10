import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const WEB_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const HMI_SESSION_TTL_MS = 9 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export const ROLE_PERMISSIONS = {
  OPERATOR: {
    canAccessWeb: false,
    canAccessHmi: true,
    canEditDowntimeWeb: false,
    canApproveReports: false,
    canReleaseReports: false,
    canVerifyKaizen: false,
    canManageMasterOperational: false,
    canManageMasterSystem: false
  },
  SHIFT_LEADER: {
    canAccessWeb: true,
    canAccessHmi: true,
    canEditDowntimeWeb: false,
    canApproveReports: false,
    canReleaseReports: false,
    canVerifyKaizen: false,
    canManageMasterOperational: false,
    canManageMasterSystem: false
  },
  SPV: {
    canAccessWeb: true,
    canAccessHmi: true,
    canEditDowntimeWeb: true,
    canApproveReports: true,
    canReleaseReports: false,
    canVerifyKaizen: true,
    canManageMasterOperational: false,
    canManageMasterSystem: false
  },
  ADMIN_MANAGER: {
    canAccessWeb: true,
    canAccessHmi: false,
    canEditDowntimeWeb: true,
    canApproveReports: true,
    canReleaseReports: true,
    canVerifyKaizen: true,
    canManageMasterOperational: true,
    canManageMasterSystem: false
  },
  SUPERADMIN: {
    canAccessWeb: true,
    canAccessHmi: true,
    canEditDowntimeWeb: true,
    canApproveReports: true,
    canReleaseReports: true,
    canVerifyKaizen: true,
    canManageMasterOperational: true,
    canManageMasterSystem: true
  }
};

export function hashSecret(secret, existingSalt) {
  const salt = existingSalt || randomBytes(16).toString('hex');
  const derived = scryptSync(String(secret), salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(secret, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  const [salt, expectedHex] = storedHash.split(':');
  const actualBuf = scryptSync(String(secret), salt, 32);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(actualBuf, expectedBuf);
}

export function hashOpaqueToken(rawToken) {
  return createHash('sha256').update(String(rawToken)).digest('hex');
}

export const SESSION_SECRET = process.env.SESSION_SECRET || 'pc_oee_secure_hmac_secret_2026';

export function signStatelessToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyStatelessToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = createHmac('sha256', SESSION_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature.length !== expectedSig.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

export function getPermissionsForUser(user) {
  const base = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.OPERATOR;
  return {
    ...base,
    canReleaseReports: Boolean(base.canReleaseReports || user.can_release_reports === 1)
  };
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    nik: user.nik,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    department: user.department,
    jobTitle: user.job_title,
    role: user.role,
    userType: user.user_type,
    primaryAreaId: user.primary_area_id,
    primaryLineId: user.primary_line_id,
    primaryMachineId: user.primary_machine_id,
    themePreference: user.theme_preference,
    canReleaseReports: Boolean(user.can_release_reports),
    isActive: Boolean(user.is_active),
    lastLoginAt: user.last_login_at,
    permissions: getPermissionsForUser(user)
  };
}

export function authenticateWebUser(db, { identifier, password, ipAddress = '127.0.0.1', now = new Date() }) {
  const cleanId = String(identifier || '').trim();
  const user = db.prepare(`
    SELECT * FROM users
    WHERE LOWER(username) = LOWER(?) OR LOWER(COALESCE(email, '')) = LOWER(?) OR LOWER(nik) = LOWER(?)
    LIMIT 1
  `).get(cleanId, cleanId, cleanId);

  if (!user || !user.is_active) {
    return { ok: false, status: 401, code: 'INVALID_CREDENTIALS', message: 'Username/NIK atau kata sandi tidak valid.' };
  }

  const perms = getPermissionsForUser(user);
  if (!perms.canAccessWeb) {
    return {
      ok: false,
      status: 403,
      code: 'ROLE_HMI_ONLY',
      message: 'Akun Operator hanya diizinkan masuk melalui konsol Panel HMI-T7 di lantai produksi.'
    };
  }

  if (user.web_locked_until && new Date(user.web_locked_until).getTime() > now.getTime()) {
    const remainingSec = Math.ceil((new Date(user.web_locked_until).getTime() - now.getTime()) / 1000);
    return {
      ok: false,
      status: 423,
      code: 'ACCOUNT_LOCKED',
      remainingSeconds: remainingSec,
      lockedUntil: user.web_locked_until,
      message: `Akun dikunci sementara selama ${Math.ceil(remainingSec / 60)} menit akibat 5 percobaan gagal.`
    };
  }

  if (!verifySecret(password, user.password_hash)) {
    const attempts = (user.web_locked_until && new Date(user.web_locked_until).getTime() <= now.getTime())
      ? 1
      : (user.failed_web_attempts || 0) + 1;

    if (attempts >= LOCKOUT_MAX_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS).toISOString();
      db.prepare(`UPDATE users SET failed_web_attempts = ?, web_locked_until = ?, updated_at = ? WHERE id = ?`)
        .run(attempts, lockedUntil, now.toISOString(), user.id);
      return {
        ok: false,
        status: 423,
        code: 'ACCOUNT_LOCKED',
        remainingSeconds: 300,
        lockedUntil,
        message: 'Akun dikunci selama 5 menit karena salah memasukkan kata sandi 5 kali berturut-turut.'
      };
    }

    db.prepare(`UPDATE users SET failed_web_attempts = ?, web_locked_until = NULL, updated_at = ? WHERE id = ?`)
      .run(attempts, now.toISOString(), user.id);
    return {
      ok: false,
      status: 401,
      code: 'INVALID_CREDENTIALS',
      attemptsRemaining: LOCKOUT_MAX_ATTEMPTS - attempts,
      message: `Kata sandi tidak sesuai. Sisa percobaan sebelum kunci otomatis: ${LOCKOUT_MAX_ATTEMPTS - attempts}.`
    };
  }

  const expiresAt = new Date(now.getTime() + WEB_SESSION_TTL_MS).toISOString();
  const rawToken = signStatelessToken({
    userId: user.id,
    role: user.role,
    channel: 'WEB',
    exp: new Date(expiresAt).getTime()
  });
  const tokenHash = hashOpaqueToken(rawToken);

  db.prepare(`
    UPDATE users
    SET failed_web_attempts = 0, web_locked_until = NULL, last_login_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now.toISOString(), now.toISOString(), user.id);

  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, channel, ip_address, expires_at, created_at)
    VALUES (?, ?, 'WEB', ?, ?, ?)
  `).run(tokenHash, user.id, ipAddress, expiresAt, now.toISOString());

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
  return {
    ok: true,
    token: rawToken,
    expiresAt,
    user: sanitizeUser(updated)
  };
}

export function authenticateHmiOperator(db, { userId, nik, pin, machineId, shiftNumber = 1, ipAddress = '127.0.0.1', now = new Date() }) {
  let cleanIdentifier = String(nik || '').trim();
  if (cleanIdentifier.toUpperCase() === 'OPR-U2-01' || cleanIdentifier.toUpperCase() === 'OPR-01') cleanIdentifier = 'op.slamet';
  if (cleanIdentifier.toUpperCase() === 'OPR-U2-02' || cleanIdentifier.toUpperCase() === 'OPR-02') cleanIdentifier = 'op.wahyu';
  if (cleanIdentifier.toUpperCase() === 'SPV-U2-01') cleanIdentifier = 'spv.unit2';

  const user = userId
    ? db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).get(Number(userId))
    : db.prepare(`SELECT * FROM users WHERE LOWER(nik) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1`).get(cleanIdentifier, cleanIdentifier);

  if (!user || !user.is_active) {
    return { ok: false, status: 401, code: 'OPERATOR_NOT_FOUND', message: 'Identitas operator tidak aktif atau tidak ditemukan.' };
  }

  const perms = getPermissionsForUser(user);
  if (!perms.canAccessHmi) {
    return { ok: false, status: 403, code: 'ROLE_WEB_ONLY', message: 'Peran akun ini tidak diizinkan mengoperasikan konsol Panel HMI-T7.' };
  }

  if (user.hmi_locked_until && new Date(user.hmi_locked_until).getTime() > now.getTime()) {
    const remainingSec = Math.ceil((new Date(user.hmi_locked_until).getTime() - now.getTime()) / 1000);
    return {
      ok: false,
      status: 423,
      code: 'HMI_PIN_LOCKED',
      remainingSeconds: remainingSec,
      lockedUntil: user.hmi_locked_until,
      message: `Numpad PIN terkunci ${remainingSec} detik akibat 5 percobaan PIN gagal.`
    };
  }

  if (!/^\d{6}$/.test(String(pin || '')) || !verifySecret(String(pin), user.hmi_pin_hash)) {
    const attempts = (user.hmi_locked_until && new Date(user.hmi_locked_until).getTime() <= now.getTime())
      ? 1
      : (user.failed_hmi_attempts || 0) + 1;

    if (attempts >= LOCKOUT_MAX_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS).toISOString();
      db.prepare(`UPDATE users SET failed_hmi_attempts = ?, hmi_locked_until = ?, updated_at = ? WHERE id = ?`)
        .run(attempts, lockedUntil, now.toISOString(), user.id);
      return {
        ok: false,
        status: 423,
        code: 'HMI_PIN_LOCKED',
        remainingSeconds: 300,
        lockedUntil,
        message: 'PIN salah 5 kali. Numpad dikunci selama 5 menit dan notifikasi keamanan dikirim ke Supervisor.'
      };
    }

    db.prepare(`UPDATE users SET failed_hmi_attempts = ?, hmi_locked_until = NULL, updated_at = ? WHERE id = ?`)
      .run(attempts, now.toISOString(), user.id);
    return {
      ok: false,
      status: 401,
      code: 'INVALID_PIN',
      attemptsRemaining: LOCKOUT_MAX_ATTEMPTS - attempts,
      message: `PIN 6 digit salah. Sisa percobaan: ${LOCKOUT_MAX_ATTEMPTS - attempts}.`
    };
  }

  const expiresAt = new Date(now.getTime() + HMI_SESSION_TTL_MS).toISOString();
  const targetMachineId = Number(machineId || user.primary_machine_id || 1);
  const rawToken = signStatelessToken({
    userId: user.id,
    role: user.role,
    channel: 'HMI',
    machineId: targetMachineId,
    shiftNumber: Number(shiftNumber) || 1,
    exp: new Date(expiresAt).getTime()
  });
  const tokenHash = hashOpaqueToken(rawToken);

  db.prepare(`
    UPDATE users
    SET failed_hmi_attempts = 0, hmi_locked_until = NULL, last_login_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now.toISOString(), now.toISOString(), user.id);

  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, channel, machine_id, shift_number, ip_address, expires_at, created_at)
    VALUES (?, ?, 'HMI', ?, ?, ?, ?, ?)
  `).run(tokenHash, user.id, targetMachineId, Number(shiftNumber) || 1, ipAddress, expiresAt, now.toISOString());

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
  return {
    ok: true,
    token: rawToken,
    expiresAt,
    machineId: targetMachineId,
    shiftNumber: Number(shiftNumber) || 1,
    user: sanitizeUser(updated)
  };
}

export function resolveSession(db, rawToken, now = new Date()) {
  if (!rawToken) return null;

  // 1. Stateless signed token verification (cross-lambda persistent on Vercel)
  const stateless = verifyStatelessToken(rawToken);
  if (stateless && stateless.userId) {
    if (stateless.exp && Number(stateless.exp) <= now.getTime()) {
      return null;
    }
    const user = db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).get(Number(stateless.userId));
    if (!user || !user.is_active) return null;

    return {
      sessionId: 0,
      channel: stateless.channel || 'WEB',
      machineId: stateless.machineId || user.primary_machine_id || 1,
      shiftNumber: stateless.shiftNumber || 1,
      expiresAt: new Date(stateless.exp || (now.getTime() + WEB_SESSION_TTL_MS)).toISOString(),
      rawUser: user,
      user: sanitizeUser(user)
    };
  }

  // 2. Database session lookup fallback
  const tokenHash = hashOpaqueToken(rawToken);
  const row = db.prepare(`
    SELECT
      s.id AS session_id,
      s.channel,
      s.machine_id AS session_machine_id,
      s.shift_number AS session_shift_number,
      s.expires_at,
      s.revoked_at,
      u.*
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
    LIMIT 1
  `).get(tokenHash);

  if (!row || row.revoked_at || !row.is_active) return null;
  if (new Date(row.expires_at).getTime() <= now.getTime()) return null;

  return {
    sessionId: row.session_id,
    channel: row.channel,
    machineId: row.session_machine_id,
    shiftNumber: row.session_shift_number,
    expiresAt: row.expires_at,
    rawUser: row,
    user: sanitizeUser(row)
  };
}

export function createRecoveryRequest(db, { userId, channel, machineId = null, reasonNote = '', now = new Date() }) {
  const rawResetToken = channel === 'WEB_PASSWORD' ? randomBytes(16).toString('hex') : null;
  const tokenHash = rawResetToken ? hashOpaqueToken(rawResetToken) : null;
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS).toISOString();

  const result = db.prepare(`
    INSERT INTO access_recovery_requests (
      user_id, channel, machine_id, reset_token_hash, token_expires_at, reason_note, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(userId, channel, machineId, tokenHash, expiresAt, reasonNote, now.toISOString());

  return {
    requestId: Number(result.lastInsertRowid),
    resetToken: rawResetToken,
    expiresAt
  };
}

