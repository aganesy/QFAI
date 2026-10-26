import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");

describe.each(trees)("%s ATDD contract ownership", (tree) => {
  it("uses contracts to shape assertions without treating contract IDs as coverage annotations", async () => {
    const step = await read(tree, "assistant/step/implement-acceptance/STEP.md");
    expect(step).toContain("Contract references and business rules define assertions");
    expect(step).toContain("contract IDs are not coverage annotations");
  });

  it("preserves BF, AC and EX test ownership across skills", async () => {
    const step = await read(tree, "assistant/step/implement-acceptance/STEP.md");
    expect(step).toContain("Business flow");
    expect(step).toContain("Acceptance criterion");
    expect(step).toContain("`QFAI:BF-NNNN`");
    expect(step).toContain("`QFAI:AC-NNNN-NNNN-NN`");
    expect(step).toContain("`QFAI:EX-NNNN-NNNN-NN`");
    expect(step).toContain("Each test keeps its annotation and its file");
  });
});
