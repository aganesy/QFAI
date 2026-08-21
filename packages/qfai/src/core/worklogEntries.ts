import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { isEnoent } from "./fs/errno.js";
import { PROJECT_STEERING_DIR, PROJECT_STEERING_TEMPLATES_SUBDIR } from "./paths/assistantPaths.js";

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
};

/** The `kind` values whose entry records a run that stopped. */
export const WORKLOG_STOP_KINDS: readonly string[] = ["blocker", "handoff"];

/**
 * Every `.qfai/steering/**\/*.md` entry under `root`, or `[]` when the surface
 * does not exist. A file that cannot be read is returned with a `null`
 * frontmatter and an `<<unreadable: …>>` body rather than throwing, so one bad
 * entry cannot abort a whole `qfai validate` run.
 */
export async function collectWorklogEntries(root: string): Promise<WorklogEntry[]> {
  return collectFrom(path.join(root, PROJECT_STEERING_DIR), root);
}

/**
 * The spec ids that a `blocker` / `handoff` entry accounts for.
 *
 * Both association routes count: `scope: spec-NNNN` names the one spec the
 * entry applies to, and a `links[]` element resolves a `global` entry — a
 * handoff spanning several specs is written once with the specs in `links`,
 * and requiring `scope` would ask the author to duplicate it per spec.
 *
 * `status` is deliberately not filtered. An `archived` blocker beside a still
 * `blocked` row is a contradiction worth reporting, but it is a different
 * finding from "nothing was ever written", and treating it as this one would
 * mean re-opening entries to silence a validator.
 */
export function collectStoppedSpecIds(entries: readonly WorklogEntry[]): Set<string> {
  const specIds = new Set<string>();
  for (const entry of entries) {
    const fm = entry.frontmatter;
    if (fm === null) continue;
    if (typeof fm.kind !== "string" || !WORKLOG_STOP_KINDS.includes(fm.kind)) continue;
    if (typeof fm.scope === "string" && SPEC_ID.test(fm.scope.trim())) {
      specIds.add(fm.scope.trim());
    }
    if (!Array.isArray(fm.links)) continue;
    for (const link of fm.links) {
      if (typeof link !== "string") continue;
      const trimmed = link.trim();
      if (SPEC_ID.test(trimmed)) specIds.add(trimmed);
    }
  }
  return specIds;
}

const SPEC_ID = /^spec-\d{4}$/;

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
      });
      continue;
    }
    const parsed = parseWorklogEntry(body);
    entries.push({
      filePath: full,
      relativePath: path.relative(baseRoot, full).replace(/\\/g, "/"),
      frontmatter: parsed.frontmatter,
      body: parsed.body,
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
