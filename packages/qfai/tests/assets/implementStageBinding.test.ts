import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

describe.each(trees)("%s — implementation stage binding", (tree) => {
  it("places implementation between acceptance tests and verification", async () => {
    const workflow = await read(tree, "assistant/rule/workflow.md");
    expect(workflow).toContain("5. Acceptance tests (ATDD)");
    expect(workflow).toContain("6. Implementation: `/qfai-implement`");
    expect(workflow).toContain("7. Verify: run quality gates");
    expect(workflow).toContain("`qfai-atdd`, `qfai-implement`, `qfai-verify`");
  });

  it("requires a fresh story obligation and the project command contract", async () => {
    const skill = await read(tree, "assistant/skill/qfai-implement/SKILL.md");
    expect(skill).toContain("qfai validate --profile tdd --flow BF-NNNN");
    expect(skill).toContain("generatedAt");
    expect(skill).toContain("no earlier than this run start");
    expect(skill).toContain("<paths.contractsDir>/tech.md");
    for (const command of ["Test", "Lint", "Typecheck", "Build"]) {
      expect(skill).toContain(command);
    }
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
      read(tree, "assistant/skill/qfai-implement/SKILL.md"),
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
