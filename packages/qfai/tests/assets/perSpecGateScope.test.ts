/**
 * `qfai validate --spec` exists, is repeatable, writes a per-spec report file
 * and fails closed on an unknown spec — and exactly one shipped skill used it.
 *
 * `/qfai-atdd` and `/qfai-implement` both process one spec per invocation, yet
 * every gate command they published was the unscoped run. A stage that had
 * discharged everything its spec owns still failed its own gate on sibling
 * specs' obligations, and two per-spec stages raced on one `validate.json`.
 *
 * These tests pin the flag into every per-spec gate statement, and pin the
 * honest limit alongside it: the contract-owned rules cannot be spec-scoped.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD = "assistant/skills/qfai-atdd/SKILL.md";
const CHECKPOINT = "assistant/skills/qfai-implement/references/checkpoint-verification.md";
const FINAL = "assistant/skills/qfai-implement/references/final-checklist.md";

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Gate invocations that must carry `--spec`, per file. */
const SCOPED_GATES: Array<{ file: string; profile: string }> = [
  { file: ATDD, profile: "atdd" },
  { file: CHECKPOINT, profile: "tdd" },
  { file: FINAL, profile: "tdd" },
];

describe.each(TREES)("%s", (tree) => {
  it.each(SCOPED_GATES)("$file leaves no unscoped gate invocation", async ({ file, profile }) => {
    const text = await read(tree, file);
    const unscoped = new RegExp(
      `npx qfai validate --profile ${profile} --fail-on error(?! --spec)`,
      "g",
    );
    expect(text.match(unscoped)).toBeNull();
    expect(text).toContain(`npx qfai validate --profile ${profile} --fail-on error --spec`);
  });

  it("says why the scope flag is load-bearing, not cosmetic", async () => {
    const atdd = await read(tree, ATDD);
    expect(atdd).toContain("The scope flag is not optional bookkeeping.");
    expect(atdd).toContain("validate.spec-<id>.json");
    expect(atdd).toContain("QFAI-SCOPE-001");
  });

  it("states which rules `--spec` cannot scope, instead of implying it scopes all", async () => {
    // The contract rules are filed against `.qfai/contracts/**`, which no spec
    // owns. Claiming a scoped gate is clean would be false for them.
    const atdd = await read(tree, ATDD);
    expect(atdd).toContain("`--spec` scopes the spec-owned rules only.");
    expect(atdd).toContain("`QFAI-ATDD-113`");
    expect(atdd).toContain("`QFAI-ATDD-115`");
    expect(atdd).toContain("has no spec owner in the model, so they stay repo-wide");
  });
});
