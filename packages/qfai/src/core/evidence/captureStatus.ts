/**
 * Capture status vocabulary and render evidence record creation.
 *
 * Reuses RenderEvidenceStatus from uiux as the single source of truth
 * for the three-state enum: captured | skipped | failed
 */

import type { RenderEvidenceStatus } from "../uiux/renderEvidenceTypes.js";

export type CaptureStatus = RenderEvidenceStatus;

export const CAPTURE_STATUSES: readonly CaptureStatus[] = ["captured", "skipped", "failed"];

export type ScreenshotElement =
  | { status: "captured"; path: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export type ViewportElement =
  | { status: "captured"; width: number; height: number }
  | { status: "skipped"; reason: string; width?: number; height?: number }
  | { status: "failed"; error: string; width?: number; height?: number };

export type DomRefElement =
  | { status: "captured"; path: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export type RenderEvidenceRecord = {
  screenshot: ScreenshotElement;
  viewport: ViewportElement;
  domRef: DomRefElement;
};

export type RenderEvidenceInput = {
  screenshot:
    | { status: "captured"; path: string }
    | { status: "skipped"; reason: string }
    | { status: "failed"; error: string };
  viewport:
    | { status: "captured"; width: number; height: number }
    | { status: "skipped"; reason: string; width?: number; height?: number }
    | { status: "failed"; error: string; width?: number; height?: number };
  domRef:
    | { status: "captured"; path: string }
    | { status: "skipped"; reason: string }
    | { status: "failed"; error: string };
};

export function createRenderEvidenceRecord(input: RenderEvidenceInput): RenderEvidenceRecord {
  return {
    screenshot: input.screenshot,
    viewport: input.viewport,
    domRef: input.domRef,
  };
}
