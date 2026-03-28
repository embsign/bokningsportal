import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { API_BASE } = process.env;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const injectScriptPath = path.resolve(scriptDir, "inject_api_base.mjs");

const buildApiBase = () => {
  return API_BASE || "/api";
};

const apiBase = buildApiBase();
execFileSync(process.execPath, [injectScriptPath], {
  stdio: "inherit",
  env: { ...process.env, API_BASE: apiBase },
});
