/* global console, process */
/**
 * Re-pin the e2e callsite count in `.qfai/evidence/atdd-spec-0017.md`.
 *
 *   node scripts/pin-stage-evidence-counts.mjs           # rewrite the line
 *   node scripts/pin-stage-evidence-counts.mjs --check    # report, write nothing
 *
 * The record states the rule this serves: a commit that changes an `it` /
 * `test` callsite under the `e2e` project's include globs owes a
 * re-measurement. `tests/assets/stageEvidenceCounts.test.ts` enforces it.
 *
 * Until this existed there was no shipped way to obtain the number, so every
 * contributor the guard reddened re-implemented the walk from the guard's
 * prose — eight contributors did it independently in one sweep, landing on
 * a merge conflict where a human sees "two plausible integers" with no hint
 * that the answer is neither. The answer is
 * always a fresh derivation, which is what this writes.
 *
 * The derivation is NOT duplicated here: it is imported from
 * `derive-e2e-callsites.mjs`, which the guard also imports. Two
 * implementations of one rule can disagree, and then the guard measures this
 * tool instead of the tree.
 *
 * The per-root split is written with the total, from that same derivation. It
 * was prose above the line and typed by hand, and every re-pin here left it
 * describing an earlier tree. `pin-guard-bytes.mjs` is the model for the shape
 * — an edit that reddens a lane, with the reseal landing in the same diff as
 * the edit.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deriveE2eCallsites,
  formatRecordLine,
  recordedE2eCallsites,
  RECORD_LINE,
  RECORD_REL,
} from "./derive-e2e-callsites.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(message) {
  console.error(message);
  console.error("usage: node scripts/pin-stage-evidence-counts.mjs [--check]");
  process.exit(2);
}

const args = process.argv.slice(2);
let check = false;
for (const arg of args) {
  if (arg === "--check") check = true;
  else usage(`unknown argument: ${arg}`);
}

const measured = await deriveE2eCallsites();
const recorded = await recordedE2eCallsites();

for (const [root, count] of Object.entries(measured.perRoot)) {
  console.log(`${String(count).padStart(6)}  ${root}`);
}
console.log(`${String(measured.total).padStart(6)}  total (derived from the tree)`);
console.log(`        recorded in ${RECORD_REL}:`);
console.log(`        ${recorded === null ? "(no line)" : formatRecordLine(recorded)}`);

if (recorded === null) {
  console.error(
    `${RECORD_REL}: no \`e2e callsites at this tree: N (<root> N, …)\` line to re-pin. The guard ` +
      "requires it: it is where the count and its per-root split are recorded, and a line this " +
      "cannot parse is no measurement at all.",
  );
  process.exit(1);
}

const wanted = formatRecordLine(measured);
if (formatRecordLine(recorded) === wanted) {
  console.log("already current; nothing to write.");
  process.exit(0);
}

if (check) {
  console.error(
    `${RECORD_REL} states \`${formatRecordLine(recorded)}\` and the tree holds \`${wanted}\`. Run ` +
      "`node scripts/pin-stage-evidence-counts.mjs` and land the change in the same commit as " +
      "the callsite edit.",
  );
  process.exit(1);
}

const abs = path.join(REPO_ROOT, RECORD_REL);
const before = await readFile(abs, "utf-8");
// A function replacement, not a string: the line now carries paths, and `$&`
// and friends are only special on the string form.
const after = before.replace(RECORD_LINE, () => wanted);
if (after === before) {
  console.error(`${RECORD_REL}: the callsite line did not change; refusing to claim a re-pin.`);
  process.exit(1);
}
await writeFile(abs, after, "utf-8");
console.log(`re-pinned ${RECORD_REL}:`);
console.log(`  was  ${formatRecordLine(recorded)}`);
console.log(`  now  ${wanted}`);
