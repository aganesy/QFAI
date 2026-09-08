/* global console, process */
/**
 * Re-pin the operator-message allowlist count in `cliMessageLanguage.test.ts`.
 *
 *   node scripts/pin-cli-message-allowlist-count.mjs           # rewrite the number
 *   node scripts/pin-cli-message-allowlist-count.mjs --check   # report, write nothing
 *
 * A change that translates a message deletes its entry and owes this re-pin in
 * the same diff. Until this existed the number was edited by hand, and a hand
 * edit is what raises it by mistake — the one direction the guard is there to
 * make visible.
 *
 * The other case it serves is a merge. Two branches that each lower the number
 * correctly against their own base produce a merge that agrees with neither,
 * and git resolves it without a conflict, so the failure arrives on the trunk
 * rather than on either branch. Nobody's change is wrong and there is nothing
 * to correct: the answer is a fresh measurement, which is what this writes.
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
  recordedAllowlistCount,
} from "./derive-cli-message-allowlist-count.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(message) {
  console.error(message);
  console.error("usage: node scripts/pin-cli-message-allowlist-count.mjs [--check]");
  process.exit(2);
}

const args = process.argv.slice(2);
let check = false;
for (const arg of args) {
  if (arg === "--check") check = true;
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

if (check) {
  console.error(
    `${GUARD_REL} pins ${String(recorded)} and the list holds ${String(measured)}. ` +
      "Run `node scripts/pin-cli-message-allowlist-count.mjs` and land it in the same commit.",
  );
  process.exit(1);
}

const guardPath = path.join(REPO_ROOT, ...GUARD_REL.split("/"));
const before = await readFile(guardPath, "utf-8");
await writeFile(guardPath, before.replace(COUNT_PIN, `$1${String(measured)}$3`), "utf-8");
console.log(`re-pinned ${GUARD_REL}: ${String(recorded)} -> ${String(measured)}`);
