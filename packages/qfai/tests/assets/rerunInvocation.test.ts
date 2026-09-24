import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe.each(trees)("owner rerun in %s", (tree) => {
  it("names approval, the owner input revision, and affected test obligations", async () => {
    const rule = await readFile(
      path.join(repoRoot, tree, "assistant/rule/drift-protocol.md"),
      "utf-8",
    );
    expect(rule).toContain("The owner names the approved decision row, the input revision");
    expect(rule).toContain("Recheck every dependent BF, AC, and EX test obligation");
    expect(rule).toContain("Report any uncovered obligation");
  });

  it("selects a contract by its full ID or repository-relative path", async () => {
    const rule = await readFile(
      path.join(repoRoot, tree, "assistant/rule/drift-protocol.md"),
      "utf-8",
    );
    expect(rule).toContain("A contract with a CON ID is selected by its full ID");
    expect(rule).toContain("a contract without one is selected by its repository-relative path");
    expect(rule.replace(/\s+/g, " ")).toContain(
      "Do not shorten CON-API, CON-DB, or CON-UI references",
    );
  });
});
