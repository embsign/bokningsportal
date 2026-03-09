import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const {
  API_BASE,
  CF_PAGES_BRANCH,
  CF_PAGES_PULL_REQUEST_ID,
  GITHUB_REF_NAME,
  GITHUB_HEAD_REF,
  PR_NUMBER,
  PULL_REQUEST_NUMBER,
  WORKER_BASE_DOMAIN,
  WORKER_NAME_PREFIX,
} = process.env;

const DEFAULT_WORKER_BASE_DOMAIN = "embsign.workers.dev";
const workerPrefix = WORKER_NAME_PREFIX || "bokningsportal";
const workerBaseDomain = WORKER_BASE_DOMAIN || DEFAULT_WORKER_BASE_DOMAIN;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const injectScriptPath = path.resolve(scriptDir, "inject_api_base.mjs");

const normalizeBranchSuffix = (branch) =>
  (branch || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/g, "");

const getPrNumber = () => {
  const explicit = CF_PAGES_PULL_REQUEST_ID || PULL_REQUEST_NUMBER || PR_NUMBER;
  if (explicit && /^\d+$/.test(explicit)) {
    return explicit;
  }

  const candidates = [CF_PAGES_BRANCH, GITHUB_HEAD_REF, GITHUB_REF_NAME].filter(Boolean);
  for (const branch of candidates) {
    const match =
      /^pr-(\d+)$/i.exec(branch) ||
      /^pull\/(\d+)\/merge$/i.exec(branch) ||
      /^refs\/pull\/(\d+)\/merge$/i.exec(branch);
    if (match) {
      return match[1];
    }
  }
  return "";
};

const buildProductionApiBase = () => `https://${workerPrefix}.${workerBaseDomain}/api`;

const checkApiBaseReachable = async (apiBase) => {
  try {
    const response = await fetch(`${apiBase}/session`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    return response.status !== 404;
  } catch {
    return false;
  }
};

const buildApiBase = async () => {
  if (API_BASE) {
    return API_BASE;
  }

  if (!WORKER_BASE_DOMAIN) {
    console.warn(
      `WORKER_BASE_DOMAIN saknas, använder default: ${DEFAULT_WORKER_BASE_DOMAIN}.`
    );
  }

  const productionApiBase = buildProductionApiBase();
  const branch = CF_PAGES_BRANCH || GITHUB_HEAD_REF || GITHUB_REF_NAME || "";
  if (branch === "main" || branch === "master") {
    return productionApiBase;
  }

  const branchSuffix = normalizeBranchSuffix(branch);
  if (branchSuffix) {
    const previewApiBase = `https://${workerPrefix}-${branchSuffix}.${workerBaseDomain}/api`;
    const previewReachable = await checkApiBaseReachable(previewApiBase);
    if (previewReachable) {
      return previewApiBase;
    }
    console.warn(`Preview worker saknas (${previewApiBase}), fallback till production worker.`);
    return productionApiBase;
  }

  const prNumber = getPrNumber();
  if (prNumber) {
    const previewApiBase = `https://${workerPrefix}-pr-${prNumber}.${workerBaseDomain}/api`;
    const previewReachable = await checkApiBaseReachable(previewApiBase);
    if (previewReachable) {
      return previewApiBase;
    }
    console.warn(`Preview worker saknas (${previewApiBase}), fallback till production worker.`);
    return productionApiBase;
  }

  return productionApiBase;
};

const apiBase = await buildApiBase();
execFileSync(process.execPath, [injectScriptPath], {
  stdio: "inherit",
  env: { ...process.env, API_BASE: apiBase },
});
