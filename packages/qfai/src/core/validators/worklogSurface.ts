import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

const PROJECT_STEERING_DIR = ".qfai/steering";
const PROJECT_STEERING_TEMPLATES_DIR = "_templates";

// MUST match `worklog-entry.schema.md#kind enum` exactly (REQ-0004).
// Contract is the SSOT; do not localize names here.
const ALLOWED_KINDS = new Set([
  "milestone",
  "decision",
  "risk",
  "consultation-needed",
  "unexpected",
  "unscoped-discovery",
  "handoff",
  "blocker",
  "scope-up",
  "scope-down",
  "spike",
]);

// MUST match the 5 sections in `worklog-entry.schema.md#kind: handoff body`
// exactly (REQ-0017). Reviewer Gate emits R-HANDOFF-INCOMPLETE if any of
// these is missing or empty.
const REQUIRED_HANDOFF_SECTIONS = [
  "## State of the task",
  "## Next single action",
  "## Constraints to preserve",
  "## Open questions",
  "## References to consult first",
];

const STALE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

type Frontmatter = {
  id?: unknown;
  kind?: unknown;
  status?: unknown;
  created?: unknown;
  updated?: unknown;
  links?: unknown;
  "promote-to"?: unknown;
};

type ParsedEntry = {
  filePath: string;
  relativePath: string;
  frontmatter: Frontmatter | null;
  body: string;
};

export async function validateWorklogSurface(
  root: string,
  _config: QfaiConfig,
  now: Date = new Date(),
): Promise<Issue[]> {
  const dir = path.join(root, PROJECT_STEERING_DIR);
  if (!(await exists(dir))) return [];

  const entries = await collectEntries(dir, root);
  const issues: Issue[] = [];

  // Pre-build a Set of registered spec ids, discussion timestamps, and
  // worklog entry ids for link-integrity checks.
  const specIds = await collectSpecIds(root);
  const discussionIds = await collectDiscussionIds(root);
  const decisionRows = await readDecisionRows(root);
  const entryIds = new Set<string>();
  for (const e of entries) {
    const fmId = e.frontmatter && typeof e.frontmatter.id === "string" ? e.frontmatter.id : "";
    if (fmId.length > 0) entryIds.add(fmId);
  }

  const promotionTargets: Array<{ entry: ParsedEntry; target: string }> = [];

  for (const entry of entries) {
    if (entry.frontmatter === null) {
      // Parse failure → emit schema finding.
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: YAML frontmatter is missing or unparseable.`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.parse",
        ),
      );
      continue;
    }

    const fm = entry.frontmatter;
    // kind enum
    const kind = typeof fm.kind === "string" ? fm.kind : undefined;
    if (!kind || !ALLOWED_KINDS.has(kind)) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: kind="${kind ?? "(missing)"}" is not in the allowed set (${[...ALLOWED_KINDS].join(", ")}).`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.kind",
        ),
      );
    }

    // id presence
    if (typeof fm.id !== "string" || fm.id.length === 0) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: id field is missing or empty.`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.id",
        ),
      );
    }

    // status presence
    if (typeof fm.status !== "string" || fm.status.length === 0) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: status field is missing or empty.`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.status",
        ),
      );
    }

    // links integrity
    if (Array.isArray(fm.links)) {
      for (const linkRaw of fm.links) {
        if (typeof linkRaw !== "string") continue;
        const link = linkRaw.trim();
        if (link.length === 0) continue;
        if (link.startsWith("spec-")) {
          if (!specIds.has(link)) {
            issues.push(
              issue(
                "W-WORKLOG-BROKEN-LINK",
                `${entry.relativePath}: link "${link}" points to a non-existent spec.`,
                "warning",
                entry.relativePath,
                "worklogSurface.links.unresolved",
              ),
            );
          }
        } else if (link.startsWith("discussion-")) {
          if (!discussionIds.has(link)) {
            issues.push(
              issue(
                "W-WORKLOG-BROKEN-LINK",
                `${entry.relativePath}: link "${link}" points to a non-existent discussion.`,
                "warning",
                entry.relativePath,
                "worklogSurface.links.unresolved",
              ),
            );
          }
        } else if (link.startsWith("entry-")) {
          if (!entryIds.has(link)) {
            issues.push(
              issue(
                "W-WORKLOG-BROKEN-LINK",
                `${entry.relativePath}: link "${link}" points to a non-existent worklog entry.`,
                "warning",
                entry.relativePath,
                "worklogSurface.links.unresolved",
              ),
            );
          }
        }
      }
    }

    // handoff requires the 5 sections
    if (kind === "handoff") {
      const missing = REQUIRED_HANDOFF_SECTIONS.filter((header) => !entry.body.includes(header));
      if (missing.length > 0) {
        issues.push(
          issue(
            "R-HANDOFF-INCOMPLETE",
            `${entry.relativePath}: handoff entry is missing required sections: ${missing.join(", ")}.`,
            "warning",
            entry.relativePath,
            "worklogSurface.handoff.sections",
          ),
        );
      }
    }

    // promote-to pending check (deferred to per-decision lookup below)
    const promoteTo = fm["promote-to"];
    if (typeof promoteTo === "string" && promoteTo.length > 0) {
      promotionTargets.push({ entry, target: promoteTo });
    }

    // staleness
    if (typeof fm.status === "string" && fm.status === "active" && typeof fm.updated === "string") {
      const updatedAt = Date.parse(fm.updated);
      if (!Number.isNaN(updatedAt)) {
        const ageMs = now.getTime() - updatedAt;
        const ageDays = Math.floor(ageMs / MS_PER_DAY);
        if (ageDays > STALE_DAYS) {
          issues.push(
            issue(
              "W-WORKLOG-STALE",
              `${entry.relativePath}: status=active but updated ${ageDays}d ago (> ${STALE_DAYS}d).`,
              "warning",
              entry.relativePath,
              "worklogSurface.staleness",
            ),
          );
        }
      }
    }
  }

  for (const promo of promotionTargets) {
    const entryId =
      typeof promo.entry.frontmatter?.id === "string" ? promo.entry.frontmatter.id : "";
    const referenced = entryId.length > 0 && rowsReferenceEntryId(decisionRows, entryId);
    if (!referenced) {
      issues.push(
        issue(
          "W-PENDING-PROMOTION",
          `${promo.entry.relativePath}: promote-to="${promo.target}" is set but ${promo.target} has no row referencing ${entryId || "this entry"}.`,
          "warning",
          promo.entry.relativePath,
          "worklogSurface.pendingPromotion",
        ),
      );
    }
  }

  return issues;
}

/**
 * Tests whether any decision row references `entryId` as a whole token
 * (rather than as a substring). Without this, `entry-01` would falsely
 * match a row that only contains `entry-010`, silently suppressing
 * W-PENDING-PROMOTION for the unrelated parent entry.
 */
function rowsReferenceEntryId(rows: string[], entryId: string): boolean {
  const escaped = entryId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`);
  return rows.some((row) => pattern.test(row));
}

async function collectEntries(dir: string, baseRoot: string): Promise<ParsedEntry[]> {
  // baseRoot is the project root (NOT `dir`) so that nested entries still
  // produce `.qfai/steering/<sub>/<file>.md` style paths, not the
  // recursion-depth-dependent `steering/<sub>/<file>.md` which broke
  // finding-location traceability for users / tooling.
  const entries: ParsedEntry[] = [];
  let dirEntries: Dirent[];
  try {
    dirEntries = await readdir(dir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }

  for (const dirEntry of dirEntries) {
    if (dirEntry.isDirectory()) {
      if (dirEntry.name === PROJECT_STEERING_TEMPLATES_DIR) continue;
      const sub = path.join(dir, dirEntry.name);
      const subEntries = await collectEntries(sub, baseRoot);
      entries.push(...subEntries);
      continue;
    }
    if (!dirEntry.isFile()) continue;
    if (!dirEntry.name.endsWith(".md")) continue;
    if (dirEntry.name === "README.md") continue;

    const full = path.join(dir, dirEntry.name);
    const body = await readFile(full, "utf-8");
    const parsed = parseEntry(body);
    entries.push({
      filePath: full,
      relativePath: path.relative(baseRoot, full).replace(/\\/g, "/"),
      frontmatter: parsed.frontmatter,
      body: parsed.body,
    });
  }

  return entries;
}

function parseEntry(text: string): { frontmatter: Frontmatter | null; body: string } {
  // Tolerate CRLF line endings (Windows-authored entries) by accepting
  // \r?\n at every delimiter position. Without this, frontmatter saved
  // with CRLF would be silently misparsed and reported as
  // W-WORKLOG-SCHEMA even when valid (P2 from PR #209 review).
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) {
    return { frontmatter: null, body: text };
  }
  try {
    const data: unknown = parseYaml(match[1] ?? "");
    if (data !== null && typeof data === "object") {
      return { frontmatter: data as Frontmatter, body: match[2] ?? "" };
    }
    return { frontmatter: null, body: match[2] ?? "" };
  } catch {
    return { frontmatter: null, body: match[2] ?? "" };
  }
}

async function collectSpecIds(root: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const specsDir = path.join(root, ".qfai", "specs");
  if (!(await exists(specsDir))) return ids;
  let entries: Dirent[];
  try {
    entries = await readdir(specsDir, { withFileTypes: true });
  } catch {
    return ids;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && /^spec-\d{4}$/.test(entry.name)) {
      ids.add(entry.name);
    }
  }
  return ids;
}

async function collectDiscussionIds(root: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const discDir = path.join(root, ".qfai", "discussion");
  if (!(await exists(discDir))) return ids;
  let entries: Dirent[];
  try {
    entries = await readdir(discDir, { withFileTypes: true });
  } catch {
    return ids;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith("discussion-")) {
      ids.add(entry.name);
    }
  }
  return ids;
}

async function readDecisionRows(root: string): Promise<string[]> {
  const rows: string[] = [];
  const specsDir = path.join(root, ".qfai", "specs");
  if (!(await exists(specsDir))) return rows;
  let entries: Dirent[];
  try {
    entries = await readdir(specsDir, { withFileTypes: true });
  } catch {
    return rows;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const decisionFile = path.join(specsDir, entry.name, "07_Decisions.md");
    try {
      const body = await readFile(decisionFile, "utf-8");
      rows.push(...body.split("\n"));
    } catch (err: unknown) {
      if (!isEnoent(err)) throw err;
    }
  }
  return rows;
}

// Side-channel for the test suite to surface a stable stat-aware "now"
// reference if we ever want to swap the default Date in unit tests.
export { stat as _statForTesting };
