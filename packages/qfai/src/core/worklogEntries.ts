import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { isEnoent } from "./fs/errno.js";
import {
  HANDOFF_REQUIRED_SECTIONS,
  PROJECT_STEERING_DIR,
  PROJECT_STEERING_TEMPLATES_SUBDIR,
  WORKLOG_ENTRY_STATUSES,
} from "./paths/assistantPaths.js";

/**
 * The reader for the `.qfai/steering/` work-log surface.
 *
 * Two validators open these files: `worklogSurface` polices the schema of the
 * entries that exist, and `tddList` asks whether one exists for a ledger row
 * that stopped. A second walk would let the directory-skip rules, the BOM
 * tolerance and the CRLF tolerance drift between them, so both read the
 * surface through this module.
 */

/**
 * The frontmatter fields this package reads, all `unknown` because the file is
 * user-authored: the schema check is `worklogSurface`'s job and it must see the
 * wrong type rather than a parse that already discarded it.
 */
export type WorklogFrontmatter = {
  id?: unknown;
  kind?: unknown;
  status?: unknown;
  created?: unknown;
  updated?: unknown;
  scope?: unknown;
  blocking?: unknown;
  links?: unknown;
  "promote-to"?: unknown;
  "promoted-to"?: unknown;
};

export type WorklogEntry = {
  filePath: string;
  /** POSIX-separated path from the project root, for finding locations. */
  relativePath: string;
  /** `null` when the file has no parseable frontmatter block. */
  frontmatter: WorklogFrontmatter | null;
  body: string;
  /**
   * The read error's message when the file could not be read at all, `null`
   * otherwise.
   *
   * The distinction matters to every caller that draws a conclusion from an
   * entry's *absence*: a file whose frontmatter is merely malformed is a
   * work-log the author still wrote, while one that could not be read carries
   * no information either way. Callers that would otherwise report "no entry
   * exists" must abstain while this is set — the missing evidence may be
   * sitting in the file they could not open.
   */
  readError: string | null;
};

/** The `kind` values whose entry records a run that stopped. */
export const WORKLOG_STOP_KINDS: readonly string[] = ["blocker", "handoff"];

/**
 * Every `.qfai/steering/**\/*.md` entry under `root`, or `[]` when the surface
 * does not exist. A file that cannot be read is returned with a `null`
 * frontmatter, its read error on `readError` and an `<<unreadable: …>>` body
 * rather than throwing, so one bad entry cannot abort a whole `qfai validate`
 * run — see `readError` for what a caller owes that entry.
 */
export async function collectWorklogEntries(root: string): Promise<WorklogEntry[]> {
  return collectFrom(path.join(root, PROJECT_STEERING_DIR), root);
}

/**
 * The `status` values whose entry still accounts for a stop that is in force.
 *
 * `archived` is excluded: it is the closed state, so a resolved blocker from
 * three months ago must not stand in for the entry a stop today owes. Leaving
 * it in would let one spec's first blocker silence the check forever.
 */
const OPEN_WORKLOG_STATUSES: readonly string[] = WORKLOG_ENTRY_STATUSES.filter(
  (status) => status !== "archived",
);

/**
 * The spec ids that an open `blocker` / `handoff` entry accounts for.
 *
 * Both association routes count, but they are not symmetric:
 *
 * - `scope: spec-NNNN` names the one spec the entry applies to.
 * - `links[]` resolves the spec set of a `scope: global` entry only — a handoff
 *   spanning several specs is written once with the specs in `links`, and
 *   requiring `scope` would ask the author to duplicate it per spec. On a
 *   `scope: spec-NNNN` entry `links` is a plain cross-reference, and the specs
 *   it names never read the entry (implementation skills filter on
 *   `scope ∈ {global, current-spec}`), so it cannot account for their stop.
 *
 * An entry is counted only when its frontmatter has the shape the work-log
 * contract requires. `--profile tdd` does not run `validateWorklogSurface`, so
 * without this gate a file carrying nothing but `kind:` and `scope:` — never a
 * work-log by the schema, and never reported under that profile — would
 * suppress the finding.
 */
export function collectStoppedSpecIds(entries: readonly WorklogEntry[]): Set<string> {
  const specIds = new Set<string>();
  for (const entry of entries) {
    const fm = entry.frontmatter;
    if (fm === null) continue;
    if (typeof fm.kind !== "string" || !WORKLOG_STOP_KINDS.includes(fm.kind)) continue;
    if (!hasStopRecordShape(fm, fm.kind, entry.body)) continue;
    const scope = typeof fm.scope === "string" ? fm.scope.trim() : "";
    if (SPEC_ID.test(scope)) {
      specIds.add(scope);
      continue;
    }
    if (scope !== "global") continue;
    if (!Array.isArray(fm.links)) continue;
    for (const link of fm.links) {
      if (typeof link !== "string") continue;
      const trimmed = link.trim();
      if (SPEC_ID.test(trimmed)) specIds.add(trimmed);
    }
  }
  return specIds;
}

/**
 * The entries whose file could not be read at all.
 *
 * A caller that concludes "no entry accounts for this stop" from an empty
 * `collectStoppedSpecIds` result must consult this first: an entry that could
 * not be opened is silently absent from that set, and reporting the omission
 * would accuse the author of not writing a record that may well be there.
 */
export function unreadableWorklogEntries(
  entries: readonly WorklogEntry[],
): Array<{ relativePath: string; detail: string }> {
  const unreadable: Array<{ relativePath: string; detail: string }> = [];
  for (const entry of entries) {
    if (entry.readError === null) continue;
    unreadable.push({ relativePath: entry.relativePath, detail: entry.readError });
  }
  return unreadable;
}

/**
 * Whether the entry carries the required fields of `worklog-entry.schema.md`
 * in the required shapes, and — on a `handoff` — the body the schema requires.
 *
 * Shape only — `worklogSurface` stays the authority on the values (calendar
 * validity of the dates, `id`-to-filename agreement, link resolution) and is
 * the validator that reports them. This asks the narrower question the stop
 * check needs an answer to: is this file a work-log entry at all?
 *
 * The body is checked on `handoff` for the same reason `promote-to` is checked
 * above. `worklogSurface` reports a handoff missing any of
 * {@link HANDOFF_REQUIRED_SECTIONS} as `R-HANDOFF-INCOMPLETE`, and that
 * validator does not run under `--profile tdd`. Without this, a file whose
 * frontmatter is perfect and whose body is empty suppressed the stop finding
 * while raising nothing itself: the ledger said the run stopped, and the one
 * artifact that was supposed to say what the next session picks up carried no
 * state, no next action and no constraints. Section presence only — their
 * contents are `worklogSurface`'s to judge.
 */
function hasStopRecordShape(fm: WorklogFrontmatter, kind: string, body: string): boolean {
  if (kind === "handoff" && !HANDOFF_REQUIRED_SECTIONS.every((h) => body.includes(h))) return false;
  if (typeof fm.id !== "string" || fm.id.length === 0) return false;
  if (typeof fm.status !== "string" || !OPEN_WORKLOG_STATUSES.includes(fm.status)) return false;
  if (typeof fm.blocking !== "boolean") return false;
  if (!Array.isArray(fm.links)) return false;
  // Required key, `string | null` — `worklogSurface` reports its absence as
  // `W-WORKLOG-SCHEMA` ("use null when no promotion target"), and that
  // validator does not run under `--profile tdd`. Without this line a file
  // missing it counts as a stop record here while being schema-invalid
  // everywhere else.
  if (!("promote-to" in fm)) return false;
  const promoteTo = fm["promote-to"];
  if (promoteTo !== null && typeof promoteTo !== "string") return false;
  const scope = typeof fm.scope === "string" ? fm.scope.trim() : "";
  if (scope !== "global" && !SPEC_ID.test(scope)) return false;
  for (const field of ["created", "updated"] as const) {
    const value = fm[field];
    if (typeof value !== "string" || !ISO_DATE.test(value.trim())) return false;
  }
  return true;
}

const SPEC_ID = /^spec-\d{4}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function collectFrom(dir: string, baseRoot: string): Promise<WorklogEntry[]> {
  // baseRoot is the project root (NOT `dir`) so that nested entries still
  // produce `.qfai/steering/<sub>/<file>.md` style paths, not the
  // recursion-depth-dependent `steering/<sub>/<file>.md` which broke
  // finding-location traceability for users / tooling.
  const entries: WorklogEntry[] = [];
  let dirEntries: Dirent[];
  try {
    dirEntries = await readdir(dir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }

  for (const dirEntry of dirEntries) {
    if (dirEntry.isDirectory()) {
      if (dirEntry.name === PROJECT_STEERING_TEMPLATES_SUBDIR) continue;
      const sub = path.join(dir, dirEntry.name);
      const subEntries = await collectFrom(sub, baseRoot);
      entries.push(...subEntries);
      continue;
    }
    if (!dirEntry.isFile()) continue;
    if (!dirEntry.name.endsWith(".md")) continue;
    if (dirEntry.name === "README.md") continue;

    const full = path.join(dir, dirEntry.name);
    // Resilient read: if a single entry file cannot be read (EACCES,
    // EISDIR, unicode decode failure), hand the caller the sentinel body
    // instead of throwing out of the entire validator chain.
    // `.qfai/steering/` is user-authored markdown so one bad file should
    // not abort the whole `qfai validate` run.
    let body: string;
    try {
      body = await readFile(full, "utf-8");
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      entries.push({
        filePath: full,
        relativePath: path.relative(baseRoot, full).replace(/\\/g, "/"),
        frontmatter: null,
        body: `<<unreadable: ${detail}>>`,
        readError: detail,
      });
      continue;
    }
    const parsed = parseWorklogEntry(body);
    entries.push({
      filePath: full,
      relativePath: path.relative(baseRoot, full).replace(/\\/g, "/"),
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      readError: null,
    });
  }

  return entries;
}

export function parseWorklogEntry(text: string): {
  frontmatter: WorklogFrontmatter | null;
  body: string;
} {
  // Strip an optional UTF-8 BOM (Windows editors commonly write it)
  // before parsing; without this a valid frontmatter file saved with
  // BOM is reported as W-WORKLOG-SCHEMA.
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  // Tolerate CRLF line endings (Windows-authored entries) by accepting
  // \r?\n at every delimiter position. Without this, frontmatter saved
  // with CRLF would be silently misparsed and reported as
  // W-WORKLOG-SCHEMA even when valid.
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(stripped);
  if (!match) {
    return { frontmatter: null, body: text };
  }
  try {
    const data: unknown = parseYaml(match[1] ?? "");
    if (data !== null && typeof data === "object") {
      // Copied into a plain record rather than asserted: every field is
      // `unknown` here, so the copy is the narrowing — nothing about the
      // parsed shape is claimed that the schema check would have to re-derive.
      const record: Record<string, unknown> = { ...data };
      return { frontmatter: record, body: match[2] ?? "" };
    }
    return { frontmatter: null, body: match[2] ?? "" };
  } catch {
    return { frontmatter: null, body: match[2] ?? "" };
  }
}
