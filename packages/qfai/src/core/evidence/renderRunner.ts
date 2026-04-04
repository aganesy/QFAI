/**
 * Render runner — WS-C
 *
 * Executes render capture for a list of targets, producing truthful
 * evidence entries. No placeholder paths are emitted.
 */

import type {
  RenderCaptureAdapter,
  RenderCaptureTarget,
  RenderEvidenceEntryResult,
  RenderRunnerResult,
} from "./types.js";

/**
 * Run render capture for all targets.
 *
 * - adapter present + capture succeeds → `captured` with real file paths
 * - adapter present + capture throws → `failed` with reason
 * - adapter absent → `skipped` with reason
 */
export async function runRenderCapture(
  targets: RenderCaptureTarget[],
  outputDir: string,
  adapter?: RenderCaptureAdapter,
): Promise<RenderRunnerResult> {
  const entries: RenderEvidenceEntryResult[] = [];
  const filesWritten: string[] = [];

  if (!adapter) {
    for (const target of targets) {
      entries.push({
        capture_id: target.targetId,
        target: target.route ?? target.descriptor ?? target.targetId,
        status: "skipped",
        viewport: target.viewport,
        reason: "capture adapter not available",
      });
    }
    return { entries, filesWritten };
  }

  for (const target of targets) {
    try {
      const screenshotPath = await adapter.captureScreenshot(target, outputDir);
      filesWritten.push(screenshotPath);

      let htmlPath: string | undefined;
      if (adapter.captureHtml) {
        try {
          htmlPath = await adapter.captureHtml(target, outputDir);
          filesWritten.push(htmlPath);
        } catch {
          // HTML capture failure is non-fatal
        }
      }

      entries.push({
        capture_id: target.targetId,
        target: target.route ?? target.descriptor ?? target.targetId,
        status: "captured",
        screenshot_path: screenshotPath,
        html_path: htmlPath,
        viewport: target.viewport,
      });
    } catch (error) {
      entries.push({
        capture_id: target.targetId,
        target: target.route ?? target.descriptor ?? target.targetId,
        status: "failed",
        viewport: target.viewport,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { entries, filesWritten };
}
