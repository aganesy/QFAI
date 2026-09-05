/* global console, process */
/**
 * Derive the `e2e` project's `it` / `test` callsite count from the tree.
 *
 * `.qfai/evidence/atdd-spec-0017.md` states a rule about this number: the two
 * suite totals recorded beside it are valid only for the callsite count on the
 * line `e2e callsites at this tree: N`, and a commit that changes a callsite
 * under the `e2e` project's include globs owes a re-measurement. Nothing
 * shipped the measurement, so every contributor who reddened
 * `stageEvidenceCounts.test.ts` had to re-implement this walk from the guard's
 * prose — read the workspace includes, turn them into roots, walk the
 * `*.test.ts` files, count the matching lines. #1065 recorded eight agents
 * doing exactly that, independently, in one sweep.
 *
 * So the derivation lives here once, and has two consumers:
 *
 *   - `tests/assets/stageEvidenceCounts.test.ts` compares the recorded line
 *     with what this returns;
 *   - `scripts/pin-stage-evidence-counts.mjs` writes what this returns into
 *     the record.
 *
 * Sharing it is the point rather than a convenience: two implementations of
 * one rule can disagree, and then the guard is measuring the re-pin tool
 * instead of the tree. What the guard checks is the COMMITTED LITERAL against
 * the tree; the derivation is the same on both sides by construction.
 *
 * The globs are read from `vitest.workspace.ts`, not hardcoded, because a
 * guard over "the e2e project's callsites" that names the directories itself
 * is one `include` away from measuring something else. An include this cannot
 * turn into a root is REPORTED, never dropped: a walk that silently narrows
 * measures less than the project runs, which is worse than one that is absent.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** scripts/<this file> -> repo root */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WORKSPACE_REL = "packages/qfai/vitest.workspace.ts";
const RECORD_REL = ".qfai/evidence/atdd-spec-0017.md";
const RECORD_LINE = /^e2e callsites at this tree: (\d+)$/m;

/**
 * A line that opens a test case. `it.each` / `test.skip` and friends count:
 * they are callsites, and the record's rule says callsites.
 */
const CALLSITE_LINE = /^[ \t]*(?:it|test)(?:\.\w+)*\s*\(/;

export { RECORD_REL, RECORD_LINE, WORKSPACE_REL };

/**
 * The `e2e` project's own include list, found by project NAME.
 *
 * Matching `tests/…` anywhere in the workspace file measured the whole tests
 * tree instead — 4562 callsites against 880 — so the block is located by the
 * name the record's rule names.
 */
export async function e2eIncludeRoots() {
  const workspace = await readFile(path.join(REPO_ROOT, WORKSPACE_REL), "utf-8");
  const project = /name:\s*"e2e",\s*include:\s*\[([^\]]*)\]/.exec(workspace);
  if (project === null) {
    throw new Error(
      `${WORKSPACE_REL}: no \`e2e\` project with an include list. The callsite derivation reads ` +
        "the globs from there rather than naming the directories itself.",
    );
  }
  const declared = [...project[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const roots = [];
  const unparsed = [];
  for (const include of declared) {
    const root = /^(tests\/[^"*]+)\/\*/.exec(include)?.[1];
    if (root === undefined) unparsed.push(include);
    else roots.push(root);
  }
  if (unparsed.length > 0) {
    throw new Error(
      `${WORKSPACE_REL}: the \`e2e\` project declares an include this walk cannot turn into a ` +
        `root: ${JSON.stringify(unparsed)}. Extend the pattern rather than letting the walk ` +
        "measure less than the project runs.",
    );
  }
  if (roots.length === 0) {
    throw new Error(`${WORKSPACE_REL}: the \`e2e\` project declares no includes.`);
  }
  return [...new Set(roots)].map((glob) => `packages/qfai/${glob}`).sort();
}

/** Callsites under one root, recursively. */
async function countUnder(absRoot) {
  let total = 0;
  for (const entry of await readdir(absRoot, { withFileTypes: true })) {
    const full = path.join(absRoot, entry.name);
    if (entry.isDirectory()) {
      total += await countUnder(full);
      continue;
    }
    if (!/\.test\.ts$/.test(entry.name)) continue;
    const text = await readFile(full, "utf8");
    total += text.split(/\r?\n/).filter((line) => CALLSITE_LINE.test(line)).length;
  }
  return total;
}

/**
 * `{ total, perRoot }` for the current tree.
 *
 * `perRoot` is returned so the re-pin tool can print the breakdown a reviewer
 * checks the total against, rather than a bare integer nobody can verify.
 */
export async function deriveE2eCallsites() {
  const roots = await e2eIncludeRoots();
  const perRoot = {};
  let total = 0;
  for (const root of roots) {
    const count = await countUnder(path.join(REPO_ROOT, root));
    perRoot[root] = count;
    total += count;
  }
  return { total, perRoot, roots };
}

/** The number the record currently states, or `null` when the line is absent. */
export async function recordedE2eCallsites() {
  const record = await readFile(path.join(REPO_ROOT, RECORD_REL), "utf-8");
  const stated = RECORD_LINE.exec(record);
  return stated === null ? null : Number(stated[1]);
}

// Run directly for a quick read, so a contributor can see the number without
// reading this file.
if (process.argv[1] !== undefined && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const { total, perRoot } = await deriveE2eCallsites();
  const recorded = await recordedE2eCallsites();
  for (const [root, count] of Object.entries(perRoot)) {
    console.log(`${String(count).padStart(6)}  ${root}`);
  }
  console.log(`${String(total).padStart(6)}  total`);
  console.log(`${String(recorded ?? "-").padStart(6)}  recorded in ${RECORD_REL}`);
  process.exit(total === recorded ? 0 : 1);
}
