/**
 * Phase Red step 3c must say what happens when a row's predicate lives in its
 * own `Test file`.
 *
 * A case that plants its own broken copy of a shipped file exercises a checker
 * inside the test, so no production edit can make it fail. Without a rule, the
 * mutation reads as an edit of the acceptance test that `/qfai-atdd` owns, and a
 * `RED test hash` taken after the mutation never matches the restored file.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped surface plus its generated root mirror. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-implement/SKILL.md";

async function step3c(tree: string): Promise<string> {
  const text = await readFile(path.join(repoRoot, tree, SKILL), "utf-8");
  const start = text.indexOf("#### Red 3c — Falsifiability mutation");
  expect(start).toBeGreaterThanOrEqual(0);
  const end = text.indexOf("\n### ", start);
  return text.slice(start, end < 0 ? undefined : end);
}

describe.each(TREES)("qfai-implement step 3c in %s", (tree) => {
  it("takes a mutation of a checker in the row's own Test file as a reverted probe", async () => {
    const section = await step3c(tree);
    expect(section).toContain(
      "**A predicate that lives in the `Test file` itself is mutated here too.**",
    );
    expect(section).toContain("That is not an edit of the acceptance test");
  });

  it("takes RED test hash before a mutation that lands in a manifest file", async () => {
    const section = await step3c(tree);
    expect(section).toContain(
      "**Take `RED test hash` before the mutation whenever the mutation lands in a file its manifest lists**",
    );
  });
});
