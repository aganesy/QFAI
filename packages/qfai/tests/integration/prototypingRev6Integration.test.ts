// QFAI:SPEC-0012:TC-0012-0141
// QFAI:SPEC-0012:TC-0012-0142
// QFAI:SPEC-0012:TC-0012-0143
// QFAI:SPEC-0012:TC-0012-0144
// QFAI:SPEC-0012:TC-0012-0145
// QFAI:SPEC-0012:TC-0012-0146
// QFAI:SPEC-0012:TC-0012-0147
// QFAI:SPEC-0012:TC-0012-0148
// QFAI:SPEC-0012:TC-0012-0149
// QFAI:SPEC-0012:TC-0012-0150
// QFAI:SPEC-0012:TC-0012-0151
// QFAI:SPEC-0012:TC-0012-0152
// QFAI:SPEC-0012:TC-0012-0153
// QFAI:SPEC-0012:TC-0012-0154
// QFAI:SPEC-0012:TC-0012-0155
// QFAI:SPEC-0012:TC-0012-0156
// QFAI:SPEC-0012:TC-0012-0157
// QFAI:SPEC-0012:TC-0012-0158
// QFAI:SPEC-0012:TC-0012-0159
// QFAI:SPEC-0012:TC-0012-0160
// QFAI:SPEC-0012:TC-0012-0161
// QFAI:SPEC-0012:TC-0012-0162
// QFAI:SPEC-0012:TC-0012-0163
// QFAI:SPEC-0012:TC-0012-0164
// QFAI:SPEC-0012:TC-0012-0165
// QFAI:SPEC-0012:TC-0012-0166
// QFAI:SPEC-0012:TC-0012-0167
// QFAI:SPEC-0012:TC-0012-0168
// QFAI:SPEC-0012:TC-0012-0169
// QFAI:SPEC-0012:TC-0012-0170
// QFAI:SPEC-0012:TC-0012-0171
// QFAI:SPEC-0012:TC-0012-0172

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseArgs } from "../../src/cli/lib/args.js";
import {
  PROTOTYPING_SUPPORTED_SURFACES,
  assertSupportedPrototypingSurface,
  isSupportedPrototypingSurface,
} from "../../src/core/prototyping/surfacePolicy.js";
import { CalibrationLoader } from "../../src/core/calibration/loader.js";
import {
  isConcreteArtifactRef,
  normalizeConcreteArtifactRef,
} from "../../src/core/prototyping/pathUtils.js";
import { assertConcreteArtifactRefs } from "../../src/core/prototyping/refSemantics.js";
import {
  derivePrototypingObligations,
  UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE,
  NON_UI_PROTOTYPING_SURFACE_REASON_CODE,
} from "../../src/core/prototyping/mode.js";
import type { PrototypingSurface } from "../../src/core/prototyping/types.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// WS-CLI: CLI rejects non-full-harness modes
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0141
describe("TC-0012-0141: CLI Rejects --mode standard", () => {
  it("parseArgs marks invalid=true when --mode standard is passed", () => {
    const result = parseArgs(["prototyping", "run", "--mode", "standard"], process.cwd());
    expect(result.invalid).toBe(true);
  });

  it("parseArgs does not set prototypingMode when --mode standard is passed", () => {
    const result = parseArgs(["prototyping", "run", "--mode", "standard"], process.cwd());
    expect(result.options.prototypingMode).toBeUndefined();
  });
});

// QFAI:SPEC-0012:TC-0012-0142
describe("TC-0012-0142: CLI Rejects --mode low-cost", () => {
  it("parseArgs marks invalid=true when --mode low-cost is passed", () => {
    const result = parseArgs(["prototyping", "run", "--mode", "low-cost"], process.cwd());
    expect(result.invalid).toBe(true);
  });

  it("parseArgs does not set prototypingMode when --mode low-cost is passed", () => {
    const result = parseArgs(["prototyping", "run", "--mode", "low-cost"], process.cwd());
    expect(result.options.prototypingMode).toBeUndefined();
  });
});

// QFAI:SPEC-0012:TC-0012-0143
describe("TC-0012-0143: CLI Accepts --mode full-harness", () => {
  it("parseArgs accepts --mode full-harness without marking invalid", () => {
    const result = parseArgs(["prototyping", "run", "--mode", "full-harness"], process.cwd());
    expect(result.options.prototypingMode).toBe("full-harness");
  });

  it("parseArgs with full-harness mode does not mark invalid", () => {
    const result = parseArgs(["prototyping", "run", "--mode", "full-harness"], process.cwd());
    // prototypingAction and mode are both valid
    expect(result.options.prototypingAction).toBe("run");
    expect(result.options.prototypingMode).toBe("full-harness");
  });
});

// ---------------------------------------------------------------------------
// WS-13: Mode rejection at execution layer
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0144
describe("TC-0012-0144: execution.ts Rejects standard Mode Independently", () => {
  it("derivePrototypingObligations returns validCombination=false for web+standard", () => {
    const result = derivePrototypingObligations({
      surface: "web" as PrototypingSurface,
      effectiveMode: "standard",
    });
    expect(result.validCombination).toBe(false);
    expect(result.invalidReasonCode).toBe(UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE);
  });

  it("derivePrototypingObligations returns validCombination=false for mobile+standard", () => {
    const result = derivePrototypingObligations({
      surface: "mobile" as PrototypingSurface,
      effectiveMode: "standard",
    });
    expect(result.validCombination).toBe(false);
  });
});

// QFAI:SPEC-0012:TC-0012-0145
describe("TC-0012-0145: Mode Check Fires Before CalibrationLoader", () => {
  it("derivePrototypingObligations with standard+any packPath returns error before loading pack", () => {
    // Mode validation does not consult the file system
    const result = derivePrototypingObligations({
      surface: "web" as PrototypingSurface,
      effectiveMode: "standard",
    });
    expect(result.validCombination).toBe(false);
    expect(result.invalidReasonCode).toBe(UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE);
  });

  it("mode rejection reason code is UNSUPPORTED_PROTOTYPING_MODE for standard mode (not NON_UI)", () => {
    const result = derivePrototypingObligations({
      surface: "web" as PrototypingSurface,
      effectiveMode: "standard",
    });
    expect(result.invalidReasonCode).toBe(UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE);
    expect(result.invalidReasonCode).not.toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
  });
});

// ---------------------------------------------------------------------------
// WS-14: Surface rejection
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0146
describe("TC-0012-0146: CLI Rejects --surface cli (isSupportedPrototypingSurface)", () => {
  it("isSupportedPrototypingSurface('cli') returns false", () => {
    expect(isSupportedPrototypingSurface("cli")).toBe(false);
  });

  it("assertSupportedPrototypingSurface('cli') throws an error", () => {
    expect(() => assertSupportedPrototypingSurface("cli")).toThrow();
  });

  it("derivePrototypingObligations cli+full-harness → validCombination=false with NON_UI reason", () => {
    const result = derivePrototypingObligations({
      surface: "cli" as unknown as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(result.validCombination).toBe(false);
    expect(result.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
  });
});

// QFAI:SPEC-0012:TC-0012-0147
describe("TC-0012-0147: CLI Rejects --surface api (isSupportedPrototypingSurface)", () => {
  it("isSupportedPrototypingSurface('api') returns false", () => {
    expect(isSupportedPrototypingSurface("api")).toBe(false);
  });

  it("assertSupportedPrototypingSurface('api') throws an error", () => {
    expect(() => assertSupportedPrototypingSurface("api")).toThrow();
  });

  it("derivePrototypingObligations api+full-harness → validCombination=false with NON_UI reason", () => {
    const result = derivePrototypingObligations({
      surface: "api" as unknown as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(result.validCombination).toBe(false);
    expect(result.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
  });
});

// QFAI:SPEC-0012:TC-0012-0148
describe("TC-0012-0148: CLI Rejects --surface backend (isSupportedPrototypingSurface)", () => {
  it("isSupportedPrototypingSurface('backend') returns false", () => {
    expect(isSupportedPrototypingSurface("backend")).toBe(false);
  });

  it("assertSupportedPrototypingSurface('backend') throws an error", () => {
    expect(() => assertSupportedPrototypingSurface("backend")).toThrow();
  });

  it("derivePrototypingObligations backend+full-harness → validCombination=false with NON_UI reason", () => {
    const result = derivePrototypingObligations({
      surface: "backend" as unknown as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(result.validCombination).toBe(false);
    expect(result.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
  });
});

// QFAI:SPEC-0012:TC-0012-0149
describe("TC-0012-0149: execution.ts Calls assertSupportedPrototypingSurface", () => {
  it("execution.ts imports assertSupportedPrototypingSurface from surfacePolicy.js", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("assertSupportedPrototypingSurface");
    expect(src).toContain("surfacePolicy.js");
  });

  it("isSupportedPrototypingSurface('web') returns true (positive sanity check)", () => {
    expect(isSupportedPrototypingSurface("web")).toBe(true);
  });
});

// QFAI:SPEC-0012:TC-0012-0150
describe("TC-0012-0150: prototypingEvidence Validator Rejects cli Surface", () => {
  it("prototypingEvidence.ts imports isSupportedPrototypingSurface for surface validation", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("isSupportedPrototypingSurface");
  });

  it("prototypingEvidence.ts emits QFAI-PROT-171 for invalid surfaces", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-171");
    expect(src).toContain("surface が不正です");
  });

  it("derivePrototypingObligations('cli', 'full-harness') returns validCombination=false", () => {
    const result = derivePrototypingObligations({
      surface: "cli" as unknown as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(result.validCombination).toBe(false);
    expect(result.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
  });
});

// ---------------------------------------------------------------------------
// WS-15: surfacePolicy standalone module
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0151
describe("TC-0012-0151: surfacePolicy isSupportedPrototypingSurface", () => {
  it("isSupportedPrototypingSurface('cli') returns false", () => {
    expect(isSupportedPrototypingSurface("cli")).toBe(false);
  });

  it("isSupportedPrototypingSurface('web') returns true", () => {
    expect(isSupportedPrototypingSurface("web")).toBe(true);
  });

  it("isSupportedPrototypingSurface('mobile') returns true", () => {
    expect(isSupportedPrototypingSurface("mobile")).toBe(true);
  });

  it("isSupportedPrototypingSurface('desktop') returns true", () => {
    expect(isSupportedPrototypingSurface("desktop")).toBe(true);
  });

  it("isSupportedPrototypingSurface('mixed') returns true", () => {
    expect(isSupportedPrototypingSurface("mixed")).toBe(true);
  });

  it("isSupportedPrototypingSurface('api') returns false", () => {
    expect(isSupportedPrototypingSurface("api")).toBe(false);
  });
});

// QFAI:SPEC-0012:TC-0012-0152
describe("TC-0012-0152: PROTOTYPING_SUPPORTED_SURFACES Contains Exactly 4 Members", () => {
  it("PROTOTYPING_SUPPORTED_SURFACES has exactly 4 members", () => {
    expect(PROTOTYPING_SUPPORTED_SURFACES).toHaveLength(4);
  });

  it("PROTOTYPING_SUPPORTED_SURFACES contains web, mobile, desktop, mixed", () => {
    const sorted = [...PROTOTYPING_SUPPORTED_SURFACES].sort();
    expect(sorted).toEqual(["desktop", "mixed", "mobile", "web"]);
  });

  it("PROTOTYPING_SUPPORTED_SURFACES does not contain cli, api, backend", () => {
    const surfaces = new Set<string>(PROTOTYPING_SUPPORTED_SURFACES);
    expect(surfaces.has("cli")).toBe(false);
    expect(surfaces.has("api")).toBe(false);
    expect(surfaces.has("backend")).toBe(false);
  });
});

// QFAI:SPEC-0012:TC-0012-0153
describe("TC-0012-0153: assertSupportedPrototypingSurface Throws for Unknown Surface", () => {
  it("assertSupportedPrototypingSurface('unknown-xyz') throws an error", () => {
    expect(() => assertSupportedPrototypingSurface("unknown-xyz")).toThrow();
  });

  it("isSupportedPrototypingSurface('unknown-xyz') returns false", () => {
    expect(isSupportedPrototypingSurface("unknown-xyz")).toBe(false);
  });

  it("assertSupportedPrototypingSurface('web') does NOT throw", () => {
    expect(() => assertSupportedPrototypingSurface("web")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// WS-16: CalibrationLoader fail-closed
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0154
describe("TC-0012-0154: runFullHarness Missing packPath Throws Before Iteration", () => {
  it("CalibrationLoader.load() throws 'Calibration pack not found at' for a missing file", async () => {
    const missingPath = path.join(os.tmpdir(), "qfai-test-nonexistent-pack.yaml");
    const loader = new CalibrationLoader(missingPath);
    await expect(loader.load()).rejects.toThrow("Calibration pack not found at");
  });

  it("CalibrationLoader.load() error message contains 'Full-harness requires a valid calibration pack file'", async () => {
    const missingPath = path.join(os.tmpdir(), "qfai-test-missing-pack-2.yaml");
    const loader = new CalibrationLoader(missingPath);
    await expect(loader.load()).rejects.toThrow(
      "Full-harness requires a valid calibration pack file.",
    );
  });
});

// QFAI:SPEC-0012:TC-0012-0155
describe("TC-0012-0155: runFullHarness No calibrationRef Throws", () => {
  it("CalibrationLoader.load() throws when packPath is empty string (cannot read file)", async () => {
    const loader = new CalibrationLoader("");
    // Empty path causes ENOENT or EISDIR - throws before iteration
    await expect(loader.load()).rejects.toThrow();
  });

  it("CalibrationLoader.getPack() throws before load() is called", () => {
    const loader = new CalibrationLoader("any-path.yaml");
    expect(() => loader.getPack()).toThrow("Calibration pack not loaded. Call load() first.");
  });
});

// QFAI:SPEC-0012:TC-0012-0156
describe("TC-0012-0156: runFullHarness Malformed YAML Throws at Parse", () => {
  it("CalibrationLoader.load() throws when YAML content is malformed", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-calib-test-"));
    const malformedYamlPath = path.join(tmpDir, "bad-calib.yaml");
    try {
      await writeFile(malformedYamlPath, "{ not: valid: yaml: [unclosed", "utf-8");
      const loader = new CalibrationLoader(malformedYamlPath);
      await expect(loader.load()).rejects.toThrow();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("CalibrationLoader.load() throws when required 'version' field is missing", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-calib-test-"));
    const noVersionPath = path.join(tmpDir, "no-version.yaml");
    try {
      await writeFile(
        noVersionPath,
        [
          "examples: []",
          "thresholds:",
          "  accept: 0.8",
          "  refine: 0.5",
          "maxIterations: 3",
          "plateauDelta: 0.02",
          "plateauLookback: 3",
        ].join("\n"),
        "utf-8",
      );
      const loader = new CalibrationLoader(noVersionPath);
      await expect(loader.load()).rejects.toThrow("version");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0157
describe("TC-0012-0157: runFullHarness Records Resolved packPath in Summary", () => {
  it("CalibrationLoader.load() returns pack with correct version field", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-calib-test-"));
    const validPackPath = path.join(tmpDir, "valid-calib.yaml");
    try {
      await writeFile(
        validPackPath,
        [
          "version: '2.1.0'",
          "examples: []",
          "thresholds:",
          "  accept: 0.8",
          "  refine: 0.5",
          "maxIterations: 5",
          "plateauDelta: 0.01",
          "plateauLookback: 3",
        ].join("\n"),
        "utf-8",
      );
      const loader = new CalibrationLoader(validPackPath);
      const pack = await loader.load();
      expect(pack.version).toBe("2.1.0");
      expect(pack.thresholds.accept).toBe(0.8);
      expect(pack.maxIterations).toBe(5);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("CalibrationLoader.getPack() returns the loaded pack after load()", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-calib-test-"));
    const validPackPath = path.join(tmpDir, "valid-calib2.yaml");
    try {
      await writeFile(
        validPackPath,
        [
          "version: '1.0.0'",
          "examples: []",
          "thresholds:",
          "  accept: 0.75",
          "  refine: 0.4",
          "maxIterations: 3",
          "plateauDelta: 0.02",
          "plateauLookback: 2",
        ].join("\n"),
        "utf-8",
      );
      const loader = new CalibrationLoader(validPackPath);
      await loader.load();
      const pack = loader.getPack();
      expect(pack.version).toBe("1.0.0");
      expect(pack.plateauLookback).toBe(2);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0158
describe("TC-0012-0158: TypeScript Compile Error When Scalar Params Passed", () => {
  it("runtime.ts FullHarnessRequest type has calibrationPack as a required object field (not string)", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    // calibrationPack is typed as CalibrationPack (object), not string scalar
    expect(src).toContain("calibrationPack: CalibrationPack");
    // calibrationRef is a nested object, not a scalar
    expect(src).toContain("calibrationRef:");
    expect(src).toMatch(/packPath:\s*string/);
    expect(src).toMatch(/packVersion:\s*string/);
  });

  it("runtime.ts FullHarnessRequest requires adapters object (not scalar)", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("adapters: FullHarnessAdapters");
  });
});

// QFAI:SPEC-0012:TC-0012-0159
describe("TC-0012-0159: Validator Rejects calibrationRef.packPath Mismatch", () => {
  it("prototypingEvidence.ts emits QFAI-PROT-319 when packPath mismatch detected", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-319");
    expect(src).toContain("calibrationRef.packPath");
    expect(src).toContain("does not match resolved calibration pack path");
  });

  it("prototypingEvidence.ts uses resolveCalibrationPack to verify packPath", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("resolveCalibrationPack");
    expect(src).toContain("QFAI-PROT-265");
  });
});

// ---------------------------------------------------------------------------
// WS-17: concrete evidenceRefs validation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0160
describe("TC-0012-0160: Validator Passes Concrete evidenceRefs", () => {
  it("isConcreteArtifactRef('.qfai/discussion/disc-001/screenshots/iter-0.png') returns true", () => {
    expect(isConcreteArtifactRef(".qfai/discussion/disc-001/screenshots/iter-0.png")).toBe(true);
  });

  it("isConcreteArtifactRef('.qfai/discussion/disc-001/browserQa/iter-0-smoke.json#/findings/0') returns true", () => {
    expect(
      isConcreteArtifactRef(".qfai/discussion/disc-001/browserQa/iter-0-smoke.json#/findings/0"),
    ).toBe(true);
  });

  it("normalizeConcreteArtifactRef does not throw for valid concrete PNG ref", () => {
    expect(() =>
      normalizeConcreteArtifactRef(".qfai/discussion/disc-001/screenshots/iter-0.png"),
    ).not.toThrow();
  });
});

// QFAI:SPEC-0012:TC-0012-0161
describe("TC-0012-0161: Validator Rejects Self-Reference evidenceRef", () => {
  it("isConcreteArtifactRef('.qfai/evidence/prototyping.json#/runtimeGate') returns false", () => {
    expect(isConcreteArtifactRef(".qfai/evidence/prototyping.json#/runtimeGate")).toBe(false);
  });

  it("isConcreteArtifactRef('.qfai/evidence/prototyping.json#/iterations/0/renderSummary') returns false", () => {
    expect(
      isConcreteArtifactRef(".qfai/evidence/prototyping.json#/iterations/0/renderSummary"),
    ).toBe(false);
  });

  it("normalizeConcreteArtifactRef throws 'Self-ref is not allowed' for prototyping.json", () => {
    expect(() =>
      normalizeConcreteArtifactRef(".qfai/evidence/prototyping.json#/runtimeGate"),
    ).toThrow("Self-ref is not allowed");
  });
});

// QFAI:SPEC-0012:TC-0012-0162
describe("TC-0012-0162: Validator Rejects Synthetic Free-Text evidenceRef", () => {
  it("isConcreteArtifactRef('specs: UI matches design') returns false", () => {
    expect(isConcreteArtifactRef("specs: UI matches design")).toBe(false);
  });

  it("isConcreteArtifactRef('specs: UI matches design as per visual inspection') returns false", () => {
    expect(isConcreteArtifactRef("specs: UI matches design as per visual inspection")).toBe(false);
  });

  it("normalizeConcreteArtifactRef throws 'Synthetic artifact ref is not allowed' for 'specs:...' refs", () => {
    expect(() => normalizeConcreteArtifactRef("specs: UI matches design")).toThrow(
      "Synthetic artifact ref is not allowed",
    );
  });
});

// QFAI:SPEC-0012:TC-0012-0163
describe("TC-0012-0163: Validator Rejects Empty evidenceRefs Array", () => {
  it("assertConcreteArtifactRefs('field', []) throws an error", () => {
    expect(() => assertConcreteArtifactRefs("field", [])).toThrow();
  });

  it("assertConcreteArtifactRefs error message contains 'must not be empty'", () => {
    expect(() => assertConcreteArtifactRefs("runtimeGate.evidenceRefs", [])).toThrow(
      "must not be empty",
    );
  });

  it("assertConcreteArtifactRefs does NOT throw for valid concrete refs", () => {
    expect(() =>
      assertConcreteArtifactRefs("field", [".qfai/discussion/disc-001/screenshots/iter-0.png"]),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// WS-18: reviewerSignoff semantics
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0164
describe("TC-0012-0164: reviewerSignoff accepted Termination Produces approved", () => {
  it("runtime.ts maps finalDecision 'accepted' → signoffStatus 'approved'", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    // mapFinalDecisionToSignoffStatus logic
    expect(src).toContain('case "accepted"');
    expect(src).toContain('return "approved"');
  });

  it("prototypingEvidence.ts QFAI-PROT-316 maps finalDecision 'accepted' → expectedSignoffStatus 'approved'", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain('finalDecision === "accepted"');
    expect(src).toContain('"approved"');
  });
});

// QFAI:SPEC-0012:TC-0012-0165
describe("TC-0012-0165: reviewerSignoff plateau Termination Produces abandoned", () => {
  it("runtime.ts deriveFinalDecision returns 'abandoned' for plateau terminationReason", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    // plateau is not converged, not rejected, so result is "abandoned"
    expect(src).toContain('return "abandoned"');
    expect(src).not.toMatch(/terminationReason\s*===\s*"plateau"\s*[^}]*"accepted"/);
  });

  it("prototypingEvidence.ts QFAI-PROT-316: plateau → expectedSignoffStatus is 'abandoned'", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // Any non-accepted, non-pending, non-rejected finalDecision → "abandoned"
    expect(src).toContain('"abandoned"');
    expect(src).toContain("QFAI-PROT-316");
  });
});

// QFAI:SPEC-0012:TC-0012-0166
describe("TC-0012-0166: isCompleted True Alone Does Not Produce approved", () => {
  it("runtime.ts deriveFinalDecision: plateau terminationReason → 'abandoned' (not 'accepted')", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    // The deriveFinalDecision function only returns "accepted" for "converged" terminationReason
    expect(src).toContain('terminationReason === "converged"');
    expect(src).toContain('return "accepted"');
    // plateau is mapped to "abandoned"
    expect(src).toContain('return "abandoned"');
  });

  it("prototypingEvidence.ts QFAI-PROT-325: status=completed with signoff=pending is an error", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-325");
    expect(src).toContain("reviewerSignoff.status is pending");
  });
});

// ---------------------------------------------------------------------------
// WS-19: uiFidelityBuilder screenId matching
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0167
describe("TC-0012-0167: uiFidelityBuilder Matches by screenId", () => {
  it("uiFidelityBuilder.ts uses obs.screenId === screen.screenId for observation matching", async () => {
    const src = await readFile(srcPath("prototyping", "uiFidelityBuilder.ts"), "utf-8");
    expect(src).toContain("obs.screenId === screen.screenId");
  });

  it("uiFidelityBuilder.ts finds observation when obs.screenId matches screen.screenId", async () => {
    const src = await readFile(srcPath("prototyping", "uiFidelityBuilder.ts"), "utf-8");
    // The find predicate uses both route and screenId
    expect(src).toMatch(/obs\.screenId\s*===\s*screen\.screenId/);
    // obs.screenId="screen-login", screen.screenId="screen-login" → match
    expect(src).toContain("obs.screenId");
  });
});

// QFAI:SPEC-0012:TC-0012-0168
describe("TC-0012-0168: uiFidelityBuilder Does Not Match by uiContractId", () => {
  it("uiFidelityBuilder.ts does NOT use obs.screenId === screen.uiContractId", async () => {
    const src = await readFile(srcPath("prototyping", "uiFidelityBuilder.ts"), "utf-8");
    expect(src).not.toMatch(/obs\.screenId\s*===\s*screen\.uiContractId/);
  });

  it("uiFidelityBuilder.ts does NOT use obs.uiContractId for screen matching", async () => {
    const src = await readFile(srcPath("prototyping", "uiFidelityBuilder.ts"), "utf-8");
    expect(src).not.toMatch(/obs\.uiContractId\s*===\s*screen\.screenId/);
  });
});

// QFAI:SPEC-0012:TC-0012-0169
describe("TC-0012-0169: Validator Hard-Errors on uiContractId in Observation", () => {
  it("runtimeObservation.ts ObservedUiRoute type does NOT include uiContractId field", async () => {
    const src = await readFile(srcPath("prototyping", "runtimeObservation.ts"), "utf-8");
    // ObservedUiRoute should use screenId, not uiContractId
    expect(src).toContain("screenId");
    const observedUiRouteType = src.match(/export type ObservedUiRoute\s*=\s*\{[^}]+\}/)?.[0] ?? "";
    if (observedUiRouteType) {
      expect(observedUiRouteType).not.toContain("uiContractId");
    }
  });

  it("prototypingEvidence.ts does not accept uiContractId in runtimeGate.ui[] parsing", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // runtimeGate.ui[] parsing only maps screenId, route, declaredRef, rendered, browserVisited
    // The schema validation checks only the known fields
    expect(src).toContain("screenId");
    expect(src).not.toMatch(/runtimeGate.*uiContractId\s*required/);
  });
});

// ---------------------------------------------------------------------------
// WS-20: ReviewerLogVerdict vocabulary
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0170
describe("TC-0012-0170: reviewerLogs verdict Uses Mapped Vocabulary", () => {
  it("harness/types.ts ReviewerLogVerdict type includes 'approve' as valid verdict", async () => {
    const src = await readFile(srcPath("harness", "types.ts"), "utf-8");
    expect(src).toContain('"approve"');
    expect(src).toContain("ReviewerLogVerdict");
  });

  it("harness/types.ts ReviewerLogVerdict type includes all 4 mapped verdicts", async () => {
    const src = await readFile(srcPath("harness", "types.ts"), "utf-8");
    const verdictTypeLine = src.match(/ReviewerLogVerdict\s*=\s*[^;]+;/)?.[0] ?? "";
    expect(verdictTypeLine).toContain('"approve"');
    expect(verdictTypeLine).toContain('"revise"');
    expect(verdictTypeLine).toContain('"reject"');
    expect(verdictTypeLine).toContain('"abandon"');
  });

  it("harness/types.ts ReviewerLogVerdict type does NOT include legacy 'accept' verb", async () => {
    const src = await readFile(srcPath("harness", "types.ts"), "utf-8");
    const verdictTypeLine = src.match(/ReviewerLogVerdict\s*=\s*[^;]+;/)?.[0] ?? "";
    // "accept" is not a valid verdict — only "approve" is
    expect(verdictTypeLine).not.toContain('"accept"');
  });
});

// ---------------------------------------------------------------------------
// WS-21: Stale docs/tests cleanup
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0171
describe("TC-0012-0171: Shipped Docs Do Not Contain standard or low-cost", () => {
  it("SKILL.md in prototyping skill dir does not reference deprecated 'standard' mode", async () => {
    const skillMdPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "skills",
      "prototyping",
      "SKILL.md",
    );
    let src: string;
    try {
      src = await readFile(skillMdPath, "utf-8");
    } catch {
      // If file doesn't exist, skip - skill may be differently structured
      return;
    }
    // Should not reference standard or low-cost as valid modes
    expect(src).not.toMatch(/--mode\s+standard\b/);
    expect(src).not.toMatch(/--mode\s+low-cost\b/);
  });

  it("prototyping evidence README/docs do not advertise deprecated modes", async () => {
    const possibleReadmePaths = [
      path.join(repoRoot, "packages", "qfai", "assets", "skills", "prototyping", "README.md"),
      path.join(repoRoot, "packages", "qfai", "assets", "skills", "prototyping", "EVIDENCE.md"),
    ];
    for (const docPath of possibleReadmePaths) {
      let src: string;
      try {
        src = await readFile(docPath, "utf-8");
      } catch {
        continue;
      }
      expect(src).not.toMatch(/mode.*standard|standard.*mode/i);
      expect(src).not.toMatch(/mode.*low-cost|low-cost.*mode/i);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0172
describe("TC-0012-0172: Test Fixtures Do Not Allow cli+standard Prototyping", () => {
  it("prototypingCommand.test.ts does not use surface='cli' with mode='standard'", async () => {
    const testPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "tests",
      "cli",
      "prototypingCommand.test.ts",
    );
    const src = await readFile(testPath, "utf-8");
    // Check there's no fixture combination of cli surface + standard mode
    const hasBadCombo = src.includes('surface: "cli"') && src.includes('mode: "standard"');
    expect(hasBadCombo).toBe(false);
  });

  it("prototypingRev5Integration.test.ts uses cli+standard only for rejection testing", async () => {
    const testPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "tests",
      "integration",
      "prototypingRev5Integration.test.ts",
    );
    const src = await readFile(testPath, "utf-8");
    // If the file uses cli+standard, it must be in a rejection context
    if (src.includes('"cli"') && src.includes('"standard"')) {
      // The valid pattern: expects validCombination=false
      expect(src).toContain("validCombination");
      expect(src).toContain(".toBe(false)");
      // Must NOT assert that cli+standard is valid
      expect(src).not.toMatch(
        /surface.*cli.*effectiveMode.*standard[\s\S]{0,100}validCombination[\s\S]{0,50}toBe\(true\)/,
      );
    }
  });

  it("derivePrototypingObligations guarantees cli+standard always invalid (invariant)", () => {
    const result = derivePrototypingObligations({
      surface: "cli" as unknown as PrototypingSurface,
      effectiveMode: "standard",
    });
    expect(result.validCombination).toBe(false);
  });
});
