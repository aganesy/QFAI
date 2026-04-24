import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

// QFAI:SPEC-0012:TC-0012-0314
// QFAI:SPEC-0012:TC-0012-0315
// QFAI:SPEC-0012:TC-0012-0316
const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

describe("prototyping evidence integration wiring", () => {
  it("prototypingEvidence.ts uses the simplified mode block and iterations schema", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("mode?:");
    expect(src).toContain("requested?: unknown");
    expect(src).toContain("effective?: unknown");
    expect(src).toContain("iterations?: unknown");
    expect(src).toContain("reviewerScores");
    expect(src).toContain("allReviewerAxesPerfect100");
  });

  it("prototypingEvidence.ts validates concrete artifact refs through pathUtils", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/isConcreteArtifactRef.*pathUtils/i);
    expect(src).toContain("evidenceRefs must contain concrete artifact refs");
  });

  it("runtime observation and spec coverage helpers keep canonical evidence references", async () => {
    const runtimeSrc = await readFile(srcPath("evidence", "runtimeObservation.ts"), "utf-8");
    const coverageSrc = await readFile(srcPath("evidence", "specCoverage.ts"), "utf-8");
    expect(runtimeSrc).toContain("renderEvidenceRefs");
    expect(runtimeSrc).toMatch(/render/i);
    expect(coverageSrc).toContain("assertConcreteArtifactRef");
  });

  it("screen contract and ref semantics helpers live at their current canonical paths", async () => {
    const screenContractSrc = await readFile(srcPath("contracts", "screenContracts.ts"), "utf-8");
    const refSemanticsSrc = await readFile(srcPath("refs", "refSemantics.ts"), "utf-8");
    expect(screenContractSrc).toContain("sourceRef");
    expect(refSemanticsSrc).toContain("assertConcreteArtifactRefs");
    expect(refSemanticsSrc).toContain("assertConcreteArtifactRef");
  });

  it("prototypingEvidence.ts exposes the current issue code set", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    for (const code of [
      "QFAI-PROT-150",
      "QFAI-PROT-151",
      "QFAI-PROT-152",
      "QFAI-PROT-280",
      "QFAI-PROT-281",
      "QFAI-PROT-282",
      "QFAI-PROT-285",
      "QFAI-PROT-286",
      "QFAI-PROT-287",
      "QFAI-PROT-288",
      "QFAI-PROT-289",
      "QFAI-PROT-299",
    ]) {
      expect(src).toContain(code);
    }
  });

  it("prototypingEvidence.ts keeps the perfect-100 completion contract explicit", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("allReviewerAxesPerfect100");
    expect(src).toContain("allReviewerScoresArePerfect100");
    expect(src).toContain("completionCertificate");
    expect(src).toContain("postSelectionPolishCount");
  });

  it("discussion pack side artifact type stays derived from the SSOT const tuple", async () => {
    const src = await readFile(srcPath("discussionPack.ts"), "utf-8");
    expect(src).toContain("REQUIRED_DISCUSSION_PACK_SIDE_ARTIFACTS");
    expect(src).toContain("(typeof REQUIRED_DISCUSSION_PACK_SIDE_ARTIFACTS)[number]");
  });

  it("validate.ts keeps PROT-150/151/152 expected text aligned with current validator semantics", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain(
      '"QFAI-PROT-150": "prototyping.json exists at the canonical evidence path for UI prototyping."',
    );
    expect(src).toContain('"QFAI-PROT-151": "surface must be one of web|mobile|desktop|mixed."');
    expect(src).toContain(
      '"QFAI-PROT-152":\n    "mode.requested/mode.effective/mode.source/mode.rationale must follow the current prototyping evidence schema."',
    );
  });

  it("core/index.ts keeps non-runtime harness helpers on the package root export", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    for (const exportName of [
      "loadHistory",
      "appendIteration",
      "computeTerminationReason",
      "validateReviewer",
      "resolveCommitSha",
      "REVIEWER_PLACEHOLDERS",
      "FullHarnessHistory",
      "MeasurementInput",
    ]) {
      expect(src).toContain(exportName);
    }
  });
});
