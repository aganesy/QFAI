import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");

describe.each(trees)("%s oracle strength", (tree) => {
  it("requires an example assertion that fails for the owned behavior", async () => {
    const skill = await read(tree, "assistant/step/implement-tdd/STEP.md");
    const proof = await read(tree, "assistant/skill/qfai-implement/references/oracle-strength.md");
    expect(skill.replace(/\s+/g, " ")).toContain("a falsifiable assertion");
    expect(proof).toContain("smallest valid change to the owned predicate");
    expect(proof).toContain("Run the same selector and record its failing assertion output");
    expect(proof).toContain("Restore the predicate immediately");
  });

  it("rejects load errors and unrelated mutations as oracle proof", async () => {
    const proof = await read(tree, "assistant/skill/qfai-implement/references/oracle-strength.md");
    expect(proof).toContain("A missing import, syntax error, fixture failure");
    expect(proof).toContain("does not prove the oracle");
    expect(proof).toContain("A mutation in an unrelated helper");
    expect(proof).toContain("expected values computed by the same helper");
    expect(proof).toContain("assertions on a mock's own input");
  });

  it("attributes a proof to one example and routes a shared boundary", async () => {
    const proof = await read(tree, "assistant/skill/qfai-implement/references/oracle-strength.md");
    expect(proof).toContain("A proof belongs to one example.");
    expect(proof).toContain("also fails a test annotated with another EX");
    expect(proof).toContain("narrow one test to its own boundary");
  });

  it("reuses an observed falsifiability run and routes contract gaps", async () => {
    const proof = await read(tree, "assistant/skill/qfai-implement/references/oracle-strength.md");
    expect(proof).toContain("already supplies this proof");
    expect(proof).toContain("Reuse that run instead of mutating twice");
    expect(proof).toContain("equivalent-mutant");
    expect(proof).toContain("Do not strengthen the requirement");
  });
});
