# Spec Traceability Rules

Use this file when working on traceability-heavy parts of `/qfai-sdd`.

## Required Layered Layout

`npx qfai validate` treats specs as a layered package:

- Shared policies: `.qfai/specs/_policies/**`
- Capability specs: `.qfai/specs/spec-*/**`

Required shared files:

- `01_Objective.md`
- `02_Initiative.md`
- `03_Capabilities.md`
- `04_Business-Flow.md` (Markdown with Mermaid `flowchart` or `sequenceDiagram`)
- `05_Contracts.md`
- `06_Glossary.md`
- `07_Constraints.md`
- `08_Decisions.md`
- `09_Open-questions.md`
- `10_delta.md`
- `11_Slice-Policy.md`

Required per-spec files:

- `01_Spec.md`
- `02_User-stories.md`
- `03_Acceptance-Criteria.md`
- `04_Business-Rules.md`
- `05_Examples.md`
- `06_Test-Cases.md`
- `07_Decisions.md`
- `08_Open-questions.md`
- `09_delta.md` or another `*_delta.md`
- `10_Plan.md` (How-only)

`/qfai-sdd` must create or refresh `_policies/11_Slice-Policy.md` before deciding CREATE / UPDATE / DELETE. The approved default slice model is `1 CAP = 1 spec directory`.

## Required Edge Model (Conceptual Decomposition)

Conceptual decomposition / realization hierarchy (how specs are _authored_, not how
IDs reference each other):

- `US` conceptually decomposes into `AC`
- `AC` conceptually decomposes into `BR`
- `BR` is conceptually concretized by `EX`
- `EX` is conceptually realized by `TC`

## Reference Direction (`Refs` ID fields)

ID reference direction (the value of `Refs:` columns) must be lower-to-upper only:

- Upper-to-lower ID references are forbidden (`US.Refs: AC-0001` is not allowed).
- Lower-to-upper ID references are allowed (`AC.Refs: US-0001` is the canonical form).
- The conceptual hierarchy above describes authoring direction; the `Refs` direction
  is the _inverse_ so downstream specs cite upstream IDs, never the other way round.

## Execution Consumer View

- Primary execution SSOT is `.qfai/specs/<spec-id>/01_Spec.md`.
- Execution skills must not read `_policies/**` by default.
- Read `_policies/**` only when `01_Spec.md` explicitly triggers the Escalation Hook.
- `01_Spec.md` must copy down applicable NFR, policy, requirement, and evidence summaries needed by implementers.

## ID and Parent Rules

- Shared capabilities are defined in `_policies/03_Capabilities.md`.
- `01_Spec.md` must include `Parent: CAP-0001` or the matching CAP ID.
- Item IDs are file-local and parent-driven:
  - `US-0001` -> Parent: `CAP-0001`
  - `AC-0001` -> defined in `03_Acceptance-Criteria.md`
  - `BR-0001` -> `AC-Refs` in `04_Business-Rules.md`
  - `BR-0001` -> `Contract-Refs` in `04_Business-Rules.md` (comma-separated
    `CON-*` IDs; `-` when the rule binds no contract). Contract IDs recorded
    only in `Notes` are untraced.
  - `EX-0001` -> `BR-Ref` in `05_Examples.md`
  - `TC-0001` -> `EX-Ref` and `AC-Refs` in `06_Test-Cases.md`

### Citing an ID another spec owns

Layered specs share entities, so "this spec's rule defers to the owner's rule"
is a real relationship. It has one supported form, and it is not the obvious
one.

- **Cite the owning spec's contract id** (`CON-DB-*` / `CON-API-*` /
  `CON-UI-*`), not its `BR-*` / `US-*` / `AC-*`. The owning spec is identifiable
  from the Contracts table of the spec that reads the entity.
- A foreign-namespace layer ID is an `error` from two rules at once —
  `QFAI-SPACK-101` (namespace) and `TRACE_DOWNSTREAM_REF` (reference direction).
  Writing _"per BR-0017-0004"_ in `04_Business-Rules.md` trips both.

**Which files the namespace check covers**, measured against
`validateLayeredNamespace`:

| file                        | checked | IDs                                                                   |
| --------------------------- | ------- | --------------------------------------------------------------------- |
| `02_User-stories.md`        | yes     | `US`                                                                  |
| `03_Acceptance-Criteria.md` | yes     | `AC`                                                                  |
| `04_Business-Rules.md`      | yes     | `BR`                                                                  |
| `05_Examples.md`            | yes     | `EX` / `SC`                                                           |
| `06_Test-Cases.md`          | yes     | `TC` / `CASE`                                                         |
| `09_delta.md`               | **no**  | a delta records what happened, including another spec's IDs           |
| `10_Plan.md`                | **no**  | not covered today — see #1101 for whether that is a decision or a gap |

## ID and Parent Rules (continued)

- `_policies/**` must not **define or own** lower-layer items. Concretely: no
  traceability edge in `_policies/**` may name a lower-layer ID — no `Parent:`,
  `Refs:`, `AC-Refs`, `BR-Ref` or `EX-Ref` value, and no heading that declares a
  `US/AC/BR/EX/TC` item.
- **How this is enforced today is broader than that intent.** `QFAI-LAYER-100`
  and `TRACE_SHARED_SCOPE_VIOLATION` are a token scan: they match any
  `US/AC/BR/EX/TC-NNNN` anywhere in a `_policies/**` file, not only in an
  ownership or definition position. Outside the Triage carve-out below, a plain
  prose citation is therefore reported too. Treat the ownership/definition rule
  as the _intent_ and the token scan as the _current mechanism_; when you need
  to name a lower-layer item in `_policies/**`, put it in the Triage table rows,
  which is the one place the scan skips.
- _Citing_ a lower-layer ID or a `spec-NNNN` inside the **Triage table rows** of
  `_policies/10_delta.md` is explicitly allowed. `sdd-triage.md` requires
  cross-spec and policy-only Triage rows to be persisted there, and
  `QFAI-TRIAGE-002` makes `Existing Spec` (a `spec-NNNN` value) a required
  column — so the `Existing Spec`, `Approved By` and `Rationale` cells must be
  able to name what actually changed, verbatim. `QFAI-LAYER-100` and
  `TRACE_SHARED_SCOPE_VIOLATION` skip those rows for this reason.
- The carve-out is exactly that narrow, so it cannot be used as an escape
  hatch:
  - **file** — `_policies/10_delta.md` only. A `## Triage` heading anywhere
    else under `_policies/**` (`11_Slice-Policy.md`, `01_Objective.md`, ...)
    gets no exemption.
  - **heading** — the canonical `## Triage` H2 only, matching what
    `QFAI-TRIAGE-001..007` validate. `# Triage`, `### Triage` and
    `## Triage notes` are not exempt.
  - **line shape** — markdown table rows only. A heading that declares an item
    (`### AC-0001-0001`) or a traceability edge (`- Parent: US-0001-0001`)
    inside the Triage section is still a violation, because it defines or owns
    rather than cites.
  - **table identity** — the mandated Triage table only. A second table under
    `## Triage` is exempt only when its header carries the full canonical
    column set (`Source`, `Subject`, `Existing Spec`, `Operation`, `Sub-op`,
    `Approved By`, `Rationale`); order may differ, since the Triage validators
    resolve columns by name. A table reusing only one or two of those names
    earns no exemption.
  - **column** — within an exempt table, only cells under a canonical column
    are skipped. An author-added column (`Parent`, `Refs`, ...) keeps its cells
    visible to the scan.
- Discussion-layer IDs (`DUS-001`, `DAC-001-01`, `DTC-1`, `DSC-001`) are a different
  namespace and are explicitly allowed in `_policies/**` and in `Source` fields. They are
  how provenance back to the discussion pack stays machine-checkable; do not rewrite them
  into prose to satisfy the rule above.
- A `Source` value is always the pair `<pack-id>#<discussion-id>`, e.g.
  `discussion-20260415101112123#DUS-001`. The pack half is not optional: pack IDs are the
  only thing that makes a discussion ID unique, because every pack restarts its numbering at
  `DUS-001` / `DAC-001-01`. A spec that two packs have updated therefore carries two `Source`
  values that differ only in the pack half.
- `Source` is recorded once per item, in the required artifact: the `- Source:` line of each
  `## US-NNNN` block in `02_User-stories.md`, and the `# Source:` comment inside each AC's
  Gherkin block in `03_Acceptance-Criteria.md`. The optional `AC Catalog` table carries no
  `Source` column, so there is no second copy to drift.

### Item granularity

Depth expectations answer how many layers; item granularity answers how big one
item may be. It is defined in
`.qfai/assistant/constitution/requirements-decomposition.md#item-granularity-acbrextc`
and signalled by `QFAI-DENSITY-005`.

## TDD Execution Ledger

Each `.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger for the TDD micro-cycle.

- Required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence
- Optional columns: `US-Refs`, `CON-API-Refs`, `Blocked-By`, `Owning module`, `Tier`. `Blocked-By`
  names what a `blocked` row is waiting on and is required on those rows.
  `Owning module` declares the production module the row will write, is filled at
  Phase 2b alongside the row itself, and is what the parallel-dispatch gate is evaluated
  against before RED: a ledger with no `Owning module` column supports parallel dispatch
  only for seams that already exist
  (`qfai-implement/references/execution-ledger.md`, `parallelization-policy.md`).
- Optional column detail: `Tier` — the review tier `/qfai-implement` owes the row. Legal values
  `T1`, `T2`, `T3`, or `-`; anything else raises `QFAI-TDDLIST-010`. It is **`/qfai-sdd`'s
  cell**, seeded at Phase 2b beside `Layer` and never written by `/qfai-implement` — not in
  `Evidence`, not anywhere. Blank or `-` reads as `T1`; a ledger **table** whose header carries no
  `Tier` at all predates the column, and each of that table's rows is derived per
  `qfai-implement/references/volume-policy.md#risk-tier-derive-per-row`. Do not drop the column as
  non-standard: it is the only place the tier can be read before the work it sizes.
- Legal `Status` values: `todo`, `blocked`, `red`, `green`, `refactor`, `review-fix`,
  `done`, `exception`. `blocked` is completion-prohibiting and is never selected by
  Phase Red.
- **Ownership split.** `/qfai-sdd` owns the rows — which obligations exist and what each
  covers. `/qfai-implement` owns the `Status`, `DR-ID` and `Evidence` cells unconditionally,
  plus two cells only while a stated condition holds: `Test file` while the seeded value is
  empty or a dash placeholder, and `Selector` while the seeded value does not resolve against
  the row's named test file. It owns nothing else — `TC-Refs`, `Layer`, `US-Refs` and
  `CON-API-Refs` carry the row's obligation identity and stay upstream. This is the carve-out
  in `.qfai/assistant/constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`,
  which states both conditions; adding, removing or re-scoping a row is an upstream change and
  takes the Change Request path.
- `Evidence` is a **pointer**: the one-word RED/GREEN outcome plus an anchor into
  `.qfai/evidence/implement-<spec-id>.md`. A GFM cell is one physical line and ends at
  every unescaped `|`, so it cannot hold command output. Encoding rules and the cell
  contract: `qfai-implement/references/execution-ledger.md#evidence-cell-contract`.
- Optional columns detail: `US-Refs`, `CON-API-Refs` — the E2E and API obligations a
  row implements. Required when the row carries one, since `TC-*` annotations
  are forbidden in `tests/e2e/**` and `tests/api/**`.
- Optional columns detail: `Owning module` — the production module the row will write,
  one per row, `-` when not declared. `/qfai-sdd` seeds it at Phase 2b from the TC's
  parent `BR`, reached by `EX-Ref` -> `05_Examples.md#BR-Ref` and, whenever the
  `EX-Ref` cell names no `EX` — an empty cell as much as `—` — by the TC's
  `AC-Refs`. It is the only evidence of a row's production write
  set that exists before RED, since RED-first guarantees the module does not exist
  yet — necessary for parallel dispatch, never sufficient: every other condition in
  `qfai-implement/references/parallelization-policy.md` still has to hold. A ledger
  without the column leaves parallel dispatch unevaluable, so a ledger authored before
  the column existed gains it at the next Phase 2b — added to the header of each
  ledger table that lacks it, `## CHG-*` tables included, and backfilled on every row.
  A table already carrying the column is filled in place, never given a second one:
  column order is free because the validator resolves the column by name, but it
  resolves the **first** column of that name, so a duplicate shadows the new values.
  Reach that parent by `EX-Ref` first: a TC naming an `EX` takes that example's
  `BR-Ref` in `05_Examples.md`, which pins the parent 1:1. Fall back to the TC's
  `AC-Refs` whenever the `EX-Ref` cell names no `EX` — an empty cell, `—` and `-`
  all mean "none", and a TC carrying only `AC-Refs` is valid — taking the
  `04_Business-Rules.md` rows whose `AC-Refs` name the same `AC`, so an error or
  boundary TC inherits its normal-case sibling's parent on that `AC`.
- TC coverage reads **`TC-*` tokens only**. `US-*` and `CON-API-*` IDs are
  explicitly inert to it — recording one does not raise or lower TC coverage.
- Legal `Layer` values: `Unit`, `Component`, `Integration`, `API`, `E2E`.
  Legal obligation kinds per layer: `TC-*` on Unit / Component / Integration,
  `US-*` on E2E, `CON-API-*` on API.
- `Selector` may hold one entry, a JSON array of entries, or a glob pattern. It is not limited to a single test function. Write a multi-entry cell as the array: a bare cell is **one** entry however much punctuation it holds, because a comma is legal inside a single test name and nothing splits a bare cell on commas (`qfai-implement/references/selector-granularity.md#entry-form`). `npx qfai validate` reads the array the same way and requires **every** element to name a test in the row's `Test file`, so a surviving element cannot vouch for a deleted sibling; `TDDLIST_SELECTOR_UNRESOLVED` names the row when one does not. A cell written under the older comma-separated rule is migrated by the bounded reading in `selector-granularity.md#reading-a-cell-written-under-the-old-comma-rule`.
- `TC-Refs` is many-to-many with `TDD-ID`: one `TC-*` may be decomposed across several TDD rows, and each of those rows carries that `TC-*`.
- A matrix-shaped `TC-*` (many rejection reasons, a status-code matrix, several independent state transitions) MUST be split across multiple TDD rows before RED begins — one falsifying oracle per row, one row per independently observable boundary. Do not accumulate unrelated boundaries behind a single selector; doing so invalidates the RED observation, because only the first failing assert is ever observed.
- Coverage is measured as unit/component TC references from `06_Test-Cases.md`
  appearing in TC-Refs. That measures which TCs need a `tdd/test-list.md` row;
  it says nothing about where the test file lives. A `TC-*` whose declared
  `Level` is `L3` routes its `QFAI-ATDD-112` annotation to
  `tests/integration/**` (`L4` to `tests/api/**`, `L5` to `tests/e2e/**`, no
  declared `Level` to `tests/integration/**`). **`L1`/`L2` owe no ATDD
  annotation at all** — they are out of `/qfai-atdd`'s scope and have no
  mandated directory, so this ledger row is their whole obligation and
  `TDDLIST_TC_NOT_COVERED` is the gate that enforces it. See
  `catalog/test-layers.md`.
- A TC with no declared `Level` — a blank cell, or a `06_Test-Cases.md` with no test-case classification column at all — is **not** a coverage target and gets no row. It is owned by `QFAI-ATDD-112`, which routes it to `tests/integration/**`; seeding a row for it as well would put one TC on two gates with two owners and two evidence files, and give the row a `Layer` the spec does not support.
- A ledger seeded before that rule may still carry such a row.
  `QFAI-TCLEVEL-001` (`warning`) reports every coverage row whose
  `TC-Refs` names a `Level`-less TC; clear it by declaring the TC's `Level` in
  `06_Test-Cases.md` (`L1`/`L2` to keep it here) or by removing the row. A
  decomposition reference names the TC it belongs to, so a row citing
  `TC-NNNN-NNNN` is reported against `TC-NNNN` — the id to declare is the one
  the file actually lists — unless the sub-ID is itself a declared row with its
  own `Level`, which then speaks for it. Do not
  silence it by moving the row to `Layer=Integration` unless `/qfai-atdd`
  really owns the test that row points at.
- `Status=exception` requires a non-empty DR-ID. An `exception` row is not a
  dead end: a Drift Protocol sweep may reset it to `todo` like any other status
  when the rerun changed the obligation it was raised against.
- `Status` in `green`, `refactor`, or `done` requires an existing Test file
  resolved from project root. The upstream reset does not relax this: a swept
  row returns to `todo`, where no file is required, and writes its test in the
  following `red` phase.
- **The converse also holds.** A `todo` row whose Test file exists _and_ whose
  `Selector` resolves inside it is a stale ledger row, not a not-started one
  (`TDDLIST_STALE_STATUS`, `warning`). Stated in one direction only, the rule
  could catch the ledger over-reporting and never under-reporting — and
  under-reporting is what actually happens, because work lands from parallel
  worktrees and the ledger is reconciled by hand afterwards. A stale `todo` and
  a genuinely not-started row are indistinguishable to every downstream
  consumer, including the completion gate that reads the ledger. A project that
  declares test paths and selectors up front waives `TDDLIST-005`.
- `Selector` is read, not merely required: on a row claiming completion it must
  resolve inside the named Test file (`TDDLIST_SELECTOR_UNRESOLVED`, `warning`).
  Resolution is a containment check over the selector text and its last
  identifier token, not a runner-specific parse; waive `TDDLIST-006` for a
  selector form it cannot resolve.
- `DR-ID` carries Decision Record (`DR-*`) **and** Change Request (`CR-*`)
  references, so it carries the approval that authorised an upstream reset, not
  only `Status = exception`. A row reset by a Drift Protocol sweep records the
  approved `CR-*` / `DR-*` ID there and **retains it through `red`, `green`,
  `refactor` and `done`** — the ledger is the audit trail for why a completed
  row was reopened. Change Requests live at
  `.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md` (`CR-\d{8}-\d{4}`).
- `Layer` must be consistent with `Test file`: an `Integration` row may not
  point into `tests/e2e/**` or `tests/api/**`, and vice versa.
- More than one `TDD-*` row MAY reference the same `TC-*` — a TC split across
  several test modules is legitimate. `TDD-ID` uniqueness is the only
  identity constraint.
- `TDD-ID` must match `TDD-NNNN` and be unique within the spec.
- **`TDD-ID` allocation is by reserved block, decided before the workers
  split.** Uniqueness alone does not say who takes the next value.
  `TDD-NNNN` is spec-scoped and monotonic, so that value is `max + 1`
  over the very file every concurrent author is also appending to — and
  `.qfai/assistant/constitution/workflow.md` requires worktree separation for parallel work,
  which makes the read stale the moment another author appends.
  `TDDLIST_DUPLICATE_ID` is an `error`, so everyone but the last writer is
  locked out of landing their rows at all. The rule:
  1. **Serial authoring — `max + 1`.** Take the maximum `TDD-NNNN` over the
     whole ledger, including retired, `blocked` and `exception` rows, **and
     the upper bound of every bullet under `## TDD-ID reservations`**, and
     allocate upward from it. A bullet that names a single id has that id as
     its upper bound, so a retired-row tombstone (rule 3) counts the same way
     as a block. The reservation bullets are part of the
     maximum, not decoration: a block that is still being worked has no rows
     in the file yet, and a block that is finished may have consumed only its
     first id. Nothing else changes for the ordinary case. **An empty
     candidate set has a maximum of 0**, so the first row a freshly seeded
     ledger takes is `TDD-0001` — Phase 2b seeds every ledger from empty, so
     that base case is the most common allocation there is. **`TDD-9999` is
     the last legal id**: `TDD_ID_FORMAT` accepts exactly four digits, so
     `max + 1` past it yields a value every subsequent row and reservation
     fails `TDDLIST_*` validation on. A ledger whose maximum reaches it stops
     allocating, and the spec rolls over under an approval-required Triage
     row — never by widening the format on your own:
     - the spec genuinely owns more than one `CAP-NNNN` → **SPLIT**
       (`_policies/11_Slice-Policy.md`);
     - **the spec owns exactly one capability → SUPERSEDE, not SPLIT.**
       `validateSpecSplitByCapability` hard-enforces one `CAP-NNNN` per spec,
       so a count-driven SPLIT of a single-capability spec raises
       `QFAI-SPLIT-102` / `QFAI-SPLIT-104` at `error` — pointing the ceiling
       at SPLIT alone leaves the most common spec shape with no legal exit
       and the ledger simply stuck. SUPERSEDE is the rollover `sdd-triage.md`
       already defines for a spec that needs a new ID at unchanged scope:
       create the successor spec, set `Status: superseded` and
       `Superseded-by: spec-NNNN` on the exhausted one, and the successor's
       ledger allocates from the empty base case at `TDD-0001`. Nothing is
       renumbered — `TDD-NNNN` is spec-scoped, so the successor starting over
       collides with none of the ids rule 4 froze.

     **Both exits assume the ceiling was reached by churn, and one measurement
     says whether it was**: count the rows that are still live obligations —
     not retired, not tombstoned by rule 3 — against 9999. Well under it, the
     maximum is high because ids were spent and released, the successor's
     ledger reseeds far below the ceiling, and SUPERSEDE is a real rollover.
     **At or near it, neither exit gains anything**: the successor inherits
     the same obligations, Phase 2b writes one row per coverage-target TC, and
     the empty ledger refills to the same ceiling before a single new
     obligation is added. That is not an allocation problem and must not be
     answered as one — a spec carrying that many live coverage-target TCs has
     outgrown what one spec holds. Its exit is upstream: decompose the
     capability, which both is the honest fix and is what makes SPLIT legal
     (it is `QFAI-SPLIT-102` / `QFAI-SPLIT-104` refusing a **single**-`CAP`
     split, not a count). If the capability genuinely does not decompose, then
     the id format is the thing that is too small, and widening `TDD-NNNN`
     is a package change decided with the user — never taken inline here, and
     never worked around by reusing an id rule 4 froze.

  2. **Concurrent authoring — reserve first, on the shared branch.** Before
     dispatching authors that will append to one spec's ledger from separate
     worktrees, make one serialized write on the branch they all fork from
     that records a disjoint block per author under a
     `## TDD-ID reservations` heading in that ledger. Record it as a bullet
     list, never a markdown table: `validateTddList` reads every table in the
     file as ledger rows, so a reservation table would be validated as rows.
     One bullet per author, shaped
     `- TDD-0065..TDD-0079 — <author or slice>, reserved <YYYY-MM-DD>`. Each
     author then allocates only inside its own block, and the appends cannot
     collide. **If no reservation exists and you need IDs anyway, take one
     yourself** — the bullet is a one-line append that can land on the shared
     branch in its own commit long before the rows are ready, so it serializes
     where a batch of rows cannot. **What serializes it is the push, not the
     commit**, so a self-reservation taken after the worktrees have already
     split follows a compare-and-set: compute the block from the shared
     branch's current tip, push the bullet there, and **if the push is
     rejected, fetch and recompute the block from the new tip before
     retrying** — never rebase the old range forward. Choosing a range inside
     your own worktree is the very stale read this rule exists to stop: two
     authors reading the same tip pick the same block, and
     `validateTddList` never looks at reservation bullets, so a merge that
     keeps both raises nothing and both authors write the same `TDD-ID`s. **A
     bullet that overlaps one already on the shared branch is invalid** —
     recompute it; never resolve that conflict by keeping both.
  3. **A block is a budget, not a promise.** An author that exhausts its block
     stops and asks for another one; it does not continue past the boundary.
     Unused reserved IDs stay unused — leave the gap, exactly as
     `_policies/11_Slice-Policy.md` says for spec IDs. Density is not a
     property `TDD-NNNN` is required to have. **The reservation bullet is
     never deleted**; close it in place, shaped
     `- ~~TDD-0065..TDD-0079~~ — <author or slice>, closed <YYYY-MM-DD>`, so
     its upper bound survives as the high-water mark rule 1 reads. Delete it
     and the next serial `max + 1` walks straight back into the block's
     unused tail — reserve `TDD-0065..TDD-0079`, spend `TDD-0065` only, and
     the next author is handed `TDD-0066`, reissuing the very ids the gap
     retired. **A deleted row leaves its id behind the same way.** The
     Drift Protocol removes — does not reset — a row whose obligation was
     deleted outright (`.qfai/assistant/constitution/drift-protocol.md`), so the id leaves
     the table and rule 1's maximum falls back with it: delete the highest
     row, `TDD-0002`, and the next allocation is handed `TDD-0002` again,
     breaking rule 4 for every reference already written outside the ledger.
     Tombstone it in the same section, one id per bullet, shaped
     `- ~~TDD-0002~~ — row deleted <YYYY-MM-DD>, obligation removed by <ref>`.
     **`<ref>` is whatever authorised the removal on the path it took**, and
     the two paths record different things: a Drift Protocol removal cites its
     `CR-*`, while an ordinary `/qfai-sdd` run removing a TC does so through an
     `UPDATE:REMOVE` Triage row — approval-required, recorded in its
     `Approved By` column, and raising no Change Request at all. Requiring a
     `CR-*` on that path leaves it with nothing true to write, and an agent
     that will not invent one simply skips the tombstone and reissues the id.
     Cite the Triage row's `Source` (`REQ-XXXX`) there. Either reference is
     complete; neither may be a placeholder.
     Closing a reservation block does not cover this: a serially allocated row
     never had a bullet to close.
  4. **A written `TDD-ID` is never renumbered.** Once an id appears anywhere
     outside the ledger — a commit message, `.qfai/evidence/implement-*.md`,
     `.qfai/evidence/atdd-*.md`, or a `DR-*` cross-reference — a merge does
     not rewrite it, so renumbering at merge time silently breaks those
     references. Reservation is what makes "never renumber" affordable.

- Missing `tdd/test-list.md` is a warning **only when the spec declares no
  coverage-target TC**. If it declares any, the absent file also raises
  `TDDLIST_TC_NOT_COVERED` (error) naming them: the obligations do not
  disappear with the ledger, and `QFAI-ATDD-112` no longer covers L1/L2, so
  this is their only gate. Missing DR-ID/Evidence columns is an error.
- The `Evidence` **cell** is checked too, not only the header: on a row at
  `green` / `refactor` / `review-fix` / `done`, an empty-or-dash cell is
  `TDDLIST_EVIDENCE_EMPTY` and a verdict with no command is
  `TDDLIST_EVIDENCE_STATUS_ONLY`. Both are reported at `warning`:
  `TDDLIST_EVIDENCE_STATUS_ONLY` permanently (waivable as `TDDLIST-004`), and
  `TDDLIST_EVIDENCE_EMPTY` until the promotion release its finding names.

## Traceability Ledger (`16_Traceability-ledger.md`)

Optional per-spec artifact linking `BR-*` / `AC-*` to the implementation file that realizes them.
Template: `templates/specs/spec/16_Traceability-ledger.md`.

- It is **optional**. Without it `npx qfai validate` emits `QFAI-TRACE-002` (`warning`) and skips the
  implementation-integrity check; the spec is still valid. Presence is a property of the working
  tree, so this is checked for every **layered** spec on every run — it does not depend on the branch
  diff. Both `--profile sdd` and `--profile tdd` evaluate it.
- With it, `QFAI-TRACE-001` (`error`) fires when a spec's `03_Acceptance-Criteria.md` or
  `04_Business-Rules.md` changed on the branch but a linked implementation file did not. Only
  `--profile tdd` / `full` evaluate it: `/qfai-sdd` hands implementation to `/qfai-implement`, so at
  the `--profile sdd` gate the linked code is untouched by design.
- `QFAI-TRACE-001` needs the branch diff. When git cannot produce one (base ref absent, shallow CI
  clone, not a repository) `QFAI-TRACE-003` (`info`) says so and that check is skipped for every
  spec; fetch the base ref or set `baseBranch` at the **top level** of `qfai.config.yaml` (it is not
  read from under `validation`). `QFAI-TRACE-003` also fires per spec when the diff carries BR/AC
  changes for a spec the working tree no longer holds as layered (whole-spec `DELETE`, rename,
  conversion): the ledger went with it, so the check is un-runnable rather than passing.
- A ledger path that is not a regular file (FIFO, socket, device, directory) is never opened: it is
  reported as `QFAI-TRACE-002` and that spec's integrity check is skipped.
- Schema for the **layered** layout — the first Markdown table is the one read; header needs ≥3
  columns, one named `Implementation File`:

  | BR/AC   | Implementation File | Test File |
  | ------- | ------------------- | --------- |
  | AC-0001 | src/…               | tests/…   |

  First cell must be a `BR-NNNN` / `AC-NNNN` ID; second cell one repo-root-relative path (no globs,
  no `./`). One row per BR/AC ↔ file pair. Extra trailing columns are ignored.

- The legacy **spec-pack** layout uses the same filename with a different schema
  (`trace_id, obj_id, init_id, cap_id, flow_id, us_id, ac_id, ex_ids, tc_ids`, checked by
  `QFAI-LEDGER-001`). That check runs only on spec-pack layouts — the two schemas never apply to the
  same file. Do not merge them. `QFAI-TRACE-001` / `-002` are the mirror image: they enumerate
  layered specs only, so a spec-pack ledger is never judged against the layered schema.
- Authored and refreshed by `/qfai-sdd` in the same change as the BR/AC it links. It is upstream
  SSOT; downstream skills must not edit it.

## Depth Expectations

- `BR` captures decision-level rules.
- `EX` demonstrates how `BR` behaves.
- `TC` proves `EX` in executable terms.

## When Sparse Coverage Is Intentional

- State the reason explicitly.
- Record the mitigation or next step in open questions or delta.

## Artifact Hygiene

- `specs/` is definition-only; keep runtime status under `.qfai/report/run-*/`.
- Do not keep state markers such as `release_candidate`, `Status`, `Progress`, or runtime `Risk` sections in spec files.
- Use Mermaid fences only for diagrams.
- Required decision/open-question/delta files must exist even when empty; write `0 items` or equivalent.
- Contracts SSOT remains `.qfai/contracts/**`; reports are derived outputs.
