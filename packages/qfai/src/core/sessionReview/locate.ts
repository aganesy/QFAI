/**
 * Where a project's agent transcripts are on this machine.
 *
 * Claude Code keeps a session as `<id>.jsonl` in a project directory named after the absolute
 * root; Codex keeps rollouts by date and records the working directory inside each. Both are read
 * where the host left them, and nothing is copied.
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { compareText, isMissing, readJsonl, stringAt } from "./events.js";
import { codexSessionMeta } from "./parseCodex.js";

export type Agent = "claude" | "codex";

export type SessionFile = { agent: Agent; sessionId: string; file: string; mtimeMs: number };

export type LocateEnvironment = {
  home: string;
  claudeConfigDir?: string;
  codexHome?: string;
  platform: NodeJS.Platform;
};

/** Directory listing, injectable so a test can hand the entries over in any order. */
export type ListDirectory = (dir: string) => Promise<string[]>;

const defaultList: ListDirectory = async (dir) => readdir(dir);

/**
 * How much of the slug a shortened Claude Code project directory name still starts with. Claude
 * Code shortens a long name and keeps its start, so the fallback reads only directories that
 * share this much of it.
 */
const SLUG_PREFIX = 100;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * The instant a `--since` value names: an ISO 8601 date, read as midnight UTC, or a date and time
 * with `Z` or an explicit offset. `null` for anything else, so no value depends on the local zone.
 */
export function sinceInstant(value: string): number | null {
  if (!ISO_DATE.test(value) && !ISO_DATE_TIME.test(value)) return null;
  if (!isCalendarDate(value.slice(0, 10))) return null;
  const instant = Date.parse(ISO_DATE.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(instant) ? null : instant;
}

/** Whether `YYYY-MM-DD` names a day the calendar has: 2026-02-30 does not. */
function isCalendarDate(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** The Claude Code project directory name for `root`: every non-alphanumeric character is `-`. */
export function claudeProjectSlug(
  root: string,
  paths: Pick<typeof path, "resolve"> = path,
): string {
  return paths.resolve(root).replace(/[^A-Za-z0-9]/g, "-");
}

/** Whether two directories are the same once slashes, a trailing slash and, on Windows, case are set aside. */
export function sameDirectory(a: string, b: string, platform: NodeJS.Platform): boolean {
  const normal = (value: string): string => {
    const slashed = value.replace(/\\+/g, "/").replace(/\/+$/, "");
    return platform === "win32" ? slashed.toLowerCase() : slashed;
  };
  return normal(a) === normal(b);
}

export async function locateSessions(
  root: string,
  agents: readonly Agent[],
  env: LocateEnvironment,
  list: ListDirectory = defaultList,
): Promise<SessionFile[]> {
  const found: SessionFile[] = [];
  if (agents.includes("claude")) found.push(...(await locateClaude(root, env, list)));
  if (agents.includes("codex")) found.push(...(await locateCodex(root, env, list)));
  return found.sort(
    (a, b) => compareText(a.agent, b.agent) || compareText(a.sessionId, b.sessionId),
  );
}

async function locateClaude(
  root: string,
  env: LocateEnvironment,
  list: ListDirectory,
): Promise<SessionFile[]> {
  const projects = path.join(env.claudeConfigDir ?? path.join(env.home, ".claude"), "projects");
  const slug = claudeProjectSlug(root);
  // Two roots can share a slug (`/repo/a-b` and `/repo/a/b`), so even this directory's
  // transcripts count only when they record the root as a cwd.
  const own = await sessionsOfRoot(path.join(projects, slug), root, env, list);
  if (own.length > 0) return own;
  // A long root is shortened in the directory name, so the slug alone cannot always find it.
  const fold = (value: string): string => (env.platform === "win32" ? value.toLowerCase() : value);
  const prefix = fold(slug.slice(0, SLUG_PREFIX));
  const matched: SessionFile[] = [];
  for (const dir of await sortedEntries(projects, list)) {
    if (dir === slug || !fold(dir).startsWith(prefix)) continue;
    matched.push(...(await sessionsOfRoot(path.join(projects, dir), root, env, list)));
  }
  return matched;
}

/**
 * The transcripts in `dir` that record the root as a cwd. Any record counts, not only the first: a
 * session the desktop app opened in a scratch directory records that directory until it moves
 * into the root.
 */
async function sessionsOfRoot(
  dir: string,
  root: string,
  env: LocateEnvironment,
  list: ListDirectory,
): Promise<SessionFile[]> {
  const matched: SessionFile[] = [];
  for (const session of await claudeSessionsIn(dir, list)) {
    if (await recordsCwd(session.file, root, env.platform)) matched.push(session);
  }
  return matched;
}

async function claudeSessionsIn(dir: string, list: ListDirectory): Promise<SessionFile[]> {
  const sessions: SessionFile[] = [];
  for (const name of await sortedEntries(dir, list)) {
    if (!name.endsWith(".jsonl")) continue;
    const file = path.join(dir, name);
    const mtimeMs = await fileTime(file);
    if (mtimeMs !== null)
      sessions.push({ agent: "claude", sessionId: name.slice(0, -6), file, mtimeMs });
  }
  return sessions;
}

async function locateCodex(
  root: string,
  env: LocateEnvironment,
  list: ListDirectory,
): Promise<SessionFile[]> {
  const sessionsDir = path.join(env.codexHome ?? path.join(env.home, ".codex"), "sessions");
  const sessions: SessionFile[] = [];
  for (const file of await rolloutFiles(sessionsDir, list, 3)) {
    // A rollout opens with its session_meta record, so only that one is read.
    const meta = await firstValue(file, (record) => codexSessionMeta(record) ?? undefined, 1);
    if (meta?.cwd === undefined || !sameDirectory(meta.cwd, root, env.platform)) continue;
    const mtimeMs = await fileTime(file);
    if (mtimeMs === null) continue;
    const fromName = /([0-9a-f]{8}-[0-9a-f-]{28})\.jsonl$/i.exec(file)?.[1];
    const sessionId = meta.id ?? fromName ?? path.basename(file, ".jsonl");
    sessions.push({ agent: "codex", sessionId, file, mtimeMs });
  }
  return sessions;
}

/** `rollout-*.jsonl` files under `sessions/YYYY/MM/DD/`. */
async function rolloutFiles(dir: string, list: ListDirectory, depth: number): Promise<string[]> {
  const files: string[] = [];
  for (const name of await sortedEntries(dir, list)) {
    const entry = path.join(dir, name);
    if (depth > 0) files.push(...(await rolloutFiles(entry, list, depth - 1)));
    else if (/^rollout-.*\.jsonl$/.test(name)) files.push(entry);
  }
  return files;
}

/** A directory's entries in code-unit order, or none when it is not there. */
async function sortedEntries(dir: string, list: ListDirectory): Promise<string[]> {
  try {
    return [...(await list(dir))].sort(compareText);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
}

/** A regular file's modification time, or `null` when the path is not a file. */
async function fileTime(file: string): Promise<number | null> {
  try {
    const info = await stat(file);
    return info.isFile() ? info.mtimeMs : null;
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

/** Whether a record of `file` names `root` as its cwd, reading no further than the first that does. */
async function recordsCwd(file: string, root: string, platform: NodeJS.Platform): Promise<boolean> {
  let found = false;
  await readJsonl(file, (record) => {
    const cwd = stringAt(record, "cwd");
    found = cwd !== undefined && sameDirectory(cwd, root, platform);
    return !found;
  });
  return found;
}

/** The first value `pick` finds, reading no further than it and at most `limit` records. */
async function firstValue<T>(
  file: string,
  pick: (record: Record<string, unknown>) => T | undefined,
  limit = Number.POSITIVE_INFINITY,
): Promise<T | undefined> {
  let value: T | undefined;
  let seen = 0;
  await readJsonl(file, (record) => {
    seen += 1;
    value = pick(record);
    return value === undefined && seen < limit;
  });
  return value;
}
