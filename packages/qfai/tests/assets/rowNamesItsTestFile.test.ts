import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, "assistant/skill", relative), "utf-8");
const flat = (content: string): string => content.replace(/\s+/g, " ");

describe("flow evidence identifies the test it proves", () => {
  for (const tree of trees) {
    it(`${tree}: acceptance RED records a test file and selector`, async () => {
      const guidance = await read(tree, "qfai-atdd/references/red-provenance.md");
      expect(guidance).toContain("`.qfai/evidence/atdd-BF-NNNN.md`");
      expect(guidance).toContain("Name the test file and selector");
      expect(flat(guidance)).toContain("the exact command");
      expect(flat(guidance)).toContain("manifest and hash of the test plus fixtures");
    });

    it(`${tree}: the handoff carries the same test identity into implementation`, async () => {
      const atdd = await read(tree, "qfai-atdd/SKILL.md");
      const implement = await read(tree, "qfai-implement/SKILL.md");
      expect(atdd).toContain("test paths and selectors");
      expect(implement).toContain(".qfai/evidence/atdd-BF-NNNN.md");
      expect(implement).toContain("An EX test must be collected by the runner and by validation");
    });
  }
});
