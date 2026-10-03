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
    expect(card).toContain("Active API, DB and UI contracts");
    expect(card).toContain("<paths.contractsDir>");
  });

  it("uses contracts to shape assertions without treating contract IDs as coverage annotations", async () => {
    const card = await read(tree, "assistant/agent/acceptance-test-engineer.md");
    const step = await read(tree, "assistant/step/atdd-author/STEP.md");
    expect(card).toContain("Use active API and DB contracts to shape assertions");
    expect(card).toContain("one E2E test per BF and integration or API tests for each active AC");
    expect(step).toContain("Contract references and business rules define assertions");
    expect(step).toContain("contract IDs are not coverage annotations");
  });

  it("preserves BF, AC and EX test ownership across skills", async () => {
    const step = await read(tree, "assistant/step/atdd-author/STEP.md");
    expect(step).toContain("Business flow");
    expect(step).toContain("Acceptance criterion");
    expect(step).toContain("`QFAI:BF-NNNN`");
    expect(step).toContain("`QFAI:AC-NNNN-NNNN-NN`");
    expect(step).toContain("Unit and component tests belong");
    expect(step).toContain("`/qfai-implement`");
  });
});
