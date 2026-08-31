# Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what
`/qfai-implement` has done and may still do. This file holds its schema and its status rules.

## Required columns

| Column    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-ID    | Unique identifier for the TDD item (e.g., TDD-0001)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| TC-Refs   | References to test cases from `06_Test-Cases.md`. Belongs on `Layer = Unit` / `Component` / `Integration` rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Layer     | Test layer. Legal values: `Unit`, `Component`, `Integration`, `API`, `E2E`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Test file | Path to the test file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Selector  | Test selector(s) for targeted execution — one entry, a comma-separated list, or a glob pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Status    | Current lifecycle status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| DR-ID     | Decision Record / Change Request IDs, comma-separated: a `DR-*` is required for `exception` rows, a `CR-*` for a row reset by an approved Change Request and is retained through that row's later statuses. A row swept out of `exception` by `exception -> todo` **keeps** the anomaly's `DR-*` — that is the only record of why it was parked. **A row that enters `exception` again records a new `DR-*` for the new anomaly**, appended, not substituted: the retained one documents an anomaly already resolved, and `TDDLIST_EXCEPTION_MISSING_DR` only asks that the cell be non-empty and its tokens resolvable, so the stale id alone would pass the gate while the current anomaly has no Decision Record at all. Blank otherwise |
| Evidence  | The RED/GREEN outcome in one word each, plus an anchor into the evidence file this row's `Layer` owns — `.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` / `Integration` row (see "ATDD-owned rows"). **Not** the commands and output themselves — see "Evidence cell contract" below                                                                                                                                                                                                                                                                                                                                                                                                    |

## Declared seam column (optional, required for parallel dispatch)

| Column        | Description                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| Owning module | The production module this row will write, as a repo-relative path or a dotted module path |

`Owning module` is a **declaration, not an observation**, and that is the whole
point: it exists before the code does.

The parallel-dispatch gate asks whether two items write the same source module.
Under RED-first the production module does not exist when `delivery-planner`
has to answer, and the only path-valued required column is `Test file` — two
items trivially have independent test files and land on the same production
module. So the planner had nothing to evaluate against, and
`parallelization-policy.md`'s "cannot be explained with concrete file/module
evidence" asked for exactly what test-first withholds.

- Fill it at ledger-authoring time (`/qfai-sdd` Phase 2b) from the TC's parent
  `BR`, which already names the behaviour's home.
- One module per row. A row that would honestly need two is a row that should
  be split — that is the same signal `selector-granularity.md` describes.
- `-` is legal and means "not declared". A row carrying `-` is **not eligible
  for parallel dispatch**; it may still be executed serially.
- It is a claim the row is later measured against, not a lock. See
  `parallelization-policy.md#seam-reconciliation-after-a-parallel-run`.

## Obligation columns (optional, required by layer)

A row's obligation lives in the column its `Layer` selects. `TC-Refs` is the one
every row has; the other two are optional columns that become required when the
row's layer cannot host a `TC-*`.

| Column       | Description                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| US-Refs      | `US-*` obligations this row implements. Legal **only** on `Layer = E2E` rows                                      |
| CON-API-Refs | `CON-API-*` obligations this row implements. Legal **only** on `Layer = API` rows                                 |
| Blocked-By   | What a `blocked` row is waiting on, and the status it was blocked at. Required on `blocked` rows, blank otherwise |

`Blocked-By` takes a Change Request ID (`CR-YYYYMMDD-NNNN`), a contract path
with line (`.qfai/contracts/db/CON-DB-0005.sql:2715`), or a cross-spec row
(`spec-0006:TDD-0034`), **followed by the status the row was blocked at**
(`CR-20260421-0004 — blocked at green`). **Both halves are written by the
`Any active status -> blocked` transition itself**, because that transition is
the last moment the departure status is observable: a row parked at `blocked`
across a session boundary persists nothing but its `Status` and this cell, and
the resumption needs the departure status both to pick the round it writes into
(`round-evidence.md#what-opens-a-round`) and to compose
`Round N: Resumed-from-blocked`. Writing it only at the resumption asked for
information the block had already destroyed.

**The departure status is one of `todo` / `red` / `green` / `refactor` /
`review-fix`** — the active statuses the inbound edge admits. `blocked` is the
destination, and `done` and `exception` are terminal: neither has work in
flight for a blocker to stop. `TDDLIST_BLOCKED_MISSING_REF` **errors on either
half**: a missing blocker, a cell that names no departure status, and a
departure status outside that set are all the same defect — a `blocked` row
saved in a state no later session can resume from. Enforcing only the blocker
half let a bare `CR-20260729-0008` through, and the next session then had to
guess which round the resumption writes into
(`round-evidence.md#what-opens-a-round`).

`DR-ID` is **not** widened to carry it: that column is
what distinguishes a parked `exception` from a row that never started, and
overloading it would merge the two states the `blocked` status exists to
separate.

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

## Evidence cell contract

The `Evidence` cell is a **pointer**, not the payload.

`.qfai/evidence/implement-<spec-id>.md` is the home — for every row this skill
runs itself; the E2E/API rows use `atdd-<spec-id>.md`, see "ATDD-owned rows"
below — of the per-item
evidence contract — the RED/GREEN commands, their output, and the reviewer
verdicts. The ledger cell records the outcome and says where to read the proof:

```
RED fail / GREEN pass — evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0027`
```

### Why it cannot hold the payload

A GFM table row is **one physical line**, and `splitMarkdownRow` ends a cell at
every unescaped `|`. Pasting a command and its output into the cell has two
failure modes, both silent:

- a newline ends the row — `parseAllMarkdownTables` stops the table at the first
  line that does not start with `|`, so every row below it disappears from the
  ledger the validators read;
- a bare `|` — a shell pipe, a table in the output, a regex alternation — splits
  the row into extra cells and misaligns every column after `Evidence`.

The column description used to read "RED/GREEN command+result pairs proving the
TDD cycle", so following it literally corrupted the evidence or destroyed the
ledger. None of the Evidence hard rules change: they now bind the evidence file,
which can hold what they ask for.

### Evidence cell encoding

When a cell must contain either character, encode it with
`specPackParsers.ts#escapeTableCell` — the exported encoder the parser inverts.
The left column is the character **in the value you want the cell to hold**;
the right column is what is **written into the row**. Both are shown as HTML
entities, because a literal pipe in this table would split its own row.

Exactly two rules:

| Character in the value | Written into the cell |
| ---------------------- | --------------------- |
| a pipe (&#124;)        | &#92;&#124;           |
| CR / LF / CRLF         | a single space        |

A literal `\` is **not** escaped: the parser passes it through unchanged, so
doubling it would corrupt Windows paths and regex literals while keeping the
column count valid — a corruption no validator can see.

## Evidence cell rules (enforced)

`Evidence` is checked as content, not only as a header name. On a row whose
`Status` is `green`, `refactor`, `review-fix` or `done` — the statuses that
assert a cycle has run:

| Finding                        | Fires when                                                          | Severity            |
| ------------------------------ | ------------------------------------------------------------------- | ------------------- |
| `TDDLIST_EVIDENCE_EMPTY`       | the cell is empty or holds only dash placeholders (`-`, `–`, `—`)   | warning, then error |
| `TDDLIST_EVIDENCE_STATUS_ONLY` | the cell claims a verdict (`PASS`, `looks good`, …) with no command | warning             |

A command is recognised by shape, not from a list of known runners, so the rule
holds on any stack: a program name followed by an argument carrying a flag, a
path, a selector or an assignment. Backticked commands and the common runners
are accepted directly.

`TDDLIST_EVIDENCE_STATUS_ONLY` is a warning, waivable under `TDDLIST-004`: a
ledger written before the check exists carries prose verdicts, and failing a
build on them is a migration rather than a gate.

`TDDLIST_EVIDENCE_EMPTY` is inside a **promotion window**: it is reported as a
warning until the release the finding itself names, and as an error from that
release onwards. An empty cell is unambiguous and the rule is not in doubt — but
it also fires on cells written before the check existed, so an upgrade that
started erroring on them would latch a gate that was passing. The finding text
states which release ends the window, so `--fail-on error` keeps working while
the ledger shows the debt it will owe.

**A row already at a terminal status satisfies this by backfilling the cell in
place.** Writing the outcome and its evidence pointer into `Evidence` is not a
status transition, needs no transition, and is not drift: it records a cycle
that already ran. Do not move a `done` row backwards to satisfy it — `done` has
no outgoing edge, and the backward move would be the actual violation. Where the
run is genuinely gone, the loss is itself the thing to record: add a backfill
entry to the evidence file stating what was run and that its output was not
retained, then point the cell at that entry. The cell stays a pointer — prose
about a missing run is a payload, and the section above says why a payload in
the cell corrupts the ledger.

Rows at `todo`, `red` and `exception` are not checked — the first two have
nothing to show yet, and a parked row records its reason in `DR-ID`, which
`TDDLIST_EXCEPTION_MISSING_DR` gates.

Freshness is **not** gated: the ledger records no run identity, so no validator
can distinguish a fresh command+result pair from a copied one. That rule stays
with the routed reviewer (`qfai-implement/SKILL.md` "Evidence hard rules").

A pointer cell satisfies these rules: the `evidence at <path>` form carries a
path, which is one of the command shapes the gate accepts. The rules reject a
bare verdict, not a pointer.

## Selector granularity (MUST)

`Selector` is **not** restricted to a single test function: a row may own several entries, written
as a comma-separated list or a glob. What is restricted is what a row may _conflate_ — **one
independently observable boundary per selector entry**, with RED observed per entry, and a
matrix-shaped `TC-*` decomposed across rows before RED begins (`TC-Refs` is many-to-many with
`TDD-ID`). A selector that accumulates unrelated boundaries invalidates the RED observation. Rules
and examples: `selector-granularity.md`.

## Status Lifecycle

Valid status values: `todo`, `blocked`, `red`, `green`, `refactor`, `review-fix`, `done`, `exception`.

### Allowed transitions

This list is the complete one. `qfai-implement/SKILL.md` summarises it and
`TDDLIST_EXCEPTION_PARKED` links here; both defer to what follows.

- Any active status -> `blocked` (the row cannot proceed: an upstream defect, an
  unresolved Change Request, or an unfinished row in another spec). Name the
  blocker **and the status the row is leaving** in `Blocked-By`
  (`CR-20260421-0004 — blocked at green`) — that cell is the only place the
  departure status survives the session, and every later read of it depends on
  it being written here rather than reconstructed;
  `TDDLIST_BLOCKED_MISSING_REF` errors when either half is absent, and when
  the departure status is not one the edge admits.
  **The source is not restricted to `todo`**, and mirrors the `exception` edge
  below for the same reason: all three blockers named here surface when the work
  reaches them — an upstream defect when the GREEN implementation hits it, a
  cross-spec row found unfinished when the integration is wired, a Change
  Request raised _because_ this row exposed the conflict — so the row is
  usually already at `red`, `green` or `refactor`. With `todo` as the only
  source those rows had nowhere legal to record the blocker: `exception` would
  silently satisfy completion, the upstream reset needs an approved `CR-*` that
  by definition does not exist yet, and leaving the row at `green` throws away
  the `Blocked-By` this status exists to hold and re-derives the determination
  on every pass.
- `blocked` -> `todo` (the blocker cleared **with this row's obligation
  intact**). This is a **resumption, not a backward transition**: nothing
  upstream changed, so nothing is being undone. **An approved Change Request is
  not this edge.** A row blocked on an unresolved `CR-*` may take it only when
  that CR resolved **without moving what the row owes** — `rejected` or
  `superseded`, an upstream defect fixed inside the same obligation, a
  cross-spec row finished. **Those are status values a Change Request can
  actually hold**: the template and `constitution/drift-protocol.md` step 2
  define the set as `open` / `approved` / `rejected` / `superseded`, and
  `change-request-reset.md` reads exactly `approved`, `rejected` and
  `superseded` as resolved. There is no `withdrawn`; naming it here told an
  operator to park a CR in a status the mandatory preflight still counts as
  unresolved, so the row resumed while spec completion stayed shut. Retire a CR
  nobody will apply as `rejected` — `superseded` when another CR replaced it.
  **When the CR is approved and changes the obligation the row
  leaves `blocked` by the upstream reset below**, not here: `any status` ->
  `todo` with the approving `CR-*`/`DR-*` recorded in `DR-ID` and cited in
  `Evidence`, and the downstream sweep `constitution/drift-protocol.md` step 5
  requires. Reading "nothing upstream changed" as unconditional is how a row
  re-uses, as a mere resumption, the implementation and evidence that approval
  withdrew — and skips both the record of why and the sweep of the rows that
  moved with it.
  The row **restarts its cycle from `todo`** and owes a fresh RED — a blocker
  that stopped a row mid-cycle has almost always moved the tree its earlier RED
  was observed on. Its rounds so far are **retained, not discarded**: the round
  blocks already written stay in the evidence file, and the resumed cycle
  records `Resumed-from-blocked` on the round it writes into
  (`round-evidence.md`) — the blocker copied out of `Blocked-By`, which this
  transition clears, plus the status the row was blocked at. **Which round it
  writes into depends on whether the block left a round open**, and the
  departure status `Blocked-By` recorded is what says: a block taken at `red`,
  or at `review-fix` after the rework had taken its RED, interrupted a round
  that never got its GREEN pair, so the resumed cycle **continues that round**
  — **retaining the interrupted RED run** rather than overwriting it, per
  `round-evidence.md`, or writing the RED as that round's first observation
  when the block landed before any run existed to retain; a block taken at
  `green` or at `refactor` left every round closed, so the resumed cycle opens
  **the next round** under `round-evidence.md`'s numbering, and so does a block
  taken at `todo` — **round 1 only on a row carrying no rounds**, since an
  approved upstream reset and `exception` -> `todo` both return a row to `todo`
  with its earlier rounds retained. A block taken at `review-fix` before the
  rework opened a round follows the path that `REVISE` took, recorded on that
  round's reviewer verdict: the behaviour-preserving path **opens no round on
  resumption either** and returns through a refreshed `Refactor verify` pair.
  **A row blocked at
  `review-fix` still owes its reviewer the rework**: the resumption does not
  discharge the `REVISE`, and the restarted cycle re-submits at `refactor`
  exactly as the ordinary `review-fix` -> `refactor` return does. **When the block
  happened at `green` or `refactor` this row's own implementation is still
  there, so that fresh RED passes on its first run — that is the
  falsifiability path of `red-not-observable.md`, not `exception`.**
  `Satisfied-by` names this row's own retained round, the one case where it
  names the row itself; the `Resumed-from-blocked` field and the round block
  left behind are the audit trail a sibling row id provides in the ordinary
  case. Weakening the correct test
  until it fails is forbidden here as everywhere.
- `todo` -> `red` (write a failing test)
- `red` -> `green` (make the test pass with minimal code)
- `green` -> `refactor` (improve code quality while keeping tests green)
- `refactor` -> `done` (item complete)
- `refactor` -> `review-fix` (a blocking reviewer returned `REVISE`)
- `review-fix` -> `refactor` (rework complete; re-submit to the reviewer)
- Any active status -> `exception` (anomaly detected; record DR-ID in DR-ID column)
- **Any status** -> `todo` — **upstream reset**, the only legal reopen,
  available from every status a row can hold, `blocked` and `review-fix`
  included. This list is the complete one and an unlisted edge is prohibited,
  so enumerating five sources here forbade the sweep
  `constitution/drift-protocol.md` step 5 requires of exactly those two.
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

- `refactor` -> `red` (**QA rejection recovery**): a routed
  `qa-gatekeeper` returned `REVISE` on this row's RED/GREEN evidence because the
  cycle itself was wrong. Batched (T1) review defers that confirmation until
  after the row has left `red`, so without this edge a rejected row could never
  redo the RED it was faulted for and could never reach `done`. Cite the verdict
  in `Evidence`, re-run the micro-cycle; rules:
  `volume-policy.md#group-formation-states-and-transitions`.

Any edge not listed above is prohibited. Attempting `green` -> `red` must
produce: `"Backward transition prohibited: green -> red"`.

**"Backward" is narrower than "moves to an earlier status".** All four edges
below return a row to an earlier state, and **three of them are not backward
transitions** — a resumption, an anomaly exit and the rework edge each restart
an earlier phase of the row's own cycle with nothing upstream changed. The
third, the approved Change Request reset, **is** the one sanctioned backward
transition: an upstream obligation moved and the row's completed work is
withdrawn. The column below therefore asks why each edge is _legal_, not why it
is not backward:

| Edge                                      | Why it is legal                                     | Approval needed |
| ----------------------------------------- | --------------------------------------------------- | --------------- |
| `blocked` -> `todo`                       | resumption — the row restarts its own cycle         | none            |
| `exception` -> `todo`                     | anomaly resolved — nothing upstream changed         | none            |
| **any status** -> `todo` (upstream reset) | owner-approved re-entry, cycle restarts from `todo` | approved `CR-*` |
| `refactor` -> `red`                       | QA rejection recovery on this row's own evidence    | `qa-gatekeeper` |

The first, second and fourth rows are **re-entries, not backward transitions**:
they return a row to an earlier phase of its own cycle without any upstream
change. The approved Change Request reset is the one **sanctioned backward
transition** — an upstream obligation moved, so the row's completed work is
withdrawn. The distinction is the whole reason the column above asks why each
edge is _legal_ rather than why it is not backward: three of them are not, one
of them is and is authorised. `final-checklist.md` carries the same carve-out,
so a run that performs an approved reset can still tick it. Preconditions and
the reset procedure: `references/change-request-reset.md`.

**The reset admits every source status**, not the five a run is most likely to
be in. `constitution/drift-protocol.md` step 5 sweeps the ledger with
`any status -> todo`, and a row sitting at `blocked` or `review-fix` when the
upstream obligation moved is exactly a row that has to be swept. Enumerating
the sources here let this table forbid a transition the Protocol requires, so
a preflight that hit one had nothing legal left to do.

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

## ATDD-owned rows

A row whose `Layer` is `E2E`, `API` or `Integration` — Integration among them
because `QFAI-ATDD-112` covers every `L3` TC, and every TC with no declared
`Level`, from `tests/integration/**`, and that stage's P4 writes those tests.
These rows live in this ledger and follow
every rule above, but their tests are authored by `/qfai-atdd`
(`qfai-implement/SKILL.md` Non-goals). The two skills
therefore share one lifecycle, and the ordering that skill works in makes the
RED question different rather than absent.

`/qfai-atdd` does **not** write production code — `agent-routing.yml` gives its
implementation phase `acceptance-test-engineer`, who owns acceptance tests, and
no backend or frontend agent. The surface a journey needs is built by this
skill's Phase Green, from the RED that stage handed over. What makes the RED
question different there is ordering, not ownership: the work orders that build
a spec's surfaces often run before the journey is written, and a test written
after its surface passes on the first run. So:

- **There is no waiver here.** `todo -> red` still requires an admissible RED,
  and a first-run pass is still not one.
- **The falsifiability path is the answer, not `exception`.**
  `red-not-observable.md` already defines the substitute — record
  `Satisfied-by`, mutate the predicate the journey asserts on, watch this row's
  test fail, restore, and record `Falsifiability command` /
  `Falsifiability result` beside the GREEN pair. It was written for an
  obligation a sibling row had already satisfied; a journey whose surface the
  same cycle just built is the same situation with the sibling being the
  surface work. `qa-gatekeeper` accepts that form, and the row proceeds to
  `green` and `done`.
- **`/qfai-atdd` also has a first branch this ledger cannot see**: writing the
  journey against the tree _before_ the surface exists, which produces an
  ordinary RED. Its stage gate P1b is where that happens.
- **The evidence file follows the stage that produced it.**
  `implement-<spec-id>.md` holds the rows this skill runs itself;
  `atdd-<spec-id>.md` holds `## Ledger rows advanced` for the E2E/API rows,
  because that is the stage that ran the commands. The `Evidence` cell is a
  pointer either way and its anchor names which file. Calling
  `implement-<spec-id>.md` the single home was true while one stage produced
  every pair; it stopped being true the moment another stage did.
  `qfai-implement/SKILL.md`'s completion item 10 reads the same split, so an
  E2E/API row whose anchor names the ATDD file reaches `done`; items 11 and the
  matching prohibition condition append the two reviewer verdicts to **that**
  file. This skill still runs `completion-reviewer` and
  `implementation-reviewer` for every row it advances — only the RED provenance
  came from elsewhere.
- **`exception` is for a row where both are unavailable** — an obligation with
  no persisted form or no observable surface at L5, recorded with a `DR-*`
  naming what is missing. It is not the routine outcome of surface-first
  ordering. A spec whose ATDD rows are all `exception` has recorded that the
  provenance step was skipped, not that the obligations were unverifiable.

## Blocked rows

`blocked` means **cannot proceed**, not "not started yet" and not "anomaly".

- It is reachable from **any active status**, not only from `todo`. "Cannot
  proceed" covers "cannot be started" and is not narrower than it: a row whose
  blocker surfaced at `red`, `green` or `refactor` is the common case, and it
  files the blocker here rather than at `exception`. The transition records
  **both** the blocker and the status it left in `Blocked-By`, and
  `TDDLIST_BLOCKED_MISSING_REF` errors on a row missing either — the departure
  status is what the resumption reads to pick its round.
- It is **completion-prohibiting**, exactly like `todo`. A spec must not close
  over an unimplemented obligation, and naming the blocker does not discharge it.
- It is **not** selectable. Phase Red picks the first `todo` row and skips
  `blocked` ones, so the loop head stops re-issuing rows that cannot proceed.
  A row blocked mid-cycle is not selectable either — no phase selects `red`,
  `green` or `refactor` — so the status stops the loop at whatever point the
  blocker appeared.
- It is **not** `exception`. `exception` is scoped to an anomaly, requires a
  `DR-*`, and satisfies spec completion — filing a blocked row there would
  silently close the obligation.
- **How it is left depends on how the blocker resolved.** `blocked` -> `todo`
  is the resumption and requires the row's obligation to be unchanged; a
  `CR-*` that was **approved** and moved the obligation takes the row out by
  the approved `any status` -> `todo` upstream reset instead, with the CR/DR
  recorded and the downstream sweep run. Both land the row at `todo`, and only
  the first lets it re-use its retained rounds.
- `npx qfai report` counts it inside `open` but prints it separately
  (`open: N (blocked: M)`), so "not started" and "cannot start" are readable
  apart without changing what completion means.

## Exception Handling

`exception` means **anomaly, work paused** — not "accepted risk, closed". The
two are different states sharing one status today; the `DR-ID` distinguishes
them and only the accepted-risk form is completion-satisfying. Resolve a paused
item via `exception` -> `todo`.

When transitioning to `exception`:

- A DR-ID (Decision Record ID) must be recorded in the DR-ID column.
- A retained `CR-*` does not satisfy this: it records the approved reopen, not the anomaly. Add the `DR-*` alongside it (`DR-NNNN, CR-YYYYMMDD-NNNN`).
- If the DR-ID column is empty, or holds `CR-*` references only, emit error: `"exception status requires DR-ID in DR-ID column"`.

### Where the Decision Record is written

Write it to `.qfai/decisions/DR-<id>-<slug>.md`, beside the Change
Requests, using the same `DR-*` ID scheme those files declare. Do **not** write
`07_Decisions.md` or `09_delta.md`.

Those two are upstream SSOT (`constitution/drift-protocol.md#core-rule`) and
this skill carries `[DRIFT-PROTOCOL:MANDATORY]`, so a downstream write to either
is a protocol violation — while the `exception` transition itself is an ordinary
inline step of Phase Red that `TDDLIST_EXCEPTION_MISSING_DR` blocks at `error`
without a `DR-*`. `.qfai/decisions/` is the one home that satisfies both: the
protocol whitelists **creating** a record there
(`drift-protocol.md#allowed-exceptions-minimal-whitelist`), and the managed `.gitignore` block
already tracks it as a governance record.

The upstream cross-reference is a separate, later write. If the anomaly turns
out to change an approved obligation, that is drift: raise a Change Request per
`drift-protocol.md#when-drift-is-detected`, and the owner skill's rerun is what
records the reference in `07_Decisions.md` / `09_delta.md`. Parking the row does
not require that to have happened.

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
