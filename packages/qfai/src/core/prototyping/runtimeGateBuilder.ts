import type { PrototypingSurface } from "./types.js";
import { requiresVisualBrowserEvidence } from "../detection/surfaceType.js";

export function buildRuntimeGate(input: { surface: PrototypingSurface; targetUrl?: string }):
  | {
      ui: Array<{ route: string; status: number }>;
      api: Array<{ method: string; path: string; status: number }>;
      evidenceRefs: string[];
    }
  | undefined {
  if (!requiresVisualBrowserEvidence(input.surface)) {
    return undefined;
  }

  if (!input.targetUrl) {
    return undefined;
  }

  return {
    ui: [{ route: input.targetUrl, status: 200 }],
    api: [],
    evidenceRefs: [".qfai/evidence/prototyping.json#/runtimeGate"],
  };
}
