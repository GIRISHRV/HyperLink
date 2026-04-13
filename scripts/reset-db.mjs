#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    if (result.error.message.includes("ENOENT")) {
      console.error("Error: Supabase CLI not found in PATH.");
      console.error("Install it first: https://supabase.com/docs/guides/cli");
      process.exit(1);
    }

    console.error(result.error.message);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Resetting local Supabase database...");
run("supabase", ["db", "reset", "--local"]);

console.log("Local database reset complete.");
console.log("If needed, grant admin access via SQL:");
console.log("SELECT make_user_admin('your-email@example.com');");
