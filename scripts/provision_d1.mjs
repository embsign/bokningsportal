import { execSync } from "node:child_process";
import fs from "node:fs";

const env = process.env.DEPLOY_ENV || "preview";
const prNumber = process.env.PR_NUMBER;
const printEnv = process.env.PRINT_ENV === "1";

if (printEnv) {
  console.log("Available env vars:");
  Object.keys(process.env)
    .sort()
    .forEach((key) => console.log(key));
}

if (env === "preview" && (!prNumber || !/^\d+$/.test(prNumber))) {
  console.error("PR_NUMBER must be provided for preview deployments.");
  process.exit(1);
}

const dbName = env === "production" ? "booking-prod" : `booking-pr-${prNumber}`;
const workerName = env === "production" ? "booking-api" : `booking-api-pr-${prNumber}`;

const list = JSON.parse(execSync("wrangler d1 list --json", { stdio: ["pipe", "pipe", "inherit"] }).toString());
const existing = list.find((db) => db.name === dbName);

let databaseId = existing?.uuid;
if (!databaseId) {
  const created = JSON.parse(
    execSync(`wrangler d1 create ${dbName} --json`, { stdio: ["pipe", "pipe", "inherit"] }).toString()
  );
  databaseId = created?.uuid;
}

if (!databaseId) {
  console.error("Could not determine database id for", dbName);
  process.exit(1);
}

const config = `
name = "${workerName}"
main = "backend/src/worker.ts"
compatibility_date = "2024-11-01"

[[d1_databases]]
binding = "DB"
database_name = "${dbName}"
database_id = "${databaseId}"
`;

fs.writeFileSync("wrangler.generated.toml", config.trim() + "\n");

execSync(`wrangler d1 migrations apply ${dbName} --config wrangler.generated.toml --remote`, {
  stdio: "inherit",
});
execSync(`wrangler d1 execute ${dbName} --file db/seed.sql --config wrangler.generated.toml --remote`, {
  stdio: "inherit",
});

console.log(`Provisioned ${dbName} (${databaseId})`);
