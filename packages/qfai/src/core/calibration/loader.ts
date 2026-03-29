/**
 * Calibration pack loader — loads YAML-based calibration packs
 * with schema validation and default fallback (BR-0030-0001, BR-0030-0002).
 */

import { readFile, stat } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { AlignmentExample, CalibrationPack, ThresholdConfig } from "./types.js";
import { DEFAULT_THRESHOLDS } from "./types.js";

const DEFAULT_PACK: CalibrationPack = {
  version: "1.0.0",
  examples: [],
  thresholds: { ...DEFAULT_THRESHOLDS },
};

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
    return { ...DEFAULT_THRESHOLDS };
  }
  const t = thresholds as Record<string, unknown>;
  const accept = typeof t.accept === "number" ? t.accept : DEFAULT_THRESHOLDS.accept;
  const refine = typeof t.refine === "number" ? t.refine : DEFAULT_THRESHOLDS.refine;

  if (accept < 0 || accept > 1) {
    throw new Error(`Threshold 'accept' out of range: ${accept} (must be 0.0-1.0)`);
  }
  if (refine < 0 || refine > 1) {
    throw new Error(`Threshold 'refine' out of range: ${refine} (must be 0.0-1.0)`);
  }

  return { accept, refine };
}

export class CalibrationLoader {
  private pack: CalibrationPack = { ...DEFAULT_PACK, examples: [] };
  private packPath: string;
  private lastModified: number = 0;

  constructor(packPath: string) {
    this.packPath = packPath;
  }

  async load(): Promise<CalibrationPack> {
    try {
      const content = await readFile(this.packPath, "utf-8");
      const raw = parseYaml(content) as Record<string, unknown>;

      if (!raw || typeof raw !== "object") {
        throw new Error("Calibration pack must be a YAML object");
      }

      const rawExamples = Array.isArray(raw.examples) ? raw.examples : [];
      const examples = rawExamples.map((e, i) => validateExample(e, i));
      const thresholds = validateThresholds(raw.thresholds);

      this.pack = {
        version: typeof raw.version === "string" ? raw.version : "1.0.0",
        examples,
        thresholds,
      };

      const fileStat = await stat(this.packPath);
      this.lastModified = fileStat.mtimeMs;

      return this.pack;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        console.warn("Calibration pack not found, using defaults");
        this.pack = { ...DEFAULT_PACK, examples: [] };
        return this.pack;
      }
      throw error;
    }
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
    return this.pack;
  }

  getExamples(): AlignmentExample[] {
    return this.pack.examples;
  }

  getThresholds(): ThresholdConfig {
    return this.pack.thresholds ?? { ...DEFAULT_THRESHOLDS };
  }
}
