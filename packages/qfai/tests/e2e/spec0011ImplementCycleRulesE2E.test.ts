/** The shipped implementation workflow is the observable contract for this skill. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const skillDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant/skill/qfai-implement",
);

async function skill(): Promise<string> {
  return readFile(path.join(skillDir, "SKILL.md"), "utf-8");
}

async function reference(name: string): Promise<string> {
  return readFile(path.join(skillDir, "references", name), "utf-8");
}

// QFAI:BF-0001
describe("E2E: implementation follows flow-scoped example obligations", () => {
  it("selects the lowest owed EX from a fresh validator result", async () => {
    const content = await skill();
    expect(content).toContain("qfai validate --profile tdd --flow BF-NNNN");
    expect(content).toContain("generatedAt");
    expect(content).toContain("lowest EX ID");
    expect(content).toContain("test-obligation EX findings");
    expect(content).toContain("Re-run validation before selecting the next unassigned EX");
  });

  it("runs one falsifiable RED, GREEN and Refactor cycle per EX", async () => {
    const content = await skill();
    expect(content).toContain("### Red, Green, Refactor");
    expect(content).toContain("A load error, missing dependency, or broken fixture is");
    expect(content).toContain("qa-gatekeeper checks the observed RED and GREEN evidence");
    expect(content).toContain("QFAI:EX-NNNN-NNNN-NN");
  });

  it("binds independent review to the same final evidence revision", async () => {
    const content = await skill();
    expect(content).toContain(".qfai/evidence/implement-BF-NNNN.md");
    expect(content).toContain("Each required reviewer must pass the same final revision");
    expect(content).toContain("reviewer verdicts, and open findings");
  });

  it("requires a final scoped gate even when no EX work remains", async () => {
    const content = await skill();
    expect(content).toContain("qfai validate --profile tdd --fail-on error --flow BF-NNNN");
    expect(content).toContain(
      "When no EX work remains at entry, still run the current flow checkpoint",
    );
  });

  it("bounds parallel work by ownership and integration", async () => {
    const content = await skill();
    const policy = await reference("parallelization-policy.md");
    expect(content).toContain("Work one EX at a time by default");
    expect(content).toMatch(/disjoint\s+writes, a passing technical gate/);
    expect(content).toContain("Review the integrated result after slices join");
    expect(policy).toContain("explicit user approval");
  });
});
