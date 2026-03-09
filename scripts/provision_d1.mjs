import { execSync } from "node:child_process";
import fs from "node:fs";

const explicitEnv = process.env.DEPLOY_ENV;
const explicitPr = process.env.PR_NUMBER;
const printEnv = process.env.PRINT_ENV === "1";

if (printEnv) {
  console.log("Available env vars:");
  Object.keys(process.env)
    .sort()
    .forEach((key) => console.log(key));
}

const getBranchName = () => {
  const keys = [
    "CF_PAGES_BRANCH",
    "GITHUB_REF_NAME",
    "GITHUB_HEAD_REF",
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
const env =
  explicitEnv ||
  (branchName === "main" || branchName === "master" ? "production" : prNumber ? "preview" : "production");

if (env === "preview" && (!prNumber || !/^\d+$/.test(prNumber))) {
  console.error("Preview deploy requires PR number. Set PR_NUMBER or use branch name pr-123.");
  process.exit(1);
}

const dbName = env === "production" ? "booking-prod" : `booking-pr-${prNumber}`;
const workerName = env === "production" ? "booking-api" : `booking-api-pr-${prNumber}`;

const list = JSON.parse(execSync("npx wrangler d1 list --json", { stdio: ["pipe", "pipe", "inherit"] }).toString());
const existing = list.find((db) => db.name === dbName);

let databaseId = existing?.uuid;
if (!databaseId) {
  const created = JSON.parse(
    execSync(`npx wrangler d1 create ${dbName} --json`, { stdio: ["pipe", "pipe", "inherit"] }).toString()
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

execSync(`npx wrangler d1 migrations apply ${dbName} --config wrangler.generated.toml --remote`, {
  stdio: "inherit",
});
execSync(`npx wrangler d1 execute ${dbName} --file db/seed.sql --config wrangler.generated.toml --remote`, {
  stdio: "inherit",
});

console.log(`Provisioned ${dbName} (${databaseId})`);
