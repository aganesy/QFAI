import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const assistantDir = path.join(packageRoot, "assets/init/.qfai/assistant");

describe("implement skill flow and example contract", () => {
  it("selects the examples no test annotates, in EX ID order", async () => {
    const content = await readImplementFlowSteps(assistantDir);
    expect(content).toMatch(/the flow's EX IDs that no test annotates, in EX ID order/);
  });

  it("keeps commands in the tech contract and works one EX through the TDD cycle", async () => {
    const content = await readImplementFlowSteps(assistantDir);
    expect(content).toContain("<paths.contractsDir>/tech.md");
    expect(content).toContain("**Standard commands**");
    expect(content).toContain("Obtain the Test command only from that section");
    expect(content).toContain("**Red:**");
    expect(content).toContain("**Green:**");
    expect(content).toContain("**Refactor:**");
    expect(content).toContain("QFAI:EX-NNNN-NNNN-NN");
    expect(content).toContain("minimum production code");
  });

  it("requires current evidence for each example", async () => {
    const content = await readImplementFlowSteps(assistantDir);
    expect(content).toContain("The stage report gives each example its own");
    expect(content).toContain("### EX-NNNN-NNNN-NN");
  });
});
