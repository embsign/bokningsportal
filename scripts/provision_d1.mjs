import { execSync } from "node:child_process";
import fs from "node:fs";

const explicitEnv = process.env.DEPLOY_ENV;
const explicitPr = process.env.PR_NUMBER;
const workerPrefix = process.env.WORKER_NAME_PREFIX || "bokningsportal";
const printEnv = process.env.PRINT_ENV === "1";
const isWorkersCi = process.env.WORKERS_CI === "1";
const d1LocationHint = process.env.D1_LOCATION_HINT || "weur";

const normalizeBranchSuffix = (branch) =>
  (branch || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/g, "");

if (printEnv) {
  console.log("Available env vars:");
  Object.keys(process.env)
    .sort()
    .forEach((key) => console.log(key));
}

const getBranchName = () => {
  const keys = [
    "WORKERS_CI_BRANCH",
    "CF_PAGES_BRANCH",
    "CF_BRANCH",
    "GITHUB_HEAD_REF",
    "GITHUB_REF_NAME",
    "GIT_BRANCH",
    "BRANCH",
    "CI_COMMIT_REF_NAME",
    "BITBUCKET_BRANCH",
    "VERCEL_GIT_COMMIT_REF",
  ];
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
};

const getPrNumber = (branchName) => {
  if (explicitPr && /^\d+$/.test(explicitPr)) {
    return explicitPr;
  }
  const keys = ["PR_NUMBER", "PULL_REQUEST_NUMBER", "CF_PAGES_PULL_REQUEST_ID"];
  for (const key of keys) {
    const value = process.env[key];
    if (value && /^\d+$/.test(value)) {
      return value;
    }
  }
  const match = /^pr-(\d+)$/.exec(branchName || "");
  return match?.[1] || "";
};

const branchName = getBranchName();
const prNumber = getPrNumber(branchName);
const branchSuffix = normalizeBranchSuffix(branchName);

if (isWorkersCi && !explicitEnv && !branchName && !prNumber) {
  console.error("Workers CI utan branch-info. Vägrar implicit production deploy.");
  process.exit(1);
}

const env = explicitEnv || (branchName === "main" || branchName === "master" ? "production" : "preview");

if (env === "preview" && !branchSuffix && (!prNumber || !/^\d+$/.test(prNumber))) {
  console.error("Preview deploy requires branch name or PR number.");
  process.exit(1);
}

const previewSuffix = branchSuffix || `pr-${prNumber}`;
const dbName = env === "production" ? "booking-prod" : `booking-${previewSuffix}`;
const workerName =
  isWorkersCi || env === "production" ? workerPrefix : `${previewSuffix}-${workerPrefix}`;

const runWrangler = (command) => {
  try {
    return execSync(command, { stdio: ["pipe", "pipe", "pipe"] }).toString();
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : "";
    const stderr = error.stderr ? error.stderr.toString() : "";
    const message = stdout + stderr;
    throw new Error(message || `Command failed: ${command}`);
  }
};

const parseUuidFromOutput = (text) => {
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
};

const buildD1CreateCommand = (dbName, asJson = false) =>
  `npx wrangler d1 create ${dbName} --location ${d1LocationHint}${asJson ? " --json" : ""}`;

const listD1Databases = () => {
  try {
    const json = runWrangler("npx wrangler d1 list --json");
    return JSON.parse(json);
  } catch {
    const output = runWrangler("npx wrangler d1 list");
    const lines = output.split("\n").filter(Boolean);
    return lines
      .map((line) => {
        const uuid = parseUuidFromOutput(line);
        if (!uuid) return null;
        return { name: line.split(/\s+/)[0], uuid };
      })
      .filter(Boolean);
  }
};

const list = listD1Databases();
const existing = list.find((db) => db.name === dbName);

let databaseId = existing?.uuid;
if (!databaseId) {
  try {
    const created = JSON.parse(runWrangler(buildD1CreateCommand(dbName, true)));
    databaseId = created?.uuid;
  } catch {
    const output = runWrangler(buildD1CreateCommand(dbName));
    databaseId = parseUuidFromOutput(output);
  }
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

const ensureFullDayColumns = () => {
  const schemaRowsRaw = runWrangler(
    `npx wrangler d1 execute ${dbName} --config wrangler.generated.toml --remote --json --command "PRAGMA table_info(booking_objects);"`
  );
  let schemaRows;
  try {
    const parsed = JSON.parse(schemaRowsRaw);
    schemaRows = Array.isArray(parsed) && parsed[0]?.results ? parsed[0].results : [];
  } catch {
    throw new Error("Could not parse schema response when validating booking_objects columns.");
  }

  const hasStart = schemaRows.some((row) => row?.name === "full_day_start_time");
  const hasEnd = schemaRows.some((row) => row?.name === "full_day_end_time");

  if (!hasStart) {
    execSync(
      `npx wrangler d1 execute ${dbName} --config wrangler.generated.toml --remote --command "ALTER TABLE booking_objects ADD COLUMN full_day_start_time TEXT NOT NULL DEFAULT '12:00';"`,
      { stdio: "inherit" }
    );
  }
  if (!hasEnd) {
    execSync(
      `npx wrangler d1 execute ${dbName} --config wrangler.generated.toml --remote --command "ALTER TABLE booking_objects ADD COLUMN full_day_end_time TEXT NOT NULL DEFAULT '12:00';"`,
      { stdio: "inherit" }
    );
  }
};

const migrationsSource = "db/migrations";
const migrationsTarget = "migrations";
if (!fs.existsSync(migrationsTarget)) {
  fs.mkdirSync(migrationsTarget, { recursive: true });
}
for (const file of fs.readdirSync(migrationsSource)) {
  if (file.endsWith(".sql")) {
    fs.copyFileSync(`${migrationsSource}/${file}`, `${migrationsTarget}/${file}`);
  }
}

execSync(`npx wrangler d1 migrations apply ${dbName} --config wrangler.generated.toml --remote`, {
  stdio: "inherit",
});
ensureFullDayColumns();

for (const file of fs.readdirSync(migrationsTarget)) {
  if (file.endsWith(".sql")) {
    fs.unlinkSync(`${migrationsTarget}/${file}`);
  }
}
execSync(`npx wrangler d1 execute ${dbName} --file db/seed.sql --config wrangler.generated.toml --remote`, {
  stdio: "inherit",
});

console.log(`Provisioned ${dbName} (${databaseId})`);
