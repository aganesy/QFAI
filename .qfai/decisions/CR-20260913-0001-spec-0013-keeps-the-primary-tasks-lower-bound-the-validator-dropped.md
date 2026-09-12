# Change Request

- ID: `CR-20260913-0001`
- Title: `spec-0013 keeps the primary_tasks lower bound the validator dropped`
- Raised by: `qfai-implement`
- Raised at: `2026-09-13T00:00:00Z`
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
changelog moved, and the spec pack and the two decision records did not.

**Two decisions state the band as a decision.** `_policies/08_Decisions.md`
`DR-0267` chose 3..7 and gives "Below 3 risks under-specified screens" as half
its rationale; `spec-0013/07_Decisions.md` `DR-0013-0003` cites it and repeats
the band. The removal overturned them, and the reasoning it was carried out on
is the opposite of theirs: seven tasks weaken a screen's focus, one **is** the
focus, so a floor warns against the thing it was meant to protect.

That is the part a rerun cannot settle by following the product. A decision
record is what it says it is at the date it carries; whether a reversed decision
is rewritten in place or left standing with a later record beside it is the
question this Change Request puts.

## Proposed change

Bring `spec-0013` into agreement with the validator on the lower bound, and
record what happened to the two decisions that chose the band. The statements
that carry the floor are:

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

| #   | Option                                                                                                                                                                                                                                                                       | Cost                                                                                                                                     | Risk                                                                                                                                                                                                                                                                                                                                                                                                              | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Narrow the spec to the product, and **supersede** the three decisions with a new one: the band's floor is withdrawn, `QFAI-AUD-020` is a ceiling, and the records that chose 3..7 keep their `Decision` text, take `Status: superseded` and name the new record in `Related` | Nine `spec-0013` statements edited plus one `_policies` record; one new `DR-*` in `_policies`; reset `spec-0013/TDD-0027` and `TDD-0028` | Records today's behaviour as intended. A decision nobody reviewed at the time becomes the recorded one — but it is already the shipped one, and the record says by whom and when                                                                                                                                                                                                                                  | ✅          |
| 2   | Narrow the spec to the product, and **rewrite** the three decisions in place to say `ceiling 7`                                                                                                                                                                              | The same statements; no new record                                                                                                       | The **authoritative** lineage goes: the Decision Records stop saying a floor was chosen, and the rejected options `DR-0267` lists ("1..3 minimal band") lose the thing they were rejected against. The history survives outside them — this Change Request, the changelog entry for the removal, and the delta rows that recorded the adoption — so a reader who knows to look elsewhere can still reconstruct it |             |
| 3   | Restore the floor in the product: `QFAI-AUD-020` warns below the minimum again, and the spec stands                                                                                                                                                                          | A validator change, its tests, the shipped template comments and the guide; no spec edit                                                 | Reverses a deliberate removal on a rationale nobody has contradicted — one task is a screen's focus, and a floor warns against it. A CR of its own would be the place to argue that                                                                                                                                                                                                                               |             |

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
  covers them continues. **Those two are the exception**: writing evidence for
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
- Plans: `.qfai/specs/spec-0013/10_Plan.md` — the item describing the band, and
  nothing else in that file
- Tests: `spec-0013/TDD-0027`, `spec-0013/TDD-0028`, `spec-0004/TDD-0050`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: the `Specs` and `Plans` paths above.
  **Under option 3 this list is empty**: that option changes the product and
  leaves every upstream statement standing, so approving it authorises no
  upstream edit at all. The section is reduced to the approved outcome before
  `Status: approved` is written, because `QFAI-DRIFT-001` reads a path here and
  not the condition beside it.

## Decision needed from user

Which of the three: narrow the spec and supersede the two band decisions;
narrow the spec and rewrite them in place; or restore the floor in the product
and leave the spec as it stands.

## Approved actions (owner skill rerun plan)

1. **Two invocations, under options 1 and 2**, because the edit spans two
   artifact classes and `.qfai/assistant/constitution/drift-protocol.md` gives
   each its own:

   | Invocation            | Scope                                                                                                                                                                                                                                                     | Mode        | CR reference lands in                         |
   | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------- |
   | `/qfai-sdd spec-0013` | The nine statements under `## Proposed change`, plus `10_Plan.md`'s band item                                                                                                                                                                             | `re-derive` | `spec-0013/09_delta.md` and `07_Decisions.md` |
   | `/qfai-sdd spec-0004` | Every statement that carries the band: `REQ-0164` and its Consumer View sentence, `AC-0004-0037`, `BR-0004-0031`, the example, `TC-0004-0070`, the `OQ-0158` resolution, the plan item, and `DR-0004-0014` — a third decision adopting `DR-0267` verbatim | `re-derive` | `spec-0004/09_delta.md` and `07_Decisions.md` |
   | `/qfai-sdd`           | `_policies/08_Decisions.md` — `DR-0267`, superseded or rewritten by the option                                                                                                                                                                            | `re-derive` | `_policies/10_delta.md` and `08_Decisions.md` |

   `re-derive` in all three: the statements change what they say, and
   `confirm-only` writes nothing but this Change Request's reference. A bare
   `/qfai-sdd` cannot reach a spec-local file and a `<spec-id>` one cannot reach
   the policy record, so naming one invocation would leave half the edit
   unauthorised however it was read.

2. The decision records, under options 1 and 2 and differing by option.
   - **Option 1**: a new `DR-*` in `_policies/08_Decisions.md` recording the
     withdrawal, its date and its rationale. `DR-0267`,
     `spec-0013/07_Decisions.md` `DR-0013-0003` and `spec-0004`'s
     `DR-0004-0014` keep their `Decision` text and take `Status: superseded`
     with the new record named in their `Related` list. **Those are the fields
     the layout defines** — `Status`, `Context`, `Decision`, `Consequences`,
     `Related` — and the Drift Protocol forbids inventing another, so there is
     no `Superseded by` field to write.
   - **Option 2**: `DR-0267` and `DR-0013-0003` rewritten to state a ceiling,
     with their `Rejected` lists re-derived against the new statement.
3. Downstream ledger sweep, under options 1 and 2. Reset to `todo`, recording
   this CR's ID in their `DR-ID` column: `spec-0013/TDD-0027`,
   `spec-0013/TDD-0028`, `spec-0004/TDD-0050`. None is retired: every
   obligation survives with a changed statement, so the rows are re-derived
   rather than deleted.
   Under option 3 no row moves — the product changes to meet them.
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
   from these, and an edit made there is overwritten on the next run. That option is
   implementation work and its scope is product paths rather than upstream ones.

## Resolution

<!-- Filled in when Status leaves `open`. -->
