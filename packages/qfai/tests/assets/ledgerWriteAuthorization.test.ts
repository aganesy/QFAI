import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const assetRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant",
);

async function asset(relative: string): Promise<string> {
  return readFile(path.join(assetRoot, relative), "utf-8");
}

describe("Implementation evidence ownership", () => {
  it("keeps approved story and contract changes with their upstream owner", async () => {
    const drift = await asset("rule/drift-protocol.md");
    const skill = await asset("skill/qfai-implement/SKILL.md");
    expect(drift).toContain("A downstream skill does not edit an approved specification");
    expect(drift).toContain("A new change-request row in decisions.md is permitted");
    expect(drift).toContain("TODO is not authorization");
    expect(skill).toContain("A changed upstream obligation follows");
    expect(skill).toContain("rule/drift-protocol.md");
  });

  it("puts observed EX results and review decisions in flow evidence", async () => {
    const skill = await asset("skill/qfai-implement/SKILL.md");
    expect(skill).toContain(".qfai/evidence/implement-BF-NNNN.md");
    expect(skill).toContain("Give each example its own");
    expect(skill).toContain("RED, GREEN, and Refactor commands and observed results");
    expect(skill).toContain("Each required reviewer must pass the same final revision");
  });

  it("requires an owner rerun and dependent checks after an approved change", async () => {
    const drift = await asset("rule/drift-protocol.md");
    expect(drift).toContain("Rerun the owner skill against the affected artifact");
    expect(drift).toContain("Recheck every dependent BF, AC, and EX test obligation");
    expect(drift).toContain(
      "Complete the decision row by changing Status from WIP to DONE only after",
    );
  });
});
