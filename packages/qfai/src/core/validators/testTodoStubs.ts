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
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";
import type { Issue, IssueSeverity } from "../types.js";
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
 * executable code.
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
   * Rule code + severity of one match. Defaults to {@link STUB_ERROR}, which is
   * what every skip-shaped dialect carries. Only the JS dialect overrides it,
   * to route its `.skip` form to the waivable warning rule — see the module
   * docstring.
   */
  grade?: (match: RegExpMatchArray) => StubGrade;
};

/** The rule a matched construct is filed under, with its severity. */
type StubGrade = {
  code: "QFAI-TEST-001" | "QFAI-TEST-003";
  severity: IssueSeverity;
};

const STUB_ERROR: StubGrade = { code: "QFAI-TEST-001", severity: "error" };
const SKIPPED_TEST_WARNING: StubGrade = { code: "QFAI-TEST-003", severity: "warning" };

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
    grade: (match) => (match[2] === "skip" ? SKIPPED_TEST_WARNING : STUB_ERROR),
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

/** The finding for one matched construct, worded for the rule it is filed under. */
function stubIssue(
  relFile: string,
  dialect: StubDialect,
  matchedKind: string,
  grade: StubGrade,
  lineNumber: number,
): Issue {
  const isSkip = grade.code === "QFAI-TEST-003";
  // Code follows the QFAI-<RULE-###> convention so waivers.ts:resolveRuleKeys
  // (^QFAI-([A-Z]+-\d{3})$) can match it; project-scoped waivers depend on
  // this. file is kept as the bare repo path so emitGitHub / waiver path
  // matchers (matchFindingPath in waivers.ts) work correctly; the line
  // number is carried in `loc.line`.
  const found = issue(
    grade.code,
    isSkip
      ? `Skipped test found: ${matchedKind} at ${relFile}:${lineNumber}. ` +
          `A skipped test is silent in ${dialect.runner} and rots as missed work. ` +
          `Drop the skip modifier to put it back in the run.`
      : `Test stub found: ${matchedKind} at ${relFile}:${lineNumber}. ` +
          `Stubs are silent in ${dialect.runner} and rot as missed work. ` +
          `Implement the body or delete the stub.`,
    grade.severity,
    relFile,
    "validation.testStrategy.forbidTestTodoStubs",
    [matchedKind],
    "canonical",
    // A `.skip` keeps its body, so "delete the stub" is the wrong first
    // move here: followed literally it throws away a working test. The
    // normal fix is to remove the modifier; the waiver is for the case
    // where the suite is parked on purpose.
    isSkip
      ? "Remove the skip modifier so the test runs again — restore " +
          "`it` / `test` / `describe`, implementing the body first if it is " +
          "still empty. Do not delete a test that already has one. If the " +
          "suite is parked deliberately, waive `QFAI-TEST-003` per path in " +
          ".qfai/waivers.yml; setting " +
          "`validation.testStrategy.forbidTestTodoStubs: false` in " +
          "qfai.config.yaml turns the whole check off instead."
      : "Implement the test body, or delete the stub entirely. " +
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
 */
function collectStubIssues(relFile: string, content: string, dialect: StubDialect): Issue[] {
  const issues: Issue[] = [];
  // matchAll yields matches in ascending offset order, so the line counter is
  // carried forward from the previous match instead of re-counting from the
  // top of the file: the whole scan stays linear however many stubs are found.
  // The docstring also promises one issue per occurrence, and matchAll walks
  // every match (the dialect regexes all carry the `g` flag) rather than
  // stopping at the first one on a line.
  let scanned = 0;
  let lineNumber = 1;
  for (const match of content.matchAll(dialect.pattern)) {
    lineNumber += content.slice(scanned, match.index).split("\n").length - 1;
    scanned = match.index;
    // The whitespace a fallback label carries can now include the newline the
    // match spanned, and `refs` / the message are single-line surfaces.
    const matchedKind = dialect.label ? dialect.label(match) : match[0].trim().replace(/\s+/g, " ");
    const grade = dialect.grade ? dialect.grade(match) : STUB_ERROR;
    issues.push(stubIssue(relFile, dialect, matchedKind, grade, lineNumber));
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

    issues.push(...collectStubIssues(relFile, content, dialect));
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
