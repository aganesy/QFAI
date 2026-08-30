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
import { readdir, realpath, stat } from "node:fs/promises";
import { lstatSync } from "node:fs";
import { readBoundedText } from "./lib/bounded-read.mjs";
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
 * The annotation pattern without `g`, for asking whether one is present.
 *
 * `ANNOTATION` carries `g`, so `.test()` on it advances `lastIndex` and the NEXT question about
 * a different string gets a different answer. Every place here asks a yes/no question.
 */
const ANNOTATION_ANYWHERE = new RegExp(ANNOTATION.source);

/**
 * The names a Vitest test construct is spelled with.
 *
 * `xit` / `xdescribe` / `xtest` are in the set because they ARE the disabled spelling — the root
 * name is what disables them, with no modifier to read.
 */
const TEST_ROOTS = new Set(["describe", "it", "test", "suite", "xdescribe", "xit", "xtest"]);

/**
 * The modifiers that mean the runner may not execute the construct.
 *
 * `skip` and `todo` never run. `skipIf` and `runIf` run on a condition, which is the same thing
 * for this guard's purpose: a claim backed by a test that runs on somebody else's platform is not
 * backed on this run, and the ledger does not record a condition.
 */
const DISABLING_MODIFIERS = new Set(["skip", "todo", "skipIf", "runIf"]);

/**
 * Read a call expression as a test construct.
 *
 * @param {typeof import("typescript")} ts the parser
 * @param {import("typescript").CallExpression} node the call
 * @returns {{ isTest: boolean, disabled: boolean }} what the call is, and whether it runs
 */
function testCallDisposition(ts, node) {
  const modifiers = [];
  let cursor = node.expression;
  while (ts.isPropertyAccessExpression(cursor)) {
    modifiers.unshift(cursor.name.text);
    cursor = cursor.expression;
  }
  if (!ts.isIdentifier(cursor) || !TEST_ROOTS.has(cursor.text)) {
    return { isTest: false, disabled: false };
  }
  return {
    isTest: true,
    disabled:
      cursor.text.startsWith("x") || modifiers.some((name) => DISABLING_MODIFIERS.has(name)),
  };
}

/**
 * Does this test body skip itself on every run?
 *
 * `it("…", (ctx) => { ctx.skip(); … })` is the third spelling in review finding [115], and the
 * only one with no modifier to read. Only a TOP-LEVEL statement of the body counts: a `ctx.skip()`
 * inside an `if` is a test that runs somewhere, which is a different question from a test that
 * never runs anywhere, and this guard answers the second one.
 *
 * @param {typeof import("typescript")} ts the parser
 * @param {import("typescript").CallExpression} node the test call
 * @returns {boolean} whether the body unconditionally skips
 */
function bodyAlwaysSkips(ts, node) {
  const last = node.arguments[node.arguments.length - 1];
  if (last === undefined) return false;
  if (!ts.isArrowFunction(last) && !ts.isFunctionExpression(last)) return false;
  const body = last.body;
  if (body === undefined || !ts.isBlock(body)) return false;
  return body.statements.some((statement) => {
    if (!ts.isExpressionStatement(statement)) return false;
    let expression = statement.expression;
    if (ts.isAwaitExpression(expression)) expression = expression.expression;
    if (!ts.isCallExpression(expression) || expression.arguments.length !== 0) return false;
    const callee = expression.expression;
    if (ts.isPropertyAccessExpression(callee)) return callee.name.text === "skip";
    return ts.isIdentifier(callee) && callee.text === "skip";
  });
}

/**
 * The byte ranges of the test constructs the runner will not execute.
 *
 * Each range starts at the first ANNOTATION-bearing comment in the construct's leading trivia,
 * not at the construct itself. That is where this repository writes them — `// QFAI:SPEC-0017:…`
 * on the line above `describe(` — so a range that began at the `describe` would leave the
 * annotation of a skipped suite standing, which is the whole finding.
 *
 * @param {typeof import("typescript")} ts the parser
 * @param {import("typescript").SourceFile} source the parsed file
 * @param {string} text its contents
 * @returns {{ ranges: Array<[number, number]> }} the ranges to blank
 */
function disabledTestRanges(ts, source, text) {
  const ranges = [];

  /** Blank the whole statement a construct forms, annotation comments included. */
  const record = (node) => {
    let unit = node;
    while (unit.parent !== undefined && !ts.isSourceFile(unit.parent)) {
      if (ts.isExpressionStatement(unit.parent)) {
        unit = unit.parent;
        break;
      }
      unit = unit.parent;
    }
    let start = unit.getStart(source);
    for (const comment of ts.getLeadingCommentRanges(text, unit.getFullStart()) ?? []) {
      if (!ANNOTATION_ANYWHERE.test(text.slice(comment.pos, comment.end))) continue;
      start = Math.min(start, comment.pos);
    }
    ranges.push([start, unit.getEnd()]);
  };

  /**
   * Count the tests in a subtree, and how many of them the runner will execute.
   *
   * A suite is disabled by its own modifier, and ALSO by its contents: `describe(…)` whose every
   * `it` is `.skip` runs nothing, and this repository writes the annotation above the `describe`,
   * so reading only the `describe`'s own modifier left that annotation standing over a suite with
   * no executed test in it. Measured with a plant while this was being written.
   */
  const collect = (node) => {
    if (ts.isCallExpression(node)) {
      const { isTest, disabled } = testCallDisposition(ts, node);
      if (isTest) {
        if (disabled || bodyAlwaysSkips(ts, node)) {
          record(node);
          // Whatever is nested inside is disabled with it, and the range already covers it.
          return { tests: 1, running: 0 };
        }
        const inner = children(node);
        if (inner.tests === 0) return { tests: 1, running: 1 }; // a leaf test, and it runs
        if (inner.running === 0) record(node); // a suite with nothing left to run
        return inner;
      }
    }
    return children(node);
  };

  const children = (node) => {
    let tests = 0;
    let running = 0;
    ts.forEachChild(node, (child) => {
      const result = collect(child);
      tests += result.tests;
      running += result.running;
    });
    return { tests, running };
  };

  children(source);
  return { ranges };
}

/**
 * Blank out the annotations of tests the runner will not execute.
 *
 * Review finding [115]: the backing corpus was the TEXT of every file the runner's include picks
 * up, so `describe.skip`, `it.todo` and a body that always calls `ctx.skip()` backed a claim just
 * as well as a test that ran. Vitest reports those as skipped, not passed, and the lane stays
 * green on the other tests in the project — so the required ledger guard certified a user story
 * that no executed acceptance test covered.
 *
 * Blanked rather than removed, so every remaining annotation keeps its offset and its line.
 *
 * Known limitation: the disabling has to be visible AT the call — `describe.skip(…)`, `it.todo(…)`,
 * an `x`-prefixed name, or a body whose top level calls `ctx.skip()`. An alias (`const t = it.skip`)
 * or a wrapper defined in another module is not seen. Refusing every annotated file the parser
 * finds no test construct in was tried and reverted: it fires on legitimate minimal files, and a
 * guard that fails on correct input is worse than one with a gap an author has to reach for.
 *
 * @param {string} text the file contents
 * @param {string} filePath its path, for the messages
 * @returns {Promise<string>} the contents with disabled constructs blanked
 */
export async function redactDisabledTests(text, filePath) {
  if (!ANNOTATION_ANYWHERE.test(text)) {
    return text; // nothing here can back anything, so nothing needs reading
  }
  let ts;
  try {
    ts = (await import("typescript")).default;
  } catch {
    throw new Error(
      `check-atdd-annotation-ledger: cannot load the TypeScript parser needed to read ` +
        `${filePath}; whether a test is skipped decides whether it backs a ledger claim, and ` +
        "a text-level reading of that is exactly what review finding [115] exploited",
    );
  }
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const { ranges } = disabledTestRanges(ts, source, text);
  if (ranges.length === 0) return text;
  const characters = [...text];
  for (const [start, end] of ranges) {
    for (let index = start; index < end && index < characters.length; index += 1) {
      if (characters[index] !== "\n" && characters[index] !== "\r") characters[index] = " ";
    }
  }
  return characters.join("");
}
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
    // A file this reader refuses never backs a claim. The name test above rejects a link, and
    // this rejects what a name cannot see: a FIFO or a character device placed directly, and
    // anything past the ceiling. Skipping is the conservative direction — one fewer backing
    // file makes a claim fail, never pass.
    const text = readBoundedText(full, MAX_SOURCE_BYTES);
    if (text === undefined) continue;
    sources.set(full, text);
  }
  return found;
}

/**
 * Read ceilings. Every file this guard opens is one a pull request can add, and `ci:lint` is a
 * required lane — so the size is bounded and the reader is `scripts/lib/bounded-read.mjs`,
 * which refuses a link by name and decides type and size on the descriptor.
 *
 * Review finding [76]: the ledger markdown, the runner's workspace config and every test
 * source were read with a plain `readFile`, which follows a symlink. `tests/e2e/
 * qfai-traceability.md` pointed at `/dev/zero` — or at a FIFO nothing ever writes to — and the
 * required lane hung until the job timed out. A lane that can be made to hang blocks nothing,
 * which is the fail-open this guard exists to close, arriving through its own reader.
 */
const MAX_LEDGER_BYTES = 4_194_304;
const MAX_SOURCE_BYTES = 1_048_576;

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
/**
 * The keys a spread inside an object literal could contribute, or `undefined` when unknowable.
 *
 * Review finding [100]: `{ name: "e2e", include: [decoy], ...actual }` is evaluated by Vitest
 * with `actual.include` winning, and a scan that reads property assignments and ignores
 * `SpreadAssignment` takes the decoy. A trailing spread OVERRIDES what this guard read as a
 * literal, and a leading one can supply a key the literal never mentions — which is how an
 * `exclude` nobody can see would make the corpus larger than what the runner runs.
 *
 * So a spread is READ when it can be: `...identifier` whose identifier is imported from a local
 * module in this workspace, whose export is an object literal this parser can enumerate. That is
 * the shape this repository's own configuration uses, and reading it is the same act as reading
 * the project literal itself.
 *
 * `undefined` means unknowable, and the caller refuses. Evaluating the module to find out is the
 * thing this guard exists not to do.
 *
 * @param {typeof import("typescript")} ts the parser
 * @param {import("typescript").SourceFile} source the configuration
 * @param {string} configPath its path, for resolving relative imports
 * @param {import("typescript").SpreadAssignment} spread the member
 * @returns {string[] | undefined} the keys it contributes, or `undefined` if unreadable
 */
function spreadKeys(ts, source, configPath, spread) {
  if (!ts.isIdentifier(spread.expression)) return undefined;
  const wanted = spread.expression.text;

  let specifier;
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    if (bindings.elements.some((element) => element.name.text === wanted)) {
      specifier = statement.moduleSpecifier.text;
    }
  }
  if (specifier === undefined || !specifier.startsWith(".")) return undefined;

  const dir = path.dirname(configPath);
  for (const extension of [".ts", ".mts", ".js", ".mjs", ""]) {
    const candidate = path.resolve(dir, `${specifier}${extension}`);
    const text = readBoundedText(candidate, MAX_SOURCE_BYTES);
    if (text === undefined) continue;
    const module_ = ts.createSourceFile(
      candidate,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    for (const statement of module_.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const exported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (exported !== true) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== wanted) continue;
        let initializer = declaration.initializer;
        // `as const` and other assertions wrap the literal without changing its keys.
        while (
          initializer !== undefined &&
          (ts.isAsExpression(initializer) || ts.isTypeAssertionExpression(initializer))
        ) {
          initializer = initializer.expression;
        }
        if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) {
          return undefined;
        }
        const keys = [];
        for (const property of initializer.properties) {
          if (!ts.isPropertyAssignment(property)) return undefined;
          const key = property.name;
          if (ts.isIdentifier(key) || ts.isStringLiteral(key)) keys.push(key.text);
          else return undefined;
        }

        // …and nothing in that module may touch it afterwards. Review finding [103]: these are
        // the keys the literal was WRITTEN with, and `Object.assign(projectKnobs, { exclude: […] })`
        // three lines down adds one at runtime. Vitest would then skip a whole tree of E2E tests
        // while this guard, reading the initializer alone, called the spread harmless and counted
        // annotations in files the runner never opens — both the E2E lane and the ledger green
        // over user stories nobody verified.
        //
        // Proving the post-evaluation state means evaluating the module, which is the thing this
        // guard parses in order not to do. So the syntactic proof is the one available: the name
        // occurs EXACTLY ONCE in the module, at its declaration. Any second occurrence — an
        // `Object.assign`, a member assignment, the object handed to a function — is a mutation
        // this guard cannot rule out, and an unreadable spread is refused by the caller.
        //
        // Conservative on purpose: `Object.freeze(projectKnobs)` is refused too, and it is
        // provably safe. A rule that admits the safe cases it can name would have to name them
        // all, and the last three findings on this reader were each a case an enumeration missed.
        let occurrences = 0;
        const countOccurrences = (node) => {
          if (ts.isIdentifier(node) && node.text === wanted) occurrences += 1;
          ts.forEachChild(node, countOccurrences);
        };
        ts.forEachChild(module_, countOccurrences);
        if (occurrences !== 1) return undefined;

        return keys;
      }
    }
    return undefined;
  }
  return undefined;
}

/**
 * Refuse an object literal whose spreads could decide `include` or `exclude`.
 *
 * A spread that contributes neither key cannot change the corpus, whatever its position. One
 * that contributes either — or one this guard cannot read at all — is a member of the answer
 * that was never read, and the corpus is derived from what can be read.
 *
 * @param {typeof import("typescript")} ts the parser
 * @param {import("typescript").SourceFile} source the configuration
 * @param {string} configPath its path
 * @param {import("typescript").ObjectLiteralExpression} objectLiteral the literal
 * @param {string} what the literal's role, for the message
 */
function refuseDecidingSpreads(ts, source, configPath, objectLiteral, what) {
  for (const property of objectLiteral.properties) {
    if (!ts.isSpreadAssignment(property)) continue;
    const keys = spreadKeys(ts, source, configPath, property);
    if (keys === undefined) {
      throw new Error(
        `check-atdd-annotation-ledger: the ${what} in ${configPath} is assembled with a spread ` +
          "this guard cannot read, and resolving one means evaluating the module rather than " +
          "reading it. The backing corpus is derived from what can be read",
      );
    }
    const decides = keys.filter((key) => key === "include" || key === "exclude");
    if (decides.length > 0) {
      throw new Error(
        `check-atdd-annotation-ledger: the ${what} in ${configPath} spreads ${JSON.stringify(
          decides,
        )}, which decides what the runner opens — a spread may not settle the backing corpus`,
      );
    }
  }
}
/**
 * Whether an object literal carries a key this guard cannot read.
 *
 * Review finding [111]: `["in" + "clude"]: [...]` is a computed property. JavaScript evaluates
 * it to `include` and lets it override an earlier literal one; `propertyValue` skipped it,
 * because a computed name is not an identifier or a string literal. So the decoy `include` was
 * read while Vitest ran the real one — the same override the trailing spread achieved, spelled
 * differently.
 *
 * Evaluating the expression is what this guard parses in order not to do, so an unresolvable key
 * is a refusal. A computed key whose expression IS a string literal (`["include"]`) is readable
 * and is read; anything else is not.
 *
 * @param {typeof import("typescript")} ts the parser
 * @param {import("typescript").ObjectLiteralExpression} objectLiteral the literal
 * @returns {boolean} whether any key is one this guard cannot resolve
 */
function hasUnreadableKey(ts, objectLiteral) {
  return objectLiteral.properties.some((property) => {
    if (ts.isSpreadAssignment(property)) return false; // its own refusal, above
    const key = property.name;
    if (key === undefined) return true;
    if (ts.isIdentifier(key) || ts.isStringLiteral(key)) return false;
    if (ts.isNoSubstitutionTemplateLiteral(key)) return false;
    if (ts.isComputedPropertyName(key)) {
      // A computed name is readable only when the expression is already a literal.
      return !(
        ts.isStringLiteral(key.expression) || ts.isNoSubstitutionTemplateLiteral(key.expression)
      );
    }
    return true;
  });
}

function propertyValue(ts, objectLiteral, name) {
  let found;
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = property.name;
    const keyText = ts.isIdentifier(key)
      ? key.text
      : ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)
        ? key.text
        : ts.isComputedPropertyName(key) &&
            (ts.isStringLiteral(key.expression) ||
              ts.isNoSubstitutionTemplateLiteral(key.expression))
          ? key.expression.text
          : undefined;
    // The LAST one wins, as JavaScript does. Reading the first was the other half of review
    // finding [111]: a decoy written before the real key was the one this guard took.
    if (keyText === name) found = property.initializer;
  }
  return found;
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
 * @returns {{ include: string[], exclude: string[] }} the include and exclude globs
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
  // Only a call to `defineWorkspace` is unwrapped, and the CALLEE is what says so.
  //
  // Review finding [70]: any call expression had its first argument taken as the workspace, so
  // `export default choose(decoy, real)` — a helper returning its SECOND argument — had this
  // guard read the decoy while Vitest ran the real one. The whole point of parsing was that
  // the corpus comes from what the runner uses, and taking argument zero of an unidentified
  // function is a guess about that again.
  //
  // `defineWorkspace` is Vitest's own identity function over the array, which is why
  // unwrapping it is reading rather than evaluating. Anything else is refused below, where
  // the array check reports what it found.
  // The BINDING, not the spelling. Review finding [96]: this compared the callee TEXT, so a
  // config declaring `const defineWorkspace = (decoy, real) => real` had Vitest run `real` while
  // this guard took `decoy` as the backing corpus - annotation-only files in a fake tree
  // certifying every claim. The same substitution the callee check was added to stop, one level
  // down: it refused an unidentified callee and not a shadowed identified one.
  //
  // So the name has to be imported from Vitest and shadowed by nothing. Fail closed, because a
  // call this guard cannot identify is a call whose result it cannot predict.
  const importsDefineWorkspace = source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      /^vitest(\/|$)/.test(statement.moduleSpecifier.text) &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) => element.name.text === "defineWorkspace",
      ),
  );
  // A local declaration of the same name shadows the import wherever it sits - hoisting and
  // block scope both put one in reach of the export below - so ANY of them is a refusal rather
  // than a question this guard tries to answer.
  let shadowed = false;
  const walkForShadow = (node) => {
    if (shadowed) return;
    const declares =
      ts.isVariableDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node);
    if (
      declares &&
      node.name !== undefined &&
      ts.isIdentifier(node.name) &&
      node.name.text === "defineWorkspace"
    ) {
      shadowed = true;
      return;
    }
    ts.forEachChild(node, walkForShadow);
  };
  ts.forEachChild(source, walkForShadow);

  if (
    exported !== undefined &&
    ts.isCallExpression(exported) &&
    ts.isIdentifier(exported.expression) &&
    exported.expression.text === "defineWorkspace"
  ) {
    if (!importsDefineWorkspace || shadowed) {
      throw new Error(
        `check-atdd-annotation-ledger: ${configPath} calls a defineWorkspace this guard cannot ` +
          (shadowed
            ? "identify as Vitest own: a local declaration of that name shadows the import"
            : "identify as Vitest own: the name is not imported from Vitest") +
          ", so what the call returns is not something this guard may assume",
      );
    }
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
    // A spread in the project or in its `test` object can supply — or REPLACE — the include and
    // exclude lists read below. Review finding [100]: a TRAILING `...actual` wins over an earlier
    // literal in JavaScript and lost to it here, so the decoy became the corpus.
    //
    // Read where it can be read: this repository's own projects spread a knob object that
    // contributes timeouts and pool settings and neither list, which is provably harmless. A
    // spread that contributes either key, or one this guard cannot follow, is refused.
    refuseDecidingSpreads(ts, source, configPath, element, "e2e project");
    refuseDecidingSpreads(ts, source, configPath, testNode, "e2e project's `test` object");
    // …and a key this guard cannot read at all. Review finding [111].
    for (const [literal, what] of [
      [element, "e2e project"],
      [testNode, "e2e project's `test` object"],
    ]) {
      if (hasUnreadableKey(ts, literal)) {
        throw new Error(
          `check-atdd-annotation-ledger: the ${what} in ${configPath} carries a key this guard ` +
            "cannot read — a computed name it would have to evaluate. The backing corpus is " +
            "derived from what can be read, and a key that names `include` by computation names " +
            "it just as well as one that spells it",
        );
      }
    }
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

  // Both lists, because the corpus is what the runner RUNS. Review finding [85]: reading
  // `include` alone let `exclude: ["tests/e2e/backing.test.ts"]` keep a file in the backing
  // corpus that Vitest never opens — an annotation-only file discharging a required ledger
  // claim, which is the substitution this guard exists to refuse, arriving through the runner's
  // own configuration.
  const literals = (node, which) => {
    const out = [];
    if (node === undefined) return out;
    if (!ts.isArrayLiteralExpression(node)) {
      throw new Error(
        `check-atdd-annotation-ledger: the e2e project in ${configPath} declares a ${which} this ` +
          "guard cannot read as an array literal; it reads a declaration rather than evaluating one",
      );
    }
    for (const entry of node.elements) {
      const value = literalText(ts, entry);
      if (value === undefined) {
        throw new Error(
          `check-atdd-annotation-ledger: the e2e project in ${configPath} ${which}s ` +
            `${entry.getText(source)}, which is not a literal this guard can resolve; it reads a ` +
            "declaration rather than evaluating one",
        );
      }
      out.push(value);
    }
    return out;
  };

  const includeNode = propertyValue(ts, found[0], "include");
  if (includeNode === undefined || !ts.isArrayLiteralExpression(includeNode)) {
    throw new Error(
      `check-atdd-annotation-ledger: the e2e project in ${configPath} declares no include array this ` +
        "guard can read",
    );
  }
  return {
    include: literals(includeNode, "include"),
    exclude: literals(propertyValue(ts, found[0], "exclude"), "exclude"),
  };
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
 * @returns {Promise<{ roots: string[], excluded: (file: string) => boolean }>} the directories
 *   to scan and a predicate naming the files inside them the runner does not open
 */
export async function runnerCorpusRoots(root) {
  const configPath = path.join(root, "packages", "qfai", "vitest.workspace.ts");
  // Fatal, not skipped: without the runner's own include list this guard cannot say which tree
  // is the backing corpus, and scanning a guessed one is the defect the parse replaced.
  const configText = readBoundedText(configPath, MAX_SOURCE_BYTES);
  if (configText === undefined) {
    throw new Error(
      `check-atdd-annotation-ledger: ${configPath} is not a readable regular file within ` +
        `${String(MAX_SOURCE_BYTES)} bytes, so the runner's e2e include list cannot be read`,
    );
  }
  const { include: globs, exclude } = await e2eIncludeGlobs(configText, configPath);
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

  // What the runner SKIPS, in the two shapes this guard can subtract: an exact relative path,
  // and the same `<dir>/**/*<extension>` form the includes take. Anything else is a change to
  // the configuration this guard cannot follow, and a corpus that quietly kept a file Vitest
  // never opens is the whole finding — so it throws rather than approximating.
  const packageRoot = path.join(root, "packages", "qfai");
  const skips = [];
  for (const glob of exclude) {
    if (!glob.includes("*")) {
      skips.push({ file: path.resolve(packageRoot, ...glob.split("/")) });
      continue;
    }
    const shape = /^(.+?)\/\*\*\/\*(\.[A-Za-z0-9][A-Za-z0-9.]*)$/.exec(glob);
    if (shape === null) {
      throw new Error(
        `check-atdd-annotation-ledger: the e2e project excludes ${JSON.stringify(glob)}, which ` +
          "this guard cannot subtract from the corpus; a file the runner does not open must not " +
          "back a ledger claim, so update `runnerCorpusRoots` in the same change",
      );
    }
    skips.push({
      dir: path.resolve(packageRoot, ...(shape[1] ?? "").split("/")),
      extension: shape[2] ?? "",
    });
  }

  const excluded = (file) => {
    const resolved = path.resolve(file);
    return skips.some((skip) => {
      if (skip.file !== undefined) return path.resolve(skip.file) === resolved;
      if (skip.dir === undefined) return false;
      const inside = path.relative(skip.dir, resolved);
      if (inside === "" || inside.startsWith("..") || path.isAbsolute(inside)) return false;
      return resolved.endsWith(skip.extension);
    });
  };
  return { roots, excluded };
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
  // Present-but-unreadable and absent are different answers, and the reader collapses both to
  // `undefined`, so PRESENCE BY NAME decides which. A ledger that exists and is a link to a device
  // is not `nothing to check` — it is a ledger this guard refuses to read, and reporting that is
  // the point of refusing.
  const ledgerText = readBoundedText(ledgerPath, MAX_LEDGER_BYTES);
  if (ledgerText === undefined) {
    let presentByName = true;
    try {
      lstatSync(ledgerPath);
    } catch (error) {
      // ONLY absent is absent. `isMissing` is ENOENT and ENOTDIR; anything else — EACCES, ELOOP,
      // ENAMETOOLONG — is a path this guard could not resolve, and reading that as `nothing to
      // check` would be the same fail-open one branch down, reached by a different route. Before
      // this the plain `readFile` rethrew such an error, which at least crashed loudly; collapsing
      // every refusal into `undefined` is what made the distinction this guard's to make.
      presentByName = !isMissing(error);
    }
    if (presentByName) {
      const rel = path.relative(root, ledgerPath).replace(/\\/g, "/");
      process.stderr.write(
        `check-atdd-annotation-ledger: ${rel} exists but is not a readable regular file within ` +
          `${String(MAX_LEDGER_BYTES)} bytes — a symlink, a device, a directory, or oversized. ` +
          "Refusing to read it.\n",
      );
      process.exitCode = 1;
      return;
    }
    {
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
  }

  const sources = new Map();
  const { roots: corpusRoots, excluded } = await runnerCorpusRoots(root);
  for (const dir of corpusRoots) {
    // The repository is the boundary every followed link must resolve inside. Review finding
    // [61]: without one, a directory symlink to `/proc` or to any large external tree was walked
    // without bound and this required lane hung instead of reporting.
    for (const [file, text] of await collectTestSources(dir, root)) {
      // …and a file the RUNNER does not open never backs a claim. Review finding [85].
      if (excluded(file)) continue;
      // …nor does a test inside it that the runner will not execute. Review finding [115].
      sources.set(file, await redactDisabledTests(text, file));
    }
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
