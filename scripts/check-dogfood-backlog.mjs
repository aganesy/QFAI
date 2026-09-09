#!/usr/bin/env node
/* global console, process */
/**
 * Run one validation profile against this repository and hold its findings to
 * a ratchet.
 *
 * The dogfooding lanes exist so QFAI meets its own gates before shipping them.
 * That was checked as `--fail-on error`, which worked while the ledger rules
 * reported `warning`. They report `error` now, and the repository carries a
 * backlog of rows written before those rules existed: prose in an `Evidence`
 * cell that owes a pointer, a cell past the length cap, a coverage row for a
 * test case the ledger does not own.
 *
 * Fixing those means re-running the work and recording what it produced, spec
 * by spec. Writing a pointer to evidence nobody captured would be worse than
 * the backlog. Until the backfill lands, two contracts keep each lane
 * meaningful:
 *
 * | Contract     | Holds                                                           |
 * | ------------ | --------------------------------------------------------------- |
 * | Held at zero | A file absent from the profile's pin may report no error at all |
 * | Ratchet      | A pinned file may report no more errors than its pinned count   |
 *
 * A new gate failure in a clean file fails immediately, and one in a file
 * already carrying debt fails as soon as it raises that file's count. Neither
 * can be cleared by a waiver: `QFAI-WAIVER-002` refuses a waiver whose rule is
 * an error, which is what makes the backfill the only route out.
 *
 * A file that improves is re-pinned in the same change, and one that reaches
 * zero is struck from the list rather than left at `0`, so the slot cannot be
 * taken by the next regression. `--pin` rewrites the profile's entry from a
 * live run.
 *
 * Findings print as GitHub annotations, so each lane's output is unchanged
 * from the raw `validate` call this replaces.
 *
 * Usage: `node scripts/check-dogfood-backlog.mjs --profile <name> [--pin]`
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PIN_PATH = path.join(repoRoot, "scripts", "dogfood-backlog.json");
const CLI = path.join(repoRoot, "packages", "qfai", "dist", "cli", "index.mjs");
const REPORT = path.join(repoRoot, ".qfai", "report", "validate.json");

/**
 * The three ways a run can disagree with its pin.
 *
 * Separated from the run so the contract is testable without one: reaching it
 * through a real profile would test the repository's current backlog rather
 * than the rule. `counts` and `pinned` are both file to error count.
 */
export function compareAgainstPin(counts, pinned) {
  return {
    unpinned: [...counts].filter(([file]) => !(file in pinned)),
    over: [...counts].filter(([file, n]) => file in pinned && n > pinned[file]),
    improved: Object.entries(pinned).filter(([file, n]) => (counts.get(file) ?? 0) < n),
  };
}

/** Every error in a validate report, counted by the file it names. */
export function errorsByFile(report) {
  const counts = new Map();
  for (const issue of report.issues ?? []) {
    if (issue.severity !== "error") continue;
    const file = issue.file ?? "(no file)";
    counts.set(file, (counts.get(file) ?? 0) + 1);
  }
  return counts;
}

function fail(message) {
  console.error(`check-dogfood-backlog: ${message}`);
  process.exit(1);
}

function readProfile() {
  const at = process.argv.indexOf("--profile");
  const value = at === -1 ? "" : (process.argv[at + 1] ?? "");
  if (!/^[a-z-]+$/.test(value)) {
    fail("pass the profile to run, e.g. `--profile tdd`.");
  }
  return value;
}

/** The run itself never decides the exit code; the contracts above do. */
function runValidate(profile) {
  const args = [CLI, "validate", "--profile", profile];
  args.push("--fail-on", "never", "--format", "github", "--root", ".");
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (result.error) fail(`could not run validate: ${result.error.message}`);
  // `--fail-on never` still exits non-zero when the run could not complete,
  // which is a different failure from a finding and is not ratcheted.
  if (result.status !== 0) fail(`validate exited ${String(result.status)} before reporting.`);
}

function main() {
  const profile = readProfile();
  runValidate(profile);

  let report;
  try {
    report = JSON.parse(readFileSync(REPORT, "utf-8"));
  } catch (err) {
    fail(`could not read ${REPORT}: ${String(err)}`);
    return;
  }
  const counts = errorsByFile(report);
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const pin = JSON.parse(readFileSync(PIN_PATH, "utf-8"));

  if (process.argv.includes("--pin")) {
    pin.profiles[profile] = Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(PIN_PATH, `${JSON.stringify(pin, null, 2)}\n`, "utf-8");
    console.log(
      `check-dogfood-backlog: pinned ${profile} at ${String(total)} error(s) across ${String(counts.size)} file(s).`,
    );
    return;
  }

  const pinned = pin.profiles[profile];
  if (!pinned) {
    fail(
      `no pinned backlog for profile "${profile}". A profile with no entry is a lane nobody has ` +
        "measured; add one with `--pin` in the change that wires the lane.",
    );
    return;
  }

  const { unpinned, over, improved } = compareAgainstPin(counts, pinned);

  for (const [file, n] of unpinned) {
    console.error(
      `check-dogfood-backlog: ${file} is held at zero for ${profile} but reports ${String(n)} error(s).`,
    );
  }
  for (const [file, n] of over) {
    console.error(
      `check-dogfood-backlog: ${file} reports ${String(n)} error(s) for ${profile}, past its pinned ${String(pinned[file])}.`,
    );
  }
  if (unpinned.length > 0 || over.length > 0) {
    console.error(
      "\nA waiver cannot clear these: the rules are errors, and `QFAI-WAIVER-002` refuses a waiver on one.\n" +
        `Fix the rows the findings name, then re-pin with \`node scripts/check-dogfood-backlog.mjs --profile ${profile} --pin\`.`,
    );
    process.exit(1);
  }

  if (improved.length > 0) {
    console.error(
      `check-dogfood-backlog: the ${profile} pin is behind the tree. Re-pin these in the same change:`,
    );
    for (const [file, n] of improved) {
      console.error(`  ${file}: ${String(n)} -> ${String(counts.get(file) ?? 0)}`);
    }
    console.error(`\n  node scripts/check-dogfood-backlog.mjs --profile ${profile} --pin`);
    process.exit(1);
  }

  console.log(
    `check-dogfood-backlog: ${profile} reports ${String(total)} error(s) across ${String(counts.size)} file(s), all within the pinned backlog.`,
  );
}

// Importing this file reads its rules; running it runs a profile.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
