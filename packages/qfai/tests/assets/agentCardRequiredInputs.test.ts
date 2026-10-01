import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractLiteralRequiredInputs } from "../../src/core/doctor.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

async function cardsIn(tree: string): Promise<string[]> {
  const directory = path.join(repoRoot, tree, "assistant/agent");
  const names = (await readdir(directory)).filter((name) => name.endsWith(".md"));
  return await Promise.all(names.map((name) => readFile(path.join(directory, name), "utf8")));
}

async function existsIn(tree: string, relative: string): Promise<boolean> {
  const root = tree === ".qfai" ? repoRoot : path.join(repoRoot, "packages/qfai/assets/init");
  try {
    await readFile(path.join(root, relative), "utf8");
    return true;
  } catch {
    return false;
  }
}

function producedByRun(relative: string): boolean {
  return relative.startsWith(".qfai/evidence/") || relative.startsWith(".qfai/report/");
}

describe.each(trees)("%s agent card inputs", (tree) => {
  it("resolves every required literal shipped input", async () => {
    const cards = await cardsIn(tree);
    expect(cards.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const card of cards) {
      for (const required of extractLiteralRequiredInputs(card)) {
        if (!producedByRun(required) && !(await existsIn(tree, required))) {
          missing.push(required);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("required-input path extraction", () => {
  const section = (bullets: string[]): string =>
    ["## Inputs you must read", "", ...bullets, "", "## Next"].join("\n");

  it("reads the path, leaving a following explanation behind", () => {
    expect(
      extractLiteralRequiredInputs(
        section([
          "- .qfai/assistant/rule/test-layers.md (coverage layers)",
          "- .qfai/assistant/agent/qa-gatekeeper.md — the reviewer card",
        ]),
      ),
    ).toEqual([".qfai/assistant/rule/test-layers.md", ".qfai/assistant/agent/qa-gatekeeper.md"]);
  });

  it("ignores globs, optional inputs, and placeholder paths", () => {
    expect(
      extractLiteralRequiredInputs(
        section([
          "- .qfai/assistant/rule/** (all rules)",
          "- .qfai/assistant/rule/quality.md (optional)",
          "- .qfai/spec/<flow-id>/03_contract/tech.md (flow-specific template)",
          "- caller-provided context",
        ]),
      ),
    ).toEqual([]);
  });

  it("keeps a generated evidence path distinct from a required shipped file", () => {
    const evidence = ".qfai/evidence/implement-BF-NNNN.md";
    expect(extractLiteralRequiredInputs(section([`- ${evidence} (current evidence)`]))).toEqual([
      evidence,
    ]);
    expect(producedByRun(evidence)).toBe(true);
    expect(producedByRun(".qfai/assistant/rule/quality.md")).toBe(false);
  });

  it("drops sentence punctuation and an optional continuation", () => {
    expect(extractLiteralRequiredInputs(section(["- .qfai/assistant/rule/quality.md."]))).toEqual([
      ".qfai/assistant/rule/quality.md",
    ]);
    expect(
      extractLiteralRequiredInputs(
        section(["- .qfai/assistant/rule/quality.md", "  (optional for this stage)"]),
      ),
    ).toEqual([]);
  });
});
