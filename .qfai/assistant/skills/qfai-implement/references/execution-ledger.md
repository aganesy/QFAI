# Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what
`/qfai-implement` has done and may still do. This file holds its schema and its status rules.

## Required columns

| Column    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-ID    | Unique identifier for the TDD item (e.g., TDD-0001). Allocated per `#tdd-id-allocation` — never by guessing the next value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| TC-Refs   | References to test cases from `06_Test-Cases.md`. Belongs on `Layer = Unit` / `Component` / `Integration` rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Layer     | Test layer. Legal values: `Unit`, `Component`, `Integration`, `API`, `E2E`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Test file | Path to the test file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Selector  | Test selector(s) for targeted execution — one entry, a JSON array of entries, or a glob pattern. A cell that is neither array nor glob is **one** entry whatever punctuation it holds; see "Selector granularity" below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Status    | Current lifecycle status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| DR-ID     | Decision Record / Change Request IDs, comma-separated: a `DR-*` is required for `exception` rows, a `CR-*` for a row reset by an approved Change Request and is retained through that row's later statuses. A row swept out of `exception` by `exception -> todo` **keeps** the anomaly's `DR-*` — that is the only record of why it was parked. **A row that enters `exception` again records a new `DR-*` for the new anomaly**, appended, not substituted: the retained one documents an anomaly already resolved, and `TDDLIST_EXCEPTION_MISSING_DR` only asks that the cell be non-empty and its tokens resolvable, so the stale id alone would pass the gate while the current anomaly has no Decision Record at all. Blank otherwise |
| Evidence  | The RED/GREEN outcome in one word each, plus an anchor into the evidence file this row's `Layer` owns — `.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` / `Integration` row (see "ATDD-owned rows"). **Not** the commands and output themselves — see "Evidence cell contract" below                                                                                                                                                                                                                                                                                                                                                                                                    |

## TDD-ID allocation

`TDD-NNNN` is spec-scoped and monotonic, so the next value is `max + 1`
over every table in the file when authoring serially — including retired,
`blocked` and `exception` rows — and comes from a block reserved under
`## TDD-ID reservations` when authors run concurrently. The maximum ranges
over the upper bound of every reservation bullet as well, and those bullets
are never deleted: a consumed or abandoned block is closed in place
(`- ~~TDD-0065..TDD-0079~~ — <author or slice>, closed <YYYY-MM-DD>`) so its
end stays the permanent high-water mark. Drop the bullet and `max + 1` falls
back into the block's unused tail, reissuing ids the gap was meant to retire
and colliding with a block still being worked. A deleted row is tombstoned in
that same section as a single-id bullet
(`- ~~TDD-0002~~ — row deleted <YYYY-MM-DD>, obligation removed by <ref>`):
the Drift Protocol removes such a row rather than resetting it, so without the
tombstone the id leaves the table and the next allocation reissues it. `<ref>`
is a `CR-*` on the Drift Protocol path and the `UPDATE:REMOVE` Triage row's
`Source` (`REQ-XXXX`) on the ordinary `/qfai-sdd` path, which raises no Change
Request — demanding a `CR-*` there leaves nothing true to write and the
tombstone gets skipped. An
empty candidate set has a
maximum of 0, so a freshly seeded ledger starts at `TDD-0001`; `TDD-9999` is
the last legal id, because `TDD_ID_FORMAT` accepts exactly four digits — a
spec that reaches the ceiling rolls over under an approval-required Triage
row, SPLIT when it owns more than one `CAP-NNNN` and SUPERSEDE when it owns
exactly one (a count-driven SPLIT of a single-capability spec is rejected at
`error`), never allocated past. Both exits assume the ceiling came from
churn; count the still-live rows to tell. Near 9999 they gain nothing — the
successor reseeds to the same ceiling from the same obligations — and the
answer is upstream scope, not allocation. Worktree
separation is
mandatory for parallel work (`.qfai/assistant/constitution/workflow.md`), so a `max + 1` read
taken inside one worktree is stale as soon as another appends, and
`TDDLIST_DUPLICATE_ID` is an `error`: guessing locks out every writer but the
last. Reserve the block on the shared branch **before** the worktrees split —
it is a one-line bullet append, so it serializes where a batch of rows cannot.
Never renumber an id that has already been written outside this ledger (a
commit message, `.qfai/evidence/implement-*.md`, `.qfai/evidence/atdd-*.md`, a
`DR-*` cross-reference); a merge does not rewrite those. Full rule, including
the reservation bullet's shape and why it must not be a markdown table:
`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`.

## Declared tier column (optional, seeded at ledger-authoring time)

| Column | Description                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------ |
| Tier   | Review tier `/qfai-implement` owes this row. Legal values: `T1`, `T2`, `T3`; `-` when undeclared |

`Tier` sizes the ceremony a row is processed with
(`volume-policy.md#risk-tier-derive-per-row`). Like `Owning module` it is a
**declaration made upstream**, and for the same reason: the stage that fixes a
row's `Layer` already holds every input the tier derivation takes, and the
consumer needs the answer _before_ it starts the row.

- Fill it at ledger-authoring time (`/qfai-sdd` Phase 2b), from the row's
  `Layer`, what the item touches, and the criticality list in
  `volume-policy.md#criticality-outranks-connectedness`.
- **Blank or `-` means `T1`.** The default runs this way round only because the
  tier is seeded rather than claimed: a row nobody escalated is a row nobody
  found a reason to escalate. A ledger **table** carrying no `Tier` column is
  not covered by that default — read the header of the table the row lives in,
  not the file, because `/qfai-implement` appends a table per change request and
  a seeded table can sit beside one that predates the column. Derive the tier of
  every row in that table before processing it.
- **Never record it in `Evidence`.** That cell is a pointer, not the payload
  ("Evidence cell contract" below), and it is written last, by the agent whose
  ceremony the tier was supposed to size. A tier kept there cannot be read
  before the work it governs, which is what made `T1` unreachable.
- A value outside `T1` / `T2` / `T3` raises `QFAI-TDDLIST-010` (error).
  Blank buys the cheapest tier, so a mistyped one must not quietly buy it too.

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

## Group key column (optional, required for T1 batching)

| Column | Description                                                                            |
| ------ | -------------------------------------------------------------------------------------- |
| BR-Ref | The single `BR-*` this row serves — the review-group key `volume-policy.md` batches on |

`volume-policy.md` opens, fills and closes a T1 review group with a predicate
over "the BR/AC this row belongs to", and no other column carries that value.
`TC-Refs` reaches an `AC` only through `06_Test-Cases.md`, and reaches a `BR`
only by scanning `04_Business-Rules.md`'s `AC-Refs` **backwards**;
`Owning module` is a module path, and two BRs can share one, so it is not a
proxy for the key. Without `BR-Ref` a run either never closes a group — and an
open group is a completion prohibition — or closes one per row, which is T2
behaviour at T1 cost.

- Fill it at ledger-authoring time (`/qfai-sdd` Phase 2b), the one point where
  `03`, `04`, `05` and `06` are all open. That is where `Owning module` is
  resolved from the same join.
- **One `BR-*` per row.** Resolve it per TC the row's `TC-Refs` name, taking the
  direct edge first:
  1. **`TC` -> `EX` -> `BR`.** Read the TC's `EX-Ref` in `06_Test-Cases.md`,
     then that `EX`'s `BR-Ref` in `05_Examples.md`. `EX-Ref` is single-valued,
     so this edge names the rules the row actually verifies. An `EX` covering a
     cohesive rule bundle may list **several** `BR-*` in that one cell; take
     all of them.
  2. **Only for a TC with no `EX-Ref`:** take the ACs it names in
     `06_Test-Cases.md` and every `BR` whose `AC-Refs` names one of them in
     `04_Business-Rules.md`.

  Collect the **union** of every `BR-*` reached this way and keep the
  **lowest-numbered** `BR-*` of it. The tie-break applies to the whole union, never
  only to the several-`TC-Refs` case: a single `EX` naming
  `BR-0001-0002, BR-0001-0001` is already ambiguous, and without the tie-break
  two agents reading the same valid spec derive different keys — or none. Two
  agents applying it reach the same value, which is what makes the group
  boundary reproducible. Going straight to the AC join misattributes: a TC
  pinned through its `EX` to one `BR` would be filed under the lowest-numbered
  `BR` merely sharing its `AC`, and rows verifying different rules would land
  in one review unit.

- `-` is legal and means "not resolved" — no `BR` reaches the row's TCs, or the
  row has no `TC-Refs` at all (an `E2E` / `API` row). **An empty cell is the
  same state as `-`**, in the validator and in `volume-policy.md` alike: it is
  never read as a key rows share. A row carrying either is **not eligible for
  batching**: it forms a group of one and is reviewed alone. That is the safe
  direction; the unsafe one is a group that never closes.
- It is a grouping key, not an obligation. Coverage counting reads `TC-*` tokens
  only, so `BR-Ref` is inert to it.
- The column is optional to `npx qfai validate` — the required set above is what it
  enforces, so a ledger seeded before the column keeps passing — but a ledger
  that **declares** it has its cells checked: `QFAI-BRREF-001` (not a
  single `BR-NNNN` or `BR-NNNN-NNNN`, and not `-` — an empty cell reads as `-`),
  `QFAI-BRREF-002` (no such rule in the spec's Business Rules file) and
  `QFAI-BRREF-003` (a real rule, but not the one the procedure above derives
  from this row's own `TC-Refs` — the validator recomputes it and names the
  expected value). All three open at `warning` so that a ledger written against
  an older rules file does not start failing CI on upgrade — but **that is a
  migration window, not the permanent severity**. The window closes at a named
  release, after which all three are `error` and `validate --fail-on error`
  fails on them; each finding states the release in its own message while the
  window is open, so read it there rather than assuming the warning is
  indefinite. `QFAI-BRREF-002` reads declarations from a table's
  `BR-ID` column and from `## BR-NNNN-NNNN` headings only, so a rule named in an
  auxiliary table — a `| Superseded | Reason |` list of retired ids is the plain
  case — does not make a key resolve.

## Obligation columns (optional, required by layer)

A row's obligation lives in the column its `Layer` selects. `TC-Refs` is the one
every row has; `US-Refs` and `CON-API-Refs` become required when the row's layer
cannot host a `TC-*`, and `Blocked-By` is required on a `blocked` row.

Full rule — the column table, what `Blocked-By` accepts, why `DR-ID` is not
widened to carry it, and who seeds the two layer columns:
`obligation-columns.md`.

## Evidence cell contract

The `Evidence` cell is a **pointer**, not the payload.

`.qfai/evidence/implement-<spec-id>.md` is the home — for every row this skill
runs itself; the **ATDD-owned** rows use `atdd-<spec-id>.md`, which is the
`E2E` / `API` / `Integration` rows less the two exceptions that stay here, see
"ATDD-owned rows" below — of the per-item evidence contract — the RED/GREEN
commands, their output, and the reviewer verdicts. The ledger cell records
the outcome and says where to read the proof:

### The grammar (MUST)

There is **one** legal shape, capped at **240 characters**, and every half of
its anchor is bound to the row: `evidence-cell-grammar.md`. The findings that
police it are in "Evidence cell rules (enforced)" below.

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

| Finding                        | Fires when                                                                              | Severity            |
| ------------------------------ | --------------------------------------------------------------------------------------- | ------------------- |
| `TDDLIST_EVIDENCE_EMPTY`       | the cell is empty or holds only dash placeholders (`-`, `–`, `—`)                       | warning, then error |
| `TDDLIST_EVIDENCE_STATUS_ONLY` | the cell claims a verdict (`PASS`, `looks good`, …) with no command                     | warning             |
| `QFAI-TDDLIST-011`             | the cell does not match the grammar above                                               | warning, then error |
| `QFAI-TDDLIST-012`             | the cell is longer than 240 characters                                                  | warning, then error |
| `QFAI-TDDLIST-013`             | `RED:n-a` on an ATDD-owned row                                                          | error               |
| `QFAI-TDDLIST-007`             | a `done` row's cell carries no anchor at all                                            | warning, then error |
| `QFAI-TDDLIST-008`             | an `evidence at` pointer names the wrong owner/file/item, or its file/heading is absent | warning, then error |

One more rule reads the row rather than a cell:

| Finding            | Fires when                                              | Severity            |
| ------------------ | ------------------------------------------------------- | ------------------- |
| `QFAI-TDDLIST-014` | the row has more cells than the table's header declares | warning, then error |

A command is recognised by shape, not from a list of known runners, so the rule
holds on any stack: a program name followed by an argument carrying a flag, a
path, a selector or an assignment. Backticked commands and the common runners
are accepted directly.

`TDDLIST_EVIDENCE_STATUS_ONLY` is a warning, waivable under `TDDLIST-004`: a
ledger written before the check exists carries prose verdicts, and failing a
build on them is a migration rather than a gate.

Four findings are inside a **promotion window**: `TDDLIST_EVIDENCE_EMPTY`,
`QFAI-TDDLIST-011`, `QFAI-TDDLIST-012` and `QFAI-TDDLIST-014` are reported as
warnings until the release each finding itself names, and as errors from that
release onwards. Each rule is right and none is in doubt — but each also fires
on ledgers written before the check existed, so an upgrade that started erroring
on them would latch a gate that was passing. An empty cell was always wrong; the
grammar, the cap and the surplus column arrive with the change that made
`Evidence` a pointer, so they land on every cell written while the column was
documented as holding the commands and their output. The finding text states
which release ends the window, so `--fail-on error` keeps working while the
ledger shows the debt it will owe.

**A row already at a terminal status satisfies this by backfilling the cell in
place.** Writing the outcome and its evidence pointer into `Evidence` is not a
status transition, needs no transition, and is not drift: it records a cycle that
already ran. Do not move a `done` row backwards to satisfy it — `done` has no
outgoing edge, and the backward move would be the actual violation. Where the run is
genuinely gone, the loss is itself the thing to record: add a backfill entry to the
evidence file stating what was run and that its output was not retained, then point
the cell at that entry. The cell stays a pointer — prose about a missing run is a
payload, and the section above says why a payload in the cell corrupts the ledger.

`QFAI-TDDLIST-007` is a warning for the same reason, and is waived under that
code — the stripped `TDDLIST-007` spelling resolves to it too. Every completion
check hangs off the anchor, so a `done` row whose cell is only an outcome —
command-shaped, so the status-only rule passes over it — claimed completion with
no entry, no verdict and no checkpoint behind it. A project that has moved its ledger onto pointers raises this by
failing on warnings; one still migrating waives it per path.

The two grammar findings are warnings for the same reason, waivable under
`QFAI-TDDLIST-011` (malformed) and `QFAI-TDDLIST-012` (oversize). An oversize cell whose
only other fault is prose is reported **once**, as the cap breach: every cell
that outgrew the cap did so by holding prose, so the two are one defect to fix.
A cell that is a well-formed pointer but breaks a **binding** — the RED
provenance its `Layer` owes, the evidence file its `Layer` and spec own, the
section its `TDD-ID` names, or a compatibility marker where none is licensed —
is reported whatever its length. Those ask for a different fix from a cap
breach, and folding them into it would let `QFAI-TDDLIST-012` waive a violation of
which "ATDD-owned rows" says "There is no waiver here".

`RED:n-a` on an ATDD-owned row is the one that carries no waiver at all. It is
its own code, `QFAI-TDDLIST-013`, at `error` — a waiver may only
target `warning` / `info`, so that is how "There is no waiver here" is spelled.
Reported as a `QFAI-TDDLIST-011` warning it shared a rule id with every legacy prose
cell, and waiving the migration silenced it. The other bindings stay warnings:
they are the migration, and a row that never obtained RED provenance is not a
formatting defect the grammar introduced.

`QFAI-TDDLIST-014` is a warning under `QFAI-TDDLIST-014`. Cells are read by
header index, so anything parked past the last declared column is read by
nothing — a conforming `Evidence` cell followed by a surplus column holding the
payload passed both the grammar and the cap with no finding at all.

Rows at `todo`, `red` and `exception` are not checked — the first two have
nothing to show yet, and a parked row records its reason in `DR-ID`, which
`TDDLIST_EXCEPTION_MISSING_DR` gates.

Freshness is **not** gated: the ledger records no run identity, so no validator
can distinguish a fresh command+result pair from a copied one. That rule stays
with the routed reviewer (`qfai-implement/SKILL.md` "Evidence hard rules").

A conforming pointer satisfies these rules: `TDDLIST_EVIDENCE_STATUS_ONLY`
yields to the grammar, so the `GREEN:pass` token in the mandated shape is not
read as a bare verdict, and the path the grammar requires is one of the command
shapes the gate accepts. The rules reject a verdict written as prose, not a
pointer. The pointer is also resolved against the file its row `Layer` owns; a
file that exists only on the machine that produced it does not satisfy the gate
on a fresh clone.

## Selector granularity (MUST)

`Selector` is **not** restricted to a single test function: a row may own several entries, written
as a JSON array of names or a glob. A cell that is neither is **one** entry however much punctuation
it holds — a comma is legal inside a single test name, so nothing splits a bare cell on commas
(`selector-granularity.md#entry-form`). What is restricted is what a row may _conflate_ — **one
independently observable boundary per row**, with RED observed per selector entry, and a
matrix-shaped `TC-*` decomposed across rows before RED begins (`TC-Refs` is many-to-many with
`TDD-ID`), by `/qfai-sdd` Phase 2b, which owns the rows. A selector that accumulates unrelated
boundaries invalidates the RED observation. If you cannot name the single boundary that every
selector entry on a row observes, the row needs splitting — **and that is a request, not a write**:
`/qfai-implement` raises the Change Request and parks the row, and Phase 2b performs the split
(`qfai-implement/SKILL.md`, Phase Red step 1). Rules and examples: `selector-granularity.md`.

## Status Lifecycle

Valid status values: `todo`, `blocked`, `red`, `green`, `refactor`, `review-fix`, `done`, `exception`.

### Allowed transitions

This list is the complete one. `qfai-implement/SKILL.md` summarises it and
`TDDLIST_EXCEPTION_PARKED` links here; both defer to what follows.

- Any active status -> `blocked` (the row cannot proceed: an upstream defect, an
  unresolved Change Request, or an unfinished row in another spec). Name the blocker
  **and the status the row is leaving** in `Blocked-By`
  (`CR-20260421-0004 — blocked at green`) — that cell is the only place the
  departure status survives the session, and every later read of it depends on it
  being written here rather than reconstructed; `TDDLIST_BLOCKED_MISSING_REF` errors
  when either half is absent, and when the departure status is not one the edge
  admits. **The source is not restricted to `todo`**, and mirrors the `exception`
  edge below for the same reason: all three blockers named here surface when the
  work reaches them — an upstream defect when the GREEN implementation hits it, a
  cross-spec row found unfinished when the integration is wired, a Change Request
  raised _because_ this row exposed the conflict — so the row is usually already at
  `red`, `green` or `refactor`. With `todo` as the only source those rows had
  nowhere legal to record the blocker: `exception` would silently satisfy
  completion, the upstream reset needs an approved `CR-*` that by definition does
  not exist yet, and leaving the row at `green` throws away the `Blocked-By` this
  status exists to hold and re-derives the determination on every pass.
  Also write the `.qfai/steering/<id>.md` work-log entry for the stop —
  `Blocked-By` names WHAT the row waits on, the entry is what was tried and what
  the next session picks up. `QFAI-TDDLIST-015` reports while no open
  (non-`archived`) `kind: blocker` / `kind: handoff` entry names this spec —
  through its own `scope:`, or through `links:` on a `scope: global` entry. It is
  a warning inside its migration window and an error from the release the finding
  names, so a stop recorded before the check existed is not an upgrade that fails
  on the spot.
- `blocked` -> `todo` (the blocker cleared **with this row's obligation intact**).
  This is a **resumption, not a backward transition**: nothing upstream changed, so
  nothing is being undone. A row blocked on an unresolved `CR-*` may take it
  whenever that CR resolved **without moving what this row owes** — an upstream
  defect fixed inside the same obligation, a cross-spec row finished, a protected
  artifact repaired. **The test is this row's obligation, not the CR's status.**
  `rejected` and `superseded` never move it, and an `approved` one may or may not:
  an approval that repaired a dependency and left this row's obligation column and
  the sources behind it unchanged is this edge, and only an approval that moved
  them is the upstream reset below. Excluding approval by status left exactly that
  row with no exit at all — this edge refused it for being approved, and the reset
  requires an invalidated obligation it does not have. **Those are status values a
  Change Request can actually hold**: the template and
  `.qfai/assistant/constitution/drift-protocol.md` step 2 define the set as `open` / `approved` /
  `rejected` / `superseded`, and `change-request-reset.md` reads exactly `approved`,
  `rejected` and `superseded` as resolved. There is no `withdrawn`; naming it here
  told an operator to park a CR in a status the mandatory preflight still counts as
  unresolved, so the row resumed while spec completion stayed shut. Retire a CR
  nobody will apply as `rejected` — `superseded` when another CR replaced it. **When
  the CR is approved and changes the obligation the row leaves `blocked` by the
  upstream reset below**, not here: `any status` -> `todo` with the approving
  `CR-*`/`DR-*` recorded in `DR-ID` and cited in `Evidence`, and the downstream
  sweep `.qfai/assistant/constitution/drift-protocol.md` step 5 requires. Reading "nothing upstream
  changed" as unconditional is how a row re-uses, as a mere resumption, the
  implementation and evidence that approval withdrew — and skips both the record of
  why and the sweep of the rows that moved with it. The row **restarts its cycle
  from `todo`** and owes a fresh RED — a blocker that stopped a row mid-cycle has
  almost always moved the tree its earlier RED was observed on. Its rounds so far
  are **retained, not discarded**: the round blocks already written stay in the
  evidence file, and the resumed cycle records `Resumed-from-blocked` on the round
  it writes into (`round-evidence.md`) — the blocker copied out of `Blocked-By`,
  which this transition clears, plus the status the row was blocked at. **Which
  round it writes into depends on whether the block left a round open**, and the
  departure status `Blocked-By` recorded is what says: a block taken at `red`, or at
  `review-fix` after the rework had taken its RED, interrupted a round that never
  got its GREEN pair, so the resumed cycle **continues that round** — **retaining
  the interrupted RED run** rather than overwriting it, per `round-evidence.md`, or
  writing the RED as that round's first observation when the block landed before any
  run existed to retain; a block taken at `green` or at `refactor` left every round
  closed, so the resumed cycle opens **the next round** under `round-evidence.md`'s
  numbering, and so does a block taken at `todo` — **round 1 only on a row carrying
  no rounds**, since an approved upstream reset and `exception` -> `todo` both
  return a row to `todo` with its earlier rounds retained. A block taken at
  `review-fix` before the rework opened a round follows the path that `REVISE` took,
  recorded on that round's reviewer verdict: the behaviour-preserving path **opens
  no round on resumption either** and returns through a refreshed `Refactor verify`
  pair. **A row blocked at `review-fix` resumes at `review-fix`, not at `todo`** —
  the edge below — and still owes its reviewer the rework: the resumption does not
  discharge the `REVISE`, and it re-submits through `review-fix` -> `refactor`
  exactly as the ordinary return does. **When
  the block happened at `green` or `refactor` this row's own implementation is still
  there, so that fresh RED passes on its first run — that is the falsifiability path
  of `red-not-observable.md`, not `exception`.** `Satisfied-by` names this row's own
  retained round, the one case where it names the row itself; the
  `Resumed-from-blocked` field and the round block left behind are the audit trail a
  sibling row id provides in the ordinary case. Weakening the correct test until it
  fails is forbidden here as everywhere.
  **Close the entry that accounted for the stop**: set its `status:` to
  `archived` in the same edit that moves the row. `QFAI-TDDLIST-015` is satisfied
  by any open entry naming the spec, so an entry left open outlives the stop it
  described — resume once and it stands in for every later stop of that spec, and
  forgetting the next work-log entry is never reported. An entry that still
  accounts for something else stays open; write the new stop its own entry rather
  than reusing this one.
- `blocked` -> `review-fix` (the blocker cleared on a row that was blocked
  **while reworking a `REVISE`**, with this row's obligation intact). The same
  resumption as the edge above, differing only in destination, and taken on
  exactly the rows whose `Blocked-By` records `blocked at review-fix`. `todo` is
  the wrong destination for those: it claims the cycle restarts, and a rework has
  no RED phase to restart — `review-fix` does not change across the rework
  (`round-evidence.md#where-the-rounds-happen`), which is why the round and not
  the status is what says how far it got. Sending them to `todo` left the two
  rework paths with no legal move at all: the behaviour-preserving one returns
  through a refreshed `Refactor verify` pair and the other re-submits at
  `refactor`, and neither is an edge out of `todo`: this list carries no jump
  out of `todo` past `red`, by design (`parallelization-policy.md`). Everything else is as
  the edge above: `Blocked-By` is cleared, the rounds are retained, and the
  resumption records `Resumed-from-blocked` on the round it writes into.
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
  `.qfai/assistant/constitution/drift-protocol.md` step 5 requires of exactly those two.
  Permitted **only** when an approved upstream change (Drift Protocol step 4
  rerun) invalidated the row's obligation. The invalidating CR/DR ID MUST be
  recorded in the `DR-ID` column, and the reset MUST cite it in `Evidence`.
  That ID MUST be retained as the row moves on through `red`, `green`,
  `refactor` and `done` — clearing it on the next transition erases the only
  record of why a completed row was reopened. A row swept out of `exception`
  keeps the anomaly's DR-ID alongside the reset ID. A reset without a recorded
  approval is a backward transition and is prohibited.
- `exception` -> `todo` — **anomaly resolved**, the item re-enters the cycle
  from the start. Without this exit a parked item could never be un-parked
  without a lifecycle violation. Distinct
  from the upstream reset above: nothing upstream changed, so it needs no CR/DR
  approval — the anomaly's own DR-ID stays in place.
- A reset row is at `todo`, so it owes no test file until it reaches `green`.
  The `Test file` existence check is unchanged for `green` / `refactor` /
  `done`: those statuses assert a test that ran.

- `refactor` -> `red` (**QA rejection recovery**): a routed `qa-gatekeeper` returned
  `REVISE` on this row's RED/GREEN evidence because the cycle itself was wrong.
  Batched (T1) review defers that confirmation until after the row has left `red`,
  so without this edge a rejected row could never redo the RED it was faulted for
  and could never reach `done`. Cite the verdict in `Evidence`, re-run the
  micro-cycle; rules: `volume-policy.md#group-formation-states-and-transitions`.

Any edge not listed above is prohibited. Attempting `green` -> `red` must
produce: `"Backward transition prohibited: green -> red"`.

**"Backward" is narrower than "moves to an earlier status".** All four edges below
return a row to an earlier state, and **three of them are not backward transitions**
— a resumption, an anomaly exit and the rework edge each restart an earlier phase of
the row's own cycle with nothing upstream changed. The third, the approved Change
Request reset, **is** the one sanctioned backward transition: an upstream obligation
moved and the row's completed work is withdrawn. The column below therefore asks why
each edge is _legal_, not why it is not backward:

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
be in. `.qfai/assistant/constitution/drift-protocol.md` step 5 sweeps the ledger with
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
because `QFAI-ATDD-112` covers every `L3` TC, and every TC with no declared `Level`,
from `tests/integration/**`, and that stage's P4 writes those tests. These rows live
in this ledger and follow every rule above, but their tests are authored by
`/qfai-atdd` (`qfai-implement/SKILL.md` Non-goals). The two skills therefore share
one lifecycle, and the ordering that skill works in makes the RED question different
rather than absent.

**Who seeds them.** `/qfai-sdd` Phase 2b, **at least** one `Layer = Integration`
row per integration-level `TC-*` — every `Level` whose annotation routes to
`tests/integration/**` under `QFAI-ATDD-112`: `L3`, the word `integration`, a
blank cell, a spelling that names no layer (`smoke`), and `system` /
`acceptance`. Routing, not spelling: the last two are in the layer vocabulary
and are still not coverage targets, so a "the vocabulary cannot read it" test
leaves them owned by no group. Alongside
the coverage-target rows (`references/ledger-preconditions.md#producer`). A
matrix-shaped TC is seeded one row per independently observable boundary there,
because `/qfai-atdd` cannot split a row it may not write
(`selector-granularity.md`). `TDDLIST_TC_NOT_COVERED` never asks for an `L3`
row, because an `L3` TC is not a coverage target — so an absent `Integration`
row is an unseeded row, not a spec without integration work.

`/qfai-atdd` does **not** write production code — `agent-routing.yml` gives its
implementation phase `acceptance-test-engineer`, who owns acceptance tests, and
no backend or frontend agent. The surface a journey needs is built by this
skill's Phase Green, from the RED that stage handed over.

**Who writes the production code for an E2E/API row.** Normally nobody writes
it _for that row_: the behaviour the journey exercises is delivered by the same
spec's `TC-*` rows, which this skill executes on their own micro-cycles. The
E2E/API row is a **coverage obligation** — it asserts that the delivered
behaviour is reachable end to end, or that the contract is exercised — not the
sole carrier of a feature. Reading it as the carrier leaves the row with no
implementer, because `/qfai-atdd` has no production agent. Where the journey
does reach a gap no TC row covers, Phase Green of **this** row closes it, and
`red-not-observable.md`'s falsifiability path is what supplies the RED. What makes the RED
question different there is ordering, not ownership: the work orders that build
a spec's surfaces often run before the journey is written, and a test written
after its surface passes on the first run. So:

- **There is no waiver here.** `todo -> red` still requires an admissible RED,
  and a first-run pass is still not one. The Evidence grammar enforces it:
  `RED:n-a` is not a legal provenance on these three layers, so a row that
  never obtained RED cannot record a conforming pointer.
- **The falsifiability path is the answer, not `exception`.**
  `red-not-observable.md` already defines the substitute — record `Satisfied-by`,
  mutate the predicate the journey asserts on, watch this row's test fail, restore,
  and record `Falsifiability command` / `Falsifiability result` beside the GREEN
  pair. It was written for an obligation a sibling row had already satisfied; a
  journey whose surface the same cycle just built is the same situation with the
  sibling being the surface work. `qa-gatekeeper` accepts that form, and the row
  proceeds to `green` and `done`.
- **`/qfai-atdd` also has a first branch this ledger cannot see**: writing the
  journey against the tree _before_ the surface exists, which produces an
  ordinary RED. Its stage gate P1b is where that happens.
- **The evidence file follows the stage that produced it.**
  `implement-<spec-id>.md` holds the rows this skill runs itself;
  `atdd-<spec-id>.md` holds `## Ledger rows advanced` for the `E2E` / `API` /
  `Integration` rows — every row this section names, not two of the three —
  because that is the stage that ran the commands. `checkpoint-verification.md`
  picks the same file for the checkpoint result and seal of those rows. The `Evidence` cell is a
  pointer either way and its anchor names which file. Calling
  `implement-<spec-id>.md` the single home was true while one stage produced
  every pair; it stopped being true the moment another stage did.
  `qfai-implement/SKILL.md`'s completion item 10 reads the same split, so an
  E2E/API/Integration row whose anchor names the ATDD file reaches `done`;
  items 11 and the
  matching prohibition condition append **every routed reviewer's** verdict to
  **that** file — `Spec review` and `Code quality review` on every row, and
  `Prototype parity` as well on a UI-affecting one, because gate item 9 routes
  `product-surface-reviewer` there too and the routed set is therefore wider
  than two. This skill still runs those reviewers for every row it advances —
  only the RED provenance came from elsewhere. A fixed count of two here while
  item 11 obliged three made `done` depend on which of the two files the runner
  read, and the parity verdict — the only one that cannot be re-derived from the
  spec and the diff, because it was taken against a rendered surface that has
  since moved — was the one it dropped.
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
- It is **not** selectable. Phase Red picks the first `todo` row and skips `blocked`
  ones, so the loop head stops re-issuing rows that cannot proceed. A row blocked
  mid-cycle is not selectable either — no phase selects `red`, `green` or `refactor`
  — so the status stops the loop at whatever point the blocker appeared.
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

`blocked` is not a completion state and appears in the completion-prohibition
list, on the same bullet as `todo`.

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

Write it beside the Change Requests as
`.qfai/decisions/DR-NNNN-MMMM-<slug>.md` when the anomaly is spec-scoped, or
`.qfai/decisions/DR-NNNN-<slug>.md` when it is policy-level — never the CR's
date form. The two shapes have different declaration homes, and the anomaly's
scope picks the one it belongs in: a spec-scoped `DR-NNNN-MMMM` is
declared in that spec's `07_Decisions.md`, and a policy-level `DR-NNNN` is
declared in `_policies/08_Decisions.md`.

**That split is a convention, not a gate.** `TDDLIST_EXCEPTION_UNRESOLVED_DR`
reports an id declared in **neither** file: the validator reads both and
resolves against their union, without checking which shape came from which
file. A policy-level `DR-NNNN` parked in a spec's `07_Decisions.md` therefore
resolves clean and nothing reports it. Follow the split because the wrong home
hides a shared decision inside one spec, not because a validator will catch it.
Do **not** write `07_Decisions.md` or `09_delta.md`.

Those two are upstream SSOT (`.qfai/assistant/constitution/drift-protocol.md#core-rule`) and
this skill carries `[DRIFT-PROTOCOL:MANDATORY]`, so a downstream write to either
is a protocol violation — while the `exception` transition itself is an ordinary
inline step of Phase Red that `TDDLIST_EXCEPTION_MISSING_DR` blocks at `error`
without a `DR-*`. `.qfai/decisions/` is the one home that satisfies both: the
protocol whitelists **creating** a record there
(`.qfai/assistant/constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`), and the managed `.gitignore` block
already tracks it as a governance record.

The upstream cross-reference is a separate, later write. If the anomaly turns
out to change an approved obligation, that is drift: raise a Change Request per
`.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected`, and the owner skill's rerun is what
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
