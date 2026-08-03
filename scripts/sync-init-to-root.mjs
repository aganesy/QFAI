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
 * The mirror is checked in BOTH directions. Iterating the source list alone
 * meant a committed path under `.qfai/` with no counterpart in the assets
 * produced no drift signal, ever — and `git diff --exit-code` in `ci:gate`
 * cannot recover the missing direction, because an unmodified tracked file is
 * not a diff. That is how `.qfai/assistant/steering/` survived the v1.9.0
 * recut: its byte-identical `test-layers.md` makes `loadLayerPolicy` succeed in
 * this tree and throw in every `qfai init` project, so a consumer-only failure
 * outlived a full minor release. This tree is the only place the shipped assets
 * are exercised end to end before release; a gate that cannot see the
 * difference cannot keep it honest.
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

/**
 * Root-only paths that are legitimately not mirrored: this repository's own
 * workflow artifacts, which `qfai init` deliberately does not seed.
 * Prefix-matched against the posix-slashed path relative to `.qfai/`.
 */
const RUNTIME_ONLY_PREFIXES = [
  "specs/",
  "contracts/",
  "evidence/",
  "discussion/",
  "prototypes/",
  "report/",
  "output/",
  "review/",
  "decisions/",
  "steering/",
  "review_archive/",
  "discussion_archive/",
  "assistant/process/migrations/",
];

/** Exact paths relative to `.qfai/`. */
const RUNTIME_ONLY_FILES = new Set(["state.json", "README.md"]);

/** Basenames that are placeholders anywhere in the tree. */
const RUNTIME_ONLY_BASENAMES = new Set([".gitkeep"]);

/**
 * Stale paths this repository knows about and has not removed yet, each with
 * the issue that removes it. They are reported on every run — the point is that
 * they stop being invisible — but they do not fail the gate, because removing
 * one is a separate change with its own review.
 *
 * A stale path NOT on this list fails, so the residue cannot grow.
 */
const KNOWN_STALE = new Map([
  [
    "assistant/steering/",
    "legacy pre-recut assistant layout; removal is #212, and " +
      "scripts/check-review-profile-consistency.mjs still reads it (#387)",
  ],
]);

function isRuntimeOnly(rel) {
  if (RUNTIME_ONLY_FILES.has(rel)) return true;
  if (RUNTIME_ONLY_BASENAMES.has(rel.slice(rel.lastIndexOf("/") + 1))) return true;
  return RUNTIME_ONLY_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function knownStaleReason(rel) {
  for (const [key, reason] of KNOWN_STALE) {
    if (rel === key || rel.startsWith(key)) return reason;
  }
  return null;
}

/** Windows `readdir` yields backslashes; every path here is compared as posix. */
function toPosix(rel) {
  return rel.split("\\").join("/");
}

/**
 * Files present under `.qfai/` with no counterpart in the init assets, minus
 * the runtime-only allow-list.
 */
function collectStale(initFiles) {
  const sourceSet = new Set(initFiles.map(toPosix));
  return collectFiles(TARGET_QFAI)
    .map(toPosix)
    .filter((rel) => !sourceSet.has(rel) && !isRuntimeOnly(rel))
    .sort();
}

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
  // The other direction: committed paths the assets no longer ship.
  for (const rel of collectStale(initFiles)) {
    const reason = knownStaleReason(rel);
    if (reason) {
      console.error(`KNOWN-STALE: .qfai/${rel} — ${reason}`);
      continue;
    }
    console.error(
      `STALE: .qfai/${rel} — no counterpart in packages/qfai/assets/init/.qfai/. ` +
        `Delete it, add it to the init assets, or allow-list it in sync-init-to-root.mjs.`,
    );
    driftCount++;
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

// Sync mode never deletes — a root-only path may be a runtime artifact — but it
// reports, so the residue is visible without waiting for CI.
for (const rel of collectStale(initFiles)) {
  const reason = knownStaleReason(rel);
  console.warn(
    reason
      ? `KNOWN-STALE: .qfai/${rel} — ${reason}`
      : `STALE: .qfai/${rel} — no counterpart in the init assets.`,
  );
}

console.log(`Synced ${initFiles.length} files from init assets to root.`);
