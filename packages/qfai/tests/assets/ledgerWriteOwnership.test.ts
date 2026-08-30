/**
 * Gate item 10 had no owner, in either execution mode.
 *
 * Delegation is mandatory and the orchestrator may not write code, so the only
 * role that ever observes RED/GREEN is the implementation agent. But the single
 * ledger-write instruction was assigned to the *orchestrator* and scoped to
 * `Status`; no handoff contract returned the evidence to it; and no
 * implementation agent's Deliverables mentioned the ledger — while their stop
 * condition actively blocks writing artifacts owned by someone else.
 *
 * In parallel mode it is worse: `workflow.md` requires worktree separation and
 * the ledger lives *inside* the separated tree, so N workers each hold a private
 * copy of the one table that is the completion gate — and
 * `Post-parallel integration verify` named three actions, none of which was
 * reconciling it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const POLICY = "assistant/skills/qfai-implement/references/parallelization-policy.md";
const IMPLEMENTATION_AGENTS = ["backend-engineer", "frontend-engineer", "acceptance-test-engineer"];

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("writes both columns the gate reads, not just Status", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "update `test-list.md` **Status, DR-ID and Evidence** after each phase",
    );
    // The payload goes to the evidence file; the cell takes the outcome and
    // the anchor. Asserting the old "verbatim into the cell" wording pinned an
    // instruction that corrupts the ledger gate item 10 reads (#464).
    expect(skill).toContain(
      "recording the delegated agent's one-word RED/GREEN outcome plus the anchor",
    );
    // The old instruction is what left `Evidence` unowned.
    expect(skill).not.toContain("update `test-list.md` status after each phase completes.");
  });

  it("routes the evidence back to the role that can write it", async () => {
    // It was routed to `qa-gatekeeper` and nowhere else, so it never reached
    // the ledger even though the orchestrator was told to write it.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("returns it to the orchestrator in the per-item evidence contract's");
  });

  it("names exactly one writer, so a worktree copy is not a second one", async () => {
    const policy = await read(tree, POLICY);
    expect(policy).toContain("has exactly one writer: the **orchestrator**, in the **trunk**");
    expect(policy).toContain("Parallel workers **MUST NOT** edit `.qfai/specs/<spec-id>/tdd/**`");
  });

  it("says what a worker returns instead of writing", async () => {
    // Without this the ban is a prohibition with no replacement, and the
    // evidence simply stops existing. All three carve-out cells: the
    // orchestrator's reconcile is the only write an `exception` row's
    // mandatory `DR-*` can come from.
    const policy = await read(tree, POLICY);
    expect(policy).toContain(
      "final `Status`, the `DR-ID` that status requires, and the `Evidence` payload",
    );
  });

  it("reconciles the merged ledger before integration verify, and fails on a stale row", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("**Reconcile the ledger first.**");
    expect(skill).toContain("fail the verify if any merged item's row is still `todo`");
  });

  for (const agent of IMPLEMENTATION_AGENTS) {
    it(`${agent} owes the ledger entry, so its stop condition no longer blocks it`, async () => {
      const card = await read(tree, `assistant/agents/${agent}.md`);
      expect(card).toContain("TDD ledger Status + Evidence entry for each item processed");
      // And the boundary is stated in the same line, so "deliver it" is not
      // read as "write the file".
      expect(card).toContain("which owns the `test-list.md` write; do not edit that file directly");
    });
  }
});
