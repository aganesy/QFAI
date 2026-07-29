import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/volume-policy.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Returns the `## Volume Policy (MUST)` body. */
function volumePolicy(content: string): string {
  const start = content.indexOf("## Volume Policy (MUST)");
  if (start === -1) {
    return "";
  }
  const rest = content.slice(start + 1);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("qfai-implement scales its ceremony to ledger volume", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the skill keeps a pointer to the full rules`, async () => {
      const skill = await read(tree, SKILL);
      expect(skill).toContain("## Volume Policy (MUST)");
      expect(skill).toContain("references/volume-policy.md");
      expect(skill).toContain("risk tier");
    });
  }

  for (const tree of QFAI_TREES) {
    it(`${tree}: defines risk tiers with a stated default`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).not.toBe("");
      expect(section).toContain("## Risk tier (derive per row)");
      expect(section).toContain("T1 — standard");
      expect(section).toContain("T2 — elevated");
      expect(section).toContain("T3 — surface");
      // An unrecorded tier must not silently become the cheapest one.
      expect(section).toContain("A row with no recorded tier is treated as **T2**");
    });

    it(`${tree}: permits batched review with a bounded unit`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Batched review");
      expect(section).toContain("coherent group");
      expect(section).toContain("a `REVISE` on the group blocks every member");
      expect(section).toContain("a T2 or T3 row is always reviewed alone");
    });

    it(`${tree}: allows a sequential multi-spec queue without enabling parallelism`, async () => {
      const content = await read(tree, SKILL);
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Multi-spec queue");
      expect(section).toContain("This is a queue, not parallelism");
      // Auto-discovery must no longer say "at most one spec".
      expect(content).not.toContain("Auto-discovery selects at most one spec");
      expect(content).toContain("does NOT enable multi-spec parallel execution");
    });

    it(`${tree}: makes the gate-cycle cost visible before processing`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Cost visibility");
      expect(section).toContain("rows × gate cycles");
    });
  }
});
