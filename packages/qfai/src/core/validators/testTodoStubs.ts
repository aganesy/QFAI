/**
 * Test stub validator (QFAI-TEST-001 / QFAI-TEST-002 / QFAI-TEST-003).
 *
 * Detects the silent-placeholder construct of each supported stack — `it.todo`
 * and `it.skip` (plus the `test.*` / `describe.*` spellings) in vitest/jest,
 * `pytest.skip` / `@pytest.mark.skip` in Python, `t.Skip` in Go, `@Disabled` /
 * `@Ignore` in JUnit, `#[ignore]` in Rust, `skip`/`pending` in Ruby,
 * `[Ignore]` in .NET. They neither pass nor fail, so they do not block CI by
 * default and rot as stale work-not-done markers.
 *
 * `QFAI-TEST-001` (error) is the stub proper. The vitest/jest `.skip` form
 * carries its **own** code, `QFAI-TEST-003` (warning), and that split is
 * deliberate on both axes:
 *
 * - severity: a `.todo` is a bare declaration and can only ever mean work not
 *   done. A `.skip` keeps its body, and it is what `qfai atdd scaffold` emits
 *   for a skeleton the operator is expected to graduate, so an `error` would
 *   fail `qfai validate --fail-on error` on the scaffold's own output before a
 *   line of it had been written.
 * - code: `waivers.ts` grades a waiver against the **highest** severity its
 *   rule produced in the run (`buildRuleSeverityIndex`) and rejects any waiver
 *   aimed at an `error` rule (`QFAI-WAIVER-002`). Had both forms shared
 *   `QFAI-TEST-001`, a single `.todo` anywhere in the repo would promote the
 *   whole rule to `error` and take the per-path waiver away from the `.skip`
 *   findings — the remediation this validator advertises. A separate code
 *   keeps the warning waivable no matter what else the run found.
 *
 * `QFAI-TEST-002` (info) names extensions with no dialect, so a clean run on an
 * unsupported stack is not mistaken for evidence of no stubs.
 *
 * This validator closes the gap by emitting a finding for each stub found,
 * making qfai validate / CI reject the error-severity ones. Projects that need
 * to migrate gradually can set
 * `validation.testStrategy.forbidTestTodoStubs: false` in qfai.config.yaml.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";
import type { Issue, IssueSeverity } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { maskJsNonCode } from "./jsSourceMask.js";
import { issue } from "./utils.js";

/**
 * Stub constructs, keyed by the file extensions that use them.
 *
 * The detector used to be one constant matching `it.todo(` / `test.todo(` /
 * `describe.todo(`. File selection is stack-agnostic — it honours
 * `validation.traceability.testFileGlobs` — so on a Python, Go, Java, Rust,
 * Ruby or C# repository this validator opened and read every test file and
 * then returned a clean result that meant nothing. `qfai-implement` puts that
 * clean result on its FINAL CHECKLIST and builds a completion prohibition on
 * top of it, so a repository full of `pytest.skip` placeholders cleared the
 * only gate qfai has against exactly that.
 *
 * Still regex, not AST, for the reason the original comment gives: the scan
 * runs over thousands of files and the common case is the stub written as
 * executable code. The JS entry does put a lexer in front of its pattern
 * ({@link maskJsNonCode}) — but only to blank the comments and literals the
 * construct's *text* lives in, which is lexical, not structural.
 */
type StubDialect = {
  extensions: readonly string[];
  pattern: RegExp;
  /** Named in the finding, so the message is not vitest/jest-shaped everywhere. */
  runner: string;
  /**
   * How the matched construct is named in the finding and its `refs`.
   *
   * Defaults to the matched text. The JS dialect overrides it so the label
   * stays the exact construct (`it.todo`, `describe.skip`) rather than the
   * bare capture group — `refs` is what waivers and report grouping key on,
   * and shortening it would silently change what an existing waiver matches.
   */
  label?: (match: RegExpMatchArray) => string;
  /**
   * Whether one match is the `.skip` form rather than the stub proper.
   * Defaults to `false`, which is what every skip-shaped dialect wants: their
   * construct is the stub. Only the JS dialect overrides it, because only it
   * matches both tokens — see the module docstring for why the `.skip` half is
   * a separate rule.
   *
   * The predicate answers *which construct this is*; the rule code and the
   * severity it carries are chosen at the emission below. Returning the pair
   * from here instead put the code behind a value no static reader could
   * follow, and `tests/core/issueCodeUniqueness.test.ts` — which asks that
   * every error-capable code have a stated expected state — stopped seeing
   * `QFAI-TEST-001` at all.
   */
  isSkip?: (match: RegExpMatchArray) => boolean;
  /**
   * Whether one construct of this dialect may be written across a line break.
   * Defaults to `false`, and {@link collectStubIssues} enforces it by dropping
   * any match that carries a newline.
   *
   * Only the JS entry opts in, because only its construct is a member chain: a
   * printer breaks one at a `.` once it outgrows the print width, and the two
   * halves are still a single call. Every other dialect here matches a single
   * statement, and its `\s*` reaching across a newline would join two
   * unrelated lines — `skip_fn = pytest.skip` followed by a `(result)` line
   * reads as a `pytest.skip(` call that is never made, and reports a
   * `QFAI-TEST-001` **error** against a file with no skipped test in it. Making
   * this a property of the dialect rather than of each pattern's spelling
   * keeps a dialect added later from inheriting the same defect by writing the
   * habitual `\s*`.
   */
  spansLines?: boolean;
  /**
   * Blanks the spans of a file the construct can be *written* in but never
   * *executed* in — comments and literals — before the pattern is applied.
   *
   * Defaults to scanning the file as-is. Only the JS entry sets it: this
   * validator scans a repository's own test files, where a generator or parser
   * suite routinely holds `it.skip(…)` as fixture data and prose spells the
   * construct out in a comment. Neither is a parked test, and reporting them
   * fails `--fail-on warning` with nothing actually skipped.
   *
   * The mask must preserve offsets and line breaks — the line a finding
   * carries is derived from the match offset in the text scanned.
   */
  mask?: (content: string) => string;
};

/** The release `QFAI-TEST-003` stops being a warning at. */
const SKIPPED_TEST_PROMOTION = RULE_PROMOTIONS.testSkippedSuite.promoteAt;

/**
 * The sentence a `QFAI-TEST-003` finding carries while its window is open.
 *
 * The severity behind it was the literal `"warning"` the module docstring
 * argues for, which is the right severity *today* and never becomes anything
 * else. P7 wants the same soft landing said once, in a place a release can
 * move: a repository that has been parking suites since before this code
 * existed meets its whole backlog on upgrade, so the finding is a warning until
 * the pinned release and an error from there — and it says so, because
 * `--fail-on error` passing is the only reason an operator would not look.
 */
function skippedTestWindowNote(severity: IssueSeverity): string {
  return severity === "warning"
    ? ` Reported as a warning until the ${SKIPPED_TEST_PROMOTION} release, then an error.`
    : "";
}

/**
 * A `.` in a member chain, with the line break a formatter is free to put on
 * either side of it.
 *
 * `test.concurrent` + newline + `.skip(...)` is one valid call, and it is what
 * a printer emits once the chain grows past the print width. A `\.` demanding
 * the next link on the same line matches no part of it, so an unconditionally
 * skipped test written that way was reported by nothing. Paired with the
 * whole-file scan in {@link collectStubIssues} — the chain has to be matched
 * across the newline *and* looked for in text that still contains one.
 */
const CHAIN_DOT = String.raw`\s*\.\s*`;

/**
 * The vitest/jest construct, with a modifier chain allowed on **either** side
 * of the `todo` / `skip` token; both sides are optional.
 *
 * - leading (the lazy chain before the token) — the `test.concurrent` and
 *   `it.failing` spellings of skip. The modifier pushes `skip` off the root
 *   identifier, so a pattern demanding it directly after `test` let an
 *   unconditionally skipped concurrent test through unreported.
 * - trailing (the chain inside the first branch) — `test.skip.each` and the
 *   `it` / `describe` equivalents put a `.` where the bare form puts its `(`,
 *   so a pattern anchored straight onto the open paren let an unconditionally
 *   skipped parameterized suite through unreported.
 *
 * The second branch is the tagged-template call (`.each` followed by a
 * template literal). It demands a **non-empty** trailing chain on purpose:
 * this validator scans a repo's own test files, where prose routinely names
 * the construct inside a markdown code span, and accepting a backtick straight
 * after the bare form reports every such mention as a stub.
 */
const JS_STUB_PATTERN = new RegExp(
  String.raw`\b(it|test|describe)(?:${CHAIN_DOT}\w+)*?${CHAIN_DOT}(todo|skip)\b` +
    `(?:(?:${CHAIN_DOT}\\w+)*\\s*\\(|(?:${CHAIN_DOT}\\w+)+\\s*\`)`,
  "g",
);

const STUB_DIALECTS: readonly StubDialect[] = [
  {
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
    pattern: JS_STUB_PATTERN,
    runner: "vitest/jest",
    // Deliberately the root + the token, dropping any modifier on either side:
    // a concurrent skipped `.each` suite labels as `test.skip`, exactly as the
    // plain `test.skip.each` chain already did. `refs` is what waivers and report
    // grouping key on, so the vocabulary stays the six root×token spellings
    // instead of fragmenting once per modifier combination.
    label: (match) => `${match[1]}.${match[2]}`,
    isSkip: (match) => match[2] === "skip",
    // The member chain is the one construct here a formatter may break, and a
    // comment or literal is the one place the construct's text appears without
    // a test being parked. Both opt-ins are the JS dialect's alone.
    spansLines: true,
    mask: maskJsNonCode,
  },
  {
    extensions: [".py"],
    pattern: /(pytest\.skip\s*\(|@pytest\.mark\.(?:skip|skipif|xfail)\b|@unittest\.skip\w*\s*\()/g,
    runner: "pytest/unittest",
  },
  { extensions: [".go"], pattern: /\bt\.Skip\w*\s*\(/g, runner: "go test" },
  { extensions: [".java", ".kt", ".kts"], pattern: /@(?:Disabled|Ignore)\b/g, runner: "JUnit" },
  { extensions: [".rs"], pattern: /#\[ignore\b/g, runner: "cargo test" },
  // Indent matched with `[ \t]*`, not `\s*`: under the whole-file scan a `\s*`
  // after `^` swallows the blank lines above the construct, and the finding
  // would then carry the line number of the first of them.
  { extensions: [".rb"], pattern: /^[ \t]*(?:skip|pending)\b/gm, runner: "RSpec/minitest" },
  { extensions: [".cs"], pattern: /\[Ignore\b|\bSkip\s*=\s*"/g, runner: ".NET test" },
];

/**
 * The finding for one matched construct, worded for the rule it is filed under.
 *
 * Two `issue(...)` calls rather than one over a computed code and severity.
 * Both are read statically: `tests/core/issueCodeUniqueness.test.ts` asks that
 * every error-capable code state what a clean run asserts, and
 * `tests/core/sunsetLedger.test.ts` asks that a code with a promotion window
 * take its severity from that pin rather than from a literal beside the call.
 * Neither can follow a code carried in a value, and a rule that is invisible to
 * the ratchet is one nothing holds to either contract.
 */
function stubIssue(
  relFile: string,
  dialect: StubDialect,
  matchedKind: string,
  lineNumber: number,
  isSkip: boolean,
  skippedTestSeverity: IssueSeverity,
): Issue {
  const where = `${matchedKind} at ${relFile}:${lineNumber}`;
  // Code follows the QFAI-<RULE-###> convention so waivers.ts:resolveRuleKeys
  // (^QFAI-([A-Z]+-\d{3})$) can match it; project-scoped waivers depend on
  // this. file is kept as the bare repo path so emitGitHub / waiver path
  // matchers (matchFindingPath in waivers.ts) work correctly; the line
  // number is carried in `loc.line`.
  const found = isSkip
    ? issue(
        "QFAI-TEST-003",
        `Skipped test found: ${where}. ` +
          `A skipped test is silent in ${dialect.runner} and rots as missed work. ` +
          `Drop the skip modifier to put it back in the run.` +
          skippedTestWindowNote(skippedTestSeverity),
        skippedTestSeverity,
        relFile,
        "validation.testStrategy.forbidTestTodoStubs",
        [matchedKind],
        "canonical",
        // A `.skip` keeps its body, so "delete the stub" is the wrong first
        // move here: followed literally it throws away a working test. The
        // normal fix is to remove the modifier; the waiver is for the case
        // where the suite is parked on purpose.
        "Remove the skip modifier so the test runs again — restore " +
          "`it` / `test` / `describe`, implementing the body first if it is " +
          "still empty. Do not delete a test that already has one. If the " +
          "suite is parked deliberately, waive `QFAI-TEST-003` per path in " +
          ".qfai/waivers.yml; setting " +
          "`validation.testStrategy.forbidTestTodoStubs: false` in " +
          "qfai.config.yaml turns the whole check off instead.",
      )
    : issue(
        "QFAI-TEST-001",
        `Test stub found: ${where}. ` +
          `Stubs are silent in ${dialect.runner} and rot as missed work. ` +
          `Implement the body or delete the stub.`,
        "error",
        relFile,
        "validation.testStrategy.forbidTestTodoStubs",
        [matchedKind],
        "canonical",
        "Implement the test body, or delete the stub entirely. " +
          "If you need to temporarily opt out of this check, set " +
          "`validation.testStrategy.forbidTestTodoStubs: false` in qfai.config.yaml.",
      );
  found.loc = { line: lineNumber };
  return found;
}

/**
 * Every stub occurrence in one already-read file, one issue per occurrence.
 *
 * The scan runs over the **whole file**, not line by line. A member chain is
 * free to carry a line break at every `.` (`test.concurrent` newline
 * `.skip(...)`, `test.skip` newline `.each(table)(...)`), and such a call is
 * contained by no single line — the per-line loop this replaced reported
 * nothing for it, so a suite parked that way was invisible even to
 * `--fail-on warning`. The line number therefore comes from the offset the
 * match *starts* at, which is where the construct's root identifier sits.
 *
 * Scanning the whole file is what lets a pattern reach across a newline at
 * all, so the two dialect opt-ins that bound it are applied here:
 * {@link StubDialect.mask} takes the spans that hold the construct's text
 * without executing it out of the scan, and {@link StubDialect.spansLines}
 * gates whether a match may carry a newline. Both default to the narrow
 * behaviour, so a dialect added later cannot inherit either hazard silently.
 */
function collectStubIssues(
  relFile: string,
  content: string,
  dialect: StubDialect,
  skippedTestSeverity: IssueSeverity,
): Issue[] {
  const issues: Issue[] = [];
  // Offsets and line breaks survive the mask, so a match position in the
  // scanned text is still a position in the file the finding names.
  const scannable = dialect.mask ? dialect.mask(content) : content;
  // matchAll yields matches in ascending offset order, so the line counter is
  // carried forward from the previous match instead of re-counting from the
  // top of the file: the whole scan stays linear however many stubs are found.
  // The docstring also promises one issue per occurrence, and matchAll walks
  // every match (the dialect regexes all carry the `g` flag) rather than
  // stopping at the first one on a line.
  let scanned = 0;
  let lineNumber = 1;
  for (const match of scannable.matchAll(dialect.pattern)) {
    // Advanced before the newline gate below, so a rejected match still leaves
    // the counter on the offset it reached.
    lineNumber += scannable.slice(scanned, match.index).split("\n").length - 1;
    scanned = match.index;
    if (!dialect.spansLines && match[0].includes("\n")) {
      continue;
    }
    // The whitespace a fallback label carries can now include the newline the
    // match spanned, and `refs` / the message are single-line surfaces.
    const matchedKind = dialect.label ? dialect.label(match) : match[0].trim().replace(/\s+/g, " ");
    const isSkip = dialect.isSkip?.(match) === true;
    issues.push(stubIssue(relFile, dialect, matchedKind, lineNumber, isSkip, skippedTestSeverity));
  }
  return issues;
}

/** The dialect owning a file, or `null` when qfai knows no stub form for it. */
function resolveStubDialect(relFile: string): StubDialect | null {
  const ext = path.extname(relFile).toLowerCase();
  return STUB_DIALECTS.find((dialect) => dialect.extensions.includes(ext)) ?? null;
}

export async function validateTestTodoStubs(root: string, config: QfaiConfig): Promise<Issue[]> {
  if (!config.validation.testStrategy.forbidTestTodoStubs) {
    return [];
  }

  const globs = config.validation.traceability.testFileGlobs;
  if (globs.length === 0) {
    return [];
  }

  const excludeGlobs = Array.from(
    new Set([
      ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
      ...config.validation.traceability.testFileExcludeGlobs,
    ]),
  );

  const { files } = await collectFilesByGlobs(root, {
    globs,
    ignore: excludeGlobs,
    limit: DEFAULT_GLOB_FILE_LIMIT,
  });

  // Resolved once for the whole run: the window `QFAI-TEST-003` sits in is a
  // property of the tool, not of the file being scanned. `resolveToolVersion`
  // resolves rather than rejects — an unreadable version reads as inside the
  // window, so it can never be what escalates a skip into a build failure.
  const skippedTestSeverity = newRuleSeverity(await resolveToolVersion(), SKIPPED_TEST_PROMOTION);

  const issues: Issue[] = [];
  const unscannedExtensions = new Set<string>();
  for (const absFile of files) {
    const relFile = path.relative(root, absFile).replace(/\\/g, "/");
    // No dialect means qfai knows no stub construct for this extension. Reading
    // the file and reporting nothing would be the original defect: a clean
    // result that means "not checked", presented as "no stubs".
    const dialect = resolveStubDialect(relFile);
    if (!dialect) {
      unscannedExtensions.add(path.extname(relFile).toLowerCase() || "(no extension)");
      continue;
    }
    let content: string;
    try {
      content = await readFile(absFile, "utf-8");
    } catch {
      continue;
    }

    issues.push(...collectStubIssues(relFile, content, dialect, skippedTestSeverity));
  }

  if (unscannedExtensions.size > 0) {
    // The finding that stops a clean run from reading as evidence. Without it,
    // "0 stubs" on a stack qfai has no dialect for is indistinguishable from
    // "0 stubs" on one it checked — and `qfai-implement`'s FINAL CHECKLIST
    // treats the two identically.
    const extensions = Array.from(unscannedExtensions).sort();
    issues.push(
      issue(
        "QFAI-TEST-002",
        `テストスタブ検出の対象外な拡張子があります: ${extensions.join(", ")}。これらのファイルは QFAI-TEST-001 / QFAI-TEST-003 の対象外なので、クリーンな結果はスタブ不在の証拠になりません`,
        "info",
        root,
        "validation.testStrategy.stubDialectCoverage",
        extensions,
        "canonical",
        "対応済みの拡張子は .ts/.js 系 / .py / .go / .java / .kt / .rs / .rb / .cs です。未対応スタックのスタブは別途レビューで確認してください。",
      ),
    );
  }

  return issues;
}
