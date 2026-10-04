import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

describe.each(trees)("%s — implementation stage binding", (tree) => {
  it("places implementation, acceptance tests included, before verification", async () => {
    const workflow = await read(tree, "assistant/rule/workflow.md");
    expect(workflow).toContain(
      "5. Implementation: `/qfai-implement` writes the BF E2E test and the AC",
    );
    expect(workflow).toContain("6. Verify: run quality gates");
    expect(workflow).toContain("`qfai-prototyping`, `qfai-implement`, `qfai-verify`");
  });

  it("reads the Test command from the project command contract and runs only the selected test", async () => {
    const skill = (await read(tree, "assistant/step/implement-tdd/STEP.md")).replace(/\s+/g, " ");
    expect(skill).toContain("<paths.contractsDir>/tech.md");
    expect(skill).toContain("Obtain the Test command only from that section");
    expect(skill).toContain("While implementing, run only the selected test");
  });

  it("ships the Standard commands contract the stage reads", async () => {
    const tech = await read(tree, "assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md");
    expect(tech).toContain("## Standard commands (copy-paste)");
    for (const command of ["Test:", "Lint:", "Typecheck:", "Build:"]) {
      expect(tech).toContain(command);
    }
  });

  it("binds stage steering to the shared rule and keeps upstream changes governed", async () => {
    const [skill, workflow, baseline] = await Promise.all([
      read(tree, "assistant/step/implement-tdd/STEP.md"),
      read(tree, "assistant/rule/workflow.md"),
      read(tree, "assistant/rule/shared-skill-operating-baseline.md"),
    ]);
    expect(skill).toContain("rule/shared-skill-operating-baseline.md");
    expect(skill).toContain("rule/shared-skill-delegation-baseline.md");
    expect(skill).toContain("rule/drift-protocol.md");
    expect(workflow).toContain("### Stage 0 — Steering refresh contract (mandatory)");
    expect(baseline).toContain("## Stage 0 - Steering completion refresh (mandatory)");
  });
});
