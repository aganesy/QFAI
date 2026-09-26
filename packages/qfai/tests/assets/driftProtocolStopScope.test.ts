import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe.each(trees)("drift protocol in %s", (tree) => {
  it("limits a stop to affected obligations and composes concurrent requests", async () => {
    const rule = (
      await readFile(path.join(repoRoot, tree, "assistant/rule/drift-protocol.md"), "utf-8")
    ).replace(/\s*\n\s*/g, " ");
    expect(rule).toContain("Other flows continue.");
    expect(rule).toContain("Their union is the set of work paused.");
    expect(rule).toContain("A later request against the same artifact names the earlier DEC ID");
  });

  it("uses decision rows for authorization without a standalone request file", async () => {
    const rule = (
      await readFile(path.join(repoRoot, tree, "assistant/rule/drift-protocol.md"), "utf-8")
    ).replace(/\s*\n\s*/g, " ");
    expect(rule).toContain("Content starts with Change request:");
    expect(rule).toContain("TODO is not authorization.");
    expect(rule).toContain("WIP or DONE Change request: row");
    expect(rule).not.toContain(".qfai/decisions/");
    expect(rule).not.toContain("tdd/test-list.md");
  });
});
