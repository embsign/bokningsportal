import { execSync } from "node:child_process";

const dbName = process.env.DB_NAME;
const config = process.env.WRANGLER_CONFIG || "wrangler.generated.toml";

if (!dbName) {
  console.error("DB_NAME is required.");
  process.exit(1);
}

execSync(`wrangler d1 migrations apply ${dbName} --config ${config} --remote`, { stdio: "inherit" });
