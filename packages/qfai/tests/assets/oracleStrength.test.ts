/**
 * Nothing asked whether a passing test can fail.
 *
 * The completion gate and the per-item evidence contract record a command that
 * failed and a command that passed; GREEN is `exit code == 0`. Downstream, ATDD
 * coverage is annotation presence, the strongest content check on a `done` row
 * is that the test file exists, and the Coverage Depth Matrix counts **case
 * categories**, never oracle strength.
 *
 * So a test that cannot fail cleared RED, GREEN, refactor, every completion
 * point, `QFAI-ATDD-111/112/113` and `qfai validate`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const ORACLE = "assistant/skills/qfai-implement/references/oracle-strength.md";
const GATEKEEPER = "assistant/agents/qa-gatekeeper.md";
const DEPTH = "assistant/skills/qfai-atdd/references/test-case-depth-checklist.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(TREES)("%s", (tree) => {
  it("adds Oracle proof to the per-item evidence contract", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("`Oracle proof` — the smallest production change");
    expect(skill).toContain("reverted immediately");
  });

  it("binds the completion gate to it, not only the evidence file", async () => {
    // A field nothing gates on is documentation. The condition rides on the
    // GREEN item, whose "watch it pass" is exactly what it qualifies.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("**and** that the pass depends on this item's behaviour");
    expect(skill).toContain(
      "Exit code 0 alone does not distinguish a discriminating test from one that cannot fail",
    );
  });

  it("gives the reviewer criteria to apply, not just an obligation", async () => {
    const card = await read(tree, GATEKEEPER);
    expect(card).toContain("## Oracle Strength Check (MUST)");
    // Each rejection reason corresponds to a way of faking the proof.
    expect(card).toContain("the mutation is outside the code the item owns");
    expect(card).toContain("that is a load failure, not a discriminating failure");
    expect(card).toContain("the recorded command differs from the `GREEN command`");
  });

  it("describes the closed gap in the past tense and names what closed it", async () => {
    // The gate line that makes `Oracle proof` mandatory cites this file. A
    // reader arriving through that citation must not be told, as present fact,
    // that nothing asks for the thing they were just sent here to produce.
    const doc = await read(tree, ORACLE);
    expect(doc).not.toContain("Nothing in qfai asked this.");
    expect(doc).toContain("Nothing in qfai asked this until completion item 5");
    expect(doc).toContain("are what close that hole");
  });

  it("introduces the weak-oracle shapes without dating them to today's gates", async () => {
    // "Each passes today's gates" contradicts the gate item that stops them.
    const doc = await read(tree, ORACLE);
    expect(doc).not.toContain("Each passes today's gates");
    expect(doc).toContain("Each clears an exit-code-only GREEN");
  });

  it("names the weak-oracle shapes rather than asking for a judgement call", async () => {
    const doc = await read(tree, ORACLE);
    expect(doc).toContain("Truthiness where the value is available");
    expect(doc).toContain("Round-tripping the fixture's own helper");
    expect(doc).toContain("empty by construction");
    expect(doc).toContain("Observations the transport discards");
    expect(doc).toContain("Assertions on the mock");
  });

  it("does not duplicate the proof on the RED-not-observable path", async () => {
    // That path already records a falsifiability mutation by the same method.
    const doc = await read(tree, ORACLE);
    expect(doc).toContain("That satisfies `Oracle proof`; do not do it twice");
  });

  it("exempts the falsifiability mutation from the ownership rejection", async () => {
    // The trio breaks the predicate `Satisfied-by` names, which belongs to the
    // sibling row by construction — read literally, the ownership criterion
    // rejected every correctly executed `Unit` / `Component` branch-2 row, and
    // `red-not-observable.md` forbids routing that case to `exception`.
    const doc = await read(tree, ORACLE);
    expect(doc).toContain(
      "**On a _RED not observable_ row the predicate `Satisfied-by` names is the owned code for this check**",
    );
    expect(doc).toContain("Anything else is still out of bounds");
  });

  it("scopes the gatekeeper's carve-out to the evidence branch, not the `Layer`", async () => {
    // Scoped to a handed-over row it reached only `E2E` / `API` / `Integration`,
    // leaving the `Unit` / `Component` case the path was written for uncovered.
    const card = await read(tree, GATEKEEPER);
    expect(card).toContain(
      "On a falsifiability row, **the predicate `Satisfied-by` names is the owned code**",
    );
  });

  it("routes the equivalent-mutant case instead of deadlocking the implementer", async () => {
    // Strengthening the assertion past the contract is reviewer-originated
    // scope, which the drift protocol forbids — so without a route the finding
    // would be one the implementer is not allowed to act on.
    const doc = await read(tree, ORACLE);
    expect(doc).toContain("`Oracle proof: equivalent-mutant`");
    expect(doc).toContain("drift-protocol.md#when-drift-is-detected");
    expect(doc).toContain("blocking the implementer on a finding");
  });

  it("adds oracle strength to the depth checklist and its matrix", async () => {
    const depth = await read(tree, DEPTH);
    expect(depth).toContain("## 8. Oracle Strength");
    // The matrix is what `qa-gatekeeper` actually reads; a section without a
    // column would not reach the verdict.
    expect(depth).toContain("Oracle strength | Status |");
  });

  it("stops category coverage from waiving oracle strength", async () => {
    // The precise failure this closes: six ✅ category cells and a test suite
    // in which nothing can fail.
    const depth = await read(tree, DEPTH);
    expect(depth).toContain("**Oracle strength is not waivable by category coverage.**");
  });
});
