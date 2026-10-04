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

  it("acceptance tests check every body before completion", async () => {
    const acceptance = await read("step/implement-acceptance/STEP.md");
    expect(acceptance).toContain("PASS when every test in scope has a body");
    expect(acceptance).toContain("qfai validate --profile atdd --flow BF-NNNN --fail-on error");
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
