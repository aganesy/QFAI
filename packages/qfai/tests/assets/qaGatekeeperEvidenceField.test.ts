import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const skillDir = path.join(
  repoRoot,
  "packages/qfai/assets/init/.qfai/assistant/skill/qfai-implement",
);

describe("qa-gatekeeper evidence in the shipped implementation skill", () => {
  it("records observations per EX and round", async () => {
    const reference = await readFile(path.join(skillDir, "references/round-evidence.md"), "utf-8");
    expect(reference).toContain("### EX-NNNN-NNNN-NN");
    expect(reference).toContain("#### Round N");
    expect(reference).toContain("RED command, RED result");
    expect(reference).toContain("GREEN command, GREEN result");
  });

  it("assigns RED and GREEN observation to the qa-gatekeeper", async () => {
    const skill = await readFile(path.join(skillDir, "SKILL.md"), "utf-8");
    expect(skill).toContain("The qa-gatekeeper checks the observed RED and GREEN evidence");
    expect(skill).toContain("Write `.qfai/evidence/implement-BF-NNNN.md`");
  });

  it("binds review verdicts to the evidence actually inspected", async () => {
    const reference = await readFile(path.join(skillDir, "references/round-evidence.md"), "utf-8");
    expect(reference).toContain(
      "Every reviewer verdict names its reviewed revision and audited evidence hash",
    );
    expect(reference).toContain(
      "A review of a changed test, implementation, fixture, or capture is repeated",
    );
  });
});
