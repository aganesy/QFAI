import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe.each(trees)("drift classification in %s", (tree) => {
  it("requires evidence for a defect and a real choice for intent drift", async () => {
    const rule = await readFile(
      path.join(repoRoot, tree, "assistant/rule/drift-protocol.md"),
      "utf-8",
    );
    expect(rule).toContain("Intent drift means an approved obligation should change.");
    expect(rule).toContain("Defect drift means an artifact contradicts itself");
    expect(rule).toContain("Record a reproduction:");
    expect(rule).toContain("without invented alternatives");
    expect(rule).toContain("Both classes use the same approval and owner-rerun path.");
  });

  it("keeps discussion discovery outside the upstream ownership boundary", async () => {
    const rule = await readFile(
      path.join(repoRoot, tree, "assistant/rule/drift-protocol.md"),
      "utf-8",
    );
    expect(rule).toContain("A discussion pack is discovery material");
    expect(rule).toContain("the story tree and contracts are the current specification");
    expect(rule).toContain("A downstream skill does not edit an approved specification");
  });
});
