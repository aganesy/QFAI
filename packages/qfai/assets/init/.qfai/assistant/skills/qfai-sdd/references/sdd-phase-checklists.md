# SDD Phase Checklists

Use these checklists as the detailed operational guide for `/qfai-sdd`.

## Stage 1: Triage

- Active spec summaries collected; non-active specs filtered out.
- **Append-first applied**: every REQ/NFR is checked against existing
  active specs first; CREATE is reserved for zero subject-token overlap.
- Each REQ/NFR has a classified Operation (one of the 8).
- UPDATE rows declare an explicit Sub-op (APPEND / MODIFY / REMOVE).
- **Impact cascade enumerated**: companion specs whose AC/BR reference
  the changed concept have their own MODIFY/REMOVE rows with the same
  `Source` ID.
- CREATE rows cite a `CAP-NNNN` in Rationale and the CAP exists in
  `_policies/03_Capabilities.md` (`QFAI-TRIAGE-006`).
- Approval-required rows (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE) carry a recorded `Approved By`.
- Triage table written to `<spec>/09_delta.md` (per-spec) and `_policies/10_delta.md` (cross-spec / policy).
- Stop entry to Phase 0 until the Triage table is complete.

## Phase 0: Contracts-first

- Confirm impacted contract kinds: API, DB, UI.
- Create or update declared contract files.
- Ensure each contract has `QFAI-CONTRACT-ID`.
- Refresh `_policies/05_Contracts.md` Contract Index.
- Stop if an indexed contract file is missing.

## Phase 1: Outline

- Refresh `_policies/01..11`.
- Keep Mermaid inside fenced code blocks only.
- Mirror every unresolved shared issue into `_policies/09_Open-questions.md`.
- Record `0 items` explicitly when decisions or delta are empty.

## Phase 2: Slice

- Create or update `<spec-id>/01..08`.
- Check `US -> AC -> BR -> EX -> TC`.
- Ensure `01_Spec.md` remains the execution Primary SSOT.
- Stop if slice gate fails.

## Phase 2b: Seed `tdd/test-list.md`

- Copy `templates/specs/spec/tdd/test-list.md` when `<spec-id>/tdd/test-list.md` does not exist.
- Add one row per coverage-target TC from `06_Test-Cases.md`, `Status = todo`.
- Declare each row's `Owning module` from the TC's parent `BR` — one module per row, `-` only when no single module owns it. It is the only evidence of a row's **production** write set that exists before RED, and no later phase can recover it. It is not by itself a parallel verdict: every other technical gate in `qfai-implement/references/parallelization-policy.md` (test-module writes, write/read overlap, shared fixtures, schemas and DB rows, fixed ports and other out-of-worktree resources, worktree separation) still has to hold, so two distinct module names alone never authorize dispatch.
- Resolve that parent by `EX-Ref` first: a TC naming an `EX` takes that example's `BR-Ref` in `05_Examples.md`, which pins the parent 1:1. Fall back to the TC's `AC-Refs` only when `EX-Ref` is `—` — the `04_Business-Rules.md` rows whose `AC-Refs` name the same `AC` — so an error / boundary TC inherits the parent its normal-case sibling on that `AC` resolved to. Neither table carries a module path column, so name the repository module that `BR`'s `Rule` will be implemented in; write `-` only when the resolution reaches no `BR`, or several with different homes.
- Migrate a pre-existing ledger in place: when its header predates `Owning module`, append the column to **every** schema-shaped ledger table in the file — the leading table and each `## CHG-*` table `/qfai-implement` appended — extending that table's header and separator rows and filling the cell on all of its rows, including rows the delta otherwise leaves untouched. A leading table holding only its header while a later `## CHG-*` table holds every row is a shape `/qfai-implement` produces, so migrating the first table alone leaves the real rows without the column. The delta rule preserves cell values, not the column set, and the template is copied only when the file is absent — without this step an upgraded project's ledger never gains the column. Position is free: the validator resolves the column by name.
- Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.
- Reconcile changed and removed TCs: return a changed TC's row to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in `DR-ID`), and retire the row of a TC deleted upstream or no longer a coverage target. Never leave a stale `done` row nor a selectable row for a TC that no longer exists.
- Keep the ledger table the first markdown table in the file.
- An empty table is a valid outcome when the spec declares no coverage-target TC.

## Phase 2c: Obligation reconciliation

- For every `BR` / `AC` this run produced, name the contract under `.qfai/contracts/**` that realizes it.
- Resolve every persisted attribute the obligation names to a column, field or enum member in that contract.
- When the attribute lives in another relation, state the join that reaches it. No join reaching it means the obligation is unrealizable, however valid both contracts are.
- Fix the contract or the obligation in this phase — both are owned by `/qfai-sdd`, and a mismatch carried downstream reaches an implementer who can fix neither.
- Record the outcome per obligation, not per spec.
- Full rule: `contract-artifact-rules.md#obligation-reconciliation-must--phase-2c`.

## Phase 3: Plan finalize

- Create or update `<spec-id>/10_Plan.md`.
- Keep the file How-only.
- Do not finalize the plan before at least one slice gate passes.

## Phase 4: Delta update

- Update `09_delta.md` or `*_delta.md`.
- Record adoption and rejection rationale.
- When rejections exist, include `DO NOT` and `Temptation`.
