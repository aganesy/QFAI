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
- **The shape rule is not `TC-*`-only, because the judgement that sends rows here is not.** Phase Red judges the selector of whatever row it selected, whatever the `Layer`, and `Layer = E2E` / `Layer = API` rows are legal in this ledger, carrying `US-Refs` / `CON-API-Refs` in place of `TC-Refs` (`../../qfai-implement/references/execution-ledger.md#obligation-columns-optional-required-by-layer`). Seeding still runs off coverage-target TCs alone — `US-*` and `CON-API-*` are not row-producing obligations here (`templates/specs/spec/tdd/test-list.md`) — but **originating a row and re-scoping one are different writes, and this phase owns both at every `Layer`**: `/qfai-atdd` reads this ledger and never writes it, and `/qfai-implement` owns cells and not rows, so a matrix-shaped E2E or API row this phase declines leaves an approved `CR-*` with nobody able to execute it and the row un-split for good. Split it here by the same criterion, taking the boundaries from the source the row's obligation column points at: `TC-Refs` from that `TC-*` in `06_Test-Cases.md`, `US-Refs` from that `US-*`'s acceptance criteria (`02_User-stories.md` / `03_Acceptance-Criteria.md`), `CON-API-Refs` from the operation its contract declares under `.qfai/contracts/**` — one row per status, per rejection reason, per independently observable transition. Every row of the split repeats the same obligation in that same column and adds no other: a `TC-*` on an E2E or API row is `TDDLIST_OBLIGATION_LAYER_MISMATCH`, and the split must not launder one layer's obligation into another's column.
- This phase is the only one that may add, remove or re-scope a row, so the split is seeded here and never downstream: `/qfai-implement` owns the `Status`, `DR-ID`, `Evidence` and `Blocked-By` cells unconditionally, two more only while the whitelist's stated condition holds, and no rows at all (`spec-traceability-rules.md#tdd-execution-ledger`). Every downstream row request arrives here as a Change Request — a matrix shape first visible at RED, a post-RED scope gap, a checkpoint regression — and this phase seeds the rows it asks for.
- Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.
- **A progressed matrix row this phase finds on its own has no driving `CR-*` yet, and needs one before it is touched.** The rule below reads that CR twice — for the boundary order that decides which row keeps the `TDD-ID`, and for the approved actions the reset is enumerated under — so a row first noticed during an ordinary reseed has neither. The residual path supplies one because Phase Red raised it; a legacy `red` or `done` row does not, and Phase Red never re-selects a `done` row, so nothing downstream will ever raise it either. Raise it here: a Change Request under `.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected` naming the row, the boundaries its selector conflates and the order they are to be split in, then **wait for approval** and leave the row untouched meanwhile. Narrowing its `Selector` first would be an un-approved re-scope of recorded work; skipping the split to preserve the approval leaves the row un-split for good, since this phase is the only writer that could ever do it.
- A matrix row already past `todo` is the delta rule's exception, and `done` included: the split is a re-scope, so "unchanged TC keeps its cells" does not shield it, and nothing downstream can reach it — Phase Red never re-selects a `done` row. Split it here, keeping what was actually observed: the existing `TDD-ID` stays as the row for the one boundary its recorded RED observed (the first failing assert), its `Selector` is narrowed to that boundary, and one new `todo` row is appended per remaining boundary. **A `Selector` holding several entries observed more than one**, because Phase Red runs each entry separately and records each failure (`../../qfai-implement/references/selector-granularity.md`, `../../qfai-implement/SKILL.md` Phase Red step 4) — so "the boundary its RED observed" names a set, not a row. That is not the `blocked` or `falsifiability` case below: the observations are real and valid, there are simply several of them. Break the tie by the same order those cases use — the boundary the driving `CR-*` names first among the ones it says the row conflates, and where the CR names them as an unordered set, the order the source the row's obligation column points at lists them. Picking any of the observed boundaries would be legal for the evidence and arbitrary for the ledger, and two runs of this phase would keep the `TDD-ID` on different rows. **A `blocked` row has no such observation, and it is the residual path's normal state**: Phase Red judges the shape at selection and writes `todo -> blocked` ahead of RED, so the row never ran (`../../qfai-implement/SKILL.md` Phase Red step 1). Do not demand a recorded RED there and do not invent one — take the kept boundary from the record instead: the boundary the driving `CR-*` names first among the ones it says the row conflates keeps the existing `TDD-ID`, in the order `06_Test-Cases.md` lists them under that `TC-*` when the CR names them as an unordered set — and on an `E2E` / `API` row, in the order the source its own obligation column points at lists them, per the bullet above — and every remaining boundary is appended as a new `todo` row exactly as above. **Read the row's evidence branch before assuming a natural RED exists at all**: a `falsifiability` row records a mutation trio in place of one, so a row at `red` or beyond on that branch has no first failing assert either (`../../qfai-implement/SKILL.md` Phase Red step 3c). Keep the boundary the predicate its `Satisfied-by` names covers, and where the trio spans more than one, fall back to the same `CR-*` / `06_Test-Cases.md` order the `blocked` case uses. **The kept row must be re-executed in every case — including when its recorded RED/GREEN would still hold against the narrowed selector.** Narrowing the `Selector` changes the row's identity, and the evidence is bound to the old one: `qfai-implement/SKILL.md` completion item 10 checks the entry's copied selector against the ledger row, and each reviewer verdict's `Audited evidence hash` is recomputed over the entry's phase-authored fields — so keeping the status leaves evidence that names a selector the row no longer has, and editing the copy to match invalidates the hash the verdicts were taken over. Status, evidence and verdicts are re-issued together or not at all. **This phase does not write that reset**, only the row identity: `Status`, `DR-ID`, `Evidence` and `Blocked-By` are `/qfai-implement`'s cells even here, so enumerate the kept row's `TDD-ID` under the driving `CR-*`'s approved actions and hand the reset to that skill's Change-Request preflight, which returns the row to `todo`, records the `CR-*` in `DR-ID` and clears the `Blocked-By` a residual-path row carries (`../../qfai-implement/references/change-request-reset.md`).
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
