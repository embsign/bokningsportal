import { execFileSync } from "node:child_process";

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

const workerPrefix = WORKER_NAME_PREFIX || "booking-api";

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

const buildApiBase = () => {
  if (API_BASE) {
    return API_BASE;
  }

  if (!WORKER_BASE_DOMAIN) {
    throw new Error("WORKER_BASE_DOMAIN must be set when API_BASE is not provided.");
  }

  const branch = CF_PAGES_BRANCH || GITHUB_HEAD_REF || GITHUB_REF_NAME || "";
  if (branch === "main" || branch === "master") {
    return `https://${workerPrefix}.${WORKER_BASE_DOMAIN}/api`;
  }

  const prNumber = getPrNumber();
  if (prNumber) {
    return `https://${workerPrefix}-pr-${prNumber}.${WORKER_BASE_DOMAIN}/api`;
  }

  return `https://${workerPrefix}.${WORKER_BASE_DOMAIN}/api`;
};

const apiBase = buildApiBase();
execFileSync("node", ["scripts/inject_api_base.mjs"], {
  stdio: "inherit",
  env: { ...process.env, API_BASE: apiBase },
});
