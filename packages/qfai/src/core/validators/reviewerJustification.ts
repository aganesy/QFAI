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
  /**
   * What the lane found — the shape gate's `expected …, found …`, the hygiene lane's
   * account of the violation. It is the only field that says WHAT is wrong rather than
   * where, and the gate reproduces it verbatim for the same reason it reproduces the site.
   */
  detail?: unknown;
};

/**
 * Does this field carry a control character? No file path, job id, rule name or lane detail does.
 *
 * C0 and DEL. Review finding [40]: these reports come out of `.qfai/review/**`, a directory a
 * pull request writes, and the fields here are passed through to `Issue` — where the GitHub
 * formatter interpolates `file` into a workflow command's location metadata. A newline there
 * split the command in two and let a fork's pull request inject one of its own. The formatter
 * now escapes what it emits, which is the fix for every producer; this is the other half, and
 * it is worth having: a payload carrying a newline is corrupt whoever eventually renders it.
 *
 * Scanned by CODE POINT rather than matched by a regular expression. The pattern needed an
 * `eslint-disable` for `no-control-regex`, and `.instruction/00_universal/quality.md` forbids
 * adding one of those without the user asking for it — a rule this change had broken. Reading
 * the code points needs no suppression and says the same thing more directly.
 *
 * @param value the field as the lane reported it
 * @returns whether it carries a C0 control character or DEL
 */
function hasLaneControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** One lane-reported field, or `undefined` when the report omitted it or corrupted it. */
function laneField(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (hasLaneControlCharacter(value)) return undefined;
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

/**
 * The structured half of the passthrough: the lane's job, and the artifact the finding
 * arrived in.
 *
 * `job` is set only when the lane reported one. Under `exactOptionalPropertyTypes` an absent
 * key and a key holding `undefined` are different types, and they should be — a `job` field
 * present and empty reads as a job the lane named, which is the placeholder `laneSite` refuses
 * to invent for the same reason.
 */
function ingestedDetails(
  finding: ReviewerFinding,
  artifactPath: string,
): { relatedFiles: string[]; job?: string } {
  const details: { relatedFiles: string[]; job?: string } = { relatedFiles: [artifactPath] };
  const job = laneField(finding.job);
  if (job !== undefined) {
    details.job = job;
  }
  return details;
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
      //
      // Emitted at `error`, not `info`. Review finding [25]: the severity was
      // downgraded here as well, so `qfai validate --fail-on error` succeeded
      // while holding an ingested lint failure. `BR-0015-0017` grants ONE
      // exemption and this branch was taking two — it says the gate "does not
      // re-derive, re-word or re-classify" the payload, that both codes are
      // "declared lint-failure codes in `CLI-WFSET`, i.e. error class", and that
      // what is deferred until catalog registration lands is REJECTING them for
      // an empty `justification:`. Nothing there defers the severity.
      if (DEFERRED_CATALOG_REGISTRATION_CODE_SET.has(code)) {
        // Passed through in STRUCTURED fields, not folded into prose. Review finding [32]:
        // `file` was overwritten with the artifact's own path and `rule` with a constant
        // naming this branch, so the lane's file and rule were destroyed and its job never
        // had a field to survive in — a JSON consumer of `qfai validate` got the artifact
        // it came from and nothing about the offending workflow. `BR-0015-0017` says the
        // gate passes the lane's payload through rather than reconstructing it, and a site
        // that exists only inside a sentence has been reconstructed.
        //
        // The artifact path moves to `relatedFiles`, which is where a file that is evidence
        // FOR a finding belongs rather than the file the finding is ABOUT — and it keeps
        // `--spec` scoping seeing the same path it saw when `file` carried it.
        //
        // `detail` is the producer's account of the violation and is reproduced verbatim.
        // Without it the message named a site and never said what was wrong there, so a
        // reviewer had to open the artifact to learn anything actionable at all.
        const detail = laneField(finding.detail);
        issues.push(
          issue(
            code,
            `Reviewer finding ${code} ingested from the workflow-set lint lane: ${laneSite(finding)}${
              detail === undefined ? "" : ` — ${detail}`
            } (${relPath}). Catalog registration is deferred, so no justification is demanded for this code yet.`,
            "error",
            // The lane's own file. Only when it reported none does the artifact stand in,
            // because an issue with no `file` at all is one no reporter can place.
            laneField(finding.file) ?? relPath,
            laneField(finding.rule) ?? "reviewerJustification.ingested",
            undefined,
            undefined,
            undefined,
            ingestedDetails(finding, relPath),
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
