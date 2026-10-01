import {
  mkdir,
  mkdtemp,
  readdir,
  readlink,
  rename,
  rm,
  rmdir,
  stat,
  symlink,
  unlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { isEnoent, isEperm } from "../fs/errno.js";
import { info } from "../logger.js";
import { toRelativePath } from "../paths.js";
import { linkNamesTarget } from "../validators/integrationSurface.js";
import { SIDECAR_RE, isFlattenedLink, recreateFlattenedLink } from "./flattenedLink.js";
import { describeError, isEpermOnWindows, safeLstat } from "./fsGuards.js";

/**
 * Where a repair's notes go.
 *
 * `init` writes them to stdout, which is where an operator running it is
 * looking. `doctor` cannot: under `--format json` stdout carries the document,
 * and a note printed into it is a parse error for every downstream consumer —
 * so that caller collects the notes and routes them itself.
 */
export type Note = (message: string) => void;

export type WrapperSyncOptions = {
  force: boolean;
  dryRun: boolean;
  createSymlink?: typeof symlink;
  platform?: NodeJS.Platform;
  /** Previous generated target, accepted only when retargeting a flattened link. */
  legacyTarget?: string;
  /**
   * The masters whose file carries the release's text once this run is done.
   * Given, a rebuilt Copilot file keeps its own bullet for every other master.
   */
  installedRuleMasters?: ReadonlySet<string>;
  /** Defaults to stdout, which is what `qfai init` wants. */
  report?: Note;
  /**
   * `false` leaves the holds beside a link this call creates to the caller.
   * By default they are removed, because a hold records a path a repair
   * emptied and the link now fills it.
   */
  discardRepointHolds?: boolean;
};

/**
 * Creates one shipped skill's host link with the writer `createSkillSymlinks`
 * uses. The caller has found the path empty; anything there by the time the
 * link is written is the project's, so the call fails rather than replace it.
 */
export async function createSkillLink(
  destRoot: string,
  integDir: string,
  skillId: string,
): Promise<void> {
  const linkPath = path.join(destRoot, integDir, skillId);
  const target = path.relative(
    path.join(destRoot, integDir),
    path.join(destRoot, ".qfai", "assistant", "skill", skillId),
  );
  const result = await ensureSymlink(linkPath, target, "dir", { force: false, dryRun: false });
  if (result !== "created") {
    throw new Error(
      `${toRelativePath(destRoot, linkPath)} was occupied before the link was written.`,
    );
  }
}

/** Whether `linkPath` is a symlink the gate reads as naming `target`. */
export async function isCurrentLink(
  linkPath: string,
  target: string,
  platform?: NodeJS.Platform,
): Promise<boolean> {
  if ((await safeLstat(linkPath))?.isSymbolicLink() !== true) return false;
  const actual = await readlink(linkPath).catch(() => null);
  return actual !== null && linkNamesTarget(actual, target, platform);
}

/**
 * Whether two link targets, read relative to `base`, name the same path.
 *
 * Broader than {@link linkNamesTarget}, and used only to recognise a link
 * `init` wrote in an earlier layout: the plural directory, and the holds of an
 * interrupted repoint. Whether a link is right is the gate's rule.
 */
export function sameLinkTarget(
  base: string,
  left: string,
  right: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  const a = path.resolve(base, left);
  const b = path.resolve(base, right);
  if (platform !== "win32") return a === b;
  return path.relative(a.toLowerCase(), b.toLowerCase()) === "";
}

/**
 * The holds beside `linkPath` that still hold a link to one of `targets`.
 *
 * {@link replaceLinkThroughHold} moves a link into
 * `<link>.qfai-repair-<pid>[-<n>]/` before it writes the replacement. Every
 * writer that creates a link at `linkPath` removes these holds, so one that
 * remains means a repair emptied the path and nothing has written it since.
 * The name is matched by the pattern prune and the gate use, so an entry that
 * merely starts like a hold is not one.
 */
export async function repointHolds(
  linkPath: string,
  targets: readonly string[],
  platform?: NodeJS.Platform,
): Promise<string[]> {
  const base = path.dirname(linkPath);
  const name = path.basename(linkPath);
  let entries: string[];
  try {
    entries = await readdir(base);
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }
  const holds: string[] = [];
  for (const entry of entries.sort()) {
    const suffix = SIDECAR_RE.exec(entry);
    if (suffix === null || entry.slice(0, suffix.index) !== name) continue;
    const held = path.join(base, entry, name);
    if ((await safeLstat(held))?.isSymbolicLink() !== true) continue;
    const target = await readlink(held);
    if (targets.some((candidate) => sameLinkTarget(base, target, candidate, platform))) {
      holds.push(path.join(base, entry));
    }
  }
  return holds;
}

/**
 * Removes one hold: the link it holds, then the directory itself.
 *
 * `rmdir` is not recursive, so a hold that has gained anything besides the
 * link it was made for stays where it is, with that content.
 */
export async function removeRepointHold(hold: string, name: string): Promise<unknown> {
  try {
    await unlink(path.join(hold, name));
    await rmdir(hold);
    return null;
  } catch (err: unknown) {
    return err;
  }
}

/**
 * Removes the holds beside a link its writer has just created, once the link
 * stands, so that no hold outlives the empty path it records.
 */
async function discardRepointHolds(
  linkPath: string,
  targets: readonly string[],
  options: WrapperSyncOptions,
): Promise<void> {
  const note = options.report ?? info;
  for (const hold of await repointHolds(linkPath, targets, options.platform)) {
    if (options.dryRun) {
      note(`  would remove the hold of an interrupted repair: ${hold}`);
      continue;
    }
    const failure = await removeRepointHold(hold, path.basename(linkPath));
    note(
      failure === null
        ? `  removed the hold of an interrupted repair: ${hold}`
        : `  note: ${linkPath} is written, but the hold beside it could not be removed (${hold}): ${describeError(failure)}`,
    );
  }
}

/**
 * Whether `stat` can follow `linkPath`, i.e. whether the OS will resolve it.
 *
 * `EPERM` is the Windows answer for a FILE symlink whose target is a directory
 * Every other failure is left to the caller's existing handling: this
 * asks one question and does not decide what an unreadable path means.
 */
async function isFollowable(linkPath: string): Promise<boolean> {
  try {
    await stat(linkPath);
    return true;
  } catch (error) {
    return !isEperm(error);
  }
}

/**
 * Replaces a symlink through a hold, restoring it if that fails.
 *
 * Two links take this path: one that names the right target but cannot be
 * followed, and one still naming the plural directory. `held` is the target
 * the moved link must name for the replacement to go ahead.
 *
 * The link is moved aside rather than deleted, for the reason
 * {@link recreateFlattenedLink} gives: `EPERM` on Windows without Developer
 * Mode leaves the wrapper absent, and an absent wrapper is the one state
 * `QFAI-LINK-001` deliberately treats as benign — a project that predates a
 * newly shipped skill looks the same. A wrong reparse type at least announces
 * itself. Losing the entry would make the damage invisible to the gate whose
 * remedy sent the operator here.
 *
 * The same three hazards the flattened path documents apply here, and are
 * answered by the means that work on a symlink:
 *
 * - **What moved is verified, not what the caller saw.** `isFollowable`
 *   inspected an inode that may no longer be at the pathname by the time
 *   `rename` runs. A regular file another process wrote in that window would
 *   have been moved aside and then deleted by the cleanup — losing a user's
 *   file on an init with no `--force`.
 * - **The restore claims the path atomically.** `rename` overwrites, so it
 *   would destroy an entry created while this repair was in flight; `link`
 *   refuses `EEXIST` but raises `EPERM` on a symlink. `symlink` does both —
 *   refuses an occupied path, and reproduces the only content a symlink has,
 *   its target. Where the platform refuses `symlink` itself, the held link
 *   goes back by `rename` ({@link putBackHeldEntry}).
 * - **Cleanup is not the repair.** Once the new link stands, a failure to
 *   remove the hold is a note.
 *
 * `createSymlink` is the writer the caller was given, so a platform that
 * refuses it refuses the replacement and the put-back alike.
 */
async function replaceLinkThroughHold(
  linkPath: string,
  target: string,
  type: "dir" | "file",
  note: Note,
  held = target,
  createSymlink: typeof symlink = symlink,
): Promise<"created" | "skipped"> {
  const hold = await claimHoldDir(linkPath);
  const sidecar = path.join(hold, path.basename(linkPath));
  try {
    await rename(linkPath, sidecar);
  } catch (renameErr: unknown) {
    // Nothing moved, so the claim is a stray empty directory. Left behind it
    // would push every later repair up the numbered candidates toward the
    // ceiling and eventually refuse them all.
    await rm(hold, { recursive: true, force: true }).catch(() => undefined);
    throw renameErr;
  }
  if (!(await movedLinkNamesTarget(sidecar, held))) {
    // Not the entry this repair was authorised to replace. It goes back by the
    // same atomic claim the rollback uses, and the repair declines rather than
    // recreating something over a path somebody else owns.
    await restoreHeldLink({ hold, sidecar, linkPath, type, note, createSymlink });
    return "skipped";
  }
  try {
    await createSymlink(target, linkPath, type);
  } catch (error: unknown) {
    await restoreHeldLink({ hold, sidecar, linkPath, type, note, createSymlink, cause: error });
    throw error;
  }
  await discardHold(hold, linkPath, note);
  return "created";
}

/**
 * Puts the held link back, or reports where it is when it cannot.
 *
 * `symlink` is the atomic claim: it refuses an occupied path, so a file another
 * process created at `linkPath` survives instead of being overwritten by a
 * `rename`. It reproduces the link's target, which is the whole of a symlink's
 * content — the reparse type is the defect being repaired and is not worth
 * restoring even when it could be.
 *
 * A restore that fails does not throw over its caller's error. It keeps the
 * hold and says where the original is, because the pathname is empty at that
 * moment and an operator who is not told would read the wrapper as simply gone.
 */
async function restoreHeldLink(args: {
  hold: string;
  sidecar: string;
  linkPath: string;
  type: "dir" | "file";
  note: Note;
  createSymlink: typeof symlink;
  cause?: unknown;
}): Promise<void> {
  const { hold, sidecar, linkPath, type, note, createSymlink } = args;
  const failure = await putBackHeldEntry(sidecar, linkPath, type, createSymlink);
  if (failure === null) {
    await discardHold(hold, linkPath, note);
    return;
  }
  const occupied = (failure as NodeJS.ErrnoException | null)?.code === "EEXIST";
  note(
    [
      occupied
        ? `  note: ${linkPath} was not restored — another process created an entry there first.`
        : `  note: could not restore ${linkPath}: ${describeError(failure)}`,
      `  note: the original entry is held here: ${sidecar}`,
    ].join("\n"),
  );
}

/**
 * Puts the held entry back at `linkPath`, or returns why it could not.
 *
 * The primitive depends on what is actually held, and both choices are forced:
 *
 * - a **symlink** goes back with `symlink`, the only non-overwriting way to
 *   create one (`rename` overwrites; `link` raises `EPERM` on a symlink). An
 *   `EEXIST` from it is the proof that another process took the pathname, which
 *   is what makes the failed-recreate rollback safe. An `EPERM` from it is the
 *   platform refusing to create symlinks at all — Windows without Developer
 *   Mode, the case that sent the replacement here — and then the held link
 *   itself goes back by `rename`, which needs no such right, while the
 *   pathname is still free.
 * - **anything else** — a regular file another process wrote in the window
 *   between the followability probe and the move — goes back with `rename`,
 *   which is what moved it and the only thing that reproduces it. Reading the
 *   target with `readlink` first and giving up when that failed left a user's
 *   file inside a `.qfai-repair-*` directory instead of at its own path.
 *
 * `rename` overwrites, so it runs only while the pathname is still free. That
 * check and the move are two operations and a race remains possible between
 * them — but the alternative is either abandoning the entry or destroying
 * whatever arrived, and an occupied path is reported rather than resolved.
 */
async function putBackHeldEntry(
  sidecar: string,
  linkPath: string,
  type: "dir" | "file",
  createSymlink: typeof symlink,
): Promise<unknown> {
  const held = await safeLstat(sidecar);
  if (held?.isSymbolicLink() === true) {
    const target = await readlink(sidecar).catch(() => null);
    if (target === null) {
      return new Error(`Cannot read the held symlink's target: ${sidecar}`);
    }
    const refused = await createSymlink(target, linkPath, type).then(
      () => null,
      (err: unknown) => err,
    );
    if (!isEperm(refused)) return refused;
    return await renameIntoFreePath(sidecar, linkPath);
  }
  return await renameIntoFreePath(sidecar, linkPath);
}

/** `rename`, refused with `EEXIST` when `linkPath` is already taken. */
async function renameIntoFreePath(sidecar: string, linkPath: string): Promise<unknown> {
  if ((await safeLstat(linkPath)) !== undefined) {
    const occupied: NodeJS.ErrnoException = new Error(`${linkPath} is occupied by another entry`);
    occupied.code = "EEXIST";
    return occupied;
  }
  return await rename(sidecar, linkPath).then(
    () => null,
    (err: unknown) => err,
  );
}

/**
 * Removes the hold once the pathname is settled — a note on failure, never an
 * error.
 *
 * The link is already in place by the time this runs, so an ACL, an antivirus
 * hold or a transient I/O fault here is not the repair failing. Reporting it as
 * one told the operator a repair had failed that had in fact succeeded.
 */
async function discardHold(hold: string, linkPath: string, note: Note): Promise<void> {
  try {
    await rm(hold, { recursive: true, force: true });
  } catch (cleanupErr: unknown) {
    note(
      `  note: the repair succeeded but the hold could not be deleted (${hold}): ` +
        `${describeError(cleanupErr)} — ${linkPath} is repaired`,
    );
  }
}

/**
 * Whether the entry now at `sidecar` is a symlink naming `target`.
 *
 * Asked after the move, on the inode this process actually holds. Before it,
 * the answer describes whatever was at the pathname a moment ago.
 */
async function movedLinkNamesTarget(sidecar: string, target: string): Promise<boolean> {
  const moved = await safeLstat(sidecar);
  if (moved?.isSymbolicLink() !== true) return false;
  const held = await readlink(sidecar).catch(() => null);
  return held !== null && path.normalize(held) === path.normalize(target);
}

/**
 * A directory beside `linkPath` that this call exclusively owns.
 *
 * `claimSidecar` cannot serve: it claims a FILE with `wx`, and `rename`
 * onto an existing destination fails on Windows. Checking a name is free and
 * then renaming onto it is the check-then-use shape the flattened path warns
 * about. `mkdir` without `recursive` refuses `EEXIST` atomically, so the
 * directory is the claim and the name inside it is unoccupied by construction.
 *
 * A PID alone is not unique: a second `runInit` in the same process, or a later
 * one after PID reuse, would otherwise land on a hold an earlier failed repair
 * left behind — and the success path removes it.
 */
async function claimHoldDir(linkPath: string): Promise<string> {
  const base = `${linkPath}.qfai-repair-${String(process.pid)}`;
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${String(attempt)}`;
    try {
      await mkdir(candidate);
      return candidate;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException | null)?.code !== "EEXIST") throw err;
    }
  }
  throw new Error(
    `qfai init: cannot reserve a hold for the repair: ${base} and every numbered candidate already exist`,
  );
}

/**
 * Writes the managed link at `linkPath`, then removes the holds an interrupted
 * repair left beside it ({@link discardRepointHolds}).
 *
 * Every caller writes through here, so a hold outlives its empty path only
 * where a caller opts out and removes the holds itself. A link that was
 * already right has its holds removed too: a repair that stopped after
 * writing it and before removing the hold leaves exactly that pair.
 */
export async function ensureSymlink(
  linkPath: string,
  target: string,
  type: "dir" | "file",
  options: WrapperSyncOptions,
): Promise<"created" | "skipped"> {
  const result = await writeManagedLink(linkPath, target, type, options);
  if (options.discardRepointHolds === false) return result;
  if (result === "created" || (await isCurrentLink(linkPath, target, options.platform))) {
    const targets = options.legacyTarget === undefined ? [target] : [target, options.legacyTarget];
    await discardRepointHolds(linkPath, targets, options);
  }
  return result;
}

async function writeManagedLink(
  linkPath: string,
  target: string,
  type: "dir" | "file",
  options: WrapperSyncOptions,
): Promise<"created" | "skipped"> {
  const note = options.report ?? info;
  const createSymlink = options.createSymlink ?? symlink;
  const linkStat = await safeLstat(linkPath);

  if (linkStat !== undefined) {
    if (linkStat.isSymbolicLink()) {
      const currentTarget = await readlink(linkPath);
      // The gate's rule, so a link the gate reports is rewritten here rather
      // than skipped as right.
      const isValid = linkNamesTarget(currentTarget, target, options.platform);

      if (isValid && !options.force) {
        // The target string being right is not the same as the link working.
        // On Windows a `git worktree add` writes these as FILE symlinks
        // pointing at directories — at the moment git writes one its target
        // does not yet exist in the new worktree and it has no reftype hint —
        // and the OS will not follow that. `readlink` returns the correct
        // target, so this branch declared the entry sound and changed nothing,
        // while `qfai validate` reported it as damage. The remedy that finding
        // prints is "re-run `qfai init`", which landed here and skipped: a
        // finding an operator cannot clear by following it.
        //
        // Same conclusion as the flattened-link case below, for the same
        // reason: `qfai init` is the one command that can repair this, so
        // requiring `--force` — which nothing tells the operator — is not a
        // remedy. Auto-repair is scoped to a link that is already ours and
        // already names the right target; only its reparse type is wrong.
        //
        // Scoped to `type === "dir"`. An agent wrapper is a `type: "file"`
        // link at a `.md` document, and git writes those with the right kind
        // already — an `EPERM` on one is an ACL or filesystem failure, and
        // recreating an identical link cannot clear it, so the next validate
        // reports the same finding. Probing followability there would trade a
        // visible wrapper for a churned one and no repair.
        //
        // `recreateFlattenedLink` is not the helper for this: it is for a
        // regular FILE whose content is the target string, and its rollback is
        // built on `link()` and a 4096-byte content check. Neither applies to a
        // symlink — `link()` on one raises EPERM. But the rollback ITSELF does
        // apply, and is done below: without it a failed recreate leaves the
        // wrapper absent, which is the one state `QFAI-LINK-001` deliberately
        // treats as benign, so the damage becomes invisible to the very gate
        // that sent the operator here. `--force` has always had that gap, and
        // an explicit operator action is not an argument for taking it
        // automatically on every init.
        if (type === "file" || (await isFollowable(linkPath))) {
          return "skipped";
        }
        if (options.dryRun) {
          return "created";
        }
        return await replaceLinkThroughHold(
          linkPath,
          target,
          type,
          note,
          currentTarget,
          createSymlink,
        );
      }
      if (
        !options.force &&
        options.legacyTarget !== undefined &&
        sameLinkTarget(
          path.dirname(linkPath),
          currentTarget,
          options.legacyTarget,
          options.platform,
        )
      ) {
        // A link to the plural directory is moved aside, not removed: a
        // repoint that fails puts it back, and one that stops part-way leaves
        // the hold as the record that this repair emptied the path.
        if (options.dryRun) return "created";
        try {
          return await replaceLinkThroughHold(
            linkPath,
            target,
            type,
            note,
            currentTarget,
            createSymlink,
          );
        } catch (err: unknown) {
          throw symlinkFailure(err, options.platform);
        }
      }
      if (
        !options.force &&
        sameLinkTarget(path.dirname(linkPath), currentTarget, target, options.platform)
      ) {
        // A working link spelt differently from the gate's form is rewritten
        // through a hold too, so a refused write leaves it working.
        if (options.dryRun) return "created";
        try {
          return await replaceLinkThroughHold(
            linkPath,
            target,
            type,
            note,
            currentTarget,
            createSymlink,
          );
        } catch (err: unknown) {
          throw symlinkFailure(err, options.platform);
        }
      }
      // Broken or --force → remove and recreate
      if (!options.dryRun) {
        await rm(linkPath, { recursive: true, force: true });
      }
    } else if (
      (await isFlattenedLink(linkPath, target, linkStat)) ||
      (options.legacyTarget !== undefined &&
        (await isFlattenedLink(linkPath, options.legacyTarget, linkStat)))
    ) {
      // A regular file whose entire content is the link target: the signature
      // of a checkout that flattened the symlink because `core.symlinks` was
      // false — the Windows default, and not carried by a clone
      // (`configureGitSymlinks` writes it repo-locally, and `.git/config` is
      // not cloned). Returning "skipped" made `qfai init` — the one command
      // that could repair it — report the broken entry in a reassuring list of
      // preserved paths and change nothing, so recovery required knowing to
      // pass `--force`, which nothing told the operator.
      //
      // Auto-repair is scoped to exactly this signature. A file whose content
      // is anything else is a file somebody wrote, and `--force` remains the
      // documented way to overwrite one.
      if (!options.dryRun) {
        // Recreate under a rollback, because the removal and the recreate can
        // fail independently: `symlink` raises EPERM on Windows without
        // Developer Mode, and a repair that had already deleted the file left
        // the wrapper *missing* — worse than the flattened state it started
        // from, and invisible afterwards because `QFAI-LINK-001` treats an
        // absent wrapper as one that was never created.
        return await recreateFlattenedLink(linkPath, target, type, note, options.legacyTarget);
      }
      // The removal and the `symlink` are both suppressed under `--dry-run`;
      // saying "repaired" there reported a repair that did not happen, to the
      // one invocation whose whole purpose is to preview.
      note(`  would repair: ${linkPath} is a flattened symlink`);
      return "created";
    } else {
      // Regular file or directory with content of its own — a customised agent
      // wrapper, or a generated link replaced by a real directory. Preserve it
      // unless `--force`.
      if (!options.force) {
        return "skipped";
      }
      if (!options.dryRun) {
        await rm(linkPath, { recursive: true, force: true });
      }
    }
  }

  if (!options.dryRun) {
    await mkdir(path.dirname(linkPath), { recursive: true });
    try {
      await createSymlink(target, linkPath, type);
    } catch (err: unknown) {
      throw symlinkFailure(err, options.platform);
    }
  }

  return "created";
}

/**
 * Creates and removes one symlink in a scratch directory, so a platform that
 * refuses symlinks stops the run before anything is written to the project.
 *
 * Only the refusal Windows gives without Developer Mode stops it. Any other
 * failure of the probe is left to the writes that follow, which report their
 * own error for the path they were creating.
 */
export async function requireSymlinkCreation(
  options: Pick<WrapperSyncOptions, "createSymlink" | "platform"> = {},
): Promise<void> {
  let scratch: string;
  try {
    scratch = await mkdtemp(path.join(os.tmpdir(), "qfai-symlink-probe-"));
  } catch {
    return;
  }
  try {
    // The target need not exist: creating the link is the whole probe.
    await (options.createSymlink ?? symlink)(
      path.join(scratch, "target"),
      path.join(scratch, "qfai-symlink-probe"),
      "file",
    );
  } catch (err: unknown) {
    if (isEpermOnWindows(err, options.platform)) throw symlinkFailure(err, options.platform);
  } finally {
    // A scratch directory left in the temp area is harmless and not worth a failed init.
    await rm(scratch, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** What a refused `symlink` raises: Developer Mode guidance on Windows, the error elsewhere. */
function symlinkFailure(err: unknown, platform?: NodeJS.Platform): unknown {
  if (!isEpermOnWindows(err, platform)) return err;
  return new Error(
    [
      "Failed to create a symlink (EPERM).",
      "On Windows, Developer Mode has to be enabled:",
      "  Settings > System > For developers > Developer Mode: ON",
      "Details: https://learn.microsoft.com/windows/apps/get-started/enable-your-device-for-development",
    ].join("\n"),
    { cause: err },
  );
}
