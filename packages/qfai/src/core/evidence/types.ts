/**
 * Render evidence types — WS-C
 *
 * Canonical types for the render evidence capture pipeline.
 */

export type RenderCaptureTarget = {
  targetId: string;
  route?: string;
  descriptor?: string;
  viewport: string;
  width?: number;
  height?: number;
};

export type RenderCaptureAdapter = {
  captureScreenshot(target: RenderCaptureTarget, outputDir: string): Promise<string>;
  captureHtml?(target: RenderCaptureTarget, outputDir: string): Promise<string>;
};

export type RenderEvidenceEntryResult = {
  capture_id: string;
  target: string;
  status: "captured" | "skipped" | "failed";
  screenshot_path?: string;
  html_path?: string;
  viewport: string;
  reason?: string;
};

export type RenderRunnerResult = {
  entries: RenderEvidenceEntryResult[];
  filesWritten: string[];
  surface?: string;
  mode?: string;
  generatedAt?: string;
  coverageSummary?: {
    total: number;
    captured: number;
    failed: number;
    skipped: number;
  };
};
