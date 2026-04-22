import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
    expect(src).toContain("allItemsPass95");
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
      "QFAI-PROT-299",
    ]) {
      expect(src).toContain(code);
    }
  });
});
