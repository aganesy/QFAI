import type { PrototypingSurface } from "./types.js";
import { isUiBearingSurfaceType } from "../detection/surfaceType.js";

export function buildRuntimeGate(input: { surface: PrototypingSurface; targetUrl?: string }):
  | {
      ui: Array<{ route: string; status: number }>;
      api: Array<{ method: string; path: string; status: number }>;
    }
  | undefined {
  if (!isUiBearingSurfaceType(input.surface)) {
    return {
      ui: [],
      api: [],
    };
  }

  if (!input.targetUrl) {
    return undefined;
  }

  return {
    ui: [{ route: input.targetUrl, status: 200 }],
    api: [],
  };
}
