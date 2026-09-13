# Change Request

- ID: `CR-20260913-0001`
- Title: `spec-0013 keeps the primary_tasks lower bound the validator dropped`
- Raised by: `qfai-implement`
- Raised at: `2026-09-12T19:06:27Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`QFAI-AUD-020` is a ceiling today. `packages/qfai/src/core/validators/designAudit.ts`
raises it when a screen's `primary_tasks` count is **over** the recommended
maximum and at no other count, and
`packages/qfai/tests/integration/primaryTasksBand.test.ts` pins that with a case
named `count == 1 emits nothing`.

`spec-0013` still specifies a band. `06_Test-Cases.md`'s `TC-0013-0033` reads
"Verify a screen declaring fewer than 3 or more than 7 `primary_tasks` triggers
the `QFAI-AUD-020` warning naming the band; 3 and 7 (inclusive bounds) do not."

So the spec says one task warns and the test says it does not, and
`.qfai/specs/spec-0013/tdd/test-list.md` joins them: `TDD-0028` carries
`TC-0013-0033`, names that test file, and stands at `done`.

The lower bound was removed as product work. Nothing recorded it upstream: the
implementation, the tests, the shipped skill documents, the templates and the
changelog moved, and the spec packs and the three decision records did not.

**Three decisions state the band as a decision.** `_policies/08_Decisions.md`
`DR-0267` chose 3..7 and gives "Below 3 risks under-specified screens" as half
its rationale; `spec-0013/07_Decisions.md` `DR-0013-0003` cites it and repeats
the band; and `spec-0004`'s `DR-0004-0014`, described below, adopts it. The
removal overturned all three, and the reasoning it was carried out on is the
opposite of theirs: seven tasks weaken a screen's focus, one **is** the focus,
so a floor warns against the thing it was meant to protect.

That is the part a rerun cannot settle by following the product. A decision
record is what it says it is at the date it carries; whether a reversed decision
is rewritten in place or left standing with a later record beside it is the
question this Change Request puts.

## Proposed change

Bring `spec-0013` and `spec-0004` into agreement with the validator on the lower
bound, and record what happened to the three decisions that chose the band. The
statements that carry the floor in `spec-0013` are:

| File                        | What carries it                                         |
| --------------------------- | ------------------------------------------------------- |
| `01_Spec.md`                | `REQ-0164` and the Consumer View's band sentence        |
| `02_User-stories.md`        | `US-0013-0014`, heading and body                        |
| `03_Acceptance-Criteria.md` | `AC-0013-0024`, which names `below 3`                   |
| `04_Business-Rules.md`      | `BR-0013-0019`, "Below 3 risks under-specified screens" |
| `05_Examples.md`            | `EX-0013-0019`                                          |
| `06_Test-Cases.md`          | `TC-0013-0032` and `TC-0013-0033`                       |
| `07_Decisions.md`           | `DR-0013-0003`                                          |
| `08_Open-questions.md`      | the `OQ-0158` resolution record                         |
| `10_Plan.md`                | the item describing the band                            |

`_policies/08_Decisions.md` `DR-0267` is the tenth, and it belongs to every
spec rather than to this one.

**`spec-0004` states the same band, and one of its completed rows is on the
same test.** `01_Spec.md` line 108 and its Consumer View bind `REQ-0164` to
"the `3..7` recommended count band (DR-0267)", and the band is repeated through
the whole pack — `03_Acceptance-Criteria.md`, `04_Business-Rules.md`,
`05_Examples.md`, `06_Test-Cases.md`, the `OQ-0158` resolution in
`08_Open-questions.md`, `10_Plan.md`, and `07_Decisions.md`'s `DR-0004-0014`,
which adopts `DR-0267` verbatim and is a **third** decision to settle. And
`spec-0004/TDD-0050` stands `done` on
`packages/qfai/tests/unit/core/validators/auditProfileBandReject.test.ts`,
which asserts a ceiling and that one task emits nothing.

It is in this Change Request rather than a second one because the two packs
share `DR-0267`: settling the decision for one and not the other leaves the
shared record and one of its readers disagreeing, which is the state this
document exists to remove.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                                                                                              | Cost                                                                                                                                                                                                                                                                                                                 | Risk                                                                                                                                                                                                                                                                                                                                                                                                              | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Narrow the spec to the product, and **supersede** the three decisions with a new one: the band's floor is withdrawn, `QFAI-AUD-020` is a ceiling, and the records that chose 3..7 keep their `Decision` text and are marked superseded as the actions below set out | Nine `spec-0013` statements and every `spec-0004` statement carrying the band rewritten, plus one `_policies` record; one new `DR-*` in `_policies`; reset `spec-0013/TDD-0027`, `TDD-0028` and `spec-0004/TDD-0050`; the band assertions of two skipped `spec-0004` suites; the ATDD stage's coverage-depth refresh | Records today's behaviour as intended. A decision nobody reviewed at the time becomes the recorded one — but it is already the shipped one, and the record says by whom and when                                                                                                                                                                                                                                  | ✅          |
| 2   | Narrow the spec to the product, and **rewrite** the three decisions in place to say `ceiling 7`                                                                                                                                                                     | The same statements, resets, suites and refresh; no new record                                                                                                                                                                                                                                                       | The **authoritative** lineage goes: the Decision Records stop saying a floor was chosen, and the rejected options `DR-0267` lists ("1..3 minimal band") lose the thing they were rejected against. The history survives outside them — this Change Request, the changelog entry for the removal, and the delta rows that recorded the adoption — so a reader who knows to look elsewhere can still reconstruct it |             |
| 3   | Restore the floor in the product: `QFAI-AUD-020` warns below the minimum again, and the spec stands                                                                                                                                                                 | A validator change, its tests, the shipped template comments, the guide and a changelog entry; no spec edit. The same three `confirm-only` invocations and delta rows as the other options, the three `done` rows re-verified in place, and the ATDD stage's coverage-depth refresh                                  | Reverses a deliberate removal on a rationale nobody has contradicted — one task is a screen's focus, and a floor warns against it. A CR of its own would be the place to argue that                                                                                                                                                                                                                               |             |

Option 1 is recommended because the three records are the artifact this Change
Request is actually about. A decision record's value is that it says what was
chosen and why at a date, and it is where a reader looks first; rewriting one
moves that history out of the authoritative place and into this document, the
changelog and the delta rows, where only a reader who already knows to look will
find it. Superseding keeps both halves in the records themselves — the choice
and its reversal — and the options `DR-0267` enumerates stay meaningful,
because what they were rejected against is still written where they are.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                  |
| -------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `spec-0013/TDD-0027` | `ledger-row` | `TC-0013-0032` names the band the shipped documents are required to state                       |
| `spec-0013/TDD-0028` | `ledger-row` | `TC-0013-0033` states the floor the validator does not raise                                    |
| `spec-0004/TDD-0050` | `ledger-row` | `TC-0004-0070` is on the test that asserts the ceiling, under a `REQ-0164` that states the band |

- Not blocked by this CR: the other ten `done` rows of `spec-0013`'s ledger,
  and every `spec-0004` row but `TDD-0050`.
  Their obligations are independent of the band, so the evidence backfill that
  covers them continues. **Those three are the exception**: writing evidence for
  a row whose obligation the product states the opposite of records the
  contradiction rather than discharging it.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0013` — `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/05_Examples.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/07_Decisions.md`,
  `.qfai/specs/spec-0013/08_Open-questions.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`,
  `.qfai/specs/spec-0004/01_Spec.md`,
  `.qfai/specs/spec-0004/02_User-stories.md`,
  `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0004/04_Business-Rules.md`,
  `.qfai/specs/spec-0004/05_Examples.md`,
  `.qfai/specs/spec-0004/06_Test-Cases.md`,
  `.qfai/specs/spec-0004/07_Decisions.md`,
  `.qfai/specs/spec-0004/08_Open-questions.md`,
  `.qfai/specs/spec-0004/09_delta.md`,
  `.qfai/specs/spec-0004/10_Plan.md`,
  `.qfai/specs/spec-0004/tdd/test-list.md`,
  `.qfai/specs/_policies/08_Decisions.md`,
  `.qfai/specs/_policies/10_delta.md`
- Plans: `.qfai/specs/spec-0013/10_Plan.md` and `.qfai/specs/spec-0004/10_Plan.md`
  — the item describing the band in each, and nothing else in either file
- Tests: `spec-0013/TDD-0027`, `spec-0013/TDD-0028`, `spec-0004/TDD-0050`; and
  under options 1 and 2
  `packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts`
  and `packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts`,
  whose skipped cases require the finding to name `3..7`; and under option 3
  the four suites action 4 rewrites,
  `packages/qfai/tests/integration/primaryTasksBand.test.ts`,
  `packages/qfai/tests/unit/core/validators/auditProfileBandReject.test.ts`,
  `packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts` and
  `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: the `Specs` and `Plans` paths above.
  **Under option 3 it reduces to the three delta files** the `confirm-only`
  reruns write — `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0004/09_delta.md` and `.qfai/specs/_policies/10_delta.md`:
  that option changes the product and leaves every upstream statement standing,
  so approving it authorises no other upstream edit. The section is reduced to
  the approved outcome before `Status: approved` is written, because
  `QFAI-DRIFT-001` reads a path here and not the condition beside it.

## Decision needed from user

Which of the three: narrow the spec and supersede the **three** decisions that
chose the band — `_policies` `DR-0267`, `spec-0013` `DR-0013-0003`, and the band
entry of `spec-0004`'s composite `DR-0004-0014`; narrow the spec and rewrite all
three in place; or restore the floor in the product and leave the spec as it
stands.

## Approved actions (owner skill rerun plan)

1. **Three invocations, under every option**, because the change spans two
   artifact classes and two packs, and
   `.qfai/assistant/constitution/drift-protocol.md` gives each its own. **All
   three run in `confirm-only`**; what each confirms depends on the option.

   | Invocation            | Under options 1 and 2, confirms                                                                                                                                                                                                                                                                                                                                                 | Under option 3, confirms    | CR reference lands in                                                |
   | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------- |
   | `/qfai-sdd spec-0013` | The nine statements under `## Proposed change`, plus `10_Plan.md`'s band item, as edited by hand under this approval                                                                                                                                                                                                                                                            | that every statement stands | `spec-0013/09_delta.md`, and `07_Decisions.md` under options 1 and 2 |
   | `/qfai-sdd spec-0004` | Every statement that carries the band, as edited by hand under this approval: `REQ-0164` and its Consumer View sentence, `US-0004-0038` — which requires the finding to name a recommended count band — `AC-0004-0037`, `BR-0004-0031`, the example, `TC-0004-0070`, the `OQ-0158` resolution, the plan item, and `DR-0004-0014` — a third decision adopting `DR-0267` verbatim | that every statement stands | `spec-0004/09_delta.md`, and `07_Decisions.md` under options 1 and 2 |
   | `/qfai-sdd`           | `_policies/08_Decisions.md` — `DR-0267`, superseded or rewritten by the option                                                                                                                                                                                                                                                                                                  | that `DR-0267` stands       | `_policies/10_delta.md`, and `08_Decisions.md` under options 1 and 2 |

   **The template path is corrected in every statement options 1 and 2 edit.**
   `REQ-0164`, `US-0013-0014`, `AC-0013-0024`, `BR-0013-0019`, `EX-0013-0019`,
   `TC-0013-0032`, `DR-0013-0003`, the `10_Plan.md` item and `DR-0267` name
   `templates/contracts/ui-spec.yaml`, which the package does not ship; the
   template is `templates/contracts/ui-contract.sample.yaml`. A statement
   narrowed to the ceiling names the shipped file, so `TC-0013-0032` does not
   go on requiring documentation in an artifact nobody can check. A superseded
   record keeps its text, path included. Under option 3 no statement is edited,
   and the path defect is left to a record of its own.

   Each delta write is one row of that file's `## Change Requests` table —
   `CR ID`, `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — and not a
   `## Triage` row.

   **`confirm-only`, with the edits made by hand, rather than `re-derive`.** A
   `re-derive` rerun runs Phase 2b over each target ledger, and Phase 2b seeds
   an `E2E` row for every active `US-*` that has none. This repository declares
   no UI-bearing spec, so every story is active, and the two ledgers lack
   thirteen such rows each: `spec-0004` has sixteen stories and rows naming
   three, `spec-0013` fourteen and one. A `re-derive` would add those 26 `todo`
   rows to a change about one band. They are owed regardless, and seeding them
   is a rerun of its own.

   Under option 3 the reruns still run: the Drift Protocol names an owner rerun
   for every artifact class a Change Request reaches, and without them no delta
   records how this one was settled, so `Applied at` could not be written. A
   bare `/qfai-sdd` cannot reach a spec-local file and a `<spec-id>` one cannot
   reach the policy record, so naming one invocation would leave part of the
   record unwritten however it was read.

2. The decision records, under options 1 and 2 and differing by option.
   - **Option 1**: a new `DR-*` in `_policies/08_Decisions.md` recording the
     withdrawal, its date and its rationale, naming this Change Request in its
     `Related` list. **Those are the fields the layout defines** — `Status`,
     `Context`, `Decision`, `Consequences`, `Related` — and the Drift Protocol
     forbids inventing another, so there is no `Superseded by` field to write.

     **The link runs through this Change Request, because `Related` cannot hold
     a decision.** The spec template admits `AC-*`, `BR-*`, `TC-*`, `TDD-*` and
     `CR-*` there, and the policy template specs, capabilities, contracts and
     `CR-*`; neither admits a `DR-*`. So a superseded record names
     `CR-20260913-0001` in `Related`, and this record names the new decision.
     The lineage reads in two steps, each through a value the layout permits.

     `DR-0267` and `spec-0013/07_Decisions.md` `DR-0013-0003` keep their
     `Decision` text and take `Status: superseded` with this CR in `Related`.

     **`DR-0004-0014` is not superseded as a record.** It is a composite: it
     adopts `DR-0267` alongside `DR-0268`'s structured task shape and
     `DR-0274`'s pack-location rule, neither of which this Change Request
     reaches. `Status` is a field of the whole record, so setting it would mark
     two standing decisions as withdrawn. The record keeps its `Status`; its
     band entry is edited to say that adoption is superseded and to name this CR,
     and this CR is added to the record's `Related` list. The other two
     adoptions are not touched.

   - **Option 2**: **all three** rewritten to state a ceiling — `DR-0267`,
     `DR-0013-0003` and `DR-0004-0014`. The third is a composite record that
     adopts `DR-0267` verbatim alongside `DR-0268` and `DR-0274`, which this
     Change Request does not reach: only its band entry is rewritten, and the
     other two choices stay as they are. All three are named because the option
     settles the band for every record that adopted it; a record left out would
     still adopt `3..7` once the option was applied.

     **Each of the three takes this Change Request in its `Related` list.** A
     Change Request that amends a `DR-*` records its reference in the Decisions
     file, and `Related` is the field that holds it; the delta rows alone do not
     say which record the amendment reached. `DR-0004-0014` keeps every
     relationship it already lists.

     **The re-derived trade-offs go in `Consequences`.** The layout defines
     `Status`, `Context`, `Decision`, `Consequences` and `Related`, and the
     Drift Protocol forbids inventing another — so an instruction to re-derive a
     `Rejected` list either asks for a field the layout does not define, or
     entrenches one that exists today outside it. What a rewritten record owes
     is the reason the alternatives were not taken, and `Consequences` is where
     that belongs.
3. Downstream ledger sweep, under options 1 and 2. Reset to `todo`, recording
   this CR's ID in their `DR-ID` column: `spec-0013/TDD-0027`,
   `spec-0013/TDD-0028`, `spec-0004/TDD-0050`. None is retired: every
   obligation survives with a changed statement, so the rows are re-derived
   rather than deleted.

   **Under option 3 no row is reset.** The obligations and their sources stand,
   and the approved reset exists for an upstream change that invalidates a
   row's obligation (`change-request-reset.md`), so recording this request in
   `DR-ID` would claim a change that did not happen. Action 4 still rewrites
   the validators and tests the three rows certify, so **those rows are
   re-verified in place**, by the path
   `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md`
   sets out for a repair over code a `done` row produced: a
   `## Shared-artifact re-verify` line per row at the new `Revision`, carrying
   its selector re-run, its `Oracle proof` re-taken and fresh verdicts from its
   required reviewers. The restored floor moves what those tests assert, so
   each line also carries falsifiability evidence for the corrected assertion,
   with `qa-gatekeeper` routed on the mutation run. `spec-0004/TDD-0050`
   belongs to another spec, so the run records it under
   `## Cross-spec obligations` as well
   (`.qfai/assistant/skills/qfai-implement/references/cross-spec-ownership.md`).

   Under options 1 and 2, `/qfai-atdd spec-0004` updates the two skipped cases
   the `Tests` line names — `spec0004SaasPackageAndPackLocation.test.ts` lines
   68-74 and `spec0004SaasPackageAndPackLocationE2E.test.ts` lines 77-85 — which
   require the finding to name `3..7`. Both are acceptance tests, an
   `Integration` case and an `E2E` one, and `/qfai-implement` writes neither
   (`qfai-implement/SKILL.md`). A skipped test still counts as declared
   coverage (`.qfai/assistant/catalog/test-layers.md`), so left as they are they
   would keep crediting the withdrawn band, and enabling either would fail.

   **`/qfai-atdd spec-0013` refreshes `.qfai/evidence/coverage-depth-spec-0013.md`
   under every option.** Its `BR-0013-0019` row and its findings score the
   missing floor and the missing template file. Options 1 and 2 rewrite that
   rule, and option 3 restores the behaviour it names, so each outcome changes
   what those cells and findings describe. The matrix is owned from the ATDD
   stage onward (`qfai-atdd/SKILL.md`), so the refresh goes through that
   stage's reviewer gate.

4. Under option 3 only: `packages/qfai/src/core/validators/designAudit.ts`,
   `packages/qfai/src/core/validators/auditProfile.ts` and their tests —
   `packages/qfai/tests/integration/primaryTasksBand.test.ts`,
   `packages/qfai/tests/unit/core/validators/auditProfileBandReject.test.ts`,
   `packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts` and
   `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts` — the
   last two require a two-task screen to emit nothing, which a restored floor
   contradicts, so leaving them out ends the option in a red suite —
   with the shipped template and guide that state the band:
   `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml`,
   whose comments currently read "at most 7" and "There is no lower bound", and
   `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/ui-contract-guide.md`.
   The package source, not the generated `.qfai` mirror: `sync:ssot` writes that
   from these, and an edit made there is overwritten on the next run. And
   `CHANGELOG.md`: an entry under `## [Unreleased]` saying the warning below the
   minimum is back, because it reverses a behaviour users were told of. The
   released entry that recorded the removal stays as it is. That option is
   implementation work and its scope is product paths rather than upstream ones.
   The cases under `tests/integration/**` and `tests/e2e/**` among those tests
   are acceptance tests, which `/qfai-atdd spec-0013` updates; the validator
   change, the unit case, the template, the guide and the changelog entry are
   `/qfai-implement`'s.

## Resolution

<!-- Filled in when Status leaves `open`. -->
