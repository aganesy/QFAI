import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");

describe.each(trees)("%s ATDD contract ownership", (tree) => {
  it("makes the acceptance test engineer read the flow and applicable contracts", async () => {
    const card = await read(tree, "assistant/agent/acceptance-test-engineer.md");
    expect(card).toContain("<paths.specsDir>/02_business-flow/**");
    expect(card).toContain("Active API, DB, UI and design contracts");
    expect(card).toContain("<paths.contractsDir>");
  });

  it("uses contracts to shape assertions without treating contract IDs as coverage annotations", async () => {
    const card = await read(tree, "assistant/agent/acceptance-test-engineer.md");
    const skill = await read(tree, "assistant/skill/qfai-atdd/SKILL.md");
    expect(card).toContain("Use active CON-API and CON-DB contracts to shape assertions");
    expect(card).toContain("one E2E test per BF and integration or API tests for each active AC");
    expect(skill).toContain("Contract references and business rules define assertions");
    expect(skill).toContain("contract IDs are not coverage annotations");
  });

  it("preserves BF, AC and EX test ownership across skills", async () => {
    const skill = await read(tree, "assistant/skill/qfai-atdd/SKILL.md");
    expect(skill).toContain("Business flow");
    expect(skill).toContain("Acceptance criterion");
    expect(skill).toContain("`QFAI:BF-NNNN`");
    expect(skill).toContain("`QFAI:AC-NNNN-NNNN-NN`");
    expect(skill).toContain("Unit and component tests belong");
    expect(skill).toContain("`/qfai-implement`");
  });
});
