export const DEFAULT_TEST_FILE_EXCLUDE_GLOBS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.qfai/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
  "**/out/**",
];

/**
 * Trim and drop empty entries. Exported so every caller that scans with
 * `collectFilesByGlobs` normalises its globs the same way, instead of reporting
 * on a different file set.
 *
 * This is the one policy for a configured test glob, a `!` exclusion and a
 * `testFileExcludeGlobs` entry alike: whitespace at either end is padding, a
 * blank entry selects nothing, and whitespace inside a path component is kept.
 * A path that begins or ends with a space is therefore written with a wildcard
 * (`?` or `[ ]`) in place of that space.
 */
export function normalizeGlobs(globs: readonly string[]): string[] {
  return globs.map((glob) => glob.trim()).filter((glob) => glob.length > 0);
}
