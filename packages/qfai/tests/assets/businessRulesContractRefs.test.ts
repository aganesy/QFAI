import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("business rules are owned by enforcing contracts and cite examples", () => {
  for (const tree of trees) {
    it(tree + ": names syntax for each contract format", async () => {
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("YAML and JSON contracts put rules under x-qfai-rules");
      expect(rules).toContain("SQL contracts use -- Rule and -- Examples: lines");
      expect(rules).toContain("Markdown contracts use a ## Rules table");
      expect(rules).toContain("Each rule includes ID, statement, and full example IDs");
      expect(rules).toContain("The authoritative contract defines a shared BR once");
    });

    it(tree + ": the CLI contract template shows a BR-to-EX edge", async () => {
      const template = await read(
        tree,
        "assistant/skill/qfai-sdd/templates/spec/03_contract/cli/command.md",
      );
      expect(template).toContain("| BR-0001 |");
      expect(template).toContain("EX-0001-0001-01");
    });
  }
});
