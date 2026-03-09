import fs from "node:fs";

const apiBase = process.env.API_BASE;
if (!apiBase) {
  console.error("API_BASE is required.");
  process.exit(1);
}

const filePath = "frontend/index.html";
const html = fs.readFileSync(filePath, "utf-8");
const updated = html.replace(
  /<meta name="api-base" content="[^"]*" \/>/,
  `<meta name="api-base" content="${apiBase}" />`
);
if (updated === html) {
  console.error(`Could not find api-base meta tag in ${filePath}.`);
  process.exit(1);
}
fs.writeFileSync(filePath, updated);
console.log(`Injected API_BASE=${apiBase}`);
