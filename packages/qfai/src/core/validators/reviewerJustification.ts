import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { CATALOG_ADVISORY_FAILING_CODES } from "./justificationCatalog.js";
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
  // the catalog by construction. The catalog contributes membership
  // only — it declares no severity, and the ingestion issue below is
  // always `error` (see below).
  ...CATALOG_ADVISORY_FAILING_CODES,
]);

type ReviewerFinding = {
  code?: unknown;
  justification?: unknown;
};

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
      if (!ADVISORY_FAILING_CODES.has(code)) continue;
      const justification =
        typeof finding.justification === "string" ? finding.justification.trim() : "";
      if (justification.length === 0) {
        // Severity is `error` for every advisory-failing code, without
        // exception: the violation reported here is the missing
        // justification, not the finding itself. A code whose own
        // detector emits `warning` (e.g. R-DESIGN-MD-PATCH-OUT-OF-ZONE)
        // is still an `error` on this path.
        issues.push(
          issue(
            code,
            `Reviewer finding ${code} requires a non-empty justification (${path.relative(root, reportFile).replace(/\\/g, "/")}).`,
            "error",
            path.relative(root, reportFile).replace(/\\/g, "/"),
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
