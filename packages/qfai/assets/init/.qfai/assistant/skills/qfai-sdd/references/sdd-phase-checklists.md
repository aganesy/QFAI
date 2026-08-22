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
- Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.
- Reconcile changed and removed TCs: return a changed TC's row to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in `DR-ID`), and retire the row of a TC deleted upstream or no longer a coverage target. Never leave a stale `done` row nor a selectable row for a TC that no longer exists.
- Retiring a row means **deleting it from the ledger table**, with the removal recorded as `<spec-id>/TDD-NNNN` in the record that authorised the deletion (`TDD-ID` is unique only within its spec, so a bare `TDD-0001` is ambiguous in a record spanning two). On a normal `/qfai-sdd` reseed that record is the approved `UPDATE:REMOVE` Triage row in `09_delta.md` / `_policies/10_delta.md`, which already carries the operator's approval — do not open a `CR-*` for it; on a Drift Protocol owner rerun, where no Triage ran, it is the driving `CR-*`. There is no `retired` status (`Status = retired` is a `TDDLIST_INVALID_STATUS` error), and moving the row below the ledger does not retire it either: `validateTddList` scores every schema-complete table in the file. Copy the deleted row's `Evidence` cell into that record verbatim — it only points into the evidence file the row's `Layer` owns (`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `Integration` / `API` / `E2E` row), and the managed `.gitignore` block excludes `.qfai/evidence/*` without re-including either, so the transcription is what survives a clean checkout. A retired `TDD-ID` is never reused: allocate above the highest the spec has ever issued.
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
