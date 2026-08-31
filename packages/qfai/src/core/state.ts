import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "./fs/errno.js";

/**
 * `.qfai/state.json` is the single SSOT for ephemeral, per-runtime
 * session state (NOT committed configuration). It currently records
 * the active discussion session pointer under `discussion.currentId`.
 *
 * Read helpers tolerate a missing file / missing keys / malformed JSON
 * by returning `null` (no throw to the caller). Write helpers
 * create-or-merge without clobbering unrelated top-level keys.
 */
const STATE_REL = path.join(".qfai", "state.json");

function stateAbsPath(root: string): string {
  return path.join(root, STATE_REL);
}

/**
 * A strict read of `.qfai/state.json`.
 *
 * `ok: true` with `state: null` means the file is absent — a state we
 * *know*: nothing has been recorded yet. `ok: false` means the file is
 * there but its contents could not be established (unreadable, invalid
 * JSON, or a non-object document); the pointer is then unknown rather
 * than unset, and the two must not be reported alike.
 */
type StateRead =
  | { ok: true; state: Record<string, unknown> | null }
  | { ok: false; reason: string };

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

async function loadStateStrict(root: string): Promise<StateRead> {
  const abs = stateAbsPath(root);
  let raw: string;
  try {
    raw = await readFile(abs, "utf-8");
  } catch (cause) {
    if (isEnoent(cause)) {
      return { ok: true, state: null };
    }
    return { ok: false, reason: `cannot read ${abs}: ${describeCause(cause)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    return { ok: false, reason: `cannot parse ${abs}: ${describeCause(cause)}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: `${abs} is not a JSON object.` };
  }
  // `Record<string, unknown>` is the structural supertype of any parsed
  // JSON object; callers narrow each field they read.
  return { ok: true, state: parsed as Record<string, unknown> };
}

/**
 * Outcome of reading `.qfai/state.json`.
 *
 * `"missing"` (no file) and `"corrupt"` (unreadable, not JSON, not a JSON
 * object) are deliberately NOT the same case. A missing state file is the
 * ordinary state of a project that never ran `qfai discussion use`; a corrupt
 * one is broken runtime state that only a repair can clear. Collapsing the two
 * lets a consumer treat "nothing was ever pinned" and "the pin cannot be read"
 * identically and silently substitute an inferred answer.
 */
type StateFileRead =
  | { kind: "missing" }
  | { kind: "corrupt"; detail: string }
  | { kind: "ok"; state: Record<string, unknown> };

/**
 * Load `.qfai/state.json`, discriminating absence from corruption. Each caller
 * re-narrows the fields it reads (so we avoid a bare `as` cast on a typed
 * shape).
 */
async function readStateFile(root: string): Promise<StateFileRead> {
  let raw: string;
  try {
    raw = await readFile(stateAbsPath(root), "utf-8");
  } catch (error) {
    if (isEnoent(error)) return { kind: "missing" };
    return {
      kind: "corrupt",
      detail: `${STATE_REL} could not be read (${error instanceof Error ? error.message : String(error)})`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      kind: "corrupt",
      detail: `${STATE_REL} is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
    };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "corrupt", detail: `${STATE_REL} is not a JSON object` };
  }
  // `Record<string, unknown>` is the structural supertype of any parsed
  // JSON object; callers narrow each field they read.
  return { kind: "ok", state: parsed as Record<string, unknown> };
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
  const read = await readStateFile(root);
  if (read.kind === "missing") return { kind: "unset" };
  if (read.kind === "corrupt") return { kind: "corrupt", detail: read.detail };

  const discussion: unknown = read.state.discussion;
  if (discussion === undefined) return { kind: "unset" };
  if (!isJsonObject(discussion)) {
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

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function describeJsonValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
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
  const read = await loadStateStrict(root);
  if (!read.ok) {
    return read;
  }
  if (read.state === null) {
    return { ok: true, currentId: null };
  }
  const abs = stateAbsPath(root);
  const discussion = read.state.discussion;
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
 * (and the `.qfai` directory) when absent and preserving unrelated
 * top-level keys. A malformed existing file is replaced rather than
 * failing the write.
 */
export async function writeDiscussionCurrentId(root: string, currentId: string): Promise<void> {
  const read = await readStateFile(root);
  const existing: Record<string, unknown> = read.kind === "ok" ? read.state : {};

  const discussionField: unknown = existing.discussion;
  const discussion: Record<string, unknown> = isJsonObject(discussionField)
    ? { ...discussionField }
    : {};
  discussion.currentId = currentId;

  const next: Record<string, unknown> = { ...existing, discussion };

  const abs = stateAbsPath(root);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}
