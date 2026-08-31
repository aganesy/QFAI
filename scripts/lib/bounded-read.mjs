/**
 * The one bounded reader the repository-root guards use.
 *
 * Every guard under `scripts/` runs on a pull request, over paths the pull request itself can add,
 * and `ci:lint` is a required lane. A plain `readFileSync` follows a symlink: pointed at `/dev/zero`
 * or at a FIFO it never returns, and a required lane that can be made to hang blocks nothing rather
 * than everything. Three separate findings arrived on three separate readers before this file
 * existed — the workflow files, the required-status-context declaration, and the E2E ledger — which
 * is three copies of one posture and two chances to fix only some of them.
 *
 * One descriptor decides everything:
 *
 * - `lstat` refuses a link by NAME, before anything is opened;
 * - `O_NOFOLLOW` and `O_NONBLOCK` are added where the platform has them (neither exists on Windows,
 *   measured, which is why the flag was never allowed to stand alone);
 * - `fstat` on the DESCRIPTOR decides regular-file and size, not a second resolution of the path;
 * - the descriptor's identity is compared with what `lstat` inspected, so a path swapped between
 *   the two is refused rather than read;
 * - one byte past the measured size is requested, because a file that GREW is no longer the file
 *   `fstat` described and the extra byte is how that is noticed rather than silently truncated.
 *
 * Every refusal is the same answer — `undefined` — because a caller's next move is the same for all
 * of them: report the path it could not read. Distinguishing "absent" from "a device" here would
 * put the decision in the wrong place.
 */
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
} from "node:fs";
import { Buffer } from "node:buffer";

/**
 * The text of a regular file at `abs` within `maxBytes`, or `undefined` for anything else.
 *
 * @param {string} abs absolute path
 * @param {number} maxBytes ceiling, in bytes
 * @returns {string | undefined} the file's text, or `undefined` for every refusal
 */
export function readBoundedText(abs, maxBytes) {
  let inspected;
  try {
    inspected = lstatSync(abs);
  } catch {
    return undefined;
  }
  if (inspected.isSymbolicLink() || !inspected.isFile()) return undefined;

  let flags = fsConstants.O_RDONLY;
  if (typeof fsConstants.O_NOFOLLOW === "number") flags |= fsConstants.O_NOFOLLOW;
  if (typeof fsConstants.O_NONBLOCK === "number") flags |= fsConstants.O_NONBLOCK;

  let fd;
  try {
    fd = openSync(abs, flags);
  } catch {
    return undefined;
  }
  try {
    const stats = fstatSync(fd);
    if (!stats.isFile() || stats.size > maxBytes) return undefined;
    if (stats.dev !== inspected.dev || stats.ino !== inspected.ino) return undefined;
    const buffer = Buffer.alloc(stats.size + 1);
    let filled = 0;
    for (;;) {
      const read = readSync(fd, buffer, filled, buffer.length - filled, filled);
      if (read === 0) break;
      filled += read;
      if (filled > stats.size) return undefined; // it grew: not the file that was measured
    }
    return buffer.subarray(0, filled).toString("utf-8");
  } catch {
    return undefined;
  } finally {
    try {
      closeSync(fd);
    } catch {
      // the descriptor is going away with the process; a close failure is not a finding
    }
  }
}
