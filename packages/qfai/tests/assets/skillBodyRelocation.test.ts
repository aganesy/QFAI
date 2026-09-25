/**
 * A skill body loads whole when the skill triggers, so detail a run needs only
 * sometimes lives in a reference the body points at. These cases pin the
 * sections that were moved out of `qfai-sdd` and `qfai-prototyping`: the body
 * keeps a pointer that resolves, and the reference keeps the rule.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, "assistant/skills", rel), "utf-8"));

describe.each(TREES)("%s", (tree) => {
  it("qfai-prototyping points at the rescope and license-verify detail", async () => {
    const skill = await read(tree, "qfai-prototyping/SKILL.md");
    expect(skill).toContain("`references/iteration-loop.md#scope-reduction-prototyping-rescope`");
    expect(skill).toContain("`references/iteration-loop.md#license-verify-hard-stop-exit-66`");

    const loop = await read(tree, "qfai-prototyping/references/iteration-loop.md");
    expect(loop).toContain("## Scope reduction: `prototyping rescope`");
    expect(loop).toContain("**It never rewrites a critique.**");
    expect(loop).toContain("## License-verify hard-stop (exit 66)");
    expect(loop).toContain("`license-missing-attribution`");
    expect(loop).toContain("Recovery path (no in-loop retry — the verifier is fail-closed)");
  });

  it("qfai-sdd points at the batch Plan gate detail", async () => {
    const skill = await read(tree, "qfai-sdd/SKILL.md");
    expect(skill).toContain(
      "`references/sdd-execution-playbook.md#plan-gate-in-a-no-argument-batch`",
    );

    const playbook = await read(tree, "qfai-sdd/references/sdd-execution-playbook.md");
    expect(playbook).toContain("## Plan gate in a no-argument batch");
    expect(playbook).toContain("A usage this Plan cites in a **sibling target of the same batch**");
    expect(playbook).toContain("Integration is the barrier");
  });
});
