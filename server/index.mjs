import { DEFAULT_DB_PATH, openDatabase, seedDatabase } from '../db/seed.mjs';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3400);
const host = process.env.HOST || '127.0.0.1';
const enableLiveTick = process.env.DISABLE_PLC_TICK !== '1';

const db = openDatabase(DEFAULT_DB_PATH);
seedDatabase(db);

const app = createApp({ db, enableLiveTick });

app.server.listen(port, host, () => {
  console.log(`ProductionCore OEE server listening on http://${host}:${port}`);
  console.log(`  Web Management Console : http://${host}:${port}/web`);
  console.log(`  Panel HMI-T7 Console   : http://${host}:${port}/hmi`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await app.close();
    db.close();
    process.exit(0);
  });
}

