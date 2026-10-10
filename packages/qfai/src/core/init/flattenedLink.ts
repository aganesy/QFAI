import type { Stats } from "node:fs";
import { chmod, link, mkdir, open, rename, rm, symlink, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import {
  describeError,
  isEpermOnWindows,
  readPinnedRegularFile,
  readPinnedRegularFileBytes,
  safeLstat,
} from "./fsGuards.js";
import type { Note } from "./managedLink.js";

/**
 * Replaces a flattened link with the real symlink, restoring the file if the
 * symlink cannot be created.
 *
 * Without the rollback the failure mode is strictly worse than the state being
 * repaired: EPERM on Windows without Developer Mode leaves the wrapper absent,
 * and an absent wrapper is the one state `QFAI-LINK-001` deliberately treats as
 * benign — the project that predates a newly shipped skill looks the same. The
 * flattened file at least announced itself.
 */
/**
 * A sidecar path this call owns, created empty and exclusively.
 *
 * The name has to be unique against every other repair, including an earlier
 * one in this same process that failed and left its file behind. `wx` is what
 * makes the claim and the test one operation; the counter only has to produce
 * candidates, not guarantee anything by itself.
 */
/** Names {@link claimSidecar} produces. */
export const SIDECAR_RE = /\.qfai-repair-\d+(?:-\d+)?$/;

/**
 * How much of a sidecar the copy fallback will hold in memory.
 *
 * The same ceiling the flattened-link probe vets against, so an entry that
 * probe refused is refused here too rather than read whole.
 */
const SIDECAR_COPY_MAX_BYTES = 4096;

export async function claimSidecar(linkPath: string): Promise<string> {
  const { path: claimed, handle } = await openSidecar(linkPath);
  await handle.close();
  return claimed;
}

/**
 * The same claim, handing back the **open handle** rather than only the name.
 *
 * A caller that goes on to write the staging file must write through this
 * handle. Closing it and re-opening by pathname gives up everything `wx` bought:
 * a process that can write the directory may delete the predictable name and
 * put a symlink or a hard link there between the two, and the re-opened write
 * follows it out of the project.
 */
async function openSidecar(linkPath: string): Promise<{ path: string; handle: FileHandle }> {
  const base = `${linkPath}.qfai-repair-${String(process.pid)}`;
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${String(attempt)}`;
    try {
      return { path: candidate, handle: await open(candidate, "wx") };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException | null)?.code !== "EEXIST") throw err;
    }
  }
  throw new Error(
    `Cannot reserve a sidecar path for the repair: ${base} and every numbered candidate already exists. Check for .qfai-repair-* files left behind by an earlier repair and move them aside.`,
  );
}

/**
 * Put the sidecar back at `linkPath`, refusing a path somebody else has taken.
 *
 * `link` is the primitive that refuses: `EEXIST` rather than replacing, and it
 * restores the same inode. Where the filesystem has no hard links an exclusive
 * `wx` write makes the same promise, reading the sidecar back as **bytes**:
 * the file may not be UTF-8, and a round trip through a string would replace
 * what it cannot decode. The sidecar survives until one of them has succeeded,
 * so the content is never only in flight.
 */
export async function restoreSidecar(sidecar: string, linkPath: string): Promise<void> {
  try {
    await link(sidecar, linkPath);
  } catch (linkErr: unknown) {
    const code = (linkErr as NodeJS.ErrnoException | null)?.code;
    if (code === "EEXIST") throw linkErr;
    // `EPERM` / `ENOSYS` / `EXDEV`: no hard links here, not an occupied path.
    // Bytes, not a string. Decoding as UTF-8 and writing back replaces every
    // invalid sequence with U+FFFD, and the sidecar is removed straight after —
    // so a repair that exists to protect a concurrent write would have
    // corrupted the file it was protecting, irreversibly.
    //
    // And bounded, on the same ceiling the caller vets against. This path also
    // runs when the bounded probe **refused** the entry — an oversized file
    // another process left at the pathname — and reading it whole into memory
    // to copy it back was exactly the exhaustion the probe exists to avoid.
    // Nothing is lost by refusing: the content is in the sidecar, and the
    // message says where.
    // Pinned to one handle, like every other read of this file. A ceiling
    // checked by `stat` and a read taken by pathname are two operations on two
    // possibly different inodes, so a sidecar replaced or grown between them
    // was read unbounded anyway — the very exhaustion the ceiling is for, with
    // the wrapper's pathname still empty.
    const original = await readPinnedRegularFileBytes(sidecar, SIDECAR_COPY_MAX_BYTES);
    if (original === null) {
      throw new Error(
        [
          `Cannot restore the sidecar file (its kind changed, or it exceeds the ${String(SIDECAR_COPY_MAX_BYTES)} byte ceiling): ${linkPath}`,
          `This filesystem cannot create hard links, so the content copy is capped at that ceiling.`,
          `The original file is here: ${sidecar}`,
        ].join("\n"),
        { cause: linkErr },
      );
    }
    await writeFile(linkPath, original.content, { flag: "wx" });
    // Bytes are not the whole file. `writeFile` makes a **new** inode with the
    // umask and the parent's defaults, so a `0600` file another process left
    // here came back `0644` and readable by everyone, or lost its executable
    // bit — and the sidecar that still carried the metadata was removed
    // straight after. The hard-link path above keeps the mode by construction;
    // this one has to put it back.
    //
    // A restore that could not carry the mode is **not** a restore: the sidecar
    // stays and the failure is reported, because a file whose permissions are
    // now wrong is worse than one the operator is told where to find.
    try {
      await chmod(linkPath, original.mode);
    } catch (modeErr: unknown) {
      // Take the destination back out. This fallback created it exclusively, so
      // it is ours to remove — and leaving it is the harm the mode was being
      // restored to prevent: a `0600` file put back as `0644` is readable by
      // everyone, and reporting that while leaving it there fixes nothing. The
      // sidecar keeps the content and the permissions.
      const removeErr = await rm(linkPath, { force: true }).then(
        () => null,
        (err: unknown) => err,
      );
      throw new Error(
        [
          `Rolled the restore back because the sidecar file's permissions could not be restored: ${linkPath}`,
          `Cause: ${describeError(modeErr)}`,
          ...(removeErr === null
            ? []
            : [
                `Could not remove the restore destination that had already been created (its permissions differ from the original): ${describeError(removeErr)}`,
              ]),
          `The original file, permissions included, is here: ${sidecar}`,
        ].join("\n"),
        { cause: modeErr },
      );
    }
  }
  await rm(sidecar, { recursive: true, force: true });
}

export async function recreateFlattenedLink(
  linkPath: string,
  target: string,
  type: "dir" | "file",
  note: Note,
  legacyTarget?: string,
): Promise<"created" | "skipped"> {
  // Move aside first, then verify what was moved. Reading and then deleting by
  // pathname are two operations, and between them another process can replace
  // the file — so the delete destroyed content the check never saw, without
  // `--force`. `rename` is atomic against the pathname, and afterwards this
  // process holds the very bytes it is about to judge: if they are not the
  // flattened signature, the file goes straight back and nothing was ours to
  // remove. Nothing is deleted until the symlink is in place.
  // Claimed exclusively, then renamed onto the claim. A PID alone is not a
  // unique name: a second `runInit` in the same process — or a later one after
  // PID reuse — would rename straight over a sidecar an earlier failed repair
  // had left behind, and the success path removes the sidecar, so the message
  // that said the content was preserved would be describing a file that is
  // gone. `wx` refuses a name that is taken, so the loop finds one that is not.
  const sidecar = await claimSidecar(linkPath);
  try {
    await rename(linkPath, sidecar);
  } catch (renameErr: unknown) {
    // Nothing has moved, so the claim is a stray empty file — and it is one
    // prune deliberately leaves alone, while the next attempt sidesteps it with
    // a numbered name. Repeated failures would pile them up to the 1000-name
    // ceiling and refuse every later repair.
    await rm(sidecar, { force: true }).catch(() => undefined);
    throw renameErr;
  }
  // What was actually moved, not what the caller saw a moment ago. Between
  // `isFlattenedLink` and the rename another process can leave a huge file or a
  // FIFO at the path, and the caller's 4096-byte check protected an inode that
  // is no longer there.
  //
  // One `open`, `fstat` on that handle, a bounded read from it. Checking the
  // entry with `lstat` and then reading it by pathname were two operations on
  // two possibly different inodes: another process replacing the sidecar in
  // between, or growing it through an fd it held from before the rename, left
  // the read unbounded — memory exhausted, or blocked for ever on a FIFO —
  // with the original already moved aside and the pathname empty.
  //
  // Inside the rollback, because by now the wrapper *has* moved: a permission
  // change or a transient `EIO` here left the pathname empty and the original
  // in the sidecar, with nothing said about either — worse than the flattened
  // state the repair started from.
  //
  // Both early returns put the file back the same way the rollback does.
  // `rename` overwrites, so a path another process re-created while this one
  // was reading would have been destroyed by the very restore that exists to
  // leave it alone — the atomic claim belongs on every restore, not only the
  // one after a failed `symlink`.
  const original = await readPinnedRegularFile(sidecar, 4096).catch(async (readErr: unknown) => {
    // A failed restore here is not a detail to swallow. The wrapper is gone
    // from its pathname and lives in the sidecar, and re-throwing the read
    // error alone told the operator neither of those — so the original looked
    // simply lost. Same shape as the rollback below: what happened, and where
    // the content is.
    const restoreErr = await restoreSidecar(sidecar, linkPath).then(
      () => null,
      (err: unknown) => err,
    );
    if (restoreErr === null) throw readErr;
    throw new Error(
      [
        `Failed to repair the flattened symlink: ${linkPath}`,
        `Failed to read the sidecar file: ${describeError(readErr)}`,
        `The restore failed as well: ${describeError(restoreErr)}`,
        `The original file is here: ${sidecar}`,
      ].join("\n"),
      { cause: readErr },
    );
  });
  // `null` is the kind or the ceiling failing on the inode actually opened —
  // the same answer the caller's own check gave, taken again on what moved.
  if (
    original === null ||
    (toComparableTarget(original) !== toComparableTarget(target) &&
      (legacyTarget === undefined ||
        toComparableTarget(original) !== toComparableTarget(legacyTarget)))
  ) {
    await restoreSidecar(sidecar, linkPath);
    return "skipped";
  }
  try {
    await mkdir(path.dirname(linkPath), { recursive: true });
    await symlink(target, linkPath, type);
  } catch (err: unknown) {
    // The restore can fail on its own — a disk error, a permission change, a
    // transient I/O fault — and swallowing that reported a restore that did not
    // happen, on the one path where the operator has to know the file is gone.
    // Its outcome decides what the message says, and the content goes into the
    // message when it could not be written back.
    // Put it back by claiming the path atomically, not by checking that it is
    // free and then taking it. `rename` overwrites, and between a check and a
    // rename another process can create its own file here — an `EEXIST` from
    // `symlink` says one already did. A restore that destroys somebody else's
    // file is worse than no restore.
    //
    // `link` is the primitive that refuses: it fails with `EEXIST` rather than
    // replacing, and it puts back the same inode the sidecar holds. Where the
    // filesystem has no hard links, an exclusive `wx` write is the same promise
    // by different means. Either way the sidecar stays until one of them has
    // succeeded, so the content is never only in flight.
    let restoreError: unknown;
    try {
      await restoreSidecar(sidecar, linkPath);
    } catch (restoreErr: unknown) {
      restoreError = restoreErr;
    }
    const occupied = (restoreError as NodeJS.ErrnoException | null)?.code === "EEXIST";
    // Two different failures, and the operator acts on them differently: the
    // path is occupied by a file this process must not touch, or the rename
    // failed for its own reason. Either way the content is on disk, in the
    // sidecar — a path is more use than a copy pasted into an error message.
    const restored =
      restoreError === undefined
        ? "The original file was restored."
        : [
            occupied
              ? `${linkPath} holds a file created by another process, so it was not restored (an overwrite is avoided).`
              : `Restoring the original file failed as well: ${describeError(restoreError)}`,
            `The original content is kept here: ${sidecar}`,
            "Content:",
            original,
          ].join("\n");
    if (isEpermOnWindows(err)) {
      throw new Error(
        [
          `Failed to repair the flattened symlink (EPERM): ${linkPath}`,
          restored,
          "On Windows, Developer Mode has to be enabled:",
          "  Settings > System > For developers > Developer Mode: ON",
          "Details: https://learn.microsoft.com/windows/apps/get-started/enable-your-device-for-development",
        ].join("\n"),
        { cause: err },
      );
    }
    if (restoreError !== undefined) {
      throw new Error(
        [`Failed to repair the flattened symlink: ${linkPath}`, restored].join("\n"),
        { cause: err },
      );
    }
    throw err;
  }
  // Outside the try: the symlink is in place, so this is cleanup, and a failure
  // here — an ACL, an antivirus hold, a transient I/O error — is not the repair
  // failing. Inside it, the rollback ran against a path the new symlink already
  // occupies, so the restore raised `EEXIST` and `init` reported a repair that
  // had in fact succeeded, blaming Developer Mode on Windows.
  // Re-read before deleting, on the same terms. The handle that vetted the
  // content was closed when the read returned, and a process holding this inode
  // from before the rename can append in the window that follows — so a delete
  // on the strength of the earlier read discarded bytes nothing had seen, and
  // the symlink now standing in its place means they cannot be recovered.
  // Anything but the same target still there is left where it is, and named.
  const stillOurs = await readPinnedRegularFile(sidecar, 4096).catch(() => null);
  if (stillOurs === null || toComparableTarget(stillOurs) !== toComparableTarget(target)) {
    note(
      `  note: the repair succeeded, but the sidecar file was left in place because its content changed since it was inspected: ${sidecar}`,
    );
    note(`  repaired: ${linkPath} was a flattened symlink (recreating)`);
    return "created";
  }
  try {
    await rm(sidecar, { recursive: true, force: true });
  } catch (cleanupErr: unknown) {
    note(
      `  note: the repair succeeded, but the sidecar file could not be removed: ${sidecar} (${describeError(cleanupErr)})`,
    );
  }
  note(`  repaired: ${linkPath} was a flattened symlink (recreating)`);
  return "created";
}

/**
 * True when `linkPath` is a regular file whose whole content is `target`.
 *
 * That is what `git checkout` writes in place of a symlink when
 * `core.symlinks` is false: the link target, verbatim, with no trailing
 * newline. Bounded by a size check first so a large user file is never read,
 * and compared through `path.normalize` so a separator difference does not
 * make a flattened link look like user content.
 *
 * **Byte-exact.** `trim()` widened the match past the signature — a wrapper
 * somebody manages by hand, written by an editor or `echo` that appends a
 * newline, read as flattened and was deleted without `--force` — and
 * `path.normalize` widened it the same way for a different input:
 * `../../.qfai//assistant/x` and `../../.qfai/assistant/./x` are not the bytes
 * git writes, but normalize to them. The only difference this tolerates is the
 * path separator, and **only on Windows**, because git writes `/` and the
 * target is built with `path.relative`, which yields `\\` there. Everything
 * else takes the preserve path, which is the safe direction to be wrong in.
 */
/**
 * Separator-insensitive on Windows, byte-exact everywhere else — see
 * {@link isFlattenedLink}.
 *
 * On POSIX a backslash is an ordinary character in a filename, and folding it
 * made a hand-maintained `..\\..\\.qfai\\assistant\\skills\\...` — a regular
 * file nobody asked init to own — compare equal to the
 * `../../.qfai/assistant/...` git actually writes, so it was deleted without
 * `--force`. The tolerance exists for one platform; it applies there only.
 */
export function toComparableTarget(value: string): string {
  return process.platform === "win32" ? value.split("\\").join("/") : value;
}

export async function isFlattenedLink(
  linkPath: string,
  target: string,
  known?: Stats,
): Promise<boolean> {
  // The caller has already `lstat`ed this path, and re-probing it opened a hole
  // the rest of this function had been closed against: `safeLstat` turns a
  // transient `EIO` or an `EACCES` into `undefined`, which reads as "somebody
  // else's file", so init left a flattened wrapper in the reassuring `skipped`
  // list. Pass the `Stats` it already holds.
  const stats = known ?? (await safeLstat(linkPath));
  if (stats === undefined || !stats.isFile()) {
    return false;
  }
  // A read failure is not "somebody else's file". `lstat` already succeeded,
  // so the file is there; an ACL or a transient I/O fault means the signature
  // could not be checked, and answering `false` put the path in the reassuring
  // `skipped` list while leaving a flattened wrapper in place — `QFAI-LINK-001`
  // then keeps failing with nothing the operator can act on. Absence stays
  // `false`: that is a race with something else removing it.
  //
  // The ceiling is applied to the entry that is **read**, not to the one
  // `lstat` saw. Between them another process can leave a huge file or a FIFO
  // at the path, and a bound checked on the old inode did not bind the new one
  // — the read then exhausted memory or never returned. One `open`, `fstat` on
  // that handle, a bounded read from it.
  try {
    const content = await readPinnedRegularFile(linkPath, 4096);
    return content !== null && toComparableTarget(content) === toComparableTarget(target);
  } catch (error: unknown) {
    // Absence stays `false`: that is a race with something else removing it,
    // not a statement about what the entry holds.
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") return false;
    throw error;
  }
}
