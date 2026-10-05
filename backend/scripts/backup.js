import { openDb, closeDb } from '../src/db/index.js';
import { runBackup } from '../src/services/backup.js';
openDb();
console.log('Backup written to', await runBackup());
closeDb();
