/**
 * The one writer for `.github/required-status-contexts.json`.
 *
 * Two scripts re-pin that file — one the guard bytes, one the verification bodies — and both are
 * run by the dependency-update job, in that order, on a branch it then pushes. So whatever shape
 * they write is the shape that reaches a pull request.
 *
 * `JSON.stringify(value, null, 2)` is not that shape. It puts every array element on its own line;
 * Prettier keeps a short array on one line, and five arrays in this file are short. A re-pin
 * written with `JSON.stringify` alone therefore fails `format:check`, which is the first lane in
 * `ci:lint` — the update's digests end up correct and its pull request red, with a diff whose every
 * line is whitespace.
 *
 * Formatting through Prettier rather than by hand, and through the repository's own configuration
 * rather than a copy of it, so the file agrees with the check that reads it however either changes.
 */
import { writeFileSync } from "node:fs";

import * as prettier from "prettier";

/**
 * Writes `value` as JSON to `filePath`, formatted the way `format:check` expects.
 *
 * Prettier resolves its own configuration from the file's location, so a script calling this needs
 * to know nothing about the repository's formatting rules.
 */
export async function writeFormattedJson(filePath, value) {
  const options = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(JSON.stringify(value), {
    ...(options ?? {}),
    filepath: filePath,
  });
  writeFileSync(filePath, formatted, "utf-8");
}
