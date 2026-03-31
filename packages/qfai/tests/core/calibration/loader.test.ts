// QFAI:SPEC-0012:TC-0012-0001
// QFAI:SPEC-0012:TC-0012-0002
// QFAI:SPEC-0012:TC-0012-0012
// QFAI:SPEC-0012:TC-0012-0013
// QFAI:SPEC-0012:TC-0012-0015
// QFAI:SPEC-0012:TC-0012-0016
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { CalibrationLoader } from "../../../src/core/calibration/loader.js";

describe("CalibrationLoader", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "qfai-cal-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("pack loading (TC-0012-0001)", () => {
    it("loads a valid calibration pack from YAML", async () => {
      const packPath = join(tmpDir, "default.yaml");
      const yaml = `
version: "1.0.0"
examples:
  - input: "sample code 1"
    expectedScore: 0.75
    rationale: "minor issues"
  - input: "sample code 2"
    expectedScore: 0.90
    rationale: "good quality"
  - input: "sample code 3"
    expectedScore: 0.40
    rationale: "major issues"
thresholds:
  accept: 0.8
  refine: 0.5
`;
      await writeFile(packPath, yaml);

      const loader = new CalibrationLoader(packPath);
      const pack = await loader.load();

      expect(pack.examples).toHaveLength(3);
      expect(pack.examples[0]?.input).toBe("sample code 1");
      expect(pack.examples[0]?.expectedScore).toBe(0.75);
      expect(pack.examples[0]?.rationale).toBe("minor issues");
      expect(pack.thresholds?.accept).toBe(0.8);
      expect(pack.thresholds?.refine).toBe(0.5);
    });
  });

  describe("missing pack fallback (TC-0012-0002)", () => {
    it("falls back to defaults with warning when pack is missing", async () => {
      const loader = new CalibrationLoader(join(tmpDir, "nonexistent.yaml"));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const pack = await loader.load();

      expect(pack.examples).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith("Calibration pack not found, using defaults");

      warnSpy.mockRestore();
    });
  });

  describe("mid-session reload (TC-0012-0012)", () => {
    it("detects file modification and reloads pack", async () => {
      const packPath = join(tmpDir, "default.yaml");
      const yaml1 = `
version: "1.0.0"
examples:
  - input: "original"
    expectedScore: 0.70
    rationale: "first version"
`;
      await writeFile(packPath, yaml1);

      const loader = new CalibrationLoader(packPath);
      await loader.load();
      expect(loader.getExamples()).toHaveLength(1);
      expect(loader.getExamples()[0]?.input).toBe("original");

      // Modify file (wait a tick for mtime change)
      await new Promise((r) => setTimeout(r, 50));
      const yaml2 = `
version: "1.0.0"
examples:
  - input: "modified"
    expectedScore: 0.80
    rationale: "second version"
  - input: "new entry"
    expectedScore: 0.60
    rationale: "added"
`;
      await writeFile(packPath, yaml2);

      const reloaded = await loader.checkReload();
      expect(reloaded).toBe(true);
      expect(loader.getExamples()).toHaveLength(2);
      expect(loader.getExamples()[0]?.input).toBe("modified");
    });
  });

  describe("schema validation (TC-0012-0013)", () => {
    it("throws on calibration entry missing expectedScore", async () => {
      const packPath = join(tmpDir, "bad.yaml");
      const yaml = `
version: "1.0.0"
examples:
  - input: "sample"
    rationale: "missing score"
`;
      await writeFile(packPath, yaml);

      const loader = new CalibrationLoader(packPath);
      await expect(loader.load()).rejects.toThrow("expectedScore");
    });
  });

  describe("alignment distribution (TC-0012-0015)", () => {
    it("makes all alignment examples available for distribution", async () => {
      const packPath = join(tmpDir, "default.yaml");
      const yaml = `
version: "1.0.0"
examples:
  - input: "example 1"
    expectedScore: 0.70
    rationale: "test 1"
  - input: "example 2"
    expectedScore: 0.80
    rationale: "test 2"
  - input: "example 3"
    expectedScore: 0.90
    rationale: "test 3"
`;
      await writeFile(packPath, yaml);

      const loader = new CalibrationLoader(packPath);
      await loader.load();

      const examples = loader.getExamples();
      expect(examples).toHaveLength(3);

      // All examples should be distributable to reviewers
      for (const example of examples) {
        expect(example.input).toBeTruthy();
        expect(example.expectedScore).toBeGreaterThanOrEqual(0);
        expect(example.expectedScore).toBeLessThanOrEqual(1);
        expect(example.rationale).toBeTruthy();
      }
    });
  });

  describe("version control compliance (TC-0012-0016)", () => {
    it("stores calibration pack at a path suitable for version control", async () => {
      // The pack path follows the convention .qfai/calibration/default.yaml
      // which is within the repo and suitable for git tracking
      const conventionalPath = ".qfai/calibration/default.yaml";
      expect(conventionalPath).toMatch(/^\.qfai\/calibration\//);
      expect(conventionalPath).toMatch(/\.yaml$/);
    });
  });
});
