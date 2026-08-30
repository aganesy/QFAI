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
  /**
   * Comment and string syntax of the dialect, blanked before the pattern runs.
   * See {@link maskNonCode}.
   */
  nonCode: NonCodeSyntax;
  /**
   * A second blanking pass, run after {@link maskNonCode}, for a token whose
   * meaning depends on where it sits rather than on what encloses it.
   *
   * C# is the case: `Skip` skips a test only as an argument of `[Fact(…)]` /
   * `[Theory(…)]`, and is an ordinary identifier everywhere else. The scan is
   * line-oriented, so a pattern cannot look up to the attribute that opened on
   * the line above — blanking the occurrences that are outside one lets the
   * pattern stay simple and keeps a wrapped argument list working.
   */
  narrow?: (masked: string) => string;
};

/**
 * A span of a source file that is not executable code — a block comment or a
 * string literal.
 */
type NonCodeSpan = {
  open: string;
  close: string;
  /** A backslash escapes the next character inside the span (raw strings: no). */
  escaped: boolean;
  /** Whether the span may cross a line break. */
  multiline: boolean;
};

type NonCodeSyntax = {
  lineComments: readonly string[];
  /** Longest opener first: a triple quote must win over a single one. */
  spans: readonly NonCodeSpan[];
  /**
   * Sticky matcher for a heredoc opener, for dialects that have one.
   *
   * A heredoc is not a {@link NonCodeSpan}: its closing delimiter is written
   * in the source that opens it, and its body starts on the *next* line rather
   * than after the opener. See {@link maskHeredocBodies}.
   */
  heredocOpener?: RegExp;
  /**
   * An opener whose **closing** delimiter is computed from the opener itself.
   *
   * Rust's `r#"…"#` is the case: the body may hold unescaped `"`, which is the
   * whole point of the form, so the fixed `"` … `"` span ends it at the first
   * inner quote and exposes the rest of the line as code. The capture group
   * carries the hashes; the closer is `"` followed by exactly those.
   */
  rawStringOpener?: RegExp;
};

const nonCodeSpan = (
  open: string,
  close: string,
  escaped: boolean,
  multiline: boolean,
): NonCodeSpan => ({ open, close, escaped, multiline });

/**
 * A Rust raw string: `r"…"`, `r#"…"#`, `br##"…"##`, any hash count.
 *
 * Sticky, matched at one exact offset like the heredoc opener. The hashes are
 * captured so {@link maskRawString} can build the closer that matches them.
 */
const RUST_RAW_STRING_OPENER = /b?r(#*)"/y;

const BLOCK_COMMENT = nonCodeSpan("/*", "*/", false, true);
const DOUBLE_QUOTED = nonCodeSpan('"', '"', true, false);
const SINGLE_QUOTED = nonCodeSpan("'", "'", true, false);

/**
 * Ruby heredoc opener, matched at one exact offset (sticky).
 *
 * RSpec writes fixtures and expected output as `<<~TEXT` bodies, and a line of
 * such a body that begins with `pending` or `skip` is prose, not a stub — the
 * Ruby pattern is line-anchored, so without this it was reported as one.
 *
 * The bare `<<TAG` form is restricted to an upper-case tag so `results <<x`
 * (the append operator with no space) is not read as a heredoc; the `<<~`,
 * `<<-` and quoted forms cannot be an operator, so they take any tag.
 */
const RUBY_HEREDOC_OPENER =
  /<<(?:[-~](?:"([A-Za-z_]\w*)"|'([A-Za-z_]\w*)'|([A-Za-z_]\w*))|"([A-Za-z_]\w*)"|'([A-Za-z_]\w*)'|([A-Z_]\w*))/y;

const STUB_DIALECTS: readonly StubDialect[] = [
  {
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
    pattern: /\b(it|test|describe)\.todo\s*\(/g,
    runner: "vitest/jest",
    label: (match) => `${match[1]}.todo`,
    nonCode: {
      lineComments: ["//"],
      spans: [BLOCK_COMMENT, nonCodeSpan("`", "`", true, true), DOUBLE_QUOTED, SINGLE_QUOTED],
    },
  },
  {
    extensions: [".py"],
    pattern: /(pytest\.skip\s*\(|@pytest\.mark\.(?:skip|skipif|xfail)\b|@unittest\.skip\w*\s*\()/g,
    runner: "pytest/unittest",
    nonCode: {
      lineComments: ["#"],
      spans: [
        nonCodeSpan('"""', '"""', true, true),
        nonCodeSpan("'''", "'''", true, true),
        DOUBLE_QUOTED,
        SINGLE_QUOTED,
      ],
    },
  },
  {
    extensions: [".go"],
    pattern: /\bt\.Skip\w*\s*\(/g,
    runner: "go test",
    nonCode: {
      lineComments: ["//"],
      // The backtick raw string takes no backslash escape.
      spans: [BLOCK_COMMENT, nonCodeSpan("`", "`", false, true), DOUBLE_QUOTED],
    },
  },
  {
    extensions: [".java", ".kt", ".kts"],
    pattern: /@(?:Disabled|Ignore)\b/g,
    runner: "JUnit",
    nonCode: {
      lineComments: ["//"],
      spans: [BLOCK_COMMENT, nonCodeSpan('"""', '"""', true, true), DOUBLE_QUOTED],
    },
  },
  {
    extensions: [".rs"],
    pattern: /#\[ignore\b/g,
    runner: "cargo test",
    // No single-quote span: in Rust that opens a lifetime far more often than a
    // literal, and masking from one to the next would blank real code.
    nonCode: {
      lineComments: ["//"],
      spans: [BLOCK_COMMENT, nonCodeSpan('"', '"', true, true)],
      rawStringOpener: RUST_RAW_STRING_OPENER,
    },
  },
  {
    extensions: [".rb"],
    pattern: /^\s*(?:skip|pending)\b/gm,
    runner: "RSpec/minitest",
    nonCode: {
      lineComments: ["#"],
      spans: [DOUBLE_QUOTED, SINGLE_QUOTED],
      heredocOpener: RUBY_HEREDOC_OPENER,
    },
  },
  {
    extensions: [".cs"],
    // `Skip` takes no closing quote: `maskNonCode` blanks the reason string
    // *including its opening quote*, so a pattern ending in `"` could never
    // match the xUnit `[Fact(Skip = "reason")]` it exists for. Stopping at the
    // `=` also catches `Skip = SkipReasons.NotImplemented`; the lookahead keeps
    // a `Skip == x` comparison out.
    //
    // It only counts **inside a `[Fact(…)]` / `[Theory(…)]` argument list**,
    // which is where xUnit's `Skip` skips anything: `narrow` blanks every
    // other occurrence first. Matching it anywhere reported an ordinary
    // `Skip = false` on a fixture record or a helper type, and widening the
    // match past the quote to catch a constant reason made that misreading
    // more likely, not less.
    pattern: /\[Ignore\b|\bSkip\s*=(?!=)/g,
    // Whitespace around the `=` varies, and `refs` is what waivers and report
    // grouping key on, so the label is normalised rather than taken verbatim.
    label: (match) => (match[0].startsWith("[") ? "[Ignore" : "Skip ="),
    runner: ".NET test",
    nonCode: { lineComments: ["//"], spans: [BLOCK_COMMENT, DOUBLE_QUOTED] },
    narrow: narrowCSharpSkip,
  },
];

/**
 * Test-source extensions qfai has no stub dialect for.
 *
 * They are collected on purpose: reaching {@link validateTestTodoStubs} is the
 * only way `QFAI-TEST-002` can name them, and a caller that brings its own
 * globs would otherwise hand the validator nothing at all on such a stack. An
 * acceptance suite written entirely in PHP would then have produced an
 * unconditionally clean ATDD gate — the exact reading `QFAI-TEST-002` exists
 * to prevent.
 *
 * Source extensions only. Fixtures and data files (`.json`, `.md`, `.yml`,
 * `.sql`) sit beside acceptance tests everywhere and never hold a stub, so
 * disclaiming them would be noise rather than coverage information.
 */
const UNDIALECTED_TEST_SOURCE_EXTENSIONS: readonly string[] = [
  "c",
  "cc",
  "clj",
  "cljs",
  "cpp",
  "dart",
  "erl",
  "ex",
  "exs",
  "fs",
  "groovy",
  "hs",
  "lua",
  "m",
  "php",
  "pl",
  "scala",
  "swift",
  "vb",
];

/**
 * Glob file pattern covering the test sources this validator should be handed.
 *
 * A caller that supplies its own globs — the ATDD completion gate scans the
 * acceptance directories rather than the project's `testFileGlobs` — uses this
 * so the scan collects every file the validator has something to say about:
 * `QFAI-TEST-001` for the extensions with a dialect, `QFAI-TEST-002` for the
 * ones without.
 */
export const STUB_SOURCE_FILE_PATTERN = `**/*.{${Array.from(
  new Set([
    ...STUB_DIALECTS.flatMap((dialect) => dialect.extensions.map((ext) => ext.slice(1))),
    ...UNDIALECTED_TEST_SOURCE_EXTENSIONS,
  ]),
)
  .sort()
  .join(",")}}`;

/**
 * Blanks every comment and string-literal span, keeping offsets and line
 * breaks intact so the caller can still report a line number.
 *
 * The detector is a line regex, so a stub token quoted in a fixture string or
 * described in a comment read as an executing stub. That is a false `error` on
 * a gate whose whole job is to be trusted — and it is why this validator's own
 * tests have to split the token to avoid reporting themselves.
 */
function maskNonCode(content: string, syntax: NonCodeSyntax): string {
  const chars = content.split("");
  const blank = (index: number): void => {
    if (chars[index] !== "\n") chars[index] = " ";
  };
  // Heredocs opened on the line being scanned. Their bodies begin after the
  // line break, and one line may open several (`foo(<<~A, <<~B)`).
  let pendingHeredocs: string[] = [];
  let i = 0;
  while (i < content.length) {
    if (content[i] === "\n") {
      i += 1;
      if (pendingHeredocs.length > 0) {
        i = maskHeredocBodies(content, blank, i, pendingHeredocs);
        pendingHeredocs = [];
      }
      continue;
    }
    if (syntax.lineComments.some((marker) => content.startsWith(marker, i))) {
      while (i < content.length && content[i] !== "\n") {
        blank(i);
        i += 1;
      }
      continue;
    }
    const heredoc = syntax.heredocOpener
      ? matchHeredocOpener(content, i, syntax.heredocOpener)
      : null;
    if (heredoc) {
      pendingHeredocs.push(heredoc.tag);
      i += heredoc.length;
      continue;
    }
    const raw = syntax.rawStringOpener
      ? matchRawStringOpener(content, i, syntax.rawStringOpener)
      : null;
    if (raw) {
      i = maskRawString(content, blank, i, raw);
      continue;
    }
    const span = syntax.spans.find((candidate) => content.startsWith(candidate.open, i));
    i = span ? maskSpan(content, blank, i, span) : i + 1;
  }
  return chars.join("");
}

/**
 * Blank every `Skip` that is not an argument of a test attribute.
 *
 * Run on already-masked text, so `[` / `]` inside a string or a comment are
 * gone and a plain bracket counter finds the attribute's own close. An
 * attribute that never closes claims the rest of the file, which is the same
 * direction the unterminated-comment case takes: it can only suppress
 * findings, never invent one.
 */
function narrowCSharpSkip(masked: string): string {
  const chars = masked.split("");
  const spans: Array<readonly [number, number]> = [];
  const attribute = /\[\s*(?:Fact|Theory)\s*\(/g;
  for (const match of masked.matchAll(attribute)) {
    let depth = 0;
    let end = match.index;
    for (; end < masked.length; end += 1) {
      if (masked[end] === "[") depth += 1;
      else if (masked[end] === "]") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    spans.push([match.index, end === masked.length ? masked.length : end]);
  }
  for (const match of masked.matchAll(/\bSkip\b/g)) {
    const at = match.index;
    if (spans.some(([from, to]) => at > from && at < to)) continue;
    for (let index = at; index < at + match[0].length; index += 1) {
      if (chars[index] !== "\n") chars[index] = " ";
    }
  }
  return chars.join("");
}

/** The raw string opened at `start`, or `null` when none is. */
function matchRawStringOpener(
  content: string,
  start: number,
  opener: RegExp,
): { hashes: string; length: number } | null {
  opener.lastIndex = start;
  const match = opener.exec(content);
  return match ? { hashes: match[1] ?? "", length: match[0].length } : null;
}

/**
 * Blank a raw string, opener and closer included.
 *
 * The closer is `"` plus exactly the hashes the opener carried, so a `"` inside
 * the body — the reason the form exists — does not end it. No escapes: a
 * backslash in a raw string is a backslash. An unterminated one blanks to end
 * of file, as an unterminated block comment does.
 */
function maskRawString(
  content: string,
  blank: (index: number) => void,
  start: number,
  raw: { hashes: string; length: number },
): number {
  const closer = `"${raw.hashes}`;
  const bodyStart = start + raw.length;
  const closeAt = content.indexOf(closer, bodyStart);
  const end = closeAt === -1 ? content.length : closeAt + closer.length;
  for (let index = start; index < end; index += 1) blank(index);
  return end;
}

/** The heredoc opened at `start`, or `null` when none is. */
function matchHeredocOpener(
  content: string,
  start: number,
  opener: RegExp,
): { tag: string; length: number } | null {
  opener.lastIndex = start;
  const match = opener.exec(content);
  if (!match) return null;
  // Exactly one alternative's group captured the delimiter; the rest of the
  // alternation leaves its groups unmatched.
  const groups: Array<string | undefined> = match.slice(1);
  const tag = groups.find((group) => group !== undefined);
  return tag === undefined ? null : { tag, length: match[0].length };
}

/**
 * Blanks the bodies of the heredocs opened on the preceding line.
 *
 * Each body runs to the line holding its delimiter, which is blanked with it.
 * An unterminated heredoc blanks to end of file, exactly as an unterminated
 * block comment does.
 */
function maskHeredocBodies(
  content: string,
  blank: (index: number) => void,
  start: number,
  tags: readonly string[],
): number {
  let i = start;
  for (const tag of tags) {
    while (i < content.length) {
      const lineBreak = content.indexOf("\n", i);
      const lineEnd = lineBreak === -1 ? content.length : lineBreak;
      const line = content.slice(i, lineEnd);
      for (let k = i; k < lineEnd; k += 1) blank(k);
      i = lineBreak === -1 ? content.length : lineBreak + 1;
      if (line.trim() === tag) break;
    }
  }
  return i;
}

/** Blanks one {@link NonCodeSpan}; returns the index just past it. */
function maskSpan(
  content: string,
  blank: (index: number) => void,
  start: number,
  span: NonCodeSpan,
): number {
  for (let k = start; k < start + span.open.length; k += 1) blank(k);
  let i = start + span.open.length;
  while (i < content.length) {
    // An unterminated quote must not swallow the rest of the file: a
    // single-line span ends at the line break whatever follows it.
    if (content[i] === "\n" && !span.multiline) return i;
    if (span.escaped && content[i] === "\\") {
      blank(i);
      if (i + 1 < content.length) blank(i + 1);
      i += 2;
      continue;
    }
    if (content.startsWith(span.close, i)) {
      for (let k = i; k < i + span.close.length; k += 1) blank(k);
      return i + span.close.length;
    }
    blank(i);
    i += 1;
  }
  return i;
}

/** The dialect owning a file, or `null` when qfai knows no stub form for it. */
function resolveStubDialect(relFile: string): StubDialect | null {
  const ext = path.extname(relFile).toLowerCase();
  return STUB_DIALECTS.find((dialect) => dialect.extensions.includes(ext)) ?? null;
}

export type TestTodoStubOptions = {
  /**
   * Overrides `validation.traceability.testFileGlobs` as the file selection.
   *
   * The ATDD completion gate passes the acceptance-test directories it owns.
   * Reusing the configured globs there did two wrong things at once: a project
   * whose globs cover `tests/unit/**` had its ATDD gate blocked by a unit
   * test's stub, and the shipped `qfai.config.yaml` leaves the list empty, so
   * the gate scanned nothing at all on a freshly initialised repository.
   */
  globs?: readonly string[];
};

export async function validateTestTodoStubs(
  root: string,
  config: QfaiConfig,
  options: TestTodoStubOptions = {},
): Promise<Issue[]> {
  if (!config.validation.testStrategy.forbidTestTodoStubs) {
    return [];
  }

  const globs = options.globs ?? config.validation.traceability.testFileGlobs;
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
    globs: Array.from(globs),
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

    // Comments and string literals are blanked first: the pattern is a line
    // regex, so a quoted fixture token or a prose mention is otherwise
    // reported as an executing stub.
    const masked = maskNonCode(content, dialect.nonCode);
    const lines = (dialect.narrow ? dialect.narrow(masked) : masked).split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      // The docstring promises one issue per stub occurrence. Walk every
      // match on the line via matchAll (the regex carries the `g` flag) so
      // a line like `it.todo(...); test.todo(...);` produces two issues
      // instead of just the first.
      const lineNumber = i + 1;
      for (const match of line.matchAll(dialect.pattern)) {
        const matchedKind = dialect.label ? dialect.label(match) : match[0].trim();
        // Code follows the QFAI-<RULE-###> convention so waivers.ts:resolveRuleKeys
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
