import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const REFERENCES = [
  "assistant/rule/constitution.md",
  "assistant/skill/qfai-configure/SKILL.md",
  "assistant/skill/qfai-verify/references/articles.md",
];

// The three readers must use the same story-tree obligations.
describe("story-tree traceability by test layer", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Article V specifies the annotation and layer for each obligation`, async () => {
      const constitution = await read(tree, REFERENCES[0] ?? "");
      const article = constitution.slice(
        constitution.indexOf("## Article V "),
        constitution.indexOf("## Article VI "),
      );
      expect(article).toContain("`BF-*` requires a `QFAI:BF-NNNN` annotation in an E2E test");
      expect(article).toContain(
        "`AC-*` requires a `QFAI:AC-NNNN-NNNN-NN` annotation in an integration or API test",
      );
      expect(article).toContain(
        "`EX-*` requires a `QFAI:EX-NNNN-NNNN-NN` annotation in a selected non-E2E test file",
      );
      expect(article).toContain(".qfai/spec/decisions.md");
      expect(article).not.toContain("TC-*");
      expect(article).not.toContain("test-list.md");
    });

    for (const rel of REFERENCES.slice(1)) {
      it(`${tree}: ${rel} repeats the BF, AC, and EX layer mapping`, async () => {
        const content = await read(tree, rel);
        expect(content).toContain("BF");
        expect(content).toContain("E2E");
        expect(content).toContain("AC");
        expect(content).toContain("integration or API");
        expect(content).toContain("EX");
        expect(content).not.toContain(".qfai/specs/");
        expect(content).not.toContain("test-list.md");
      });
    }
  }
});
