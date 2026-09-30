import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");
const flat = (text: string): string => text.replace(/\s+/g, " ");

describe.each(trees)("%s prototyping scope floor", (tree) => {
  it("keeps the scope floor and its approved exception in Article VII", async () => {
    const constitution = await read(tree, "assistant/rule/constitution.md");
    const article = flat(
      constitution.split("## Article VII —")[1]?.split("## Article VIII —")[0] ?? "",
    );
    expect(article).toContain("### Prototyping exception (scope floor)");
    expect(article).toContain("every declared UI contract and screen in the configured story tree");
    expect(article).toContain("documented Change Request approves it");
    expect(article).toContain("The least that satisfies a requirement is the right amount");
  });

  it("has workflow cite the floor without restating a competing one", async () => {
    const workflow = await read(tree, "assistant/rule/workflow.md");
    expect(workflow).toContain(
      "Article VII § Prototyping exception (scope floor) in `.qfai/assistant/rule/constitution.md`",
    );
    expect(workflow).toContain("the constitution wins");
    expect(workflow).not.toContain("scope is fixed to");
    expect(workflow).not.toContain("ALL specs");
  });

  it("keeps the story-tree traceability floor independent of scope trimming", async () => {
    const constitution = await read(tree, "assistant/rule/constitution.md");
    const articleV = flat(
      constitution.split("## Article V —")[1]?.split("## Article VI —")[0] ?? "",
    );
    expect(articleV).toContain("business flow to its stories, acceptance criteria");
    expect(articleV).toContain("examples, tests, code, and verification evidence");
    expect(articleV).toContain("BF-*");
    expect(articleV).toContain("AC-*");
    expect(articleV).toContain("EX-*");
  });
});
