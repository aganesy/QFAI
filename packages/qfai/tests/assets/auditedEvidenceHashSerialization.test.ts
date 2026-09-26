import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const RULE = "assistant/rule/audited-evidence-hash.md";

const read = async (tree: string): Promise<string> =>
  (await readFile(path.join(repoRoot, tree, RULE), "utf-8")).replace(/\s+/g, " ");

describe("audited evidence hash for an EX round", () => {
  for (const tree of TREES) {
    it(`${tree}: identifies one example round and its phase-authored fields`, async () => {
      const text = await read(tree);
      expect(text).toContain("`### EX-NNNN-NNNN-NN` section");
      expect(text).toContain("one `#### Round N`");
      expect(text).toContain("RED or falsifiability command");
      expect(text).toContain("GREEN command");
      expect(text).toContain("refactor verification command");
      expect(text).not.toContain("TDD-ID");
      expect(text).not.toContain("test-list.md");
    });

    it(`${tree}: excludes reviewer-written fields and later rounds`, async () => {
      const text = await read(tree);
      expect(text).toContain("reviewer verdict, review pack path");
      expect(text).toContain("Do not include a later round in an earlier round's subject");
      expect(text).toContain("A REVISE and its repair use a new round");
    });

    it(`${tree}: serializes records reproducibly and includes UI captures`, async () => {
      const text = await read(tree);
      expect(text).toContain("repository-relative POSIX path, a NUL byte");
      expect(text).toContain("Sort records by path");
      expect(text).toContain("SHA-256 the resulting byte sequence");
      expect(text).toContain("every screenshot and HTML capture");
    });
  }
});
