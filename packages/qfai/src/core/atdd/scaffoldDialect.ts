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

import { deriveTestFileExtensions } from "../atddTraceability.js";
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
 * configured globs. Every naming above is a pure function of the id's shape,
 * not its digits, so one probe decides for all of them.
 */
const PROBE_TC_ID = "TC-0000-0000";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Last path segment of a glob — the basename convention it prescribes. */
function globBasename(glob: string): string {
  const normalized = glob.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
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
 * Split a group's interior on its top-level separators. `,` (braces) and `|`
 * (extglob) are both accepted in both group kinds: no real glob relies on the
 * other one being a literal, and conflating them keeps one splitter.
 */
function splitGlobAlternatives(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of inner) {
    if (char === "(" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "}") {
      depth -= 1;
    } else if ((char === "," || char === "|") && depth === 0) {
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
 * Compile one glob into regex source.
 *
 * Handles the constructs fast-glob's own matcher does inside a single path
 * segment: `*`, `?`, brace alternation `{a,b}`, and the extglob forms
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
function compileGlob(pattern: string): string {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    if (pattern[index + 1] === "(" && "@?*+!".includes(char)) {
      const close = findGroupClose(pattern, index + 1, "(", ")");
      if (close !== -1) {
        const alternatives = splitGlobAlternatives(pattern.slice(index + 2, close))
          .map((alternative) => compileGlob(alternative.trim()))
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
      if (precededByBoundary && afterIndex >= pattern.length) {
        source += "[^/]*(?:/[^/]*)*";
        index = afterIndex - 1;
        continue;
      }
      if (precededByBoundary && pattern[afterIndex] === "/") {
        // `**/` matches zero or more whole segments, so `tests/**\/*.py` still
        // matches `tests/a.py`.
        source += "(?:[^/]*/)*";
        index = afterIndex;
        continue;
      }
      source += "[^/]*";
      index = afterIndex - 1;
      continue;
    }
    if (char === "*") {
      source += "[^/]*";
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    if (char === "{") {
      const close = findGroupClose(pattern, index, "{", "}");
      if (close !== -1) {
        const alternatives = splitGlobAlternatives(pattern.slice(index + 1, close))
          .map((alternative) => compileGlob(alternative.trim()))
          .join("|");
        source += `(?:${alternatives})`;
        index = close;
        continue;
      }
    }
    source += escapeRegExp(char);
  }
  return source;
}

/** `./tests/**\/*.py` -> `tests/**\/*.py`; backslashes folded to POSIX. */
function normalizeGlobPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
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
function compileGlobMatchers(patterns: readonly string[], matchWholePath: boolean): RegExp[] {
  const matchers: RegExp[] = [];
  for (const pattern of patterns) {
    const normalized = normalizeGlobPath(pattern.trim());
    if (normalized === "") continue;
    const source = matchWholePath ? normalized : globBasename(normalized);
    matchers.push(new RegExp(`^${compileGlob(source)}$`));
  }
  return matchers;
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
  const extensions = deriveTestFileExtensions(testFileGlobs);
  if (extensions.size === 0) {
    // Same fallback the scan takes (`DEFAULT_TEST_FILE_GLOB`), so an
    // unconfigured project still gets the vitest skeleton the scan reads.
    return { outcome: "resolved", dialect: DEFAULT_SCAFFOLD_DIALECT };
  }
  const candidates = admissibleCandidates(extensions);
  if (candidates.length === 0) {
    return { outcome: "unsupported-stack" };
  }
  const includes = compileGlobMatchers(testFileGlobs, matchWholePath);
  // The defaults are unioned in because BOTH scans apply them
  // (`collectScTestReferences` and the ATDD scan itself), so a scaffold
  // directory under `dist/` or `out/` is invisible to every reader of it.
  // Excludes are skipped entirely without a destination: an exclude glob names
  // a location, and matching one by basename would reject on `**` alone.
  const excludes = matchWholePath
    ? compileGlobMatchers(
        [...DEFAULT_TEST_FILE_EXCLUDE_GLOBS, ...(options.excludeGlobs ?? [])],
        true,
      )
    : [];
  const admits = (candidate: string): boolean =>
    includes.some((matcher) => matcher.test(candidate)) &&
    !excludes.some((matcher) => matcher.test(candidate));
  const chosen = candidates.find(({ naming }) =>
    admits(candidatePath(naming.fileName(PROBE_TC_ID))),
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
