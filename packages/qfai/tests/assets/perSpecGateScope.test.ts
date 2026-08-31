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
    // The contract rules are filed against `.qfai/contracts/**`, which has no
    // spec owner, so a scoped run still exits 1 on a sibling's. Saying the flag
    // makes the gate this spec's own would be false, and the failure mode of
    // believing it is an operator weakening the profile to get green.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("and the gate still fails on the rest");
    expect(atdd).toContain("`QFAI-ATDD-113`");
    expect(atdd).toContain("`QFAI-ATDD-115`");
    expect(atdd).toContain("do **not** claim the gate passed, weaken the profile");
  });

  it("says the tdd gate still fails on a sibling's todo stub", async () => {
    // `--profile tdd` *does* run `validateTestTodoStubs`, and
    // `QFAI-TEST-001` names a test file, which no spec owns — so a sibling's
    // `it.todo` exits 1 on this gate. The checklist read as though `--spec`
    // made the gate this spec's own, which is the reading that ends in an
    // operator lowering `--fail-on` to get green.
    const checklist = flat(await read(tree, FINAL));
    expect(checklist).toContain("`QFAI-TEST-001` is **not** one of them");
    expect(checklist).toContain("a sibling spec's `it.todo` exits 1 here");
    expect(checklist).toContain("do **not** claim the gate passed");
  });

  it("names the contract family as still-blocking too", async () => {
    // `runTddValidators` runs `validateContracts` regardless of `specScope`,
    // and `QFAI-CONTRACT-*` / `QFAI-DB-002` are filed against
    // `.qfai/contracts/**`, which no spec owns — so they survive the scope
    // filter and exit 1 like the other two. Listing only `QFAI-TEST-001` and
    // `QFAI-TRACE-*` made a contract error read as an unexplained checkpoint
    // failure, which is the reading that ends in a lowered `--fail-on`.
    const checkpoint = flat(
      await read(tree, "assistant/skills/qfai-implement/references/checkpoint-verification.md"),
    );
    expect(checkpoint).toContain("the contract validators run regardless of scope");
    expect(checkpoint).toContain("`QFAI-CONTRACT-*` and `QFAI-DB-002`");
    expect(checkpoint).toContain("None of the three has a spec owner");
  });

  it("names the stub gate this profile runs, and that scope does not narrow it", async () => {
    // `runAtddValidators` runs `validateTestTodoStubs` too, so an acceptance
    // test written as a silent stub fails this skill's own gate. The finding
    // names a test file, which no spec owns, so it survives `--spec` like the
    // contract rules do — a completion reviewer has to read both halves, or a
    // sibling's stub reads as an unexplained failure of this spec's gate.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("`QFAI-TEST-001`");
    expect(atdd).toContain("which no spec owns either");
    // And only what it runs. `QFAI-TEST-001` matches the `*.todo` forms, not
    // `it.skip` / `describe.skip`; promising those told a completion reviewer
    // a green gate proved a skipped acceptance test did not exist.
    expect(atdd).toContain("`it.skip` / `describe.skip` are **not** that rule");
  });

  it("does not call a nonexistent-spec reference repo-wide wherever it sits", async () => {
    // A file under the canonical `tests/<layer>/spec-NNNN/**` layout is owned
    // by that spec whatever its annotation says, so the same broken reference
    // is scoped to that spec's run and dropped from every other. Reading it as
    // a repo-wide blocker made a sibling run report something it cannot see.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("**and sitting where no spec owns it either**");
    expect(atdd).not.toContain(
      "naming a spec number no spec pack has: no spec owns it, and `--spec` on that number is itself rejected, so it belongs to every run",
    );
  });

  it("limits the repo-wide TRACE claim to the findings that have no spec owner", async () => {
    // `QFAI-TRACE-104`..`-116` are filed against the spec's own
    // `03_Acceptance-Criteria.md` / `04_Business-Rules.md` / `05_Examples.md` /
    // `06_Test-Cases.md`, and `-002` against its ledger, so the scope filter
    // drops a sibling's before this checkpoint ever sees them.
    const checkpoint = flat(await read(tree, CHECKPOINT));
    expect(checkpoint).toContain("`QFAI-TRACE-*` findings **that have no spec owner** are filed");
    expect(checkpoint).toContain("**Not the whole `QFAI-TRACE-*` family**");
  });
});
