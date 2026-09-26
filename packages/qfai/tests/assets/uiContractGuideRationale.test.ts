/** The shipped UI contract guide states framework schema rationale inline. */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const GUIDE = "assistant/skill/qfai-sdd/references/ui-contract-guide.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

async function readGuide(tree: string): Promise<string> {
  return flat(await readFile(path.join(repoRoot, tree, GUIDE), "utf-8"));
}

describe.each(QFAI_TREES)("%s ui-contract-guide.md", (tree) => {
  it("states the closed-schema rationale inline", async () => {
    const guide = await readGuide(tree);
    // Both halves of the decision must survive: why the closed triple was
    // chosen, and what the rejected open shape would cost.
    expect(guide).toContain("validate name a malformed task deterministically");
    expect(guide).toContain("per-project field sprawl");
  });

  it("describes the consumers the shipped code actually has", async () => {
    const guide = await readGuide(tree);
    // `extractPrimaryTasks` keeps only `label`, and `core/atdd/scaffold.ts`
    // never opens a UI contract, so the guide must not promise that a
    // structured task reaches ATDD scaffolding today.
    expect(guide).toContain("Validate is currently the only consumer");
    expect(guide).not.toContain("ATDD scaffold");
    expect(guide).not.toContain("ATDD scaffolding");
  });

  it("does not defer the rationale to a project-owned decisions file", async () => {
    const guide = await readGuide(tree);
    // A project-owned decisions file cannot supply the framework's rationale.
    expect(guide).not.toContain("08_Decisions.md");
    expect(guide).not.toContain("_policies/");
  });
});
