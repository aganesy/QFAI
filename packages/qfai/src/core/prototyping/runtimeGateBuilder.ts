import type { RuntimeObservation } from "./runtimeObservation.js";
import { assertConcreteArtifactRef, normalizeConcreteArtifactRef } from "./pathUtils.js";

export function buildRuntimeGate(input: { runtimeObservation: RuntimeObservation }):
  | {
      ui: Array<{
        screenId: string;
        route: string;
        declaredRef: string;
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

  const evidenceRefs = Array.from(
    new Set(
      input.runtimeObservation.ui.flatMap((entry) => {
        assertConcreteArtifactRef(entry.declaredRef);
        return [
          normalizeConcreteArtifactRef(entry.declaredRef),
          ...entry.renderEvidenceRefs.map((ref) => normalizeConcreteArtifactRef(ref)),
          ...entry.browserQaEvidenceRefs.map((ref) => normalizeConcreteArtifactRef(ref)),
        ];
      }),
    ),
  );
  if (evidenceRefs.length === 0) {
    throw new Error("runtimeGate.evidenceRefs must not be empty when UI observations exist.");
  }

  return {
    ui: input.runtimeObservation.ui.map((entry) => ({ ...entry })),
    evidenceRefs,
  };
}
