import { execSync } from "node:child_process";
import fs from "node:fs";

const deployEnv = process.env.DEPLOY_ENV || "preview";
const explicitPr = process.env.PR_NUMBER;
const dryRun = process.env.DRY_RUN === "1";
const generatedConfigPath = process.env.WRANGLER_PAGES_CONFIG || "wrangler.pages.generated.toml";

const normalizeBranchSuffix = (branch) =>
  (branch || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/g, "");

const getBranchName = () => {
  const keys = [
    "CF_PAGES_BRANCH",
    "WORKERS_CI_BRANCH",
    "CF_BRANCH",
    "GITHUB_HEAD_REF",
    "GITHUB_REF_NAME",
    "GIT_BRANCH",
    "BRANCH",
    "CI_COMMIT_REF_NAME",
  ];
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key];
    }
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
  const match = /^pr-(\d+)$/i.exec(branchName || "");
  return match?.[1] || "";
};

const runWrangler = (command) => {
  try {
    return execSync(command, { stdio: ["pipe", "pipe", "pipe"] }).toString();
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : "";
    const stderr = error.stderr ? error.stderr.toString() : "";
    throw new Error(stdout + stderr || `Command failed: ${command}`);
  }
};

const parseUuidFromOutput = (text) => {
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
};

const writeGeneratedConfig = (dbName, databaseId) => {
  const content = `
name = "bokningsportal"
compatibility_date = "2024-11-01"
pages_build_output_dir = "frontend"

[[d1_databases]]
binding = "DB"
database_name = "${dbName}"
database_id = "${databaseId}"
`.trimStart();
  fs.writeFileSync(generatedConfigPath, content);
};

const ensureColumnExists = (dbName, columnName, alterSql) => {
  const schemaRowsRaw = runWrangler(
    `npx wrangler d1 execute ${dbName} --config ${generatedConfigPath} --remote --json --command "PRAGMA table_info(booking_objects);"`
  );
  const parsed = JSON.parse(schemaRowsRaw);
  const schemaRows = Array.isArray(parsed) && parsed[0]?.results ? parsed[0].results : [];
  const hasColumn = schemaRows.some((row) => row?.name === columnName);
  if (!hasColumn) {
    execSync(
      `npx wrangler d1 execute ${dbName} --config ${generatedConfigPath} --remote --command "${alterSql}"`,
      { stdio: "inherit" }
    );
  }
};

const applyMigrations = (dbName) => {
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

  execSync(`npx wrangler d1 migrations apply ${dbName} --config ${generatedConfigPath} --remote`, {
    stdio: "inherit",
  });

  ensureColumnExists(
    dbName,
    "full_day_start_time",
    "ALTER TABLE booking_objects ADD COLUMN full_day_start_time TEXT NOT NULL DEFAULT '12:00';"
  );
  ensureColumnExists(
    dbName,
    "full_day_end_time",
    "ALTER TABLE booking_objects ADD COLUMN full_day_end_time TEXT NOT NULL DEFAULT '12:00';"
  );
  ensureColumnExists(
    dbName,
    "time_slot_start_time",
    "ALTER TABLE booking_objects ADD COLUMN time_slot_start_time TEXT NOT NULL DEFAULT '08:00';"
  );
  ensureColumnExists(
    dbName,
    "time_slot_end_time",
    "ALTER TABLE booking_objects ADD COLUMN time_slot_end_time TEXT NOT NULL DEFAULT '20:00';"
  );

  for (const file of fs.readdirSync(migrationsTarget)) {
    if (file.endsWith(".sql")) {
      fs.unlinkSync(`${migrationsTarget}/${file}`);
    }
  }
};

const branchName = getBranchName();
const prNumber = getPrNumber(branchName);
const branchSuffix = normalizeBranchSuffix(branchName);

if (deployEnv === "preview" && !prNumber && !branchSuffix) {
  console.error("Preview provisioning requires PR number or branch name.");
  process.exit(1);
}

const previewSuffix = prNumber ? `pr-${prNumber}` : branchSuffix;
const dbName = deployEnv === "production" ? "booking-prod" : `booking-${previewSuffix}`;

if (dryRun) {
  const mockId = "00000000-0000-0000-0000-000000000000";
  writeGeneratedConfig(dbName, mockId);
  console.log(`[dry-run] generated ${generatedConfigPath} for ${dbName}`);
  process.exit(0);
}

let databases;
try {
  databases = JSON.parse(runWrangler("npx wrangler d1 list --json"));
} catch {
  databases = [];
}

const existing = databases.find((db) => db.name === dbName);
let databaseId = existing?.uuid;
if (!databaseId) {
  try {
    const created = JSON.parse(runWrangler(`npx wrangler d1 create ${dbName} --json`));
    databaseId = created?.uuid;
  } catch {
    const output = runWrangler(`npx wrangler d1 create ${dbName}`);
    databaseId = parseUuidFromOutput(output);
  }
}

if (!databaseId) {
  console.error(`Could not determine database id for ${dbName}.`);
  process.exit(1);
}

writeGeneratedConfig(dbName, databaseId);
applyMigrations(dbName);
execSync(`npx wrangler d1 execute ${dbName} --file db/seed.sql --config ${generatedConfigPath} --remote`, {
  stdio: "inherit",
});

console.log(`Provisioned ${dbName} (${databaseId})`);
