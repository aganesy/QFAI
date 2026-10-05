---
name: sdd-contract
owner: qfai-sdd
purpose: "Write the contracts and business rules the flow's examples need, or repair one named contract."
requires: []
roles: [solution-architect, test-design-analyst, product-experience-architect]
routing-profile: default
---

# sdd-contract

Stage 4 of the story tree: contracts and the business rules they enforce.

## Reads

- The examples `sdd-story` wrote, and the existing contracts they touch.
- `.qfai/assistant/skill/qfai-sdd/references/contract-artifact-rules.md`: file
  types, realizability, cross-contract reconciliation, and DB executability.
- `.qfai/assistant/skill/qfai-sdd/references/sdd-phase-checklists.md#contracts-and-business-rules`
  when editing.
- For UI work, `.qfai/assistant/skill/qfai-sdd/references/ui-contract-guide.md`
  and
  `.qfai/assistant/skill/qfai-sdd/references/ui-design-contract-normalization.md`.
- The paired templates under
  `.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/` and
  `.qfai/assistant/skill/qfai-sdd/templates/contracts/`.

## Writes

- The files under `<paths.contractsDir>`, and a row in
  `<paths.contractsDir>/contracts.md` in the same change as every contract file
  written. A row has the columns `ID`, `Title`, `File`, `Depends On`,
  `Reconciled With` and `Purpose`.

A new contract takes its kind from its directory (`cli/`, `api/`, `db/` or
`ui/`) and the next contract number, one more than the highest of any kind. A
number is never reused. The file is `<kind>-NNNN-<slug>.<ext>`, and it declares
its ID once: in the H1 of a Markdown contract (`# CLI-0001: <title>`), or on a
`QFAI-CONTRACT-ID: API-0002` line in YAML or SQL.

Write only what the user approved, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#a-change-to-the-story-tree`
states.

## Procedure

1. Run the pre-draft grilling checkpoint for `Contracts and rules` in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md` before
   the first write, and list each decision it adopted in the final report.
2. Write a BR only after the EX it cites exists. Every BR cites at least one
   full EX ID, and nothing but EX IDs; every EX is cited by at least one BR.
   The relation may be many-to-many.
3. Put each BR in the contract that enforces it, numbered
   `BR-<contract number>-NNNN`: `x-qfai-rules` in YAML or JSON, `-- Rule` and
   `-- Examples:` in SQL, and a `## Business rules` table in Markdown.
4. Define a rule shared by contracts once, in its authoritative contract. No
   other contract restates or cites it: only code and tests cite a BR.
5. Name no implementation file in a contract. The implementation points at the
   contract, never the other way round.
6. Reconcile API and DB fields, state transitions, errors and persisted
   attributes, and run the executable DB contract checks
   `contract-artifact-rules.md` requires. Record the command and result under
   Contract executability in the SDD report.

## UI contracts

For a UI-bearing flow, write the screen contracts under
`<paths.contractsDir>/ui/` as the UI guides above state. A visual prototyping
surface also needs the root `DESIGN.md`, which `common-design-md` writes and
validates after this step. A CLI-only surface does not require one. Do not
adopt a sample design.

## A named contract

With `--contract <contract-ID-or-path>`, select the existing contract by ID or by a
repository-relative path under `<paths.contractsDir>`. An unknown target stops
the run.

1. Scope the work to the named contract, its paired contracts, and the existing
   flows whose AC, EX, or BR depend on them.
2. Read every affected flow's existing AC and EX and the paired contracts, then
   repair only the contract scope approved by the change request. No previous
   triage approval can substitute for approval of a new change-request row.
3. Recompute affected flows after each contract change until no new flow or
   contract write is found. Gather the newly exposed decisions and grill again
   before the next mutation.
4. Do not silently rewrite a story in this mode; ask for a wider change request
   when only the story can move.
5. A `confirm-only` change request stays read-only and stops on a mismatch.
6. An activated API contract without an owning flow remains planned until an
   owner is established.

## Gate

`solution-architect` accepts the connected BF → US → AC → EX ← BR design and
its contract realization before `sdd-gate` runs.

## Passes when

Read first: the triage decisions, the examples `sdd-story` wrote or kept, and the
contracts whose rules cite them. The step passes when the change writes no BR
and changes no contract or `contracts.md` row. The pass names the contracts it
read.
