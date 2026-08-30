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
- Keep the ledger table the first markdown table in the file.
- An empty table is a valid outcome when the spec declares no coverage-target TC.

## Phase 2c: Obligation reconciliation

- For every `BR` / `AC` this run produced, name the contract under `.qfai/contracts/**` that realizes it.
- Resolve every persisted attribute the obligation names to a column, field or enum member in that contract.
- When the attribute lives in another relation, state the join that reaches it. No join reaching it means the obligation is unrealizable, however valid both contracts are.
- Fix the contract or the obligation in this phase — both are owned by `/qfai-sdd`, and a mismatch carried downstream reaches an implementer who can fix neither.
- Record the outcome per obligation, not per spec.
- Contract-scoped mode (`/qfai-sdd --contract <CON-ID>`): the target is the `BR` / `AC` the in-scope specs **already hold** — Phase 2 does not run, so "this run produced" would leave the set empty. In scope are the specs referencing any contract this run changed, including a paired contract Phase 0's Cross-contract Reconciliation amended, not only the named one. Under `confirm-only` nothing is written, so scope on the contracts Phase 0 **reconciled** — the named one and every contract paired against it — never on writes alone, or the scope is empty.
- Contract-scoped mode, pairing: read it from the `Reconciled With` column of `_policies/05_Contracts.md`. Where the index predates that column, enumerate every contract declaring a domain for a field whose normalized name matches one the named contract declares — the rule `QFAI-CONTRACT-040` applies — and take all of them. `Depends On` is apply order and is not the pairing.
- Contract-scoped mode, scope closure: re-expand after every contract write this phase makes — recompute the specs referencing the contracts now in scope, re-reconcile every obligation in scope rather than only the ones that just entered, and repeat until a pass adds no spec **and** writes no contract. A shared contract amended here may be referenced only by specs Phase 0 never put in scope, and a write made for one obligation can break another that already passed.
- Contract-scoped mode, write confinement: repair only the contracts Phase 0 touched, plus the pair a repair to one of them must move with it. A mismatch on any other contract is recorded and halts the rerun as its own Change Request — rewriting it exceeds the approved impact scope and drags its referents into the closure.
- Contract-scoped mode, resolution: fix the contract, never the obligation — Phase 2 / 2b / 3 do not run, so a rewritten obligation leaves `06_Test-Cases.md`, `tdd/test-list.md` and `10_Plan.md` on the old one. If only the obligation can move, halt and widen the Change Request to `/qfai-sdd <spec-id>`.
- Contract-scoped mode under a `confirm-only` Change Request: read-only. Record nothing, repair nothing, and halt on the first mismatch rather than writing anything but the CR reference.
- Full rule: `contract-artifact-rules.md#obligation-reconciliation-must--phase-2c`.

## Phase 3: Plan finalize

- Create or update `<spec-id>/10_Plan.md`.
- Keep the file How-only.
- Do not finalize the plan before at least one slice gate passes.

## Phase 4: Delta update

- Update `09_delta.md` or `*_delta.md`.
- Record adoption and rejection rationale.
- When rejections exist, include `DO NOT` and `Temptation`.
