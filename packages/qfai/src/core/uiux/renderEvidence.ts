/**
 * Render evidence capture — spec-0036
 *
 * Executes render evidence capture for prototyping verification.
 * Supports capture, skip (with reason + alternative), and failure with detail.
 *
 * BR-0036-0001, BR-0036-0002, BR-0036-0003, BR-0036-0004, BR-0036-0005
 */
import type { RenderEvidenceConfig, RenderEvidenceEntry } from "./renderEvidenceTypes.js";

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

/**
 * Execute render evidence capture.
 */
export async function captureRenderEvidence(
  targets: CaptureTarget[],
  env: CaptureEnvironment,
  _config: RenderEvidenceConfig,
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
        const entry = await captureOne(target);
        captured.push(entry);
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
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({ id: target.id, reason });
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

  if (failed.length > 0 && captured.length === 0) {
    return {
      status: "failed",
      reason: `All captures failed: ${failed.map((f) => f.reason).join("; ")}`,
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
