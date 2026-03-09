import { execSync } from "node:child_process";

const normalizeBranchSuffix = (branch) =>
  (branch || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/g, "");

const branch =
  process.env.WORKERS_CI_BRANCH ||
  process.env.CF_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  "";
const deployEnv = process.env.DEPLOY_ENV || (branch === "main" || branch === "master" ? "production" : "preview");
const previewAlias = normalizeBranchSuffix(branch);

execSync("node scripts/provision_d1.mjs", {
  stdio: "inherit",
  env: { ...process.env, DEPLOY_ENV: deployEnv },
});

if (deployEnv === "production") {
  execSync("npx wrangler deploy --config wrangler.generated.toml", { stdio: "inherit" });
} else {
  if (!previewAlias) {
    throw new Error("Preview deploy kräver branch-namn för att sätta preview alias.");
  }
  execSync(
    `npx wrangler versions upload --config wrangler.generated.toml --preview-alias "${previewAlias}"`,
    { stdio: "inherit" }
  );
}
