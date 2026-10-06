import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");
const flat = (text: string): string => text.replace(/\s+/g, " ");

describe.each(trees)("%s open-question routing", (tree) => {
  const registers = {
    "qfai-configure": "open-questions.md",
    "qfai-verify": "open-questions.md",
  };
  for (const [name, register] of Object.entries(registers)) {
    it(`${name} routes new product obligations to SDD`, async () => {
      const skill = flat(await read(tree, `assistant/skill/${name}/SKILL.md`));
      expect(skill).toContain("Open questions that place a **new obligation on the product**");
      expect(skill).toContain("owner phase (`/qfai-sdd`)");
      expect(skill).toContain(
        ".qfai/assistant/rule/drift-protocol.md#reviewer-originated-obligations",
      );
      expect(skill).toContain(`This skill does not write \`${register}\``);
    });
  }

  it("keeps the owning review route available to every stage", async () => {
    const drift = await read(tree, "assistant/rule/drift-protocol.md");
    expect(drift).toContain("## Reviewer-originated obligations");
    for (const name of ["qfai-implement"]) {
      const skill = await read(tree, `assistant/skill/${name}/SKILL.md`);
      expect(skill).toContain("[DRIFT-PROTOCOL:REQUIRED]");
      expect(skill).toContain("rule/shared-skill-delegation-baseline.md");
    }
    const baseline = await read(tree, "assistant/rule/shared-skill-delegation-baseline.md");
    expect(baseline).toContain("rule/drift-protocol.md");
  });
});
