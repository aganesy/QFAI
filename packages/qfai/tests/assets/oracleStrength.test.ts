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
    const skill = await read(tree, "assistant/skill/qfai-implement/SKILL.md");
    const proof = await read(tree, "assistant/skill/qfai-implement/references/oracle-strength.md");
    expect(skill).toContain("a falsifiable assertion");
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

  it("reuses an observed falsifiability run and routes contract gaps", async () => {
    const proof = await read(tree, "assistant/skill/qfai-implement/references/oracle-strength.md");
    expect(proof).toContain("already supplies this proof");
    expect(proof).toContain("Reuse that run instead of mutating twice");
    expect(proof).toContain("equivalent-mutant");
    expect(proof).toContain("Do not strengthen the requirement");
  });

  it("makes the gatekeeper check the RED and GREEN evidence", async () => {
    const card = await read(tree, "assistant/agent/qa-gatekeeper.md");
    expect(card).toContain("## RED and GREEN observation gate");
    expect(card).toContain("controlled falsifiability check");
    expect(card).toContain("A syntax error, deleted export or throw");
    expect(card).toContain("GREEN needs the same selected test");
    expect(card.replace(/\s+/g, " ")).toContain(
      "Return REVISE for an unexplained required gap or weak oracle",
    );
  });
});
