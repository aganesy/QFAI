/* global console, process */
/**
 * Re-pin the operator-message allowlist count in `cliMessageLanguage.test.ts`.
 *
 *   node scripts/pin-cli-message-allowlist-count.mjs           # rewrite the number
 *   node scripts/pin-cli-message-allowlist-count.mjs --check   # report, write nothing
 *
 * A change that translates a message deletes its entry and owes this re-pin in
 * the same diff.
 *
 * The other case it serves is a merge. Two branches that each lower the number
 * correctly against their own base produce a merge that agrees with neither,
 * and git resolves it without a conflict, so the failure arrives on the trunk
 * rather than on either branch. Nobody's change is wrong and there is nothing
 * to correct: the answer is a fresh measurement, which is what this writes.
 *
 * **Lowering is the default; raising takes `--allow-increase`.** Both cases
 * above lower the number. A measurement above the pin means entries were added,
 * which is the one thing the guard exists to make visible — a branch that adds
 * a Japanese message and its entry together satisfies every other assertion
 * here, and an unconditional re-pin would carry it past this one too.
 *
 * Only one thing legitimately raises it: a merge that takes entries the base
 * added. That case is real, so the flag exists rather than a refusal; what the
 * flag buys is that raising the pin is a deliberate step and a reviewed line,
 * rather than the same command everyone runs without reading.
 *
 * The derivation is NOT duplicated here. It comes from
 * `derive-cli-message-allowlist-count.mjs`, so the number this writes and the
 * number the guard holds are the same measurement.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALLOWLIST_REL,
  COUNT_PIN,
  GUARD_REL,
  deriveAllowlistCount,
  rePinRefusal,
  recordedAllowlistCount,
} from "./derive-cli-message-allowlist-count.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(message) {
  console.error(message);
  console.error(
    "usage: node scripts/pin-cli-message-allowlist-count.mjs [--check] [--allow-increase]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
let check = false;
let allowIncrease = false;
for (const arg of args) {
  if (arg === "--check") check = true;
  else if (arg === "--allow-increase") allowIncrease = true;
  else usage(`unknown argument: ${arg}`);
}

const measured = await deriveAllowlistCount(REPO_ROOT);
const recorded = await recordedAllowlistCount(REPO_ROOT);

console.log(`${String(measured).padStart(6)}  entries in ${ALLOWLIST_REL}`);
console.log(`${String(recorded).padStart(6)}  pinned in ${GUARD_REL}`);

if (measured === recorded) {
  console.log("already current; nothing to write.");
  process.exit(0);
}

const grew = measured > recorded;

if (check) {
  console.error(
    `${GUARD_REL} pins ${String(recorded)} and the list holds ${String(measured)}. ` +
      (grew
        ? "Run `node scripts/pin-cli-message-allowlist-count.mjs --allow-increase` only if the " +
          "entries came from merging the base."
        : "Run `node scripts/pin-cli-message-allowlist-count.mjs` and land it in the same commit."),
  );
  process.exit(1);
}

const refusal = rePinRefusal({ measured, recorded, allowIncrease });
if (refusal !== null) {
  console.error(refusal);
  process.exit(1);
}

const guardPath = path.join(REPO_ROOT, ...GUARD_REL.split("/"));
const before = await readFile(guardPath, "utf-8");
await writeFile(guardPath, before.replace(COUNT_PIN, `$1${String(measured)}$3`), "utf-8");
console.log(`re-pinned ${GUARD_REL}: ${String(recorded)} -> ${String(measured)}`);
if (grew) {
  console.log("raised on request: the added entries are the base's to translate.");
}
