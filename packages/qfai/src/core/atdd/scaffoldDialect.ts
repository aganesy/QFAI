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
 *   2. the configured BASENAME shapes pick between that dialect's naming
 *      conventions — a project whose globs only allow `*_test.py` gets
 *      `<tc>_test.py`, not `test_<tc>.py`. The scan widens to the bare
 *      extension and would have counted the annotation either way, so an
 *      un-collectable file would have cleared `QFAI-ATDD-112` while never
 *      running once.
 *
 * When no naming this writer knows matches the configured shapes, the caller
 * refuses rather than emitting a test nothing executes.
 */

import { deriveTestFileExtensions } from "../atddTraceability.js";

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

/**
 * Every basename this writer can emit for one TC, across every dialect and
 * naming convention.
 *
 * Used by the command to find skeletons an EARLIER run left under a different
 * convention: once the dialect follows the config, a project scaffolded before
 * that (or before its globs changed) has a `<TC>.test.ts` next to the new
 * `test_<tc>.py` for the same TC, and `D-SCAFFOLD-PLACEHOLDER` globs both.
 */
export function scaffoldFileNameCandidates(tcId: string): string[] {
  return Array.from(
    new Set(
      SCAFFOLD_DIALECTS.flatMap((dialect) =>
        dialect.namings.map((naming) => naming.fileName(tcId)),
      ),
    ),
  );
}

/** Outcome of matching a project's configured globs against this table. */
export type ScaffoldDialectResolution =
  | { readonly outcome: "resolved"; readonly dialect: ScaffoldDialect }
  /** Extensions were recovered, but qfai has no skeleton shape for any of them. */
  | { readonly outcome: "unsupported-stack" }
  /**
   * The stack is known, but every basename this writer would emit for it is
   * excluded by the project's own globs — so the file would be scanned by
   * `QFAI-ATDD-112` (which widens to the bare extension) while never being
   * collected by the runner. Coverage cleared by a test that never runs.
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
 * Compile one glob basename into regex source.
 *
 * Handles the constructs fast-glob's own matcher does inside a single path
 * segment: `*`, `?`, brace alternation `{a,b}`, and the extglob forms
 * `@(a|b)`, `?(a|b)`, `*(a|b)`, `+(a|b)`, `!(a|b)`. Alternatives are compiled
 * recursively, so a wildcard nested in a group keeps its meaning.
 *
 * Extglob support is not cosmetic: `tests/**\/*.@(test|spec).ts` is a valid and
 * common fast-glob pattern that the emitted `<TC-ID>.test.ts` satisfies. An
 * escape-everything matcher declared it a `naming-mismatch` and made the
 * command exit 1 on an ordinary TypeScript project.
 *
 * `!(a|b)` uses picomatch's own expansion — a negative lookahead followed by a
 * lazy segment wildcard — so this matcher agrees with fast-glob there too.
 */
function compileBasenameGlob(pattern: string): string {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    if (pattern[index + 1] === "(" && "@?*+!".includes(char)) {
      const close = findGroupClose(pattern, index + 1, "(", ")");
      if (close !== -1) {
        const alternatives = splitGlobAlternatives(pattern.slice(index + 2, close))
          .map((alternative) => compileBasenameGlob(alternative.trim()))
          .join("|");
        source +=
          char === "!"
            ? `(?:(?!(?:${alternatives}))[^/]*?)`
            : `(?:${alternatives})${EXTGLOB_QUANTIFIERS[char] ?? ""}`;
        index = close;
        continue;
      }
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
          .map((alternative) => compileBasenameGlob(alternative.trim()))
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

/**
 * Compile one glob basename (`*.test.ts`, `*_test.py`, `*.@(test|spec).ts`)
 * into a matcher for a candidate filename.
 *
 * Deliberately basename-only: the directory half of `testFileGlobs` describes
 * where a project keeps its hand-written tests, while the scaffold's own
 * directory is fixed by `QFAI-ATDD-112` (`<testsDir>/integration/<spec-id>/`).
 * Matching whole paths would refuse a project whose only glob is, say,
 * `packages/*\/tests/**\/*.test.ts` — whose naming convention the writer
 * satisfies perfectly.
 */
function basenameMatcher(pattern: string): RegExp {
  return new RegExp(`^${compileBasenameGlob(pattern)}$`, "i");
}

/**
 * Pick the skeleton dialect — and the naming convention within it — for a
 * project from its configured `testFileGlobs`.
 *
 * The caller refuses on either non-`resolved` outcome rather than writing a
 * file no gate reads (`unsupported-stack`) or one no runner collects
 * (`naming-mismatch`) — the misleading outcomes this selection exists to
 * remove.
 */
export function resolveScaffoldDialect(
  testFileGlobs: readonly string[],
): ScaffoldDialectResolution {
  const extensions = deriveTestFileExtensions(testFileGlobs);
  if (extensions.size === 0) {
    // Same fallback the scan takes (`DEFAULT_TEST_FILE_GLOB`), so an
    // unconfigured project still gets the vitest skeleton the scan reads.
    return { outcome: "resolved", dialect: DEFAULT_SCAFFOLD_DIALECT };
  }
  const template = SCAFFOLD_DIALECTS.find((dialect) =>
    dialect.namings.some((naming) => extensions.has(naming.extension)),
  );
  if (template === undefined) {
    return { outcome: "unsupported-stack" };
  }
  // Only the extensions the project actually configured: emitting `.test.ts`
  // to a `tests/**\/*.test.js` project put the file inside the scanned
  // directory with an extension `deriveAtddFilePattern` never opens.
  const candidates = template.namings.filter((naming) => extensions.has(naming.extension));
  const matchers = testFileGlobs.map((glob) => basenameMatcher(globBasename(glob)));
  const chosen = candidates.find((naming) =>
    matchers.some((matcher) => matcher.test(naming.fileName(PROBE_TC_ID))),
  );
  if (chosen === undefined) {
    return { outcome: "naming-mismatch", shapes: candidates.map((naming) => naming.shape) };
  }
  return { outcome: "resolved", dialect: bindNaming(template, chosen) };
}
