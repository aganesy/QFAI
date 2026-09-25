import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { isEnoent } from "./fs/errno.js";
import { PROJECT_STEERING_DIR, PROJECT_STEERING_TEMPLATES_SUBDIR } from "./paths/assistantPaths.js";

/**
 * The reader for the `.qfai/steering/` work-log surface.
 *
 * `worklogSurface` uses this reader so directory skips, BOM handling, and
 * CRLF handling have one implementation.
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

/**
 * Read every Markdown entry under the project work-log directory.
 * An unreadable entry is returned with its read error so validation can report it.
 */
export async function collectWorklogEntries(root: string): Promise<WorklogEntry[]> {
  return collectFrom(path.join(root, PROJECT_STEERING_DIR), root);
}
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
