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
 * ## How it is wired, and how to widen it — a ratchet, one spec at a time
 *
 * `CR-20260820-0011`, approved 2026-08-23, **option 2**. `ci:lint` runs this **scoped**:
 *
 * ```text
 * node ./scripts/check-atdd-annotation-ledger.mjs --spec 0017
 * ```
 *
 * Scoped, not repo-wide, because the ledger carries 127 claims no test backs — a backlog owned by the
 * specs that made those claims, not by whoever wires the guard. Running unscoped today exits 1 on all
 * of them at once and blocks every unrelated change.
 *
 * **Widening is the last step of a backfill, not a separate task.** When a `/qfai-atdd` run has
 * settled its spec's claims — every `US` the ledger names for it carries a real annotation — add
 * `--spec <that spec>` to `ci:lint` in the same change. The guard then holds that spec at zero
 * forever, and the next spec repeats it. Run it scoped first and read the count it prints: a scoped
 * run that selects no claim exits non-zero rather than passing quietly, so a mistyped number cannot
 * be mistaken for a clean spec.
 *
 * The repo-wide sweep in `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts`
 * is the other half: it ratchets the total DOWN (`toBeLessThanOrEqual`), so a new unbacked claim
 * reddens immediately while the 127 are worked off. Do not raise that number to make a red go away.
 *
 * Deliberately narrow:
 *
 *   - It checks presence of the annotation, not that the test asserts anything. No script can judge
 *     whether an assertion earns its annotation; a reviewer can, and `US-0017-0007` is the worked
 *     example — its one assertion duplicated an existing test's, so the claim was withdrawn rather
 *     than propped up here.
 *   - It reads the ledger the SCANNER reads. `testsDir` is repo-root relative, so a `US` annotation
 *     living only under `packages/qfai/tests/e2e/**` is invisible to `QFAI-ATDD-111` — which is why
 *     the ledger exists at all.
 *   - The LEDGER is repo-root relative; the BACKING CORPUS is not. Review finding [09]: the corpus
 *     used to span both trees, and CI runs `pnpm -C packages/qfai test:e2e`, so only the package tree
 *     is ever executed — the root one holds the ledger and nothing else. Two different questions with
 *     two different answers, and reading them off one list is what let a claim be backed by a file
 *     Vitest never opens. `runnerCorpusRoots` derives the corpus from the runner's own include list.
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
 * `.md` and `.feature` are excluded — a markdown file naming an annotation is a ledger or a
 * document, not a test, and treating one as backing would reintroduce exactly the substitution
 * this guard exists to stop.
 */
const TEST_SUFFIXES = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];

/**
 * And the file has to be one the RUNNER executes.
 *
 * The E2E project's include is `tests/e2e/**\/*.test.ts`, so a `helpers.ts` or a `fixture.js`
 * sitting beside the suites is read by nobody unless a suite imports it. An earlier revision
 * counted those as backing on the argument that "a file the scanner would not execute still
 * tells a reader the story was written about" — but this guard's whole job is to refuse a
 * ledger claim with no EXECUTING test behind it, and under that rule deleting the real
 * `*.test.ts` while leaving the annotation in a helper kept the ledger green. The corpus is
 * therefore the runner's own file shape.
 *
 * `.test.ts` exactly, and not `.test.<any letters>` — review finding [01]. The E2E project's include
 * ends in `*.test.ts`, so a `backing.test.js` beside the suites is executed by nobody, and the looser
 * pattern let the real TypeScript test be deleted and the annotation moved into a file Vitest never
 * opens. The same hole the helper case had, wearing a different extension.
 *
 * This pattern and the runner's include are checked against each other in `runnerCorpusRoots` rather
 * than kept equal by hand.
 */
const TEST_FILE_PATTERN = /\.test\.ts$/;

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
/**
 * The identity of a directory for cycle detection, or `undefined` when it contributes nothing.
 *
 * `realpath`, not `path.resolve`. The first version deduped lexically, and round 3 measured it against a
 * self-referencing junction: 64 descents, `seen` grew to 64, zero hits, and what stopped the walk was the
 * operating system. Resolving the links terminates the same walk in two steps.
 *
 * Correcting a comment that used to live here too: this repository's 83 tracked symlinks are all under
 * dot-directories this walk skips by name, and ZERO are under either scanned tree. The hazard is real for
 * an adopter's tree, not demonstrated by that count.
 */
async function identityOf(current) {
  try {
    return await realpath(current);
  } catch (error) {
    // A dangling or unresolvable path contributes nothing, and a cycle reported here is exactly what the
    // caller's `seen` set is for — fall back to the lexical form rather than abandoning the walk.
    if (!isMissing(error) && !isLoop(error)) throw error;
    return path.resolve(current);
  }
}

/**
 * Is this entry a directory, following a symlink to one?
 *
 * `isDirectory()` is FALSE for a symlink to a directory, and this repository's test trees are full of
 * them — so the first version walked past every linked subtree in silence. `stat` follows the link;
 * `isSymbolicLink()` alone would not say which kind it is.
 */
async function entryIsDirectory(entry, full) {
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    return (await stat(full)).isDirectory();
  } catch (error) {
    // A dangling link, and a link in a cycle, are both "this entry contributes nothing" rather than
    // failures of the guard. `ELOOP` was unhandled here after round 3 guarded the other two sites, and
    // round 4 measured the consequence end to end: a mutual cycle (`x -> y`, `y -> x`) gave exit 3, "no
    // measurement taken", and dropped a real subtree the control run reads fine.
    if (!isMissing(error) && !isLoop(error)) throw error;
    return false;
  }
}

/** Read one directory's entries into `sources`, returning the subdirectories still to walk. */
async function readDirectoryInto(current, sources) {
  /** @type {string[]} */
  const found = [];
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    // A tree that is not there contributes nothing, and neither does one the OS refuses to descend.
    // `ELOOP` was previously unhandled, so a symlink cycle answered exit 3 — "no measurement taken" —
    // instead of being skipped and measured around.
    if (isMissing(error) || isLoop(error)) return found;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (await entryIsDirectory(entry, full)) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      found.push(full);
      continue;
    }
    // A SYMLINK never backs a claim. The suffix and `*.test.*` tests both read the LINK's
    // name, while `readFile` reads its target — so `tests/e2e/backing.test.ts -> ../../
    // tests/e2e/qfai-traceability.md` makes the ledger its own backing corpus and every
    // claim in it discharges itself, with no executable test anywhere. That is precisely
    // the substitution this guard exists to refuse, arriving through the filesystem rather
    // than through a markdown suffix. Directories are decided above, where following the
    // link is correct: a linked SUBTREE still holds real test files of its own.
    if (entry.isSymbolicLink()) continue;
    if (!TEST_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue;
    if (!TEST_FILE_PATTERN.test(entry.name)) continue;
    try {
      sources.set(full, await readFile(full, "utf8"));
    } catch (error) {
      if (isMissing(error)) continue;
      throw error;
    }
  }
  return found;
}

/** How many directories one corpus root may hold before the walk refuses to go further. */
const MAX_WALKED_DIRECTORIES = 5_000;

/**
 * Every test source under `dir`, following a linked subtree that stays INSIDE it.
 *
 * Following links is deliberate and was itself a repair: this repository tracks 83 symlinks,
 * and a walk that skipped a linked directory read a claim backed only inside one as unbacked.
 * What was missing is where the link may point. Review finding [61]: `seen` is keyed by
 * `realpath`, which stops a CYCLE and nothing else — so a directory symlink to `/proc`, or to
 * any large tree outside the corpus, was enumerated without bound, and the required `ci:lint`
 * exhausted memory or timed out before it could report a single ledger finding. A guard that
 * can be made to hang refuses nothing.
 *
 * So a directory is descended only when its REAL path is inside `containment`, and the number
 * of directories is capped. Hitting the cap is a hard failure rather than a short walk: a
 * corpus this guard only partly read would report claims as unbacked that are backed, and a
 * wrong answer is worse than a refusal.
 *
 * The boundary is the REPOSITORY and not the scanned directory, which is a distinction the
 * first version got wrong: a link from `tests/e2e` into `tests/helpers` resolves outside the
 * corpus root and is perfectly ordinary, and containing to the root refused it — undoing the
 * repair that made linked subtrees count in the first place. `main` supplies the repository
 * root; a caller that supplies nothing gets no containment and keeps the ceiling, which is the
 * behaviour every existing direct caller was written against.
 *
 * @param {string} dir a corpus root
 * @param {string} [containment] a directory every followed link must resolve inside
 * @returns {Promise<Map<string, string>>} test file path to contents
 */
export async function collectTestSources(dir, containment) {
  const sources = new Map();
  const boundary = containment === undefined ? undefined : await realpathOrSelf(containment);
  /** @type {string[]} */
  const queue = [dir];
  const seen = new Set();
  for (let current = queue.pop(); current !== undefined; current = queue.pop()) {
    const key = await identityOf(current);
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > MAX_WALKED_DIRECTORIES) {
      throw new Error(
        `check-atdd-annotation-ledger: ${dir} holds more than ` +
          `${String(MAX_WALKED_DIRECTORIES)} directories; refusing to keep walking rather than ` +
          "reporting a corpus it only partly read",
      );
    }
    for (const child of await readDirectoryInto(current, sources)) {
      // Inside the BOUNDARY, by real path. A link that resolves out of the repository is not
      // part of what this guard measures, whatever its name suggests.
      if (boundary !== undefined && !(await resolvesInside(child, boundary))) continue;
      queue.push(child);
    }
  }
  return sources;
}

/**
 * `realpath` of a path, or the path itself when it cannot be resolved.
 *
 * @param {string} target
 * @returns {Promise<string>}
 */
async function realpathOrSelf(target) {
  try {
    return await realpath(target);
  } catch {
    return path.resolve(target);
  }
}

/**
 * Whether `candidate` resolves to `boundary` or somewhere beneath it.
 *
 * Compared on RESOLVED paths with a separator appended, so `…/tests-extra` is not read as a
 * child of `…/tests`.
 *
 * @param {string} candidate
 * @param {string} boundary
 * @returns {Promise<boolean>}
 */
async function resolvesInside(candidate, boundary) {
  const resolved = await realpathOrSelf(candidate);
  if (resolved === boundary) return true;
  return resolved.startsWith(boundary.endsWith(path.sep) ? boundary : boundary + path.sep);
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

/**
 * Parse the argument list.
 *
 * `--spec=0017` and a misspelled flag were both accepted in silence by the first version, which means a
 * scoped invocation could quietly widen to every spec — or a typo could look like a pass. Every
 * argument is accounted for, and anything unrecognized is a usage error.
 *
 * Extracted from `main` because that function was 83 lines against the ~50 the project rules set, and
 * this is the clearest boundary in it: the other two concerns (collecting, reporting) both need the
 * result of this one.
 *
 * @param {readonly string[]} args
 * @returns {{ spec?: string } | { error: string }} the parsed scope, or the message to print
 */
function parseArguments(args) {
  /** @type {string | undefined} */
  let spec;
  let sawSpecFlag = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const inline = /^--spec=(.*)$/.exec(argument ?? "");
    if (argument === "--spec" || inline !== null) {
      // Repeated, this used to be last-wins with no message: `--spec 0017 --spec 0018` scoped to 0018
      // silently. That is the same shape this function exists to close — an invocation whose scope is
      // not what it appears to be — one turn further in, so it is a usage error like any other.
      if (sawSpecFlag) {
        return {
          error:
            "check-atdd-annotation-ledger: --spec given more than once; this guard scopes to one spec",
        };
      }
      sawSpecFlag = true;
      if (inline !== null) {
        spec = inline[1];
        continue;
      }
      spec = args[index + 1];
      index += 1;
      continue;
    }
    return {
      error:
        `check-atdd-annotation-ledger: unknown argument ${JSON.stringify(argument)}. ` +
        "Usage: check-atdd-annotation-ledger [--spec NNNN]",
    };
  }
  if (sawSpecFlag && (spec === undefined || !/^\d{4}$/.test(spec))) {
    return { error: "check-atdd-annotation-ledger: --spec needs a four-digit spec number" };
  }
  return spec === undefined ? {} : { spec };
}

/**
 * One literal string, or `undefined` for anything whose value is not fixed in the source.
 *
 * The parser is a PARAMETER rather than a module-scope binding: it is loaded on demand (see
 * `e2eIncludeGlobs`), so a helper closing over it would read `undefined` on every path that
 * reaches it before the load — which is every path, since the load is inside the only caller.
 */
function literalText(ts, node) {
  if (node === undefined) return undefined;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

/** The initializer of `name` on an object literal, by identifier or by quoted key. */
function propertyValue(ts, objectLiteral, name) {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = property.name;
    const keyText = ts.isIdentifier(key)
      ? key.text
      : ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)
        ? key.text
        : undefined;
    if (keyText === name) return property.initializer;
  }
  return undefined;
}

/**
 * The `include` globs of the project named `e2e`, read from the syntax the runner exports.
 *
 * Three text-level readings of this file preceded this one and each was wrong in a new way:
 *
 * - a bare regex over the raw file, which a COMMENT declaring an `e2e` project could shadow;
 * - the same regex with comments blanked, which a declaration inside an unused STRING could still
 *   reach — and, because the pattern spelled `"e2e"` with double quotes, the fake was the only
 *   candidate the moment the real project used a template literal for its name;
 * - and in both, an object literal that nothing exports counted the same as the exported one.
 *
 * Each repair moved the hole rather than closing it, because the property is syntactic and a
 * pattern over text cannot express it. So this walks the AST: the DEFAULT EXPORT, its array (a
 * `defineWorkspace(...)` call is unwrapped to its first argument), each element's `test` object,
 * and the `name` and `include` on that. A comment is not a node, a string's contents are not
 * nodes, and an object nothing exports is not reachable.
 *
 * A value that is not a literal — an interpolated template, an identifier, a spread of something
 * computed — is refused rather than guessed at. This guard reads a declaration; it does not
 * evaluate one.
 *
 * The parser is loaded HERE rather than at module scope, and only when a configuration is
 * actually read. A run with no ledger answers `nothing to check` without ever resolving a
 * corpus, and it must not fail because a devDependency is missing from wherever the guard
 * happens to sit — the tests copy it into synthetic trees, and so could an operator.
 *
 * @param {string} text the configuration source
 * @param {string} configPath its path, for the messages
 * @returns {string[]} the include globs
 */
async function e2eIncludeGlobs(text, configPath) {
  let ts;
  try {
    ts = (await import("typescript")).default;
  } catch {
    throw new Error(
      `check-atdd-annotation-ledger: cannot load the TypeScript parser needed to read ` +
        `${configPath}; a text-level reading of it was shadowable three different ways, so ` +
        "this guard refuses to fall back to one",
    );
  }
  const source = ts.createSourceFile(
    configPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  let exported;
  for (const statement of source.statements) {
    if (ts.isExportAssignment(statement) && statement.isExportEquals !== true) {
      exported = statement.expression;
    }
  }
  if (exported !== undefined && ts.isCallExpression(exported)) {
    exported = exported.arguments[0];
  }
  if (exported === undefined || !ts.isArrayLiteralExpression(exported)) {
    throw new Error(
      `check-atdd-annotation-ledger: ${configPath} does not export an array of projects this guard ` +
        "can read; the backing corpus is derived from it and must not fall back to a hard-coded list",
    );
  }

  const found = [];
  for (const element of exported.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const testNode = propertyValue(ts, element, "test");
    if (testNode === undefined || !ts.isObjectLiteralExpression(testNode)) continue;
    if (literalText(ts, propertyValue(ts, testNode, "name")) !== "e2e") continue;
    found.push(testNode);
  }

  if (found.length === 0) {
    throw new Error(
      `check-atdd-annotation-ledger: could not read the e2e project's include list from ${configPath}; ` +
        "the backing corpus is derived from it and must not fall back to a hard-coded list",
    );
  }
  if (found.length > 1) {
    throw new Error(
      `check-atdd-annotation-ledger: ${String(found.length)} exported e2e projects in ${configPath}; ` +
        "this guard cannot tell which one the runner uses, and taking the first is how a shadowing " +
        "declaration went unnoticed",
    );
  }

  const includeNode = propertyValue(ts, found[0], "include");
  if (includeNode === undefined || !ts.isArrayLiteralExpression(includeNode)) {
    throw new Error(
      `check-atdd-annotation-ledger: the e2e project in ${configPath} declares no include array this ` +
        "guard can read",
    );
  }
  const globs = [];
  for (const entry of includeNode.elements) {
    const value = literalText(ts, entry);
    if (value === undefined) {
      throw new Error(
        `check-atdd-annotation-ledger: the e2e project in ${configPath} includes ` +
          `${entry.getText(source)}, which is not a literal this guard can resolve; it reads a ` +
          "declaration rather than evaluating one",
      );
    }
    globs.push(value);
  }
  return globs;
}

/**
 * The directories the E2E runner actually executes, read out of the runner's own configuration.
 *
 * Review finding [09]: the corpus used to include the repository-root `tests/e2e` as well as the
 * package one, and CI runs `pnpm -C packages/qfai test:e2e`, whose include is relative to
 * `packages/qfai`. Nothing under the root tree is ever executed — it holds the ledger and nothing
 * else — so deleting the real package-side test and leaving the annotation in
 * `tests/e2e/backing.test.ts` at the root kept this guard green over a claim with no running test
 * behind it. Exactly the defect the extension test had, one directory level up.
 *
 * DERIVED, not enumerated. Two lists kept equal by hand are the same defect waiting for the next
 * project to be added, so this reads `vitest.workspace.ts` and takes the `e2e` project's include
 * globs as the answer. An unparseable configuration is a hard failure: a guard that falls back to
 * a built-in list when it cannot read the runner is a guard that silently stops tracking it.
 *
 * Read as SOURCE, not as prose. Review finding [43]: the pattern ran over the raw file, so a
 * comment declaring an `e2e` project whose include names a fake tree, placed above the real
 * project matched first — and the guard then declared a tree Vitest never opens to be the backing
 * corpus, while a ledger claim was certified by annotation-only files in it. Comments are blanked
 * before the pattern runs, and a file that still yields more than one match is refused rather
 * than resolved by position: two candidate declarations mean this guard cannot tell which one
 * the runner uses, and guessing is how the defect worked.
 *
 * @param {string} root repository root
 * @returns {Promise<string[]>} absolute directories to scan
 */
export async function runnerCorpusRoots(root) {
  const configPath = path.join(root, "packages", "qfai", "vitest.workspace.ts");
  const globs = await e2eIncludeGlobs(await readFile(configPath, "utf8"), configPath);
  if (globs.length === 0) {
    throw new Error(
      `check-atdd-annotation-ledger: the e2e project's include list in ${configPath} parsed to nothing`,
    );
  }
  const roots = [];
  for (const glob of globs) {
    // Every include this guard can honour has the shape `<dir>/**/*<extension>`. One that does not
    // is a change to the runner this guard cannot follow, and saying so beats scanning the wrong
    // tree quietly.
    //
    // The extension is CAPTURED rather than spelled out here. Writing `\.test\.ts` into this
    // pattern made the check below unreachable — the shape would reject a `*.spec.ts` include before
    // anything compared it with `TEST_FILE_PATTERN`, so two overlapping tests sat here with one of
    // them dead. Measured: a plant removing the comparison changed no behaviour at all.
    const shape = /^(.+?)\/\*\*\/\*(\.[A-Za-z0-9][A-Za-z0-9.]*)$/.exec(glob);
    if (shape === null) {
      throw new Error(
        `check-atdd-annotation-ledger: the e2e project includes ${JSON.stringify(glob)}, which this ` +
          "guard cannot map to a directory; update `runnerCorpusRoots` in the same change",
      );
    }
    // And the extension the runner names has to be one this guard would collect. These are the two
    // halves of the same fact — what Vitest opens, and what counts as backing — and letting them
    // disagree is exactly review finding [01] in the other direction: the runner would execute a
    // file shape the corpus skips, so a real test would read as no test at all.
    if (!TEST_FILE_PATTERN.test(`x${shape[2]}`)) {
      throw new Error(
        `check-atdd-annotation-ledger: the e2e project includes ${JSON.stringify(glob)}, whose ` +
          "extension `TEST_FILE_PATTERN` does not accept; the two must agree",
      );
    }
    roots.push(path.join(root, "packages", "qfai", ...(shape[1] ?? "").split("/")));
  }
  return roots;
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if ("error" in parsed) {
    process.stderr.write(`${parsed.error}\n`);
    process.exitCode = 2;
    return;
  }
  const { spec } = parsed;

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
      // Review finding [27]. A SCOPED run must not pass on a missing ledger. `ci:lint` invokes
      // this with `--spec 0017`, and returning 0 here skipped the scoped-selected-nothing check
      // below — so deleting or renaming `tests/e2e/qfai-traceability.md` left the guard green
      // while it examined nothing at all, for a spec it was configured to hold at zero.
      //
      // Unscoped, an absent ledger really is nothing to check: a repository that has not started
      // certifying has no claims to refuse. Scoped, it is the same fail-open the
      // selected-nothing branch exists to close, reached one step earlier.
      if (spec !== undefined) {
        process.stderr.write(
          `check-atdd-annotation-ledger: --spec ${spec} was requested but there is no ledger at ` +
            `${path.relative(root, ledgerPath).replace(/\\/g, "/")}. A scoped run that can examine ` +
            "nothing is not a pass.\n",
        );
        process.exitCode = 1;
        return;
      }
      process.stdout.write(
        "check-atdd-annotation-ledger: no ledger at tests/e2e — nothing to check\n",
      );
      return;
    }
    throw error;
  }

  const sources = new Map();
  for (const dir of await runnerCorpusRoots(root)) {
    // The repository is the boundary every followed link must resolve inside. Review finding
    // [61]: without one, a directory symlink to `/proc` or to any large external tree was walked
    // without bound and this required lane hung instead of reporting.
    for (const [file, text] of await collectTestSources(dir, root)) sources.set(file, text);
  }

  const result = checkLedger(ledgerText, sources, spec === undefined ? {} : { spec });
  // A SCOPED run that matched no claim is not a pass. `--spec 9999`, or one mistyped digit
  // of a real number, selects nothing: `unbacked` is empty, `ok` is true, and the guard
  // prints "0 claim(s) backed" and exits 0 — so a CI lane wired to a scope that no longer
  // exists reports green over every unbacked claim in the ledger. The unscoped run has no
  // such failure mode: a ledger with no claims at all is a repository with nothing to
  // certify, which the missing-ledger branch above already reports as such.
  if (result.ok && spec !== undefined && result.checked === 0) {
    process.stderr.write(
      `check-atdd-annotation-ledger: --spec ${spec} selected no claim in ${path.relative(root, ledgerPath).replace(/\\/g, "/")}. ` +
        "A scope that matches nothing verifies nothing; check the spec number.\n",
    );
    process.exitCode = 1;
    return;
  }
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
