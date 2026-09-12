# Change Request

- ID: `CR-20260913-0002`
- Title: `spec-0014 rejects the prototyping evidence layout the product reads first`
- Raised by: `qfai-implement`
- Raised at: `2026-09-12T20:29:34Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`AC-0014-0005` says the legacy `screenshots/` / `html/` directory layout "is no
longer accepted as the active SSOT", and `TC-0014-0033` compresses that to
"active layout uses `.qfai/evidence/prototyping/iter-NN/` only".

The product accepts it, reads it first, documents it as the required path, and
keeps writing it.

| File                                                          | What it does                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`    | `hasEvidenceFile` tests `<prototyping root>/screenshots/<screen-id>.png` before it scans for an `iter-NN` file     |
| `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`    | The issue's location and its suggested action both name the legacy path first                                      |
| `packages/qfai/src/cli/commands/validate.ts`                  | Documents `.qfai/evidence/prototyping/screenshots/<screen-id>.png` as where a declared screen's screenshot lives   |
| `packages/qfai/src/core/validators/skill/prototypingSkill.ts` | Requires the shipped skill text to carry that same path                                                            |
| `packages/qfai/src/cli/commands/prototypingIterate.ts`        | `mirrorAcceptedIterToAggregateDirs` copies each accepted iteration into `screenshots/` and `html/` after every run |

Two cases in `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`
require a project carrying only the legacy layout to report no issue.

**Only one layer of the pack disagrees with that.** The requirement, the rule
and the example beneath the criterion are all satisfied by the product as it
stands:

| Layer                 | What it states                                                                | Product |
| --------------------- | ----------------------------------------------------------------------------- | ------- |
| `01_Spec.md` Scope.In | the legacy layout "is no longer **the** active SSOT"                          | agrees  |
| `AC-0014-0005`        | the legacy layout "is no longer **accepted as** the active SSOT"              | differs |
| `BR-0014-0005`        | legacy paths "MUST not be **required**"                                       | agrees  |
| `EX-0014-0026`        | an `iter-03` capture is accepted and no legacy required-path lookup is raised | agrees  |
| `TC-0014-0033`        | the active layout uses `iter-NN` "**only**"                                   | differs |

"No longer the active SSOT" and "no longer accepted" are different rules. The
first holds of a derived mirror; the second forbids one. The criterion took the
second where its own requirement, rule and example took the first, and the test
case followed the criterion.

**Another pack requires the mirror outright.** `spec-0012` settled how accepted
evidence reaches the aggregate directories as an open question, `OQ-0110`, and
chose its Option A. The whole chain below that choice is active, and it is a
`MUST`:

| Layer                | Statement                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `REQ-0012-0066`      | on convergence, `iterate` MUST mirror accepted-iter content into `.qfai/evidence/prototyping/screenshots/` |
| `AC-0012-0064`       | aggregate-dir mirror with underscore casing (`OQ-0110` Option A)                                           |
| `BR-0012-0052`       | the same, as a business rule                                                                               |
| `EX-0012-0173`       | the aggregate-dir mirror uses underscore casing                                                            |
| `TC-0012-0448`       | a converged iteration mirrors to `screenshots/<id>.png` and `html/<id>.html`                               |
| `spec-0012/TDD-0484` | `done`, on `prototypingIterate.aggregateMirror.test.ts`                                                    |

So the aggregate directories are not a leftover the product forgot to remove.
They are an output one pack decided on and specified at every layer, and the
criterion in this pack rejects what that pack requires.

## Proposed change

Settle which of the two rules the pack states, and make every layer state that
one.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                        | Cost                                                                                                                                                                                                                                                                                          | Risk                                                                                                                                                                                                                                                                      | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | The criterion is right. Move the required-path lookup to `iter-NN/`, stop mirroring, and keep the aggregate directories as an output nothing reads                                            | A product change across five files, the shipped skill text and three further suites, plus a migration for every project whose evidence sits in `screenshots/` today — **and a `spec-0012` re-derivation**, since stopping the mirror withdraws a `MUST` that pack resolved `OQ-0110` to adopt | An adopter upgrading finds evidence that satisfied the gate yesterday rejected today, with the files still on disk. Three layers of this pack and a whole chain of `spec-0012` would have to be re-derived **away** from what they say, to follow one criterion's wording |             |
| 2   | The code is right. Narrow `AC-0014-0005` to the rule its own requirement, business rule and example already state, and say which layout a required-path check reads                           | One criterion, one test case, and the delta row that records it                                                                                                                                                                                                                               | The repository stops asserting that the aggregate directories are rejected. Evidence satisfying the gate through `screenshots/` does not say which iteration produced it, and nothing at the gate notices                                                                 | ✅          |
| 3   | Withdraw the layout criterion. Retire `AC-0014-0005` and `TC-0014-0033`, leaving `BR-0014-0005`'s "legacy paths MUST not be required" as the pack's only statement about where evidence lives | The criterion, the test case, the ledger row and the reservations entry                                                                                                                                                                                                                       | The pack then states what must **not** be required and nothing about what the active layout is, so the next change to the lookup order contradicts no written rule and is not drift                                                                                       |             |

Option 2 is recommended because the criterion is the outlier rather than the
product. The requirement above it, the business rule beneath it and the example
beneath that all state the softer rule, and the product satisfies all three; the
criterion alone states the stronger one, and the test case restated the
criterion. Narrowing one layer to three is a smaller claim than re-deriving
three layers to one, and option 1 would have to move the requirement, the rule
and the example **away** from statements nothing has shown to be wrong.

**The strongest evidence is in another pack.** `spec-0012` resolved `OQ-0110` by
choosing the mirror, and specifies it as a `MUST` from requirement to test case.
Option 2 agrees with that decision; option 1 would overturn it to follow a
criterion that never cited it. A choice recorded as the answer to an open
question outranks a criterion's wording that predates the question being put.

What option 2 costs is worth naming rather than discounting. The aggregate
directories hold one file per screen, so a screen captured in two iterations
keeps only the last accepted one, and evidence accepted through that path cannot
say which iteration produced it. That is the substance the criterion was
reaching for. Option 2 keeps the gate accepting it; the narrowed criterion
should say so in as many words, so the next reader meets the limitation rather
than discovering it.

## Blocked downstream items

| Item                     | Kind         | Why it depends on the artifact                                                                                                         |
| ------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `spec-0014/TDD-0033`     | `ledger-row` | Its `TC-Refs` is `TC-0014-0033`, whose `Expected` is the clause in dispute. No test discriminates it, so the row has nothing to record |
| `spec-0014/TC-0014-0033` | `spec`       | The test case restates the criterion, so it moves with whatever the criterion becomes                                                  |

- Not blocked by this CR: every other `spec-0014` row. `TDD-0034` is held by a
  separate obstacle recorded with it — its selector names one case asserting five
  outcomes — and `TDD-0028` and `TDD-0029` sit at `exception` and owe no
  completed evidence. None of the three turns on which layout is active.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0014`
- Plans: `none`
- Tests: `spec-0014/TDD-0033` — `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0014/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0014/06_Test-Cases.md`,
  `.qfai/specs/spec-0014/09_delta.md`,
  `.qfai/specs/spec-0014/tdd/test-list.md`

  **Under option 1 the product paths are in scope as well**, and they are listed
  here because `QFAI-DRIFT-001` reads this section and not the condition beside
  an entry: `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`,
  `packages/qfai/src/cli/commands/validate.ts`,
  `packages/qfai/src/core/validators/skill/prototypingSkill.ts`,
  `packages/qfai/src/cli/commands/prototypingIterate.ts`,
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/**` and its
  root mirror, with
  `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`,
  `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`,
  `packages/qfai/tests/integration/cli/commands/prototypingIterate.aggregateMirror.test.ts`,
  which requires the mirror; `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts`,
  which drives the mirror's failure path as the vehicle for its SIGINT case; and
  `packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts`, which
  seeds a screenshot at the aggregate path. And the `spec-0012` chain the mirror
  is specified in: `.qfai/specs/spec-0012/01_Spec.md`,
  `.qfai/specs/spec-0012/02_User-stories.md`,
  `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0012/04_Business-Rules.md`,
  `.qfai/specs/spec-0012/05_Examples.md`,
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/08_Open-questions.md`,
  `.qfai/specs/spec-0012/09_delta.md` and
  `.qfai/specs/spec-0012/tdd/test-list.md`. **This list is reduced to the
  approved outcome before `Status: approved` is written**, so an approval of
  option 2 or 3 authorises no product edit and no `spec-0012` edit.

  `01_Spec.md` is **not** here. Its Scope.In line already states the rule
  options 1 and 2 both settle on, so no approved action edits it, and naming the
  path would authorise an edit nothing asked for.

## Decision needed from user

Which rule does the pack state about prototyping evidence: that the aggregate
`screenshots/` / `html/` directories are rejected as a source (option 1), that
they are a derived mirror a required-path check may read (option 2), or that the
pack says nothing about the active layout beyond not requiring the legacy one
(option 3)?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0014` rerun scope, mode `re-derive`:

   | Option | What is re-derived                                                                                                                                                                                                                    |
   | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 1      | `AC-0014-0005` and `TC-0014-0033` keep their wording. `BR-0014-0005` and `EX-0014-0026` are re-derived **to the stronger rule**, because the product change makes a legacy-only project fail and both currently say it passes         |
   | 2      | `AC-0014-0005` is re-derived to say the aggregate directories are a derived mirror a required-path check reads, and that evidence accepted through them does not record its iteration. `TC-0014-0033` is re-derived to that criterion |
   | 3      | `AC-0014-0005` and `TC-0014-0033` are withdrawn. `EX-0014-0026` is re-derived against `BR-0014-0005` alone, since the example currently cites the criterion's subject                                                                 |

   Every option carries the pack's `09_delta.md` row for what it did.

   **Under option 1 only, `/qfai-sdd spec-0012` re-derives the mirror chain** —
   `REQ-0012-0066`, `US-0012-0130`, `AC-0012-0064`, `BR-0012-0052`,
   `EX-0012-0173`, `TC-0012-0448` and the `OQ-0110` resolution — to withdraw the
   mirror, with that pack's own `09_delta.md` row. Stopping the mirror in the
   product while `spec-0012` still requires it would leave two packs prescribing
   opposite behaviour.

2. Downstream ledger sweep.
   - Reset to `todo`, recording this CR's ID in `DR-ID`: `spec-0014/TDD-0033`,
     under options 1 and 2. Its obligation changes under both — the criterion it
     carries is re-derived — and its recorded observation is of neither rule.
     The row is re-pointed in the same rerun: its `Selector`,
     `iter-NN path layout`, occurs in no runnable case name today, so a reset
     alone returns it to `todo` still selecting nothing.
   - Under option 1 only, in `spec-0012`: `spec-0012/TDD-0484` is reset to
     `todo` with this CR's ID in `DR-ID`, because the mirror its obligation
     requires is withdrawn. `spec-0012/TDD-0471` and `spec-0012/TDD-0460`
     through `TDD-0463` keep their obligations — SIGINT cleanup, and the
     remediation journeys whose fixture happens to seed an aggregate screenshot —
     and take the in-place shared-artifact re-verification over their edited
     suites.
   - Retire, under option 3 only: `spec-0014/TDD-0033` —
     `current iterate path-layout suite pass`. Its test disposition is "none to
     dispose of": the selector resolves to no case, so the retirement leaves no
     surviving assertion to delete or re-point, and the stale selector goes with
     the row.

3. Reserve `spec-0014/TDD-0033` in that ledger's `## TDD-ID reservations` before
   the row is deleted, under option 3. It is not that pack's maximum, but a
   reservation is what keeps the number from being handed out again.

4. Write the test the outcome needs, under `/qfai-implement`, once the rerun
   lands. No option discharges `TC-0014-0033` without one: today no case
   discriminates which layout a required-path check reads, so the criterion is
   true or false by reading the source rather than by running anything.

## Resolution

Not yet resolved.
