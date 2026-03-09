import { execSync } from "node:child_process";

const branch =
  process.env.WORKERS_CI_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  "";
const deployEnv = process.env.DEPLOY_ENV || (branch === "main" || branch === "master" ? "production" : "preview");

execSync("node scripts/provision_d1.mjs", {
  stdio: "inherit",
  env: { ...process.env, DEPLOY_ENV: deployEnv },
});
execSync("npx wrangler deploy --config wrangler.generated.toml", { stdio: "inherit" });
