import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiBase = process.env.API_BASE;
if (!apiBase) {
  console.error("API_BASE is required.");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const filePath = path.resolve(repoRoot, "frontend/index.html");
const html = fs.readFileSync(filePath, "utf-8");
const metaTagPattern = /<meta\s+[^>]*name=["']api-base["'][^>]*>/i;
const normalizedMetaTag = `<meta name="api-base" content="${apiBase}" />`;

let updated = html;
if (metaTagPattern.test(html)) {
  updated = html.replace(metaTagPattern, normalizedMetaTag);
} else if (/<\/head>/i.test(html)) {
  updated = html.replace(/<\/head>/i, `  ${normalizedMetaTag}\n  </head>`);
} else {
  console.error(`Could not find <head> in ${filePath}.`);
  process.exit(1);
}
fs.writeFileSync(filePath, updated);
console.log(`Injected API_BASE=${apiBase}`);
