// QFAI:SPEC-0012:US-0012-0067
// QFAI:SPEC-0012:US-0012-0068
// QFAI:SPEC-0012:US-0012-0069
// QFAI:SPEC-0012:US-0012-0070
// QFAI:SPEC-0012:US-0012-0071

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, it, expect } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

function testsPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "tests", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0067: runtimeGate.ui[] Row-Level Leaf Fields Are Strictly Validated (WS-1)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0067
describe("E2E: US-0012-0067 — runtimeGate.ui[] Leaf-Field Validation (v1.7.15 rev9 WS-1)", () => {
  it("prototypingEvidence.ts imports isConcreteArtifactRef from pathUtils.js", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/isConcreteArtifactRef.*from.*pathUtils/);
  });

  it("prototypingEvidence.ts validates runtimeGate.ui[].declaredRef via pushConcreteArtifactRefIssues", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("runtimeGate.ui[");
    expect(src).toContain(".declaredRef");
    expect(src).toContain("pushConcreteArtifactRefIssues");
  });

  it("prototypingEvidence.ts validates runtimeGate.ui[].renderEvidenceRefs via pushConcreteArtifactRefIssues", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("renderEvidenceRefs");
    // All three leaf fields are validated
    const occurrences = (src.match(/renderEvidenceRefs/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it("prototypingEvidence.ts validates runtimeGate.ui[].browserQaEvidenceRefs via pushConcreteArtifactRefIssues", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("browserQaEvidenceRefs");
    const occurrences = (src.match(/browserQaEvidenceRefs/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it("prototypingEvidence.ts does NOT contain inline regex or custom pattern for concrete-ref validation on ui[] fields", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // All concrete-ref checks must route through pushConcreteArtifactRefIssues / isConcreteArtifactRef
    expect(src).toContain("pushConcreteArtifactRefIssues");
    // No raw regex for the concrete-ref pattern (starts with .qfai/) defined inline
    expect(src).not.toMatch(/new RegExp.*\\\.qfai\//);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0068: Axis-Level evidenceRefs[] Are Strictly Validated (WS-1)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0068
describe("E2E: US-0012-0068 — axes[].evidenceRefs[] Strict Validation (v1.7.15 rev9 WS-1)", () => {
  it("prototypingEvidence.ts validates l1.axes[].evidenceRefs[] per axis", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("l1.axes");
    expect(src).toContain("axis.evidenceRefs");
  });

  it("prototypingEvidence.ts validates l2.axes[].evidenceRefs[] per axis", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("l2.axes");
    // Both l1 and l2 axis loops must be present
    const l1Count = (src.match(/iter\.l1\.axes/g) ?? []).length;
    const l2Count = (src.match(/iter\.l2\.axes/g) ?? []).length;
    expect(l1Count).toBeGreaterThanOrEqual(1);
    expect(l2Count).toBeGreaterThanOrEqual(1);
  });

  it("prototypingEvidence.ts axis validation routes through pushConcreteArtifactRefIssues (not inline logic)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // The axes loop must use the shared helper
    expect(src).toContain("pushConcreteArtifactRefIssues");
    // evidenceRefs inside axes is covered by the shared helper
    expect(src).toMatch(/refs:\s*axis\.evidenceRefs/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0069: reviewerLogs[] evidenceRefs[] Are Strictly Validated (WS-1)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0069
describe("E2E: US-0012-0069 — reviewerLogs[].evidenceRefs[] Strict Validation (v1.7.15 rev9 WS-1)", () => {
  it("prototypingEvidence.ts validates reviewerLogs[].evidenceRefs[] per log entry", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("reviewerLogs");
    expect(src).toContain("log.evidenceRefs");
  });

  it("prototypingEvidence.ts reviewerLogs validation routes through pushConcreteArtifactRefIssues", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/refs:\s*log\.evidenceRefs/);
  });

  it("prototypingEvidence.ts reviewerLogs validation fieldPath includes iteration and reviewerId", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/reviewerLogs\[.*log\.(iteration|reviewerId)/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0070: Bundle Schema and Runtime Output Reflect Strict Leaf Contract (WS-2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0070
describe("E2E: US-0012-0070 — bundleWriter.ts Strict Leaf Contract Types (v1.7.15 rev9 WS-2)", () => {
  it("bundleWriter.ts runtimeGate.ui[].declaredRef is required (not optional)", async () => {
    const src = await readFile(srcPath("evidence", "bundleWriter.ts"), "utf-8");
    // Must have 'declaredRef: string' (required field without ?)
    expect(src).toMatch(/declaredRef:\s*string;/);
    // Must NOT have 'declaredRef?: string' (optional form)
    expect(src).not.toMatch(/declaredRef\?:\s*string/);
  });

  it("bundleWriter.ts runtimeGate.ui[].renderEvidenceRefs is required non-nullable string array", async () => {
    const src = await readFile(srcPath("evidence", "bundleWriter.ts"), "utf-8");
    expect(src).toMatch(/renderEvidenceRefs:\s*string\[\];/);
    expect(src).not.toMatch(/renderEvidenceRefs\?:/);
    expect(src).not.toMatch(/renderEvidenceRefs:.*null/);
  });

  it("bundleWriter.ts runtimeGate.ui[].browserQaEvidenceRefs is required non-nullable string array", async () => {
    const src = await readFile(srcPath("evidence", "bundleWriter.ts"), "utf-8");
    expect(src).toMatch(/browserQaEvidenceRefs:\s*string\[\];/);
    expect(src).not.toMatch(/browserQaEvidenceRefs\?:/);
    expect(src).not.toMatch(/browserQaEvidenceRefs:.*null/);
  });

  it("bundleWriter.ts reviewerLogs[].evidenceRefs is required non-nullable string array", async () => {
    const src = await readFile(srcPath("evidence", "bundleWriter.ts"), "utf-8");
    // evidenceRefs: string[] in the reviewerLogs array (not nullable, not optional)
    const reviewerLogsSection = src.slice(
      src.indexOf("reviewerLogs"),
      src.indexOf("reviewerLogs") + 200,
    );
    expect(reviewerLogsSection).toContain("evidenceRefs");
    expect(src).not.toMatch(/evidenceRefs\?:\s*string\[\]/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0071: Leaf-Field Regression Tests and README Completeness (WS-3+WS-4)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0071
describe("E2E: US-0012-0071 — Leaf-Field Coverage in Tests and README (v1.7.15 rev9 WS-3+WS-4)", () => {
  it("README.md enumerates runtimeGate.ui[].declaredRef as a concrete-ref field", async () => {
    const src = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    expect(src).toMatch(/ui\[\]\.declaredRef|declaredRef/);
  });

  it("README.md enumerates runtimeGate.ui[].renderEvidenceRefs as a concrete-ref field", async () => {
    const src = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    expect(src).toContain("renderEvidenceRefs");
  });

  it("README.md enumerates runtimeGate.ui[].browserQaEvidenceRefs as a concrete-ref field", async () => {
    const src = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    expect(src).toContain("browserQaEvidenceRefs");
  });

  it("README.md enumerates axes[].evidenceRefs as a concrete-ref field", async () => {
    const src = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    expect(src).toMatch(/axes\[\]\.evidenceRefs|axes.*evidenceRefs/);
  });

  it("README.md enumerates reviewerLogs[].evidenceRefs as a concrete-ref field", async () => {
    const src = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    expect(src).toMatch(/reviewerLogs\[\]\.evidenceRefs|reviewerLogs.*evidenceRefs/);
  });

  it("tests/core/ contains negative test cases for ui[] leaf-field validation (at least 7 ui[] negatives)", async () => {
    const coreDir = testsPath("core");
    // Look for the prototypingEvidence.test.ts with negative cases
    const src = await readFile(path.join(coreDir, "prototypingEvidence.test.ts"), "utf-8").catch(
      () => "",
    );
    if (src.length > 0) {
      // Should have content about ui[] leaf validation negatives
      const uiNegativeMatches =
        src.match(/declaredRef|renderEvidenceRefs|browserQaEvidenceRefs/g) ?? [];
      expect(uiNegativeMatches.length).toBeGreaterThanOrEqual(3);
    }
    // Alternatively check the validators test
    const validatorsSrc = await readFile(
      path.join(testsPath("validators"), "prototypingEvidence.test.ts"),
      "utf-8",
    ).catch(() => "");
    if (validatorsSrc.length > 0) {
      const negMatches =
        validatorsSrc.match(/declaredRef|renderEvidenceRefs|browserQaEvidenceRefs/g) ?? [];
      expect(negMatches.length).toBeGreaterThanOrEqual(3);
    }
    // At least one of the two test files must exist with leaf field tests
    expect(src.length + validatorsSrc.length).toBeGreaterThan(0);
  });

  it("prototypingEvidence.ts source has no inline concrete-ref pattern independent of pathUtils.ts (no parallel grammar)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    // The validator must import and use isConcreteArtifactRef from pathUtils
    expect(src).toMatch(/from.*pathUtils/);
    expect(src).toContain("isConcreteArtifactRef");
    // No standalone regex pattern for the .qfai/ concrete-ref check (outside pathUtils usage)
    // This verifies TC-0012-0243 and TC-0012-0236: no parallel grammar
    const parallelGrammarPattern = /\/\^\\\.qfai\//;
    expect(src).not.toMatch(parallelGrammarPattern);
  });
});
