import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("stack-neutral quality rule", () => {
  for (const tree of TREES) {
    it(`${tree}: declares capabilities and the project command home`, async () => {
      const quality = await read(tree, "assistant/rule/quality.md");
      const normative = quality.replace(/<!--[\s\S]*?-->/g, "");
      for (const capability of ["- format check", "- lint", "- typecheck", "- tests"]) {
        expect(normative).toContain(capability);
      }
      expect(normative).toContain("<paths.specsDir>/03_contract/tech.md");
      expect(normative).not.toContain(".qfai/assistant/catalog/tech.md");
      expect(normative).not.toContain("pnpm format:check");
      expect(normative).toContain(
        "A capability with no discoverable command is **UNRUN**, not passed",
      );
    });

    it(`${tree}: configure records detected commands only in the contract`, async () => {
      const configure = (await read(tree, "assistant/skill/qfai-configure/SKILL.md")).replace(
        /\s+/g,
        " ",
      );
      expect(configure).toContain(
        "record them only under `03_contract/tech.md#standard-commands-copy-paste`",
      );
      expect(configure).not.toContain(".qfai/assistant/catalog/");
    });
  }
});
