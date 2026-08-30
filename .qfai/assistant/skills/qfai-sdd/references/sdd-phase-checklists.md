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
- Add rows for every coverage-target TC in `06_Test-Cases.md`, `Status = todo`: one row when the TC names a single observable boundary, N rows when it names several (next bullet).
- Split matrix-shaped TCs here, at seed time: a TC that names more than one independently observable boundary (several rejection reasons, a status-code matrix, several independent state transitions) is seeded as N rows — one row per boundary, one falsifying oracle each — and every one of those rows carries that `TC-*` in `TC-Refs`. **Count the boundaries over the whole TC row, not over `Expected` alone.** `06_Test-Cases.md` keeps `Steps`, `Expected` and `Notes` in separate columns, so an input matrix (`-1 / 0 / max+1`) commonly sits in `Steps` under one summarising `Expected` ("all rejected"); read `Expected` alone and that TC stays a single row whose RED still stops at the first failing assert. Resolve the `EX-Ref` and `AC-Refs` the row cites and count the boundaries they enumerate too. `TC-Refs` is many-to-many, so N rows naming one `TC-*` is the required shape, not a TC-coverage violation. Rule: `spec-traceability-rules.md` ("A matrix-shaped `TC-*` ... MUST be split across multiple TDD rows before RED begins"). Phase 2b is the only phase that writes rows before RED, so a TC left whole here is never split.
- Name the boundary in a `Boundary` cell on every row, at seed time, while `Test file` is still `-`; a reseed matches rows on the (`TC-*`, `Boundary`) pair and on nothing else. The pair, not the slug: a boundary slug is unique inside one `TC-*` and nowhere wider, so a generic one (`not-found`, `unauthorized`) recurs across TCs and `Boundary` alone would match a sibling of the wrong TC — preserving its `Status` and `Evidence` on this one, or retiring it. `TDD-ID` is a serial and `TC-Refs` repeats identically across sibling rows, so neither tells two rows of one `TC-*` apart — and `Selector` cannot either: it is the runtime test name, and `/qfai-implement` writes a renamed one back to the ledger whenever a review-fix handback replaces the test (`qfai-implement/SKILL.md`, Red step 3b). Matched on `Selector`, that rename reads as one boundary dropped and another added, so it retires a row holding valid `Status` and `Evidence` and appends a `todo` duplicate for a boundary that never changed. `Boundary` is a short slug for the one observable boundary the row owns, is written only here, and is never rewritten downstream; `Selector` stays the execution handle and stays free to change under it. Never reuse one boundary's slug on two rows of a `TC-*`, and never repoint an existing row's `Boundary` at a different boundary — that silently re-scopes a row whose `Evidence` was observed against the old one.
- Delta only, per boundary: a row whose (`TC-*`, boundary) pair is unchanged keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`. The unit of the delta is the boundary, not the `TC-*` — matching on the `TC-*` alone would treat a changed or dropped boundary as unchanged whenever any sibling boundary survives.
- Reconcile changed and removed TCs per boundary: append a `todo` row for a boundary added to a surviving TC; return a changed boundary's row to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in `DR-ID`); retire the row of a boundary dropped from its TC even though that `TC-*` still exists; retire every row of a TC deleted upstream or no longer a coverage target. Never leave a stale `done` row nor a selectable row for a boundary that no longer exists.
- Migrate legacy aggregate rows before applying the delta: a ledger seeded under the old "one row per TC" wording holds a single row for a matrix-shaped TC and carries no `Boundary` column at all. Such a row is **not** unchanged, and the preserve rule above does not protect it. **The migration is one re-scope, not an append plus a separate disposal, and it lands whole or not at all.** Appending the boundary rows while the aggregate row still stands leaves the TC covered twice over: `/qfai-implement` selects the aggregate row and runs the entire matrix as one RED, then runs each boundary again. `constitution/drift-protocol.md` puts adding, removing and re-scoping ledger rows on the upstream path for the same reason, so no half of this is the free half.
- **Gate the whole migration on one approved `CR-*`.** `qfai-implement/references/change-request-reset.md` makes an approved CR whose "Approved actions" enumerate the rows the only sanctioned backward transition, and this migration is driven by the seeding rule changing rather than by an edit to `06_Test-Cases.md`, so an existing project has no such CR yet. Raise it through `constitution/drift-protocol.md`, naming the re-split as the driving change and listing the aggregate rows by `TDD-ID`. Until it is approved, change nothing in the ledger — not the appended rows, not the `Boundary` column — and report the pending CR. A rejected or stalled CR must leave the ledger exactly as it was, not half re-split.
- Once the CR is approved, add the `Boundary` column and dispose of each aggregate row by what it can be mapped to. When its `Selector` names **exactly one** boundary, keep the row for that boundary: write the slug into `Boundary`, reset `Status` to `todo` if it is past `todo` (prior `Evidence` kept under the upstream-reset rule), and append a `todo` row per remaining boundary. When it names none, or names several, **retire it** and append a `todo` row for every boundary of the TC. A reset is not an option there: the row would carry no `Boundary`, stay selectable, and send `/qfai-implement` through the whole matrix as one RED ahead of the split rows — the exact shape this migration exists to remove. Record that `CR-*` in every affected row's `DR-ID` and the rows in the CR's `Resolution`. The re-observation is owed because a single RED stops at the first failing assert, so an aggregate row's evidence proves no boundary in full.
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
