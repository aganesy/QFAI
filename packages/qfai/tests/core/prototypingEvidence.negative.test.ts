/**
 * Core meta-tests verifying absence of synthetic tokens in core test fixtures
 * and presence of required negative test cases.
 * TC-0012-0238, TC-0012-0239, TC-0012-0241, TC-0012-0248 (v1.7.15 rev9 WS-3/WS-4)
 *
 * Backfill TDD: exception pattern sanctioned by DR-0012-0052.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { glob } from "fast-glob";

const pkgRoot = path.resolve(import.meta.dirname, "../..");

function coreTestsDir(): string {
  return path.join(pkgRoot, "tests", "core");
}

function unitValidatorsDir(): string {
  return path.join(pkgRoot, "tests", "unit", "validators");
}

function readmePath(): string {
  return path.join(pkgRoot, "README.md");
}

describe("TC-0012-0238..0248: negative case meta-tests (v1.7.15 rev9)", () => {
  // QFAI:SPEC-0012:TC-0012-0238
  it("TC-0012-0238: tests/core/ fixtures have zero synthetic token evidenceRefs (boundary)", async () => {
    const allFiles = await glob("**/*.ts", { cwd: coreTestsDir(), absolute: true });
    // Exclude files that intentionally test negative/invalid patterns
    const files = allFiles.filter(
      (f) =>
        !f.includes("prototypingEvidence.test.ts") &&
        !f.includes("prototypingEvidence.negative.test.ts"),
    );
    const syntheticPatterns = [
      /evidenceRefs[^}]*"a"/,
      /evidenceRefs[^}]*"b"/,
      /evidenceRefs[^}]*"reviewer:1"/,
    ];
    for (const file of files) {
      const src = await readFile(file, "utf-8");
      for (const pattern of syntheticPatterns) {
        expect(
          src,
          `${path.basename(file)} must not contain synthetic token in evidenceRefs`,
        ).not.toMatch(pattern);
      }
    }
  });

  // QFAI:SPEC-0012:TC-0012-0239
  it("TC-0012-0239: all 15 leaf-field negative cases exist in prototypingEvidence.test.ts", async () => {
    const testFile = path.join(unitValidatorsDir(), "prototypingEvidence.test.ts");
    const src = await readFile(testFile, "utf-8");
    // Count tests asserting PROT-318 in the rev9 describe block
    const prot318Assertions = (src.match(/hasCode\(issues, "QFAI-PROT-318"\)/g) ?? []).length;
    // There should be at least 15 negative cases (8 ui + 5 axis + 3 reviewer + optional boundary)
    expect(prot318Assertions).toBeGreaterThanOrEqual(15);
  });

  // QFAI:SPEC-0012:TC-0012-0241
  it("TC-0012-0241: README.md enumerates all concrete-ref leaf fields (normal path)", async () => {
    const src = await readFile(readmePath(), "utf-8");
    // All 5 leaf-field categories must be documented
    expect(src).toContain("ui[].declaredRef");
    expect(src).toContain("ui[].renderEvidenceRefs");
    expect(src).toContain("ui[].browserQaEvidenceRefs");
    expect(src).toContain("axes[].evidenceRefs");
    expect(src).toContain("reviewerLogs[].evidenceRefs");
  });

  // QFAI:SPEC-0012:TC-0012-0248
  it("TC-0012-0248: all 7 ui[] leaf-field negative cases present in prototypingEvidence.test.ts", async () => {
    const testFile = path.join(unitValidatorsDir(), "prototypingEvidence.test.ts");
    const src = await readFile(testFile, "utf-8");
    // Verify each of the 7 ui[] negative case test selectors is present
    const uiNegativeSelectors = [
      "TC-0012-0219", // declaredRef absent
      "TC-0012-0220", // declaredRef absolute path
      "TC-0012-0221", // declaredRef self-ref
      "TC-0012-0222", // renderEvidenceRefs empty
      "TC-0012-0223", // renderEvidenceRefs synthetic
      "TC-0012-0224", // browserQaEvidenceRefs absent or empty
      "TC-0012-0226", // browserQaEvidenceRefs windows separator
    ];
    for (const selector of uiNegativeSelectors) {
      expect(src, `${selector} must be present in prototypingEvidence.test.ts`).toContain(selector);
    }
  });
});
