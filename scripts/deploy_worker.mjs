import { execSync } from "node:child_process";

execSync("node scripts/provision_d1.mjs", { stdio: "inherit" });
execSync("wrangler deploy --config wrangler.generated.toml", { stdio: "inherit" });
