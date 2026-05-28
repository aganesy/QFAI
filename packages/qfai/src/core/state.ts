import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
 * Load `.qfai/state.json` as a parsed object, or `null` when the file
 * is missing / unreadable / not a JSON object. Each caller re-narrows
 * the fields it reads (so we avoid a bare `as` cast on a typed shape).
 */
async function loadState(root: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await readFile(stateAbsPath(root), "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    // `Record<string, unknown>` is the structural supertype of any parsed
    // JSON object; callers narrow each field they read.
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Read `discussion.currentId` from `.qfai/state.json`. Returns `null`
 * when the file, the `discussion` object, or the `currentId` string is
 * absent / not a non-empty string.
 */
export async function readDiscussionCurrentId(root: string): Promise<string | null> {
  const state = await loadState(root);
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
 * (and the `.qfai` directory) when absent and preserving unrelated
 * top-level keys. A malformed existing file is replaced rather than
 * failing the write.
 */
export async function writeDiscussionCurrentId(root: string, currentId: string): Promise<void> {
  const existing = (await loadState(root)) ?? {};

  const discussionField = existing.discussion;
  const discussion =
    discussionField !== null &&
    typeof discussionField === "object" &&
    !Array.isArray(discussionField)
      ? { ...(discussionField as Record<string, unknown>) }
      : {};
  discussion.currentId = currentId;

  const next: Record<string, unknown> = { ...existing, discussion };

  const abs = stateAbsPath(root);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}
