import { randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import type { Stats } from "node:fs";
import {
  access,
  chmod,
  lstat,
  mkdir,
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
 * `state.json` forever, and QFAI's managed `.gitignore` ignores only
 * `.qfai/state.json` itself — so each one shows up as an untracked file
 * a `git add .` would sweep into a commit. Never fails the write it
 * follows.
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
 * (`validators/scaffoldPlaceholder.ts`), and the returned mode is
 * re-applied to the scratch file so an atomic write preserves the
 * document's permissions.
 */
async function prepareWriteTarget(abs: string): Promise<{ target: string; mode?: number }> {
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
    return { target, mode: current.mode & 0o7777 }; // permission bits only, not the file type
  } catch (err) {
    if (isEnoent(err)) return { target }; // dangling link: create its target
    throw err;
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
 */
export async function writeStateFile(root: string, state: Record<string, unknown>): Promise<void> {
  const abs = stateAbsPath(root);
  await mkdir(path.dirname(abs), { recursive: true });
  const { target, mode } = await prepareWriteTarget(abs);
  const dir = path.dirname(target);
  const base = path.basename(target);
  const tmp = path.join(dir, `${base}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);
  try {
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
    if (mode !== undefined) await chmod(tmp, mode);
    await rename(tmp, target);
  } catch (err) {
    try {
      await unlink(tmp);
    } catch {
      // Best-effort cleanup only; the original failure is what matters.
    }
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
