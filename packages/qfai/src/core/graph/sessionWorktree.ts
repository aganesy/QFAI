import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";

/**
 * Resolve the Git working tree an event's cwd belongs to, within the checkout the hook was
 * installed in. A host-created worktree nested under that checkout (for example
 * `.claude/worktrees/<name>`) is its own working tree with its own `.git` entry, so it is
 * returned instead of the installing checkout. A cwd outside the checkout, an unreadable cwd or
 * a cwd with no nested working tree resolves to the installing checkout.
 */
export async function resolveSessionWorktree(root: string, cwd: string | undefined) {
  if (!cwd) return root;
  const base = path.resolve(root);
  let current: string;
  try {
    current = await realpath(path.resolve(cwd));
  } catch {
    return root;
  }
  if (!inside(base, current)) return root;
  while (path.relative(base, current) !== "") {
    if (await exists(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return root;
}

function inside(base: string, candidate: string) {
  const relative = path.relative(base, candidate);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function exists(file: string) {
  try {
    await lstat(file);
    return true;
  } catch (cause: unknown) {
    if (isEnoent(cause)) return false;
    throw cause;
  }
}
