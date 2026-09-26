/**
 * Every contract template the package ships is read by the business-rule parser the story-tree
 * validators use, so a project that copies one starts from a contract that validates.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseContractRules } from "../../src/core/storyTree/contractRules.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const SHIPPED_ASSISTANT = path.join(getInitAssetsDir(), ".qfai", "assistant");

const TEMPLATE_DIRS = [
  "skill/qfai-sdd/templates/spec/03_contract",
  "skill/qfai-sdd/templates/contracts",
  "skill/qfai-prototyping/templates/contracts",
];

async function templates(): Promise<string[]> {
  const found: string[] = [];
  for (const dir of TEMPLATE_DIRS) {
    const entries = await readdir(path.join(SHIPPED_ASSISTANT, dir), {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isFile()) found.push(path.join(entry.parentPath, entry.name));
    }
  }
  return found.sort();
}

describe("shipped contract templates", () => {
  // QFAI:EX-0001-0057-09
  it("parse as contracts with no rule-shape finding", async () => {
    const files = await templates();
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const file of files) {
      const scan = parseContractRules(file, await readFile(file, "utf-8"));
      expect(scan.errors, path.relative(SHIPPED_ASSISTANT, file)).toEqual([]);
    }
  });

  // QFAI:EX-0001-0057-09
  it("show a Markdown rule as a BR-ID, Statement and Examples row", async () => {
    const file = path.join(
      SHIPPED_ASSISTANT,
      "skill/qfai-sdd/templates/spec/03_contract/cli/command.md",
    );
    const scan = parseContractRules(file, await readFile(file, "utf-8"));
    expect(scan.rules.map(({ id, examples }) => ({ id, examples }))).toEqual([
      { id: "BR-0001", examples: ["EX-0001-0001-01"] },
    ]);
  });
});
