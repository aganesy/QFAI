import { readFile } from "node:fs/promises";

import type { Issue } from "../types.js";
import type { RenderEvidenceBundle, RenderEvidenceEntry } from "./renderEvidenceTypes.js";

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
        captured.push({
          viewport: target.viewport,
          status: "captured",
          width: target.width,
          height: target.height,
          imagePath: `evidence/${target.id}.png`,
          htmlPath: `evidence/${target.id}.html`,
        });
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

  if (bundle.screens === undefined) {
    return issues;
  }
  if (!Array.isArray(bundle.screens)) {
    issues.push(makeIssue(issueCode, "`screens` must be an array", file, rule));
    return issues;
  }

  for (const screen of bundle.screens) {
    const error = validateRenderEvidenceScreen(screen);
    if (error) {
      issues.push(makeIssue(issueCode, error, file, rule));
    }
  }

  return issues;
}

function validateRenderEvidenceScreen(screen: unknown): string | null {
  if (!isRecord(screen)) {
    return "`screens[]` must be objects";
  }
  if (typeof screen.route !== "string" || screen.route.trim().length === 0) {
    return "`screens[].route` is required";
  }
  if (typeof screen.viewport !== "string" || screen.viewport.trim().length === 0) {
    return "`screens[].viewport` is required";
  }
  if (typeof screen.width !== "number" || typeof screen.height !== "number") {
    return "`screens[]` requires numeric width/height";
  }

  if (screen.status === "captured") {
    if (
      typeof screen.imagePath !== "string" ||
      screen.imagePath.trim().length === 0 ||
      typeof screen.htmlPath !== "string" ||
      screen.htmlPath.trim().length === 0
    ) {
      return "`captured` screens require imagePath and htmlPath";
    }
    return null;
  }
  if (screen.status === "skipped") {
    if (typeof screen.skippedReason !== "string" || screen.skippedReason.trim().length === 0) {
      return "`skipped` screens require skippedReason";
    }
    return null;
  }
  if (screen.status === "failed") {
    if (typeof screen.error !== "string" || screen.error.trim().length === 0) {
      return "`failed` screens require error";
    }
    return null;
  }

  return "`screens[].status` must be captured|skipped|failed";
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
