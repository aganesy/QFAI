/**
 * The `qfai prototyping iterate` contract keeps capture artifacts conditional
 * on the opt-in flag, including the evidence each captured screen requires.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseContractRules } from "../../src/core/storyTree/contractRules.js";

// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const CONTRACT = path.join(
  repoRoot,
  ".qfai",
  "spec",
  "03_contract",
  "cli",
  "cli-0012-qfai-prototyping-iterate.md",
);

async function ruleStartingWith(opening: string): Promise<string> {
  const { rules, errors } = parseContractRules(CONTRACT, await readFile(CONTRACT, "utf-8"));
  expect(errors).toEqual([]);
  const rule = rules.find(({ statement }) => statement.startsWith(opening));
  expect(rule, `no business rule opens with ${opening}`).toBeDefined();
  return rule?.statement ?? "";
}

describe("`qfai prototyping iterate` CLI contract surface", () => {
  it("writes capture outputs only for the opt-in path", async () => {
    const rule = await ruleStartingWith("`--capture` is opt-in");
    expect(rule).toContain("without it iterate writes no PNG, no HTML and no interaction record");
  });

  it("requires capture evidence only for a captured iteration", async () => {
    const rule = await ruleStartingWith("Each `evidenceRefs[]` entry");
    expect(rule).toContain(
      "When `--capture` is not passed for an iteration, its `evidenceRefs[]` may be empty",
    );
    expect(rule).toContain(
      "When `--capture` is passed, it holds at least one `screenshot` entry per declared screen",
    );
  });
});
