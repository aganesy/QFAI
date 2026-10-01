import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("clarification and approval remain separate", () => {
  for (const tree of trees) {
    it(`${tree}: approval questions do not consume clarification budget`, async () => {
      const constitution = await read(tree, "assistant/rule/constitution.md");
      const triage = await read(tree, "assistant/skill/qfai-sdd/references/sdd-triage.md");
      expect(constitution).toContain("Article VI — Clarification budget");
      expect(triage).toContain("Approval questions are decisions");
      expect(triage).toContain("do not consume that clarification budget");
      expect(triage).toContain("A pre-triage answer to continue is not approval");
    });

    it(`${tree}: the next-action question does not consume clarification budget`, async () => {
      // It ends a turn that waits on the user and resolves no ambiguity, so an
      // exhausted budget would otherwise leave that turn ending on a report.
      const constitution = (await read(tree, "assistant/rule/constitution.md")).replace(
        /\s+/g,
        " ",
      );
      const exempt = constitution.slice(
        constitution.indexOf("### What does not count"),
        constitution.indexOf("Stop conditions:"),
      );
      expect(exempt).toContain("**The next-action question is exempt.**");
      expect(exempt).toContain("resolves no ambiguity, so it is not a clarification");
      expect(exempt).toContain("still put after the budget is exhausted");
    });
  }
});
