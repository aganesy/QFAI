import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const assistantDir = path.join(packageRoot, "assets/init/.qfai/assistant");

describe("implement skill flow and example contract", () => {
  it("selects the lowest EX from a fresh validator result", async () => {
    const content = await readImplementFlowSteps(assistantDir);
    expect(content).toContain("qfai validate --profile tdd --flow BF-NNNN");
    expect(content).toContain("validate.flow-<ids>.json");
    expect(content).toContain("generatedAt");
    expect(content).toContain("profile");
    expect(content).toContain("test-obligation EX findings");
    expect(content).toContain("lowest EX ID");
    expect(content).toMatch(/even when the command exits\s+nonzero/);
  });

  it("keeps commands in the tech contract and works one EX through the TDD cycle", async () => {
    const content = await readImplementFlowSteps(assistantDir);
    expect(content).toContain("<paths.contractsDir>/tech.md");
    expect(content).toContain("**Standard commands**");
    expect(content).toContain("Test, Lint, Typecheck, and Build");
    expect(content).toContain("**Red:**");
    expect(content).toContain("**Green:**");
    expect(content).toContain("**Refactor:**");
    expect(content).toContain("QFAI:EX-NNNN-NNNN-NN");
    expect(content).toContain("minimum production code");
  });

  it("requires current evidence and independent reviewers", async () => {
    const content = await readImplementFlowSteps(assistantDir);
    expect(content).toContain("The stage report gives each example its own");
    expect(content).toContain("### EX-NNNN-NNNN-NN");
    expect(content).toContain("The author does not certify their own result");
  });
});
