import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import {
  HANDOFF_REQUIRED_SECTIONS,
  PROJECT_STEERING_DIR,
  WORKLOG_ENTRY_KINDS,
  WORKLOG_ENTRY_STATUSES,
} from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { collectWorklogEntries, type WorklogEntry as ParsedEntry } from "../worklogEntries.js";
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
// date (YYYY-MM-DD). Surface-syntax + calendar validity enforced
// together by isValidCalendarDate(); kept as a single helper so all
// date checks share one source of truth.

function isValidCalendarDate(s: string): boolean {
  // The regex enforces a 4-digit YYYY + 2-digit MM/DD trio; capture
  // groups are always strings of fixed length when the match
  // succeeds. The explicit `=== undefined` checks below are a
  // TypeScript strict-mode concession (noUncheckedIndexedAccess
  // treats `RegExpExecArray[n]` as `string | undefined`) — they are
  // not runtime defenses against a real possibility.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) return false;
  const y = Number.parseInt(m[1], 10);
  const mo = Number.parseInt(m[2], 10);
  const d = Number.parseInt(m[3], 10);
  // Round-trip detection: Date.UTC() / setUTCFullYear() roll over
  // out-of-range fields (e.g. 2026-02-30 → 2026-03-02). We compare
  // the round-tripped getters against the input to catch this.
  // `setUTCFullYear()` over `Date.UTC(y, m, d)` is defensive only —
  // the 4-digit-year regex above already excludes the 0..99 legacy
  // two-digit-year mapping, but using the setter keeps the helper
  // safe if the regex ever loosens.
  const dt = new Date(0);
  dt.setUTCFullYear(y, mo - 1, d);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const STALE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export async function validateWorklogSurface(
  root: string,
  _config: QfaiConfig,
  now: Date = new Date(),
): Promise<Issue[]> {
  const dir = path.join(root, PROJECT_STEERING_DIR);
  if (!(await exists(dir))) return [];

  const entries = await collectWorklogEntries(root);
  const issues: Issue[] = [];

  // Pre-build a Set of registered spec ids, discussion timestamps, and
  // worklog entry ids for link-integrity checks.
  const specIds = await collectSpecIds(root);
  const discussionIds = await collectDiscussionIds(root);
  const decisionRowsByTarget = await readDecisionRowsByTarget(root);
  const entryIds = new Set<string>();
  for (const e of entries) {
    const fmId = e.frontmatter && typeof e.frontmatter.id === "string" ? e.frontmatter.id : "";
    if (fmId.length > 0) entryIds.add(fmId);
  }

  const promotionTargets: Array<{ entry: ParsedEntry; target: string }> = [];

  for (const entry of entries) {
    if (entry.frontmatter === null) {
      // Parse failure → emit schema finding. When `collectWorklogEntries`
      // could not read the file at all it carries the read error on
      // `readError`; surface that instead of the generic phrase.
      const readError = entry.readError;
      const message =
        readError !== null
          ? `${entry.relativePath}: entry could not be read — ${readError}`
          : `${entry.relativePath}: YAML frontmatter is missing or unparseable.`;
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          message,
          "warning",
          entry.relativePath,
          readError !== null ? "worklogSurface.io.unreadable" : "worklogSurface.schema.parse",
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
    // promote-to format check: contract worklog-entry.schema.md#promote-to
    // requires the non-null value to match `spec-NNNN/07_Decisions.md`
    // (no legacy bare-filename, no arbitrary path). Garbage values
    // would otherwise silently lookup-miss in the promotion gate.
    if (typeof fm["promote-to"] === "string" && fm["promote-to"].length > 0) {
      if (!/^spec-\d{4}\/07_Decisions\.md$/.test(fm["promote-to"])) {
        issues.push(
          issue(
            "W-WORKLOG-SCHEMA",
            `${entry.relativePath}: promote-to="${fm["promote-to"]}" must match \`spec-NNNN/07_Decisions.md\` (per worklog-entry.schema.md).`,
            "warning",
            entry.relativePath,
            "worklogSurface.schema.promoteToFormat",
          ),
        );
      }
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
        // Empty / whitespace-only link items fail the contract
        // (every element MUST resolve to a real reference). Surface
        // as W-WORKLOG-SCHEMA so the malformed item doesn't silently
        // pass both schema and broken-link checks.
        if (link.length === 0) {
          issues.push(
            issue(
              "W-WORKLOG-SCHEMA",
              `${entry.relativePath}: links[] element is empty / whitespace-only; every element MUST be a non-empty reference (spec-NNNN, discussion-*, or registered entry id).`,
              "warning",
              entry.relativePath,
              "worklogSurface.schema.linksElementEmpty",
            ),
          );
          continue;
        }
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
    const status =
      typeof promo.entry.frontmatter?.status === "string" ? promo.entry.frontmatter.status : "";
    const promotedToRaw = promo.entry.frontmatter?.["promoted-to"];
    const promotedToBackRef = typeof promotedToRaw === "string" ? promotedToRaw.trim() : "";
    // Promotion satisfaction (REQ-0037 / AC-0004-0020) requires ALL
    // THREE of:
    //   1. A row in the DECLARED target file references this entry's
    //      id. The target is matched against per-spec
    //      `07_Decisions.md` keys (`spec-NNNN/07_Decisions.md`); a
    //      mention in an unrelated spec does NOT count.
    //   2. `status: archived` — the entry has been closed.
    //   3. A non-empty `promoted-to:` back-ref pointing at the same
    //      target file — the entry records WHERE it was promoted to.
    // Legacy bare `07_Decisions.md` (without spec-NNNN prefix)
    // intentionally does NOT match the canonical map keys, so the
    // lookup miss surfaces ambiguous bare paths as
    // W-PENDING-PROMOTION so users fix the promote-to value to a
    // fully-qualified target.
    const targetKey = promo.target.trim();
    const targetRows = decisionRowsByTarget.get(targetKey) ?? [];
    const referenced = entryId.length > 0 && rowsReferenceEntryId(targetRows, entryId);
    const isArchived = status === "archived";
    // `promoted-to:` back-ref semantics per BR-0004-0019: the value
    // is the DR-ID (Decision Row id, e.g. `DR-3`) that was appended
    // to the target file when the decision was promoted, NOT the
    // file path. We only check that the back-ref is set; format
    // validation of the DR-ID itself is left to spec-side gates so
    // this validator doesn't need to know the per-spec DR
    // numbering scheme.
    const hasBackRef = promotedToBackRef.length > 0;
    const satisfied = referenced && isArchived && hasBackRef;
    if (!satisfied) {
      const reasons: string[] = [];
      if (!referenced) {
        reasons.push(`${promo.target} has no row referencing ${entryId || "this entry"}`);
      }
      if (!isArchived) {
        reasons.push(`entry status is "${status}" (must be "archived" to satisfy promotion)`);
      }
      if (!hasBackRef) {
        reasons.push(
          `\`promoted-to:\` back-ref is missing (must contain the DR-ID of the appended row in ${promo.target})`,
        );
      }
      const detail = reasons.join("; ");
      issues.push(
        issue(
          "W-PENDING-PROMOTION",
          `${promo.entry.relativePath}: promote-to="${promo.target}" is set but ${detail}.`,
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

/**
 * Read every `<spec>/07_Decisions.md` under `.qfai/specs/` and index
 * the rows by their normalized target key (`spec-NNNN/07_Decisions.md`).
 * The promotion-gate check looks up each entry's `promote-to:` target
 * against this map so a mention in an unrelated spec cannot
 * incorrectly satisfy the gate (P2 r3292030149).
 */
async function readDecisionRowsByTarget(root: string): Promise<Map<string, string[]>> {
  const byTarget = new Map<string, string[]>();
  const specsDir = path.join(root, ".qfai", "specs");
  if (!(await exists(specsDir))) return byTarget;
  let entries: Dirent[];
  try {
    entries = await readdir(specsDir, { withFileTypes: true });
  } catch {
    return byTarget;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const decisionFile = path.join(specsDir, entry.name, "07_Decisions.md");
    try {
      const body = await readFile(decisionFile, "utf-8");
      const rows = body.split("\n");
      const targetKey = `${entry.name}/07_Decisions.md`;
      byTarget.set(targetKey, rows);
    } catch (err: unknown) {
      if (!isEnoent(err)) throw err;
    }
  }
  return byTarget;
}

// Side-channel for the test suite to surface a stable stat-aware "now"
// reference if we ever want to swap the default Date in unit tests.
export { stat as _statForTesting };
