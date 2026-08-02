/**
 * Test stub validator (QFAI-TEST-001 / QFAI-TEST-002).
 *
 * Detects the silent-placeholder construct of each supported stack — `it.todo`
 * in vitest/jest, `pytest.skip` / `@pytest.mark.skip` in Python, `t.Skip` in
 * Go, `@Disabled` / `@Ignore` in JUnit, `#[ignore]` in Rust, `skip`/`pending`
 * in Ruby, `[Ignore]` in .NET. They neither pass nor fail, so they do not block
 * CI by default and rot as stale work-not-done markers.
 *
 * `QFAI-TEST-002` (info) names extensions with no dialect, so a clean run on an
 * unsupported stack is not mistaken for evidence of no stubs.
 *
 * This validator closes the gap by emitting an `error` for each stub
 * found, making qfai validate / CI reject them. Projects that need to
 * migrate gradually can set `validation.testStrategy.forbidTestTodoStubs: false`
 * in qfai.config.yaml.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";
import type { Issue } from "../types.js";
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
   * stays `it.todo` rather than the bare capture group — `refs` is what
   * waivers and report grouping key on, and shortening it would silently
   * change what an existing waiver matches.
   */
  label?: (match: RegExpMatchArray) => string;
};

const STUB_DIALECTS: readonly StubDialect[] = [
  {
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
    pattern: /\b(it|test|describe)\.todo\s*\(/g,
    runner: "vitest/jest",
    label: (match) => `${match[1]}.todo`,
  },
  {
    extensions: [".py"],
    pattern: /(pytest\.skip\s*\(|@pytest\.mark\.(?:skip|skipif|xfail)\b|@unittest\.skip\w*\s*\()/g,
    runner: "pytest/unittest",
  },
  { extensions: [".go"], pattern: /\bt\.Skip\w*\s*\(/g, runner: "go test" },
  { extensions: [".java", ".kt", ".kts"], pattern: /@(?:Disabled|Ignore)\b/g, runner: "JUnit" },
  { extensions: [".rs"], pattern: /#\[ignore\b/g, runner: "cargo test" },
  { extensions: [".rb"], pattern: /^\s*(?:skip|pending)\b/gm, runner: "RSpec/minitest" },
  { extensions: [".cs"], pattern: /\[Ignore\b|\bSkip\s*=\s*"/g, runner: ".NET test" },
];

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

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      // The docstring promises one issue per stub occurrence. Walk every
      // match on the line via matchAll (the regex carries the `g` flag) so
      // a line like `it.todo(...); test.todo(...);` produces two issues
      // instead of just the first.
      const lineNumber = i + 1;
      for (const match of line.matchAll(dialect.pattern)) {
        const matchedKind = dialect.label ? dialect.label(match) : match[0].trim();
        // Code follows the QFAI-<RULE-###> convention so waivers.ts:resolveRuleId
        // (^QFAI-([A-Z]+-\d{3})$) can match it; project-scoped waivers depend on
        // this. file is kept as the bare repo path so emitGitHub / waiver path
        // matchers (matchFindingPath in waivers.ts) work correctly; the line
        // number is carried in `loc.line`.
        const stubIssue = issue(
          "QFAI-TEST-001",
          `Test stub found: ${matchedKind} at ${relFile}:${lineNumber}. ` +
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
        stubIssue.loc = { line: lineNumber };
        issues.push(stubIssue);
      }
    }
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
        `テストスタブ検出の対象外な拡張子があります: ${extensions.join(", ")}。これらのファイルは QFAI-TEST-001 の対象外なので、クリーンな結果はスタブ不在の証拠になりません`,
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
