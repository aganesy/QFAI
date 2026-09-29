import { execFileSync } from "node:child_process";

import { gitStdout } from "../../core/gitChanges.js";

/** The directory a 2.x project keeps out of git, relative to the project root. */
export const EVIDENCE_DIR = ".qfai/evidence";

/**
 * Whether a root `.gitignore` line re-includes `.qfai/evidence` or a path under
 * it. Leading whitespace is part of a gitignore pattern, so only trailing
 * whitespace is dropped before the line is read.
 */
export function reincludesEvidence(line: string): boolean {
  const trimmed = line.trimEnd();
  if (!trimmed.startsWith("!")) return false;
  const pattern = trimmed.slice(1).replace(/^\//, "");
  return pattern === EVIDENCE_DIR || pattern.startsWith(`${EVIDENCE_DIR}/`);
}

/**
 * The paths under `.qfai/evidence/` the git index tracks, or `null` when the
 * project is not in a git work tree. Git runs from an argument vector, so no
 * path reaches a shell.
 */
export function trackedEvidence(root: string): string[] | null {
  if (gitStdout(root, ["rev-parse", "--is-inside-work-tree"])?.trim() !== "true") return null;
  const listed = execFileSync("git", ["ls-files", "-z", "--", EVIDENCE_DIR], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return listed.split("\0").filter((entry) => entry !== "");
}

/** Removes every index entry under `.qfai/evidence/`; the files stay on disk. */
export function untrackEvidence(root: string): void {
  execFileSync("git", ["rm", "-r", "--cached", "--quiet", "--", EVIDENCE_DIR], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"],
  });
}
