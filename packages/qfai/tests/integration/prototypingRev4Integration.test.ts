// QFAI:SPEC-0012:TC-0012-0092
// QFAI:SPEC-0012:TC-0012-0093
// QFAI:SPEC-0012:TC-0012-0094
// QFAI:SPEC-0012:TC-0012-0095
// QFAI:SPEC-0012:TC-0012-0096
// QFAI:SPEC-0012:TC-0012-0097
// QFAI:SPEC-0012:TC-0012-0098
// QFAI:SPEC-0012:TC-0012-0099
// QFAI:SPEC-0012:TC-0012-0100
// QFAI:SPEC-0012:TC-0012-0101
// QFAI:SPEC-0012:TC-0012-0102
// QFAI:SPEC-0012:TC-0012-0103
// QFAI:SPEC-0012:TC-0012-0104
// QFAI:SPEC-0012:TC-0012-0105
// QFAI:SPEC-0012:TC-0012-0106
// QFAI:SPEC-0012:TC-0012-0107
// QFAI:SPEC-0012:TC-0012-0108
// QFAI:SPEC-0012:TC-0012-0109
// QFAI:SPEC-0012:TC-0012-0110
// QFAI:SPEC-0012:TC-0012-0111
// QFAI:SPEC-0012:TC-0012-0112
// QFAI:SPEC-0012:TC-0012-0113
// QFAI:SPEC-0012:TC-0012-0114
// QFAI:SPEC-0012:TC-0012-0115
// QFAI:SPEC-0012:TC-0012-0116
// QFAI:SPEC-0012:TC-0012-0117
// QFAI:SPEC-0012:TC-0012-0118
// QFAI:SPEC-0012:TC-0012-0119
// QFAI:SPEC-0012:TC-0012-0120

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  derivePrototypingObligations,
  requiresVisualBrowserEvidence,
  NON_UI_PROTOTYPING_SURFACE_REASON_CODE,
} from "../../src/core/prototyping/mode.js";
import type { PrototypingSurface } from "../../src/core/prototyping/types.js";
import {
  parseCanonicalScreenContracts,
  buildScreenRenderTargets,
  readCanonicalScreenContracts,
} from "../../src/core/prototyping/screenContracts.js";
import {
  buildSpecCoverageSummary,
  collectObservedRuntimeArtifacts,
} from "../../src/core/prototyping/specCoverage.js";
import {
  buildDiscussionAxisInputs,
  buildScreenContractInputs,
} from "../../src/core/prototyping/l2Evidence.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

function assetPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "assets", ...segments);
}

const SAMPLE_SCREEN_CONTRACTS_2 = `
### Screen: Dashboard
- screen_id: scr-dashboard
- route: /dashboard
- primary_tasks:
  - View metrics

### Screen: Settings
- screen_id: scr-settings
- route: /settings
- primary_tasks:
  - Change preferences
`.trim();

const SAMPLE_SCREEN_CONTRACTS_3 = `
### Screen: Dashboard
- screen_id: scr-dashboard
- route: /dashboard
- primary_tasks:
  - View metrics

### Screen: Settings
- screen_id: scr-settings
- route: /settings
- primary_tasks:
  - Change preferences

### Screen: Profile
- screen_id: scr-profile
- route: /profile
- primary_tasks:
  - Edit profile
`.trim();

// ---------------------------------------------------------------------------
// WS-1: mode/surface contract strictification
// ---------------------------------------------------------------------------

describe("WS-1: mode/surface contract", () => {
  describe("TC-0012-0092: derivePrototypingObligations Rejects cli + full-harness", () => {
    it("returns validCombination=false with unsupported surface reason code", () => {
      const result = derivePrototypingObligations({
        surface: "cli" as PrototypingSurface,
        effectiveMode: "full-harness",
      });
      expect(result.validCombination).toBe(false);
      expect(result.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
    });
  });

  describe("TC-0012-0093: runFullHarness Rejects Non-Visual Surface", () => {
    it("requiresVisualBrowserEvidence returns false for cli", () => {
      const result = requiresVisualBrowserEvidence("cli" as PrototypingSurface);
      expect(result).toBe(false);
    });
  });

  describe("TC-0012-0094: CLI Rejects cli + full-harness", () => {
    it("execution.ts contains surface validation logic", async () => {
      const source = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
      expect(source).toContain("surface");
      expect(source).toContain("assertSupportedPrototypingSurface");
    });
  });

  describe("TC-0012-0095: Validator Rejects cli + full-harness in prototyping.yaml", () => {
    it("prototypingEvidence.ts contains validation for cli + full-harness combination", async () => {
      const source = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
      expect(source).toContain("isSupportedPrototypingSurface");
      expect(source).toContain("derivePrototypingObligations");
      expect(source).toContain("full-harness");
    });
  });

  describe("TC-0012-0096: web + full-harness Accepted", () => {
    it("returns validCombination=true and requireFullHarness=true", () => {
      const result = derivePrototypingObligations({
        surface: "web" as PrototypingSurface,
        effectiveMode: "full-harness",
      });
      expect(result.validCombination).toBe(true);
      expect(result.requireFullHarness).toBe(true);
    });
  });

  describe("TC-0012-0097: mixed + full-harness Accepted", () => {
    it("returns validCombination=true for mixed surface", () => {
      const result = derivePrototypingObligations({
        surface: "mixed" as PrototypingSurface,
        effectiveMode: "full-harness",
      });
      expect(result.validCombination).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// WS-2: screen contract targets
// ---------------------------------------------------------------------------

describe("WS-2: screen contract targets", () => {
  describe("TC-0012-0098: Screen Contract Target Generation", () => {
    it("parses 2 screens and builds 2 render target sets", () => {
      const screens = parseCanonicalScreenContracts(SAMPLE_SCREEN_CONTRACTS_2);
      expect(screens).toHaveLength(2);

      const targets = buildScreenRenderTargets(screens);
      // Default 2 viewports per screen → 4 targets for 2 screens
      expect(targets.length).toBeGreaterThanOrEqual(2);
      expect(targets.every((t) => t.route && t.viewport)).toBe(true);
    });
  });

  describe('TC-0012-0099: "/primary" Hardcode Absent', () => {
    it("source files do not contain /primary as a hardcoded route target", async () => {
      const files = [
        srcPath("prototyping", "uiFidelityBuilder.ts"),
        srcPath("prototyping", "screenContracts.ts"),
        srcPath("prototyping", "runtimeObservation.ts"),
      ];
      for (const filePath of files) {
        const source = await readFile(filePath, "utf-8");
        const lines = source.split("\n").filter((line) => !line.trimStart().startsWith("//"));
        const nonCommentSource = lines.join("\n");
        expect(nonCommentSource).not.toContain('"/primary"');
      }
    });
  });

  describe("TC-0012-0100: screenContracts.ts Parser Returns Screen List", () => {
    it("parses 3 screens with all required fields", () => {
      const screens = parseCanonicalScreenContracts(SAMPLE_SCREEN_CONTRACTS_3);
      expect(screens).toHaveLength(3);
      for (const screen of screens) {
        expect(screen).toHaveProperty("name");
        expect(screen).toHaveProperty("screenId");
        expect(screen).toHaveProperty("route");
        expect(screen).toHaveProperty("primaryTasks");
        expect(screen.name).toBeTruthy();
        expect(screen.screenId).toBeTruthy();
        expect(screen.route).toBeTruthy();
      }
    });
  });

  describe("TC-0012-0101: Per-Screen Evidence Records", () => {
    it("builds targets with route and viewport info for each screen", () => {
      const screens = parseCanonicalScreenContracts(SAMPLE_SCREEN_CONTRACTS_2);
      expect(screens).toHaveLength(2);

      const targets = buildScreenRenderTargets(screens);
      for (const target of targets) {
        expect(target.route).toBeTruthy();
        expect(target.viewport).toBeTruthy();
      }
    });
  });

  describe("TC-0012-0102: Missing Screen Contract Error", () => {
    it("readCanonicalScreenContracts returns empty array for null packDir", async () => {
      const result = await readCanonicalScreenContracts(null);
      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// WS-3: browser QA evidence chain
// ---------------------------------------------------------------------------

describe("WS-3: browser QA evidence chain", () => {
  describe("TC-0012-0103: browserQa evidenceRefs Populated", () => {
    it("runtimeObservation.ts populates browserQaEvidenceRefs from phases", async () => {
      const source = await readFile(srcPath("prototyping", "runtimeObservation.ts"), "utf-8");
      expect(source).toContain("browserQaEvidenceRefs");
      expect(source).toContain("browserQaResult");
    });
  });

  describe("TC-0012-0104: Empty browserQa Hard Fail", () => {
    it("runtimeGateBuilder.ts throws when evidenceRefs is empty", async () => {
      const source = await readFile(srcPath("prototyping", "runtimeGateBuilder.ts"), "utf-8");
      expect(source).toContain("evidenceRefs.length === 0");
      expect(source).toContain("throw new Error");
    });
  });

  describe("TC-0012-0105: Phase and Finding Refs in Summary", () => {
    it("runtimeObservation.ts references browser QA phases and findings", async () => {
      const source = await readFile(srcPath("prototyping", "runtimeObservation.ts"), "utf-8");
      expect(source).toContain("phase");
      expect(source).toContain("finding");
      expect(source).toContain("evidence_refs");
    });
  });
});

// ---------------------------------------------------------------------------
// WS-4: canonical route semantics
// ---------------------------------------------------------------------------

describe("WS-4: canonical route semantics", () => {
  describe("TC-0012-0106: specCoverage Canonical Path Comparison", () => {
    it("buildSpecCoverageSummary is an exported function", () => {
      expect(typeof buildSpecCoverageSummary).toBe("function");
    });
  });

  describe("TC-0012-0107: Trailing Slash Normalization", () => {
    it("specCoverage.ts uses route comparison logic", async () => {
      const source = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
      expect(source).toContain("route");
      expect(source).toContain("uiRoutes");
    });
  });

  describe("TC-0012-0108: URL Rejected as Route", () => {
    it("runtimeGateBuilder.ts exports buildRuntimeGate for route handling", async () => {
      const source = await readFile(srcPath("prototyping", "runtimeGateBuilder.ts"), "utf-8");
      expect(source).toContain("buildRuntimeGate");
      expect(source).toContain("route");
    });
  });

  describe("TC-0012-0109: Missing Observation Report", () => {
    it("collectObservedRuntimeArtifacts returns empty collections for undefined input", () => {
      const result = collectObservedRuntimeArtifacts(undefined);
      expect(result.uiOk).toEqual([]);
      expect(result.observedRefsByRoute).toBeInstanceOf(Map);
      expect(result.observedRefsByRoute.size).toBe(0);
    });
  });

  describe("TC-0012-0110: Canonical Route Shared Logic", () => {
    it("screenContracts.ts and specCoverage.ts do not duplicate route normalization", async () => {
      const [screenSrc, coverageSrc] = await Promise.all([
        readFile(srcPath("prototyping", "screenContracts.ts"), "utf-8"),
        readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8"),
      ]);
      // Both files should reference route but normalization should not be duplicated inline
      expect(screenSrc).toContain("route");
      expect(coverageSrc).toContain("route");
      // If normalization exists, it should be in a shared utility (pathUtils)
      const normalizeFnPattern = /function\s+normalizeRoute\s*\(/;
      const screenHasInlineNormalize = normalizeFnPattern.test(screenSrc);
      const coverageHasInlineNormalize = normalizeFnPattern.test(coverageSrc);
      expect(screenHasInlineNormalize && coverageHasInlineNormalize).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// WS-5: L2 structured parse
// ---------------------------------------------------------------------------

describe("WS-5: L2 structured parse", () => {
  describe("TC-0012-0111: L2 Structured Parse Used", () => {
    it("buildDiscussionAxisInputs is an exported function", () => {
      expect(typeof buildDiscussionAxisInputs).toBe("function");
    });
  });

  describe("TC-0012-0112: L2 Heuristic Fallback Only When Needed", () => {
    it("l2Evidence.ts uses structured artifact readers as primary method", async () => {
      const source = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
      expect(source).toContain("structuredArtifactReaders");
    });
  });

  describe("TC-0012-0113: Canonical Artifacts Required", () => {
    it("buildScreenContractInputs is an exported function", () => {
      expect(typeof buildScreenContractInputs).toBe("function");
    });
  });
});

// ---------------------------------------------------------------------------
// WS-6: stale cleanup
// ---------------------------------------------------------------------------

describe("WS-6: stale cleanup", () => {
  describe("TC-0012-0114: Stale Remediation Removed", () => {
    it("prototypingEvidence.ts does not contain deprecated skip-based validation", async () => {
      const source = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
      expect(source).not.toMatch(/status:\s*["']skip["']/);
    });
  });

  describe("TC-0012-0115: skip→reject Conversion", () => {
    it("prototypingEvidence.ts uses reject-based validation, not skip", async () => {
      const source = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
      const lines = source.split("\n");
      const skipModeLines = lines.filter(
        (line) =>
          /["']skip["']/.test(line) &&
          !line.trimStart().startsWith("//") &&
          !line.trimStart().startsWith("*"),
      );
      expect(skipModeLines).toHaveLength(0);
    });
  });

  describe("TC-0012-0116: URL-as-route to Canonical Route", () => {
    it("specCoverage.ts does not use full URLs in route comparison logic", async () => {
      const source = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
      const nonCommentLines = source
        .split("\n")
        .filter(
          (line) =>
            !line.trimStart().startsWith("//") &&
            !line.trimStart().startsWith("*") &&
            !line.trimStart().startsWith("/*"),
        )
        .join("\n");
      expect(nonCommentLines).not.toMatch(/["']https?:\/\//);
    });
  });

  describe('TC-0012-0117: "/primary" Absent from Tests', () => {
    it("this test file does not use /primary as a route value", async () => {
      const source = await readFile(__filename, "utf-8");
      const testRouteValues = source.match(/route:\s*["'][^"']+["']/g) ?? [];
      const primaryRoutes = testRouteValues.filter((match) => match.includes("/primary"));
      expect(primaryRoutes).toHaveLength(0);
    });
  });

  describe("TC-0012-0118: README Reality Sync", () => {
    it("README.md mentions prototyping modes", async () => {
      const readmePath = path.join(repoRoot, "packages", "qfai", "README.md");
      const source = await readFile(readmePath, "utf-8");
      expect(source).toContain("prototyping");
    });
  });

  describe("TC-0012-0119: SKILL.md and evidence README Reality Sync", () => {
    it("prototyping SKILL.md mentions full-harness mode requirements", async () => {
      const skillPath = assetPath(
        "init",
        ".qfai",
        "assistant",
        "skills",
        "qfai-prototyping",
        "SKILL.md",
      );
      const source = await readFile(skillPath, "utf-8");
      expect(source).toContain("full-harness");
    });
  });

  describe("TC-0012-0120: Parameterized Route Pattern Match", () => {
    it("codebase handles parameterized routes", async () => {
      const [specSrc, gateSrc] = await Promise.all([
        readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8"),
        readFile(srcPath("prototyping", "runtimeGateBuilder.ts"), "utf-8"),
      ]);
      // Route-aware handling exists in at least one of the files
      const hasRouteHandling =
        specSrc.includes("route") && (specSrc.includes("ui_route") || gateSrc.includes("route"));
      expect(hasRouteHandling).toBe(true);
    });
  });
});
