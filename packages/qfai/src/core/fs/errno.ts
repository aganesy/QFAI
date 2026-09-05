/**
 * Shared errno helpers for Node.js fs error narrowing.
 *
 * Avoids ad-hoc `(err as { code?: string }).code === "ENOENT"` repetition
 * across init / config / prototyping commands. Future errno codes
 * (`EACCES`, `EBUSY`, `EPERM`, ...) extend this module rather than
 * sprouting new inline checks.
 */

/**
 * True iff `err` is a Node.js fs error whose `code` is `"ENOENT"`
 * (file or directory does not exist).
 */
export function isEnoent(err: unknown): boolean {
  return hasErrnoCode(err) && err.code === "ENOENT";
}

/**
 * True iff `err` is a Node.js fs error whose `code` is `"EPERM"`.
 *
 * On Windows this is what `stat` raises for a **file** symlink whose target is
 * a directory: the link is intact and `readlink` returns the right target, but
 * the reparse tag is the wrong kind and the OS refuses to follow it. `git
 * worktree add` produces exactly that for `.claude/skills/*`, because at the
 * moment git writes the link its target does not yet exist in the new worktree
 * and it has no reftype hint. So a reader that treats EPERM as a filesystem
 * fault to propagate crashes on a condition that is structural damage to the
 * path it is inspecting.
 */
export function isEperm(err: unknown): boolean {
  return hasErrnoCode(err) && err.code === "EPERM";
}

/**
 * True iff `err` is a Node.js error-shaped object carrying a string
 * `code` (e.g. `"ENOENT"`, `"EACCES"`, `"ENOSPC"`). Narrowing helper
 * shared across the codebase so individual call sites do not sprout
 * ad-hoc `(err as { code?: string }).code` casts (CLAUDE.md
 * "avoid bare `as` type assertions; prefer type narrowing").
 */
export function hasErrnoCode(err: unknown): err is { code: string } {
  return (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}
