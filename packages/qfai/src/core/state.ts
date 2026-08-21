import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
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
    if (isEnoent(err)) return { kind: "absent" };
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

/**
 * Persist the whole state document atomically: write a sibling temp
 * file, then rename it over the target. An interrupted run therefore
 * leaves either the old document or the new one, never a truncated
 * one. The temp name carries the pid so two processes do not collide
 * on the scratch file (interleaved read-modify-write across processes
 * remains a separate concern).
 */
export async function writeStateFile(root: string, state: Record<string, unknown>): Promise<void> {
  const abs = stateAbsPath(root);
  const tmp = `${abs}.${process.pid}.tmp`;
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
  try {
    await rename(tmp, abs);
  } catch (err) {
    try {
      await unlink(tmp);
    } catch {
      // Best-effort cleanup only; the rename failure is what matters.
    }
    throw err;
  }
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
