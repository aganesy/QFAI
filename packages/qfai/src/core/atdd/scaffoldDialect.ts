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
 */

import { deriveTestFileExtensions } from "../atddTraceability.js";

/** One emitted-skeleton shape: file naming, comment syntax and body. */
export type ScaffoldDialect = {
  /** Stable identifier, used in operator-facing messages and tests. */
  readonly id: "js-ts" | "python";
  /** Extensions that select this dialect out of the derived scan set. */
  readonly extensions: readonly string[];
  /** Named in operator-facing messages, so they are not vitest-shaped everywhere. */
  readonly runner: string;
  /** Line-comment prefix carrying the annotation header and TODO markers. */
  readonly commentPrefix: string;
  /**
   * Glob — relative to a scaffold directory — matching this dialect's output.
   * `D-SCAFFOLD-PLACEHOLDER` globs the union of these, so a skeleton this
   * writer emitted is always a skeleton that validator can still see.
   */
  readonly placeholderGlob: string;
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

const JS_TS_DIALECT: ScaffoldDialect = {
  id: "js-ts",
  extensions: ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"],
  runner: "vitest",
  commentPrefix: "//",
  placeholderGlob: "**/*.test.{ts,tsx,mts,js,mjs,jsx,cts,cjs}",
  fileName: (tcId) => `${tcId}.test.ts`,
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

const PYTHON_DIALECT: ScaffoldDialect = {
  id: "python",
  extensions: ["py"],
  runner: "pytest",
  commentPrefix: "#",
  // `test_*.py` is what this dialect writes; the collector convention and the
  // glob agree so `D-SCAFFOLD-PLACEHOLDER` reads exactly the emitted files.
  placeholderGlob: "**/test_*.py",
  fileName: (tcId) => `test_${toSnakeCase(tcId)}.py`,
  // Deliberately NOT `@pytest.mark.skip` / `pytest.skip(...)`, the literal
  // translation of the JS `it.skip(...)`: those are the silent-placeholder
  // constructs `QFAI-TEST-001` reports as an `error`, so emitting one would
  // hand the operator, from the command itself, a finding the same tool
  // forbids. An unimplemented obligation is left in the Red state TDD expects
  // instead — `D-SCAFFOLD-PLACEHOLDER` still tracks and escalates it.
  buildBody: (tcId) => [
    `def test_${toSnakeCase(tcId)}() -> None:`,
    `    # TODO: implement assertion for ${tcId}`,
    `    raise NotImplementedError(${JSON.stringify(PLACEHOLDER_REASON)})`,
  ],
};

/**
 * Dialect table, in selection order. JS/TS first so a mixed repository — and
 * the default config, whose `testFileGlobs` is empty — keeps the output it had.
 */
export const SCAFFOLD_DIALECTS: readonly ScaffoldDialect[] = [JS_TS_DIALECT, PYTHON_DIALECT];

/** The dialect used when the project's globs recover no extension at all. */
export const DEFAULT_SCAFFOLD_DIALECT: ScaffoldDialect = JS_TS_DIALECT;

/** Every glob `D-SCAFFOLD-PLACEHOLDER` must read to see this writer's output. */
export const SCAFFOLD_PLACEHOLDER_GLOBS: readonly string[] = Array.from(
  new Set(SCAFFOLD_DIALECTS.map((dialect) => dialect.placeholderGlob)),
);

/**
 * Pick the skeleton dialect for a project from its configured `testFileGlobs`.
 *
 * Returns `null` when the project's test extensions are recovered but qfai has
 * no skeleton shape for any of them (a Go or Ruby repository, say). The caller
 * refuses rather than writing a file no gate will read — the misleading
 * outcome this selection exists to remove.
 */
export function resolveScaffoldDialect(testFileGlobs: readonly string[]): ScaffoldDialect | null {
  const extensions = deriveTestFileExtensions(testFileGlobs);
  if (extensions.size === 0) {
    // Same fallback the scan takes (`DEFAULT_TEST_FILE_GLOB`), so an
    // unconfigured project still gets the vitest skeleton the scan reads.
    return DEFAULT_SCAFFOLD_DIALECT;
  }
  return (
    SCAFFOLD_DIALECTS.find((dialect) => dialect.extensions.some((ext) => extensions.has(ext))) ??
    null
  );
}
