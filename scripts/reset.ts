// Delete the local database so it is rebuilt (with demo data in demo mode):  npm run db:reset
import { rmSync } from "node:fs";

for (const f of ["data/local.db", "data/local.db-shm", "data/local.db-wal"]) {
  rmSync(f, { force: true });
}
console.log("Local database removed. It will be recreated on next start.");
