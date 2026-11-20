/**
 * Decoding of the paths git prints in a diff header.
 *
 * Shared by the repository-root guards that read `git diff` output, so each one
 * decodes a quoted path the same way.
 */
import { Buffer } from "node:buffer";

/**
 * The path a `---` or `+++` header names, with the quoting git applies when the
 * path holds a character it will not print raw.
 *
 * A quoted path left as it is names no tracked file and matches no path
 * prefix, so the file reads as untouched and what it changed goes unchecked.
 */
export function headerPath(raw) {
  if (!raw.startsWith('"')) return raw;
  const body = raw.slice(1, raw.endsWith('"') ? -1 : undefined);
  const bytes = [];
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] !== "\\") {
      bytes.push(...Buffer.from(body[i], "utf-8"));
      continue;
    }
    const next = body[i + 1] ?? "";
    const named = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 }[next];
    if (named !== undefined) {
      bytes.push(named);
      i += 1;
      continue;
    }
    const octal = /^[0-7]{1,3}/.exec(body.slice(i + 1))?.[0];
    if (octal === undefined) {
      // Not an escape git writes. Kept as the backslash it is, so a path
      // carrying one is not silently shortened.
      bytes.push(92);
      continue;
    }
    bytes.push(Number.parseInt(octal, 8));
    i += octal.length;
  }
  return Buffer.from(bytes).toString("utf-8");
}
