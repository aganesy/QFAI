import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const ARTICLE = "assistant/constitution/thinking.md";

const read = (tree: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, ARTICLE), "utf-8");

describe("the thinking article states what a stage records, not how to reason", () => {
  for (const tree of TREES) {
    it(`${tree}: the four recorded obligations stay`, async () => {
      const article = await read(tree);
      expect(article).toContain("## What the stage records");
      expect(article).toContain("- The evidence it read (files, commands).");
      expect(article).toContain("- The decision, and the grounds for it in that evidence.");
      expect(article).toContain("- The residual risk.");
      expect(article).toContain("- The rollback path.");
    });

    it(`${tree}: the reasoning procedure is gone`, async () => {
      // The model reasons before every reply and sets its own depth, so walking
      // it through the steps adds tokens and nothing else.
      const article = await read(tree);
      expect(article).not.toContain("## Working method");
      expect(article).not.toContain("Restate the goal");
      expect(article).not.toContain("Enumerate unknowns");
    });

    it(`${tree}: the principles and the stop-and-ask list are unchanged`, async () => {
      const article = await read(tree);
      expect(article).toContain("Prefer **repo evidence** over assumptions");
      expect(article).toContain("write `TBD` and raise an Open Question");
      expect(article).toContain("## When to stop and ask");
    });
  }
});
