import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const shipped = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skill");

async function readSkill(name: string): Promise<string> {
  return await readFile(path.join(shipped, name, "SKILL.md"), "utf8");
}

describe("flow-scoped acceptance and implementation gates", () => {
  it("ATDD validates the selected BF and records sibling findings with owners", async () => {
    const content = await readSkill("qfai-atdd");
    expect(content).toContain("qfai validate --profile atdd --flow BF-NNNN --fail-on error");
    expect(content).toContain("Report repo-wide findings attributed to another flow");
    expect(content).toMatch(/no\s+error owned by this flow/);
  });

  it("implement reads fresh flow JSON even when validation exits nonzero", async () => {
    const content = await readSkill("qfai-implement");
    expect(content).toContain("qfai validate --profile tdd --flow BF-NNNN");
    expect(content).toContain("validate.flow-<ids>.json");
    expect(content).toMatch(/even when the command exits\s+nonzero/);
    expect(content).toContain("generatedAt");
    expect(content).toContain("no earlier than this run start");
    expect(content).toContain("profile");
    expect(content).toContain("tdd");
  });

  it("implement makes an explicit failure when the JSON result cannot be trusted", async () => {
    const content = await readSkill("qfai-implement");
    expect(content).toContain("If any check");
    expect(content).toMatch(/fails, stop and report the command/);
    expect(content).toContain("never infer that the flow has no remaining work");
  });

  it("implement completes with a final flow gate", async () => {
    const content = await readSkill("qfai-implement");
    expect(content).toContain("qfai validate --profile tdd --fail-on error --flow BF-NNNN");
    expect(content).toContain(
      "When no EX work remains at entry, still run the current flow checkpoint",
    );
  });
});
