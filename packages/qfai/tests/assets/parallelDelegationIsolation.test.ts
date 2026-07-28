import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ANCHOR = "workflow.md#concurrency-stage-independent-mandatory";

const read = async (tree: string, relativePath: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relativePath), "utf-8");

/** Returns the body of `heading` up to the next same-or-higher-level heading. */
function section(content: string, heading: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return "";
  }
  const level = heading.match(/^#+/)?.[0].length ?? 1;
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^(#+)\s/.exec(line);
    if (match && match[1].length <= level) {
      break;
    }
    body.push(line);
  }
  return body.join("\n");
}

describe("parallel delegation isolation is stage-independent", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: workflow.md states concurrency rules outside the implementation stage`, async () => {
      const workflow = await read(tree, "assistant/constitution/workflow.md");

      expect(workflow).toContain("Concurrency (stage-independent, mandatory):");

      const concurrency = workflow.slice(
        workflow.indexOf("Concurrency (stage-independent, mandatory):"),
      );
      expect(concurrency).toContain("Worktree separation is required");
      expect(concurrency).toContain("/qfai-sdd");

      // The worktree clause must no longer be scoped to the implementation stage.
      const implementation = workflow.slice(
        workflow.indexOf("Implementation stage:"),
        workflow.indexOf("Concurrency (stage-independent, mandatory):"),
      );
      expect(implementation).not.toContain("worktree separation is required");
    });

    it(`${tree}: the delegation baseline forbids sweeping stage commands`, async () => {
      const baseline = await read(
        tree,
        "assistant/constitution/shared-skill-delegation-baseline.md",
      );
      const commitScoping = section(baseline, "### Commit Scoping (MUST)");

      expect(commitScoping).not.toBe("");
      expect(commitScoping).toContain("`git add -A`");
      expect(commitScoping).toContain("`git add .`");
      expect(commitScoping).toContain("`git commit -a`");
      expect(commitScoping).toContain(ANCHOR);
    });

    it(`${tree}: qfai-sdd batch delegation points at the concurrency rules`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      const batch = section(skill, "### No-argument batch delegation (MUST)");

      expect(batch).toContain("Delegate Slice in parallel per spec.");
      expect(batch).toContain(ANCHOR);
    });
  }
});
