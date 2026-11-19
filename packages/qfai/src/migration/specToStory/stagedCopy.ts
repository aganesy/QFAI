import { cp, link, lstat, mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode } from "../../core/fs/errno.js";

/** The `link` errors that mean the filesystem has no hard links, not that the path is taken. */
const NO_HARD_LINKS = new Set(["EPERM", "ENOSYS", "ENOTSUP", "EOPNOTSUPP", "EXDEV"]);

/**
 * Copies `source` to `target` and makes it appear there only once the copy is
 * complete. The copy is written in a hidden directory beside `target`, on the
 * filesystem `target` is on, and then published in one step that does not
 * replace an entry already at `target`. `source` is never touched, so the
 * caller removes it once this resolves. On any failure `target` is left as it
 * was and the staging directory is removed.
 *
 * Ceilings, each lifted by a no-replace rename the platform does not expose to
 * Node: a directory is published by `rename`, which on POSIX replaces an empty
 * directory created at `target` after the caller's check, losing no content; a
 * file on a filesystem without hard links, and a link, are published the same
 * way and replace an entry created at `target` in that window. A run stopped
 * mid-copy leaves a `.qfai-move-*` directory beside `target`, which nothing
 * reads and a retry does not reuse.
 */
export async function publishStagedCopy(source: string, target: string): Promise<void> {
  // The prefix leaves out the target's name, so a name near the length limit still stages.
  const holder = await mkdtemp(path.join(path.dirname(target), ".qfai-move-"));
  try {
    const staged = path.join(holder, "copy");
    await cp(source, staged, {
      recursive: true,
      preserveTimestamps: true,
      verbatimSymlinks: true,
      force: false,
      errorOnExist: true,
    });
    await publish(staged, target);
  } finally {
    await removeQuietly(holder);
  }
}

/** Puts the complete copy at `target`; a regular file through `link`, which refuses a taken path. */
async function publish(staged: string, target: string): Promise<void> {
  if (!(await lstat(staged)).isFile()) {
    await rename(staged, target);
    return;
  }
  try {
    await link(staged, target);
  } catch (error) {
    if (!(hasErrnoCode(error) && NO_HARD_LINKS.has(error.code))) throw error;
    await rename(staged, target);
  }
}

/**
 * Removes the staging directory. It runs after the outcome is settled, so a
 * failure here neither fails a published copy nor hides why a copy failed.
 */
async function removeQuietly(holder: string): Promise<void> {
  try {
    await rm(holder, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // Left as a hidden `.qfai-move-*` directory beside the target; nothing reads it.
  }
}
