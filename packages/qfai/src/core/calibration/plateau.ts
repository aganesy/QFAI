/**
 * Plateau detection — detects score stagnation based on delta and
 * lookback window (SD-0030-002, BR-0030-0011, BR-0030-0012, BR-0030-0013).
 */

import type { PlateauConfig, PlateauResult } from "./types.js";
import { DEFAULT_PLATEAU_CONFIG } from "./types.js";

export class PlateauDetector {
  private config: PlateauConfig;
  private maxIterations: number;

  constructor(config?: Partial<PlateauConfig>, maxIterations?: number) {
    this.config = {
      deltaThreshold: config?.deltaThreshold ?? DEFAULT_PLATEAU_CONFIG.deltaThreshold,
      lookbackWindow: config?.lookbackWindow ?? DEFAULT_PLATEAU_CONFIG.lookbackWindow,
    };
    this.maxIterations = maxIterations ?? 15;
  }

  detect(scores: number[]): PlateauResult {
    if (scores.length < this.config.lookbackWindow) {
      return { detected: false, delta: Infinity, scores };
    }

    const window = scores.slice(-this.config.lookbackWindow);
    const min = Math.min(...window);
    const max = Math.max(...window);
    const delta = Math.abs(max - min);

    return {
      detected: delta < this.config.deltaThreshold,
      delta,
      scores: window,
    };
  }

  shouldExit(
    iterationCount: number,
    scores: number[],
  ): {
    exit: boolean;
    reason: "plateau" | "max-iterations-reached" | null;
    bestScore: number;
  } {
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    if (iterationCount >= this.maxIterations) {
      return { exit: true, reason: "max-iterations-reached", bestScore };
    }

    const plateau = this.detect(scores);
    if (plateau.detected) {
      return { exit: true, reason: "plateau", bestScore };
    }

    return { exit: false, reason: null, bestScore };
  }
}
