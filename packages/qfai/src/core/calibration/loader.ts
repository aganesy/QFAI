/**
 * Calibration pack loader — loads YAML-based calibration packs
 * with strict schema validation. Fail-closed: missing pack or invalid schema throws.
 * v1.7.15: no DEFAULT_PACK fallback, no version "1.0.0" complement.
 */

import { readFile, stat } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { AlignmentExample, CalibrationPack, ThresholdConfig } from "./types.js";

function validateExample(entry: unknown, index: number): AlignmentExample {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`Calibration entry ${index}: must be an object`);
  }
  const e = entry as Record<string, unknown>;
  if (typeof e.input !== "string") {
    throw new Error(`Calibration entry ${index}: missing or invalid 'input' field`);
  }
  if (typeof e.expectedScore !== "number" || e.expectedScore < 0 || e.expectedScore > 1) {
    throw new Error(
      `Calibration entry ${index}: missing or invalid 'expectedScore' field (must be 0.0-1.0)`,
    );
  }
  if (typeof e.rationale !== "string") {
    throw new Error(`Calibration entry ${index}: missing or invalid 'rationale' field`);
  }
  return {
    input: e.input,
    expectedScore: e.expectedScore,
    rationale: e.rationale,
  };
}

function validateThresholds(thresholds: unknown): ThresholdConfig {
  if (typeof thresholds !== "object" || thresholds === null) {
    throw new Error("Calibration pack missing required 'thresholds' block");
  }
  const t = thresholds as Record<string, unknown>;
  if (typeof t.accept !== "number") {
    throw new Error("Calibration pack missing required 'thresholds.accept'");
  }
  if (typeof t.refine !== "number") {
    throw new Error("Calibration pack missing required 'thresholds.refine'");
  }
  const accept = t.accept;
  const refine = t.refine;

  if (!Number.isFinite(accept) || accept < 0 || accept > 1) {
    throw new Error(`Threshold 'accept' out of range: ${accept} (must be finite 0.0-1.0)`);
  }
  if (!Number.isFinite(refine) || refine < 0 || refine > 1) {
    throw new Error(`Threshold 'refine' out of range: ${refine} (must be finite 0.0-1.0)`);
  }

  return { accept, refine };
}

export class CalibrationLoader {
  private pack: CalibrationPack | null = null;
  private packPath: string;
  private lastModified: number = 0;

  constructor(packPath: string) {
    this.packPath = packPath;
  }

  async load(): Promise<CalibrationPack> {
    let content: string;
    try {
      content = await readFile(this.packPath, "utf-8");
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        throw new Error(
          `Calibration pack not found at ${this.packPath}. ` +
            `Full-harness requires a valid calibration pack file.`,
        );
      }
      throw error;
    }

    const raw = parseYaml(content) as Record<string, unknown>;

    // version is required, no "1.0.0" fallback
    if (typeof raw.version !== "string" || raw.version.trim().length === 0) {
      throw new Error(
        "Calibration pack missing required 'version' field. " +
          "Provide an explicit version string.",
      );
    }

    const rawExamples = Array.isArray(raw.examples) ? raw.examples : [];
    const examples = rawExamples.map((e, i) => validateExample(e, i));
    const thresholds = validateThresholds(raw.thresholds);

    // maxIterations, plateauDelta, plateauLookback are required
    if (typeof raw.maxIterations !== "number" || !Number.isFinite(raw.maxIterations)) {
      throw new Error(
        "Calibration pack missing required 'maxIterations' (must be a finite number)",
      );
    }
    if (typeof raw.plateauDelta !== "number" || !Number.isFinite(raw.plateauDelta)) {
      throw new Error("Calibration pack missing required 'plateauDelta' (must be a finite number)");
    }
    if (typeof raw.plateauLookback !== "number" || !Number.isFinite(raw.plateauLookback)) {
      throw new Error(
        "Calibration pack missing required 'plateauLookback' (must be a finite number)",
      );
    }

    this.pack = {
      version: raw.version,
      examples,
      thresholds,
      maxIterations: raw.maxIterations,
      plateauDelta: raw.plateauDelta,
      plateauLookback: raw.plateauLookback,
    };

    try {
      const fileStat = await stat(this.packPath);
      this.lastModified = fileStat.mtimeMs;
    } catch {
      // File may have been removed between read and stat; keep loaded pack
    }

    return this.pack;
  }

  async checkReload(): Promise<boolean> {
    try {
      const fileStat = await stat(this.packPath);
      if (fileStat.mtimeMs > this.lastModified) {
        await this.load();
        return true;
      }
    } catch {
      // File removed — keep current pack
    }
    return false;
  }

  getPack(): CalibrationPack {
    if (!this.pack) {
      throw new Error("Calibration pack not loaded. Call load() first.");
    }
    return this.pack;
  }

  getExamples(): AlignmentExample[] {
    return this.getPack().examples;
  }

  getThresholds(): ThresholdConfig {
    return this.getPack().thresholds;
  }
}
