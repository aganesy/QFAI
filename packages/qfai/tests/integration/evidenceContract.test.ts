import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const skillDir = path.join(getInitAssetsDir(), ".qfai", "assistant", "skill", "qfai-implement");

async function readSkill(): Promise<string> {
  return readFile(path.join(skillDir, "SKILL.md"), "utf-8");
}

async function readReference(name: string): Promise<string> {
  return readFile(path.join(skillDir, "references", name), "utf-8");
}

describe("implementation evidence contract", () => {
  it("records each EX and each review round with exact test and phase observations", async () => {
    const [skill, round] = await Promise.all([readSkill(), readReference("round-evidence.md")]);
    expect(skill).toContain(".qfai/evidence/implement-BF-NNNN.md");
    expect(skill).toContain("### EX-NNNN-NNNN-NN");
    expect(round).toContain("#### Round N");
    expect(round).toMatch(/exact test selector and test file/);
    for (const field of [
      "RED command",
      "RED result",
      "GREEN command",
      "GREEN result",
      "Refactor verify revision",
      "Review pack seal",
      "reviewer verdict",
    ]) {
      expect(round).toContain(field);
    }
  });

  it("does not accept an unevidenced status or reasoning as proof of a gate", async () => {
    const skill = await readSkill();
    expect(skill).toMatch(/Evidence without a command and result pair does not prove a\s+gate/);
    expect(skill).toMatch(/A failing or unrun gate cannot be reported as PASS/);
    expect(skill).toMatch(/Every implemented EX has an observed RED, GREEN and Refactor result/);
  });

  it("preserves command output verbatim, including multiline output", async () => {
    const round = await readReference("round-evidence.md");
    expect(round).toMatch(/value containing several lines belongs in a fenced block/);
    expect(round).toMatch(/Preserve the command and output verbatim/);
    expect(round).toMatch(/fence must be longer than any fence printed by the command output/);
  });

  it("ties observations and verdicts to the source revision and sealed review pack", async () => {
    const [round, revision] = await Promise.all([
      readReference("round-evidence.md"),
      readReference("evidence-revision.md"),
    ]);
    expect(round).toMatch(
      /Every reviewer verdict names its reviewed revision and audited evidence hash/,
    );
    expect(round).toMatch(
      /review of a changed test, implementation, fixture, or capture is repeated/,
    );
    expect(revision).toMatch(/Do not use a timestamp as a revision/);
    expect(revision).toMatch(
      /A verdict is stale when the state it claims to have reviewed differs/,
    );
    expect(revision).toMatch(/Recompute every recorded seal when the pack is present/);
  });
});
