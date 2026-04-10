/**
 * Harness adapters — WS-D
 *
 * Adapter interfaces for connecting the full-harness runtime to
 * render evidence, Browser QA, critique, and observability subsystems.
 */

import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { RenderRunnerResult } from "../evidence/types.js";
import type { SurfaceType } from "../detection/surfaceType.js";

export type HarnessRenderAdapter = {
  captureEvidence(iteration: number): Promise<RenderRunnerResult>;
};

export type HarnessBrowserQaAdapter = {
  runQa(iteration: number): Promise<BrowserQaRunResult>;
};

export type HarnessCritiqueInput = {
  output: string;
  context: string;
  iteration: number;
};

export type HarnessObservabilityAdapter = {
  recordIteration(data: {
    iteration: number;
    score: number;
    decision: string;
    terminationReason?: string;
  }): void;
  flush(): Promise<void>;
};

export type FullHarnessAdapters = {
  surface: SurfaceType;
  render: HarnessRenderAdapter;
  browserQa: HarnessBrowserQaAdapter;
  observability?: HarnessObservabilityAdapter;
};
