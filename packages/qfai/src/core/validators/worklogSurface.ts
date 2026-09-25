import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { resolveStoryTreeRoots } from "../storyTree/layout.js";
import { parseRecordTable, type RecordRow } from "../storyTree/tables.js";
import {
  HANDOFF_REQUIRED_SECTIONS,
  PROJECT_STEERING_DIR,
  WORKLOG_ENTRY_KINDS,
  WORKLOG_ENTRY_STATUSES,
} from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { collectWorklogEntries, type WorklogEntry as ParsedEntry } from "../worklogEntries.js";
import { exists, issue } from "./utils.js";

// MUST match `worklog-entry.schema.md#kind enum` exactly.
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
// Contract: worklog-entry.schema.md#status enum.
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
  config: QfaiConfig,
  now: Date = new Date(),
): Promise<Issue[]> {
  const dir = path.join(root, PROJECT_STEERING_DIR);
  if (!(await exists(dir))) return [];

  const entries = await collectWorklogEntries(root);
  const issues: Issue[] = [];

  const { specsDir } = resolveStoryTreeRoots(root, config);
  const flowIds = await collectFlowIds(specsDir);
  const discussionIds = await collectDiscussionIds(resolvePath(root, config, "discussionDir"));
  const decisionRows = await readDecisionRows(specsDir);
  const decisionIds = new Set(decisionRows.map((row) => row.id));
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

    // scope: "global" OR a business flow ID. Contract:
    // worklog-entry.schema.md#scope enum.
    if (typeof fm.scope === "string" && fm.scope.length > 0) {
      if (fm.scope !== "global" && !/^BF-\d{4}$/.test(fm.scope)) {
        issues.push(
          issue(
            "W-WORKLOG-SCHEMA",
            `${entry.relativePath}: scope="${fm.scope}" is not "global" or a "BF-NNNN" id.`,
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
    // requires the non-null value to be `decisions.md`. Garbage values
    // would otherwise silently lookup-miss in the promotion gate.
    if (typeof fm["promote-to"] === "string" && fm["promote-to"].length > 0) {
      if (fm["promote-to"] !== "decisions.md") {
        issues.push(
          issue(
            "W-WORKLOG-SCHEMA",
            `${entry.relativePath}: promote-to="${fm["promote-to"]}" must be \`decisions.md\` (per worklog-entry.schema.md).`,
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
              `${entry.relativePath}: links[] element is empty / whitespace-only; every element MUST be a non-empty reference (BF-NNNN, DEC-NNNN, discussion-*, or registered entry id).`,
              "warning",
              entry.relativePath,
              "worklogSurface.schema.linksElementEmpty",
            ),
          );
          continue;
        }
        if (/^BF-\d{4}$/.test(link)) {
          if (!flowIds.has(link)) {
            issues.push(
              issue(
                "W-WORKLOG-BROKEN-LINK",
                `${entry.relativePath}: link "${link}" points to a non-existent business flow.`,
                "warning",
                entry.relativePath,
                "worklogSurface.links.unresolved",
              ),
            );
          }
        } else if (/^DEC-\d{4}$/.test(link)) {
          if (!decisionIds.has(link)) {
            issues.push(
              issue(
                "W-WORKLOG-BROKEN-LINK",
                `${entry.relativePath}: link "${link}" points to a non-existent decision.`,
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
                `${entry.relativePath}: link "${link}" does not resolve to a known BF-NNNN, DEC-NNNN, discussion-*, or worklog entry id.`,
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
    const targetRows = promo.target === "decisions.md" ? decisionRows : [];
    const referencedRows =
      entryId.length === 0 ? [] : targetRows.filter((row) => rowReferencesEntryId(row, entryId));
    const isArchived = status === "archived";
    const hasBackRef = /^DEC-\d{4}$/.test(promotedToBackRef);
    const sameRow = referencedRows.some((row) => row.id === promotedToBackRef);
    const satisfied = referencedRows.length > 0 && isArchived && hasBackRef && sameRow;
    if (!satisfied) {
      const reasons: string[] = [];
      if (referencedRows.length === 0) {
        reasons.push(`${promo.target} has no row referencing ${entryId || "this entry"}`);
      }
      if (!isArchived) {
        reasons.push(`entry status is "${status}" (must be "archived" to satisfy promotion)`);
      }
      if (!hasBackRef) {
        reasons.push(
          `\`promoted-to:\` must contain the DEC-NNNN ID of the matching row in ${promo.target}`,
        );
      } else if (!sameRow) {
        reasons.push(
          `\`promoted-to:\` names ${promotedToBackRef}, not the row referencing this entry`,
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
 * Tests whether a decision row references `entryId` as a whole token
 * (rather than as a substring). Without this, `entry-01` would falsely
 * match a row that only contains `entry-010`, silently suppressing
 * W-PENDING-PROMOTION for the unrelated parent entry.
 */
function rowReferencesEntryId(row: RecordRow, entryId: string): boolean {
  const escaped = entryId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`);
  return pattern.test(`${row.content} ${row.approach} ${row.status}`);
}

async function collectFlowIds(specsDir: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const flowsDir = path.join(specsDir, "02_business-flow");
  if (!(await exists(flowsDir))) return ids;
  let entries: Dirent[];
  try {
    entries = await readdir(flowsDir, { withFileTypes: true });
  } catch {
    return ids;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && /^business-flow-\d{4}$/.test(entry.name)) {
      ids.add(`BF-${entry.name.slice("business-flow-".length)}`);
    }
  }
  return ids;
}

async function collectDiscussionIds(discDir: string): Promise<Set<string>> {
  const ids = new Set<string>();
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
 * Read the decision table under the configured specification root.
 */
async function readDecisionRows(specsDir: string): Promise<RecordRow[]> {
  try {
    const body = await readFile(path.join(specsDir, "decisions.md"), "utf-8");
    return parseRecordTable(body, "decisions").rows;
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }
}

// Side-channel for the test suite to surface a stable stat-aware "now"
// reference if we ever want to swap the default Date in unit tests.
export { stat as _statForTesting };
