import { readFile } from "node:fs/promises";

import type { Issue } from "../types.js";

export type {
  BrowserQaFinding,
  BrowserQaInput,
  BrowserQaPhase,
  BrowserQaPhaseResult,
  BrowserQaProvider,
  BrowserQaRunResult,
  BrowserQaScreenContractRef,
  BrowserQaSummary,
} from "./types.js";
export { BROWSER_QA_PHASES } from "./types.js";
export { runBrowserQaOrchestrated, summarizeBrowserQaResult } from "./runner.js";

export type BrowserQaBundle = {
  browserQa: {
    executed: boolean;
    status: "completed" | "skipped" | "failed";
    mode?: "single-thread-loop";
    summary?: Record<
      "smoke" | "interaction" | "visual" | "accessibility",
      {
        status: "passed" | "executed" | "failed" | "skipped";
        findingsCount: number;
        checksCount: number;
        passed?: number;
        failed?: number;
      }
    >;
  };
  findings?: Array<{
    phase: "smoke" | "interaction" | "visual" | "accessibility";
    severity: "info" | "warn" | "warning" | "error";
    summary: string;
    detail: string;
    screen_id?: string;
    selector?: string;
    evidence_refs: string[];
    repair_suggestions: string[];
    category?: "smoke" | "interaction" | "visual" | "accessibility";
    message?: string;
    route?: string;
    repair_hint?: string;
  }>;
  repairs?: string[];
};

/**
 * Codes this module emits. A `missing bundle` reservation used to sit here
 * without a call site — nothing read it, so the catalog entry it justified
 * described a gate that could not fire. Only codes with an emitter belong here.
 */
export const BROWSER_QA_ISSUE_CODES = {
  schema: "QFAI-PROT-273",
  contradiction: "QFAI-PROT-274",
  summary: "QFAI-PROT-275",
  findings: "QFAI-PROT-276",
} as const;

const VALID_FINDING_SEVERITIES = new Set(["info", "warn", "warning", "error"]);

export async function readBrowserQaBundle(filePath: string): Promise<BrowserQaBundle | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isRecord(parsed) ? (parsed as BrowserQaBundle) : null;
}

export function validateBrowserQaBundle(
  bundle: unknown,
  options: { path?: string; issueCode?: string; rule?: string } = {},
): Issue[] {
  const rule = options.rule ?? "prototypingEvidence.browserQaBundle";
  const file = options.path;
  const issues: Issue[] = [];
  if (!isRecord(bundle) || !isRecord(bundle.browserQa)) {
    issues.push(
      makeIssue(BROWSER_QA_ISSUE_CODES.schema, "`browserQa` block is required", file, rule),
    );
    return issues;
  }

  const browserQa = bundle.browserQa;
  if (typeof browserQa.executed !== "boolean") {
    issues.push(
      makeIssue(BROWSER_QA_ISSUE_CODES.schema, "`browserQa.executed` must be boolean", file, rule),
    );
  }
  if (
    browserQa.status !== "completed" &&
    browserQa.status !== "skipped" &&
    browserQa.status !== "failed"
  ) {
    issues.push(
      makeIssue(
        BROWSER_QA_ISSUE_CODES.schema,
        "`browserQa.status` must be completed|skipped|failed",
        file,
        rule,
      ),
    );
  }

  if (browserQa.executed === true && browserQa.status !== "completed") {
    issues.push(
      makeIssue(
        BROWSER_QA_ISSUE_CODES.contradiction,
        "`browserQa.executed=true` requires `status=completed`",
        file,
        rule,
      ),
    );
  }

  if (browserQa.executed === false && browserQa.status === "completed") {
    issues.push(
      makeIssue(
        BROWSER_QA_ISSUE_CODES.contradiction,
        "`browserQa.executed=false` contradicts `status=completed`",
        file,
        rule,
      ),
    );
  }

  if (browserQa.summary !== undefined) {
    if (!isRecord(browserQa.summary)) {
      issues.push(
        makeIssue(
          BROWSER_QA_ISSUE_CODES.summary,
          "`browserQa.summary` must be an object",
          file,
          rule,
        ),
      );
    } else {
      for (const phase of ["smoke", "interaction", "visual", "accessibility"] as const) {
        const record = browserQa.summary[phase];
        if (
          !isRecord(record) ||
          (record.status !== "passed" &&
            record.status !== "executed" &&
            record.status !== "failed" &&
            record.status !== "skipped") ||
          typeof record.findingsCount !== "number" ||
          typeof record.checksCount !== "number"
        ) {
          issues.push(
            makeIssue(
              BROWSER_QA_ISSUE_CODES.summary,
              `\`browserQa.summary.${phase}\` requires status/findingsCount/checksCount`,
              file,
              rule,
            ),
          );
        } else {
          if ("passed" in record && typeof record.passed !== "number") {
            issues.push(
              makeIssue(
                BROWSER_QA_ISSUE_CODES.summary,
                `\`browserQa.summary.${phase}.passed\` must be a number when present`,
                file,
                rule,
              ),
            );
          }
          if ("failed" in record && typeof record.failed !== "number") {
            issues.push(
              makeIssue(
                BROWSER_QA_ISSUE_CODES.summary,
                `\`browserQa.summary.${phase}.failed\` must be a number when present`,
                file,
                rule,
              ),
            );
          }
        }
      }
    }
  }

  if (bundle.findings !== undefined) {
    if (!Array.isArray(bundle.findings)) {
      issues.push(
        makeIssue(BROWSER_QA_ISSUE_CODES.findings, "`findings` must be an array", file, rule),
      );
    } else {
      for (const finding of bundle.findings) {
        if (
          !isRecord(finding) ||
          typeof finding.summary !== "string" ||
          finding.summary.trim().length === 0 ||
          typeof finding.detail !== "string" ||
          finding.detail.trim().length === 0 ||
          !Array.isArray(finding.evidence_refs) ||
          finding.evidence_refs.length === 0 ||
          !Array.isArray(finding.repair_suggestions) ||
          typeof finding.severity !== "string"
        ) {
          issues.push(
            makeIssue(
              BROWSER_QA_ISSUE_CODES.findings,
              "`findings[]` requires summary/detail/severity/evidence_refs/repair_suggestions",
              file,
              rule,
            ),
          );
        }
        if (
          isRecord(finding) &&
          typeof finding.severity === "string" &&
          !VALID_FINDING_SEVERITIES.has(finding.severity)
        ) {
          issues.push(
            makeIssue(
              BROWSER_QA_ISSUE_CODES.findings,
              `\`findings[].severity\` must be one of: ${[...VALID_FINDING_SEVERITIES].join(", ")}. Got: "${finding.severity}"`,
              file,
              rule,
            ),
          );
        }
      }
    }
  }

  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function makeIssue(code: string, message: string, file?: string, rule?: string): Issue {
  return {
    code,
    severity: "error",
    category: "canonical",
    message,
    ...(file ? { file } : {}),
    ...(rule ? { rule } : {}),
  };
}
