/** The shipped implementation steps are the observable contract for this skill. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const skillDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant/skill/qfai-implement",
);

async function skill(): Promise<string> {
  return readImplementFlowSteps(path.resolve(skillDir, "../.."));
}

async function reference(name: string): Promise<string> {
  return readFile(path.join(skillDir, "references", name), "utf-8");
}

// QFAI:BF-0001
describe("E2E: implementation follows flow-scoped example obligations", () => {
  it("selects the examples no test annotates, in EX ID order", async () => {
    const content = await skill();
    expect(content).toContain(
      "Otherwise take the flow's EX IDs that no test annotates, in EX ID order",
    );
  });

  it("runs one falsifiable RED, GREEN and Refactor cycle per EX", async () => {
    const content = await skill();
    expect(content).toContain("## Red, Green, Refactor");
    expect(content).toContain("A load error, missing dependency, or broken fixture is");
    expect(content).toContain("QFAI:EX-NNNN-NNNN-NN");
  });

  it("bounds parallel work by ownership and integration", async () => {
    const content = await skill();
    const policy = await reference("parallelization-policy.md");
    expect(content).toContain("Work one EX at a time by default");
    expect(content).toMatch(/disjoint\s+writes, a passing technical gate/);
    expect(content).toMatch(/Review the\s+integrated result after slices join/);
    expect(policy).toContain("explicit user approval");
  });
});
