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
    const step = await read(tree, "assistant/step/atdd-author/STEP.md");
    expect(skill).toContain("The active scope is one `BF-NNNN` business flow");
    expect(step).toContain("`QFAI:BF-NNNN`");
    expect(step).toContain("`QFAI:AC-NNNN-NNNN-NN`");
    expect(step).toContain("E2E");
    expect(step).toContain("Integration or API");
    expect(step).toContain("An E2E test carries its flow annotation");
    expect(step).toContain("An integration or API test carries");
  });

  it("reserves EX tests for implementation and rejects placeholder coverage", async () => {
    const step = await read(tree, "assistant/step/atdd-author/STEP.md");
    expect(step).toContain("`QFAI:EX-NNNN-NNNN-NN`");
    expect(step).toContain("/qfai-implement");
    expect(flat(step)).toContain(
      "an annotation or a generated placeholder alone never proves behavior",
    );
    expect(step).toContain(
      "Every BF and AC obligation in scope has an executed, behavior-checking test",
    );
  });

  it("uses a named DONE decision for an exception", async () => {
    const step = await read(tree, "assistant/step/atdd-author/STEP.md");
    expect(step).toContain("An exception is a DONE row");
    expect(step).toContain("naming the BF or AC");
    expect(step).toContain("Never invent a waiver");
  });

  it("requires observed tests and flow-scoped validation before PASS", async () => {
    const step = await read(tree, "assistant/step/atdd-author/STEP.md");
    expect(step).toContain("qfai validate --profile atdd --flow BF-NNNN --fail-on error");
    expect(step).toContain("Report repo-wide findings attributed to another flow");
    expect(step).toContain("Routed reviewers and qa-gatekeeper passed");
  });
});
