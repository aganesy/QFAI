import { access } from "node:fs/promises";

import { isEnoent } from "../../src/core/fs/errno.js";

/**
 * Whether `target` exists. A missing path is `false`; any other failure
 * (EACCES, EPERM, EIO, an invalid path) rejects with the original error, so it
 * cannot satisfy an assertion that an artifact is absent.
 */
export async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch (err) {
    if (isEnoent(err)) {
      return false;
    }
    throw err;
  }
}
