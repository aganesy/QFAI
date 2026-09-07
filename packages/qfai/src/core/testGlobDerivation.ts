/**
 * The test-file globs `qfai init` writes into a new `qfai.config.yaml`.
 *
 * `validation.traceability.testFileGlobs` selects the files two gates read: the
 * SC traceability lane, and the stub scan behind `QFAI-TEST-001`. Shipping it
 * empty left both pointed at nothing on every fresh project — the stub gate
 * enabled and unable to fire however many stubs existed, and a clean result
 * that meant only "no file was opened". `QFAI-TEST-002` says so at `info`, but
 * it said so about the default rather than about the project.
 *
 * So the value is derived from the tree being initialised: each candidate below
 * is matched against the real repository, and only the ones that select at
 * least one file are written. A repository with no test file yet still gets
 * `[]`, and the notice it then produces is about that repository.
 *
 * The candidates are the layouts the config template already documents. This is
 * deliberately narrower than what `/qfai-configure` does — that skill proposes
 * exclude globs and spec sections too, and judges a project's real layout
 * rather than recognising a standard one. Tuning stays there; this only aims a
 * fresh project at the files it already has.
 */

import { collectFilesByGlobs } from "./fs.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";

/**
 * The layouts recognised at init, in the order they are written.
 *
 * Every entry appears in the `testFileGlobs` comment of the shipped
 * `qfai.config.yaml`, and `initTestGlobDerivation.test.ts` holds the two lists
 * equal — a candidate the template does not document would be written into a
 * project whose config gives the reader no account of it.
 */
export const CANDIDATE_TEST_FILE_GLOBS: readonly string[] = [
  "tests/**/*.test.ts",
  "src/**/*.spec.ts",
  "tests/**/test_*.py",
  "tests/**/*_test.py",
  "**/*_test.go",
  "src/test/**/*.java",
  "src/test/**/*.kt",
  "tests/**/*.rs",
  "features/**/*.feature",
];

/**
 * Those candidates that select at least one file under `root`.
 *
 * Matching is per candidate rather than one combined run: the result is the
 * list to write, so which candidate matched is the answer, not how many files
 * did. `limit: 1` stops each probe at the first hit, so a large repository
 * costs one directory walk per candidate and not a full enumeration.
 *
 * The default excludes apply, so a dependency's vendored tests do not make a
 * layout look present. Without them `**\/*_test.go` matches inside
 * `node_modules` on a repository with no Go in it at all. (The pattern carries
 * no backslash; one is written here because `*` followed by `/` would close
 * this comment.)
 */
export async function deriveTestFileGlobs(root: string): Promise<string[]> {
  const derived: string[] = [];
  for (const glob of CANDIDATE_TEST_FILE_GLOBS) {
    const result = await collectFilesByGlobs(root, {
      globs: [glob],
      ignore: [...DEFAULT_TEST_FILE_EXCLUDE_GLOBS],
      limit: 1,
    });
    if (result.matchedFileCount > 0) {
      derived.push(glob);
    }
  }
  return derived;
}

/** The line the shipped template carries, and the one this module replaces. */
export const EMPTY_TEST_FILE_GLOBS_LINE = "    testFileGlobs: []";

/**
 * `content` with its empty `testFileGlobs` replaced by `globs`.
 *
 * A targeted line replacement rather than a YAML round-trip: the template's
 * value is three lines of comment away from forty lines of comment, all of it
 * the reader's only account of what the key selects and why it may be empty.
 * Parsing and re-serialising drops every one of them.
 *
 * Returns `content` unchanged when `globs` is empty or the line is not present,
 * so a template whose shape has moved leaves the file alone instead of writing
 * a second `testFileGlobs` key. `initTestGlobDerivation.test.ts` fails on that
 * drift rather than letting it pass silently here.
 *
 * Both line endings are recognised, and the one found is the one written back.
 * A checkout under `core.autocrlf` gives the template CRLF, and matching `\n`
 * alone would leave every such project with the empty value this exists to
 * replace — silently, since a template whose shape has moved is the same
 * no-op.
 */
export function withDerivedTestFileGlobs(content: string, globs: readonly string[]): string {
  if (globs.length === 0) {
    return content;
  }
  const eol = ["\r\n", "\n"].find((candidate) =>
    content.includes(`${EMPTY_TEST_FILE_GLOBS_LINE}${candidate}`),
  );
  if (eol === undefined) {
    return content;
  }
  const rendered = globs.map((glob) => JSON.stringify(glob)).join(", ");
  const filled = EMPTY_TEST_FILE_GLOBS_LINE.replace("[]", `[${rendered}]`);
  // A function replacement: `$&` and its siblings are only special in the
  // string form, and the globs are values rather than a pattern.
  return content.replace(`${EMPTY_TEST_FILE_GLOBS_LINE}${eol}`, () => `${filled}${eol}`);
}
