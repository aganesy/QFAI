import { randomBytes, randomUUID } from "node:crypto";
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
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "./fs/errno.js";
import { QFAI_STATE_SCRATCH_SUFFIX } from "./gitignore.js";

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

/**
 * Advisory-lock tuning. The lock is held only across one
 * read-modify-write of a small JSON file, so the wait budget is short.
 * `LOCK_STALE_MS` is when a lock first becomes a reap *candidate*;
 * `LOCK_ABANDON_MS` is the backstop for a lock whose recorded owner
 * cannot be trusted (see {@link reapStaleLock}).
 */
const LOCK_STALE_MS = 10_000;
const LOCK_ABANDON_MS = 60_000;
const LOCK_RETRY_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

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

/**
 * Outcome of reading `.qfai/state.json`.
 *
 * `"absent"` (no file) and `"unreadable"` are deliberately NOT the same case.
 * An absent state file is the ordinary state of a project that never ran
 * `qfai discussion use`; an unreadable one is broken runtime state that only a
 * repair can clear. Collapsing the two lets a consumer treat "nothing was ever
 * pinned" and "the pin cannot be read" identically and silently substitute an
 * inferred answer.
 *
 * `reason` is the short phrase {@link StateUnreadableError} embeds; `detail` is
 * the operator-facing sentence that names the file and what is wrong with it.
 */
type StateLoad =
  | { kind: "ok"; state: Record<string, unknown> }
  | { kind: "absent" }
  | { kind: "unreadable"; reason: string; detail: string; cause: unknown };

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
        return {
          kind: "unreadable",
          reason: "dangling symlink",
          detail: `${STATE_REL} is a symlink whose target does not exist`,
          cause: err,
        };
      }
      return { kind: "absent" };
    }
    return {
      kind: "unreadable",
      reason: hasErrnoCode(err) ? err.code : "read failed",
      detail: `${STATE_REL} could not be read (${describeError(err)})`,
      cause: err,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      kind: "unreadable",
      reason: "invalid JSON",
      detail: `${STATE_REL} is not valid JSON (${describeError(err)})`,
      cause: err,
    };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      kind: "unreadable",
      reason: "not a JSON object",
      detail: `${STATE_REL} is not a JSON object`,
      cause: null,
    };
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

/**
 * Name of the staging directory one write uses:
 * `<document>.<pid>.<random>.qfai-state.tmp`. The pid and the per-call random
 * part keep two processes — and two concurrent writes inside one process —
 * off each other's staging directory.
 */
function scratchDirName(base: string): string {
  return `${base}.${process.pid}.${randomBytes(6).toString("hex")}${QFAI_STATE_SCRATCH_SUFFIX}`;
}

/**
 * Matcher for {@link scratchDirName}, built from the same suffix constant so
 * the sweep cannot stop recognising the names this module creates.
 */
const SCRATCH_DIR_RE = new RegExp(
  `\\.\\d+\\.[0-9a-f]{12}${QFAI_STATE_SCRATCH_SUFFIX.replace(/\./gu, "\\.")}$`,
  "u",
);

/**
 * Age past which a leftover staging directory cannot belong to a write
 * still in flight, so it is debris from an interrupted run. Deliberately
 * generous: deleting one another process is still filling would turn its
 * rename into an ENOENT failure.
 */
const STALE_TEMP_MS = 60 * 60 * 1000;

/**
 * Best-effort collection of staging directories left by runs that were
 * killed between the write and the rename. Without it they accumulate
 * next to the document forever.
 *
 * This is the second half of the answer to that debris, not the whole
 * one: it only runs when a LATER write happens, and a checkout whose
 * next command never writes state keeps its leftover indefinitely. The
 * first half is `QFAI_STATE_SCRATCH_IGNORE` in the managed `.gitignore`
 * (`core/gitignore.ts`), which keeps a leftover out of `git add .` for
 * as long as it survives — the staging directory cannot be moved
 * somewhere already ignored, since `rename` needs both names on one
 * filesystem, so the ignore pattern matches on the name's suffix and
 * therefore covers the directory a symlinked document resolves into as
 * well as `.qfai` itself.
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
    if (!name.startsWith(`${base}.`) || !SCRATCH_DIR_RE.test(name)) continue;
    const abs = path.join(dir, name);
    try {
      // `lstat`, so a symlink wearing the name is judged on itself, and
      // `rm` does not follow one either: it removes the link alone.
      if ((await lstat(abs)).mtimeMs > cutoff) continue;
      await rm(abs, { recursive: true, force: true });
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

/** One write's scratch: the private directory, the file, and what it holds. */
type Scratch = {
  /** The staging directory this write created; removed on every exit path. */
  readonly dir: string;
  /** The scratch file inside it, the source of the `rename`. */
  readonly file: string;
  /** Still open: the mode is only widened once the ownership check clears. */
  readonly handle: FileHandle;
  /** `fstat` of the inode this write created, for {@link assertScratchIntact}. */
  readonly stats: Stats;
};

/**
 * Stage the replacement document in a directory this write owns alone.
 *
 * The scratch used to be a plain sibling of the document, which on a
 * shared checkout put it in a directory other accounts may create,
 * rename and unlink entries in: between the last byte and the `rename`
 * such an account could swap the scratch for a symlink, and the rename
 * would publish that link AS the document. Detecting the swap afterwards
 * is inherently racy — the check and the `rename` are two separate
 * pathname lookups, and Node exposes no `renameat2`/`RENAME_EXCHANGE`
 * to fuse them. Denying the swap does not need the two to be fused:
 *
 *   - `mkdir` (never `recursive`, so an existing name is EEXIST rather
 *     than adopted) creates the staging directory with mode `0700`, so
 *     no other account holds the write permission a swap of an entry
 *     inside it requires;
 *   - `open` is `wx` (`O_CREAT|O_EXCL|O_WRONLY`) on that fresh, empty
 *     directory, so nothing can already sit at the scratch name, and
 *     every later `fchmod`/`fstat` describes the inode this call made
 *     rather than whatever a path lookup would find.
 *
 * The scratch keeps the document's basename, and the directory carries
 * `QFAI_STATE_SCRATCH_SUFFIX`, so the managed `.gitignore` covers a
 * leftover wherever the write lands — including the directory a
 * symlinked `state.json` resolves into, which no `.qfai/`-anchored
 * pattern reaches.
 *
 * The scratch is filled at `0600` even when the document is more
 * permissive; {@link publishScratch} widens it. A shared host is
 * exactly where the document's mode may name a group the running user
 * is only a supplementary member of, and on a non-setgid directory the
 * scratch is created with the user's PRIMARY group instead: copying a
 * group-readable mode before that gid is known hands the whole state to
 * an unrelated group for the length of the write.
 */
async function stageScratch(
  dir: string,
  base: string,
  body: string,
  mode: number | undefined,
): Promise<Scratch> {
  const staging = path.join(dir, scratchDirName(base));
  await mkdir(staging, { mode: 0o700 });
  const file = path.join(staging, base);
  try {
    const handle = await open(file, "wx", mode === undefined ? undefined : 0o600);
    try {
      await handle.writeFile(body, "utf-8");
      return { dir: staging, file, handle, stats: await handle.stat() };
    } catch (err) {
      await handle.close().catch(() => undefined);
      throw err;
    }
  } catch (err) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    throw err;
  }
}

/** Drop an unpublished scratch; never masks the failure that prompted it. */
async function discardScratch(scratch: Scratch): Promise<void> {
  // Best-effort cleanup only; the original failure is what matters, and
  // `sweepStaleTemps` collects anything that survives.
  await scratch.handle.close().catch(() => undefined);
  await rm(scratch.dir, { recursive: true, force: true }).catch(() => undefined);
}

/**
 * Refuse the rename when the scratch is no longer the inode
 * {@link stageScratch} filled.
 *
 * Backstop, not the primary defence: the staging directory's `0700`
 * already denies another account the write permission a swap needs, and
 * this only catches what that cannot — a swap of the staging directory
 * itself by an account that may rename entries in the document's
 * directory. Such an account can equally rename a symlink straight onto
 * the document, which {@link prepareWriteTarget} then writes through, so
 * the residual window grants no capability the environment does not
 * already give away.
 *
 * `ino` of 0 means the platform does not report inode numbers, so only
 * the file-type half of the check applies there — never a false refusal.
 */
async function assertScratchIntact(scratch: Scratch): Promise<void> {
  const now = await lstat(scratch.file);
  const written = scratch.stats;
  const sameInode = written.ino === 0 || (now.ino === written.ino && now.dev === written.dev);
  if (now.isSymbolicLink() || !now.isFile() || !sameInode) {
    throw new Error(
      `${scratch.file} was replaced after it was written; refusing to rename it over the state file.`,
    );
  }
}

/**
 * Widen the scratch to the document's mode, move it over the document,
 * and take the staging directory back down.
 *
 * The widening happens HERE because only the caller's checks establish
 * that the scratch carries the document's owner AND group; until then
 * the recorded mode could grant a group the document never granted (see
 * {@link stageScratch}). `umask` can only clear bits, so this `fchmod`
 * is also what restores a mode the ambient umask would have trimmed.
 */
async function publishScratch(
  scratch: Scratch,
  target: string,
  mode: number | undefined,
): Promise<void> {
  if (mode !== undefined) await scratch.handle.chmod(mode);
  // Deliberately not swallowed: a close that fails is a write that did
  // not land, and renaming that scratch would publish a truncated state.
  await scratch.handle.close();
  await assertScratchIntact(scratch);
  await renameOnto(scratch.file, target);
  // The document is written; an emptied directory that will not go is
  // debris for `sweepStaleTemps`, not a failed write.
  await rm(scratch.dir, { recursive: true, force: true }).catch(() => undefined);
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
 * Persist the whole state document atomically: fill a scratch file in a
 * staging directory beside the target, then rename it over the target.
 * An interrupted run therefore leaves either the old document or the new
 * one, never a truncated one. The staging name carries the pid AND a
 * per-call random suffix, so neither two processes nor two concurrent
 * writes inside one process collide (interleaved read-modify-write
 * remains a separate concern). A failure anywhere in the sequence takes
 * the staging directory back down before rethrowing.
 *
 * Staging needs rights the direct `writeFile` this replaced did not, and
 * it cannot carry rights that file kept. Where the two disagree the
 * write falls back to rewriting the document in place — losing
 * atomicity, but never the reachability or the ownership the previous
 * implementation guaranteed:
 *   - the parent directory rejects new entries (file-update-only
 *     permissions), so no staging directory can be created at all;
 *   - the scratch file's owner/group differs from the document's, so
 *     the rename would replace them;
 *   - the document has other hard links, which the rename would strand
 *     on the pre-write inode.
 *
 * In the ownership case the scratch is discarded still at `0600`, never
 * widened to a mode naming a group it does not belong to.
 */
export async function writeStateFile(root: string, state: Record<string, unknown>): Promise<void> {
  const abs = stateAbsPath(root);
  await mkdir(path.dirname(abs), { recursive: true });
  const { target, current } = await prepareWriteTarget(abs);
  const body = `${JSON.stringify(state, null, 2)}\n`;
  const dir = path.dirname(target);
  const base = path.basename(target);
  // permission bits only, not the file type
  const mode = current === undefined ? undefined : current.mode & 0o7777;

  let scratch: Scratch;
  try {
    scratch = await stageScratch(dir, base, body, mode);
  } catch (err) {
    if (current !== undefined && isDirectoryDenied(err)) {
      await writeFile(target, body, "utf-8");
      return;
    }
    throw err;
  }

  try {
    if (
      current !== undefined &&
      (transfersOwnership(scratch.stats, current) || sharesInodeWithOtherNames(current))
    ) {
      await writeFile(target, body, "utf-8");
      await discardScratch(scratch);
    } else {
      await publishScratch(scratch, target, mode);
    }
  } catch (err) {
    await discardScratch(scratch);
    throw err;
  }
  await sweepStaleTemps(dir, base);
}

/**
 * Outcome of reading `discussion.currentId`.
 *
 * `"unset"` means the pointer was never written (no state file, no
 * `discussion` block, no `currentId` key) — the ordinary state of a project
 * that never ran `qfai discussion use`. `"corrupt"` means the pointer cannot
 * be read because the surrounding state is broken (invalid JSON, a
 * non-object document, a non-object `discussion`, a non-string or blank
 * `currentId`).
 *
 * Consumers that pick a *fallback* when no pointer is available must branch on
 * this: inferring "latest pack" from a corrupt file substitutes a pack nobody
 * selected, which is how a stale/broken pointer silently drops a gate.
 */
export type DiscussionCurrentIdRead =
  | { kind: "set"; currentId: string }
  | { kind: "unset" }
  | { kind: "corrupt"; detail: string };

/**
 * Read `discussion.currentId` from `.qfai/state.json`, discriminating
 * "never pinned" from "pinned but unreadable". Never throws.
 */
export async function readDiscussionCurrentIdState(root: string): Promise<DiscussionCurrentIdRead> {
  const read = await loadState(root);
  if (read.kind === "absent") return { kind: "unset" };
  if (read.kind === "unreadable") return { kind: "corrupt", detail: read.detail };

  const discussion: unknown = read.state.discussion;
  if (discussion === undefined) return { kind: "unset" };
  if (!isRecord(discussion)) {
    return {
      kind: "corrupt",
      detail: `${STATE_REL}#discussion must be an object (got ${describeJsonValue(discussion)})`,
    };
  }
  const currentIdField: unknown = discussion.currentId;
  if (currentIdField === undefined) return { kind: "unset" };
  if (typeof currentIdField !== "string") {
    return {
      kind: "corrupt",
      detail: `${STATE_REL}#discussion.currentId must be a string (got ${describeJsonValue(currentIdField)})`,
    };
  }
  if (currentIdField.trim().length === 0) {
    return {
      kind: "corrupt",
      detail: `${STATE_REL}#discussion.currentId is blank`,
    };
  }
  return { kind: "set", currentId: currentIdField };
}

function describeJsonValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

/** The message of a thrown value, for the operator-facing `detail` strings. */
function describeError(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

/**
 * Read `discussion.currentId` from `.qfai/state.json`. Returns `null`
 * when the file, the `discussion` object, or the `currentId` string is
 * absent / not a non-empty string.
 *
 * Lossy on purpose: a caller that shows the pointer *as a fact about
 * every pack* ("this one is active, those are not") cannot use it,
 * because a state file it merely failed to read comes back looking
 * exactly like a repository where no pointer was ever set. Those callers
 * take {@link readDiscussionPointer} instead — or
 * {@link readDiscussionCurrentIdState} when they need the unset/corrupt
 * split with a `detail` string.
 */
export async function readDiscussionCurrentId(root: string): Promise<string | null> {
  const pointer = await readDiscussionPointer(root);
  return pointer.ok ? pointer.currentId : null;
}

/**
 * The active-session pointer, or the reason it could not be established.
 *
 * `ok: true` with `currentId: null` is a determinate answer: no pointer
 * is set (no state file, no `discussion` key, or an explicit `null`).
 * `ok: false` means the answer is unknown — a present-but-unreadable
 * state file, invalid JSON, or a `discussion` / `currentId` value of the
 * wrong shape.
 */
export type DiscussionPointerRead =
  | { ok: true; currentId: string | null }
  | { ok: false; reason: string };

export async function readDiscussionPointer(root: string): Promise<DiscussionPointerRead> {
  // Ported to the `loadState` discriminated result main replaced
  // `loadStateStrict` with. `detail` is the operator-facing sentence that
  // names the file, which is what the old `reason` carried; the throwing
  // `readStateStrict` is the wrong shape here because an unreadable file is
  // one of this function's two reported outcomes, not an exception.
  const loaded = await loadState(root);
  if (loaded.kind === "unreadable") {
    return { ok: false, reason: loaded.detail };
  }
  if (loaded.kind === "absent") {
    return { ok: true, currentId: null };
  }
  const abs = stateAbsPath(root);
  const discussion = loaded.state.discussion;
  // An absent or explicitly-null `discussion` is "no pointer recorded",
  // which is a determinate answer. Any other non-object is a corrupt
  // record: we cannot say the pointer is unset, only that we cannot read it.
  if (discussion === undefined || discussion === null) {
    return { ok: true, currentId: null };
  }
  if (typeof discussion !== "object" || Array.isArray(discussion)) {
    return { ok: false, reason: `${abs}#discussion is not an object.` };
  }
  const currentIdField = (discussion as Record<string, unknown>).currentId;
  if (currentIdField === undefined || currentIdField === null) {
    return { ok: true, currentId: null };
  }
  if (typeof currentIdField !== "string" || currentIdField.trim().length === 0) {
    return {
      ok: false,
      reason: `${abs}#discussion.currentId is not a non-empty string.`,
    };
  }
  return { ok: true, currentId: currentIdField };
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
  // Through `updateState`, which holds the state-file lock across the read AND
  // the write. A plain read-modify-write here loses the other writer's keys
  // whenever two runs overlap - the counters live in the same document.
  // main's `isJsonObject` guard is kept: it is the same test, as a type guard.
  await updateState(root, (existing) => {
    const discussionField: unknown = existing.discussion;
    const discussion: Record<string, unknown> = isJsonObject(discussionField)
      ? { ...discussionField }
      : {};
    discussion.currentId = currentId;
    return { next: { ...existing, discussion }, result: undefined };
  });
}

/**
 * Lock path for one project root: a sibling of the state file it guards.
 *
 * It used to live in the OS temp dir, keyed by a hash of the project's real
 * path, to keep an untracked `.qfai/state.json.lock` out of consumer repos.
 * That put the lock outside the repository's own permissions: on a machine
 * where several Unix users share a checkout, the first writer's lock is created
 * under that user's uid in a sticky `/tmp`, and no other user can unlink it —
 * so a crash there wedged every later update for everybody, whatever the age or
 * the owner's liveness. Beside `state.json` the lock inherits exactly the
 * permissions that already decide who may write the state, which is the set of
 * people who must be able to reap it. `QFAI_GITIGNORE_BLOCK` carries the
 * matching ignore line.
 *
 * A sibling also needs no key: two aliases of one project resolve to the same
 * file through the filesystem itself, where a hash of the pathname needed
 * `realpath` to notice they were the same project.
 */
function stateLockPath(root: string): string {
  return `${stateAbsPath(root)}.lock`;
}

/**
 * Path of the short-lived lock that serializes **reapers**.
 *
 * Reaping is read-then-unlink, and the two cannot be made one operation: Node
 * has no "unlink only this inode". Two waiters reaping the same stale lock
 * could therefore both pass the identity check, the first delete it and take a
 * fresh one, and the second delete *that* one. Taking this lock first makes at
 * most one process a reaper at a time, so between one reaper's check and its
 * unlink no other reaper can slip a new lock onto the path.
 */
function reapLockPath(lockPath: string): string {
  return `${lockPath}.reap`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow an unknown throwable to its `errno` code without a cast. */
function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const { code } = error;
  return typeof code === "string" ? code : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Identity stamped into the lock file so a holder can prove it owns it. */
interface LockOwner {
  readonly pid: number;
  readonly token: string;
}

/** A held state lock: the open handle plus the owner stamped on disk. */
interface StateLock {
  readonly handle: FileHandle;
  readonly owner: LockOwner;
}

/** Is `pid` still running on this machine? */
function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but belongs to another user.
    return errorCode(error) === "EPERM";
  }
}

/** Read the owner stamp, or `null` when it is absent / unparsable. */
async function readLockOwner(lockPath: string): Promise<LockOwner | null> {
  let raw: string;
  try {
    raw = await readFile(lockPath, "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const { pid, token } = parsed;
    if (typeof pid !== "number" || typeof token !== "string") return null;
    return { pid, token };
  } catch {
    return null;
  }
}

/**
 * What one lock file looked like at one instant: enough to judge it
 * AND to prove later that the file on that path is still that same
 * file. `ino`/`dev` are 0 on filesystems that do not report them
 * (notably some Windows volumes), so the owner token and the mtime
 * carry the identity check there.
 */
interface LockSnapshot {
  readonly mtimeMs: number;
  readonly ino: number;
  readonly dev: number;
  readonly owner: LockOwner | null;
}

/** Snapshot the lock file, or `null` when it is gone / unreadable. */
async function readLockSnapshot(lockPath: string): Promise<LockSnapshot | null> {
  let info: Stats;
  try {
    info = await stat(lockPath);
  } catch {
    return null;
  }
  return {
    mtimeMs: info.mtimeMs,
    ino: info.ino,
    dev: info.dev,
    owner: await readLockOwner(lockPath),
  };
}

/** Do two snapshots describe the same lock file, taken by the same holder? */
function isSameLock(before: LockSnapshot, after: LockSnapshot): boolean {
  if (before.ino !== 0 && after.ino !== 0) {
    if (before.ino !== after.ino || before.dev !== after.dev) return false;
  }
  if (before.mtimeMs !== after.mtimeMs) return false;
  return before.owner?.token === after.owner?.token;
}

/**
 * Unlink the lock only while it is still the file `before` describes.
 *
 * Deletion is by path, and between the decision to delete and the
 * `rm` another waiter can reap the same lock and take a fresh one on
 * that path. Removing it then would drop the NEW holder's lock while
 * that holder keeps writing through its unlinked handle — two
 * `updateState` calls inside the critical section at once, which is
 * the exact race this module exists to close. Re-reading the file and
 * requiring the same identity (inode/device when reported, mtime,
 * owner token) keeps a replaced lock alive; the loser simply waits
 * one more retry.
 */
async function removeLockIfUnchanged(lockPath: string, before: LockSnapshot): Promise<void> {
  const after = await readLockSnapshot(lockPath);
  if (after === null || !isSameLock(before, after)) return;
  try {
    await rm(lockPath, { force: true });
  } catch {
    // The lock vanished or is unreadable — the next acquire attempt decides.
  }
}

/**
 * Remove a lock whose holder is gone.
 *
 * An old mtime is not evidence of death: a holder stalled on slow I/O
 * or suspended by the scheduler keeps its mtime frozen while it is
 * still inside the critical section, and deleting that lock would admit
 * a second writer (and let the original holder unlink the newcomer's
 * lock on release). So an aged lock is only reaped once the pid stamped
 * inside it is no longer running. `LOCK_ABANDON_MS` is the backstop for
 * the cases where that pid check cannot be trusted — a recycled pid, or
 * a lock leaked by this very process.
 *
 * A lock whose stamped owner is provably dead is reaped IMMEDIATELY,
 * with no age gate: `LOCK_STALE_MS` is longer than `LOCK_TIMEOUT_MS`,
 * so gating the dead-owner case on age would make every run that
 * starts within the stale window after a holder crashed time out and
 * fail (`qfai atdd scaffold`, `qfai discussion use`) even though the
 * lock is known to be free. The age gate still governs the locks whose
 * owner cannot be read — a lock created microseconds ago but not yet
 * stamped must not be mistaken for an abandoned one.
 */
async function reapStaleLock(lockPath: string): Promise<void> {
  // One reaper at a time. Without this, two waiters could both clear the same
  // identity check, the first unlink and take a fresh lock, and the second
  // unlink that one — see {@link reapLockPath}. Losing the race is not a
  // failure: the caller retries, and by then the winner has finished.
  let reaper: FileHandle;
  try {
    reaper = await open(reapLockPath(lockPath), "wx");
  } catch {
    return;
  }
  try {
    const before = await readLockSnapshot(lockPath);
    if (before === null) return;
    const ownerAlive = before.owner !== null && isProcessAlive(before.owner.pid);
    if (before.owner === null || ownerAlive) {
      const age = Date.now() - before.mtimeMs;
      if (age < LOCK_STALE_MS) return;
      if (age < LOCK_ABANDON_MS && ownerAlive) return;
    }
    await removeLockIfUnchanged(lockPath, before);
  } finally {
    await reaper.close().catch(() => undefined);
    await rm(reapLockPath(lockPath), { force: true }).catch(() => undefined);
  }
}

/**
 * Whether `lockPath` still names the file this holder created.
 *
 * The `LOCK_ABANDON_MS` backstop can take a lock away from a holder that is
 * still alive — a recycled pid, or a critical section stalled past the
 * backstop — and pid liveness alone cannot tell those apart from a genuinely
 * abandoned lock. Prevention is therefore not enough on its own: the holder
 * checks, immediately before it writes, that the lock it took is still on the
 * path. A holder whose lock was reaped writes nothing and reports it, so the
 * worst a wrong reap can do is fail one update — never let two writers into
 * the critical section and lose an increment, which is what this module exists
 * to prevent.
 */
async function lockStillOurs(lockPath: string, lock: StateLock): Promise<boolean> {
  const owner = await readLockOwner(lockPath);
  return owner !== null && owner.token === lock.owner.token;
}

/**
 * Take the exclusive state lock, or throw.
 *
 * Giving up and proceeding unlocked would reopen the exact lost-update
 * race this module exists to close: the holder that outran our wait
 * budget resumes, writes back the snapshot it read before us, and our
 * increment disappears. Refusing to write is the safe failure —
 * `.qfai/state.json` is bookkeeping, and its callers either surface the
 * error (`qfai discussion use`, `qfai atdd scaffold`) or degrade to
 * "counter unavailable" (the scaffold-placeholder validator, which
 * already catches per-TC state failures).
 */
async function acquireStateLock(lockPath: string): Promise<StateLock> {
  const owner: LockOwner = { pid: process.pid, token: randomUUID() };
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  // The lock is a sibling of `state.json`, so on a project whose first write
  // this is, `.qfai/` does not exist yet — `writeStateObject` creates it, but
  // the lock has to be taken before that runs.
  await mkdir(path.dirname(lockPath), { recursive: true });
  // What the LAST contended attempt failed with, when that was not a plain
  // EEXIST. A wait that ends in the timeout below then still names the errno
  // it kept seeing, rather than reporting a permission fault as contention.
  let contendedBy: unknown = null;
  for (;;) {
    let handle: FileHandle | null = null;
    try {
      handle = await open(lockPath, "wx");
    } catch (error) {
      if (!(await exclusiveCreateWasContended(lockPath, error))) {
        throw new Error(`qfai: cannot create state lock ${lockPath}: ${describeError(error)}`);
      }
      contendedBy = errorCode(error) === "EEXIST" ? null : error;
    }
    if (handle !== null) return stampLockOwner(lockPath, handle, owner);
    await reapStaleLock(lockPath);
    if (Date.now() >= deadline) {
      throw new Error(
        `qfai: state lock ${lockPath} is still held after ${LOCK_TIMEOUT_MS}ms; ` +
          "refusing to update .qfai/state.json without it." +
          (contendedBy === null ? "" : ` Last attempt: ${describeError(contendedBy)}.`),
      );
    }
    await delay(LOCK_RETRY_MS);
  }
}

/**
 * Whether a failed exclusive create means the NAME was taken.
 *
 * POSIX says `EEXIST` and only `EEXIST`. Windows does not: while the name is
 * being unlinked — which is every release, and every reap — `CreateFile` with
 * `CREATE_NEW` returns `ERROR_ACCESS_DENIED`, and libuv maps that to `EPERM`.
 * Measured at 2 failures in 8 runs of `atddScaffoldEscalation.test.ts` on
 * Windows 11; the CI matrix is Linux-only, so no lane can see it. Rethrowing
 * made every state write fail under contention — `qfai discussion use` and the
 * scaffold counters both go through `updateState`.
 *
 * Widening the check to the errno alone is what must NOT happen: `EPERM` and
 * `EACCES` are also what a genuinely unwritable `.qfai/` returns, and calling
 * that contention spins until the timeout and reports a permission fault as a
 * busy lock. So the errno only selects the QUESTION, and the answer comes from
 * the filesystem:
 *
 *   - a name that is present and is not a file will never become creatable, so
 *     the failure is permanent whatever the errno says;
 *   - a name the `lstat` itself cannot answer for leaves the question OPEN, and
 *     an open question is not contention. `ENOENT` is an answer ("no such
 *     name"); an `EACCES` on the lock path is not, and treating it as absence
 *     would send a permanent fault into the retry loop — the very confusion
 *     this function exists to prevent, arriving through the stat instead of
 *     through the open;
 *   - otherwise, ask the directory directly whether this process can put a new
 *     name in it. If it can, the create lost a race and retrying is right; if
 *     it cannot, the original error is the true one and is rethrown intact.
 */
async function exclusiveCreateWasContended(lockPath: string, error: unknown): Promise<boolean> {
  const code = errorCode(error);
  if (code === "EEXIST") return true;
  if (code !== "EPERM" && code !== "EACCES") return false;
  let existing: Stats | null;
  try {
    existing = await lstat(lockPath);
  } catch (statError) {
    if (!isEnoent(statError)) return false;
    existing = null;
  }
  if (existing !== null && !existing.isFile()) return false;
  return acceptsNewNames(path.dirname(lockPath));
}

/**
 * Can this process create a name in `dir` at all?
 *
 * Asked by creating one, because that is the operation whose failure is being
 * explained. `access(dir, W_OK)` is not an answer on Windows: it reports the
 * read-only ATTRIBUTE, which is meaningless on a directory, and says "writable"
 * for a directory whose ACL denies this account — the one case this has to
 * catch.
 *
 * The probe name carries the pid and a UUID so two runs racing here cannot
 * collide. Removing it is BEST EFFORT: the answer is already known once the
 * create succeeded, and failing the acquire because the cleanup failed would
 * turn a working directory into a refusal. A name left behind — by a failed
 * `rm`, or by a process killed between the create and it — is inert: nothing
 * reads it, the lock and its reap file are addressed by exact path, and the
 * next probe picks a fresh UUID rather than that one.
 */
async function acceptsNewNames(dir: string): Promise<boolean> {
  const probePath = path.join(dir, `.qfai-lock-probe-${process.pid}-${randomUUID()}`);
  let probe: FileHandle;
  try {
    probe = await open(probePath, "wx");
  } catch {
    return false;
  }
  await probe.close().catch(() => undefined);
  await rm(probePath, { force: true }).catch(() => undefined);
  return true;
}

/** Stamp the owner into a freshly created lock file. */
async function stampLockOwner(
  lockPath: string,
  handle: FileHandle,
  owner: LockOwner,
): Promise<StateLock> {
  const lock: StateLock = { handle, owner };
  try {
    await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf-8");
  } catch (error) {
    await releaseStateLock(lockPath, lock);
    throw new Error(`qfai: cannot stamp state lock ${lockPath}: ${describeError(error)}`);
  }
  return lock;
}

async function releaseStateLock(lockPath: string, lock: StateLock): Promise<void> {
  try {
    await lock.handle.close();
  } catch {
    // Already closed; the unlink below is what matters.
  }
  try {
    const snapshot = await readLockSnapshot(lockPath);
    if (snapshot === null) return;
    if (snapshot.owner !== null && snapshot.owner.token !== lock.owner.token) {
      // Our lock was reaped as abandoned and the path re-taken by
      // someone else: removing it now would drop *their* lock, not ours.
      return;
    }
    // Same identity check as the reaper: the path can be re-taken
    // between the read above and the unlink below.
    await removeLockIfUnchanged(lockPath, snapshot);
  } catch {
    // Best effort — a leftover lock is reaped as abandoned by the next writer.
  }
}

/** What one {@link updateState} mutation decided. */
export interface StateMutation<T> {
  /** The document to persist, or `null` to leave the file untouched. */
  readonly next: Record<string, unknown> | null;
  /** Value handed back to the caller of `updateState`. */
  readonly result: T;
}

/**
 * Serialized read-modify-write of `.qfai/state.json`.
 *
 * Every writer MUST go through this. Loading the whole document,
 * mutating it and writing it back is a lost-update race otherwise: two
 * runs read the same snapshot, both write, and the first increment
 * disappears. Holding the lock across the read as well as the write is
 * what closes that window — a compare-and-swap on the file contents
 * would leave one.
 *
 * Throws when the lock cannot be taken: no lock, no write. Callers on
 * a best-effort path must catch, as the scaffold-placeholder validator
 * already does.
 *
 * `mutate` is synchronous on purpose, to keep the critical section to
 * the two filesystem calls this function makes itself. A malformed
 * existing file makes `readStateStrict` throw, which is the refusal this
 * lock exists to make safe: the update is abandoned rather than written
 * from a snapshot that never parsed.
 */
export async function updateState<T>(
  root: string,
  mutate: (current: Record<string, unknown>) => StateMutation<T>,
): Promise<T> {
  const lockPath = stateLockPath(root);
  const lock = await acquireStateLock(lockPath);
  try {
    const current = (await readStateStrict(root)) ?? {};
    const { next, result } = mutate(current);
    if (next !== null) {
      // Re-checked here rather than trusted from the acquire: see
      // {@link lockStillOurs}. Nothing is written without it.
      if (!(await lockStillOurs(lockPath, lock))) {
        throw new Error(
          `qfai: state lock ${lockPath} was taken over while this update ran; ` +
            "refusing to write .qfai/state.json from a stale snapshot.",
        );
      }
      await writeStateFile(root, next);
    }
    return result;
  } finally {
    await releaseStateLock(lockPath, lock);
  }
}
