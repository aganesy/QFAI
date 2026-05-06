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

function hasErrnoCode(err: unknown): err is { code: string } {
  return (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}
