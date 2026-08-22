/**
 * Contracts are reconciled against the obligations written after them (#383).
 *
 * `/qfai-sdd` authors contracts in Phase 0, before the `BR`/`AC`/`TC` that
 * reference them are written in Phase 2 — and no later phase, checklist or
 * validator ever revisited the contract against them. `sdd-quality-gate.md`'s
 * Traceability Checks terminated at `TC` and the file never used the word
 * "contract"; the only contract item in the completion message was file
 * existence. A business rule could require four attributes while the relation
 * realizing it held two, with every SDD gate green — and driving the declared
 * path *succeeds*, so execution-based checking hides the defect behind success.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SDD = "assistant/skills/qfai-sdd";
const SKILL = `${SDD}/SKILL.md`;
const GATE = `${SDD}/references/sdd-quality-gate.md`;
const RULES = `${SDD}/references/contract-artifact-rules.md`;
const CHECKLISTS = `${SDD}/references/sdd-phase-checklists.md`;
const PLAYBOOK = `${SDD}/references/sdd-execution-playbook.md`;

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("Phase 2c reconciles contracts against their obligations", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the phase is in the fixed order, not advisory`, async () => {
      const skill = await read(tree, SKILL);

      // Both phase-order surfaces in SKILL.md, plus the two references that
      // restate the order. A phase named in only one of them is skippable.
      expect(skill).toContain("-> Phase 2c Obligation reconciliation (per spec)");
      expect(skill).toContain(
        "Phase 2b Seed tdd/test-list.md → Phase 2c Obligation reconciliation → Phase 3 Plan finalize",
      );
      expect(skill).toContain("8. Phase 2c: Obligation reconciliation (per spec).");

      const playbook = await read(tree, PLAYBOOK);
      expect(playbook).toContain("**Phase 2c - Obligation reconciliation** (per spec)");

      const checklists = await read(tree, CHECKLISTS);
      expect(checklists).toContain("## Phase 2c: Obligation reconciliation");
    });

    it(`${tree}: the phase order is renumbered consistently`, async () => {
      const skill = await read(tree, SKILL);

      // Inserting a step into a numbered list is where an off-by-one hides.
      expect(skill).toContain("9. Phase 3: Plan finalize");
      expect(skill).toContain("10. Phase 4: Delta update.");
      expect(skill).toContain("11. Run validate;");
      expect(skill).toContain("12. Triage density-smell warnings");
    });

    it(`${tree}: the rule requires attribute-level resolution, not a name check`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("## Obligation Reconciliation (MUST) — Phase 2c");
      expect(rules).toContain("**Name the contract that realizes it.**");
      expect(rules).toContain(
        "**Resolve every persisted attribute the obligation names to a concrete column, field or enum member in that contract.**",
      );
      // The observed defect was reachable-by-join, not adjacency.
      expect(rules).toContain("**Reachability counts, not adjacency.**");
      expect(rules).toContain(
        "If no join reaches it, the obligation is unrealizable however valid both contracts are",
      );
    });

    it(`${tree}: the rule names the failure mode that does not look like a typo`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain(
        "**Vocabulary mixing is the usual cause, and it does not look like a typo.**",
      );
      expect(rules).toContain(
        "Two internally valid, mutually consistent contracts is exactly the state in which this defect survives.",
      );
    });

    it(`${tree}: the rule says execution-based checking cannot substitute`, async () => {
      const rules = flat(await read(tree, RULES));

      // A defect concealed by success, not surfaced by failure — this is why a
      // driven-path suite returns green over it.
      expect(rules).toContain(
        "An obligation whose attributes are missing produces a declared path that **succeeds** when driven",
      );
      expect(rules).toContain("this class is concealed by success");
    });

    it(`${tree}: fixing it is in-phase, and carrying it downstream is not`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain(
        "**A failure here is resolved in the contract or in the obligation, in this phase.**",
      );
      expect(rules).toContain(
        "carrying the mismatch downstream is, because the implementer who eventually meets it cannot fix either side",
      );
    });

    it(`${tree}: the quality gate no longer terminates at TC`, async () => {
      const gate = await read(tree, GATE);
      const flattened = flat(gate);

      // The whole 43-line file used to contain "contract" zero times in the
      // Traceability section.
      expect(flattened).toContain("**The chain does not terminate at `TC`.**");
      expect(flattened).toContain(
        "Every `BR` / `AC` names the contract that realizes it, and every persisted attribute it names resolves to a column, field or enum member in that contract",
      );
      expect(gate).toContain(
        "references/contract-artifact-rules.md#obligation-reconciliation-must--phase-2c",
      );
    });

    it(`${tree}: the contract-scoped mode runs it too`, async () => {
      // `--contract` enumerates its phase set exhaustively ("... only"), and it
      // is reached from drift-protocol step 4 — after a Change Request was
      // approved. Omitting Phase 2c there discharges the CR and writes a delta
      // saying the contract change was handled, while every BR/AC riding on the
      // old shape stays unexamined. It is also the one mode whose ordering is
      // inverted: the obligations already exist and the contract is what moved.
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "run Stage 0 + Phase 0 (Contracts-first) + Phase 2c (Obligation reconciliation, limited to the existing `BR` / `AC` of the specs that reference any contract this run changed) + Phase 4 (Delta update) only",
      );
      expect(skill).toContain("**Phase 2c is not droppable in this mode.**");
    });

    it(`${tree}: the contract-scoped target is the obligations that already exist`, async () => {
      // The per-obligation rules are written for "produced in Phase 2" / "this
      // run produced", and Phase 2 does not run in this mode. Left unqualified,
      // the target set is empty and the mandatory phase passes over nothing.
      const skill = flat(await read(tree, SKILL));
      const rules = flat(await read(tree, RULES));
      const checklists = flat(await read(tree, CHECKLISTS));

      expect(skill).toContain(
        "**The target set is the obligations the specs already hold.** Phase 2 does not run here",
      );
      expect(skill).toContain(
        "**In contract-scoped mode the target is the `BR` / `AC` the specs already hold**, not the ones this run produced",
      );
      expect(rules).toContain("**Target the obligations that already exist.**");
      expect(rules).toContain(
        "a literal reading gives an empty set, and an empty set passes the phase without checking anything",
      );
      expect(checklists).toContain(
        "the target is the `BR` / `AC` the in-scope specs **already hold**",
      );
    });

    it(`${tree}: the contract-scoped scope follows Phase 0's writes, not the argument`, async () => {
      // Phase 0's Cross-contract Reconciliation may amend the paired DB
      // contract of the named API contract. A spec referencing only that pair
      // member is the one a named-ID scope misses.
      const skill = flat(await read(tree, SKILL));
      const rules = flat(await read(tree, RULES));
      const checklists = flat(await read(tree, CHECKLISTS));

      expect(skill).toContain("**Scope follows what Phase 0 wrote, not what the argument named.**");
      expect(skill).toContain(
        "every contract this run changed or re-adjusted is in scope, and so, transitively, is every spec referencing any of them",
      );
      expect(rules).toContain("**Take the scope from what Phase 0 wrote, not from the argument.**");
      expect(rules).toContain(
        "A spec that references only the paired contract is exactly the one the named-ID scope would miss.",
      );
      expect(checklists).toContain(
        "including a paired contract Phase 0's Cross-contract Reconciliation amended, not only the named one",
      );
    });

    it(`${tree}: contract-scoped resolution stays on the contract side`, async () => {
      // In-phase repair of a `BR`/`AC` assumes Phase 2 / 2b / 3 run behind it.
      // They do not here, so the EX/TC, the ledger and the plan would keep the
      // old obligation while Phase 4 closes the Change Request.
      const skill = flat(await read(tree, SKILL));
      const rules = flat(await read(tree, RULES));
      const checklists = flat(await read(tree, CHECKLISTS));

      expect(skill).toContain(
        "**Amending a `BR` / `AC` is outside this mode's write scope.** Phase 2 / 2b / 3 do not run, so `06_Test-Cases.md`, `tdd/test-list.md` and `10_Plan.md` would keep the old obligation.",
      );
      expect(skill).toContain(
        "halt and widen the Change Request to a spec-scoped `/qfai-sdd <spec-id>` rerun",
      );
      expect(rules).toContain(
        "**Resolve on the contract side; amending an obligation is out of write scope.**",
      );
      expect(rules).toContain(
        "When a mismatch cannot be resolved in the contract, halt and widen the Change Request to a spec-scoped `/qfai-sdd <spec-id>` rerun instead.",
      );
      expect(checklists).toContain(
        "fix the contract, never the obligation — Phase 2 / 2b / 3 do not run",
      );
    });

    it(`${tree}: a confirm-only rerun runs the phase read-only`, async () => {
      // `confirm-only` is approved to write nothing but the CR reference, so a
      // phase that records per-obligation outcomes and repairs mismatches in
      // place cannot be run as written without breaking the approved limit.
      const skill = flat(await read(tree, SKILL));
      const rules = flat(await read(tree, RULES));
      const checklists = flat(await read(tree, CHECKLISTS));

      expect(skill).toContain("**Under a `confirm-only` Change Request the phase is read-only.**");
      expect(skill).toContain("a mismatch halts the rerun and returns to the Change Request");
      expect(rules).toContain("**Under a `confirm-only` Change Request, run it read-only.**");
      expect(rules).toContain(
        "a `confirm-only` rerun cannot honestly confirm a contract whose approved obligations have stopped being realizable",
      );
      expect(checklists).toContain(
        "read-only. Record nothing, repair nothing, and halt on the first mismatch",
      );
    });

    it(`${tree}: the rule places the phase for the contract-scoped mode`, async () => {
      // Phase 2c is specified as running "after Phase 2b and before Phase 3",
      // and in `--contract` mode neither neighbour runs — so without this the
      // phase has no position in the only mode that most needs it.
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain(
        "**In contract-scoped mode (`/qfai-sdd --contract <CON-ID>`) neither neighbour runs, so Phase 2c sits between Phase 0 and Phase 4**",
      );
      expect(rules).toContain(
        "scoped to the `BR` / `AC` of the specs that reference the named contract",
      );
    });

    it(`${tree}: the completion message distinguishes existence from realizability`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "and that Phase 2c reconciled every `BR` / `AC` against them — existence is not realizability",
      );
    });
  }
});
