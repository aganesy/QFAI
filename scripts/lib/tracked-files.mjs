/**
 * Enumeration of the tracked files a repository-root guard scans.
 *
 * Shared by the conflict-marker, bidi, repository-language, doc-clarity and
 * tracked-scratch guards, so each one lists the tree the same way. What a guard
 * does when git cannot answer is its own policy and stays with the guard.
 */
import { execFileSync } from "node:child_process";
import process from "node:process";

/**
 * Every tracked path, or only those under `pathspecs` when any are given, or
 * `null` when git cannot answer.
 *
 * `-z` because a path may carry a newline, and git quotes such a path in the
 * default output — a quoted path does not open.
 *
 * `null` is a distinct outcome rather than an empty list: a caller outside a
 * repository would otherwise get a clean run over nothing at all, which claims
 * a result this never established. No checkout, no git on PATH and output past
 * `maxBuffer` all reach `null` identically.
 */
export function trackedFiles(cwd = process.cwd(), pathspecs = []) {
  const scope = pathspecs.length > 0 ? ["--", ...pathspecs] : [];
  try {
    return execFileSync("git", ["ls-files", "-z", ...scope], {
      cwd,
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    })
      .toString("utf-8")
      .split("\0")
      .filter((entry) => entry !== "");
  } catch {
    return null;
  }
}
