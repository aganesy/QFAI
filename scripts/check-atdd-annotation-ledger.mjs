#!/usr/bin/env node
/* global process */
/**
 * Refuse an E2E annotation ledger entry that no test backs.
 *
 * `QFAI-ATDD-111` answers "is this user story covered?" by reading an annotation LEDGER —
 * `<testsDir>/e2e/qfai-traceability.md` — and not the test files. Appending a line to that markdown
 * clears the gate whether or not a test exists. That is the false certification `CR-20260814-0001`
 * describes, and it is worth noticing that it certifies in both directions: a real test whose
 * annotation nobody appended reads as uncovered, and an appended line with nothing behind it reads
 * as covered.
 *
 * This guard closes the second direction, which is the one that matters: for every `US` the ledger
 * claims, some E2E test file must carry the same annotation. It does not require the reverse — a
 * test annotated ahead of its ledger line is a gate that has not been told yet, not a lie.
 *
 * Deliberately narrow:
 *
 *   - It checks presence of the annotation, not that the test asserts anything. No script can judge
 *     whether an assertion earns its annotation; a reviewer can, and `US-0017-0007` is the worked
 *     example — its one assertion duplicated an existing test's, so the claim was withdrawn rather
 *     than propped up here.
 *   - It reads the ledger the SCANNER reads. `testsDir` is repo-root relative, so a `US` annotation
 *     living only under `packages/qfai/tests/e2e/**` is invisible to `QFAI-ATDD-111` — which is why
 *     the ledger exists at all, and why this guard needs both trees.
 */
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * `QFAI:SPEC-0017:US-0017-0004` — the annotation form both the ledger and the tests use.
 *
 * This is `US_TEST_ANNOTATION_RE` from `packages/qfai/src/core/atddTraceability.ts`, character for
 * character, and it is not a stylistic alignment. The first version here was
 * `/QFAI:SPEC-(\d{4}):(US-\d{4}-\d{4})/g` — no word boundaries and no short form — and round 2's
 * `implementation-reviewer` measured three divergences from the scanner, all failing OPEN:
 *
 *   QFAI:SPEC-0017:US-0017-00017   a five-digit tail was TRUNCATED into a real claim and marked it
 *                                  backed, so one typo in a test file discharged a claim it does
 *                                  not name
 *   XQFAI:SPEC-0017:US-0017-0001   a glued prefix counted as an annotation
 *   QFAI:SPEC-0017:US-0017         the short form, which the scanner accepts, was invisible in BOTH
 *                                  directions — neither claimed nor backing
 *
 * A guard whose whole stated purpose is to stop a line from certifying nothing must not itself let a
 * mangled token do the certifying. Duplicated rather than imported because this script must run with
 * no build step and no dependency on `packages/qfai/dist`; the divergence is what the tests pin.
 */
const ANNOTATION = /\bQFAI:SPEC-(\d{4}):(US-\d{4}(?:-\d{4})?)\b/g;

/**
 * Suffixes that can carry an annotation in a test tree.
 *
 * Deliberately broader than the scanner's own `DEFAULT_TEST_FILE_GLOB`, and narrower than "any file":
 * a claim is backed when SOME test source names it, and a file the scanner would not execute still
 * tells a reader the story was written about. `.md` and `.feature` are excluded — a markdown file
 * naming an annotation is a ledger or a document, not a test, and treating one as backing would
 * reintroduce exactly the substitution this guard exists to stop.
 */
const TEST_SUFFIXES = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];

/**
 * Compare the claims a ledger makes against the annotations tests carry.
 *
 * Pure: both inputs are already-read text, so the decision is testable without a filesystem.
 *
 * @param {string} ledgerText contents of `<testsDir>/e2e/qfai-traceability.md`
 * @param {Map<string, string>} testSources file path -> contents, for every E2E test file
 * @param {{ spec?: string }} [options] restrict the check to one spec number, e.g. `"0017"`
 * @returns {{ ok: boolean, unbacked: Array<{ annotation: string, spec: string }>, checked: number }}
 */
export function checkLedger(ledgerText, testSources, options = {}) {
  const claimed = new Map();
  for (const match of ledgerText.matchAll(ANNOTATION)) {
    const [, spec, story] = match;
    if (options.spec !== undefined && spec !== options.spec) continue;
    claimed.set(`QFAI:SPEC-${spec}:${story}`, spec);
  }

  const backed = new Set();
  for (const source of testSources.values()) {
    for (const match of source.matchAll(ANNOTATION)) {
      backed.add(`QFAI:SPEC-${match[1]}:${match[2]}`);
    }
  }

  const unbacked = [];
  for (const [annotation, spec] of claimed) {
    if (!backed.has(annotation)) unbacked.push({ annotation, spec });
  }
  unbacked.sort((a, b) => a.annotation.localeCompare(b.annotation));
  return { ok: unbacked.length === 0, unbacked, checked: claimed.size };
}

/**
 * Read every E2E test file under a directory tree.
 *
 * @param {string} dir
 * @returns {Promise<Map<string, string>>} empty when the directory does not exist
 */
export async function collectTestSources(dir) {
  const sources = new Map();
  /** @type {string[]} */
  const queue = [dir];
  const seen = new Set();
  for (let current = queue.pop(); current !== undefined; current = queue.pop()) {
    // A symlink loop would otherwise walk forever, and the first version could not stop one: it
    // deduped on `path.resolve`, which is LEXICAL. Round 3 measured it against a self-referencing
    // junction — 64 descents, `seen` grew to 64, zero hits, and what actually stopped the walk was
    // the operating system. `realpath` resolves the links, so the same walk terminates in two steps.
    //
    // Correcting the comment too: this repository's 83 tracked symlinks are all under dot-directories
    // this walk skips by name, and ZERO are under either scanned tree. The hazard is real for an
    // adopter's tree, not demonstrated by that count.
    let key;
    try {
      key = await realpath(current);
    } catch (error) {
      // A dangling or unresolvable path contributes nothing, and a cycle reported here is exactly
      // what the `seen` set is for — fall back to the lexical form rather than abandoning the walk.
      if (!isMissing(error) && !isLoop(error)) throw error;
      key = path.resolve(current);
    }
    if (seen.has(key)) continue;
    seen.add(key);

    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      // A tree that is not there contributes nothing, and neither does one the OS refuses to descend.
      // `ELOOP` was previously unhandled, so a symlink cycle answered exit 3 — "no measurement
      // taken" — instead of being skipped and measured around.
      if (isMissing(error) || isLoop(error)) continue;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);

      // `isDirectory()` is FALSE for a symlink to a directory, and this repository's test trees are
      // full of them — so the first version walked past every linked subtree in silence. `stat`
      // follows the link; `isSymbolicLink()` alone would not tell us which kind it is.
      let directory = entry.isDirectory();
      if (!directory && entry.isSymbolicLink()) {
        try {
          directory = (await stat(full)).isDirectory();
        } catch (error) {
          // A dangling link, and a link in a cycle, are both "this entry contributes nothing" rather
          // than failures of the guard. `ELOOP` was unhandled HERE after round 3 guarded the other
          // two sites, and round 4 measured the consequence end to end: a mutual cycle (`x -> y`,
          // `y -> x`) still gave exit 3, "no measurement taken", and dropped a real subtree the
          // control run reads fine. Three sites resolve paths; all three are guarded now.
          if (!isMissing(error) && !isLoop(error)) throw error;
          continue;
        }
      }
      if (directory) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        queue.push(full);
        continue;
      }

      if (!TEST_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue;
      try {
        sources.set(full, await readFile(full, "utf8"));
      } catch (error) {
        if (isMissing(error)) continue;
        throw error;
      }
    }
  }
  return sources;
}

/**
 * A symlink cycle or a path the OS will not resolve.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isLoop(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ELOOP" || error.code === "ENAMETOOLONG")
  );
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isMissing(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

async function main() {
  // `--spec=0017` and a misspelled flag were both accepted in silence by the first version, which
  // means a scoped invocation could quietly widen to every spec — or a typo could look like a pass.
  // Every argument is now accounted for, and anything unrecognized is a usage error.
  const args = process.argv.slice(2);
  /** @type {string | undefined} */
  let spec;
  let sawSpecFlag = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--spec") {
      sawSpecFlag = true;
      spec = args[index + 1];
      index += 1;
      continue;
    }
    const inline = /^--spec=(.*)$/.exec(argument ?? "");
    if (inline !== null) {
      sawSpecFlag = true;
      spec = inline[1];
      continue;
    }
    process.stderr.write(
      `check-atdd-annotation-ledger: unknown argument ${JSON.stringify(argument)}. ` +
        "Usage: check-atdd-annotation-ledger [--spec NNNN]\n",
    );
    process.exitCode = 2;
    return;
  }
  if (sawSpecFlag && (spec === undefined || !/^\d{4}$/.test(spec))) {
    process.stderr.write("check-atdd-annotation-ledger: --spec needs a four-digit spec number\n");
    process.exitCode = 2;
    return;
  }

  // The repository root, resolved from THIS FILE rather than from the cwd. Every sibling script in
  // this directory does the same — `check-publish-dry-run.mjs`, `check-workflow-hygiene.mjs`,
  // `check-scanner-coverage.mjs`, `check-review-profile-consistency.mjs` — and this one did not.
  // Round 2 measured the consequence: run from `packages/qfai/`, it printed "no ledger at tests/e2e
  // — nothing to check" and exited 0. A guard that answers being invoked from the wrong directory
  // with a reassuring sentence and a success code is the same fail-open shape as the gate it exists
  // to compensate for, and it could not tell that case apart from a repository with no ledger.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const ledgerPath = path.join(root, "tests", "e2e", "qfai-traceability.md");
  let ledgerText;
  try {
    ledgerText = await readFile(ledgerPath, "utf8");
  } catch (error) {
    if (isMissing(error)) {
      process.stdout.write(
        "check-atdd-annotation-ledger: no ledger at tests/e2e — nothing to check\n",
      );
      return;
    }
    throw error;
  }

  const sources = new Map();
  for (const dir of [
    path.join(root, "tests", "e2e"),
    path.join(root, "packages", "qfai", "tests", "e2e"),
  ]) {
    for (const [file, text] of await collectTestSources(dir)) sources.set(file, text);
  }

  const result = checkLedger(ledgerText, sources, spec === undefined ? {} : { spec });
  if (result.ok) {
    const scope = spec === undefined ? "all specs" : `spec-${spec}`;
    process.stdout.write(
      `check-atdd-annotation-ledger: ${result.checked} claim(s) backed by a test annotation (${scope})\n`,
    );
    return;
  }
  process.stderr.write(
    "check-atdd-annotation-ledger: the ledger claims coverage no test carries an annotation for.\n" +
      "Each line below is a user story QFAI-ATDD-111 reads as covered with nothing behind it:\n\n",
  );
  for (const { annotation } of result.unbacked) process.stderr.write(`  ${annotation}\n`);
  process.stderr.write(
    "\nWrite the test first, then append the ledger line — not the other way round.\n",
  );
  process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    // Exit 3, not 1. Exit 1 means "the ledger claims coverage no test carries"; an unexpected
    // internal failure is not that finding, and collapsing the two would let a crash read as a
    // measurement — which is the fail-open shape this guard exists to close.
    process.stderr.write(
      `check-atdd-annotation-ledger: internal failure, no measurement taken: ${String(error)}\n`,
    );
    process.exitCode = 3;
  });
}
