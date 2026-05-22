import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

// Reviewer-gate finding codes that MUST carry a non-empty justification.
// Empty justification is treated as advisory-failing (error severity).
const ADVISORY_FAILING_CODES = new Set([
  "R-WORKLOG-DRIFT",
  "R-REJECTED-READOPT",
  "R-HANDOFF-INCOMPLETE",
]);

type ReviewerFinding = {
  code?: unknown;
  justification?: unknown;
};

type ReviewerReport = {
  findings?: ReviewerFinding[];
};

/**
 * Scans the .qfai/review/**\/report.json tree (plus any reviewer-output
 * JSON files under .qfai/review/**\/reviewer-*.json) for findings whose
 * code is on the advisory-failing list. Each finding with an empty
 * justification is surfaced as an error at the host code (so reviewer
 * drift can be caught by validate).
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
