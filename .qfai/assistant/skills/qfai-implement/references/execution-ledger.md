# Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what
`/qfai-implement` has done and may still do. This file holds its schema and its status rules.

## Required columns

| Column    | Description                                                                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-ID    | Unique identifier for the TDD item (e.g., TDD-0001)                                                                                                                                                                         |
| TC-Refs   | References to test cases from `06_Test-Cases.md`. Belongs on `Layer = Unit` / `Component` / `Integration` rows                                                                                                              |
| Layer     | Test layer. Legal values: `Unit`, `Component`, `Integration`, `API`, `E2E`                                                                                                                                                  |
| Test file | Path to the test file                                                                                                                                                                                                       |
| Selector  | Test selector(s) for targeted execution — one entry, a comma-separated list, or a glob pattern                                                                                                                              |
| Status    | Current lifecycle status                                                                                                                                                                                                    |
| DR-ID     | Decision Record / Change Request IDs, comma-separated: a `DR-*` is required for `exception` rows, a `CR-*` for a row reset by an approved Change Request and is retained through that row's later statuses; blank otherwise |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle                                                                                                                                                                        |

## Obligation columns (optional, required by layer)

A row's obligation lives in the column its `Layer` selects. `TC-Refs` is the one
every row has; the other two are optional columns that become required when the
row's layer cannot host a `TC-*`.

| Column       | Description                                                                       |
| ------------ | --------------------------------------------------------------------------------- |
| US-Refs      | `US-*` obligations this row implements. Legal **only** on `Layer = E2E` rows      |
| CON-API-Refs | `CON-API-*` obligations this row implements. Legal **only** on `Layer = API` rows |

`test-layers.md` forbids `TC-*` annotations in `tests/e2e/**` and `tests/api/**`,
so an E2E or API row has no legal `TC-Refs` value. Those rows carry `-` in
`TC-Refs` and record their obligation in `US-Refs` / `CON-API-Refs` instead.

The binding is enforced in both directions: a `TC-*` on an E2E/API row raises
`TDDLIST_OBLIGATION_LAYER_MISMATCH` and is **not** counted towards TC coverage,
so a forbidden placement cannot close a coverage-target TC.
`TDDLIST_OBLIGATION_LAYER_MISMATCH` likewise rejects a `US-Refs` /
`CON-API-Refs` value on a layer that does not own it.

A `Layer` outside the legal values raises `TDDLIST_UNKNOWN_LAYER` (warning) —
without a legal `Layer` the row has no obligation column. Coverage counting
excludes `API` and `E2E` specifically rather than allowlisting the other three,
so a mistyped layer keeps counting and is reported by that warning, which names
the real cause; an allowlist would instead drop the row silently and resurface
as a coverage error about a TC the author did cover.

Coverage measurement is otherwise unaffected: it reads `TC-*` tokens only, so
non-TC obligation IDs are inert to it by design.

## Evidence cell rules (enforced)

`Evidence` is checked as content, not only as a header name. On a row whose
`Status` is `green`, `refactor`, `review-fix` or `done` — the statuses that
assert a cycle has run:

| Finding                        | Fires when                                                          | Severity |
| ------------------------------ | ------------------------------------------------------------------- | -------- |
| `TDDLIST_EVIDENCE_EMPTY`       | the cell is empty or holds only dash placeholders (`-`, `–`, `—`)   | error    |
| `TDDLIST_EVIDENCE_STATUS_ONLY` | the cell claims a verdict (`PASS`, `looks good`, …) with no command | warning  |

A command is recognised by shape, not from a list of known runners, so the rule
holds on any stack: a program name followed by an argument carrying a flag, a
path, a selector or an assignment. Backticked commands and the common runners
are accepted directly.

`TDDLIST_EVIDENCE_STATUS_ONLY` is a warning, waivable under `TDDLIST-004`: a
ledger written before the check exists carries prose verdicts, and failing a
build on them is a migration rather than a gate. An empty cell is unambiguous,
so `TDDLIST_EVIDENCE_EMPTY` stays at `error`.

Rows at `todo`, `red` and `exception` are not checked — the first two have
nothing to show yet, and a parked row records its reason in `DR-ID`, which
`TDDLIST_EXCEPTION_MISSING_DR` gates.

Freshness is **not** gated: the ledger records no run identity, so no validator
can distinguish a fresh command+result pair from a copied one. That rule stays
with the routed reviewer (`qfai-implement/SKILL.md` "Evidence hard rules").

## Selector granularity (MUST)

`Selector` is **not** restricted to a single test function: a row may own several entries, written
as a comma-separated list or a glob. What is restricted is what a row may _conflate_ — **one
independently observable boundary per selector entry**, with RED observed per entry, and a
matrix-shaped `TC-*` decomposed across rows before RED begins (`TC-Refs` is many-to-many with
`TDD-ID`). A selector that accumulates unrelated boundaries invalidates the RED observation. Rules
and examples: `selector-granularity.md`.

## Status Lifecycle

Valid status values: `todo`, `red`, `green`, `refactor`, `review-fix`, `done`, `exception`.

Allowed transitions:

- `todo` -> `red` (write a failing test)
- `red` -> `green` (make the test pass with minimal code)
- `green` -> `refactor` (improve code quality while keeping tests green)
- `refactor` -> `done` (item complete)
- `refactor` -> `review-fix` (a blocking reviewer returned `REVISE`)
- `review-fix` -> `refactor` (rework complete; re-submit to the reviewer)
- Any active status -> `exception` (anomaly detected; record DR-ID in DR-ID column)
- `red` | `green` | `refactor` | `done` | `exception` -> `todo` — **upstream
  reset**, the only legal reopen, available from every status a row can hold.
  Permitted **only** when an approved upstream change (Drift Protocol step 4
  rerun) invalidated the row's obligation. The invalidating CR/DR ID MUST be
  recorded in the `DR-ID` column, and the reset MUST cite it in `Evidence`.
  That ID MUST be retained as the row moves on through `red`, `green`,
  `refactor` and `done` — clearing it on the next transition erases the only
  record of why a completed row was reopened. A row swept out of `exception`
  keeps the anomaly's DR-ID alongside the reset ID. A reset without a recorded
  approval is a backward transition and is prohibited.
- `exception` -> `todo` — **anomaly resolved**, the item re-enters the cycle
  from the start. This is the exit `exception` previously lacked; without it a
  parked item could never be un-parked without a lifecycle violation. Distinct
  from the upstream reset above: nothing upstream changed, so it needs no CR/DR
  approval — the anomaly's own DR-ID stays in place.
- A reset row is at `todo`, so it owes no test file until it reaches `green`.
  The `Test file` existence check is unchanged for `green` / `refactor` /
  `done`: those statuses assert a test that ran.

- `refactor` -> `red` (**QA rejection recovery — the only re-entry**): a routed
  `qa-gatekeeper` returned `REVISE` on this row's RED/GREEN evidence because the
  cycle itself was wrong. Batched (T1) review defers that confirmation until
  after the row has left `red`, so without this edge a rejected row could never
  redo the RED it was faulted for and could never reach `done`. Cite the verdict
  in `Evidence`, re-run the micro-cycle; rules:
  `volume-policy.md#group-formation-states-and-transitions`.

Backward transitions are otherwise prohibited and nothing but that QA rejection
re-opens a row. Attempting `green` -> `red` must produce:
`"Backward transition prohibited: green -> red"`. The upstream reset above is
not a backward transition: it is an owner-approved re-entry, and the row starts
its cycle again from `todo`.

The one exception is an approved Change Request reset — the only sanctioned
backward transition. Preconditions and the reset procedure:
`references/change-request-reset.md`.

### Reviewer rework is not a backward transition

A blocking reviewer's `REVISE` moves the item `refactor -> review-fix`. While at
`review-fix` the item MAY re-enter the RED/GREEN cycle as many times as the
rework needs — write the new failing test, watch it fail, make it pass — without
any of those runs counting as a backward transition. The row's status does not
change during that cycle: `review-fix -> red` and `review-fix -> green` are not
allowed transitions. When the rework is done the item returns to `refactor` and
is re-submitted.

`review-fix` is not a completion state and appears in the completion-prohibition
list. Round-by-round evidence rules: `round-evidence.md`.

## Exception Handling

`exception` means **anomaly, work paused** — not "accepted risk, closed". The
two are different states sharing one status today; the `DR-ID` distinguishes
them and only the accepted-risk form is completion-satisfying. Resolve a paused
item via `exception` -> `todo`.

When transitioning to `exception`:

- A DR-ID (Decision Record ID) must be recorded in the DR-ID column.
- A retained `CR-*` does not satisfy this: it records the approved reopen, not the anomaly. Add the `DR-*` alongside it (`DR-NNNN, CR-YYYYMMDD-NNNN`).
- If the DR-ID column is empty, or holds `CR-*` references only, emit error: `"exception status requires DR-ID in DR-ID column"`.

### Parked items and the `TDDLIST-001` waiver

Every `exception` row raises `TDDLIST_EXCEPTION_PARKED` (warning, rule
`TDDLIST-001`). The validator cannot read the DR to tell a paused defect from an
approved accepted risk, so the approval is recorded where QFAI already checks
approvals: a `TDDLIST-001` waiver in `.qfai/waivers.yml`.

The waiver carries `id` / `reason` / `expires` / `evidence` / `scope.paths`,
plus `match.dl_ids` listing the approved rows' `TDD-ID`s. `match.dl_ids` is not
optional — omit it and `QFAI-WAIVER-005` rejects the waiver, because a single
path-scoped entry would otherwise clear every parked row in the same ledger.

Without a matching waiver the warning stands, which is the intended signal.
