import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_BLOCK, QFAI_GITIGNORE_LEGACY_LINES } from "../../src/core/gitignore.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe.each(trees)("decision records in %s", (tree) => {
  it("keeps operator answers separate from approval of protected changes", async () => {
    const rule = await readFile(
      path.join(repoRoot, tree, "assistant/rule/drift-protocol.md"),
      "utf-8",
    );
    expect(rule).toContain("The envelope-deviation writer may create its JSON record");
    expect(rule).toContain(".qfai/evidence/decision/");
    expect(rule).toContain("does not itself authorize a protected file change");
    expect(rule).toContain("Change request:");
    expect(rule).not.toContain(".qfai/decisions/");
  });
});

describe("the decision record home stays local", () => {
  // QFAI:EX-0001-0033-03
  it("re-includes nothing under it in the managed ignore block, and retires the old negations", () => {
    const block = QFAI_GITIGNORE_BLOCK.split("\n");
    for (const line of ["!.qfai/evidence/decision/", "!.qfai/evidence/decision/**"]) {
      expect(block).not.toContain(line);
      expect(QFAI_GITIGNORE_LEGACY_LINES).toContain(line);
    }
    expect(block).toContain(".qfai/evidence/*");
  });
});
