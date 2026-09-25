import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");

describe.each(trees)("%s implementation micro-cycle", (tree) => {
  it("orders Red, Green and Refactor as separate steps", async () => {
    const skill = await read(tree, "assistant/skill/qfai-implement/SKILL.md");
    const red = skill.indexOf("1. **Red:**");
    const green = skill.indexOf("2. **Green:**");
    const refactor = skill.indexOf("3. **Refactor:**");
    expect(red).toBeGreaterThan(-1);
    expect(green).toBeGreaterThan(red);
    expect(refactor).toBeGreaterThan(green);
  });

  it("records a failing assertion before changing production behavior", async () => {
    const skill = (await read(tree, "assistant/skill/qfai-implement/SKILL.md")).replace(
      /\s+/g,
      " ",
    );
    expect(skill).toContain("Observe the assertion fail for the intended behavior");
    expect(skill).toContain("before changing production code");
    expect(skill).toContain("A load error, missing dependency, or broken fixture");
    expect(skill).toContain("not an admissible RED");
  });

  it("gives existing behavior an explicit falsifiability route", async () => {
    const skill = (await read(tree, "assistant/skill/qfai-implement/SKILL.md")).replace(
      /\s+/g,
      " ",
    );
    expect(skill).toContain("references/red-not-observable.md");
    expect(skill).toContain("references/oracle-strength.md");
    expect(skill).toContain("The qa-gatekeeper checks the observed RED and GREEN evidence");
  });
});
