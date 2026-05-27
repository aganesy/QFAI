#!/usr/bin/env node
/**
 * Scanner module statement-coverage gate.
 *
 * Reads `packages/qfai/coverage/coverage-summary.json` (produced by
 * `vitest run --coverage` via the qfai package's `test:coverage`
 * script) and asserts that statement coverage on the scanner module
 * `packages/qfai/src/core/prototyping/designMdViolations.ts` is at
 * least 90%.
 *
 * The 90% floor exists because the scanner's correctness directly
 * gates prototyping convergence: a regression that drops scanner
 * coverage well below 90% almost certainly means a new code path
 * shipped without unit-test backing, which is the failure mode this
 * lane guards against. Paired with the in-process test-count floor
 * (>= 30 unit tests on the scanner suite), the two gates together
 * pin both the breadth (test count) and depth (statement coverage)
 * of the scanner test surface.
 *
 * Exit codes:
 *   0  pass — statement coverage >= 90%
 *   1  fail — statement coverage < 90%, or the scanner entry / the
 *      coverage-summary.json file is missing
 *   2  invalid invocation — unknown flag
 *
 * Flags:
 *   --summary <path>   Override the coverage-summary.json path
 *                      (default: packages/qfai/coverage/coverage-summary.json
 *                      relative to the repo root). Used by tests to
 *                      inject synthetic fixtures.
 *   --threshold <pct>  Override the 90% floor (default: 90). Reserved
 *                      for future use; the CI lane should always run
 *                      with the default.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// scripts/ → repo root
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_SUMMARY = path.join(REPO_ROOT, "packages/qfai/coverage/coverage-summary.json");
const DEFAULT_THRESHOLD = 90;
// The matcher locates the scanner entry by its trailing path so the
// same coverage-summary works on Windows (`C:\...\packages\qfai\...`),
// macOS (`/Users/.../packages/qfai/...`), and Linux CI runners
// (`/home/runner/work/QFAI/QFAI/packages/qfai/...`).
const SCANNER_TAIL = path.posix.join(
  "packages",
  "qfai",
  "src",
  "core",
  "prototyping",
  "designMdViolations.ts",
);

function parseArgs(argv) {
  const args = { summary: DEFAULT_SUMMARY, threshold: DEFAULT_THRESHOLD };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--summary") {
      const value = argv[++i];
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("--summary requires a non-empty path argument");
      }
      args.summary = value;
    } else if (flag === "--threshold") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        // Fail-fast: a CLI typo like `--threshold foo` would otherwise
        // become NaN, silently turning the guard into a no-op.
        throw new Error(`--threshold requires a finite number in [0, 100]; received: ${raw}`);
      }
      args.threshold = parsed;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }
  }
  return args;
}

function normalizeKey(key) {
  // coverage-v8 emits OS-native absolute paths. Normalize separators
  // so the tail-match works regardless of platform.
  return key.replace(/\\/g, "/");
}

function findScannerEntry(summary) {
  for (const key of Object.keys(summary)) {
    if (key === "total") continue;
    if (normalizeKey(key).endsWith(SCANNER_TAIL)) {
      return { key, entry: summary[key] };
    }
  }
  return null;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.stderr.write(
      "usage: check-scanner-coverage.mjs [--summary <path>] [--threshold <pct>]\n",
    );
    process.exit(2);
  }

  if (!existsSync(args.summary)) {
    process.stderr.write(
      `coverage-summary not found at: ${args.summary}\n` +
        "  Run `pnpm -C packages/qfai test:coverage` to generate it.\n",
    );
    process.exit(1);
  }

  let summary;
  try {
    summary = JSON.parse(readFileSync(args.summary, "utf-8"));
  } catch (err) {
    process.stderr.write(`coverage-summary parse error at ${args.summary}: ${err.message}\n`);
    process.exit(1);
  }

  const found = findScannerEntry(summary);
  if (!found) {
    process.stderr.write(
      `designMdViolations.ts entry not found in coverage-summary ` +
        `(${args.summary}).\n` +
        "  Confirm the coverage run included the scanner module.\n",
    );
    process.exit(1);
  }

  const stmtPct = found.entry?.statements?.pct;
  if (typeof stmtPct !== "number") {
    process.stderr.write(
      `designMdViolations.ts: statements.pct is not a number ` +
        `(got ${JSON.stringify(stmtPct)}).\n`,
    );
    process.exit(1);
  }

  if (stmtPct < args.threshold) {
    process.stderr.write(
      `[scanner-coverage] FAIL — designMdViolations.ts statement coverage ` +
        `is ${stmtPct}%, below the ${args.threshold}% floor.\n` +
        "  Add unit tests under `packages/qfai/tests/unit/core/prototyping/scanners/`.\n",
    );
    process.exit(1);
  }

  process.stdout.write(
    `[scanner-coverage] OK — designMdViolations.ts statement coverage ` +
      `is ${stmtPct}% (>= ${args.threshold}%).\n`,
  );
  process.exit(0);
}

main();
