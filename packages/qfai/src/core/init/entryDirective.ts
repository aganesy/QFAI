import { randomUUID } from "node:crypto";
import { chmod, lstat, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import type { AGENT_ENTRY_POINT_FILES } from "../agentEntryPoints.js";
import { addEntryDirective } from "../agentEntryPoints.js";
import { firstLinkedComponent, keepOwner, readTextFileIfPresent, safeLstat } from "./fsGuards.js";
import { formatReportPath } from "./reportPath.js";

export type EntryDirectivePlan =
  | { kind: "current" }
  | { kind: "refused"; reason: string }
  | { kind: "create" | "prepend"; apply: () => Promise<void> };

/**
 * What giving one agent entry point the entry directive takes, by init's
 * mechanism: an absent file is written from the package's seed, and an
 * existing one has the directive prepended where no operative copy exists. A
 * file that mechanism will not rewrite is refused with the reason.
 */
export async function planEntryDirective(
  destRoot: string,
  name: (typeof AGENT_ENTRY_POINT_FILES)[number],
): Promise<EntryDirectivePlan> {
  const target = path.join(destRoot, name);
  const template = await readTextFileIfPresent(path.join(getInitAssetsDir(), "root", name));
  if (template === null) throw new Error(`The installed package has no ${name} seed.`);
  const entry = await safeLstat(target);
  if (entry === undefined) {
    return {
      kind: "create",
      apply: async () => {
        await writeFile(target, template, { encoding: "utf-8", flag: "wx" });
      },
    };
  }
  if (!entry.isFile() && !entry.isSymbolicLink()) {
    return { kind: "refused", reason: "It is not a regular file." };
  }
  const existing = await readTextFileIfPresent(target);
  if (existing === null) return { kind: "refused", reason: "It is a link to nothing." };
  const merged = addEntryDirective(existing, template);
  if (merged === existing) return { kind: "current" };
  const refusal = await refuseUnsafeEntryPointRewrite(
    target,
    existing,
    destRoot,
    "Add the entry directive",
  );
  if (refusal !== null) return { kind: "refused", reason: refusal };
  return {
    kind: "prepend",
    apply: async () => {
      const failure = await replaceEntryPointFile(target, merged, destRoot, existing);
      if (failure !== null) throw new Error(`${name} was left unchanged. ${failure}`);
    },
  };
}

/**
 * Replaces an entry point's content without ever leaving it truncated.
 *
 * The merged text is staged beside the target and renamed over it, so an
 * `ENOSPC`, an `EIO` or a kill mid-write leaves the adopter's file exactly as
 * it was. Writing in place would truncate first, and what is lost is the
 * project's own instructions outside the managed section.
 *
 * The staging file carries the whole of those instructions, so it is created
 * owner-only rather than at whatever the process default is, and the target's
 * own mode is restored before the rename — a file the project had kept to
 * itself stays that way, and one the project had made group-writable does not
 * come back read-only. Ownership goes with it where the platform has it: an
 * init run under `sudo` would otherwise hand the adopter's file to root.
 *
 * SIMPLIFIED: mode and ownership only. A POSIX ACL, an extended attribute or a
 * security label on the original is not carried to the staging inode, so a
 * rename drops it — and Node exposes no portable way either to read one or to
 * detect that a file has any.
 * Lift when: a dependency this project already carries can read and apply them,
 * or an adopter reports access lost through this path.
 */
export async function replaceEntryPointFile(
  target: string,
  content: string,
  destRoot: string,
  previous: string,
): Promise<string | null> {
  const staging = path.join(path.dirname(target), `.qfai-entry-${randomUUID()}.tmp`);
  const original = await stat(target).catch(() => null);
  try {
    await writeFile(staging, content, { encoding: "utf-8", mode: 0o600 });
    if (original !== null) {
      await chmod(staging, original.mode & 0o7777);
      const refusal = await keepOwner(staging, original);
      if (refusal !== null) {
        await rm(staging, { force: true }).catch(() => {
          // The refusal is the one worth reporting.
        });
        return refusal;
      }
    }
    // The walk that cleared this path happened before the write. A parent
    // replaced since then would have the rename land wherever it now points, so
    // the walk is repeated here. It is a check, not a lock: what it buys is a
    // window measured in the two lines between it and the rename, which is what
    // a single-process CLI can honestly offer.
    const linked = await firstLinkedComponent(target, destRoot);
    if (linked !== null) {
      await rm(staging, { force: true }).catch(() => {
        // The refusal is the one worth reporting.
      });
      return `${formatReportPath(linked)} became a symbolic link while this run was working, so the write would have landed outside this project.`;
    }
    // The earlier read was before the staging write and the metadata calls. A
    // save in that window would be replaced by a merge of the contents before
    // it, so the file is compared again here — the last thing before the
    // rename.
    const current = await readFile(target, "utf-8").catch(() => null);
    if (current !== previous) {
      await rm(staging, { force: true }).catch(() => {
        // The refusal is the one worth reporting.
      });
      return `It changed while this run was working. Run this again once the file has settled.`;
    }
    await rename(staging, target);
    return null;
  } catch (error: unknown) {
    await rm(staging, { force: true }).catch(() => {
      // Best effort: the write fault is the one worth reporting.
    });
    throw error;
  }
}

/**
 * Why this file must not be rewritten, or `null` when rewriting it is safe.
 *
 * The create-only copy treats a symlink as occupied and never follows it. This
 * path revisits a file the project owns, so it needs the same protection and two
 * more: a file whose bytes are not UTF-8 would be written back as its lossy
 * decoding, and a file saved between the read and the write would lose that
 * save.
 *
 * The last is a check, not a lock: an editor can still save in the window
 * between this read and the write below. It narrows a silent overwrite to a race
 * measured in milliseconds, which is what a single-process CLI can honestly
 * offer.
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
