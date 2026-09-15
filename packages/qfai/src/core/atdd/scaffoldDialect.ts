/**
 * Per-stack skeleton dialects for `qfai atdd scaffold`.
 *
 * The scaffold is the only command qfai ships that PRODUCES ATDD test files,
 * and `QFAI-ATDD-112` — the `error`-severity gate that CONSUMES them — derives
 * its scan pattern from `validation.traceability.testFileGlobs`
 * (`deriveAtddFilePattern`). The writer used to emit `<TC>.test.ts`
 * unconditionally, so on a project whose globs derive `{feature,markdown,md,py}`
 * the file the command had just written was outside the scan: the documented
 * happy path (scaffold -> fill in -> validate) could not discharge the
 * obligation it exists to discharge, at any point in the cycle.
 *
 * The dialect is therefore selected from the SAME config key the scan reads, so
 * the writer and the gate cannot disagree about which extension counts.
 *
 * Selection happens twice over that key, because the gate and the project's own
 * runner read it at different resolutions:
 *
 *   1. the derived EXTENSION set picks the dialect AND the emitted extension —
 *      a `tests/**\/*.test.js` project gets `.test.js`, not `.test.ts`, which
 *      the scan (`**\/*.{feature,js,markdown,md}`) would never open;
 *   2. the configured PATHS pick between the dialects' naming conventions — a
 *      project whose globs only allow `*_test.py` gets `<tc>_test.py`, not
 *      `test_<tc>.py`, and a project whose globs cover `src/**` only gets
 *      nothing at all, because the writer's own
 *      `<testsDir>/integration/<spec-id>/` is not a directory those globs
 *      reach. The scan widens to the bare extension and would have counted the
 *      annotation either way, so an un-collectable file would have cleared
 *      `QFAI-ATDD-112` while never running once. The project's EXCLUDE globs
 *      decide the same question from the other side and are applied here too:
 *      `collectScTestReferences` hands them to fast-glob as `ignore`, so a
 *      destination they cover is a destination the normal test scan skips.
 *
 * When no path this writer would produce is admitted by the configured globs,
 * the caller refuses rather than emitting a test nothing executes.
 */

import { readTestFileExtensions } from "../atddTraceability.js";
import { BraceRangeRefused, braceRangeMembers } from "../globBraceRange.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";

/**
 * One naming convention a dialect can emit under: the extension it selects on,
 * a human-readable shape for operator-facing messages, and the basename
 * builder itself.
 */
type ScaffoldNaming = {
  /** Extension that selects this naming out of the derived scan set. */
  readonly extension: string;
  /** Rendered in refusal messages, e.g. `test_<tc_id>.py`. */
  readonly shape: string;
  /** Basename of the emitted skeleton for a given TC. */
  fileName(tcId: string): string;
};

/** A stack's skeleton shape, before a naming convention is chosen for it. */
type ScaffoldDialectTemplate = {
  /** Stable identifier, used in operator-facing messages and tests. */
  readonly id: "js-ts" | "python";
  /** Named in operator-facing messages, so they are not vitest-shaped everywhere. */
  readonly runner: string;
  /** Line-comment prefix carrying the annotation header and TODO markers. */
  readonly commentPrefix: string;
  /**
   * Glob — relative to a scaffold directory — matching every basename this
   * dialect can emit. `D-SCAFFOLD-PLACEHOLDER` globs the union of these, so a
   * skeleton this writer emitted is always a skeleton that validator can still
   * see.
   */
  readonly placeholderGlob: string;
  /** Naming conventions in preference order; the first match wins. */
  readonly namings: readonly ScaffoldNaming[];
  /** Body lines emitted below the annotation header. */
  buildBody(tcId: string): string[];
};

/** A dialect with one naming convention bound to it — what the writer uses. */
export type ScaffoldDialect = {
  readonly id: ScaffoldDialectTemplate["id"];
  readonly runner: string;
  readonly commentPrefix: string;
  readonly placeholderGlob: string;
  /** The extension actually emitted, chosen out of the derived scan set. */
  readonly extension: string;
  /** Basename of the emitted skeleton for a given TC. */
  fileName(tcId: string): string;
  /** Body lines emitted below the annotation header. */
  buildBody(tcId: string): string[];
};

const PLACEHOLDER_REASON = "pending — scaffold placeholder";

/** `TC-0001-0002` -> `tc_0001_0002` — the pytest naming convention. */
function toSnakeCase(tcId: string): string {
  return tcId.toLowerCase().replace(/-/g, "_");
}

/**
 * `TC-0001-0002` -> `Test_TC_0001_0002` — the class holding the skeleton.
 *
 * Not PEP8's CapWords, deliberately: the TC id has to stay readable in the
 * failure output, and the `Test` prefix is what pytest's default
 * `python_classes` looks for.
 */
function toTestClassName(tcId: string): string {
  return `Test_${tcId.replace(/-/g, "_")}`;
}

/**
 * JS/TS extensions in emit preference order. `ts` leads so an unconfigured
 * project — and a project that allows several — keeps the output it had.
 */
const JS_TS_EXTENSIONS = ["ts", "mts", "cts", "tsx", "js", "mjs", "cjs", "jsx"] as const;

/** `*.test.*` before `*.spec.*`: both are configured in the wild, one is default. */
const JS_TS_INFIXES = ["test", "spec"] as const;

const JS_TS_NAMINGS: readonly ScaffoldNaming[] = JS_TS_EXTENSIONS.flatMap((extension) =>
  JS_TS_INFIXES.map((infix) => ({
    extension,
    shape: `<TC-ID>.${infix}.${extension}`,
    fileName: (tcId: string) => `${tcId}.${infix}.${extension}`,
  })),
);

const JS_TS_DIALECT: ScaffoldDialectTemplate = {
  id: "js-ts",
  runner: "vitest",
  commentPrefix: "//",
  placeholderGlob: `**/*.{${JS_TS_INFIXES.join(",")}}.{${JS_TS_EXTENSIONS.join(",")}}`,
  namings: JS_TS_NAMINGS,
  buildBody: (tcId) => [
    `import { describe, it } from "vitest";`,
    "",
    `describe(${JSON.stringify(tcId)}, () => {`,
    `  // TODO: implement assertion for ${tcId}`,
    `  it.skip(${JSON.stringify(PLACEHOLDER_REASON)}, () => {`,
    `    // TODO: implement assertion for ${tcId}`,
    `  });`,
    `});`,
  ],
};

const PYTHON_DIALECT: ScaffoldDialectTemplate = {
  id: "python",
  runner: "pytest (unittest-compatible)",
  commentPrefix: "#",
  // Both pytest collector conventions; the glob and the namings below are the
  // same two shapes, so `D-SCAFFOLD-PLACEHOLDER` reads exactly the emitted
  // files whichever one the project's globs selected.
  placeholderGlob: "**/{test_*.py,*_test.py}",
  namings: [
    {
      extension: "py",
      shape: "test_<tc_id>.py",
      fileName: (tcId: string) => `test_${toSnakeCase(tcId)}.py`,
    },
    {
      extension: "py",
      shape: "<tc_id>_test.py",
      fileName: (tcId: string) => `${toSnakeCase(tcId)}_test.py`,
    },
  ],
  // Deliberately NOT `@pytest.mark.skip` / `pytest.skip(...)`, the literal
  // translation of the JS `it.skip(...)`: those are the silent-placeholder
  // constructs `QFAI-TEST-001` reports as an `error`, so emitting one would
  // hand the operator, from the command itself, a finding the same tool
  // forbids. An unimplemented obligation is left in the Red state TDD expects
  // instead — `D-SCAFFOLD-PLACEHOLDER` still tracks and escalates it.
  //
  // The skeleton is a `unittest.TestCase` rather than a module-level
  // `def test_...`, because `testFileGlobs` names extensions, never runners:
  // `.py` alone cannot tell pytest from unittest, and `python -m unittest
  // discover` collects NO module-level function. A bare `def test_...` would
  // therefore have let a unittest project retire the TODO and the sentinel —
  // clearing `QFAI-ATDD-112` and `D-SCAFFOLD-PLACEHOLDER` on the annotation
  // alone — while the obligation had never once been executed. A TestCase
  // subclass is collected by BOTH runners, so no runner detection (or extra
  // config the operator would have to supply) is needed to keep the gate
  // honest.
  buildBody: (tcId) => [
    `import unittest`,
    "",
    "",
    `class ${toTestClassName(tcId)}(unittest.TestCase):`,
    `    def test_${toSnakeCase(tcId)}(self) -> None:`,
    `        # TODO: implement assertion for ${tcId}`,
    `        raise NotImplementedError(${JSON.stringify(PLACEHOLDER_REASON)})`,
  ],
};

/**
 * Dialect table, in selection order. JS/TS first so a mixed repository — and
 * the default config, whose `testFileGlobs` is empty — keeps the output it had.
 */
const SCAFFOLD_DIALECTS: readonly ScaffoldDialectTemplate[] = [JS_TS_DIALECT, PYTHON_DIALECT];

/** Runner names this command can emit for, for operator-facing refusals. */
export const SCAFFOLD_RUNNERS: readonly string[] = SCAFFOLD_DIALECTS.map(
  (dialect) => dialect.runner,
);

/** Bind one naming convention to its template — the writer's view of a dialect. */
function bindNaming(template: ScaffoldDialectTemplate, naming: ScaffoldNaming): ScaffoldDialect {
  return {
    id: template.id,
    runner: template.runner,
    commentPrefix: template.commentPrefix,
    placeholderGlob: template.placeholderGlob,
    extension: naming.extension,
    fileName: (tcId: string) => naming.fileName(tcId),
    buildBody: (tcId: string) => template.buildBody(tcId),
  };
}

/** Requires a non-empty namings table; every dialect above declares one. */
function firstNaming(template: ScaffoldDialectTemplate): ScaffoldNaming {
  const naming = template.namings[0];
  if (naming === undefined) {
    throw new Error(`scaffold dialect ${template.id} declares no naming convention`);
  }
  return naming;
}

/** The dialect used when the project's globs recover no extension at all. */
export const DEFAULT_SCAFFOLD_DIALECT: ScaffoldDialect = bindNaming(
  JS_TS_DIALECT,
  firstNaming(JS_TS_DIALECT),
);

/** Every glob `D-SCAFFOLD-PLACEHOLDER` must read to see this writer's output. */
export const SCAFFOLD_PLACEHOLDER_GLOBS: readonly string[] = Array.from(
  new Set(SCAFFOLD_DIALECTS.map((dialect) => dialect.placeholderGlob)),
);

/** One skeleton this writer could have emitted for a TC, with its dialect. */
export type ScaffoldSkeletonCandidate = {
  /** Basename the naming convention produces for the TC. */
  readonly fileName: string;
  /** The dialect that would have written it — its body shape and comment prefix. */
  readonly dialect: ScaffoldDialect;
};

/**
 * Every skeleton this writer can emit for one TC, across every dialect and
 * naming convention.
 *
 * Used by the command to find skeletons an EARLIER run left under a different
 * convention: once the dialect follows the config, a project scaffolded before
 * that (or before its globs changed) has a `<TC>.test.ts` next to the new
 * `test_<tc>.py` for the same TC, and `D-SCAFFOLD-PLACEHOLDER` globs both.
 *
 * The dialect travels with the basename because retiring one of those files
 * requires knowing the body it was born with: only a skeleton still identical
 * to what its own dialect emits may be deleted.
 */
export function scaffoldSkeletonCandidates(tcId: string): ScaffoldSkeletonCandidate[] {
  const seen = new Set<string>();
  const candidates: ScaffoldSkeletonCandidate[] = [];
  for (const template of SCAFFOLD_DIALECTS) {
    for (const naming of template.namings) {
      const fileName = naming.fileName(tcId);
      if (seen.has(fileName)) continue;
      seen.add(fileName);
      candidates.push({ fileName, dialect: bindNaming(template, naming) });
    }
  }
  return candidates;
}

/** Outcome of matching a project's configured globs against this table. */
export type ScaffoldDialectResolution =
  | { readonly outcome: "resolved"; readonly dialect: ScaffoldDialect }
  /** Extensions were recovered, but qfai has no skeleton shape for any of them. */
  | { readonly outcome: "unsupported-stack" }
  /**
   * The stack is known, but every path this writer would emit for it is
   * excluded by the project's own globs — by its basename convention, by the
   * directory it lands in (when the destination is known), or by an explicit
   * `testFileExcludeGlobs` entry covering that directory. Either way the file
   * would be scanned by `QFAI-ATDD-112` (which widens to the bare extension)
   * while never being collected by the runner: coverage cleared by a test that
   * never runs.
   *
   * `shapes` name the whole destination path when one was supplied, and the
   * basename shape alone when it was not.
   */
  | { readonly outcome: "naming-mismatch"; readonly shapes: readonly string[] };

/**
 * Representative TC id used to probe a candidate basename against the
 * configured globs when the caller names no ids. Every naming above is a pure
 * function of the id's shape, so the probe decides for every id a glob without
 * a brace range admits.
 */
const PROBE_TC_ID = "TC-0000-0000";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Last path segment of a glob — the basename convention it prescribes. */
function globBasename(glob: string): string {
  // Separators are already folded; a `/` or a backslash inside a bracket
  // expression is a member, not a boundary.
  let lastSlash = -1;
  for (let index = 0; index < glob.length; index += 1) {
    const close = glob[index] === "[" ? findClassClose(glob, index) : -1;
    if (close !== -1) {
      index = close;
      continue;
    }
    if (glob[index] === "/") lastSlash = index;
  }
  return lastSlash === -1 ? glob : glob.slice(lastSlash + 1);
}

/**
 * Extglob prefixes fast-glob (picomatch) accepts, mapped to the regex
 * quantifier each applies to its own alternation. `!` is a negation rather
 * than a quantifier and is expanded separately below.
 */
const EXTGLOB_QUANTIFIERS: Readonly<Record<string, string>> = {
  "@": "",
  "?": "?",
  "*": "*",
  "+": "+",
};

/** Index of the `closer` balancing the opener at `open`, or -1 when unterminated. */
function findGroupClose(pattern: string, open: number, opener: string, closer: string): number {
  let depth = 0;
  for (let index = open; index < pattern.length; index += 1) {
    const char = pattern[index];
    // A bracket expression is skipped whole: a `)` or a `}` written inside one
    // is a member of the class, and read as a closer it ended the group early
    // and rejected a candidate the project's own scan collects.
    if (char === "[") {
      const classClose = findClassClose(pattern, index);
      if (classClose !== -1) {
        index = classClose;
        continue;
      }
    }
    // A brace group is skipped whole for the same reason, and for one more: a
    // member of it can spell the closer. `@(.test{)..)}.ts` expands to
    // `@(.test).ts` before anything is compiled, so the `)` between the braces
    // is not this group's close — read as one it ended the group at a place the
    // expansion never puts it.
    if (opener !== "{" && char === "{") {
      const braceClose = findGroupClose(pattern, index, "{", "}");
      if (braceClose !== -1) {
        index = braceClose;
        continue;
      }
    }
    if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/**
 * Split a group's interior on its top-level separator: `,` in a brace list and
 * `|` in an extended group. Each is a literal in the other kind, so
 * `@(a.md,b.md)` names one file with a comma in its name.
 */
function splitGlobAlternatives(inner: string, separator: "|" | ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index] ?? "";
    // A bracket expression is copied whole: a `,` or a `|` inside one is a
    // member of the class, and split on it the alternatives came apart into
    // fragments that match nothing.
    if (char === "[") {
      const classClose = findClassClose(inner, index);
      if (classClose !== -1) {
        current += inner.slice(index, classClose + 1);
        index = classClose;
        continue;
      }
    }
    if (char === "(" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "}") {
      depth -= 1;
    } else if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

/**
 * The characters that mean something to a matcher rather than naming themselves.
 *
 * `@`, `+` and `!` are here because each opens an extglob before a `(`, and `(`
 * for the other side of the same pair: a range expanding to either half leaves
 * a group the matcher reads, not a literal. So is `/`: a member carrying one
 * moves the boundary the segments either side are read against.
 */
const GLOB_SYNTAX = /[*?[\]{}@+!()/]/;

/**
 * The pattern with one brace group written out, when a member of it carries
 * glob syntax; `null` when no group does.
 *
 * fast-glob expands a brace before it compiles anything, so a member and what
 * stands beside it are read together: `tests/{*..*}*\/x` expands to
 * `tests/**\/x`, whose globstar crosses directories. Compiled group by group,
 * the same two stars are two segment-local wildcards, and the path the
 * globstar admits is refused.
 *
 * Only such a group is written out. A range of digits or letters carries no
 * syntax to combine with anything, and expanding it here would multiply the
 * pattern by a thousand for nothing.
 *
 * @throws {BraceRangeRefused} for a numeric range fast-glob refuses to expand.
 */
function expandMetaBrace(pattern: string): string[] | null {
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    // A group inside a bracket expression or an extglob is written out whatever
    // its members are. fast-glob expands the brace first and compiles what
    // comes out, so `[0-{1..3}]` is three classes and `*({0..1})` is two
    // quantified groups — neither of which the one pattern they were read as
    // says: `[0-{` admits every digit, and `(?:0|1)*` admits the mixtures the
    // two separate patterns exclude.
    if (char === "[") {
      const classClose = findClassClose(pattern, index);
      if (classClose !== -1) {
        const written = writeOutFirstBrace(pattern, index + 1, classClose);
        if (written !== null) return written;
        index = classClose;
        continue;
      }
    }
    if (pattern[index + 1] === "(" && "@?*+!".includes(char)) {
      const groupClose = findGroupClose(pattern, index + 1, "(", ")");
      if (groupClose !== -1) {
        const written = writeOutFirstBrace(pattern, index + 2, groupClose);
        if (written !== null) return written;
        index = groupClose;
        continue;
      }
    }
    if (char !== "{") continue;
    const close = findGroupClose(pattern, index, "{", "}");
    if (close === -1) continue;
    const members = braceMembers(pattern.slice(index + 1, close));
    // A group standing on its own is written out only where a member carries
    // syntax to combine with what stands beside it. A range of digits or
    // letters carries none, and expanding it here would multiply the pattern by
    // a thousand for nothing.
    if (members === null || !members.some((member) => GLOB_SYNTAX.test(member))) {
      index = close;
      continue;
    }
    return substituted(pattern, index, close, members);
  }
  return null;
}

/** The first brace group between `from` and `until`, written out; `null` for none. */
function writeOutFirstBrace(pattern: string, from: number, until: number): string[] | null {
  for (let index = from; index < until; index += 1) {
    if (pattern[index] !== "{") continue;
    const close = findGroupClose(pattern, index, "{", "}");
    if (close === -1 || close > until) continue;
    const members = braceMembers(pattern.slice(index + 1, close));
    if (members === null) continue;
    return substituted(pattern, index, close, members);
  }
  return null;
}

/** A brace body's members: a list's alternatives, or a range's values. */
function braceMembers(body: string): readonly string[] | null {
  const alternatives = splitGlobAlternatives(body, ",");
  if (alternatives.length > 1) return alternatives.map((alternative) => alternative.trim());
  return braceRangeMembers(body);
}

/** The pattern with the group between `open` and `close` replaced by each member. */
function substituted(
  pattern: string,
  open: number,
  close: number,
  members: readonly string[],
): string[] {
  const head = pattern.slice(0, open);
  const tail = pattern.slice(close + 1);
  return members.map((member) => `${head}${member}${tail}`);
}

/**
 * Whether the character at `index` is the first of its path segment.
 *
 * `atStart` is what the caller knows about the fragment's own position. An
 * alternative compiled out of a group carries the group's position, since
 * `@(a|*)` after literal text is inside the segment wherever the alternative
 * begins; read without it, every alternative looked segment-leading and the
 * guard refused an ordinary dot in the middle of a name.
 */
function opensSegment(pattern: string, index: number, atStart: boolean): boolean {
  return index === 0 ? atStart : pattern[index - 1] === "/";
}

/**
 * Compile one glob into regex source.
 *
 * Handles the constructs fast-glob's own matcher does inside a single path
 * segment: `*`, `?`, brace alternation `{a,b}`, a brace range `{1..5}` or
 * `{a..e}`, and the extglob forms
 * `@(a|b)`, `?(a|b)`, `*(a|b)`, `+(a|b)`, `!(a|b)`. Alternatives are compiled
 * recursively, so a wildcard nested in a group keeps its meaning. The
 * cross-segment globstar `**` is handled too, so a whole configured glob —
 * directories included — can be matched against a whole candidate path.
 *
 * Extglob support is not cosmetic: `tests/**\/*.@(test|spec).ts` is a valid and
 * common fast-glob pattern that the emitted `<TC-ID>.test.ts` satisfies. An
 * escape-everything matcher declared it a `naming-mismatch` and made the
 * command exit 1 on an ordinary TypeScript project.
 *
 * `!(a|b)` uses picomatch's own expansion — a negative lookahead followed by a
 * lazy segment wildcard — so this matcher agrees with fast-glob there too.
 */
/**
 * What a wildcard may match, which is not the same question for every caller.
 *
 * The scan this matcher stands in for runs fast-glob at its default, where a
 * wildcard passes over a name beginning with a dot. A caller reading a record's
 * citations wants the other reading — it matches the hidden name and reports it
 * separately — so the dialect is the caller's to state, and a caller that says
 * nothing gets the permissive one.
 */
export type GlobDialect = { readonly dot: boolean };

const MATCHES_HIDDEN_NAMES: GlobDialect = { dot: true };

export function compileGlob(
  pattern: string,
  dialect: GlobDialect = MATCHES_HIDDEN_NAMES,
  atSegmentStart = true,
): string {
  const expanded = expandMetaBrace(pattern);
  if (expanded !== null) {
    return expanded.length === 0
      ? NEVER_MATCHES
      : `(?:${expanded.map((one) => compileGlob(one, dialect, atSegmentStart)).join("|")})`;
  }
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    if (pattern[index + 1] === "(" && "@?*+!".includes(char)) {
      const close = findGroupClose(pattern, index + 1, "(", ")");
      if (close !== -1) {
        const inSegment = opensSegment(pattern, index, atSegmentStart);
        const alternatives = splitGlobAlternatives(pattern.slice(index + 2, close), "|")
          .map((alternative) => compileGlob(alternative.trim(), dialect, inSegment))
          .join("|");
        source +=
          char === "!"
            ? `(?:(?!(?:${alternatives}))[^/]*?)`
            : `(?:${alternatives})${EXTGLOB_QUANTIFIERS[char] ?? ""}`;
        index = close;
        continue;
      }
    }
    if (char === "*" && pattern[index + 1] === "*") {
      // Globstar, only when it occupies a whole segment — picomatch degrades
      // `a**b` to a single `*`, and so does this.
      const precededByBoundary = index === 0 || pattern[index - 1] === "/";
      const afterIndex = index + 2;
      // A globstar written next to another matches no more than one does, and
      // two quantified groups side by side try every split of the segments
      // between them: ten in a row took seconds against one deep path.
      // Compared against the spelling THIS dialect emits. Read against the
      // other one, an adjacent globstar was not recognised as one, and two
      // quantified groups side by side tried every split of the segments
      // between them — measured at two minutes on one deep path.
      const wholeSegments = dialect.dot ? SEGMENTS_ANY : SEGMENTS_GLOBSTAR;
      const followsGlobstar = source.endsWith(wholeSegments);
      if (precededByBoundary && afterIndex >= pattern.length) {
        const guard = dialect.dot ? "" : NOT_A_DOT_NAME;
        const segments = `${guard}[^/]*(?:/${guard}[^/]*)*`;
        source = `${followsGlobstar ? source.slice(0, -wholeSegments.length) : source}${segments}`;
        index = afterIndex - 1;
        continue;
      }
      if (precededByBoundary && pattern[afterIndex] === "/") {
        // `**/` matches zero or more whole segments, so `tests/**\/*.py` still
        // matches `tests/a.py`.
        if (!followsGlobstar) source += wholeSegments;
        index = afterIndex;
        continue;
      }
      source += `${!dialect.dot && opensSegment(pattern, index, atSegmentStart) ? NOT_A_DOT_NAME : ""}[^/]*`;
      index = afterIndex - 1;
      continue;
    }
    if (char === "*") {
      source += `${!dialect.dot && opensSegment(pattern, index, atSegmentStart) ? NOT_A_DOT_NAME : ""}[^/]*`;
      continue;
    }
    if (char === "?") {
      source += `${!dialect.dot && opensSegment(pattern, index, atSegmentStart) ? NOT_A_DOT_NAME : ""}[^/]`;
      continue;
    }
    if (char === "{") {
      const close = findGroupClose(pattern, index, "{", "}");
      if (close !== -1) {
        source += compileBraces(
          pattern.slice(index + 1, close),
          dialect,
          opensSegment(pattern, index, atSegmentStart),
        );
        index = close;
        continue;
      }
    }
    if (char === "[") {
      // A bracket class, which fast-glob supports and an escape-everything
      // matcher reads as four literal characters. `[!a-z]` is the glob spelling
      // of a negated class; a regular expression spells it `[^a-z]`.
      const close = findClassClose(pattern, index);
      if (close !== -1) {
        const body = pattern.slice(index + 1, close);
        const negated = body.startsWith("!") || body.startsWith("^");
        // A class never reaches across a separator, whatever it spells. A
        // range holding `/` — `[.-9]` does — otherwise matched the separator
        // itself, and a destination the project's own scan cannot reach was
        // accepted as one it could. A lookahead holds it out in both forms:
        // written into a negated class beside the members, it made a range with
        // a leading hyphen, and `[!-a-z]` excluded every capital letter.
        const members = compileClassBody(body.slice(negated ? 1 : 0));
        const compiled = `(?!/)[${negated ? "^" : ""}${members}]`;
        // A class the author wrote wrongly — a descending range, say — matches
        // nothing, which is what the project's own scan does with it. Left to
        // build a regular expression it threw instead, out of a command whose
        // answer for a pattern nothing matches is a refusal.
        source += isUsableExpression(compiled) ? compiled : NEVER_MATCHES;
        index = close;
        continue;
      }
    }
    source += escapeRegExp(char);
  }
  return source;
}

/**
 * What stands before a wildcard that opens a segment.
 *
 * The scan runs fast-glob with its default `dot: false`, where a wildcard does
 * not match a name beginning with a dot — measured: `*\/**\/*.test.ts` collects
 * nothing under `.tests`, while the pattern naming `.tests` itself does. Without
 * this the matcher admitted a destination under a dot directory that the
 * project's own scan never reads.
 */
const NOT_A_DOT_NAME = "(?!\\.)";

/** What `**\/` compiles to: zero or more whole segments, none of them hidden. */
const SEGMENTS_GLOBSTAR = `(?:${NOT_A_DOT_NAME}[^/]*/)*`;

/** The same, for a caller whose wildcards read a hidden name like any other. */
const SEGMENTS_ANY = "(?:[^/]*/)*";

/** An expression that matches nothing, for a class the author wrote wrongly. */
const NEVER_MATCHES = "(?!)";

/** Whether a fragment is one a regular expression can be built from. */
function isUsableExpression(source: string): boolean {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}

/**
 * Where the bracket expression opened at `open` ends, or `-1`.
 *
 * Two things make a `]` something other than the terminator: one written first
 * in the class, where it is an ordinary member, and the `]` that closes a named
 * class. A scan for the first `]` stops inside `[[:digit:]]` and compiles a
 * class over the characters of the word `digit`, which matches none of the names
 * the pattern was written for.
 *
 * A named class is the only element the matcher reads inside a class: `[:`, a
 * name its table carries, and `:]`. Every other `[` is a member, so `[[.T]`
 * holds `[`, `.` and `T` and ends at its own `]`, however far a later `.]` is.
 */
export function findClassClose(pattern: string, open: number): number {
  let index = open + 1;
  if (pattern[index] === "!" || pattern[index] === "^") index += 1;
  if (pattern[index] === "]") index += 1;
  while (index < pattern.length) {
    const char = pattern[index];
    // An escaped member is a member, `]` included.
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "]") return index;
    index = namedClassAt(pattern, index)?.end ?? index + 1;
  }
  return -1;
}

/**
 * The named classes the matcher accepts, as regular-expression members.
 *
 * A regular expression has no POSIX class, so each is written out. Left as it
 * stands, `[[:digit:]]` compiles to a class of `[`, `:` and the letters of
 * `digit`.
 *
 * Written exactly as the matcher's own table writes them, order included: a
 * member beside a named class can join its first range, so `[T-[:alpha:]]` is
 * the valid `[T-a-zA-Z]` there, and with the ranges swapped it was the
 * descending `T-A`, a class that matches nothing.
 */
const POSIX_CLASS_MEMBERS: Readonly<Record<string, string>> = {
  alnum: "a-zA-Z0-9",
  alpha: "a-zA-Z",
  ascii: "\\x00-\\x7F",
  blank: " \\t",
  cntrl: "\\x00-\\x1F\\x7F",
  digit: "0-9",
  graph: "\\x21-\\x7E",
  lower: "a-z",
  print: "\\x20-\\x7E ",
  punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
  space: " \\t\\r\\n\\v\\f",
  upper: "A-Z",
  word: "A-Za-z0-9_",
  xdigit: "A-Fa-f0-9",
};

/** The named class written at `index`, when the matcher's table carries the name. */
function namedClassAt(text: string, index: number): { members: string; end: number } | null {
  const named = /\[:([a-z]+):\]/y;
  named.lastIndex = index;
  const name = named.exec(text)?.[1];
  if (name === undefined || !Object.hasOwn(POSIX_CLASS_MEMBERS, name)) return null;
  return { members: POSIX_CLASS_MEMBERS[name] ?? "", end: named.lastIndex };
}

/**
 * One bracket expression's members, as a regular expression writes them.
 *
 * Ranges pass through — `a-z` means the same on both sides — and only the two
 * characters that would end the class early are escaped. A named class is
 * written out from the table. Any other `[` is a member, as it is to the
 * matcher: `[[:TC:]]` is a class of `[`, `:`, `T` and `C` followed by a literal
 * `]`, and so is never the `TC-` a skeleton name starts with.
 */
function compileClassBody(body: string): string {
  let source = "";
  let index = 0;
  while (index < body.length) {
    const named = namedClassAt(body, index);
    if (named !== null) {
      source += named.members;
      index = named.end;
      continue;
    }
    const char = body[index] ?? "";
    // The matcher reads a backslash as escaping the member after it, so `[\-T]`
    // names a hyphen and `T`. Copied as a backslash member, it made a range
    // no expression accepts, and the class matched nothing.
    if (char === "\\" && index + 1 < body.length) {
      const member = body[index + 1] ?? "";
      source += /[\\\][^-]/.test(member) ? `\\${member}` : member;
      index += 2;
      continue;
    }
    source += char === "\\" || char === "]" ? `\\${char}` : char;
    index += 1;
  }
  return source;
}

/**
 * One brace group, given its interior. A list expands to its members and a
 * range to the values it spans. A body that is neither stays text, braces
 * included, as fast-glob leaves `{a}` and `{1..}`. A list's own members are
 * not read as ranges, so `{0..2,9}` names the text `0..2`; only a brace group
 * nested in the list, as `{{0..2},9}` has, expands.
 *
 * @throws {BraceRangeRefused} for a numeric range fast-glob refuses to expand.
 */
function compileBraces(body: string, dialect: GlobDialect, atSegmentStart: boolean): string {
  const alternatives = splitGlobAlternatives(body, ",");
  if (alternatives.length > 1) {
    return `(?:${alternatives
      .map((alternative) => compileGlob(alternative.trim(), dialect, atSegmentStart))
      .join("|")})`;
  }
  const members = braceRangeMembers(body);
  // The braces stay as text, so what stands between them is inside the segment.
  if (members === null) return `\\{${compileGlob(body, dialect, false)}\\}`;
  // Expanded first and compiled after, as fast-glob does it, so a member the
  // expansion produces is glob syntax there and here alike: `{*..*}` expands
  // to `*`, which selects every name and not a literal star.
  const compiled = members.map((member) => compileGlob(member, dialect, atSegmentStart)).join("|");
  return members.length === 0 ? NEVER_MATCHES : `(?:${compiled})`;
}

/** `./tests/**\/*.py` -> `tests/**\/*.py`; backslashes folded to POSIX. */
function normalizeGlobPath(value: string): string {
  // A backslash inside a bracket expression escapes a member, as `[\]T]` does;
  // outside one it is a Windows separator.
  let folded = "";
  for (let index = 0; index < value.length; index += 1) {
    const close = value[index] === "[" ? findClassClose(value, index) : -1;
    if (close !== -1) {
      folded += value.slice(index, close + 1);
      index = close;
      continue;
    }
    folded += value[index] === "\\" ? "/" : (value[index] ?? "");
  }
  return folded.replace(/^\.\//, "");
}

/**
 * Compile configured globs into matchers for a candidate path.
 *
 * When the caller knows where the skeleton will be written, the WHOLE glob is
 * matched against the WHOLE repo-relative path. Matching the basename alone
 * was not enough: a project whose globs are `src/**\/test_*.py` accepts the
 * `test_<tc>.py` name, so the writer emitted
 * `tests/integration/<spec-id>/test_<tc>.py` — a path those globs do not
 * cover, and therefore a file the project's own test scan never collects.
 * `QFAI-ATDD-112` widens to the bare extension and counted the annotation
 * anyway, so filling the placeholder in cleared the coverage gate with a test
 * that never ran — the exact outcome this selection exists to prevent, one
 * axis over.
 *
 * The basename-only form remains for callers with no destination in hand
 * (`scaffoldDir` omitted): it is the weaker check, never the wrong one.
 *
 * Matching is CASE-SENSITIVE, because fast-glob is: `collectFilesByGlobs`
 * never sets `caseSensitiveMatch`, whose default is `true`. An `i` flag here
 * made `tests/**\/TEST_*.py` accept the lowercase `test_<tc>.py` this writer
 * emits, which on a case-sensitive filesystem the project's own scan then does
 * not collect — the same "coverage cleared by a test that never runs" outcome,
 * arrived at through the matcher instead of the path.
 *
 * Blank entries are dropped exactly as `normalizeGlobs` drops them for the
 * scan, so both sides agree on which globs are configured at all.
 */
/** A compiled matcher for a pattern that selects nothing. */
const NEVER_MATCHES_PATTERN = /(?!)/;

/** One list of configured globs, compiled. */
type CompiledGlobs = {
  readonly matchers: readonly RegExp[];
  /**
   * One of the globs holds a brace range fast-glob refuses to expand. It throws
   * while compiling, for the whole call rather than for that pattern, so the
   * scan collects no file at all — which is what the glob being an include or
   * an exclude both come to. The caller admits no destination either way.
   */
  readonly refused: boolean;
};

function compileGlobMatchers(patterns: readonly string[], matchWholePath: boolean): CompiledGlobs {
  const matchers: RegExp[] = [];
  let refused = false;
  for (const pattern of patterns) {
    const normalized = normalizeGlobPath(pattern.trim());
    if (normalized === "") continue;
    const source = matchWholePath ? normalized : globBasename(normalized);
    try {
      matchers.push(new RegExp(`^${compileGlob(source, { dot: false })}$`));
    } catch (error) {
      if (!(error instanceof BraceRangeRefused)) throw error;
      refused = true;
      matchers.push(NEVER_MATCHES_PATTERN);
    }
  }
  return { matchers, refused };
}

/**
 * Basenames `SCAFFOLD_PLACEHOLDER_GLOBS` collect, as matchers.
 *
 * Exported for the one caller that has to answer "does that validator scan this
 * file" without running its scan. Basename rather than whole path: every
 * placeholder glob names a basename pattern under a globstar, and the
 * directory half is the caller's own containment check.
 */
export function scaffoldPlaceholderBasenameMatchers(): RegExp[] {
  return [...compileGlobMatchers(SCAFFOLD_PLACEHOLDER_GLOBS, false).matchers];
}

/** Where the writer will put the skeleton, when the caller knows it. */
export type ScaffoldDialectOptions = {
  /**
   * Repo-relative POSIX directory the skeleton lands in
   * (`tests/integration/<spec-id>`). Given, the configured globs are matched
   * against the full destination path rather than its basename alone.
   *
   * Omitted when the destination is not expressible relative to the repo root
   * (an absolute `paths.testsDir` pointing outside it), where a whole-path
   * comparison against repo-relative globs would be meaningless.
   */
  readonly scaffoldDir?: string;
  /**
   * `validation.traceability.testFileExcludeGlobs` — the patterns
   * `collectScTestReferences` hands fast-glob as `ignore`. A destination they
   * cover is a destination the project's normal test scan skips, while
   * `QFAI-ATDD-112` still widens to the bare extension and counts the
   * annotation, so an included-but-excluded path clears the coverage gate with
   * a test nothing collects. Only meaningful alongside `scaffoldDir`: an
   * exclude glob describes a location, and there is none to test without one.
   */
  readonly excludeGlobs?: readonly string[];
  /**
   * The test case ids the run writes a skeleton for. Given, a naming is chosen
   * only when the globs admit the file it would write for every one of them,
   * since a brace range can make a glob depend on an id's digits. Omitted, a
   * representative id stands in for all of them.
   */
  readonly tcIds?: readonly string[];
};

/** One (dialect, naming) pair the project's configured extensions admit. */
type ScaffoldCandidate = {
  readonly template: ScaffoldDialectTemplate;
  readonly naming: ScaffoldNaming;
};

/**
 * Every skeleton this table can emit under an extension the project
 * configured, in table order.
 *
 * Across ALL dialects, not the first one whose extension appears: a repository
 * that configures `src/**\/*.test.ts` and `tests/**\/*.py` has both, and
 * locking onto the JS/TS template — because it leads the table — left the
 * Python candidates unevaluated. Only the JS/TS paths were then matched
 * against the globs, none of them reached
 * `<testsDir>/integration/<spec-id>/`, and the command exited 1 with
 * `naming-mismatch` on a project for which a perfectly good Python skeleton
 * existed one table row down.
 */
function admissibleCandidates(extensions: ReadonlySet<string>): ScaffoldCandidate[] {
  const candidates: ScaffoldCandidate[] = [];
  for (const template of SCAFFOLD_DIALECTS) {
    for (const naming of template.namings) {
      // Only the extensions the project actually configured: emitting
      // `.test.ts` to a `tests/**\/*.test.js` project put the file inside the
      // scanned directory with an extension `deriveAtddFilePattern` never opens.
      if (extensions.has(naming.extension)) {
        candidates.push({ template, naming });
      }
    }
  }
  return candidates;
}

/**
 * Pick the skeleton dialect — and the naming convention within it — for a
 * project from its configured `testFileGlobs` / `testFileExcludeGlobs`.
 *
 * The caller refuses on either non-`resolved` outcome rather than writing a
 * file no gate reads (`unsupported-stack`) or one no runner collects
 * (`naming-mismatch`) — the misleading outcomes this selection exists to
 * remove.
 */
export function resolveScaffoldDialect(
  testFileGlobs: readonly string[],
  options: ScaffoldDialectOptions = {},
): ScaffoldDialectResolution {
  const scaffoldDir =
    options.scaffoldDir === undefined ? undefined : normalizeGlobPath(options.scaffoldDir);
  const matchWholePath = scaffoldDir !== undefined && scaffoldDir !== "";
  /** The path the writer would produce for `fileName`, as the globs see it. */
  const candidatePath = (fileName: string): string =>
    scaffoldDir === undefined || scaffoldDir === "" ? fileName : `${scaffoldDir}/${fileName}`;
  // Compiled before the extensions are read, because a glob the scan cannot
  // compile is one that collects nothing whatever extension it names — and a
  // pattern whose refused range hides the rest of it names none at all, which
  // the unconfigured-project fallback below would read as a project that
  // configured nothing.
  const includes = compileGlobMatchers(testFileGlobs, matchWholePath);
  // Read over the whole glob whether or not the destination is known: a refused
  // range in the directory half is what stops the scan, and a basename-only
  // compile never sees it.
  const scannable = matchWholePath
    ? !includes.refused
    : !compileGlobMatchers(testFileGlobs, true).refused;
  const { extensions, overBound } = readTestFileExtensions(testFileGlobs);
  if (!scannable) {
    return {
      outcome: "naming-mismatch",
      shapes: [candidatePath(DEFAULT_SCAFFOLD_DIALECT.fileName(PROBE_TC_ID))],
    };
  }
  // The defaults are unioned in because BOTH scans apply them
  // (`collectScTestReferences` and the ATDD scan itself), so a scaffold
  // directory under `dist/` or `out/` is invisible to every reader of it.
  // Excludes are skipped entirely without a destination: an exclude glob names
  // a location, and matching one by basename would reject on `**` alone.
  //
  // Compiled before the fallback below, not after: an exclude fast-glob refuses
  // stops the call it is in, so the project's scan collects nothing, and an
  // include set naming no extension would otherwise have taken the default and
  // written a file that scan never opens.
  const excludes = matchWholePath
    ? compileGlobMatchers(
        [...DEFAULT_TEST_FILE_EXCLUDE_GLOBS, ...(options.excludeGlobs ?? [])],
        true,
      )
    : { matchers: [], refused: false };
  if (excludes.refused) {
    return {
      outcome: "naming-mismatch",
      shapes: [candidatePath(DEFAULT_SCAFFOLD_DIALECT.fileName(PROBE_TC_ID))],
    };
  }
  if (overBound) {
    // Extensions this read could not recover. Taking the default here writes a
    // skeleton under an extension the project's own globs may not select, and
    // the refusal names the shape it would have written.
    return {
      outcome: "naming-mismatch",
      shapes: [candidatePath(DEFAULT_SCAFFOLD_DIALECT.fileName(PROBE_TC_ID))],
    };
  }
  if (extensions.size === 0) {
    // Same fallback the scan takes (`DEFAULT_TEST_FILE_GLOB`), so an
    // unconfigured project still gets the vitest skeleton the scan reads.
    return { outcome: "resolved", dialect: DEFAULT_SCAFFOLD_DIALECT };
  }
  const candidates = admissibleCandidates(extensions);
  if (candidates.length === 0) {
    return { outcome: "unsupported-stack" };
  }
  // A refused range stops fast-glob compiling the call it is in, so the
  // project's scan collects nothing and no destination this writer could
  // choose is one that scan reads. An exclude holding one is the case a matcher
  // that excludes nothing read as an exclusion that does not apply, and the
  // skeleton was written under an include the same refusal had already stopped.
  const admits = (candidate: string): boolean =>
    includes.matchers.some((matcher) => matcher.test(candidate)) &&
    !excludes.matchers.some((matcher) => matcher.test(candidate));
  const tcIds =
    options.tcIds !== undefined && options.tcIds.length > 0 ? options.tcIds : [PROBE_TC_ID];
  const chosen = candidates.find(({ naming }) =>
    tcIds.every((tcId) => admits(candidatePath(naming.fileName(tcId)))),
  );
  if (chosen === undefined) {
    // The shapes name the whole destination when one is known, so the refusal
    // says which path the globs rejected rather than only which basename.
    return {
      outcome: "naming-mismatch",
      shapes: candidates.map(({ naming }) => candidatePath(naming.shape)),
    };
  }
  return { outcome: "resolved", dialect: bindNaming(chosen.template, chosen.naming) };
}
