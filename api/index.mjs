import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DB_PATH, openDatabase, seedDatabase } from '../db/seed.mjs';
import { createApp } from '../server/app.mjs';
import { round1 } from '../server/oee-engine.mjs';
import { ingestPlcRegisters } from '../server/repository.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dbPath = isVercel ? '/tmp/productioncore.sqlite' : (process.env.DATABASE_PATH || DEFAULT_DB_PATH);
const publicDir = resolve(__dirname, '../public');

let appInstance = null;
let lastJitterAt = 0;

function getApp() {
  if (appInstance) return appInstance;

  if (isVercel && !existsSync(dbPath)) {
    if (existsSync(DEFAULT_DB_PATH)) {
      try {
        copyFileSync(DEFAULT_DB_PATH, dbPath);
      } catch {
        // Fallback to fresh seed
      }
    }
  }

  const db = openDatabase(dbPath);
  seedDatabase(db);

  const app = createApp({ db, publicDir, enableLiveTick: false });
  appInstance = { ...app, db };
  return appInstance;
}

function tickJitter(db, sseHub) {
  const now = Date.now();
  if (now - lastJitterAt < 2500) return;
  lastJitterAt = now;

  try {
    const running = db.prepare(`
      SELECT machine_id, d002_speed_pcs_min, d003_good_count, d005_sealer_temp_c, d006_vibration_mms, d012_heartbeat_seq
      FROM plc_register_states
      WHERE d000_status = 1 AND connection_status = 'ONLINE'
    `).all();

    for (const r of running) {
      if (r.d002_speed_pcs_min < 35.0) continue;
      const jitterSpeed = round1(Math.max(36.8, Math.min(41.6, r.d002_speed_pcs_min + (Math.random() - 0.48) * 0.4)));
      const jitterTemp = round1(Math.max(162.5, Math.min(167.2, r.d005_sealer_temp_c + (Math.random() - 0.5) * 0.3)));
      ingestPlcRegisters(
        db,
        {
          machineId: r.machine_id,
          d002_speed_pcs_min: jitterSpeed,
          d003_good_count: r.d003_good_count + 1,
          d005_sealer_temp_c: jitterTemp,
          d012_heartbeat_seq: (r.d012_heartbeat_seq + 1) % 65536
        },
        sseHub
      );
    }
  } catch {
    // Suppress jitter error in serverless environment
  }
}

export default async function handler(req, res) {
  const app = getApp();
  tickJitter(app.db, app.sseHub);
  await app.requestHandler(req, res);
}
