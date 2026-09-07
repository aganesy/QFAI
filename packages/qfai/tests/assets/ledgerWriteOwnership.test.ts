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
const REVISION = "assistant/skills/qfai-implement/references/evidence-revision.md";
const IMPLEMENTATION_AGENTS = ["backend-engineer", "frontend-engineer", "acceptance-test-engineer"];

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("writes both columns the gate reads, not just Status", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("update `test-list.md` **Status and Evidence** after each phase");
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
    // evidence simply stops existing.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("final `Status`, its `DR-ID`");
    expect(policy).toContain("and the `Evidence` payload");
  });

  it("states ledger ownership once, so the `#ledger-ownership` anchor reaches all of it", async () => {
    // Two top-level sections fifteen lines apart both claimed the topic, and
    // only the second was reachable by the anchor both `SKILL.md` citation
    // sites use — so the reader landed on the half that never mentions gate
    // item 10 or `DR-ID`.
    const policy = await read(tree, POLICY);
    expect(policy).not.toContain("## Coordinated parallel mode (ledger ownership)");
    expect(policy).toContain("### Coordinated parallel mode");
    expect(policy.match(/## Ledger ownership/g)).toHaveLength(1);
  });

  it("points at the evidence contract instead of re-listing its fields", async () => {
    // The inline list named 11 of the contract's 23 fields while claiming to
    // carry **every** one, so a conforming worker returned a block the very
    // next bullet rejects at gate item 10.
    const policy = await read(tree, POLICY);
    // The pointer resolves from `references/`, so it must name the parent
    // directory: a bare `SKILL.md` here points at a file that does not exist.
    expect(policy).toContain("`../SKILL.md#per-item-evidence-contract-fresh-evidence-required`");
    expect(policy).not.toContain("RED command and result, GREEN command and result");
    expect(policy).toContain("Item 10 of the 12-point gate");
    expect(policy).not.toContain("11-point gate");
  });

  it("makes the worker take the fields the orchestrator cannot recover", async () => {
    // Each of these names a tree that is gone after the merge, so "obtains the
    // missing fields first" is not a remedy for any of them.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("`RED revision` in every round block");
    expect(policy).toContain("`Falsifiability revision`");
    expect(policy).toContain("`Oracle proof`");
    expect(policy).toContain("before the revert, in its own worktree");
  });

  it("requires the revision field the row's own branch defines, not both", async () => {
    // `Falsifiability revision` is a `falsifiability`-row field and
    // `Oracle proof` is satisfied by the falsifiability fields on the _RED not
    // observable_ path, so demanding either unconditionally sends a conforming
    // block back to the worker.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("decided by the row's branch");
    expect(policy).toContain("`Falsifiability revision` **in place of**");
    expect(policy).toContain("`observed-red` row has no such field");
    expect(policy).toMatch(/satisfies `Oracle proof` with its\s+falsifiability fields/);
    expect(policy).toContain("A block missing the field **its own branch** requires");
  });

  it("checks block completeness while the worker's worktree still stands", async () => {
    // The un-recoverable fields name a tree the merge destroys, so "goes back
    // to the worker" is a remedy only before that worktree is removed.
    // Detecting the gap during post-merge reconciliation leaves the row with
    // no route to the missing field at all.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("**Before the merge, and before any slice worktree is removed**");
    expect(policy).toContain("A short block goes back to its worker **there**");
    expect(policy).toContain(
      "an incomplete block blocks the **merge**, which is recoverable, rather than the row",
    );
  });

  it("re-takes the revision-bound observations on the merged trunk", async () => {
    // Sibling slices land in the trunk, so a worker's GREEN and reviewer
    // verdicts name a revision the row never finally landed at — stale on
    // arrival at gate item 10 however complete the returned block is.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("the trunk is a different revision from every slice worktree");
    // Every field bound to the final `Revision` is listed, not just the GREEN
    // and the reviewer verdicts: `Oracle proof` rides item 5's revision, the
    // pack path travels with its seal, and the checkpoint seal hashes the
    // revision it ran against.
    expect(policy).toContain(
      "the GREEN `Revision` and the `Oracle proof` bound to it, each reviewer's `Reviewed revision` and `Audited evidence hash`, the `Round N: Review pack` and its `Round N: Review pack seal`, and all three checkpoint verification fields",
    );
    expect(policy).toContain("**Re-take those observations on the integrated tree**");
    expect(policy).toContain("Post-merge integration verify does not cover it");
    // And the fields that cannot be re-taken are named as exempt, so step 1's
    // deadline does not read as redundant with step 2. `Oracle proof` is not
    // one of them — it has no revision field of its own, so exempting it left
    // item 5 stale on every merged row.
    expect(policy).toContain(
      "`RED revision`, `Falsifiability revision` and `Round N: Replacement proof revision` are exempt from steps 2 and 3",
    );
    expect(policy).not.toContain("`Oracle proof` are exempt from step 2");
  });

  it("re-takes the `Oracle proof` with the GREEN, by re-delegating the mutation", async () => {
    // `Oracle proof` has no revision field of its own, so it is bound to the
    // same final `Revision` as the GREEN. Carrying the slice's mutation result
    // over unchanged either backdates it to a tree the row never landed at or
    // leaves gate item 5 stale.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("`Oracle proof` is **not** in this class");
    expect(policy).toContain("`Oracle proof` has no revision field of its own");
    expect(policy).toContain(
      "Re-delegate the mutation and its immediate revert to the implementation agent in the integrated worktree, and have `qa-gatekeeper` confirm both",
    );
    // The one branch that owes nothing survives the change: a _RED not
    // observable_ row satisfies item 5 with its (preserved) falsifiability
    // fields, so demanding a fresh mutation there rejects a complete row.
    expect(policy).toContain(
      "A _RED not observable_ row owes nothing here: its falsifiability fields already satisfy item 5",
    );
  });

  it("replaces the review pack path together with its seal", async () => {
    // Each re-dispatch is a new review round and so writes a new pack. A new
    // seal under the old path makes gate item 10 recompute over a different
    // directory; the old seal under the new path protects nothing.
    const policy = await read(tree, POLICY);
    expect(policy).toContain(
      "Replace `Round N: Review pack` **and** `Round N: Review pack seal` as a pair",
    );
    expect(policy).toContain("a new seal under the old path makes gate item 10 recompute over");
  });

  it("re-runs the checkpoint verification, seal included, on the merged tree", async () => {
    // The seal hashes command + result together with the `Revision` the
    // checkpoint ran against, so refreshing `Revision` alone breaks it and
    // refreshing neither leaves item 12 ruling on the worker's private tree.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("refreshing `Revision` alone breaks the seal");
    expect(policy).toContain(
      "replace `Checkpoint verification command`, `Checkpoint verification result` and `Checkpoint verification seal`",
    );
  });

  it("re-takes the observations again after the last integration-verify remedy", async () => {
    // A revision addresses the whole tree, so a remedy anywhere — inside one
    // slice or outside every slice — re-stales the observations step 2 took,
    // for every merged row and not only the faulted one.
    const policy = await read(tree, POLICY);
    expect(policy).toContain(
      "**After the last integration-verify remedy, run step 2 again — over every merged item, not only the slice that was faulted.**",
    );
    expect(policy).toContain('"The change was unrelated" is not an exemption');
    expect(policy).toContain("the re-take is the **last** thing before the rows go to `done`");
  });

  it("treats `Replacement proof revision` as un-recoverable too", async () => {
    // A test-only replacement's proof ran against its own temporary tree, and
    // that tree is no more reconstructible after the merge than the RED's. It
    // must therefore be checked in step 1 and preserved, not re-taken, in
    // step 2 — but only on the rework rows that carry one.
    const policy = await read(tree, POLICY);
    expect(policy).toContain(
      "`Round N: Replacement proof revision` too — _beside_ its `RED revision`, not instead of it",
    );
    expect(policy).toContain("a row with no replacement owes nothing here");
    expect(policy).toContain(
      "own branch selects — including `Round N: Replacement proof revision` where the row took a test-only replacement",
    );
    expect(policy).toContain(
      "one can re-take `RED revision`, `Falsifiability revision` or `Round N: Replacement proof revision`",
    );
  });

  it("names only fields the contract actually defines", async () => {
    // The policy points at the contract instead of restating it, so every
    // field name it does spell out has to exist there — a step that says
    // "replace `Review pack seal`" when the contract calls it
    // `Round N: Review pack seal` sends the orchestrator after a field no row
    // carries.
    const policy = await read(tree, POLICY);
    const contract = (await read(tree, SKILL)) + (await read(tree, REVISION));
    for (const field of [
      // A round field, so it carries the `Round N:` prefix the closed list gives
      // every one of them (#654) — which is exactly what this case is for: the
      // policy must name the field the contract defines.
      "Round N: Replacement proof revision",
      "Round N: Review pack",
      "Round N: Review pack seal",
      "Checkpoint verification command",
      "Checkpoint verification result",
      "Checkpoint verification seal",
      "Audited evidence hash",
      "Reviewed revision",
      "Oracle proof",
    ]) {
      expect(policy, `${field} is named by the policy`).toContain(`\`${field}\``);
      expect(contract, `${field} is defined by the contract`).toContain(`\`${field}\``);
    }
  });

  it("cites anchors that resolve to real `evidence-revision.md` headings", async () => {
    // A staleness rule cited by a dangling anchor is a rule the worker cannot
    // read, and both citations above carry the whole justification for step 2.
    const policy = await read(tree, POLICY);
    const raw = await readFile(path.join(repoRoot, tree, REVISION), "utf-8");
    const slugs = [...raw.matchAll(/^#+\s+(.+)$/gm)].map(([, title]) =>
      title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-"),
    );
    const cited = [...policy.matchAll(/evidence-revision\.md#([\w-]+)/g)].map(
      ([, anchor]) => anchor,
    );
    expect(cited.length).toBeGreaterThan(0);
    for (const anchor of cited) {
      expect(slugs).toContain(anchor);
    }
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
