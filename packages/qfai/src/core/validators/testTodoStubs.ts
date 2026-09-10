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
 * `QFAI-TEST-001` is the stub proper. The vitest/jest `.skip` form carries its
 * **own** code, `QFAI-TEST-003`, because the two name different states and ask
 * for different fixes: a `.todo` is a bare declaration and is deleted or
 * implemented, while a `.skip` keeps its body and the fix is to drop the
 * modifier.
 *
 * A file still carrying {@link SCAFFOLD_PLACEHOLDER_MARKER} is exempt from
 * `QFAI-TEST-003`. `qfai atdd scaffold` writes its skeletons as `it.skip`, and
 * `D-SCAFFOLD-PLACEHOLDER` already owns an unfilled scaffold — with a
 * deliberate ladder that stays a warning for `atdd.scaffoldEscalateCycles`
 * validate runs before it becomes an error. Reporting the same block here as
 * well would fail `qfai validate --fail-on error` on the scaffold's own output
 * before a line of it had been written, and would overrule that ladder from
 * outside. A `.todo` in the same file is still `QFAI-TEST-001`: the scaffold
 * does not write one.
 *
 * `QFAI-TEST-002` (info) names the states in which the scan produced no
 * evidence: extensions with no dialect, and an empty
 * `validation.traceability.testFileGlobs` (the value `qfai init` ships), where
 * no file is selected at all. Neither may be mistaken for "no stubs".
 *
 * This validator closes the gap by emitting a finding for each stub found,
 * making qfai validate / CI reject the error-severity ones. Projects that need
 * to migrate gradually can set
 * `validation.testStrategy.forbidTestTodoStubs: false` in qfai.config.yaml.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../atdd/scaffold.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS, normalizeGlobs } from "../traceability.js";
import type { Issue, IssueSeverity } from "../types.js";
import { maskJsNonCode } from "./jsSourceMask.js";
import { issue } from "./utils.js";

/**
 * Stub constructs, keyed by the file extensions that use them.
 *
 * One constant matching `it.todo(` / `test.todo(` / `describe.todo(` alone
 * would open and read every test file on a Python, Go, Java, Rust, Ruby or
 * C# repository and return a clean result that meant nothing, since file
 * selection is stack-agnostic — it honours
 * `validation.traceability.testFileGlobs`. `qfai-implement` puts that
 * clean result on its FINAL CHECKLIST and builds a completion prohibition on
 * top of it, so a repository full of `pytest.skip` placeholders cleared the
 * only gate qfai has against exactly that.
 *
 * Still regex, not AST, for the reason the original comment gives: the scan
 * runs over thousands of files and the common case is the stub written as
 * executable code. Every entry does put a blanking pass in front of its
 * pattern ({@link StubDialect.mask}) — but only to blank the comments and
 * literals the construct's *text* lives in, which is lexical, not structural.
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
   * Required, not optional: this validator scans a repository's own test
   * files, where a generator or parser suite routinely holds `it.skip(…)` as
   * fixture data and prose spells the construct out in a comment. Neither is a
   * parked test, and reporting them fails `--fail-on warning` with nothing
   * actually skipped — this validator's own suites had to split the token to
   * stop it reporting itself. Making it required is what keeps a dialect added
   * later from inheriting that hazard by simply not declaring its comment and
   * string syntax.
   *
   * The JS entry uses the lexer in {@link maskJsNonCode}, which also knows the
   * regex-literal and template forms; every other entry declares its comment
   * and string syntax and runs {@link maskNonCode} over it.
   *
   * The mask must preserve offsets and line breaks — the line a finding
   * carries is derived from the match offset in the text scanned.
   */
  mask: (content: string) => string;
  /**
   * A second blanking pass, run after {@link StubDialect.mask}, for a token
   * whose meaning depends on where it sits rather than on what encloses it.
   *
   * C# is the case: `Skip` skips a test only as an argument of `[Fact(…)]` /
   * `[Theory(…)]`, and is an ordinary identifier everywhere else. A pattern
   * cannot look up to the attribute that opened on the line above — blanking
   * the occurrences that are outside one lets the pattern stay simple and
   * keeps a wrapped argument list working.
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
  /**
   * Whether a second opener inside the span re-opens it instead of sitting in
   * it as text.
   *
   * Rust's block comment is the case: an inner comment opened inside an outer
   * one has to be closed twice, so a scan that stops at the first closing
   * delimiter re-exposes the outer comment's tail as code — an `#[ignore]`
   * written there was reported as a real attribute. Every other span here is
   * flat, which is why the factory below defaults this to `false`.
   */
  nests: boolean;
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
  /**
   * An opener for a multi-line string whose closer follows from its own form
   * rather than from a capture: C#'s `@"…"` and `"""…"""`. Tried before
   * {@link NonCodeSyntax.spans}, so the single-line `"` span cannot claim the
   * opening quote first.
   */
  longStringOpener?: RegExp;
  /**
   * A format string whose body is part literal and part code, given as the
   * span it occupies.
   *
   * Python's f-string is the case: `f"{pytest.skip('later')}"` evaluates the
   * replacement field and really does skip the test, so blanking the literal
   * whole took the only evidence of it out of the scan. See
   * {@link maskFormatString}, which blanks the literal halves and leaves the
   * fields.
   */
  formatStringOpener?: RegExp;
  /**
   * A regex literal, resolved by a function rather than a pattern because its
   * delimiters are not fixed and one of its forms is ambiguous.
   *
   * Ruby is the case: `%r{…}` takes any delimiter, and a bare `/` is division
   * as often as it opens a literal. `pattern = /<<~TEXT/` is a valid pattern
   * whose body was read as a heredoc opener, and a heredoc with no terminator
   * blanks to end of file — so every real `pending` after it left the scan.
   * Returns the span to blank, or `null` when nothing opens here.
   */
  regexOpener?: (content: string, start: number) => NonCodeSpan | null;
};

const nonCodeSpan = (
  open: string,
  close: string,
  escaped: boolean,
  multiline: boolean,
  nests = false,
): NonCodeSpan => ({ open, close, escaped, multiline, nests });

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

/** The `%r` regex form, whose delimiter is whatever punctuation follows it. */
const RUBY_PERCENT_REGEX_OPENER = /%r([^\w\s])/y;

/** Bracket delimiters close with their mirror; every other one closes itself. */
const RUBY_PERCENT_CLOSERS: Readonly<Record<string, string>> = {
  "{": "}",
  "[": "]",
  "(": ")",
  "<": ">",
};

/**
 * Punctuation a `/` may follow and still open a regex literal: after any of
 * these an operand has to come next, so the slash cannot be division.
 */
const RUBY_REGEX_AFTER_OPERATOR = /[=(,[{|&!~<>+\-*/%^?:;]\s*$/;

/** Keywords with the same property, plus the methods a pattern is passed to. */
const RUBY_REGEX_AFTER_KEYWORD =
  /(?:^|[^\w.])(?:and|or|not|if|elsif|unless|while|until|when|case|then|do|in|return|match|match\?|split|gsub|gsub!|sub|sub!|scan|grep|grep_v)[!?]?\s*$/;

/**
 * The Ruby regex literal opened at `start`, as the span to blank, or `null`.
 *
 * `%r` cannot be anything else, so it is read straight and may cross line
 * breaks: an unterminated one is a syntax error, not another reading of valid
 * code.
 *
 * A bare `/` is division as often as it is a literal, and reading a division as
 * a literal blanks real code — the direction that hides findings. So it counts
 * only where an operand cannot stand (line start, or straight after an operator
 * or keyword) **and** the line goes on to hold a closing `/`. `pattern =
 * /<<~TEXT/` passes both tests; `total / count` passes neither, and `a / b / c`
 * fails the first at each slash.
 */
function matchRubyRegexOpener(content: string, start: number): NonCodeSpan | null {
  RUBY_PERCENT_REGEX_OPENER.lastIndex = start;
  const percent = RUBY_PERCENT_REGEX_OPENER.exec(content);
  if (percent) {
    const open = percent[1] ?? "";
    return nonCodeSpan(percent[0], RUBY_PERCENT_CLOSERS[open] ?? open, true, true);
  }
  if (content[start] !== "/") {
    return null;
  }
  const lineStart = content.lastIndexOf("\n", start - 1) + 1;
  const before = content.slice(lineStart, start);
  if (
    before.trim().length > 0 &&
    !RUBY_REGEX_AFTER_OPERATOR.test(before) &&
    !RUBY_REGEX_AFTER_KEYWORD.test(before)
  ) {
    return null;
  }
  const lineBreak = content.indexOf("\n", start + 1);
  const rest = content.slice(start + 1, lineBreak === -1 ? content.length : lineBreak);
  if (!/^\/|[^\\]\//.test(rest)) {
    return null;
  }
  return nonCodeSpan("/", "/", true, false);
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
    `(?:((?:${CHAIN_DOT}\\w+)*)\\s*\\(|(?:${CHAIN_DOT}\\w+)+\\s*\`)`,
  "g",
);

/**
 * The first character of the matched call's argument list, past any blanks.
 *
 * Sticky, so it reads at an offset without copying the rest of the file. Only
 * that one character is needed, so it does not balance the argument list.
 */
const FIRST_ARGUMENT = /\s*(.?)/y;

/**
 * Whether a matched `.skip` is Playwright's runtime guard rather than a parked
 * test.
 *
 * The two are one token apart in the source and opposite in meaning:
 *
 * | Written                       | Means                                    |
 * | ----------------------------- | ---------------------------------------- |
 * | `test.skip("name", fn)`       | the test is registered and never runs    |
 * | `test.skip(cond, "reason")`   | the test runs and stops early if `cond`  |
 * | `test.skip()`                 | the test runs and stops here             |
 *
 * The second and third forms are statements inside a running test body. The
 * test is registered, reported and executed, so none of what this rule says
 * about a parked test applies to them: there is no modifier to drop, and
 * deleting the call removes a guard rather than restoring a test. Reporting
 * them also leaves a repository with a legitimate guard no passing state,
 * because an error cannot be waived.
 *
 * The forms are told apart by the first argument: a string literal is the
 * test's name, and anything else — an identifier, a call, a negation, an
 * environment lookup — is a condition evaluated at run time. No argument at
 * all is the unconditional runtime form.
 *
 * A trailing chain (`test.skip.each(table)(...)`) is excluded: its first
 * argument is the table, not a name, and the construct is a parked
 * parameterized suite either way.
 *
 * `todo` has no runtime form, so this asks nothing about it.
 */
function isRuntimeSkip(
  match: RegExpMatchArray,
  argumentStart: number,
  scannable: string,
  content: string,
): boolean {
  if (match[2] !== "skip" || match[3] !== "") return false;

  // The mask blanked comments and literals one character for one, so what is
  // left at this offset is either the argument's own first character or the
  // `,` / `)` that followed a blanked one.
  FIRST_ARGUMENT.lastIndex = argumentStart;
  const first = FIRST_ARGUMENT.exec(scannable)?.[1] ?? "";
  if (first !== "," && first !== ")") {
    // An expression, and an empty string only at end of file — a call whose
    // argument list is never closed is not a parked test either.
    return true;
  }

  // Blanks up to a `,` or `)`. A quote in the same span of the unmasked file
  // is the name the mask took out; without one there was no argument, which
  // is the zero-argument runtime form.
  const blanked = content.slice(argumentStart, FIRST_ARGUMENT.lastIndex - first.length);
  return !/['"`]/.test(blanked);
}

/**
 * A Python f-string opener: any prefix combination containing `f`, then the
 * opening quote. Sticky, and group 1 is the prefix so a raw f-string can drop
 * backslash escapes; group 2 is the quote, which is also the closer.
 */
const PYTHON_FSTRING_OPENER = /([bBrRuU]*[fF][bBrRuU]*)("""|'''|"|')/y;

/** Comment and string syntax of each non-JS dialect, for {@link maskNonCode}. */
const PYTHON_NON_CODE: NonCodeSyntax = {
  lineComments: ["#"],
  spans: [
    nonCodeSpan('"""', '"""', true, true),
    nonCodeSpan("'''", "'''", true, true),
    DOUBLE_QUOTED,
    SINGLE_QUOTED,
  ],
  formatStringOpener: PYTHON_FSTRING_OPENER,
};

const GO_NON_CODE: NonCodeSyntax = {
  lineComments: ["//"],
  // The backtick raw string takes no backslash escape.
  spans: [BLOCK_COMMENT, nonCodeSpan("`", "`", false, true), DOUBLE_QUOTED],
};

/**
 * Java: `"""` opens a text block, in which a backslash escapes — a trailing one
 * joins the line to the next, and `\"` is a quote that does not close it.
 */
const JAVA_NON_CODE: NonCodeSyntax = {
  lineComments: ["//"],
  spans: [BLOCK_COMMENT, nonCodeSpan('"""', '"""', true, true), DOUBLE_QUOTED],
};

/**
 * Kotlin: the same `"""` spelling is a *raw* string, where a backslash is a
 * backslash. Sharing Java's definition made a raw string ending in one hide its
 * own closing delimiter — the mask skipped the first quote of `"""` as an
 * escaped character, ran on to end of file, and took every `@Disabled` after it
 * out of the scan. Kotlin block comments also nest, unlike Java's.
 */
const KOTLIN_NON_CODE: NonCodeSyntax = {
  lineComments: ["//"],
  spans: [
    nonCodeSpan("/*", "*/", false, true, true),
    nonCodeSpan('"""', '"""', false, true),
    DOUBLE_QUOTED,
  ],
};

// No single-quote span: in Rust that opens a lifetime far more often than a
// literal, and masking from one to the next would blank real code.
const RUST_NON_CODE: NonCodeSyntax = {
  lineComments: ["//"],
  spans: [nonCodeSpan("/*", "*/", false, true, true), nonCodeSpan('"', '"', true, true)],
  rawStringOpener: RUST_RAW_STRING_OPENER,
};

const RUBY_NON_CODE: NonCodeSyntax = {
  lineComments: ["#"],
  spans: [DOUBLE_QUOTED, SINGLE_QUOTED],
  heredocOpener: RUBY_HEREDOC_OPENER,
  regexOpener: matchRubyRegexOpener,
};

/**
 * A C# verbatim (`@"…"`) or raw (`"""…"""`, any quote count from three) string,
 * with the `$` of either one's interpolated spelling.
 *
 * Both may hold line breaks, so the single-line `DOUBLE_QUOTED` span ends them
 * at the first newline and re-exposes the rest of a fixture as code — an
 * `[Ignore]` quoted inside expected output was reported as a real one. Matched
 * ahead of the plain span, and sticky like the other computed openers.
 *
 * The interpolated forms are the same strings with a `$` on the prefix, in
 * either order (`@$"` and `$@"` are both legal, as are `$"""` and `$$"""`), and
 * they carry line breaks exactly as the plain ones do. Matching only `@"` left
 * `@$"` to the single-line span, which is the defect above with an extra
 * character in front of it.
 *
 * The closer is computed from the opener: a verbatim string ends at a `"` that
 * is not doubled (`""` is an escaped quote inside one), and a raw string ends
 * at a run of at least as many quotes as opened it. The interpolation prefix
 * changes neither rule.
 */
const CSHARP_LONG_STRING_OPENER = /(?:@\$*|\$*@)"|\$*"{3,}/y;

const CSHARP_NON_CODE: NonCodeSyntax = {
  lineComments: ["//"],
  spans: [BLOCK_COMMENT, DOUBLE_QUOTED],
  longStringOpener: CSHARP_LONG_STRING_OPENER,
};

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
    mask: (content) => maskNonCode(content, PYTHON_NON_CODE),
  },
  {
    extensions: [".go"],
    pattern: /\bt\.Skip\w*\s*\(/g,
    runner: "go test",
    mask: (content) => maskNonCode(content, GO_NON_CODE),
  },
  // One construct, two lexers: Java's `"""` text block takes backslash escapes
  // and Kotlin's raw string does not, so a single entry could only be wrong for
  // one of them.
  {
    extensions: [".java"],
    pattern: /@(?:Disabled|Ignore)\b/g,
    runner: "JUnit",
    mask: (content) => maskNonCode(content, JAVA_NON_CODE),
  },
  {
    extensions: [".kt", ".kts"],
    pattern: /@(?:Disabled|Ignore)\b/g,
    runner: "JUnit",
    mask: (content) => maskNonCode(content, KOTLIN_NON_CODE),
  },
  {
    extensions: [".rs"],
    pattern: /#\[ignore\b/g,
    runner: "cargo test",
    mask: (content) => maskNonCode(content, RUST_NON_CODE),
  },
  {
    extensions: [".rb"],
    // Indent matched with `[ \t]*`, not `\s*`: under the whole-file scan a `\s*`
    // after `^` swallows the blank lines above the construct, and the finding
    // would then carry the line number of the first of them.
    pattern: /^[ \t]*(?:skip|pending)\b/gm,
    runner: "RSpec/minitest",
    mask: (content) => maskNonCode(content, RUBY_NON_CODE),
  },
  {
    extensions: [".cs"],
    // `Skip` takes no closing quote: the mask blanks the reason string
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
    mask: (content) => maskNonCode(content, CSHARP_NON_CODE),
    narrow: narrowCSharpSkip,
  },
];

/**
 * The finding for one matched construct, worded for the rule it is filed under.
 *
 * Two `issue(...)` calls rather than one over a computed code and severity.
 * Read statically: `tests/core/issueCodeUniqueness.test.ts` asks that every
 * error-capable code state what a clean run asserts. It cannot follow a code
 * carried in a value, and a rule invisible to the ratchet is one nothing holds
 * to that contract.
 */
/**
 * A dialect covers a file extension, and one extension can be two runners.
 *
 * `.spec.ts` is a Playwright file as readily as a vitest one, and the finding
 * tells the operator what a stub costs them — "silent in vitest/jest" of a
 * Playwright spec names a runner the file never reaches. The import is the
 * evidence: a Playwright test file has to bring `test` in from
 * `@playwright/test`, and no other kind of file does.
 *
 * The config is not consulted. A `testDir` in `playwright.config.*` would have
 * to be read, resolved and matched per file, and it answers a question the
 * file itself already answers.
 */
const PLAYWRIGHT_IMPORT =
  /\bfrom\s*(['"])@playwright\/test\1|\brequire\(\s*(['"])@playwright\/test\2/;

/** The runner named in a finding about `content`. */
function runnerOf(dialect: StubDialect, content: string): string {
  return dialect.runner === "vitest/jest" && PLAYWRIGHT_IMPORT.test(content)
    ? "Playwright"
    : dialect.runner;
}

function stubIssue(
  relFile: string,
  runner: string,
  matchedKind: string,
  lineNumber: number,
  column: number,
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
          `A skipped test is silent in ${runner} and rots as missed work. ` +
          `Drop the skip modifier to put it back in the run.`,
        skippedTestSeverity,
        relFile,
        "validation.testStrategy.forbidTestTodoStubs",
        [matchedKind],
        "canonical",
        // A `.skip` keeps its body, so "delete the stub" is the wrong first
        // move here: followed literally it throws away a working test.
        "Remove the skip modifier so the test runs again — restore " +
          "`it` / `test` / `describe`, implementing the body first if it is " +
          "still empty. Do not delete a test that already has one. No waiver " +
          "reaches this finding; setting " +
          "`validation.testStrategy.forbidTestTodoStubs: false` in " +
          "qfai.config.yaml turns the whole check off instead.",
      )
    : issue(
        "QFAI-TEST-001",
        `Test stub found: ${where}. ` +
          `Stubs are silent in ${runner} and rot as missed work. ` +
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
  // The column is what separates two stubs written on one line. `full` runs
  // this validator twice — once per profile — and dedupes the overlap; keyed on
  // the line alone, `it.todo("a"); it.todo("b");` collapsed to a single finding
  // and the second stub was reported nowhere.
  found.loc = { line: lineNumber, column };
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
 * The dialect's blanking passes run first: {@link StubDialect.mask} takes the
 * spans that hold the construct's text without executing it out of the scan,
 * and {@link StubDialect.narrow} follows for a token whose meaning depends on
 * where it sits (C#'s `Skip`). Scanning the whole file is what lets a pattern
 * reach across a newline at all, so {@link StubDialect.spansLines} gates
 * whether a match may carry one; it defaults to the narrow behaviour, so a
 * dialect added later cannot inherit that hazard silently, and `mask` is
 * required rather than optional for the same reason.
 */
function collectStubIssues(
  relFile: string,
  content: string,
  dialect: StubDialect,
  skippedTestSeverity: IssueSeverity,
): Issue[] {
  const issues: Issue[] = [];
  // An unfilled scaffold is `D-SCAFFOLD-PLACEHOLDER`'s, and its `it.skip` is
  // what this scan would otherwise read as a parked suite. The marker is the
  // scaffold's own, so it is gone the moment the block is authored — after
  // which a `.skip` left behind is a hand-written one and is reported.
  const scaffolded = content.includes(SCAFFOLD_PLACEHOLDER_MARKER);
  // Offsets and line breaks survive both passes, so a match position in the
  // scanned text is still a position in the file the finding names.
  const masked = dialect.mask(content);
  const scannable = dialect.narrow ? dialect.narrow(masked) : masked;
  const runner = runnerOf(dialect, content);
  // matchAll yields matches in ascending offset order, so the line counter is
  // carried forward from the previous match instead of re-counting from the
  // top of the file: the whole scan stays linear however many stubs are found.
  // The docstring also promises one issue per occurrence, and matchAll walks
  // every match (the dialect regexes all carry the `g` flag) rather than
  // stopping at the first one on a line.
  let scanned = 0;
  let lineNumber = 1;
  // Offset just past the last newline seen, so the column is one subtraction
  // rather than a re-scan of the line.
  let lineStart = 0;
  for (const match of scannable.matchAll(dialect.pattern)) {
    // Advanced before the newline gate below, so a rejected match still leaves
    // the counter on the offset it reached.
    const between = scannable.slice(scanned, match.index);
    const breaks = between.split("\n").length - 1;
    lineNumber += breaks;
    if (breaks > 0) {
      lineStart = scanned + between.lastIndexOf("\n") + 1;
    }
    scanned = match.index;
    if (!dialect.spansLines && match[0].includes("\n")) {
      continue;
    }
    if (isRuntimeSkip(match, match.index + match[0].length, scannable, content)) {
      continue;
    }
    // The whitespace a fallback label carries can now include the newline the
    // match spanned, and `refs` / the message are single-line surfaces.
    const matchedKind = dialect.label ? dialect.label(match) : match[0].trim().replace(/\s+/g, " ");
    const isSkip = dialect.isSkip?.(match) === true;
    if (isSkip && scaffolded) {
      continue;
    }
    issues.push(
      stubIssue(
        relFile,
        runner,
        matchedKind,
        lineNumber,
        match.index - lineStart + 1,
        isSkip,
        skippedTestSeverity,
      ),
    );
  }
  return issues;
}

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
 * Test sources only. Fixtures and data files (`.json`, `.md`, `.yml`, `.sql`)
 * sit beside acceptance tests everywhere and never hold a stub, so disclaiming
 * them would be noise rather than coverage information. `.feature` is on this
 * side of that line: Gherkin is the acceptance suite itself on a Cucumber
 * stack, it is what the standard ATDD glob and the shipped config comment point
 * at, and a suite written entirely in it selected no file at all — an
 * unconditionally clean gate over a directory nothing had read.
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
  "feature",
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
    // Before the fixed spans: a `%r'…'` opener would otherwise reach its quote
    // first, and a `/` is not a span opener at all.
    const regex = syntax.regexOpener ? syntax.regexOpener(content, i) : null;
    if (regex) {
      i = maskSpan(content, blank, i, regex);
      continue;
    }
    const raw = syntax.rawStringOpener
      ? matchRawStringOpener(content, i, syntax.rawStringOpener)
      : null;
    if (raw) {
      i = maskRawString(content, blank, i, raw);
      continue;
    }
    const format = syntax.formatStringOpener
      ? matchFormatStringOpener(content, i, syntax.formatStringOpener)
      : null;
    if (format) {
      i = maskFormatString(content, blank, i, format);
      continue;
    }
    const long = syntax.longStringOpener
      ? matchLongStringOpener(content, i, syntax.longStringOpener)
      : null;
    if (long !== null) {
      i = maskLongString(content, blank, i, long);
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
  if (tag === undefined) return null;
  // `<<TAG` with no squiggle, dash or quotes is the one form that is also a
  // valid expression: `rows <<ITEM` pushes the constant `ITEM` onto `rows`.
  // Read as a heredoc it has no terminator, the body blanks to end of file,
  // and every real `pending` / `skip` after it disappears from the scan — a
  // clean gate over a file nobody checked. So this form is only a heredoc when
  // the file actually holds its terminator line; the unambiguous forms keep
  // blanking to EOF, where an unterminated body is a syntax error rather than
  // another reading.
  const ambiguous = /^<<[A-Z_]/.test(match[0]);
  if (ambiguous && !hasHeredocTerminator(content, opener.lastIndex, tag)) return null;
  return { tag, length: match[0].length };
}

/** Whether a line holding exactly `tag` follows `from`. */
function hasHeredocTerminator(content: string, from: number, tag: string): boolean {
  let i = content.indexOf("\n", from);
  while (i !== -1) {
    const lineEnd = content.indexOf("\n", i + 1);
    const line = content.slice(i + 1, lineEnd === -1 ? content.length : lineEnd);
    if (line.trim() === tag) return true;
    i = lineEnd;
  }
  return false;
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

/** The opening delimiter of a C#-style long string, or `null`. */
function matchLongStringOpener(content: string, start: number, opener: RegExp): string | null {
  opener.lastIndex = start;
  const match = opener.exec(content);
  return match ? match[0] : null;
}

/**
 * Blanks a verbatim or raw string whole, line breaks included; returns the
 * index just past it.
 *
 * Unterminated, it blanks to end of file — the direction every other opener
 * here takes, which can suppress a finding but never invent one.
 */
function maskLongString(
  content: string,
  blank: (index: number) => void,
  start: number,
  open: string,
): number {
  for (let k = start; k < start + open.length; k += 1) blank(k);
  let i = start + open.length;
  // The `$` of an interpolated spelling changes neither closing rule, so the
  // two forms are told apart by the `@` alone.
  if (open.includes("@")) {
    while (i < content.length) {
      if (content[i] === '"') {
        // `""` is one escaped quote inside a verbatim string, not the end.
        if (content[i + 1] === '"') {
          blank(i);
          blank(i + 1);
          i += 2;
          continue;
        }
        blank(i);
        return i + 1;
      }
      blank(i);
      i += 1;
    }
    return i;
  }
  // A raw string closes on a run of at least as many quotes as opened it. The
  // interpolation `$`s are not part of that count.
  const quotes = open.replace(/^\$+/, "").length;
  while (i < content.length) {
    if (content[i] === '"') {
      let run = 0;
      while (content[i + run] === '"') run += 1;
      if (run >= quotes) {
        for (let k = i; k < i + run; k += 1) blank(k);
        return i + run;
      }
      for (let k = i; k < i + run; k += 1) blank(k);
      i += run;
      continue;
    }
    blank(i);
    i += 1;
  }
  return i;
}

/** The f-string opened at `start`, or `null` when none is. */
function matchFormatStringOpener(
  content: string,
  start: number,
  opener: RegExp,
): { prefix: string; quote: string; length: number } | null {
  // The prefix has to begin a token. In `perf"x"` the `f"` is the tail of an
  // identifier followed by an ordinary string, not an f-string opener.
  if (start > 0 && /\w/.test(content[start - 1] ?? "")) {
    return null;
  }
  opener.lastIndex = start;
  const match = opener.exec(content);
  if (!match) {
    return null;
  }
  return { prefix: match[1] ?? "", quote: match[2] ?? "", length: match[0].length };
}

/**
 * Blanks the literal halves of a format string and leaves its replacement
 * fields as code; returns the index just past the whole literal.
 *
 * `f"{pytest.skip('later')}"` evaluates the field when the string is built, so
 * the test really is skipped — blanking the literal whole took the only
 * evidence of that out of the scan, and the finding this validator exists for
 * was never emitted. `{{` and `}}` are literal braces and open no field.
 *
 * Brace depth is counted so a quote inside a field cannot be read as the
 * closer; a quote inside a *string* inside a field can still be, which is the
 * limit of a scanner that is not a Python lexer. That direction leaves text
 * exposed rather than blanking code, so it can only cost a false positive on a
 * construct no acceptance suite writes, never hide a stub.
 */
function maskFormatString(
  content: string,
  blank: (index: number) => void,
  start: number,
  open: { prefix: string; quote: string; length: number },
): number {
  const escaped = !/[rR]/.test(open.prefix);
  const multiline = open.quote.length === 3;
  for (let k = start; k < start + open.length; k += 1) blank(k);
  let i = start + open.length;
  let depth = 0;
  while (i < content.length) {
    if (content[i] === "\n" && !multiline) {
      return i;
    }
    if (depth > 0) {
      // Inside a field: the text is code and stays. Only the braces are
      // counted, so the closing quote is not read out of one.
      if (content[i] === "{") depth += 1;
      else if (content[i] === "}") {
        depth -= 1;
        if (depth === 0) blank(i);
      }
      i += 1;
      continue;
    }
    if (escaped && content[i] === "\\") {
      blank(i);
      if (i + 1 < content.length) blank(i + 1);
      i += 2;
      continue;
    }
    if ((content[i] === "{" || content[i] === "}") && content[i + 1] === content[i]) {
      blank(i);
      blank(i + 1);
      i += 2;
      continue;
    }
    if (content[i] === "{") {
      blank(i);
      depth = 1;
      i += 1;
      continue;
    }
    if (content.startsWith(open.quote, i)) {
      for (let k = i; k < i + open.quote.length; k += 1) blank(k);
      return i + open.quote.length;
    }
    blank(i);
    i += 1;
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
  // A flat span is the depth-1 case of a nesting one, so one loop covers both.
  let depth = 1;
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
    if (span.nests && content.startsWith(span.open, i)) {
      for (let k = i; k < i + span.open.length; k += 1) blank(k);
      i += span.open.length;
      depth += 1;
      continue;
    }
    if (content.startsWith(span.close, i)) {
      for (let k = i; k < i + span.close.length; k += 1) blank(k);
      i += span.close.length;
      depth -= 1;
      if (depth === 0) return i;
      continue;
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

/**
 * The empty-glob form of `QFAI-TEST-002`: the gate is enabled, but file
 * selection is empty so nothing at all was scanned.
 *
 * `qfai init` ships `validation.traceability.testFileGlobs: []` on purpose, and
 * the config comment only accounts for the SC traceability gate the same key
 * governs. Returning no issues here made a never-executed stub scan
 * indistinguishable from a clean one — the exact non-result-read-as-result this
 * finding exists to prevent.
 *
 * `file` is the config file, not `root`: the thing to edit is
 * `validation.traceability.testFileGlobs` in qfai.config.yaml. Filing it against
 * `root` made `normalizeIssuePaths` render it as `.`, so validate.json, the
 * GitHub annotation and the report hotspot all blamed the repository root, and a
 * path-scoped waiver on qfai.config.yaml could never match it. Same convention
 * as the other config findings (`configReferenceIntegrity.ts`).
 */
function reportEmptyTestFileGlobs(): Issue {
  return issue(
    "QFAI-TEST-002",
    "テストスタブ検出は有効ですが、`validation.traceability.testFileGlobs` が空のため 0 ファイルしか scan していません。クリーンな結果はスタブ不在の証拠になりません",
    "info",
    "qfai.config.yaml",
    "validation.traceability.testFileGlobs",
    ["validation.traceability.testFileGlobs"],
    "canonical",
    "`/qfai-configure` を実行するか、qfai.config.yaml の `validation.traceability.testFileGlobs` にリポジトリのテスト配置を設定してください。設定するまで QFAI-TEST-001 は 1 件も検出できません。",
  );
}

/**
 * The truncation form of `QFAI-TEST-002`: the selection was cut at the limit and
 * the files past it were never opened.
 *
 * Dropping `truncated` made that indistinguishable from a scanned-and-clean
 * run, so a suite larger than the limit could carry a stub through
 * `--fail-on error` untouched — the same non-result-read-as-result the other two
 * forms of this code exist to prevent.
 *
 * The remedy depends on where the selection came from, so the finding branches
 * on it. A caller that brings its own globs — the ATDD gate scans the acceptance
 * directories — is not reading `validation.traceability.testFileGlobs` at all,
 * and telling its operator to narrow that key names a setting that cannot
 * change the outcome. `validation.traceability.testFileExcludeGlobs` is applied
 * on both paths, so it is the one key that helps on either.
 *
 * The count is of files **read**, and it is the limit itself:
 * `collectFilesByGlobs` stops the stream once it has that many and never learns
 * how many more would have matched. Saying "matched" claimed a total the scan
 * had not measured.
 */
function reportTruncatedScan(limit: number, callerGlobs: boolean): Issue {
  const key = callerGlobs
    ? "validation.traceability.testFileExcludeGlobs"
    : "validation.traceability.testFileGlobs";
  const selection = callerGlobs
    ? "the acceptance directories this gate scans"
    : "`validation.traceability.testFileGlobs`";
  const remedy = callerGlobs
    ? "Widen `validation.traceability.testFileExcludeGlobs` in qfai.config.yaml so the selection fits under the limit and every acceptance test is actually read."
    : "Narrow `validation.traceability.testFileGlobs`, or widen `validation.traceability.testFileExcludeGlobs`, so the selection fits under the limit and every acceptance test is actually read.";
  return issue(
    "QFAI-TEST-002",
    `The stub scan read the first ${limit} files of ${selection} and stopped at that limit, so the rest were never opened. A clean result is not evidence that they hold no stub.`,
    "info",
    "qfai.config.yaml",
    key,
    [key],
    "canonical",
    remedy,
  );
}

export async function validateTestTodoStubs(
  root: string,
  config: QfaiConfig,
  options: TestTodoStubOptions = {},
): Promise<Issue[]> {
  if (!config.validation.testStrategy.forbidTestTodoStubs) {
    return [];
  }

  // Normalised before the emptiness test, not after: the config loader accepts
  // `testFileGlobs: ["   "]`, and a raw-length check reads that as configured
  // while fast-glob matches nothing — a zero-file scan with no QFAI-TEST-002,
  // the silent non-result this finding exists to stop. `collectScTestReferences`
  // normalises the same key the same way, so both scan one file set.
  const globs = normalizeGlobs(options.globs ?? config.validation.traceability.testFileGlobs);
  if (globs.length === 0) {
    return [reportEmptyTestFileGlobs()];
  }

  const excludeGlobs = Array.from(
    new Set([
      ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
      ...config.validation.traceability.testFileExcludeGlobs,
    ]),
  );

  const { files, truncated, limit } = await collectFilesByGlobs(root, {
    globs: Array.from(globs),
    ignore: excludeGlobs,
    limit: DEFAULT_GLOB_FILE_LIMIT,
  });

  const skippedTestSeverity = "error";

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

  if (truncated) {
    // The third state a clean result can mean.
    issues.push(reportTruncatedScan(limit, options.globs !== undefined));
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
