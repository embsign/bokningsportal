#!/usr/bin/env node
/**
 * Bundlar db/*.sql till TypeScript-strängar så Pages Functions / Wrangler 3
 * kan bygga utan .sql-loader (esbuild klarar bara JS/TS).
 * Kör efter ändringar i nämnda migrationsfiler eller seed.
 *
 *   node scripts/bundle_sql_for_worker.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const bundles = [
  ["migration001", "db/migrations/001_initial_schema.sql"],
  ["migration002", "db/migrations/002_indexes.sql"],
  ["migration005", "db/migrations/005_app_config.sql"],
  ["migration007", "db/migrations/007_booking_screens.sql"],
  ["seedSql", "db/seed.sql"],
];

let header = `// GENERATED FILE – ändra inte manuellt. Kör: node scripts/bundle_sql_for_worker.mjs\n\n`;

const parts = [header];
for (const [name, rel] of bundles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error("Saknas:", full);
    process.exit(1);
  }
  const content = fs.readFileSync(full, "utf8");
  parts.push(`export const ${name} = ${JSON.stringify(content)};\n\n`);
}

const outPath = path.join(root, "backend/src/worker/db/sqlBundles.generated.ts");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, parts.join(""));
console.log("Wrote", outPath);
