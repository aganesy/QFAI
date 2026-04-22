import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

describe("prototyping evidence current contract", () => {
  it("validator relies on pathUtils for concrete artifact refs", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/isConcreteArtifactRef.*pathUtils/i);
    expect(src).not.toMatch(/new RegExp.*\\.qfai\//);
  });

  it("validator documents the current reviewer score schema", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("reviewerScores");
    expect(src).toContain("axisId");
    expect(src).toContain("score");
    expect(src).toContain("rationale");
    expect(src).toContain("evidenceRefs");
  });

  it("validator uses simplified runtimeGate and uiFidelity presence checks", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("runtimeGate is required in full-harness mode");
    expect(src).toContain("uiFidelity is required in full-harness mode");
    expect(src).not.toContain("browserQaEvidenceRefs");
    expect(src).not.toContain("reviewerLogs");
  });

  it("README still documents concrete evidence leaf fields used by current validators", async () => {
    const readme = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    expect(readme).toContain("axes[].evidenceRefs");
    expect(readme).toContain("reviewerLogs[].evidenceRefs");
  });

  it("validator regression tests exist for screenshot and HTML evidence artifacts", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "tests", "validators", "uiEvidenceArtifacts.test.ts"),
      "utf-8",
    );
    expect(src).toContain("validateUiEvidenceArtifacts");
    expect(src).toContain("QFAI-UIE-001");
    expect(src).toContain("QFAI-UIE-002");
  });
});
