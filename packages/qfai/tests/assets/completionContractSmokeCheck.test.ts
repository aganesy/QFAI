import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");

async function read(relative: string): Promise<string> {
  return await readFile(path.join(assistant, relative), "utf8");
}

describe("completion smoke checks", () => {
  it("requires an executed PASS and treats FAIL or UNRUN as a blocker", async () => {
    const baseline = await read("rule/shared-skill-operating-baseline.md");
    expect(baseline).toContain("run the smallest applicable smoke check and report its outcome");
    expect(baseline).toContain("Only PASS satisfies this bullet");
    expect(baseline).toContain("FAIL and UNRUN are blockers");
    expect(baseline).toContain("cheapest command that executes what this stage just produced");
  });

  it("implements a current-flow checkpoint even when no EX remains", async () => {
    const implement = await read("skill/qfai-implement/SKILL.md");
    const checkpoint = await read("skill/qfai-implement/references/checkpoint-verification.md");
    expect(implement).toContain(
      "When no EX work remains at entry, still run the current flow checkpoint",
    );
    expect(checkpoint).toContain("BF");
    expect(checkpoint).toContain("source revision");
  });

  it("ATDD checks current BF tests and evidence before completion", async () => {
    const atdd = await read("skill/qfai-atdd/SKILL.md");
    expect(atdd).toContain("Every BF and AC obligation");
    expect(atdd).toContain("current, committed");
    expect(atdd).toContain("qfai validate --profile atdd --flow BF-NNNN --fail-on error");
  });

  it("configure refuses a missing or truncated test glob scan", async () => {
    const configure = await read("skill/qfai-configure/SKILL.md");
    expect(configure).toContain("npx qfai doctor --fail-on error");
    expect(configure).toContain("Require `traceability.testGlobs` to report `[ok]`");
    expect(configure).toContain(
      "exit 0 with a warning or truncated scan does not prove test discovery",
    );
  });
});
