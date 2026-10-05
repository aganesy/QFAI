import { lstat, readFile } from "node:fs/promises";

import { firstLinkedComponent } from "./fsGuards.js";
import { formatReportPath } from "./reportPath.js";

/**
 * Why this file must not be rewritten, or `null` when rewriting it is safe.
 *
 * The create-only copy treats a symlink as occupied and never follows it. This
 * path revisits a file the project owns, so it needs the same protection and two
 * more: a file whose bytes are not UTF-8 would be written back as its lossy
 * decoding, and a file saved between the read and the write would lose that
 * save.
 *
 * `byHand` opens the sentence that tells the operator what to do instead, so a
 * refusal names the edit that was refused rather than one that was not planned.
 */
export async function refuseUnsafeEntryPointRewrite(
  target: string,
  readEarlier: string,
  destRoot: string,
  byHand = "Add the rule citations",
): Promise<string | null> {
  // Every path component, not only the final entry: a linked `.github` with an
  // ordinary file inside it reports that file as regular, and the write then
  // lands in whatever the parent points at.
  const linked = await firstLinkedComponent(target, destRoot);
  if (linked !== null) {
    return `${formatReportPath(linked)} is a symbolic link, so writing here would change a file outside this project — which may be shared with another repository. ${byHand} in the link's target by hand.`;
  }
  const link = await lstat(target).catch(() => null);
  // A hard link reports as an ordinary file, and a write truncates the inode
  // every name shares — so a file linked into another repository changes there
  // too, with nothing in this run naming it.
  if (link !== null && link.nlink > 1) {
    return `It is a hard link with ${String(link.nlink)} names, and writing to it would change every one of them. ${byHand} by hand, or give this project its own copy.`;
  }

  const bytes = await readFile(target).catch(() => null);
  if (bytes === null) {
    return `It could not be read back.`;
  }
  // A lossy decode is not detectable from the string, so the bytes are compared
  // with the re-encoded decoding: they differ exactly when a byte was replaced.
  if (!bytes.equals(Buffer.from(bytes.toString("utf-8"), "utf-8"))) {
    return `Its bytes are not valid UTF-8, and rewriting it would replace the invalid ones. Convert it to UTF-8 and run this again.`;
  }
  if (bytes.toString("utf-8") !== readEarlier) {
    return `It changed while this run was working. Run this again once the file has settled.`;
  }
  return null;
}
