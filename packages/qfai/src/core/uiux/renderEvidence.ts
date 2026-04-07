import { readFile } from "node:fs/promises";

import type { Issue } from "../types.js";
import type { RenderEvidenceBundle, RenderEvidenceEntry } from "./renderEvidenceTypes.js";
import { looksLikeInlineRenderPayload } from "./renderEvidenceTypes.js";

export type CaptureEnvironment = {
  available: boolean;
  reason?: string;
};

export type CaptureTarget = {
  id: string;
  url: string;
  viewport: string;
  width: number;
  height: number;
};

export type CaptureResult = {
  status: "captured" | "skipped" | "failed";
  reason?: string;
  alternative?: string;
  capturedItems?: RenderEvidenceEntry[];
  failedItems?: Array<{ id: string; reason: string }>;
  entries: RenderEvidenceEntry[];
};

type RenderBundleValidationContext = {
  path?: string;
  issueCode?: string;
  rule?: string;
};

export async function captureRenderEvidence(
  targets: CaptureTarget[],
  env: CaptureEnvironment,
  _config: unknown,
  captureOne?: (target: CaptureTarget) => Promise<RenderEvidenceEntry>,
): Promise<CaptureResult> {
  if (!env.available) {
    return {
      status: "skipped",
      reason: env.reason ?? "Capture environment is not available",
      alternative: "Run manually with browser dev tools or a local screenshot tool",
      entries: [],
    };
  }

  const captured: RenderEvidenceEntry[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  for (const target of targets) {
    try {
      if (captureOne) {
        captured.push(await captureOne(target));
      } else {
        // WS-C: No captureOne adapter and no placeholder - skip truthfully
        captured.push({
          viewport: target.viewport,
          status: "skipped",
          skippedReason: "No capture adapter provided - cannot produce real evidence artifacts",
        } as RenderEvidenceEntry);
        continue;
      }
    } catch (error: unknown) {
      failed.push({
        id: target.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (failed.length > 0 && captured.length > 0) {
    return {
      status: "failed",
      reason: `Partial capture failure: ${failed.map((item) => `${item.id}: ${item.reason}`).join("; ")}`,
      capturedItems: captured,
      failedItems: failed,
      entries: captured,
    };
  }

  if (failed.length > 0) {
    return {
      status: "failed",
      reason: `All captures failed: ${failed.map((item) => item.reason).join("; ")}`,
      alternative: "Check network connectivity and target URLs, then retry",
      failedItems: failed,
      entries: [],
    };
  }

  return {
    status: "captured",
    capturedItems: captured,
    entries: captured,
  };
}

export async function readRenderEvidenceBundle(
  filePath: string,
): Promise<RenderEvidenceBundle | null> {
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

  return isRecord(parsed) ? (parsed as RenderEvidenceBundle) : null;
}

export function validateRenderEvidenceBundle(
  bundle: unknown,
  context: RenderBundleValidationContext = {},
): Issue[] {
  const issueCode = context.issueCode ?? "QFAI-PROT-244";
  const rule = context.rule ?? "prototypingEvidence.renderBundle";
  const file = context.path;
  const issues: Issue[] = [];

  if (!isRecord(bundle) || !isRecord(bundle.renderEvidence)) {
    issues.push(makeIssue(issueCode, "`renderEvidence` block is required", file, rule));
    return issues;
  }
  const renderEvidence = bundle.renderEvidence;

  const status = renderEvidence.status;
  if (status !== "captured" && status !== "skipped" && status !== "failed") {
    issues.push(
      makeIssue(issueCode, "`renderEvidence.status` must be captured|skipped|failed", file, rule),
    );
  }

  // WS-4: top-level status completeness
  if (status === "skipped") {
    if (
      typeof renderEvidence.skippedReason !== "string" ||
      renderEvidence.skippedReason.trim().length === 0
    ) {
      issues.push(
        makeIssue(
          "QFAI-PROT-252",
          "`renderEvidence.status=skipped` requires `skippedReason`",
          file,
          rule,
        ),
      );
    }
  }
  if (status === "failed") {
    if (typeof renderEvidence.error !== "string" || renderEvidence.error.trim().length === 0) {
      issues.push(
        makeIssue("QFAI-PROT-252", "`renderEvidence.status=failed` requires `error`", file, rule),
      );
    }
  }

  // WS-4: path-only enforcement on outputPath
  if (typeof renderEvidence.outputPath === "string") {
    if (looksLikeInlineRenderPayload(renderEvidence.outputPath)) {
      issues.push(
        makeIssue(
          "QFAI-PROT-251",
          "`renderEvidence.outputPath` contains inline payload - path-only required",
          file,
          rule,
        ),
      );
    }
  }

  if (bundle.screens === undefined) {
    return issues;
  }
  if (!Array.isArray(bundle.screens)) {
    issues.push(makeIssue(issueCode, "`screens` must be an array", file, rule));
    return issues;
  }

  for (const screen of bundle.screens) {
    const errors = validateRenderEvidenceScreen(screen);
    for (const error of errors) {
      issues.push(makeIssue(error.code ?? issueCode, error.message, file, rule));
    }
  }

  // WS-3: status contradiction rule (QFAI-PROT-253)
  const capturedScreenCount = bundle.screens.filter(
    (s: unknown) => isRecord(s) && s.status === "captured",
  ).length;
  if (status === "captured" && capturedScreenCount === 0) {
    issues.push(
      makeIssue(
        "QFAI-PROT-253",
        "`renderEvidence.status=captured` but no screens have status=captured",
        file,
        "prototypingEvidence.renderStatusContradiction",
      ),
    );
  }
  if ((status === "skipped" || status === "failed") && capturedScreenCount > 0) {
    issues.push(
      makeIssue(
        "QFAI-PROT-253",
        `\`renderEvidence.status=${status}\` but ${capturedScreenCount} screen(s) have status=captured`,
        file,
        "prototypingEvidence.renderStatusContradiction",
      ),
    );
  }

  return issues;
}

function validateRenderEvidenceScreen(screen: unknown): Array<{ code?: string; message: string }> {
  const errors: Array<{ code?: string; message: string }> = [];
  if (!isRecord(screen)) {
    errors.push({ message: "`screens[]` must be objects" });
    return errors;
  }
  if (typeof screen.route !== "string" || screen.route.trim().length === 0) {
    errors.push({ message: "`screens[].route` is required" });
  }
  if (typeof screen.viewport !== "string" || screen.viewport.trim().length === 0) {
    errors.push({ message: "`screens[].viewport` is required" });
  }
  if (typeof screen.width !== "number" || typeof screen.height !== "number") {
    errors.push({ message: "`screens[]` requires numeric width/height" });
  }

  if (screen.status === "captured") {
    if (
      typeof screen.imagePath !== "string" ||
      screen.imagePath.trim().length === 0 ||
      typeof screen.htmlPath !== "string" ||
      screen.htmlPath.trim().length === 0
    ) {
      errors.push({
        code: "QFAI-PROT-252",
        message: "`captured` screens require imagePath and htmlPath",
      });
    } else {
      // WS-4: path-only enforcement
      if (looksLikeInlineRenderPayload(screen.imagePath)) {
        errors.push({
          code: "QFAI-PROT-251",
          message: `\`screens[].imagePath\` contains inline payload - path-only required (route=${String(screen.route)})`,
        });
      }
      if (looksLikeInlineRenderPayload(screen.htmlPath)) {
        errors.push({
          code: "QFAI-PROT-251",
          message: `\`screens[].htmlPath\` contains inline payload - path-only required (route=${String(screen.route)})`,
        });
      }
    }
    return errors;
  }
  if (screen.status === "skipped") {
    if (typeof screen.skippedReason !== "string" || screen.skippedReason.trim().length === 0) {
      errors.push({ code: "QFAI-PROT-252", message: "`skipped` screens require skippedReason" });
    }
    return errors;
  }
  if (screen.status === "failed") {
    if (typeof screen.error !== "string" || screen.error.trim().length === 0) {
      errors.push({ code: "QFAI-PROT-252", message: "`failed` screens require error" });
    }
    return errors;
  }

  errors.push({ message: "`screens[].status` must be captured|skipped|failed" });
  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type RenderEvidenceSummaryResult = {
  captured: number;
  skipped: number;
  failed: number;
  inlinePayloadViolation: boolean;
  statusContradiction: boolean;
};

export function summarizeRenderEvidence(
  bundle: RenderEvidenceBundle | null,
): RenderEvidenceSummaryResult {
  const counts = { captured: 0, skipped: 0, failed: 0 };
  let inlinePayloadViolation = false;

  if (bundle?.screens) {
    for (const screen of bundle.screens) {
      if (isRecord(screen)) {
        const s = screen as Record<string, unknown>;
        if (s.status === "captured" || s.status === "skipped" || s.status === "failed") {
          counts[s.status] += 1;
        }
        for (const field of ["imagePath", "htmlPath", "path"] as const) {
          if (typeof s[field] === "string" && looksLikeInlineRenderPayload(s[field])) {
            inlinePayloadViolation = true;
          }
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const topStatus = bundle?.renderEvidence?.status;
  let statusContradiction = false;
  if (topStatus === "captured" && counts.captured === 0 && bundle?.screens !== undefined) {
    statusContradiction = true;
  }
  if ((topStatus === "skipped" || topStatus === "failed") && counts.captured > 0) {
    statusContradiction = true;
  }

  return { ...counts, inlinePayloadViolation, statusContradiction };
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
