import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import {
  HANDOFF_REQUIRED_SECTIONS,
  PROJECT_STEERING_DIR,
  PROJECT_STEERING_TEMPLATES_SUBDIR,
  WORKLOG_ENTRY_KINDS,
  WORKLOG_ENTRY_STATUSES,
} from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

// MUST match `worklog-entry.schema.md#kind enum` exactly (REQ-0004).
// Sourced from a single SSOT (WORKLOG_ENTRY_KINDS in assistantPaths.ts)
// so the enum cannot drift between the validator and the seeded
// README / template.
const ALLOWED_KINDS = new Set<string>(WORKLOG_ENTRY_KINDS);

// Sourced from HANDOFF_REQUIRED_SECTIONS (assistantPaths.ts SSOT) so
// the heading list cannot drift between the validator and the seeded
// entry template.
const REQUIRED_HANDOFF_SECTIONS: readonly string[] = HANDOFF_REQUIRED_SECTIONS;

// Sourced from WORKLOG_ENTRY_STATUSES (assistantPaths.ts SSOT) so the
// enum cannot drift between the validator and any seeded template.
// Contract: worklog-entry.schema.md#status enum (spec-0004 REQ-0035).
const ALLOWED_STATUS = new Set<string>(WORKLOG_ENTRY_STATUSES);

// Contract: worklog-entry.schema.md#created/updated — ISO-8601 calendar
// date (YYYY-MM-DD). Surface-syntax regex; calendar validity is
// enforced separately by isValidCalendarDate().
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(s: string): boolean {
  // ISO_DATE_RE.exec() returns capture groups for the YYYY/MM/DD trio.
  // Using exec (over String.split) keeps the types narrowed to string
  // without defensive undefined-checks.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  // Regex guarantees 3 numeric capture groups when it matches.
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) return false;
  const y = Number.parseInt(m[1], 10);
  const mo = Number.parseInt(m[2], 10);
  const d = Number.parseInt(m[3], 10);
  // Date.UTC() rolls over out-of-range fields (e.g. 2026-02-30 →
  // 2026-03-02) AND maps two-digit years 0..99 to 1900..1999. Use
  // setUTCFullYear() to bypass the legacy two-digit mapping and then
  // round-trip to detect rollover.
  const dt = new Date(0);
  dt.setUTCFullYear(y, mo - 1, d);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const STALE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

type Frontmatter = {
  id?: unknown;
  kind?: unknown;
  status?: unknown;
  created?: unknown;
  updated?: unknown;
  scope?: unknown;
  blocking?: unknown;
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
      // Parse failure → emit schema finding. If the body carries the
      // <<unreadable: ...>> sentinel from collectEntries, surface the
      // underlying read error message instead of the generic phrase.
      const unreadableMatch = /^<<unreadable: ([\s\S]*?)>>$/.exec(entry.body);
      const message = unreadableMatch
        ? `${entry.relativePath}: entry could not be read — ${unreadableMatch[1]}`
        : `${entry.relativePath}: YAML frontmatter is missing or unparseable.`;
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          message,
          "warning",
          entry.relativePath,
          unreadableMatch ? "worklogSurface.io.unreadable" : "worklogSurface.schema.parse",
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

    // id presence + format (kebab-case ASCII per
    // worklog-entry.schema.md Storage model).
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
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fm.id)) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: id="${fm.id}" is not kebab-case ASCII (lowercase letters/digits separated by single hyphens).`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.idFormat",
        ),
      );
    }

    // Other required fields per worklog-entry.schema.md: created, updated,
    // scope, blocking, promote-to (already checked above for type when
    // present). Missing → W-WORKLOG-SCHEMA warning each.
    for (const field of ["created", "updated", "scope"] as const) {
      const value = fm[field];
      if (typeof value !== "string" || value.length === 0) {
        issues.push(
          issue(
            "W-WORKLOG-SCHEMA",
            `${entry.relativePath}: ${field} field is missing or empty.`,
            "warning",
            entry.relativePath,
            `worklogSurface.schema.${field}Missing`,
          ),
        );
      }
    }
    // created / updated date format (ISO-8601 YYYY-MM-DD calendar date)
    // + ordering (updated >= created). Contract:
    // worklog-entry.schema.md#date.
    for (const field of ["created", "updated"] as const) {
      const value = fm[field];
      if (typeof value === "string" && value.length > 0 && !isValidCalendarDate(value)) {
        issues.push(
          issue(
            "W-WORKLOG-SCHEMA",
            `${entry.relativePath}: ${field}="${value}" is not a valid ISO-8601 calendar date (YYYY-MM-DD).`,
            "warning",
            entry.relativePath,
            `worklogSurface.schema.${field}Format`,
          ),
        );
      }
    }
    if (
      typeof fm.created === "string" &&
      typeof fm.updated === "string" &&
      isValidCalendarDate(fm.created) &&
      isValidCalendarDate(fm.updated) &&
      fm.updated < fm.created
    ) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: updated="${fm.updated}" is earlier than created="${fm.created}".`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.updatedOrder",
        ),
      );
    }

    // scope: "global" OR "spec-NNNN" (kebab-case spec id). Contract:
    // worklog-entry.schema.md#scope enum.
    if (typeof fm.scope === "string" && fm.scope.length > 0) {
      if (fm.scope !== "global" && !/^spec-\d{4}$/.test(fm.scope)) {
        issues.push(
          issue(
            "W-WORKLOG-SCHEMA",
            `${entry.relativePath}: scope="${fm.scope}" is not "global" or a "spec-NNNN" id.`,
            "warning",
            entry.relativePath,
            "worklogSurface.schema.scopeFormat",
          ),
        );
      }
    }
    if (typeof fm.blocking !== "boolean") {
      const blockingPresent = fm.blocking !== undefined;
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          blockingPresent
            ? `${entry.relativePath}: blocking field MUST be a boolean.`
            : `${entry.relativePath}: blocking field is missing.`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.blocking",
        ),
      );
    }
    // promote-to: required key; value is string OR null
    if (!("promote-to" in fm)) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: promote-to field is missing (use null when no promotion target).`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.promoteToMissing",
        ),
      );
    }

    // status presence + enum
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
    } else if (!ALLOWED_STATUS.has(fm.status)) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: status="${fm.status}" is not in the allowed set (${[...ALLOWED_STATUS].join(", ")}).`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.status",
        ),
      );
    }

    // filename = id invariant (contract: <id> MUST match filename stem)
    const filenameStem = path.basename(entry.filePath).replace(/\.md$/, "");
    if (typeof fm.id === "string" && fm.id.length > 0 && fm.id !== filenameStem) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: frontmatter id="${fm.id}" does not match filename stem "${filenameStem}".`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.idFilenameMismatch",
        ),
      );
    }

    // links presence (required by contract, may be empty array)
    if (fm.links === undefined) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: links field is missing (contract requires \`links: []\` or non-empty array).`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.linksMissing",
        ),
      );
    } else if (!Array.isArray(fm.links)) {
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `${entry.relativePath}: links field MUST be an array (got ${typeof fm.links}).`,
          "warning",
          entry.relativePath,
          "worklogSurface.schema.linksType",
        ),
      );
    }
    // links integrity
    if (Array.isArray(fm.links)) {
      for (const linkRaw of fm.links) {
        if (typeof linkRaw !== "string") {
          issues.push(
            issue(
              "W-WORKLOG-SCHEMA",
              `${entry.relativePath}: links[] element is not a string (got ${typeof linkRaw}); each link MUST be a string id.`,
              "warning",
              entry.relativePath,
              "worklogSurface.schema.linksElementType",
            ),
          );
          continue;
        }
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
        } else {
          // Otherwise treat as worklog entry-id (contract:
          // "<entry-id>" is kebab-case ASCII, no specific prefix
          // required — e.g. seeded date-style IDs like
          // `2026-05-22-recut-design-call`). Check against the entryIds
          // set built from this validate pass.
          if (!entryIds.has(link)) {
            issues.push(
              issue(
                "W-WORKLOG-BROKEN-LINK",
                `${entry.relativePath}: link "${link}" does not resolve to a known spec-NNNN, discussion-*, or worklog entry id.`,
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
        // Per qfai-validate.md contract, R-HANDOFF-INCOMPLETE is
        // advisory-failing (error severity). reviewerJustification.ts
        // already escalates the code when reviewer reports carry it
        // with an empty justification; the worklog-side detection must
        // also fire at error so handoff body drift is caught by
        // `--fail-on error` in CI.
        issues.push(
          issue(
            "R-HANDOFF-INCOMPLETE",
            `${entry.relativePath}: handoff entry is missing required sections: ${missing.join(", ")}.`,
            "error",
            entry.relativePath,
            "worklogSurface.handoff.sections",
          ),
        );
      }
    }

    // promote-to pending check — restricted to kind: decision per
    // worklog-entry.schema.md#promote-to semantics + qfai-validate.md
    // contract (W-PENDING-PROMOTION is the decision-promotion gate).
    // Non-decision entries with stray `promote-to` metadata do not
    // generate false pending-promotion noise.
    const promoteTo = fm["promote-to"];
    if (kind === "decision" && typeof promoteTo === "string" && promoteTo.length > 0) {
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
      if (dirEntry.name === PROJECT_STEERING_TEMPLATES_SUBDIR) continue;
      const sub = path.join(dir, dirEntry.name);
      const subEntries = await collectEntries(sub, baseRoot);
      entries.push(...subEntries);
      continue;
    }
    if (!dirEntry.isFile()) continue;
    if (!dirEntry.name.endsWith(".md")) continue;
    if (dirEntry.name === "README.md") continue;

    const full = path.join(dir, dirEntry.name);
    // Resilient read: if a single entry file cannot be read (EACCES,
    // EISDIR, unicode decode failure), surface a schema-parse finding
    // for that file instead of throwing out of the entire validator
    // chain. `.qfai/steering/` is user-authored markdown so one bad
    // file should not abort the whole `qfai validate` run.
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
  // Strip an optional UTF-8 BOM (Windows editors commonly write it)
  // before parsing; without this a valid frontmatter file saved with
  // BOM is reported as W-WORKLOG-SCHEMA (P2 from PR #209 review).
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  // Tolerate CRLF line endings (Windows-authored entries) by accepting
  // \r?\n at every delimiter position. Without this, frontmatter saved
  // with CRLF would be silently misparsed and reported as
  // W-WORKLOG-SCHEMA even when valid (P2 from PR #209 review).
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(stripped);
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
