/* global console, process */
/**
 * Re-pin the e2e callsite count in `.qfai/evidence/atdd-spec-0017.md`.
 *
 *   node scripts/pin-stage-evidence-counts.mjs           # rewrite the line
 *   node scripts/pin-stage-evidence-counts.mjs --check    # report, write nothing
 *
 * The record states the rule this serves: the two suite totals beside that
 * line are valid only for the callsite count on it, and a commit that changes
 * an `it` / `test` callsite under the `e2e` project's include globs owes a
 * re-measurement. `tests/assets/stageEvidenceCounts.test.ts` enforces it.
 *
 * Until this existed there was no shipped way to obtain the number, so every
 * contributor the guard reddened re-implemented the walk from the guard's
 * prose — #1065 recorded eight doing it independently in one sweep, and
 * observed that a human resolving the resulting merge conflict sees "two
 * plausible integers" with no hint that the answer is neither. The answer is
 * always a fresh derivation, which is what this writes.
 *
 * The derivation is NOT duplicated here: it is imported from
 * `derive-e2e-callsites.mjs`, which the guard also imports. Two
 * implementations of one rule can disagree, and then the guard measures this
 * tool instead of the tree.
 *
 * What this deliberately does NOT do is re-pin the two SUITE totals. Those
 * cannot be derived without running the suites from inside a tool that is not
 * running them, and the record says so; this moves the one number that
 * invalidates them, and the totals stay a human claim with a stated validity
 * condition. `pin-guard-bytes.mjs` is the model for the shape — an edit that
 * reddens a lane, with the reseal landing in the same diff as the edit.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deriveE2eCallsites,
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

const { total, perRoot } = await deriveE2eCallsites();
const recorded = await recordedE2eCallsites();

for (const [root, count] of Object.entries(perRoot)) {
  console.log(`${String(count).padStart(6)}  ${root}`);
}
console.log(`${String(total).padStart(6)}  total (derived from the tree)`);
console.log(`${String(recorded ?? "-").padStart(6)}  recorded in ${RECORD_REL}`);

if (recorded === null) {
  console.error(
    `${RECORD_REL}: no \`e2e callsites at this tree: N\` line to re-pin. The guard requires it, ` +
      "because the two suite totals above it have no stated validity condition without it.",
  );
  process.exit(1);
}

if (total === recorded) {
  console.log("already current; nothing to write.");
  process.exit(0);
}

if (check) {
  console.error(
    `${RECORD_REL} states ${recorded} and the tree holds ${total}. Run ` +
      "`node scripts/pin-stage-evidence-counts.mjs` and land the change in the same commit as " +
      "the callsite edit. The two suite totals beside that line are known-invalid until then.",
  );
  process.exit(1);
}

const abs = path.join(REPO_ROOT, RECORD_REL);
const before = await readFile(abs, "utf-8");
const after = before.replace(RECORD_LINE, `e2e callsites at this tree: ${String(total)}`);
if (after === before) {
  console.error(`${RECORD_REL}: the callsite line did not change; refusing to claim a re-pin.`);
  process.exit(1);
}
await writeFile(abs, after, "utf-8");
console.log(`re-pinned ${RECORD_REL}: ${recorded} -> ${total}`);
console.log(
  "The two suite totals beside that line are now known-invalid for this tree until they are " +
    "re-measured; the record says so, and this tool cannot derive them.",
);
