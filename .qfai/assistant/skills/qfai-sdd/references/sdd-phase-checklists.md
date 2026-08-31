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
- Add one row per coverage-target TC from `06_Test-Cases.md` that declares a `Level` the layer vocabulary recognises (`L1` / `L2` / `unit` / `component`), `Status = todo`.
- Add one `Layer = Integration` row per integration-level TC as well, `Status = todo`. Integration-level means **every** `Level` whose ATDD annotation routes to `tests/integration/**`: `L3`, `integration`, a blank cell, a spelling that names no layer (`smoke`), **and `system` / `acceptance`**. Route by that destination, not by whether you recognise the word — `system` and `acceptance` are in the layer vocabulary and are not unit or component, so a "blank or unrecognised" test puts them in neither group while `/qfai-atdd` still writes their tests, leaving a TC whose handoff row nothing seeds. These are ATDD-owned rows (`../../qfai-implement/references/execution-ledger.md`): `/qfai-atdd` authors their tests, this phase is the only thing that creates the rows, and no validator reports them missing. A TC whose `Level` is blank or unrecognised belongs here and not above — `QFAI-ATDD-112` routes every `Level` it cannot read to `tests/integration/**`, so seeding it as a coverage-target row has two skills write a test for one TC, and `TDDLIST_UNKNOWN_LEVEL` is a waivable `warning` that does not stop such a TC reaching this phase; its `Integration` row still satisfies `TDDLIST_TC_NOT_COVERED`, which accepts any row carrying the TC in `TC-Refs`.
- "One row" is a floor in both groups: a matrix-shaped TC — several rejection reasons, a status-code matrix, independent state transitions — is seeded one row per independently observable boundary, all carrying that TC in `TC-Refs` (`../../qfai-implement/references/selector-granularity.md`). For an `Integration` TC this phase is the only place the split can happen: `/qfai-atdd` takes its RED per row and never writes the ledger.
- Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.
- Reconcile changed and removed TCs: return a changed TC's row to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in `DR-ID`), and retire the row of a TC deleted upstream or whose `Level` moved to a layer this phase does not seed (`L4` / `L5`). Never leave a stale `done` row nor a selectable row for a TC that no longer exists. A row whose TC is still declared at `L3` is not stale — retiring it for not being a coverage target discards the integration rows this phase itself seeds.
- Reconcile **per boundary, not only per TC**. A matrix-shaped TC holds several rows, so re-derive its boundary set from `06_Test-Cases.md` and reconcile the TC's rows against it: append a row at `todo` for a boundary the TC has gained, and reset the rest under the rule above. Keyed on the TC alone, a TC that drops from three boundaries to two keeps all three rows — the TC still exists and is still `L3`, so nothing retires the third, and the changed-TC reset makes it selectable again for behaviour the spec no longer states.
- **`Selector` is not the key, and a row past `todo` is never retired by a string comparison.** `drift-protocol.md` authorises the executing stage to fill a placeholder selector and repair an unresolvable one, so a row seeded with a descriptive selector carries the test's real title once its cycle runs: matching the spec's boundaries against that cell reports every implemented boundary as deleted and discards a `done` row's `TDD-ID`, `Status` and `Evidence` for behaviour that never changed. Retire on this rule only a row still at `Status = todo` whose seeded selector names a boundary the TC no longer declares. When the re-derived set is smaller than the TC's rows that have already progressed, **stop and raise a `CR-*`**: which implemented obligation the spec dropped is a decision for the change record, and a `TDD-ID` is the only identity on these rows that nothing downstream rewrites.
- Keep the ledger table the first markdown table in the file.
- An empty table is a valid outcome only when the spec declares no coverage-target TC **and** no integration-level TC.

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
