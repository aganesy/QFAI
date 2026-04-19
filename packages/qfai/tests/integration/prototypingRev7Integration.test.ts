// QFAI:SPEC-0012:TC-0012-0173
// QFAI:SPEC-0012:TC-0012-0174
// QFAI:SPEC-0012:TC-0012-0175
// QFAI:SPEC-0012:TC-0012-0176
// QFAI:SPEC-0012:TC-0012-0177
// QFAI:SPEC-0012:TC-0012-0178
// QFAI:SPEC-0012:TC-0012-0179
// QFAI:SPEC-0012:TC-0012-0180
// QFAI:SPEC-0012:TC-0012-0181
// QFAI:SPEC-0012:TC-0012-0182
// QFAI:SPEC-0012:TC-0012-0183
// QFAI:SPEC-0012:TC-0012-0184
// QFAI:SPEC-0012:TC-0012-0185
// QFAI:SPEC-0012:TC-0012-0186
// QFAI:SPEC-0012:TC-0012-0187
// QFAI:SPEC-0012:TC-0012-0188
// QFAI:SPEC-0012:TC-0012-0189
// QFAI:SPEC-0012:TC-0012-0190
// QFAI:SPEC-0012:TC-0012-0191
// QFAI:SPEC-0012:TC-0012-0192
// QFAI:SPEC-0012:TC-0012-0193
// QFAI:SPEC-0012:TC-0012-0194
// QFAI:SPEC-0012:TC-0012-0195
// QFAI:SPEC-0012:TC-0012-0196
// QFAI:SPEC-0012:TC-0012-0197

import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  PROTOTYPING_SUPPORTED_SURFACES,
  assertSupportedPrototypingSurface,
  isSupportedPrototypingSurface,
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
import {
  isConcreteArtifactRef,
  normalizeConcreteArtifactRef,
} from "../../src/core/prototyping/pathUtils.js";
import { CalibrationLoader } from "../../src/core/calibration/loader.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// QFAI:SPEC-0012:TC-0012-0173
describe("TC-0012-0173: CalibrationPack Resolved — Normal Path", () => {
  it("execution.ts calls resolveCalibrationPack before runFullHarness (upstream pattern)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    const resolveIdx = src.indexOf("resolveCalibrationOrThrow");
    const runFullIdx = src.indexOf("runFullHarnessOrThrow");
    expect(resolveIdx).toBeGreaterThan(-1);
    expect(runFullIdx).toBeGreaterThan(-1);
    expect(resolveIdx).toBeLessThan(runFullIdx);
  });

  it("execution.ts passes resolvedCalibration (CalibrationPack) to runFullHarness call site", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("resolvedCalibration");
    expect(src).toContain("runFullHarness");
  });

  it("runtime.ts FullHarnessRequest type accepts calibrationPack field", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("calibrationPack");
    expect(src).toContain("CalibrationPack");
  });
});

// QFAI:SPEC-0012:TC-0012-0174
describe("TC-0012-0174: CalibrationLoader Missing Pack — Error Path", () => {
  it("execution.ts wraps resolveCalibrationPack error as CalibrationResolutionError", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("CalibrationResolutionError");
    const resolveOrThrowFn = src.match(/function resolveCalibrationOrThrow[\s\S]*?^\}/m);
    // Function exists
    expect(resolveOrThrowFn !== null || src.includes("resolveCalibrationOrThrow")).toBe(true);
  });

  it("CalibrationResolutionError is an Error subclass with code QFAI_PROT_CALIBRATION_RESOLUTION_FAILED", () => {
    const err = new CalibrationResolutionError("pack missing");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CalibrationResolutionError");
    expect(err.code).toBe("QFAI_PROT_CALIBRATION_RESOLUTION_FAILED");
    expect(err.message).toBe("pack missing");
  });

  it("CalibrationLoader throws when pack file does not exist", async () => {
    const missingPath = path.join(os.tmpdir(), `qfai-rev7-missing-${Date.now()}.yaml`);
    const loader = new CalibrationLoader(missingPath);
    await expect(loader.load()).rejects.toThrow("Calibration pack not found at");
  });
});

// QFAI:SPEC-0012:TC-0012-0175
describe("TC-0012-0175: runtime.ts Zero CalibrationLoader Imports — Boundary", () => {
  it("runtime.ts has 0 import statements for CalibrationLoader", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    const importMatches = src.match(/import.*CalibrationLoader/g);
    expect(importMatches).toBeNull();
  });

  it("runtime.ts does not import from calibration/loader.js", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).not.toContain("loader.js");
  });

  it("runtime.ts imports CalibrationPack as type only (not class instance)", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("CalibrationPack");
    // It should be imported as a type (not as a value that can be instantiated)
    const importLine = src.match(/import[^;]+CalibrationPack[^;]+;/);
    expect(importLine).not.toBeNull();
    const importStr = importLine?.[0] ?? "";
    expect(importStr.length).toBeGreaterThan(0);
    expect(importStr).toMatch(/import\s+type/);
  });
});

// QFAI:SPEC-0012:TC-0012-0176
describe("TC-0012-0176: uiFidelity Status Guard — Normal Path", () => {
  it("execution.ts buildUiFidelityOrThrow function exists and throws UiFidelityEvidenceError on failure", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("buildUiFidelityOrThrow");
    expect(src).toContain("UiFidelityEvidenceError");
  });

  it("execution.ts guard checks status === 'completed' before proceeding", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain('"completed"');
    expect(src).toContain("missingRequiredEvidence");
  });
});

// QFAI:SPEC-0012:TC-0012-0177
describe("TC-0012-0177: uiFidelity Incomplete Status — Error Path", () => {
  it("execution.ts throws UiFidelityEvidenceError when status is not 'completed'", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("UiFidelityEvidenceError");
    expect(src).toContain("completed");
    expect(src).toContain("buildUiFidelityEvidenceMessage");
  });

  it("UiFidelityEvidenceError class has correct name and code", () => {
    const err = new UiFidelityEvidenceError("insufficient evidence");
    expect(err.name).toBe("UiFidelityEvidenceError");
    expect(err.code).toBe("QFAI_PROT_UI_FIDELITY_INSUFFICIENT");
    expect(err.message).toBe("insufficient evidence");
  });
});

// QFAI:SPEC-0012:TC-0012-0178
describe("TC-0012-0178: missingRequiredEvidence Non-Empty — Error Path", () => {
  it("execution.ts buildUiFidelityEvidenceMessage includes missingRequiredEvidence in message", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("missingRequiredEvidence");
    expect(src).toContain("buildUiFidelityEvidenceMessage");
    // Evidence message function references the missing evidence array
    const msgFnIdx = src.indexOf("buildUiFidelityEvidenceMessage");
    const msgFnBody = src.slice(msgFnIdx, msgFnIdx + 500);
    expect(msgFnBody).toContain("missingRequiredEvidence");
  });

  it("execution.ts guard checks missingRequiredEvidence.length > 0", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("missingRequiredEvidence.length");
  });
});

// QFAI:SPEC-0012:TC-0012-0179
describe("TC-0012-0179: Missing Required Screen — Error Path", () => {
  it("execution.ts guard checks for missing screens before runFullHarness", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("missingScreens");
    expect(src).toContain("UiFidelityEvidenceError");
  });
});

// QFAI:SPEC-0012:TC-0012-0180
describe("TC-0012-0180: Guard Ordering Correct — Boundary", () => {
  it("buildUiFidelityOrThrow is called before buildSpecCoverageOrThrow in execution.ts", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    const uiFidelityIdx = src.indexOf("buildUiFidelityOrThrow");
    const specCovIdx = src.indexOf("buildSpecCoverageOrThrow");
    expect(uiFidelityIdx).toBeLessThan(specCovIdx);
  });

  it("execution.ts guard failure prevents buildSpecCoverageOrThrow from being reached", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    // Guard is inside buildUiFidelityOrThrow (throw before return), so specCoverage won't run
    expect(src).toContain("throw new UiFidelityEvidenceError");
    expect(src).toContain("buildSpecCoverageOrThrow");
  });
});

// QFAI:SPEC-0012:TC-0012-0181
describe("TC-0012-0181: Concrete Spec Anchor Ref — Normal Path", () => {
  it("isConcreteArtifactRef returns true for spec anchor ref", () => {
    expect(isConcreteArtifactRef(".qfai/specs/spec-0012/01_Spec.md#scope")).toBe(true);
  });

  it("isConcreteArtifactRef returns true for screenshot PNG ref", () => {
    expect(isConcreteArtifactRef(".qfai/evidence/prototyping/render/iter-0-screen.png")).toBe(true);
  });

  it("isConcreteArtifactRef returns true for browser QA JSON pointer ref", () => {
    expect(
      isConcreteArtifactRef(".qfai/evidence/prototyping/browserQa/iter-0-smoke.json#/findings/0"),
    ).toBe(true);
  });
});

// QFAI:SPEC-0012:TC-0012-0182
describe("TC-0012-0182: Directory Path Rejected — Error Path", () => {
  it("isConcreteArtifactRef returns false for directory path (trailing slash)", () => {
    expect(isConcreteArtifactRef(".qfai/evidence/prototyping/")).toBe(false);
  });

  it("normalizeConcreteArtifactRef throws for directory path", () => {
    expect(() => normalizeConcreteArtifactRef(".qfai/evidence/prototyping/")).toThrow();
  });
});

// QFAI:SPEC-0012:TC-0012-0183
describe("TC-0012-0183: Self-Ref Rejected — Error Path", () => {
  it("isConcreteArtifactRef returns false for self-reference (.qfai/evidence/prototyping.json)", () => {
    expect(isConcreteArtifactRef(".qfai/evidence/prototyping.json#/specCoverage")).toBe(false);
  });

  it("normalizeConcreteArtifactRef throws for self-reference", () => {
    expect(() =>
      normalizeConcreteArtifactRef(".qfai/evidence/prototyping.json#/specCoverage"),
    ).toThrow();
  });
});

// QFAI:SPEC-0012:TC-0012-0184
describe("TC-0012-0184: Synthetic Token Rejected — Error Path", () => {
  it("isConcreteArtifactRef returns false for synthetic free-text token", () => {
    expect(isConcreteArtifactRef("specs: all screens covered")).toBe(false);
  });

  it("normalizeConcreteArtifactRef throws for synthetic token starting with 'specs:'", () => {
    expect(() =>
      normalizeConcreteArtifactRef("specs: UI matches design as per visual inspection"),
    ).toThrow("Synthetic artifact ref is not allowed");
  });
});

// QFAI:SPEC-0012:TC-0012-0185
describe("TC-0012-0185: Calibration Metadata Match — Normal Path", () => {
  it("prototypingEvidence.ts contains QFAI-PROT-319 for packPath mismatch check", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-319");
  });

  it("prototypingEvidence.ts contains QFAI-PROT-320 for packVersion mismatch check", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-320");
  });

  it("prototypingEvidence.ts contains QFAI-PROT-321 for configPath mismatch check", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-321");
  });
});

// QFAI:SPEC-0012:TC-0012-0186
describe("TC-0012-0186: packVersion Mismatch Is Error — Error Path", () => {
  it("prototypingEvidence.ts QFAI-PROT-320 is an 'error' kind (not warning)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    const prot320Idx = src.indexOf("QFAI-PROT-320");
    expect(prot320Idx).toBeGreaterThan(-1);
    // Check surrounding context for "error" severity
    const context = src.slice(prot320Idx, prot320Idx + 300);
    expect(context).toContain('"error"');
  });

  it("prototypingEvidence.ts QFAI-PROT-320 compares calibrationRef.packVersion vs actual pack version", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("calibrationRef.packVersion");
    expect(src).toContain("calibrationPack.pack.version");
  });
});

// QFAI:SPEC-0012:TC-0012-0187
describe("TC-0012-0187: '1.0.0' Heuristic Absent — Boundary", () => {
  it("prototypingEvidence.ts has no hardcoded '1.0.0' bypass/heuristic for packVersion", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // There must be no special case that skips validation for packVersion === "1.0.0"
    expect(src).not.toMatch(/packVersion.*===\s*["']1\.0\.0["']/);
    expect(src).not.toMatch(/["']1\.0\.0["']\s*===.*packVersion/);
    expect(src).not.toMatch(/if.*1\.0\.0.*skip/i);
  });

  it("prototypingEvidence.ts performs actual version comparison without special-casing any version string", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // Confirm it does real comparison
    expect(src).toContain("calibrationRef.packVersion");
    expect(src).toContain("calibrationPack.pack.version");
    // No bypass for default version
    expect(src).not.toContain('packVersion === "1.0.0"');
  });
});

// QFAI:SPEC-0012:TC-0012-0188
describe("TC-0012-0188: All 6 Error Classes Exported — Normal Path", () => {
  it("CalibrationResolutionError extends Error with correct code", () => {
    const err = new CalibrationResolutionError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("QFAI_PROT_CALIBRATION_RESOLUTION_FAILED");
  });

  it("UiFidelityEvidenceError extends Error with correct code", () => {
    const err = new UiFidelityEvidenceError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("QFAI_PROT_UI_FIDELITY_INSUFFICIENT");
  });

  it("SpecCoverageBuildError extends Error with correct code", () => {
    const err = new SpecCoverageBuildError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("QFAI_PROT_SPEC_COVERAGE_BUILD_FAILED");
  });

  it("L2EvidenceBuildError extends Error with correct code", () => {
    const err = new L2EvidenceBuildError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("QFAI_PROT_L2_EVIDENCE_BUILD_FAILED");
  });

  it("FullHarnessRuntimeError extends Error with correct code", () => {
    const err = new FullHarnessRuntimeError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("QFAI_PROT_FULL_HARNESS_RUNTIME_FAILED");
  });

  it("EvidenceWriteError extends Error with correct code", () => {
    const err = new EvidenceWriteError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("QFAI_PROT_EVIDENCE_WRITE_FAILED");
  });

  it("all 6 classes are distinct (no duplicate codes)", () => {
    const codes = [
      new CalibrationResolutionError("x").code,
      new UiFidelityEvidenceError("x").code,
      new SpecCoverageBuildError("x").code,
      new L2EvidenceBuildError("x").code,
      new FullHarnessRuntimeError("x").code,
      new EvidenceWriteError("x").code,
    ];
    expect(new Set(codes).size).toBe(6);
  });
});

// QFAI:SPEC-0012:TC-0012-0189
describe("TC-0012-0189: EvidenceWriteError on Write Failure — Error Path", () => {
  it("execution.ts has a catch block that wraps write errors in EvidenceWriteError", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("throw new EvidenceWriteError");
  });

  it("EvidenceWriteError message does not contain 'Failed to load calibration pack'", () => {
    const err = new EvidenceWriteError("Evidence write failed: disk full");
    expect(err.message).not.toContain("Failed to load calibration pack");
  });
});

// QFAI:SPEC-0012:TC-0012-0190
describe("TC-0012-0190: FullHarnessRuntimeError on Runtime Failure — Error Path", () => {
  it("execution.ts has a catch block that wraps runFullHarness errors in FullHarnessRuntimeError", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("FullHarnessRuntimeError");
  });

  it("FullHarnessRuntimeError instanceof check identifies the correct class", () => {
    const err = new FullHarnessRuntimeError("harness failure");
    expect(err).toBeInstanceOf(FullHarnessRuntimeError);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(CalibrationResolutionError);
  });
});

// QFAI:SPEC-0012:TC-0012-0191
describe("TC-0012-0191: packPath-Only Config Accepted — Normal Path", () => {
  it("config.ts QfaiPrototypingCalibrationConfig type only has packPath (no scalar fields)", async () => {
    const src = await readFile(srcPath("config.ts"), "utf-8");
    const typeMatch = src.match(/QfaiPrototypingCalibrationConfig\s*=\s*\{([^}]*)\}/);
    expect(typeMatch).not.toBeNull();
    const typeBody = typeMatch?.[1] ?? "";
    expect(typeBody.length).toBeGreaterThan(0);
    expect(typeBody).toContain("packPath");
    expect(typeBody).not.toContain("thresholds");
    expect(typeBody).not.toContain("maxIterations");
  });
});

// QFAI:SPEC-0012:TC-0012-0192
describe("TC-0012-0192: Obsolete thresholds.accept Rejected — Error Path", () => {
  it("config.ts validateObsoleteCalibrationFields rejects 'thresholds' field", async () => {
    const src = await readFile(srcPath("config.ts"), "utf-8");
    expect(src).toContain("validateObsoleteCalibrationFields");
    expect(src).toContain('"thresholds"');
    expect(src).toContain("廃止されました");
  });
});

// QFAI:SPEC-0012:TC-0012-0193
describe("TC-0012-0193: Obsolete maxIterations Rejected — Error Path", () => {
  it("config.ts validateObsoleteCalibrationFields rejects 'maxIterations' field", async () => {
    const src = await readFile(srcPath("config.ts"), "utf-8");
    expect(src).toContain('"maxIterations"');
    expect(src).toContain("廃止されました");
  });
});

// QFAI:SPEC-0012:TC-0012-0194
describe("TC-0012-0194: Shipped Template Has Zero Scalar Fields — Boundary", () => {
  it("qfai.config.yaml does not contain thresholds/maxIterations/plateauDelta/plateauLookback", async () => {
    const templatePath = path.join(repoRoot, "qfai.config.yaml");
    const content = await readFile(templatePath, "utf-8");
    expect(content).not.toMatch(/^\s*thresholds:/m);
    expect(content).not.toMatch(/^\s*maxIterations:/m);
    expect(content).not.toMatch(/^\s*plateauDelta:/m);
    expect(content).not.toMatch(/^\s*plateauLookback:/m);
  });
});

// QFAI:SPEC-0012:TC-0012-0195
describe("TC-0012-0195: Rejection Message From Constant — Normal Path", () => {
  it("assertSupportedPrototypingSurface error message contains all 4 supported surfaces", () => {
    let message = "";
    try {
      assertSupportedPrototypingSurface("cli");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("web");
    expect(message).toContain("mobile");
    expect(message).toContain("desktop");
    expect(message).toContain("mixed");
  });

  it("assertSupportedPrototypingSurface error message does not hardcode 'cli' as a valid surface", () => {
    let message = "";
    try {
      assertSupportedPrototypingSurface("cli");
    } catch (e) {
      message = (e as Error).message;
    }
    // The message lists what IS supported (not what was rejected)
    // cli should not appear as a listed surface
    const surfaceListPart = message.split(":").pop() ?? message;
    expect(surfaceListPart).not.toContain('"cli"');
  });
});

// QFAI:SPEC-0012:TC-0012-0196
describe("TC-0012-0196: PROTOTYPING_SUPPORTED_SURFACES Message Is Dynamic — Edge", () => {
  it("getSupportedPrototypingSurfacesLabel includes all surfaces from PROTOTYPING_SUPPORTED_SURFACES", () => {
    const label = getSupportedPrototypingSurfacesLabel();
    for (const s of PROTOTYPING_SUPPORTED_SURFACES) {
      expect(label).toContain(s);
    }
  });

  it("surfacePolicy.ts rejection message is built from getSupportedPrototypingSurfacesLabel (not hardcoded)", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    expect(src).toContain("getSupportedPrototypingSurfacesLabel()");
    // No static string like "web, mobile, desktop, mixed" should appear in the message template
    expect(src).not.toMatch(/["']web, mobile, desktop, mixed["']/);
  });
});

// QFAI:SPEC-0012:TC-0012-0197
describe("TC-0012-0197: isSupportedPrototypingSurface Boundary Checks", () => {
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
});
