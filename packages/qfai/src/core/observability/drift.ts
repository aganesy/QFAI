/**
 * DriftTracker — detects score drift across runs.
 * SPEC-0032
 *
 * Compares score distributions across runs and flags dimensions
 * where drift exceeds a configurable threshold (default 0.15).
 */

import type { DriftResult } from "./types.js";

export class DriftTracker {
  /**
   * Analyzes drift across multiple runs.
   *
   * @param runScores - Array of per-run score maps (dimension -> score)
   * @param threshold - Maximum acceptable drift (default 0.15)
   */
  analyze(
    runScores: Record<string, number>[],
    threshold = 0.15,
  ): DriftResult {
    if (runScores.length < 2) {
      return { driftScore: 0, flaggedDimensions: [], withinThreshold: true };
    }

    // Collect all dimension keys across all runs
    const dimensions = new Set<string>();
    for (const scores of runScores) {
      for (const key of Object.keys(scores)) {
        dimensions.add(key);
      }
    }

    const flaggedDimensions: string[] = [];
    let maxDrift = 0;

    for (const dim of dimensions) {
      const values: number[] = [];
      for (const scores of runScores) {
        const val = scores[dim];
        if (val !== undefined) {
          values.push(val);
        }
      }

      if (values.length < 2) continue;

      const min = Math.min(...values);
      const max = Math.max(...values);
      const drift = max - min;

      if (drift > maxDrift) {
        maxDrift = drift;
      }
      if (drift > threshold) {
        flaggedDimensions.push(dim);
      }
    }

    return {
      driftScore: Math.round(maxDrift * 1000) / 1000,
      flaggedDimensions,
      withinThreshold: flaggedDimensions.length === 0,
    };
  }
}
