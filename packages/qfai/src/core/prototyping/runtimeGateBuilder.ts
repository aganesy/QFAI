import type { RuntimeObservation } from "./runtimeObservation.js";

export function buildRuntimeGate(input: { runtimeObservation: RuntimeObservation }):
  | {
      ui: Array<{
        screenId: string;
        route: string;
        url?: string;
        rendered: boolean;
        browserVisited: boolean;
        httpStatus?: number;
        renderEvidenceRefs: string[];
        browserQaEvidenceRefs: string[];
      }>;
      evidenceRefs: string[];
    }
  | undefined {
  if (input.runtimeObservation.ui.length === 0) {
    return undefined;
  }

  return {
    ui: input.runtimeObservation.ui.map((entry) => ({ ...entry })),
    evidenceRefs: [".qfai/evidence/prototyping.json#/runtimeGate"],
  };
}
