import type { SurfaceType } from "../detection/surfaceType.js";

export type BrowserQaPhase = "smoke" | "interaction" | "visual" | "accessibility";
export const BROWSER_QA_PHASES: readonly BrowserQaPhase[] = [
  "smoke",
  "interaction",
  "visual",
  "accessibility",
] as const;

export type BrowserQaPhaseStatus = "passed" | "executed" | "failed" | "skipped";
export type BrowserQaFindingSeverity = "info" | "warn" | "warning" | "error";

export interface BrowserQaFinding {
  phase: BrowserQaPhase;
  severity: BrowserQaFindingSeverity;
  summary: string;
  detail: string;
  screen_id?: string;
  selector?: string;
  evidence_refs: string[];
  repair_suggestions: string[];
  category?: BrowserQaPhase;
  message?: string;
  route?: string;
  repair_hint?: string;
}

export type BrowserQaScreenContractRef = {
  screen_id: string;
  route?: string;
  primary_tasks?: string[];
};

export type BrowserQaPhaseResult = {
  phase: BrowserQaPhase;
  status: BrowserQaPhaseStatus;
  findings: BrowserQaFinding[];
  repair_suggestions: string[];
  evidence_refs: string[];
  checks_performed: string[];
  skippedReason?: string;
};

export type BrowserQaInput = {
  htmlContent?: string;
  targetUrl?: string;
  routes?: string[];
  surface: SurfaceType;
  required?: boolean;
  executionSource?: "html" | "url" | "none";
  screenContracts?: BrowserQaScreenContractRef[];
};

export type BrowserQaRunResult = {
  phases: BrowserQaPhaseResult[];
  provider: string;
  timestamp: string;
};

export type BrowserQaSummary = {
  providerId: string;
  phases: Record<
    BrowserQaPhase,
    {
      status: BrowserQaPhaseStatus;
      findingsCount: number;
      checksCount: number;
      passed?: number;
      failed?: number;
    }
  >;
  totalFindings: number;
  totalRepairs: number;
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
