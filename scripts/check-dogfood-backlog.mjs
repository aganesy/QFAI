#!/usr/bin/env node
/* global console, process */
/**
 * Run one validation profile against this repository and hold its findings to
 * a ratchet.
 *
 * The dogfooding lanes exist so QFAI meets its own gates before shipping them.
 * The story-tree migration makes test obligations explicit at the BF, AC and
 * EX layers. Historical artifacts have gaps that predate these checks, and a
 * few existing tests are intentionally skipped. The first story-tree pin
 * records those findings by file without inventing test annotations or proof.
 *
 * Fixing them means adding the required tests and recording what they prove.
 * Until that backfill lands, two contracts keep each lane meaningful:
 *
 * | Contract     | Holds                                                                  |
 * | ------------ | ---------------------------------------------------------------------- |
 * | Held at zero | A file absent from the profile's pin may report no error at all        |
 * | Ratchet      | A pinned file may report each finding no more often than it is pinned  |
 *
 * The pin holds each file's findings by identity, not by count: a finding's key
 * is its code and the IDs it names. A count alone let a change clear one
 * finding and add a different one in the same file and still pass, so an
 * untested example could hide behind a test written for another.
 *
 * A new gate failure in a clean file fails immediately, and one in a file
 * already carrying debt fails as soon as it is a finding that file's pin does
 * not hold. Neither
 * can be cleared by a waiver: `QFAI-WAIVER-002` refuses a waiver whose rule is
 * an error, which is what makes the backfill the only route out.
 *
 * A file that improves is re-pinned in the same change, and a finding or a
 * file that reaches zero is struck from the list rather than left at `0`, so
 * the slot cannot be taken by the next regression. `--pin` rewrites the profile's entry from a
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
// Written as one relative path rather than joined segment by segment, so a
// reader and a grep can both see which binary the lanes run: the local build
// under review, never a resolution that would reach the published release.
const CLI = path.join(repoRoot, "packages/qfai/dist/cli/index.mjs");
const REPORT = path.join(repoRoot, ".qfai", "report", "validate.json");

/**
 * What makes one finding the same finding on the next run: its code and the
 * IDs it names. The message stands in only for a finding that names none.
 */
export function findingKey(issue) {
  const refs = Array.isArray(issue.refs) ? issue.refs.filter((ref) => ref !== "") : [];
  const subject = refs.length > 0 ? refs.join(",") : String(issue.message ?? "");
  return `${String(issue.code ?? "(no code)")} ${subject}`;
}

/**
 * The three ways a run can disagree with its pin.
 *
 * Separated from the run so the contract is testable without one: reaching it
 * through a real profile would test the repository's current backlog rather
 * than the rule. `found` maps each file to its findings' keys and counts, and
 * `pinned` holds the same shape as an object.
 *
 * - `unpinned`: `[file, total]` for a file the pin does not name;
 * - `over`: `[file, key, count, pinnedCount]` for a finding past its pin,
 *   `pinnedCount` `0` for one the file's pin does not hold;
 * - `improved`: `[file, key, pinnedCount, count]` for a pinned finding the run
 *   reports less often, `count` `0` where it is gone.
 */
export function compareAgainstPin(found, pinned) {
  const unpinned = [];
  const over = [];
  for (const [file, keys] of found) {
    if (!(file in pinned)) {
      unpinned.push([file, [...keys.values()].reduce((sum, n) => sum + n, 0)]);
      continue;
    }
    const held = pinned[file];
    for (const [key, n] of keys) {
      const allowed = held[key] ?? 0;
      if (n > allowed) over.push([file, key, n, allowed]);
    }
  }
  const improved = [];
  for (const [file, held] of Object.entries(pinned)) {
    for (const [key, allowed] of Object.entries(held)) {
      const n = found.get(file)?.get(key) ?? 0;
      if (n < allowed) improved.push([file, key, allowed, n]);
    }
  }
  return { unpinned, over, improved };
}

/** Every error in a validate report, by the file it names and then by its key. */
export function errorsByFile(report) {
  const found = new Map();
  for (const issue of report.issues ?? []) {
    if (issue.severity !== "error") continue;
    const file = issue.file ?? "(no file)";
    const keys = found.get(file) ?? new Map();
    const key = findingKey(issue);
    keys.set(key, (keys.get(key) ?? 0) + 1);
    found.set(file, keys);
  }
  return found;
}

/**
 * The files whose pin is still a bare count. A count cannot say which finding
 * it holds, so such an entry is re-pinned rather than read.
 */
export function countPinnedFiles(pinned) {
  return Object.entries(pinned)
    .filter(([, held]) => typeof held !== "object" || held === null || Array.isArray(held))
    .map(([file]) => file);
}

/** The pin entry `--pin` writes: files and keys in a stable order. */
export function pinEntry(found) {
  return Object.fromEntries(
    [...found]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, keys]) => [
        file,
        Object.fromEntries([...keys].sort(([a], [b]) => a.localeCompare(b))),
      ]),
  );
}

/** Name the findings behind a changed file count when annotations are capped. */
export function errorsForFile(report, file) {
  return (report.issues ?? [])
    .filter((issue) => issue.severity === "error" && (issue.file ?? "(no file)") === file)
    .map(({ code, message }) => ({ code, message }));
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
  const found = errorsByFile(report);
  const total = [...found.values()].reduce(
    (sum, keys) => sum + [...keys.values()].reduce((inner, n) => inner + n, 0),
    0,
  );
  const pin = JSON.parse(readFileSync(PIN_PATH, "utf-8"));

  if (process.argv.includes("--pin")) {
    pin.profiles[profile] = pinEntry(found);
    writeFileSync(PIN_PATH, `${JSON.stringify(pin, null, 2)}\n`, "utf-8");
    console.log(
      `check-dogfood-backlog: pinned ${profile} at ${String(total)} error(s) across ${String(found.size)} file(s).`,
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

  const counted = countPinnedFiles(pinned);
  if (counted.length > 0) {
    console.error(
      `check-dogfood-backlog: the ${profile} pin holds ${String(counted.length)} file(s) as a bare count, ` +
        "which cannot say which finding it holds. Re-pin the profile:\n\n" +
        `  node scripts/check-dogfood-backlog.mjs --profile ${profile} --pin`,
    );
    process.exit(1);
  }

  const { unpinned, over, improved } = compareAgainstPin(found, pinned);

  for (const [file, n] of unpinned) {
    console.error(
      `check-dogfood-backlog: ${file} is held at zero for ${profile} but reports ${String(n)} error(s).`,
    );
    for (const { code, message } of errorsForFile(report, file)) {
      console.error(`  ${String(code)}: ${String(message)}`);
    }
  }
  for (const [file, key, n, allowed] of over) {
    console.error(
      `check-dogfood-backlog: ${file} reports ${key} ${String(n)} time(s) for ${profile}, past its pinned ${String(allowed)}.`,
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
    for (const [file, key, allowed, n] of improved) {
      console.error(`  ${file}: ${key}: ${String(allowed)} -> ${String(n)}`);
    }
    console.error(`\n  node scripts/check-dogfood-backlog.mjs --profile ${profile} --pin`);
    process.exit(1);
  }

  console.log(
    `check-dogfood-backlog: ${profile} reports ${String(total)} error(s) across ${String(found.size)} file(s), all within the pinned backlog.`,
  );
}

// Importing this file reads its rules; running it runs a profile.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
