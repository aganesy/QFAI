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
const IMPLEMENT = "assistant/skills/qfai-implement/SKILL.md";
const CHECKPOINT = "assistant/skills/qfai-implement/references/checkpoint-verification.md";
const FINAL = "assistant/skills/qfai-implement/references/final-checklist.md";

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** Gate invocations that must carry `--spec`, per file. */
const SCOPED_GATES: Array<{ file: string; profile: string }> = [
  { file: ATDD, profile: "atdd" },
  // The skill body too, not only its references: its Completion Message names
  // the command an operator runs straight after a per-spec run, so leaving it
  // unscoped pointed them back at the repo-wide gate the flag exists to avoid.
  { file: IMPLEMENT, profile: "tdd" },
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

  it("states which rules `--spec` cannot scope, and that they still fail the gate", async () => {
    // The contract rules are filed against `.qfai/contracts/**` and
    // `QFAI-TEST-001` against a test file — neither has a spec owner, so a
    // scoped run still exits 1 on a sibling's. Saying the flag makes the gate
    // this spec's own would be false, and the failure mode of believing it is
    // an operator weakening the profile to get green.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("and the gate still fails on the rest");
    expect(atdd).toContain("`QFAI-ATDD-113`");
    expect(atdd).toContain("`QFAI-ATDD-115`");
    expect(atdd).toContain("`QFAI-TEST-001` names a test file");
    expect(atdd).toContain("do **not** claim the gate passed, weaken the profile");
  });
});
