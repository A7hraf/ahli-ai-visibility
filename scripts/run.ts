// Run one measurement from the command line:  npm run run:collect
// Reads keys from .env.local (Node 22: --env-file is applied by the npm script runner below)
import { collect } from "../lib/collector";

collect()
  .then((r) => {
    console.log(`Run ${r.runId}: ${r.total - r.failed}/${r.total} answers collected`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
