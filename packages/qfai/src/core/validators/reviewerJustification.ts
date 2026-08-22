import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import {
  CATALOG_ADVISORY_FAILING_CODES,
  DEFERRED_CATALOG_REGISTRATION_CODE_SET,
} from "./justificationCatalog.js";
import { exists, issue } from "./utils.js";

// Reviewer-gate finding codes that MUST carry a non-empty justification.
// Empty justification is treated as advisory-failing (error severity).
//
// The set is composed from three sources:
//   1. The historical R-WORKLOG-DRIFT family (REQ-0006 contract).
//   2. CHG-005 extensions (R-CERTIFY-VERIFY-CIRCULAR / R-PROMPT-SCANNER-DRIFT).
//   3. The 8-code spec governance catalog (CHG-006 / AC-0015-0018) sourced
//      from `justificationCatalog.ts`.
const ADVISORY_FAILING_CODES = new Set<string>([
  "R-WORKLOG-DRIFT",
  "R-REJECTED-READOPT",
  "R-HANDOFF-INCOMPLETE",
  // CHG-005: Reviewer-Gate findings that MUST carry a non-empty
  // justification. Empty / whitespace-only justifications are treated
  // as advisory-failing to enforce BR-0004-0028 across spec families.
  "R-CERTIFY-VERIFY-CIRCULAR",
  "R-PROMPT-SCANNER-DRIFT",
  // CHG-006: the 8-code spec governance catalog (AC-0015-0018) is
  // merged in via the catalog SSOT so this set stays in lockstep with
  // the catalog by construction.
  ...CATALOG_ADVISORY_FAILING_CODES,
]);

type ReviewerFinding = {
  code?: unknown;
  justification?: unknown;
  /**
   * The workflow-set lint payload, passed through as the lane produced it.
   *
   * The gate does not re-derive, re-word or re-classify any of the three: the
   * rule set belongs to the CI lane and the shipped-file rules to the package
   * that ships them, so a gate that recomputed them would be a second, silently
   * diverging implementation of somebody else's rule.
   */
  file?: unknown;
  job?: unknown;
  rule?: unknown;
};

/** One lane-reported field, or `undefined` when the report omitted it. */
function laneField(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * The `file` / `job` / `rule` triple as the lane reported it.
 *
 * Every field the report carried survives verbatim, and a field it omitted is
 * omitted here rather than filled with a placeholder — a synthesized `unknown`
 * would read as a value the lane supplied.
 */
function laneSite(finding: ReviewerFinding): string {
  const parts: string[] = [];
  const file = laneField(finding.file);
  const job = laneField(finding.job);
  const rule = laneField(finding.rule);
  if (file !== undefined) parts.push(`file=${file}`);
  if (job !== undefined) parts.push(`job=${job}`);
  if (rule !== undefined) parts.push(`rule=${rule}`);
  return parts.length === 0 ? "no site reported by the lane" : parts.join(" ");
}

type ReviewerReport = {
  findings?: ReviewerFinding[];
};

/**
 * Scans every `*.json` file under `.qfai/review/**` for findings whose
 * code is on the advisory-failing list (R-WORKLOG-DRIFT,
 * R-REJECTED-READOPT, R-HANDOFF-INCOMPLETE). Each finding with an
 * empty `justification:` field is surfaced as an error at the host
 * code so reviewer drift can be caught by `qfai validate --fail-on
 * error`. The scan is unfiltered — any JSON file in the tree that
 * parses to `{findings: [...]}` participates; this keeps the scan
 * resilient to per-tool naming conventions (e.g. `report.json`,
 * `reviewer-completion.json`, `reviewer-architecture.json`, etc.).
 */
export async function validateReviewerJustification(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const reviewDir = path.join(root, ".qfai", "review");
  if (!(await exists(reviewDir))) return issues;

  const reportFiles = await collectReviewerReports(reviewDir);
  for (const reportFile of reportFiles) {
    let parsed: ReviewerReport;
    try {
      const raw = await readFile(reportFile, "utf-8");
      parsed = JSON.parse(raw) as ReviewerReport;
    } catch {
      continue;
    }
    if (!Array.isArray(parsed.findings)) continue;
    for (const finding of parsed.findings) {
      const code = typeof finding.code === "string" ? finding.code : "";
      const relPath = path.relative(root, reportFile).replace(/\\/g, "/");
      // The recorded temporary divergence, consulted POSITIVELY. These two codes
      // are ingested and surfaced — so a hygiene or shipped-shape regression
      // reaches a reviewer instead of living only in a CI log — and are exempt
      // from the empty-`justification:` rejection while their catalog
      // registration is deferred.
      //
      // Reaching the exemption through this branch rather than by falling out of
      // the set below is the difference between a decision and an accident: a
      // gate that had simply never heard of the codes would behave identically
      // today and would stop being a record of anything the moment either set
      // moved.
      if (DEFERRED_CATALOG_REGISTRATION_CODE_SET.has(code)) {
        issues.push(
          issue(
            code,
            `Reviewer finding ${code} ingested from the workflow-set lint lane: ${laneSite(finding)} (${relPath}). Catalog registration is deferred, so no justification is demanded for this code yet.`,
            "info",
            relPath,
            "reviewerJustification.ingested",
          ),
        );
        continue;
      }
      if (!ADVISORY_FAILING_CODES.has(code)) continue;
      const justification =
        typeof finding.justification === "string" ? finding.justification.trim() : "";
      if (justification.length === 0) {
        issues.push(
          issue(
            code,
            `Reviewer finding ${code} requires a non-empty justification (${relPath}).`,
            "error",
            relPath,
            "reviewerJustification.empty",
          ),
        );
      }
    }
  }

  return issues;
}

async function collectReviewerReports(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) return out;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectReviewerReports(full)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".json")) continue;
    out.push(full);
  }
  return out;
}
