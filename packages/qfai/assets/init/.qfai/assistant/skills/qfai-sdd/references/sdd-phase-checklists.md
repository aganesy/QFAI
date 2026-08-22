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
- **Migrate an existing ledger's columns to the template's, every run.** The copy above fires only when the file is absent, so an upgraded project keeps whatever shape it was seeded with: an eight-column ledger (`TDD-ID … Evidence`) predates `Blocked-By` and has no cell for it. Add each missing column here — header cell, separator cell, and an empty cell appended to every existing row — before seeding rows. Only this phase may change the table's shape, so a ledger left short of a column makes the write that needs it unwritable downstream: `/qfai-implement` blocking a residual matrix row would have to add `Blocked-By` itself, and blocking it without one is `TDDLIST_BLOCKED_MISSING_REF`.
- Add one row per coverage-target TC from `06_Test-Cases.md`, `Status = todo`.
- A matrix-shaped `TC-*` (many rejection reasons, a status-code matrix, several independent state transitions) MUST be split across multiple TDD rows before RED begins — one falsifying oracle per row, one row per independently observable boundary. Do not accumulate unrelated boundaries behind a single selector; doing so invalidates the RED observation, because only the first failing assert is ever observed. Every row of the split carries that `TC-*` in `TC-Refs`, which is many-to-many with `TDD-ID`.
- This phase is the only one that may add, remove or re-scope a row, so the split is seeded here and never downstream: `/qfai-implement` owns the `Status`, `DR-ID`, `Evidence` and `Blocked-By` cells and nothing else (`spec-traceability-rules.md#tdd-execution-ledger`). Every downstream row request arrives here as a Change Request — a matrix shape first visible at RED, a post-RED scope gap, a checkpoint regression — and this phase seeds the rows it asks for.
- Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.
- A matrix row already past `todo` is the delta rule's exception, and `done` included: the split is a re-scope, so "unchanged TC keeps its cells" does not shield it, and nothing downstream can reach it — Phase Red never re-selects a `done` row. Split it here, keeping what was actually observed: the existing `TDD-ID` stays as the row for the one boundary its recorded RED observed (the first failing assert), its `Selector` is narrowed to that boundary, and one new `todo` row is appended per remaining boundary. **Return the kept row to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in `DR-ID`, prior `Evidence` kept as history) in every case — including when its recorded RED/GREEN would still hold against the narrowed selector.** Narrowing the `Selector` changes the row's identity, and the evidence is bound to the old one: `qfai-implement/SKILL.md` completion item 10 checks the entry's copied selector against the ledger row, and each reviewer verdict's `Audited evidence hash` is recomputed over the entry's phase-authored fields — so keeping the status leaves evidence that names a selector the row no longer has, and editing the copy to match invalidates the hash the verdicts were taken over. Status, evidence and verdicts are re-issued together or not at all; a `blocked` row carrying the split's `CR-*` resumes the same way.
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
