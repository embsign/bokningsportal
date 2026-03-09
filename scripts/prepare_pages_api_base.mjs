import { execFileSync } from "node:child_process";

const { API_BASE, CF_PAGES_BRANCH, WORKER_BASE_DOMAIN, WORKER_NAME_PREFIX } = process.env;

const workerPrefix = WORKER_NAME_PREFIX || "booking-api";

const buildApiBase = () => {
  if (API_BASE) {
    return API_BASE;
  }

  if (!WORKER_BASE_DOMAIN) {
    throw new Error("WORKER_BASE_DOMAIN must be set when API_BASE is not provided.");
  }

  if (CF_PAGES_BRANCH === "main") {
    return `https://${workerPrefix}.${WORKER_BASE_DOMAIN}/api`;
  }

  const match = /^pr-(\d+)$/.exec(CF_PAGES_BRANCH || "");
  if (match) {
    const prNumber = match[1];
    return `https://${workerPrefix}-pr-${prNumber}.${WORKER_BASE_DOMAIN}/api`;
  }

  return `https://${workerPrefix}.${WORKER_BASE_DOMAIN}/api`;
};

const apiBase = buildApiBase();
execFileSync("node", ["scripts/inject_api_base.mjs"], {
  stdio: "inherit",
  env: { ...process.env, API_BASE: apiBase },
});
