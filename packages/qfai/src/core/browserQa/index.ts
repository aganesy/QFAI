import { readFile } from "node:fs/promises";

import type { PrototypingMode } from "../prototyping/types.js";
import type { Issue } from "../types.js";

export type BrowserQaFinding = {
  category?: "smoke" | "interaction" | "visual" | "accessibility";
  rule?: string;
  severity: "error" | "warning" | "info";
  message: string;
  route?: string;
  element?: string;
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

export function validateBrowserQaBundle(
  bundle: unknown,
  options: { path?: string; issueCode?: string; rule?: string } = {},
): Issue[] {
  const issueCode = options.issueCode ?? "QFAI-PROT-174";
  const rule = options.rule ?? "prototypingEvidence.browserQaBundle";
  const file = options.path;
  const issues: Issue[] = [];

  if (!isRecord(bundle) || !isRecord(bundle.browserQa)) {
    issues.push(makeIssue(issueCode, "`browserQa` block is required", file, rule));
    return issues;
  }
  const browserQa = bundle.browserQa;

  if (typeof browserQa.executed !== "boolean") {
    issues.push(makeIssue(issueCode, "`browserQa.executed` must be boolean", file, rule));
  }

  if (
    browserQa.status !== "completed" &&
    browserQa.status !== "skipped" &&
    browserQa.status !== "failed"
  ) {
    issues.push(
      makeIssue(issueCode, "`browserQa.status` must be completed|skipped|failed", file, rule),
    );
  }

  // WS-5: executed/status completeness rules
  if (browserQa.executed === true && browserQa.status !== "completed") {
    issues.push(
      makeIssue(issueCode, "`browserQa.executed=true` requires `status=completed`", file, rule),
    );
  }
  if (browserQa.executed === false && browserQa.status === "completed") {
    issues.push(
      makeIssue(
        issueCode,
        "`browserQa.executed=false` with `status=completed` is contradictory",
        file,
        rule,
      ),
    );
  }

  // WS-5: summary validation — counts must be non-negative integers
  if (browserQa.summary !== undefined) {
    if (!isRecord(browserQa.summary)) {
      issues.push(makeIssue(issueCode, "`browserQa.summary` must be an object", file, rule));
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
                issueCode,
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

  if (bundle.findings !== undefined) {
    if (!Array.isArray(bundle.findings)) {
      issues.push(makeIssue(issueCode, "`findings` must be an array", file, rule));
    } else {
      for (const finding of bundle.findings) {
        if (!isRecord(finding)) {
          issues.push(makeIssue(issueCode, "`findings[]` must be objects", file, rule));
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
              issueCode,
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
