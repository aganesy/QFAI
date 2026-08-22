import { randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import type { Stats } from "node:fs";
import {
  access,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "./fs/errno.js";

/**
 * `.qfai/state.json` is the single SSOT for ephemeral, per-runtime
 * session state (NOT committed configuration). It records the active
 * discussion session pointer under `discussion.currentId` and the ATDD
 * scaffold escalation counters under `atdd`.
 *
 * The file has several independent writers owning DISJOINT top-level
 * namespaces, and every write is a read-modify-write of the whole
 * document. So "the read failed" must never be conflated with "the
 * file does not exist yet": merging onto `{}` after a failed read
 * rewrites the file with only the calling subsystem's keys and
 * silently destroys everyone else's.
 *
 * Therefore:
 *   - `readStateTolerant` is for READ-ONLY callers. It keeps the old
 *     permissive contract (missing file / unreadable file / malformed
 *     JSON all collapse to `null`) because a failed read cannot lose
 *     data.
 *   - `readStateStrict` is for READ-MODIFY-WRITE callers. It returns
 *     `null` ONLY for a genuinely absent file and throws
 *     `StateUnreadableError` for every other failure class, so the
 *     caller refuses the write instead of clobbering foreign keys.
 *   - `writeStateFile` writes atomically (temp file + rename) so an
 *     interrupted run cannot leave a truncated document behind — the
 *     main source of the unreadable file in the first place.
 */
const STATE_REL = path.join(".qfai", "state.json");

function stateAbsPath(root: string): string {
  return path.join(root, STATE_REL);
}

/**
 * Raised when `.qfai/state.json` exists but cannot be used as the base
 * of a read-modify-write: an I/O failure other than ENOENT (EACCES /
 * EBUSY / EISDIR — a file held open by an editor or AV scanner on
 * Windows), invalid JSON, or a document that is not a JSON object.
 * Carries the absolute path so the caller can name the file.
 */
export class StateUnreadableError extends Error {
  readonly stateFile: string;

  constructor(stateFile: string, reason: string, options?: { cause?: unknown }) {
    super(
      `${stateFile} exists but could not be read (${reason}). ` +
        "Refusing to overwrite it: the write would discard the top-level keys owned by other subsystems. " +
        "Repair or delete the file, then re-run.",
      options,
    );
    this.name = "StateUnreadableError";
    this.stateFile = stateFile;
  }
}

type StateLoad =
  | { kind: "ok"; state: Record<string, unknown> }
  | { kind: "absent" }
  | { kind: "unreadable"; reason: string; cause: unknown };

/**
 * True when `abs` is a symlink whose target does not resolve. `readFile`
 * reports such a path as ENOENT, exactly like a genuinely absent file,
 * but the two must not be treated the same: see {@link loadState}.
 */
async function isDanglingSymlink(abs: string): Promise<boolean> {
  try {
    return (await lstat(abs)).isSymbolicLink();
  } catch {
    // The path itself does not exist (or cannot be stat'ed) — nothing to
    // distinguish, so fall back to the plain "absent" reading.
    return false;
  }
}

/**
 * Load `.qfai/state.json` and DISCRIMINATE the failure classes.
 * Every caller decides for itself whether an unreadable document is
 * tolerable; this helper never collapses the two.
 */
async function loadState(root: string): Promise<StateLoad> {
  const abs = stateAbsPath(root);
  let raw: string;
  try {
    raw = await readFile(abs, "utf-8");
  } catch (err) {
    if (isEnoent(err)) {
      // A DANGLING symlink reads as ENOENT too. Reporting it as "absent"
      // licenses a fresh write, and the write would replace the link
      // itself with a regular file — losing both the repairable link and
      // the target another writer shares. Refuse instead.
      if (await isDanglingSymlink(abs)) {
        return { kind: "unreadable", reason: "dangling symlink", cause: err };
      }
      return { kind: "absent" };
    }
    return { kind: "unreadable", reason: hasErrnoCode(err) ? err.code : "read failed", cause: err };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { kind: "unreadable", reason: "invalid JSON", cause: err };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "unreadable", reason: "not a JSON object", cause: null };
  }
  // `Record<string, unknown>` is the structural supertype of any parsed
  // JSON object; callers narrow each field they read.
  return { kind: "ok", state: parsed as Record<string, unknown> };
}

/**
 * Read-only accessor: returns the parsed state, or `null` when the
 * file is missing / unreadable / not a JSON object. Never throws.
 * Use this ONLY when the result is not about to be written back —
 * a tolerated read failure that feeds a merge is data loss.
 */
export async function readStateTolerant(root: string): Promise<Record<string, unknown> | null> {
  const loaded = await loadState(root);
  return loaded.kind === "ok" ? loaded.state : null;
}

/**
 * Read-modify-write accessor: returns the parsed state, or `null` when
 * the file genuinely does not exist (ENOENT) and the caller may start
 * from an empty document. Throws `StateUnreadableError` for any other
 * failure class so the caller aborts instead of erasing the keys it
 * does not own.
 */
export async function readStateStrict(root: string): Promise<Record<string, unknown> | null> {
  const loaded = await loadState(root);
  if (loaded.kind === "ok") return loaded.state;
  if (loaded.kind === "absent") return null;
  throw new StateUnreadableError(stateAbsPath(root), loaded.reason, { cause: loaded.cause });
}

/** Scratch files this module creates: `<target>.<pid>.<random>.tmp`. */
const TEMP_SUFFIX_RE = /\.\d+\.[0-9a-f]{12}\.tmp$/u;

/**
 * Age past which a leftover scratch file cannot belong to a write still
 * in flight, so it is debris from an interrupted run. Deliberately
 * generous: deleting a temp file another process is still filling would
 * turn its rename into an ENOENT failure.
 */
const STALE_TEMP_MS = 60 * 60 * 1000;

/**
 * Best-effort collection of scratch files left by runs that were killed
 * between the write and the rename. Without it they accumulate next to
 * `state.json` forever.
 *
 * This is the second half of the answer to that debris, not the whole
 * one: it only runs when a LATER write happens, and a checkout whose
 * next command never writes state keeps its leftover indefinitely. The
 * first half is `QFAI_STATE_SCRATCH_IGNORE` in the managed `.gitignore`
 * (`core/gitignore.ts`), which keeps a leftover out of `git add .` for
 * as long as it survives — the scratch itself cannot be moved out of
 * `.qfai`, since `rename` is atomic only within one directory.
 *
 * Never fails the write it follows.
 */
async function sweepStaleTemps(dir: string, base: string): Promise<void> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  const cutoff = Date.now() - STALE_TEMP_MS;
  for (const name of names) {
    if (!name.startsWith(`${base}.`) || !TEMP_SUFFIX_RE.test(name)) continue;
    const abs = path.join(dir, name);
    try {
      if ((await stat(abs)).mtimeMs > cutoff) continue;
      await unlink(abs);
    } catch {
      // Raced with its owner or not ours to remove; leave it alone.
    }
  }
}

/** Resolve a symlink at `abs` to the path a write must land on. */
async function resolveLinkTarget(abs: string): Promise<string> {
  try {
    return await realpath(abs);
  } catch (err) {
    if (!isEnoent(err)) throw err;
    // Dangling link: `writeFile` used to create the link's target, so
    // keep writing through it rather than replacing the link.
    const dest = await readlink(abs);
    return path.isAbsolute(dest) ? dest : path.resolve(path.dirname(abs), dest);
  }
}

/**
 * Decide what `rename` must replace, and reject the write when the
 * existing document is not writable.
 *
 * `rename` only needs write permission on the DIRECTORY, so unlike the
 * direct `writeFile` it replaced it would happily overwrite a
 * `state.json` deliberately made read-only — and reset its mode to the
 * scratch file's while doing so. The explicit `access` check restores
 * the EACCES/EPERM the fail-soft callers already handle
 * (`validators/scaffoldPlaceholder.ts`), and the returned `Stats` of
 * the existing document drive the mode / ownership handling in
 * {@link writeStateFile}.
 */
async function prepareWriteTarget(abs: string): Promise<{ target: string; current?: Stats }> {
  let link: Stats;
  try {
    link = await lstat(abs);
  } catch (err) {
    if (isEnoent(err)) return { target: abs };
    throw err;
  }
  const target = link.isSymbolicLink() ? await resolveLinkTarget(abs) : abs;
  try {
    const current = link.isSymbolicLink() ? await stat(target) : link;
    await access(target, fsConstants.W_OK);
    return { target, current };
  } catch (err) {
    if (isEnoent(err)) return { target }; // dangling link: create its target
    throw err;
  }
}

/** Remove a scratch file; never masks the failure that prompted it. */
async function discardScratch(tmp: string): Promise<void> {
  try {
    await unlink(tmp);
  } catch {
    // Best-effort cleanup only; the original failure is what matters.
  }
}

/**
 * Fill the scratch file `rename` will move over the document, and
 * report what landed on disk.
 *
 * Everything happens through ONE descriptor, opened `wx`
 * (`O_CREAT|O_EXCL|O_WRONLY`), because every path-based step here is a
 * fresh lookup another account sharing the directory can win. `O_EXCL`
 * refuses to follow a symlink already planted at the scratch name, and
 * `fchmod`/`fstat` on the open handle describe the inode this call
 * created — a path-based `chmod`/`stat` follows a link swapped in after
 * the last byte was written, so an attacker-chosen file with the
 * document's uid/gid would pass the ownership check in
 * {@link transfersOwnership} and the rename would then publish the link
 * itself as `state.json`.
 *
 * The mode is handed to `open` rather than chmod-ed afterwards so the
 * scratch carries the document's permissions from its FIRST byte:
 * creating it under the ambient umask (typically `0644`) and only
 * tightening it once the whole document is written exposes a `0600`
 * state to every other account on a shared host for the length of the
 * write, and leaves a loosely-permissioned copy behind if the process
 * dies inside that window. `umask` can only CLEAR bits, so the
 * `fchmod` still runs to widen the file back to the recorded mode.
 */
async function fillScratch(tmp: string, body: string, mode: number | undefined): Promise<Stats> {
  const handle = await open(tmp, "wx", mode);
  let written: Stats;
  try {
    await handle.writeFile(body, "utf-8");
    if (mode !== undefined) await handle.chmod(mode);
    written = await handle.stat();
  } catch (err) {
    // The caller unlinks the scratch; only the close is ours to undo.
    await handle.close().catch(() => undefined);
    throw err;
  }
  // Deliberately not swallowed: a close that fails is a write that did
  // not land, and renaming that scratch would publish a truncated state.
  await handle.close();
  return written;
}

/**
 * Refuse the rename when the scratch is no longer the inode
 * {@link fillScratch} filled.
 *
 * `rename` moves whatever the NAME points at, and it does not follow
 * symlinks — so a scratch swapped for a link between the close and the
 * rename turns `state.json` into that link, and every later write
 * lands on the attacker's file instead. `lstat` here is the last
 * cheap check available (Node exposes no `renameat2`/`RENAME_EXCHANGE`);
 * it closes the window the open descriptor cannot cover.
 *
 * `ino` of 0 means the platform does not report inode numbers, so only
 * the file-type half of the check applies there — never a false refusal.
 */
async function assertScratchIntact(tmp: string, written: Stats): Promise<void> {
  const now = await lstat(tmp);
  const sameInode = written.ino === 0 || (now.ino === written.ino && now.dev === written.dev);
  if (now.isSymbolicLink() || !now.isFile() || !sameInode) {
    throw new Error(
      `${tmp} was replaced after it was written; refusing to rename it over the state file.`,
    );
  }
}

/** True when the directory refused a new entry although the document itself is writable. */
function isDirectoryDenied(err: unknown): boolean {
  return hasErrnoCode(err) && (err.code === "EACCES" || err.code === "EPERM");
}

/**
 * True when moving `scratch` over the document would hand the file to
 * a different owner. `rename` keeps the SCRATCH file's uid/gid, so on a
 * shared checkout, updating another account's group-writable
 * `state.json` would transfer it to the running user — locking the
 * owner out or leaking it into an unintended group. Comparing the real
 * scratch inode instead of `process.getuid()` keeps setgid directories
 * (where the scratch already inherits the document's group) out of the
 * fallback; Windows reports 0 for both ids, so nothing is detected there.
 */
function transfersOwnership(scratch: Stats, current: Stats): boolean {
  return scratch.uid !== current.uid || scratch.gid !== current.gid;
}

/**
 * True when the document is reachable under more than one name. `rename`
 * only re-points the `.qfai/state.json` directory entry, so the other
 * hard links keep resolving to the OLD inode: a checkout that shares its
 * state file with another tree by hard link would see the two names
 * diverge from the first write onward, where the direct `writeFile` this
 * replaced updated the one inode every name resolves to. Regular files
 * only — a directory's `nlink` counts its `.` entries and says nothing
 * about sharing.
 */
function sharesInodeWithOtherNames(current: Stats): boolean {
  return current.isFile() && current.nlink > 1;
}

/** Backoff before each `rename` retry, in ms. Short: the contention window is a syscall wide. */
const RENAME_RETRY_BACKOFF_MS = [5, 10, 20];

/**
 * Replace the document with the scratch file, retrying the transient
 * Windows failures.
 *
 * `rename` over an existing path is unconditionally permitted on POSIX
 * but not on Windows: `MoveFileEx` reports EPERM/EACCES/EBUSY while any
 * handle holds the destination — an editor or AV scanner, or simply a
 * second concurrent write replacing the same `state.json`. The direct
 * `writeFile` this replaced never touched the directory entry and so
 * never hit that class of failure; a few short retries keep the atomic
 * write from losing an update the old one would have landed.
 */
async function renameOnto(tmp: string, target: string): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(tmp, target);
      return;
    } catch (err) {
      const backoff = RENAME_RETRY_BACKOFF_MS[attempt];
      const transient =
        hasErrnoCode(err) &&
        (err.code === "EPERM" || err.code === "EACCES" || err.code === "EBUSY");
      if (!transient || backoff === undefined) throw err;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

/**
 * Persist the whole state document atomically: write a sibling temp
 * file, then rename it over the target. An interrupted run therefore
 * leaves either the old document or the new one, never a truncated
 * one. The temp name carries the pid AND a per-call random suffix, so
 * neither two processes nor two concurrent writes inside one process
 * collide on the scratch file (interleaved read-modify-write remains a
 * separate concern). A failure anywhere in the sequence removes the
 * scratch file before rethrowing.
 *
 * The sibling temp needs rights the direct `writeFile` this replaced
 * did not, and it cannot carry rights that file kept. Where the two
 * disagree the write falls back to rewriting the document in place —
 * losing atomicity, but never the reachability or the ownership the
 * previous implementation guaranteed:
 *   - the parent directory rejects new entries (file-update-only
 *     permissions), so no scratch file can be created at all;
 *   - the scratch file's owner/group differs from the document's, so
 *     the rename would replace them;
 *   - the document has other hard links, which the rename would strand
 *     on the pre-write inode.
 */
export async function writeStateFile(root: string, state: Record<string, unknown>): Promise<void> {
  const abs = stateAbsPath(root);
  await mkdir(path.dirname(abs), { recursive: true });
  const { target, current } = await prepareWriteTarget(abs);
  const body = `${JSON.stringify(state, null, 2)}\n`;
  const dir = path.dirname(target);
  const base = path.basename(target);
  const tmp = path.join(dir, `${base}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);

  let scratch: Stats;
  try {
    // permission bits only, not the file type
    scratch = await fillScratch(
      tmp,
      body,
      current === undefined ? undefined : current.mode & 0o7777,
    );
  } catch (err) {
    await discardScratch(tmp);
    if (current !== undefined && isDirectoryDenied(err)) {
      await writeFile(target, body, "utf-8");
      return;
    }
    throw err;
  }

  try {
    if (
      current !== undefined &&
      (transfersOwnership(scratch, current) || sharesInodeWithOtherNames(current))
    ) {
      await writeFile(target, body, "utf-8");
      await discardScratch(tmp);
    } else {
      await assertScratchIntact(tmp, scratch);
      await renameOnto(tmp, target);
    }
  } catch (err) {
    await discardScratch(tmp);
    throw err;
  }
  await sweepStaleTemps(dir, base);
}

/**
 * Read `discussion.currentId` from `.qfai/state.json`. Returns `null`
 * when the file, the `discussion` object, or the `currentId` string is
 * absent / not a non-empty string.
 */
export async function readDiscussionCurrentId(root: string): Promise<string | null> {
  const state = await readStateTolerant(root);
  if (state === null) return null;
  const discussion = state.discussion;
  if (discussion === null || typeof discussion !== "object" || Array.isArray(discussion)) {
    return null;
  }
  const currentIdField = (discussion as Record<string, unknown>).currentId;
  if (typeof currentIdField !== "string" || currentIdField.trim().length === 0) {
    return null;
  }
  return currentIdField;
}

/**
 * Set `discussion.currentId` in `.qfai/state.json`, creating the file
 * (and the `.qfai` directory) when absent and preserving every
 * unrelated top-level key. An existing file that cannot be parsed is
 * NOT replaced: the write is refused with `StateUnreadableError`,
 * because rewriting it would discard the top-level keys owned by the
 * other writers (e.g. the ATDD escalation counters under `atdd`).
 */
export async function writeDiscussionCurrentId(root: string, currentId: string): Promise<void> {
  const existing = (await readStateStrict(root)) ?? {};

  const discussionField = existing.discussion;
  const discussion =
    discussionField !== null &&
    typeof discussionField === "object" &&
    !Array.isArray(discussionField)
      ? { ...(discussionField as Record<string, unknown>) }
      : {};
  discussion.currentId = currentId;

  const next: Record<string, unknown> = { ...existing, discussion };

  await writeStateFile(root, next);
}
