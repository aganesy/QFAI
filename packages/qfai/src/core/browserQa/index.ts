import { readFile } from "node:fs/promises";

import type { PrototypingMode } from "../prototyping/types.js";
import type { Issue } from "../types.js";

/** Canonical 4-phase categories */
export type BrowserQaPhase = "smoke" | "interaction" | "visual" | "accessibility";

export type BrowserQaFinding = {
  category: BrowserQaPhase;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  route?: string;
  element?: string;
  repair_hint?: string;
};

export type BrowserQaResult = {
  status: "completed" | "skipped";
  findings: BrowserQaFinding[];
  metadata: {
    timestamp: string;
    runner: string;
    targetUrl?: string;
  };
};

export type BrowserQaBundle = {
  browserQa: {
    executed: boolean;
    status: "completed" | "skipped" | "failed";
    mode?: PrototypingMode;
    summary?: {
      smoke?: { passed: number; failed: number };
      interaction?: { passed: number; failed: number };
      visual?: { passed: number; failed: number };
      accessibility?: { passed: number; failed: number };
    };
  };
  findings?: BrowserQaFinding[];
};

export function runBrowserQa(
  htmlContent: string,
  options?: { targetUrl?: string },
): BrowserQaResult {
  const findings: BrowserQaFinding[] = [];
  const timestamp = new Date().toISOString();

  if (!htmlContent || htmlContent.trim().length === 0) {
    return {
      status: "skipped",
      findings: [],
      metadata: {
        timestamp,
        runner: "qfai-browser-qa-minimal",
        ...(options?.targetUrl ? { targetUrl: options.targetUrl } : {}),
      },
    };
  }

  if (!/<html/i.test(htmlContent) && !/<!doctype/i.test(htmlContent)) {
    findings.push({
      rule: "valid-html-structure",
      category: "smoke",
      severity: "warning",
      message: "Content does not appear to be a complete HTML document.",
    });
  }

  if (/<img(?![^>]*\balt=)[^>]*>/i.test(htmlContent)) {
    findings.push({
      rule: "img-alt-text",
      category: "accessibility",
      severity: "warning",
      message: "One or more <img> tags may be missing alt attributes.",
      element: "img",
    });
  }

  return {
    status: "completed",
    findings,
    metadata: {
      timestamp,
      runner: "qfai-browser-qa-minimal",
      ...(options?.targetUrl ? { targetUrl: options.targetUrl } : {}),
    },
  };
}

export function validateBrowserQaFindings(result: BrowserQaResult): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (result.status === "completed" && result.findings.length === 0) {
    if (!result.metadata.timestamp || !result.metadata.runner) {
      warnings.push(
        "Browser QA completed with zero findings and incomplete metadata. Verify that checks were actually executed.",
      );
    }
  }

  if (!result.metadata.timestamp || !result.metadata.runner) {
    warnings.push("Browser QA result missing required metadata (timestamp or runner).");
  }

  for (const finding of result.findings) {
    if (
      finding.message.toLowerCase().includes("todo") ||
      finding.message.toLowerCase().includes("placeholder") ||
      finding.message.toLowerCase().includes("tbd")
    ) {
      warnings.push(`Finding "${finding.rule ?? "unknown"}" appears to contain placeholder text.`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

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

/**
 * D-7: Browser QA issue codes — 1 code = 1 meaning.
 * QFAI-PROT-174 is reserved for "required bundle missing" only.
 */
export const BROWSER_QA_ISSUE_CODES = {
  missing: "QFAI-PROT-174",
  schema: "QFAI-PROT-273",
  contradiction: "QFAI-PROT-274",
  summary: "QFAI-PROT-275",
  findings: "QFAI-PROT-276",
} as const;

export function validateBrowserQaBundle(
  bundle: unknown,
  options: { path?: string; issueCode?: string; rule?: string } = {},
): Issue[] {
  const rule = options.rule ?? "prototypingEvidence.browserQaBundle";
  const file = options.path;
  const issues: Issue[] = [];

  // D-7: schema invalid — browserQa block missing
  if (!isRecord(bundle) || !isRecord(bundle.browserQa)) {
    issues.push(makeIssue(BROWSER_QA_ISSUE_CODES.schema, "`browserQa` block is required", file, rule));
    return issues;
  }
  const browserQa = bundle.browserQa;

  if (typeof browserQa.executed !== "boolean") {
    issues.push(makeIssue(BROWSER_QA_ISSUE_CODES.schema, "`browserQa.executed` must be boolean", file, rule));
  }

  if (
    browserQa.status !== "completed" &&
    browserQa.status !== "skipped" &&
    browserQa.status !== "failed"
  ) {
    issues.push(
      makeIssue(BROWSER_QA_ISSUE_CODES.schema, "`browserQa.status` must be completed|skipped|failed", file, rule),
    );
  }

  // D-7: contradiction — executed/status inconsistency
  if (browserQa.executed === true && browserQa.status !== "completed") {
    issues.push(
      makeIssue(BROWSER_QA_ISSUE_CODES.contradiction, "`browserQa.executed=true` requires `status=completed`", file, rule),
    );
  }
  if (browserQa.executed === false && browserQa.status === "completed") {
    issues.push(
      makeIssue(
        BROWSER_QA_ISSUE_CODES.contradiction,
        "`browserQa.executed=false` with `status=completed` is contradictory",
        file,
        rule,
      ),
    );
  }

  // E-1: When executed=true, all 4 phase summaries must be present
  if (browserQa.executed === true && browserQa.status === "completed") {
    if (!isRecord(browserQa.summary)) {
      issues.push(
        makeIssue(
          BROWSER_QA_ISSUE_CODES.summary,
          "`browserQa.summary` is required when executed=true and status=completed",
          file,
          rule,
        ),
      );
    } else {
      const requiredPhases: BrowserQaPhase[] = ["smoke", "interaction", "visual", "accessibility"];
      for (const phase of requiredPhases) {
        if (!isRecord(browserQa.summary[phase])) {
          issues.push(
            makeIssue(
              BROWSER_QA_ISSUE_CODES.summary,
              `\`browserQa.summary.${phase}\` is required when executed=true`,
              file,
              rule,
            ),
          );
        }
      }
    }
  }

  // D-7: summary — counts must be non-negative integers
  if (browserQa.summary !== undefined) {
    if (!isRecord(browserQa.summary)) {
      issues.push(makeIssue(BROWSER_QA_ISSUE_CODES.summary, "`browserQa.summary` must be an object", file, rule));
    } else {
      for (const category of ["smoke", "interaction", "visual", "accessibility"] as const) {
        const bucket = browserQa.summary[category];
        if (bucket !== undefined) {
          if (
            !isRecord(bucket) ||
            typeof bucket.passed !== "number" ||
            !Number.isInteger(bucket.passed) ||
            bucket.passed < 0 ||
            typeof bucket.failed !== "number" ||
            !Number.isInteger(bucket.failed) ||
            bucket.failed < 0
          ) {
            issues.push(
              makeIssue(
                BROWSER_QA_ISSUE_CODES.summary,
                `\`browserQa.summary.${category}.passed/failed\` must be non-negative integers`,
                file,
                rule,
              ),
            );
          }
        }
      }
    }
  }

  // D-7: findings — malformed findings array
  if (bundle.findings !== undefined) {
    if (!Array.isArray(bundle.findings)) {
      issues.push(makeIssue(BROWSER_QA_ISSUE_CODES.findings, "`findings` must be an array", file, rule));
    } else {
      for (const finding of bundle.findings) {
        if (!isRecord(finding)) {
          issues.push(makeIssue(BROWSER_QA_ISSUE_CODES.findings, "`findings[]` must be objects", file, rule));
          continue;
        }
        if (
          (finding.category !== undefined &&
            finding.category !== "smoke" &&
            finding.category !== "interaction" &&
            finding.category !== "visual" &&
            finding.category !== "accessibility") ||
          (finding.severity !== "error" &&
            finding.severity !== "warning" &&
            finding.severity !== "info") ||
          typeof finding.message !== "string" ||
          finding.message.trim().length === 0
        ) {
          issues.push(
            makeIssue(
              BROWSER_QA_ISSUE_CODES.findings,
              "`findings[]` requires category/severity/message with canonical values",
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
    category: "compatibility",
    message,
    ...(file ? { file } : {}),
    ...(rule ? { rule } : {}),
  };
}
