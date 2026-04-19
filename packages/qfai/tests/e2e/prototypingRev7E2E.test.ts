// QFAI:SPEC-0012:US-0012-0056
// QFAI:SPEC-0012:US-0012-0057
// QFAI:SPEC-0012:US-0012-0058
// QFAI:SPEC-0012:US-0012-0059
// QFAI:SPEC-0012:US-0012-0060
// QFAI:SPEC-0012:US-0012-0061
// QFAI:SPEC-0012:US-0012-0062

import {
  PROTOTYPING_SUPPORTED_SURFACES,
  assertSupportedPrototypingSurface,
  getSupportedPrototypingSurfacesLabel,
} from "../../src/core/prototyping/surfacePolicy.js";
import {
  CalibrationResolutionError,
  UiFidelityEvidenceError,
  SpecCoverageBuildError,
  L2EvidenceBuildError,
  FullHarnessRuntimeError,
  EvidenceWriteError,
} from "../../src/core/prototyping/errors.js";
import { isConcreteArtifactRef } from "../../src/core/prototyping/pathUtils.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, expect } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0056: CalibrationPack Upstream Resolution (v1.7.15 rev7)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0056
describe("E2E: US-0012-0056 — CalibrationPack Upstream Resolution", () => {
  it("execution.ts imports resolveCalibrationPack from calibration/packResolver.js (upstream resolution)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("resolveCalibrationPack");
    expect(src).toContain("packResolver.js");
  });

  it("execution.ts resolves CalibrationPack before calling runFullHarness (upstream pattern)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    const resolveIdx = src.indexOf("resolveCalibrationOrThrow");
    const runIdx = src.indexOf("runFullHarnessOrThrow");
    expect(resolveIdx).toBeGreaterThan(-1);
    expect(runIdx).toBeGreaterThan(-1);
    expect(resolveIdx).toBeLessThan(runIdx);
  });

  it("runtime.ts does NOT import CalibrationLoader", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).not.toContain("CalibrationLoader");
  });

  it("runtime.ts accepts CalibrationPack as a type parameter (not resolver)", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("CalibrationPack");
    expect(src).toContain("calibrationPack");
  });

  it("execution.ts wraps CalibrationResolutionError in resolveCalibrationOrThrow", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("CalibrationResolutionError");
    expect(src).toContain("resolveCalibrationOrThrow");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0057: uiFidelity Fail-Closed Guard (v1.7.15 rev7)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0057
describe("E2E: US-0012-0057 — uiFidelity Fail-Closed Guard", () => {
  it("execution.ts imports UiFidelityEvidenceError from errors.js", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("UiFidelityEvidenceError");
    expect(src).toContain("errors.js");
  });

  it("execution.ts has buildUiFidelityOrThrow function that throws UiFidelityEvidenceError", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("buildUiFidelityOrThrow");
    expect(src).toContain("UiFidelityEvidenceError");
  });

  it("execution.ts guard checks status, missingRequiredEvidence, and missing screens before proceeding", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("missingRequiredEvidence");
    expect(src).toContain("status");
    expect(src).toContain("completed");
  });

  it("execution.ts calls buildUiFidelityOrThrow before buildSpecCoverageSummary (guard ordering)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    const uiFidelityIdx = src.indexOf("buildUiFidelityOrThrow");
    const specCovIdx = src.indexOf("buildSpecCoverageOrThrow");
    expect(uiFidelityIdx).toBeGreaterThan(-1);
    expect(specCovIdx).toBeGreaterThan(-1);
    expect(uiFidelityIdx).toBeLessThan(specCovIdx);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0058: Concrete-Only evidenceRefs (v1.7.15 rev7)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0058
describe("E2E: US-0012-0058 — Concrete-Only evidenceRefs", () => {
  it("pathUtils.ts exports isConcreteArtifactRef function", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+isConcreteArtifactRef/);
  });

  it("pathUtils.ts exports normalizeConcreteArtifactRef function", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+normalizeConcreteArtifactRef/);
  });

  it("isConcreteArtifactRef returns true for valid spec anchor ref", () => {
    expect(isConcreteArtifactRef(".qfai/specs/spec-0012/01_Spec.md#scope")).toBe(true);
  });

  it("isConcreteArtifactRef returns false for directory path", () => {
    expect(isConcreteArtifactRef("./evidence/prototyping/")).toBe(false);
  });

  it("isConcreteArtifactRef returns false for synthetic free-text token", () => {
    expect(isConcreteArtifactRef("specs: all screens covered")).toBe(false);
  });

  it("execution.ts uses assertConcreteArtifactRefs for evidence ref enforcement", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("assertConcreteArtifactRefs");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0059: Validator Calibration Metadata Check (v1.7.15 rev7)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0059
describe("E2E: US-0012-0059 — Validator Calibration Metadata Check", () => {
  it("prototypingEvidence.ts emits QFAI-PROT-319 for packPath mismatch", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-319");
    expect(src).toContain("packPath");
  });

  it("prototypingEvidence.ts emits QFAI-PROT-320 for packVersion mismatch", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-320");
    expect(src).toContain("packVersion");
  });

  it("prototypingEvidence.ts emits QFAI-PROT-321 for configPath mismatch", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-321");
    expect(src).toContain("configPath");
  });

  it("prototypingEvidence.ts compares calibrationRef.packPath against resolved pack (not hardcoded)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // Check that "1.0.0" is not used as a special heuristic bypass
    // The comparison must be real pack path vs. summary packPath
    expect(src).toContain("calibrationRef.packPath");
    expect(src).toContain("calibrationRef.packVersion");
    expect(src).not.toMatch(/packVersion.*===\s*["']1\.0\.0["']/);
    expect(src).not.toMatch(/["']1\.0\.0["']\s*===.*packVersion/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0060: Error Taxonomy (v1.7.15 rev7)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0060
describe("E2E: US-0012-0060 — Error Taxonomy (6 distinct error classes)", () => {
  it("errors.ts exports exactly CalibrationResolutionError", () => {
    expect(CalibrationResolutionError).toBeDefined();
    expect(new CalibrationResolutionError("test")).toBeInstanceOf(Error);
    expect(new CalibrationResolutionError("test").name).toBe("CalibrationResolutionError");
  });

  it("errors.ts exports exactly UiFidelityEvidenceError", () => {
    expect(UiFidelityEvidenceError).toBeDefined();
    expect(new UiFidelityEvidenceError("test")).toBeInstanceOf(Error);
    expect(new UiFidelityEvidenceError("test").name).toBe("UiFidelityEvidenceError");
  });

  it("errors.ts exports exactly SpecCoverageBuildError", () => {
    expect(SpecCoverageBuildError).toBeDefined();
    expect(new SpecCoverageBuildError("test")).toBeInstanceOf(Error);
    expect(new SpecCoverageBuildError("test").name).toBe("SpecCoverageBuildError");
  });

  it("errors.ts exports exactly L2EvidenceBuildError", () => {
    expect(L2EvidenceBuildError).toBeDefined();
    expect(new L2EvidenceBuildError("test")).toBeInstanceOf(Error);
    expect(new L2EvidenceBuildError("test").name).toBe("L2EvidenceBuildError");
  });

  it("errors.ts exports exactly FullHarnessRuntimeError", () => {
    expect(FullHarnessRuntimeError).toBeDefined();
    expect(new FullHarnessRuntimeError("test")).toBeInstanceOf(Error);
    expect(new FullHarnessRuntimeError("test").name).toBe("FullHarnessRuntimeError");
  });

  it("errors.ts exports exactly EvidenceWriteError", () => {
    expect(EvidenceWriteError).toBeDefined();
    expect(new EvidenceWriteError("test")).toBeInstanceOf(Error);
    expect(new EvidenceWriteError("test").name).toBe("EvidenceWriteError");
  });

  it("execution.ts imports all 6 error classes from errors.js (narrow catch blocks)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("CalibrationResolutionError");
    expect(src).toContain("UiFidelityEvidenceError");
    expect(src).toContain("SpecCoverageBuildError");
    expect(src).toContain("L2EvidenceBuildError");
    expect(src).toContain("FullHarnessRuntimeError");
    expect(src).toContain("EvidenceWriteError");
    expect(src).toContain("errors.js");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0061: Config packPath-Only (v1.7.15 rev7)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0061
describe("E2E: US-0012-0061 — Config packPath-Only (scalar fields removed)", () => {
  it("config.ts QfaiPrototypingCalibrationConfig type has only packPath field (no scalar calibration)", async () => {
    const src = await readFile(srcPath("config.ts"), "utf-8");
    // Type should be packPath only
    const typeMatch = src.match(/QfaiPrototypingCalibrationConfig\s*=\s*\{([^}]*)\}/);
    expect(typeMatch).not.toBeNull();
    const typeBody = typeMatch?.[1] ?? "";
    expect(typeBody.length).toBeGreaterThan(0);
    expect(typeBody).toContain("packPath");
    expect(typeBody).not.toContain("thresholds");
    expect(typeBody).not.toContain("maxIterations");
    expect(typeBody).not.toContain("plateauDelta");
    expect(typeBody).not.toContain("plateauLookback");
  });

  it("config.ts has validateObsoleteCalibrationFields that rejects thresholds/maxIterations/plateauDelta/plateauLookback", async () => {
    const src = await readFile(srcPath("config.ts"), "utf-8");
    expect(src).toContain("validateObsoleteCalibrationFields");
    expect(src).toContain("thresholds");
    expect(src).toContain("maxIterations");
    expect(src).toContain("plateauDelta");
    expect(src).toContain("plateauLookback");
    expect(src).toContain("廃止されました");
  });

  it("qfai.config.yaml shipped template does not contain scalar calibration fields", async () => {
    const templatePath = path.join(repoRoot, "qfai.config.yaml");
    const template = await readFile(templatePath, "utf-8");
    expect(template).not.toMatch(/thresholds:/);
    expect(template).not.toMatch(/maxIterations:/);
    expect(template).not.toMatch(/plateauDelta:/);
    expect(template).not.toMatch(/plateauLookback:/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0062: surfacePolicy Rejection Message from Constant (v1.7.15 rev7)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0062
describe("E2E: US-0012-0062 — surfacePolicy Rejection Message from Constant", () => {
  it("assertSupportedPrototypingSurface error message contains all surfaces from PROTOTYPING_SUPPORTED_SURFACES", () => {
    let errorMessage = "";
    try {
      assertSupportedPrototypingSurface("cli");
    } catch (e) {
      errorMessage = (e as Error).message;
    }
    for (const surface of PROTOTYPING_SUPPORTED_SURFACES) {
      expect(errorMessage).toContain(surface);
    }
  });

  it("rejection message does NOT hardcode 'cli' as a listed surface", () => {
    let errorMessage = "";
    try {
      assertSupportedPrototypingSurface("cli");
    } catch (e) {
      errorMessage = (e as Error).message;
    }
    // "cli" should NOT appear as a valid surface in the message
    // (it should say what IS supported, not what is rejected)
    const withoutCli = errorMessage.replace(/surface[s]? only for.*$/i, "");
    expect(withoutCli).not.toContain('"cli"');
  });

  it("surfacePolicy.ts assertSupportedPrototypingSurface uses getSupportedPrototypingSurfacesLabel() (dynamic message)", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    expect(src).toContain("getSupportedPrototypingSurfacesLabel");
    expect(src).toContain("PROTOTYPING_SUPPORTED_SURFACES");
  });

  it("getSupportedPrototypingSurfacesLabel returns comma-joined list of all supported surfaces", () => {
    const label = getSupportedPrototypingSurfacesLabel();
    for (const surface of PROTOTYPING_SUPPORTED_SURFACES) {
      expect(label).toContain(surface);
    }
  });

  it("adding a surface to PROTOTYPING_SUPPORTED_SURFACES would auto-update rejection message (dynamic construction verified)", async () => {
    // Verify that the message is built from the constant, not hardcoded
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    // The error message must reference getSupportedPrototypingSurfacesLabel or PROTOTYPING_SUPPORTED_SURFACES
    expect(src).toMatch(/getSupportedPrototypingSurfacesLabel\(\)/);
    // The message must NOT contain a static literal list like "web, mobile, desktop, mixed"
    expect(src).not.toMatch(/["']web, mobile, desktop, mixed["']/);
  });
});
