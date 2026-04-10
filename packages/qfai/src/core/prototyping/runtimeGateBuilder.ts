import type { PrototypingSurface } from "./types.js";
import { requiresVisualBrowserEvidence } from "../detection/surfaceType.js";

export function buildRuntimeGate(input: {
  surface: PrototypingSurface;
  targetUrl?: string;
  routes?: string[];
}):
  | {
      ui: Array<{ route: string; status: number; url?: string }>;
      api: Array<{ method: string; path: string; status: number }>;
      evidenceRefs: string[];
    }
  | undefined {
  if (!requiresVisualBrowserEvidence(input.surface)) {
    return undefined;
  }

  if (!input.routes || input.routes.length === 0) {
    return undefined;
  }

  return {
    ui: input.routes.map((route) => ({
      route,
      status: 200,
      ...(input.targetUrl
        ? { url: new URL(route, ensureTrailingSlash(input.targetUrl)).toString() }
        : {}),
    })),
    api: [],
    evidenceRefs: [".qfai/evidence/prototyping.json#/runtimeGate"],
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
