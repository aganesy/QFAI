import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");
const flat = (content: string): string => content.replace(/\s+/g, " ");

describe.each(trees)("%s ATDD obligations", (tree) => {
  it("assigns BF and AC acceptance tests to their required layers", async () => {
    const skill = await read(tree, "assistant/skill/qfai-atdd/SKILL.md");
    expect(skill).toContain("The active scope is one `BF-NNNN` business flow");
    expect(skill).toContain("`QFAI:BF-NNNN`");
    expect(skill).toContain("`QFAI:AC-NNNN-NNNN-NN`");
    expect(skill).toContain("E2E");
    expect(skill).toContain("Integration or API");
    expect(skill).toContain("An E2E test carries its flow annotation");
    expect(skill).toContain("An integration or API test carries");
  });

  it("reserves EX tests for implementation and rejects placeholder coverage", async () => {
    const skill = await read(tree, "assistant/skill/qfai-atdd/SKILL.md");
    expect(skill).toContain("`QFAI:EX-NNNN-NNNN-NN`");
    expect(skill).toContain("/qfai-implement");
    expect(flat(skill)).toContain(
      "an annotation or a generated placeholder alone never proves behavior",
    );
    expect(skill).toContain(
      "Every BF and AC obligation in scope has an executed, behavior-checking test",
    );
  });

  it("uses a named DONE decision for an exception", async () => {
    const skill = await read(tree, "assistant/skill/qfai-atdd/SKILL.md");
    expect(skill).toContain("An exception is a DONE row");
    expect(skill).toContain("naming the BF or AC");
    expect(skill).toContain("Never invent a waiver");
  });

  it("retains every story row and untested example in the coverage matrix", async () => {
    const checklist = await read(
      tree,
      "assistant/skill/qfai-atdd/references/test-case-depth-checklist.md",
    );
    expect(flat(checklist)).toContain("one row per US, AC and EX");
    expect(checklist).toContain("A BF-level E2E obligation");
    expect(checklist).toContain("EX rows remain in this flow's matrix");
    expect(checklist).toContain("does not become `✅` when a file or skeleton appears");
  });

  it("requires observed tests and flow-scoped validation before PASS", async () => {
    const skill = await read(tree, "assistant/skill/qfai-atdd/SKILL.md");
    expect(skill).toContain("qfai validate --profile atdd --flow BF-NNNN --fail-on error");
    expect(skill).toContain("Report repo-wide findings attributed to another flow");
    expect(skill).toContain("Routed reviewers and qa-gatekeeper passed");
  });
});
