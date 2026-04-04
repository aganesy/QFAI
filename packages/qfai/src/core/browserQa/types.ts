/**
 * Browser QA canonical types — WS-B
 *
 * Defines the 4-phase execution model with truthful status reporting.
 */

import type { SurfaceType } from "../detection/surfaceType.js";

export type BrowserQaPhase = "smoke" | "interaction" | "visual" | "accessibility";

export const BROWSER_QA_PHASES: readonly BrowserQaPhase[] = [
  "smoke",
  "interaction",
  "visual",
  "accessibility",
] as const;

export type BrowserQaPhaseStatus = "executed" | "skipped" | "failed";

export type BrowserQaFindingSeverity = "info" | "warning" | "error";

export type BrowserQaFinding = {
  phase: BrowserQaPhase;
  route?: string;
  selector?: string;
  target?: string;
  severity: BrowserQaFindingSeverity;
  message: string;
  repair_hint?: string;
};

export type BrowserQaPhaseResult = {
  phase: BrowserQaPhase;
  status: BrowserQaPhaseStatus;
  findings: BrowserQaFinding[];
  skippedReason?: string;
};

export type BrowserQaInput = {
  htmlContent?: string;
  targetUrl?: string;
  routes?: string[];
  surface: SurfaceType;
};

export type BrowserQaRunResult = {
  phases: BrowserQaPhaseResult[];
  provider: string;
  timestamp: string;
};

export type BrowserQaSummary = {
  providerId: string;
  phases: Record<BrowserQaPhase, { status: BrowserQaPhaseStatus; findingsCount: number }>;
  totalFindings: number;
  skippedReasons: string[];
};

export interface BrowserQaProvider {
  providerId: string;
  canRun(surface: SurfaceType): boolean;
  runSmoke(input: BrowserQaInput): Promise<BrowserQaPhaseResult>;
  runInteraction(input: BrowserQaInput): Promise<BrowserQaPhaseResult>;
  runVisual(input: BrowserQaInput): Promise<BrowserQaPhaseResult>;
  runAccessibility(input: BrowserQaInput): Promise<BrowserQaPhaseResult>;
}
