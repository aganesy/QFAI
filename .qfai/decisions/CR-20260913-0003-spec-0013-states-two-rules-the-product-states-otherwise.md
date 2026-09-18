# Change Request

- ID: `CR-20260913-0003`
- Title: `spec-0013 states two rules the product states otherwise`
- Raised by: `qfai-implement`
- Raised at: `2026-09-12T20:41:35Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Two obligations in `spec-0013` state something the code states otherwise, or
something no code path reaches. Both were found while scoring the pack's
coverage depth. Both ledger rows stand `done`, and no validator finding names
either disagreement.

In each, the pack states one rule consistently and the product has moved, so
what is left is a decision about which side to keep. They are gathered in one
record because they describe one feature, `surface_type` population and its
drift finding, and they are settled **separately**: the decision section puts
one question per item, and an approval names an option for each.

Two further contradictions found in the same pass are the pack disagreeing with
itself. Each has one correct fix, so each is raised as a defect on its own:
`CR-20260913-0011` for the template slot, and `CR-20260913-0008` for the
legacy-contract window.

### 1. A skill is named, a helper nothing calls is driven, and the resolver admits more

`TC-0013-0030`'s obligation has two halves: `/qfai-sdd` sets
`surface_type: ui-bearing` frontmatter for a spec with a UI companion, and
`resolveAllUiBearingSpecs()` still requires that frontmatter as the strict
signal. `REQ-0163`, the consumer view in `01_Spec.md`, `US-0013-0013`,
`AC-0013-0022`, `BR-0013-0018` and the `surface_type` step of `10_Plan.md` state
both halves. `EX-0013-0018` states the first, and the shared glossary's
`D-SURFACE-TYPE-MISSING` entry in `_policies/06_Glossary.md` states the second.

**The first half is exercised against a helper no stage invokes.**
`populateSurfaceTypeIfUiCompanion` is exported from
`packages/qfai/src/core/detection/surfaceType.ts` and has no caller anywhere in
`src`. Three test files drive it directly:
`packages/qfai/tests/core/surfaceTypePopulate.test.ts`,
`packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts:111`
and `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts:110`.
The ledger row's `Evidence` cell already records the gap: "end-to-end
driver-side wiring tracked as follow-up".

**The second half is contradicted by the resolver.**
`packages/qfai/src/core/prototyping/specResolution.ts:209-212` admits a spec
whose frontmatter is absent when a matching UI contract exists, and
`packages/qfai/tests/core/prototyping/specResolution.test.ts:209-215` pins it:
`accepts the contract fallback even when 01_Spec.md has no marker`. The
resolver is `spec-0012`'s, and `EX-0012-0152` specifies that fallback. The
frontmatter is therefore not the strict signal, and a rerun restating that it is
would point a later change at removing behaviour another pack owns.

### 2. A finding is specified `warning` during a window and emitted `error` always

`REQ-0163`, the consumer view in `01_Spec.md`, `US-0013-0013`, `AC-0013-0023`,
`BR-0013-0018`, `EX-0013-0018`, `TC-0013-0031` and the `surface_type` step of
`10_Plan.md` require `D-SURFACE-TYPE-MISSING` at `warning` during a deprecation
window, sunsetting to `error` at window close. The glossary entry says the same.

`validateSurfaceTypeDrift` sets `const severity = "error" as const`, with no
window logic of any kind. **The mechanism those layers name no longer exists**:
it was removed by `retire the version-keyed severity mechanism`, a change whose
own title says what it did. `OC-63` in `_policies/07_Constraints.md` names the
window's sunset for this finding as `1.10.0` and marks it enforced, and the
package is `1.12.0`, so even on the retired mechanism the finding would now be
`error`.

The text around the covering cases is wrong under either reading. Three suites
pin `error` under titles saying the finding warns, each beside the comment
"Comparing against `deprecationSeverity` breaks if the validator hard-codes
again", written next to a hard-coded literal:

| File                                                                       | Says the finding warns                          | The comment   |
| -------------------------------------------------------------------------- | ----------------------------------------------- | ------------- |
| `packages/qfai/tests/core/surfaceTypePopulate.test.ts`                     | header, `describe` and `it` (lines 7, 110, 111) | lines 118-122 |
| `packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts` | `it` (line 117)                                 | lines 134-139 |
| `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`      | header, `it`, assertion message (8, 116, 126)   | lines 127-131 |

## Proposed change

For each of the two, settle which side is stale, make every layer of the pack,
and every shared policy statement that restates it, state the settled rule, and
leave a test that pins it.

## Options (at least 3) and recommendation

The options are per item. An approval names one per row of the decision
section; `Approved option` records them as `1c/2a` or the like.

### Item 1 — the unwired helper

**The resolver half is settled the same way under every option**: a spec is
UI-bearing by its frontmatter or by a matching UI contract, as `spec-0012`
specifies. That is not a choice this record offers. The resolver is another
pack's, its fallback is specified there, and the product and its tests
implement it. The options below settle the first half only.

| #   | Option                                                                                                                                      | Cost                                                                                                                                                                                              | Risk                                                                                                                             | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1a  | Wire the helper into `/qfai-sdd` so the obligation's first half has a driver, and add a case that drives the stage rather than the function | A product change and its test, plus whatever the stage's contract needs                                                                                                                           | The stage gains a write to a spec's frontmatter, which is an upstream edit made by a stage rather than by an author              |             |
| 1b  | Narrow `TC-0013-0030` to the helper's behaviour, and state that the wiring is not this pack's obligation                                    | The statements that name the stage as the writer, restated to the helper                                                                                                                          | The pack then specifies a function nobody calls. The obligation reads as met while the behaviour a user would see does not exist |             |
| 1c  | Split the obligation: keep the helper's half here, and record the wiring as its own requirement with its own row                            | The same restatement, and one new requirement chain, held `planned`, whose two ledger rows — an `E2E` row for its story and a row at its test case's level — are seeded when a slice activates it | Two records where there was one, and the new requirement waits, planned, until a slice takes it up                               | ✅          |

Option 1c is recommended, and the case against 1a is its risk rather than its
reach. 1a completes the obligation as written: it wires the helper and drives
the stage. But it makes `/qfai-sdd` write a spec's frontmatter, an upstream
edit made by a stage, which no stage contract provides for today, and approving
1a here would settle that question as a side effect. 1c keeps the wiring a
stated, tracked requirement without settling it now, and keeps the helper's
specified, tested behaviour in the pack. 1b is the one that discards half of
the obligation: calling the wiring out of scope makes its absence invisible.
The ledger cell already calls the wiring a follow-up, which is what 1c records.

### Item 2 — the finding's severity

| #   | Option                                                                                                                                 | Cost                                                                                                                      | Risk                                                                                                                                                                                                         | Recommended |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 2a  | Re-derive the layers to an unconditional `error`, and correct the titles, the assertion message and the comments the table above names | The requirement, story, criterion, rule, example, test case, plan step, the glossary's severity sentence and three suites | The pack stops recording that the finding was once a warning. The retirement change is where that history lives                                                                                              | ✅          |
| 2b  | Restore a window for this finding alone, closing at a release the user names                                                           | A mechanism retired repository-wide, re-introduced for one code; the release that closes it; and `OC-63` re-pinned to it  | A second severity path for one finding. The sunset `OC-63` names, `1.10.0`, has passed, so the window is open only until a later release, and which release that is is the user's to name, never the agent's |             |
| 2c  | Leave the layers and record the disagreement as known                                                                                  | Nothing now                                                                                                               | Every one of those statements keeps contradicting the product, which is the state this Change Request exists to end                                                                                          |             |

Option 2a is recommended because the mechanism the layers describe was removed
on purpose, repository-wide, by a change whose title says so. A spec requiring a
version-keyed severity is requiring a feature the product no longer has; and the
window it names has closed regardless, so both readings arrive at `error`.

## Blocked downstream items

| Item                                                                         | Kind         | Why it depends on the artifact                                                                           |
| ---------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------- |
| `spec-0013/TDD-0025`                                                         | `ledger-row` | Carries `TC-0013-0030`'s population boundary, which item 1 settles                                       |
| The row the ledger repair appends for `TC-0013-0030`'s resolver boundary     | `ledger-row` | Every option restates that boundary                                                                      |
| `spec-0013/TDD-0026`                                                         | `ledger-row` | Carries `TC-0013-0031`'s boundary for a companion without the frontmatter, whose severity item 2 settles |
| The row the ledger repair appends for `TC-0013-0031`'s no-companion boundary | `ledger-row` | Carries the test case item 2 re-derives                                                                  |
| `spec-0013` `E2E` rows whose `US-Refs` names `US-0013-0013`                  | `ledger-row` | Seeded by the ledger repair over a story every item-1 option restates                                    |

While this record is open, none of these rows is selected or given evidence.
The ledger repair returns `TDD-0025` and `TDD-0026` to `todo` and puts the
rest there, and evidence recorded against either side of a disagreement this
record has not settled would fix that side into the record.

- Not blocked by this CR: every other `spec-0013` row. The rows carrying
  `TC-0013-0025`, `TC-0013-0027` or `US-0013-0011` are blocked by the two
  defect requests instead. `TDD-0016`, the row for the lock write, is about
  which stage writes the lock, which neither item touches.
- Overlapping open CRs: **the `spec-0013` ledger repair is
  `CR-20260913-0009`.** It re-derives that ledger to its template, splitting
  `TDD-0025` and `TDD-0026`, and is applied first; this record is refreshed
  against the ledger it leaves, including the `US-0013-0013` rows it seeds,
  before either item is approved. Four more open records name files this
  record names — the `spec-0013` statement files, `09_delta.md`, `10_Plan.md`
  and `tdd/test-list.md`:

  | Order | Record             | What it edits that this record also edits                                                |
  | ----- | ------------------ | ---------------------------------------------------------------------------------------- |
  | 1     | `CR-20260913-0009` | `tdd/test-list.md`, `09_delta.md`                                                        |
  | 2     | `CR-20260913-0010` | the statement files that name the UI contract template, `09_delta.md`, `10_Plan.md`      |
  | 3     | `CR-20260913-0001` | the band statements, `09_delta.md`, `10_Plan.md`, `tdd/test-list.md`                     |
  | 4     | `CR-20260913-0008` | `06_Test-Cases.md`, `09_delta.md`, `tdd/test-list.md`                                    |
  | 5     | `CR-20260913-0011` | the statement files, `06_Test-Cases.md`, `09_delta.md`, `10_Plan.md`, `tdd/test-list.md` |
  | 6     | this record        | —                                                                                        |

  **They are applied in that order**, and each assumes every earlier one has
  landed. `CR-20260913-0010` before `CR-20260913-0001` is the order those two
  already state. If any earlier record is rejected, each later one is restated
  against the text as it then stands before it is applied, never applied as
  written. The blocked sets do not intersect.

## Impact scope

- Specs: `spec-0013`, and `_policies` for the `D-SURFACE-TYPE-MISSING` glossary
  entry and, under `2b`, `OC-63`
- Plans: `.qfai/specs/spec-0013/10_Plan.md`
- Tests: the rows carrying `TC-0013-0030` or `TC-0013-0031`, and the `E2E` rows
  carrying `US-0013-0013` —
  `packages/qfai/tests/core/surfaceTypePopulate.test.ts`,
  `packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts`,
  `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`; and,
  through the `/qfai-atdd spec-0013` pass in action 4, every other ATDD-owned
  `spec-0013` row still owed that no open Change Request blocks when that pass
  runs, with `.qfai/evidence/atdd-spec-0013.md` and
  `.qfai/evidence/coverage-depth-spec-0013.md`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR, by outcome:

  | Path                                              | Edited under              |
  | ------------------------------------------------- | ------------------------- |
  | `.qfai/specs/_policies/06_Glossary.md`            | every outcome             |
  | `.qfai/specs/_policies/07_Constraints.md`         | `2b`                      |
  | `.qfai/specs/_policies/10_delta.md`               | every outcome             |
  | `.qfai/specs/spec-0013/01_Spec.md`                | every outcome             |
  | `.qfai/specs/spec-0013/02_User-stories.md`        | every outcome             |
  | `.qfai/specs/spec-0013/03_Acceptance-Criteria.md` | every outcome             |
  | `.qfai/specs/spec-0013/04_Business-Rules.md`      | every outcome             |
  | `.qfai/specs/spec-0013/05_Examples.md`            | every outcome but `1a/2c` |
  | `.qfai/specs/spec-0013/06_Test-Cases.md`          | every outcome             |
  | `.qfai/specs/spec-0013/07_Decisions.md`           | `2c`                      |
  | `.qfai/specs/spec-0013/09_delta.md`               | every outcome             |
  | `.qfai/specs/spec-0013/10_Plan.md`                | every outcome             |
  | `.qfai/specs/spec-0013/tdd/test-list.md`          | every outcome             |

  **Product paths, under the options that change the product** — `1a` reaches
  `packages/qfai/src/core/detection/surfaceType.ts` and the `/qfai-sdd` skill
  under `packages/qfai/assets/init/` with its root mirror; `2b` reaches
  `packages/qfai/src/core/validators/surfaceTypeDrift.ts` for its severity, and
  **every outcome reaches that file for its remediation**, which approved action
  4 corrects. **The table and this paragraph are reduced to the approved
  outcomes before `Status: approved` is written**, so what an approval covers is
  read off the paths rather than off the conditions beside them. Under the
  recommended set, `1c/2a`, `07_Constraints.md` is struck from the table, the
  product edits are that remediation and the test-side corrections named below,
  and every other path in this paragraph is struck.

  The test files above are in scope under every outcome, because each item's
  settlement changes what its covering cases assert or what their text claims.

## Decision needed from user

Two questions, settled independently, and one value that only the second can
ask for.

1. **The surface-type helper.** Is the missing `/qfai-sdd` wiring a separate
   requirement with its own row, out of this pack's scope, or work to do now?
   The resolver half follows `spec-0012` whichever is chosen.
2. **The drift finding's severity.** Is `D-SURFACE-TYPE-MISSING` an
   unconditional error, or should a deprecation window be restored for it?
   Restoring one also re-pins the shared constraint `OC-63` to the release
   that closes it.
3. **Only if a window is restored:** the release at which it closes. There is
   no recommended value, because a release number is the user's to choose.

## Approved actions (owner skill rerun plan)

1. **The shared policy statements first.** Edited by hand under this approval:

   | File                          | Statement                                                                                                                                                                              | Under         |
   | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
   | `_policies/06_Glossary.md`    | The `D-SURFACE-TYPE-MISSING` entry's sentence saying `resolveAllUiBearingSpecs()` requires the frontmatter as the strict signal, restated to the frontmatter or a matching UI contract | every outcome |
   | `_policies/06_Glossary.md`    | The same entry's "Warning during the window, error at sunset", restated to an unconditional error                                                                                      | `2a`          |
   | `_policies/07_Constraints.md` | `OC-63`'s sunset for `D-SURFACE-TYPE-MISSING`, re-pinned to the release the user names and no longer marked enforced                                                                   | `2b`          |

   Under `2a`, `OC-63` is not edited: it records that sunset as enforced, which
   is the unconditional error `2a` states. Under `2b` the glossary's severity
   sentence stays, since it names no release, and under `2c` item 2 moves
   nothing.

   A policy-level `/qfai-sdd` rerun, mode `confirm-only`, then confirms the
   edits and adds this Change Request's row to the `## Change Requests` table
   of `_policies/10_delta.md`. **`confirm-only`, not `re-derive`**: without an
   argument `/qfai-sdd` targets every capability and fans Phase 2 through
   Phase 4 out over every spec, so a `re-derive` there would rewrite and
   re-seed packs this record does not reach, while `confirm-only` writes
   nothing but the Change Request reference. **It comes before the
   `spec-0013` rerun**: that rerun copies applicable policy down into
   `01_Spec.md`, and a policy statement still carrying the old rule would be
   copied back.

   No Decision Record is amended: no `DR-*` in `_policies/08_Decisions.md` or
   `spec-0013/07_Decisions.md` states either rule. The CHG-006 entries of
   `_policies/05_Contracts.md` and `_policies/10_delta.md` that name the
   finding's window record what that change adopted, and are not re-derived.

   **`_policies/05_Contracts.md` is nonetheless in `1b`'s scope, for the other
   statement it carries.** Its contract index says `surface_type`
   auto-population is a `/qfai-sdd` step. `1b` re-derives this pack to say that
   write is not its obligation, so left alone that index is the only active
   statement owning the behaviour, in a file every pack reads. Under `1b` the
   index is reconciled with it — naming the helper as the writer, or naming the
   owner that keeps satisfying it. Under `1c` the index stands, because that
   option states the stage's write as a requirement chain of this pack's own.

2. `/qfai-sdd spec-0013` rerun, mode `re-derive`, scope by item:

   | Item | Statements re-derived                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
   | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 1    | Under every option, the resolver half of `REQ-0163`, the consumer view, `US-0013-0013`, `AC-0013-0022`, `BR-0013-0018`, `TC-0013-0030` and the `10_Plan.md` step, to the frontmatter or a matching UI contract. The helper half per the option: under `1b` and `1c` the same statements and `EX-0013-0018` name the helper, not the stage, as what writes the frontmatter; `1b` states that the stage's write is not this pack's obligation, and `1c` states it as a new requirement chain, story through test case |
   | 2    | `REQ-0163`, the consumer view, `US-0013-0013`, `AC-0013-0023`, `BR-0013-0018`, `EX-0013-0018`, `TC-0013-0031` and the `10_Plan.md` step — under `2b` with the release the user named                                                                                                                                                                                                                                                                                                                                |

   One rerun performs both items, and it records this Change Request as one row
   in `spec-0013/09_delta.md`'s `## Change Requests` table — `CR ID`,
   `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — not as a
   `## Triage` row.

   **The ledger repair is applied first, and is not yet written.** It re-derives
   `spec-0013`'s ledger
   to its template: the six columns it lacks, the `Integration` and `E2E` rows
   Phase 2b owes — `US-0013-0013`'s among them, one per boundary its criteria
   name — and the split of all thirteen progressed rows that run several
   boundaries behind one `Selector`, with the resets those splits owe.
   `TDD-0025` keeps the population boundary and a row is appended for the
   resolver; `TDD-0026` keeps the finding for a companion without the
   frontmatter and a row is appended for a spec with no companion. This
   rerun's Phase 2b therefore meets nothing to migrate, seed or split, and this
   record authorises no ledger write beyond action 3. A progressed row of that
   shape the rerun still meets is raised then as a request of its own and left
   as it is until that request is approved; nothing else in this plan waits on
   it.

3. Downstream ledger sweep, per boundary. Phase 2b pairs each re-derived
   boundary of `TC-0013-0030`, `TC-0013-0031` and `US-0013-0013` with the row
   whose `Boundary` names it. The rows the ledger repair seeds or appends are
   named here by their obligation and boundary rather than by a `TDD-ID`, which
   that record allocates.
   - **Re-pointed under `1b` and `1c`: `spec-0013/TDD-0025`, and the
     `US-0013-0013` `E2E` row for the frontmatter written on a spec with a
     companion.** Both options take the stage out of that boundary — `1b`
     makes the stage's write no obligation of this pack, and `1c` gives it to
     the new story — and leave the helper's write in its place. Phase 2b
     re-scopes both rows to the helper's write, so neither is left selectable
     against a boundary its `TC-Refs` or `US-Refs` no longer declares, and
     under `1c` the stage's write is carried only by the new chain's rows.
     Neither row is retired: each keeps an obligation, the helper's write,
     which the existing cases already exercise and `TDD-0025`'s recorded
     evidence already observed.
   - **Reset to `todo`**, recording this CR's ID in `DR-ID`, wherever the row
     has left `todo` by then:

     | Boundary restated                                                            | Rows                                                         | Under         |
     | ---------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------- |
     | The resolver's signal, to the frontmatter or a matching UI contract          | The `TC-0013-0030` and `US-0013-0013` rows for it            | every outcome |
     | The frontmatter written on a spec with a companion, to the helper's write    | The two rows re-pointed above                                | `1b`, `1c`    |
     | The finding for a companion without the frontmatter, to the settled severity | `spec-0013/TDD-0026` and the `US-0013-0013` `E2E` row for it | `2a`, `2b`    |

     Any observation recorded on these rows is of a rule being replaced.
     The ledger repair returns `TDD-0025` and `TDD-0026` to `todo` and puts
     the other rows there, and this record's blocked set keeps them
     unselected, so a reset is owed only to a row a run has moved since.

   - **Not reset**: the rows of `TC-0013-0031` and `US-0013-0013` for a spec
     with no companion, whose boundary no option restates; and under `1a`,
     `TDD-0025` and the `E2E` row for the stage's write, whose boundary `1a`
     keeps while their cases change (action 4).
   - **Nothing is appended under `1c` yet.** The new story and test case are
     marked `x-qfai-status: planned` (action 4), and Phase 2b seeds an `E2E` row
     only for an active story, nor a row for a planned test case, so an
     appended row would be one no test is owed for and the completion gate
     could never see terminal. The option's rows, an `E2E` row with the new
     story in `US-Refs` and a row at the test case's declared level with it in
     `TC-Refs`, are seeded by the rerun that activates the two.
   - No row is retired. Every row keeps an obligation under every option, so
     the retirement branch does not apply and no `TDD-ID` reservation is owed.
   - **Under `2c`, `TDD-0026` is reset by the ledger repair and needs a
     terminal path of its own.** That repair returns it to `todo`, and action 4
     then runs `/qfai-atdd` over every unblocked owed row — while the test case
     requires a warning and the case asserts an error, which `2c` declines to
     change. The row therefore completes as an `exception`, and the
     `/qfai-sdd spec-0013` rerun writes, under `2c`, the Decision Record that
     says so in `spec-0013/07_Decisions.md`: the
     product states the finding at `error`, the pack states it at `warning`,
     and `2c` is the option that keeps both. Without that record the row has no
     ending and `2c` is an outcome nothing can execute.

4. **In this order**, once the rerun above has written the ledger:
   1. `/qfai-implement spec-0013` runs its Change Request preflight, which
      writes action 3's resets before the ledger is read for anything else. It
      advances none of the rows this record names: their handover for this
      cycle is the next step's to record. It makes no product edit.
   2. `/qfai-atdd spec-0013` makes the test edits. The rows this record names
      are `Integration` and `E2E` rows, whose tests that stage writes and
      `/qfai-implement` does not (`qfai-implement/SKILL.md`).
      - **The resolver.** Under every outcome, the two resolver rows get a case
        asserting that a spec with a matching UI contract and no frontmatter is
        UI-bearing. Where an earlier pass wrote one against the old wording, it
        is corrected instead.
      - **The population.** Under `1a`, `TDD-0025` and the `E2E` row for the
        stage's write get cases that drive the stage rather than the helper.
        Under `1b` and `1c` the re-pointed rows take the cases that drive the
        helper, which `surfaceTypePopulate.test.ts` and
        `spec0013ActivePointerSurfaceTypeE2E.test.ts` already hold, and the
        header of `surfaceTypePopulate.test.ts` stops calling it the helper
        `/qfai-sdd` invokes. **Under `1c` no test is written for the new
        requirement, and it has no row to leave at `todo`.** A test written for
        it could only fail until the stage write `1c` records as a requirement
        is implemented, and a failing test is the RED handoff `/qfai-atdd` owes
        and `/qfai-implement` needs. `1c` marks the new story and test case
        `x-qfai-status: planned` instead, in `02_User-stories.md` and
        `06_Test-Cases.md`, which is the declared way to hold an obligation
        outside the current slice: the stage owes it no test yet, and the
        requirement the option records is what is tracked until a later slice
        activates it and its rows are seeded.
      - **The test-side text.** Each title, message and comment the item 2
        table names is corrected to state what its case asserts. It is owed
        under every outcome, save the titles `2c` leaves below: text stating
        the opposite of the case beneath it is what let both of these sit
        unreported. **Under `2b` the window has two sides and both are
        asserted**: a case injecting a version before the release the user
        named, which expects `warning`, and one at or after it, which expects
        `error`. Moving the existing assertions to the current severity alone
        would leave an implementation that returns `warning` for ever passing
        every case while contradicting the rule `2b` restores. The two are
        independently observable, so each is its own ledger row.

        **Some of those titles are a row's `Selector`.** `TDD-0026` selects on
        `D-SURFACE-TYPE-MISSING warns on companion-without-frontmatter`, the
        `describe` title in `surfaceTypePopulate.test.ts`, and once
        the ledger repair narrows it, on the cases beneath that title, one of
        which calls the finding a warning. Under `2a` those titles are renamed
        and the row's `Selector` stops resolving, so the stage records the
        renamed titles in the row's handover entry, and `/qfai-implement`
        writes them into the cell when it advances the row — a write the Drift
        Protocol allows while the cell does not resolve. Under `2b` the
        restored window makes the titles true again, and they stay. Under `2c`
        item 2 moves nothing, so the titles stay beside the test case they
        match, and only the comments and the assertion message are corrected.

      - **The remediation.** `surfaceTypePopulate.test.ts` asserts the
        corrected remediation text the next step writes.

      The stage records the handover of the rows this record names. **That
      invocation is not limited to these rows**: it takes up every ATDD-owned
      `spec-0013` row still owed when it runs that no open Change Request
      blocks, as that stage's ordinary forward work. It writes their tests
      under `packages/qfai/tests/**`, their entries in
      `.qfai/evidence/atdd-spec-0013.md`, and a refreshed
      `.qfai/evidence/coverage-depth-spec-0013.md` through its reviewer gate.
      None of that edits an upstream path.

   3. `/qfai-implement spec-0013` resumes from that handover and makes the
      product edits.

      **Under every outcome, `D-SURFACE-TYPE-MISSING`'s remediation is
      corrected.** `packages/qfai/src/core/validators/surfaceTypeDrift.ts`
      tells the user a spec without the marker is excluded from the UI-bearing
      set, so its screens are skipped. The resolver item 1 settles takes such a
      spec in through its UI contract, which is the companion this finding
      fires on, so the remediation says the marker records on the spec what the
      contract already implies. Under `1b` and `1c` it also stops offering a
      `/qfai-sdd` rerun to populate the marker, which no stage does under
      either option.

      Under `1a` the run wires the helper into `/qfai-sdd`, and under `2b` it
      restores the window closing at the release the user named.

      **These edits can reach other specs' certified work.** Before making
      them, the run takes the detection step
      `.qfai/assistant/skills/qfai-implement/references/cross-spec-ownership.md`
      sets out over every file it edits, reading every other spec's `done`
      rows. `packages/qfai/src/core/validate.ts` imports the validator, so the
      reverse-dependency walk reaches every test importing the validate
      pipeline, and the run decides the set. Each match is recorded under
      `## Cross-spec obligations` in `.qfai/evidence/atdd-spec-0013.md`, the
      evidence file of the rows these edits are made for, its `Selector` is
      re-run against the changed tree, and `completion-reviewer` reviews those
      rows' obligations beside `spec-0013`'s, with the fresh results as its
      input.

## Resolution

Not yet resolved.
