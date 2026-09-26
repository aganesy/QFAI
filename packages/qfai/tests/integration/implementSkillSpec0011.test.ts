import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillPath = path.join(
  packageRoot,
  "assets/init/.qfai/assistant/skill/qfai-implement/SKILL.md",
);

describe("implement skill flow and example contract", () => {
  it("selects the lowest EX from a fresh validator result", async () => {
    const content = await readFile(skillPath, "utf8");
    expect(content).toContain("qfai validate --profile tdd --flow BF-NNNN");
    expect(content).toContain("validate.flow-<ids>.json");
    expect(content).toContain("generatedAt");
    expect(content).toContain("profile");
    expect(content).toContain("test-obligation EX findings");
    expect(content).toContain("lowest EX ID");
    expect(content).toMatch(/even when the command exits\s+nonzero/);
  });

  it("keeps commands in the tech contract and works one EX through the TDD cycle", async () => {
    const content = await readFile(skillPath, "utf8");
    expect(content).toContain("<paths.contractsDir>/tech.md");
    expect(content).toContain("**Standard commands**");
    expect(content).toContain("Test, Lint, Typecheck, and Build");
    expect(content).toContain("**Red:**");
    expect(content).toContain("**Green:**");
    expect(content).toContain("**Refactor:**");
    expect(content).toContain("QFAI:EX-NNNN-NNNN-NN");
    expect(content).toContain("minimum production code");
  });

  it("requires current evidence, independent reviewers and a final flow gate", async () => {
    const content = await readFile(skillPath, "utf8");
    expect(content).toContain(".qfai/evidence/implement-BF-NNNN.md");
    expect(content).toContain("### EX-NNNN-NNNN-NN");
    expect(content).toContain("The author does not certify their own result");
    expect(content).toContain("qfai validate --profile tdd --fail-on error --flow BF-NNNN");
    expect(content).toMatch(
      /When no EX work remains at entry, still run the current flow checkpoint/,
    );
  });
});
