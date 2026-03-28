import { execSync } from "node:child_process";

// Pages Functions deployas via Pages pipeline.
// Det här scriptet används endast för att säkerställa D1.
execSync("node scripts/provision_d1.mjs", {
  stdio: "inherit",
});
