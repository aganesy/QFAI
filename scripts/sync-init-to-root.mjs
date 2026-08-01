#!/usr/bin/env node
/* global console, process, URL */
/**
 * sync-init-to-root.mjs
 *
 * Mirrors packages/qfai/assets/init/ → repo root.
 *   - .qfai/** from packages/qfai/assets/init/.qfai/  (byte-identical mirror)
 *   - qfai.config.yaml                                (seed only — see below)
 *
 * `qfai.config.yaml` is seeded, not mirrored. The init asset is the config a
 * *fresh* project starts from, and it deliberately leaves project-specific
 * settings unset — `validation.traceability.testFileGlobs` is empty there so a
 * non-TypeScript project cannot inherit a glob list that matches nothing and
 * silently disables the SC→test gate. The repo root copy is this repository's
 * own live configuration, which does have real TypeScript globs and must keep
 * them: the CI dogfooding step runs `validate --profile tdd --root .`, and
 * QFAI-TEST-001 (and the SC scan) no-op when `testFileGlobs` is empty.
 * Overwriting the live config from the template would therefore switch off a
 * gate this repository relies on. The file is copied only when it is missing.
 *
 * Usage:
 *   node scripts/sync-init-to-root.mjs          # sync and report
 *   node scripts/sync-init-to-root.mjs --check  # dry-run, exit 1 if drift
 */

import { existsSync, cpSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const INIT_QFAI = join(ROOT, "packages", "qfai", "assets", "init", ".qfai");
const INIT_ROOT_CFG = join(ROOT, "packages", "qfai", "assets", "init", "root", "qfai.config.yaml");
const TARGET_QFAI = join(ROOT, ".qfai");
const TARGET_CFG = join(ROOT, "qfai.config.yaml");

const CHECK_ONLY = process.argv.includes("--check");

function collectFiles(dir, base = dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, base));
    } else {
      results.push(relative(base, full));
    }
  }
  return results;
}

function filesMatch(a, b) {
  try {
    const contentA = readFileSync(a);
    const contentB = readFileSync(b);
    return contentA.equals(contentB);
  } catch {
    return false;
  }
}

// Collect all init asset files
const initFiles = collectFiles(INIT_QFAI);
let driftCount = 0;

if (CHECK_ONLY) {
  // Check mode: compare without writing
  for (const rel of initFiles) {
    const src = join(INIT_QFAI, rel);
    const dst = join(TARGET_QFAI, rel);
    if (!existsSync(dst) || !filesMatch(src, dst)) {
      console.error(`DRIFT: .qfai/${rel.replace(/\\/g, "/")}`);
      driftCount++;
    }
  }
  // Check config (seed-only: only its absence is drift, not its contents)
  if (!existsSync(TARGET_CFG)) {
    console.error("DRIFT: qfai.config.yaml (missing)");
    driftCount++;
  }
  if (driftCount > 0) {
    console.error(`\n${driftCount} file(s) drifted. Run: pnpm sync:ssot`);
    process.exit(1);
  }
  console.log("No drift detected.");
  process.exit(0);
}

// Sync mode: copy init → root
// Only overwrite files that exist in init assets (don't delete extra root-only files)
for (const rel of initFiles) {
  const src = join(INIT_QFAI, rel);
  const dst = join(TARGET_QFAI, rel);
  cpSync(src, dst, { force: true, recursive: true });
}

// Seed the root config only when absent; never overwrite the live one.
if (existsSync(INIT_ROOT_CFG) && !existsSync(TARGET_CFG)) {
  cpSync(INIT_ROOT_CFG, TARGET_CFG, { force: false });
  console.log("Seeded qfai.config.yaml from init assets.");
}

console.log(`Synced ${initFiles.length} files from init assets to root.`);
