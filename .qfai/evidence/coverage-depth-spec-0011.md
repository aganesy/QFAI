# Coverage Depth Matrix — spec-0011

Totals: ✅ 118 / ⚠️ 38 / ❌ 49, with `n/a` 212, across 417 scored cells (351 in the
matrix and 66 in the business rule table).

## Scope

This matrix scores every active obligation the pack declares, read from the pack in full and not
from the rows of `.qfai/specs/spec-0011/tdd/test-list.md`:

- the **12 user stories** of `02_User-stories.md`, `US-0011-0001` … `US-0011-0012`. None carries a
  `- x-qfai-status: planned` line, and `01_Spec.md` is `Status: active`, so all 12 owe an acceptance
  test and all 12 own a row;
- the **27 test cases** of `06_Test-Cases.md`, `TC-0011-0001` … `TC-0011-0027`;
- the **22 business rules** of `04_Business-Rules.md`, `BR-0011-0001` … `BR-0011-0022`. None carries a
  status retiring it, so all 22 own a row in the business rule table.

`01_Spec.md` names two CLI contracts, `CLI-WF` and `CLI-WFFILE`, and states that they declare no
`CON-*` ID. The pack references no `CON-API-*` or `CON-DB-*`, so no contract-derived failure is
scored here.

The scored cells are the nine depth columns of the matrix and the `Positive case`, `Negative case`
and `Conditional branches` columns of the business rule table. `Status` is a row verdict and is
excluded from every total.

**What credits a cell.** A cell is credited only to a case that runs. Ownership is read in two steps.

1. **An annotation binds.** A case carrying `QFAI:SPEC-0011:<ID>` is bound to that obligation and to
   no other. A file-level annotation block binds the case named for each ID:
   `implementSkillSpec0011.test.ts` opens with eight annotation lines and holds one `describe` per ID,
   and `seamOnly.test.ts` opens with two and holds one `it` per ID. An annotation above a `describe`
   binds that `describe`. A case annotated for one ID cannot answer a sibling ID, so a `TC-*` case
   does not answer a story, and the reverse.
2. **An unannotated case is scored only where the obligation has no annotated case anywhere.** Two
   test cases are in that position, `TC-0011-0011` and `TC-0011-0012`, and each is discussed in its
   own paragraph. Step 2 is not applied to stories: a story owes an `E2E` case, and an asset or
   integration case does not discharge it.

**Which failures a row owns.** A `TC-*` row owns the failures its `AC-Refs` and its `EX-Ref` reach:
the failure clauses of the cited AC, of the cited example, and of every `BR-*` that example's
`BR-Ref` names. A `US-*` row owns the failure clauses of every AC whose `US-Refs` names it.
`AC-0011-0001` … `AC-0011-0011` carry no `US-Refs`, so `US-0011-0001` … `US-0011-0008` own no
failure and their `Error path` cells are `n/a`; see Finding 5. A rule stated as a prohibition with no
rejection outcome ("speculative generalization is prohibited") is scored as a positive case.

**How `n/a` is read.** A column is `n/a` only where its obligation does not exist for the row:
no owned kept failure (`Error path`), no ordered or counted domain (`Boundary values`), no special
value the row's input admits (`Special values`), no sequence of states in the row's scenario
(`State transitions`), and no interacting conditions (`Combinatorial`). A `TC-*` row declaring
`Type` `error` or `boundary` marks `Normal path` `n/a`. `TC-0011-0001` … `TC-0011-0012` declare no
`Type`, so they owe the normal path. A row that reads only shipped skill text reads a fixed
artifact, so `Special values` and `Boundary values` there are `n/a` unless the row names a count or
an empty value.

**How `Status` is set.** `❌` when `Normal path` is `❌`, when `Oracle strength` is `❌`, or when the
row's test accepts what the row's declaration contradicts. `✅` only when every scored cell is `✅` or
`n/a`. `⚠️` otherwise. A business rule row is `❌` when any scored cell is `❌`.

## What was measured, and how

Every score rests on a case that was located by its annotation and run. Each file was run from
`packages/qfai` with `NO_COLOR=1 node node_modules/vitest/vitest.mjs run <file> --reporter=verbose`.

| File                                                                  | Carries                                       | Result                                                             |
| --------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `tests/integration/implement/orchestrated/stageSkillHandover.test.ts` | `TC-0011-0013`                                | 1 passed                                                           |
| `tests/integration/implement/orchestrated/operationsTable.test.ts`    | `TC-0011-0014`                                | 1 passed                                                           |
| `tests/integration/implement/orchestrated/runBinding.test.ts`         | `TC-0011-0015`                                | 1 passed                                                           |
| `tests/integration/implement/orchestrated/checkpointResume.test.ts`   | `TC-0011-0016`                                | 1 passed                                                           |
| `tests/integration/implement/orchestrated/ledgerCheckNotCached.test.ts` | `TC-0011-0017`                              | 1 passed                                                           |
| `tests/integration/implement/orchestrated/seamOnly.test.ts`           | `TC-0011-0018`, `TC-0011-0027`                | 2 passed                                                           |
| `tests/integration/implement/orchestrated/diagnoseOnlyNoTrackedFile.test.ts` | `TC-0011-0019`                         | 1 passed                                                           |
| `tests/integration/implement/orchestrated/diagnosisVerdict.test.ts`   | `TC-0011-0020`                                | 1 passed                                                           |
| `tests/integration/implement/orchestrated/missingTestCarveOut.test.ts` | `TC-0011-0021`                               | 1 passed                                                           |
| `tests/integration/implement/orchestrated/regressionFixKeepsDone.test.ts` | `TC-0011-0022`                            | 1 passed                                                           |
| `tests/integration/implement/orchestrated/regressionFixReceipt.test.ts` | `TC-0011-0023`                              | 1 passed                                                           |
| `tests/integration/implement/orchestrated/testFixLedgerRow.test.ts`   | `TC-0011-0024`                                | 1 passed                                                           |
| `tests/integration/implement/orchestrated/testFixMeaningChange.test.ts` | `TC-0011-0025`                              | 1 passed                                                           |
| `tests/integration/implement/orchestrated/testFixLayers.test.ts`      | `TC-0011-0026`                                | 1 passed                                                           |
| `tests/integration/implementSkillSpec0011.test.ts`                    | `TC-0011-0001` … `TC-0011-0009`               | 11 passed                                                          |
| `tests/integration/completionContract.test.ts`                        | `TC-0011-0006`, `TC-0011-0007`, `TC-0011-0010` | 13 passed (4 annotated for spec-0011)                             |
| `tests/integration/evidenceContract.test.ts`                          | `TC-0011-0007`                                | 7 passed (4 annotated for spec-0011)                               |
| `tests/integration/parallelDispatch.test.ts`                          | `TC-0011-0005`                                | 7 passed (2 annotated for spec-0011)                               |
| `tests/integration/skillRoster.test.ts`                               | `TC-0011-0003`                                | 13 passed (2 annotated for spec-0011)                              |
| `tests/e2e/spec0011ImplementCycleRulesE2E.test.ts`                    | `US-0011-0001` … `US-0011-0005`               | 9 passed                                                           |
| `tests/e2e/spec0018DeliverAFeatureE2E.test.ts`                        | `US-0011-0009` (one case)                     | the annotated case passed in 39 s; the file's 3 other cases filtered out |
| `tests/assets/uiAffectingDefinition.test.ts`                          | unannotated, scored for `TC-0011-0012`        | the 2 `design contracts resolve from contractsDir` cases passed    |
| `tests/assets/assets.test.ts`                                         | unannotated, read for `TC-0011-0011`          | the handoff-sample case passed; see Finding 2                      |

Paths are relative to `packages/qfai/`.

Every file above was run at revision `ee3586ca5bb84511fb8485094475dce95f4e42de`, whose shipped `seam-only` passage is the unmutated one.

Every other case reads shipped skill text — `qfai-implement/SKILL.md` and its `references/` — and
asserts phrases in it. That is the deliverable for every obligation of this pack: the skill is
prose an agent follows, and no runtime executes it. The one exception is the `US-0011-0009` case,
which drives `qfai workflow` over a `qfai init` project and submits scripted stage results; it
observes the work orders the run issues, not the skill serving them.

**Oracle evidence.** The `.qfai/evidence/implement-spec-0011.md` entries for `TDD-0021`, `-0023`,
`-0024`, `-0025`, `-0027` … `-0034` record a RED where the passage was absent, so each of those
cases has been seen to fail. `TDD-0022` (`TC-0011-0014`) records no RED: the Operations table
existed before the test. The spec-0011 cases in the older files (`TC-0011-0001` … `-0010`) and the
`US-0011-0001` … `-0005` E2E cases record no RED at all; their `Oracle strength` cells name the
mutation that would make each fail, or say why none would.

No spec-0011 case carries `.skip`, `.only` or `.todo`.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0011-0001 | ⚠️                     | ✅          | n/a        | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ⚠️     |
| US-0011-0002 | ⚠️                     | ✅          | n/a        | n/a        | n/a             | n/a            | ⚠️                | n/a           | ✅              | ⚠️     |
| US-0011-0003 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| US-0011-0004 | ⚠️                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| US-0011-0005 | ⚠️                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | ⚠️            | ✅              | ⚠️     |
| US-0011-0006 | ❌                     | ❌          | n/a        | n/a        | ❌              | n/a            | ❌                | n/a           | ❌              | ❌     |
| US-0011-0007 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0011-0008 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0011-0009 | ⚠️                     | ⚠️          | n/a        | ❌         | n/a             | n/a            | ✅                | n/a           | ✅              | ⚠️     |
| US-0011-0010 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0011-0011 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | ❌                | n/a           | ❌              | ❌     |
| US-0011-0012 | ❌                     | ❌          | ❌         | n/a        | ❌              | n/a            | n/a               | ❌            | ❌              | ❌     |
| TC-0011-0001 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | ❌                | n/a           | ❌              | ❌     |
| TC-0011-0002 | ⚠️                     | ⚠️          | ⚠️         | n/a        | n/a             | n/a            | ⚠️                | n/a           | ⚠️              | ⚠️     |
| TC-0011-0003 | ✅                     | ✅          | ⚠️         | n/a        | n/a             | n/a            | ✅                | n/a           | ⚠️              | ⚠️     |
| TC-0011-0004 | ⚠️                     | ⚠️          | ❌         | n/a        | n/a             | ❌             | ❌                | n/a           | ⚠️              | ⚠️     |
| TC-0011-0005 | ✅                     | ✅          | ✅         | ✅         | n/a             | n/a            | n/a               | ⚠️            | ✅              | ⚠️     |
| TC-0011-0006 | ✅                     | ✅          | ⚠️         | n/a        | ❌              | n/a            | ⚠️                | n/a           | ⚠️              | ❌     |
| TC-0011-0007 | ⚠️                     | ✅          | ⚠️         | n/a        | n/a             | ✅             | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0011-0008 | ⚠️                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0011-0009 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ✅     |
| TC-0011-0010 | ⚠️                     | ⚠️          | ⚠️         | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ⚠️     |
| TC-0011-0011 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0011-0012 | ⚠️                     | ⚠️          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ⚠️     |
| TC-0011-0013 | ✅                     | ✅          | n/a        | n/a        | ✅              | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0014 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0015 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0016 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ✅     |
| TC-0011-0017 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0018 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ✅     |
| TC-0011-0019 | ✅                     | ✅          | n/a        | ✅         | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0020 | ✅                     | ✅          | n/a        | n/a        | n/a             | ❌             | n/a               | ❌            | ✅              | ⚠️     |
| TC-0011-0021 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0022 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ✅     |
| TC-0011-0023 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ✅     |
| TC-0011-0024 | ✅                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0025 | ✅                     | n/a         | ✅         | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0011-0026 | ✅                     | n/a         | ✅         | n/a        | ✅              | n/a            | n/a               | ✅            | ✅              | ✅     |
| TC-0011-0027 | ✅                     | n/a         | ✅         | ✅         | n/a             | n/a            | ✅                | ✅            | ✅              | ✅     |

Matrix totals across the nine depth columns, 351 cells (39 rows × 9): **✅ 88 / ⚠️ 32 /
❌ 44**, with `n/a` 187.

`Status`, for reading only: ✅ 16 / ⚠️ 13 / ❌ 10 across the 39 rows.

### The mutation behind each ✅ in Oracle strength

A `✅` there says every case of the row can fail. The table names the edit to shipped text that fails
each row's case, and whether a failing run was observed.

| Row          | Mutation that fails the case                                                                     | Seen failing                                    |
| ------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| US-0011-0001 | Reorder the lifecycle line, or drop `at most one row is in \`red\` or \`green\` at any moment`   | No                                              |
| US-0011-0002 | Drop `` `green` -> `red` is not allowed `` or the `#allowed-transitions` pointer                 | No                                              |
| US-0011-0003 | Drop `never the author's own account`                                                            | No                                              |
| US-0011-0005 | Drop `run integration verify on the merged result`                                               | No                                              |
| US-0011-0009 | Issue the `implement` work order without a spec target, or skip the seam round trip             | Yes, the RED of `TDD-0035`                       |
| TC-0011-0005 | Drop the read-only-fixture exemption from `parallelization-policy.md`                           | No                                              |
| TC-0011-0009 | Drop `Write for the failing test and no further`                                                 | No                                              |
| TC-0011-0010 | Drop `Only after every required reviewer passes may the item transition to \`done\``            | No                                              |
| TC-0011-0012 | Drop `<contractsDir>/design/design-system.yaml` from the read order                              | No                                              |
| TC-0011-0013 | Add a second line citing `references/orchestrated-mode.md`, or drop the no-work-order bullet     | Yes, the RED of `TDD-0021`                       |
| TC-0011-0014 | Add, remove or rename one row of the Operations table                                            | No; the table predates the test                  |
| TC-0011-0015 | Drop `the User Selection Flow then puts no question`                                             | Yes, the RED of `TDD-0023`                       |
| TC-0011-0016 | Drop `copies no row's status`                                                                    | Yes, the RED of `TDD-0024`                       |
| TC-0011-0017 | Drop `never taken from the snapshot`                                                             | Yes, the RED of `TDD-0025`                       |
| TC-0011-0018 | `Only the minimal connection …` to `The full implementation …`                                   | Yes, TDD-0026 round 1 of `atdd-spec-0011.md`     |
| TC-0011-0019 | Name the reproduction record in `changedFiles`                                                   | Yes, the RED of `TDD-0027`                       |
| TC-0011-0020 | Add or drop one verdict                                                                          | Yes, the RED of `TDD-0028`                       |
| TC-0011-0021 | Drop `every other scope gap … Change Request` from either file, or cite a `DR-NNNN` there        | Yes, the RED of `TDD-0029`                       |
| TC-0011-0022 | Let the fix change `Status`                                                                      | Yes, the RED of `TDD-0030`                       |
| TC-0011-0023 | Drop `rerunRef` from the receipt sentence                                                        | Yes, the RED of `TDD-0031`                       |
| TC-0011-0024 | Add `Status` to the cells the fix may change                                                     | Yes, the RED of `TDD-0032`                       |
| TC-0011-0025 | Change the resolving owner from `qfai-sdd`                                                       | Yes, the RED of `TDD-0033`                       |
| TC-0011-0026 | Drop `an \`API\` row` from the refused layers                                                    | Yes, the RED of `TDD-0034`                       |
| TC-0011-0027 | ``returned `unrun` `` to ``returned `blocked` ``                                                 | Yes, TDD-0039 round 1 of `atdd-spec-0011.md`     |

The cases are positive phrase matches, and that is their common limit: a contradicting sentence
added elsewhere in the same section would not fail them. `TC-0011-0022` and `TC-0011-0024` are the
two with a negative guard against the one contradiction their rule is about.

The pack splits in two. The fifteen test cases added for the orchestrated mode (`TC-0011-0013` …
`-0027`) have a real RED or a falsifiability run behind nearly every case, and fourteen of them are
`✅`. The older half — `TC-0011-0001` … `-0012` and the eight original stories — is where the `❌`
cells are: three test cases whose only case asserts words that any version of the skill contains,
two test cases the product no longer matches, and six stories with no `E2E` case.

### Business rule coverage

One row per active `BR-0011-*`. All 22 are active, so none is omitted.

`Covering TC` is `06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`. The rule is scored on
every case annotated for a spec-0011 obligation that asserts it, so a story's `E2E` case can credit a
rule its covering test case leaves out; where that happens the paragraph under the table says so.
`Negative case` is scored only where the rule states a rejection, a refusal or an error outcome.
`Conditional branches` is scored only where the rule states two or more branches with different
outcomes.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                              | Status |
| ------------ | ------------- | ------------- | -------------------- | -------------------------------------------------------- | ------ |
| BR-0011-0001 | ⚠️            | ✅            | ⚠️                   | TC-0011-0005                                             | ⚠️     |
| BR-0011-0002 | ✅            | ✅            | ❌                   | TC-0011-0001, TC-0011-0002, TC-0011-0003, TC-0011-0004, TC-0011-0006, TC-0011-0008 | ❌     |
| BR-0011-0003 | ✅            | ❌            | n/a                  | TC-0011-0001, TC-0011-0003, TC-0011-0006, TC-0011-0008   | ❌     |
| BR-0011-0004 | ✅            | n/a           | n/a                  | TC-0011-0009                                             | ✅     |
| BR-0011-0005 | ✅            | ⚠️            | n/a                  | TC-0011-0007                                             | ⚠️     |
| BR-0011-0006 | ⚠️            | ✅            | n/a                  | TC-0011-0010                                             | ⚠️     |
| BR-0011-0007 | ❌            | ❌            | ❌                   | TC-0011-0011                                             | ❌     |
| BR-0011-0008 | ⚠️            | n/a           | n/a                  | TC-0011-0012                                             | ⚠️     |
| BR-0011-0009 | ✅            | n/a           | ✅                   | TC-0011-0013                                             | ✅     |
| BR-0011-0010 | ✅            | n/a           | n/a                  | TC-0011-0014                                             | ✅     |
| BR-0011-0011 | ✅            | n/a           | ✅                   | TC-0011-0015                                             | ✅     |
| BR-0011-0012 | ✅            | n/a           | n/a                  | TC-0011-0016                                             | ✅     |
| BR-0011-0013 | ✅            | n/a           | n/a                  | TC-0011-0017                                             | ✅     |
| BR-0011-0014 | ✅            | ✅            | ✅                   | TC-0011-0018, TC-0011-0027                               | ✅     |
| BR-0011-0015 | ✅            | n/a           | ✅                   | TC-0011-0019                                             | ✅     |
| BR-0011-0016 | ✅            | n/a           | ✅                   | TC-0011-0020                                             | ✅     |
| BR-0011-0017 | ✅            | n/a           | ✅                   | TC-0011-0021                                             | ✅     |
| BR-0011-0018 | ✅            | n/a           | n/a                  | TC-0011-0022                                             | ✅     |
| BR-0011-0019 | ⚠️            | n/a           | n/a                  | TC-0011-0023                                             | ⚠️     |
| BR-0011-0020 | ✅            | n/a           | n/a                  | TC-0011-0024                                             | ✅     |
| BR-0011-0021 | ✅            | ✅            | n/a                  | TC-0011-0025                                             | ✅     |
| BR-0011-0022 | ✅            | ✅            | ✅                   | TC-0011-0026                                             | ✅     |

Business rule totals across the three scored columns, 66 cells (22 rows × 3): **✅ 30 /
⚠️ 6 / ❌ 5**, with `n/a` 25.

`Status`, for reading only: ✅ 14 / ⚠️ 5 / ❌ 3 across the 22 rows.

Five cells are credited to a case outside the rule's covering test cases:

- `BR-0011-0002` × Positive: the `US-0011-0001` E2E case asserts
  `` `todo` -> `red` -> `green` -> `refactor` -> `done` ``.
- `BR-0011-0002` × Negative: the `US-0011-0002` E2E case asserts `Backward transitions are prohibited`
  and `` `green` -> `red` is not allowed ``.
- `BR-0011-0003` × Positive: the `TC-0011-0009` case asserts that Phase Red precedes Phase Green and
  that the skill says `watch it fail`.
- `BR-0011-0001` × Negative: the `TC-0011-0005` cases assert the deny conditions. This one is inside
  the covering test case and is listed only because it is the rule's one rejection.
- `BR-0011-0006` × Negative: the `TC-0011-0010` case asserts that `done` follows every required
  reviewer's PASS, which is the rule's refusal.

## Every ❌ cell, justified

The matrix carries 44 `❌` cells and the business rule table 5, 49 in all. Each
paragraph below is one cell: its first line names the obligation and the column. No cell has a
Decision Record discharging it; each names where the repair belongs.

### Stories

US-0011-0006 × Equivalence partitions ❌. No case is annotated for the story, so neither the item
that meets every gate point nor the item that misses one is exercised. Ledger row `TDD-0018` is
seeded for the `E2E` case and holds no test. Repair: `/qfai-atdd` writes the story's `E2E` case.

US-0011-0006 × Normal path ❌. No `E2E` case exists, so no item is shown reaching `done` through the
gate. Repair as above.

US-0011-0006 × Boundary values ❌. The story names a count, a 10-point gate, and no case pins it.
The shipped gate is the `12-point gate` (`SKILL.md` line 586), so the count is also drift; see
Finding 3. Repair: `/qfai-sdd` restates the count, then `/qfai-atdd` pins it.

US-0011-0006 × State transitions ❌. The story is about the transition to `done`; no case observes
it being refused or allowed. Repair as for the normal path.

US-0011-0006 × Oracle strength ❌. There is no case, so there is no assertion that could fail.

US-0011-0007 × Equivalence partitions ❌. No case is annotated for the story, so neither the
simplified-only handoff nor one carrying a legacy field is exercised. The product no longer ships
the field set the story names; see Finding 2. Repair: `/qfai-sdd` settles the drift first.

US-0011-0007 × Normal path ❌. No `E2E` case exists (`TDD-0019` holds no test), and the shipped
handoff sample names `designSystemMirror`, not `extractedDesignSystem`. Repair as above.

US-0011-0007 × Oracle strength ❌. There is no case.

US-0011-0008 × Equivalence partitions ❌. No case is annotated for the story (`TDD-0020` holds no
test). Repair: `/qfai-atdd` writes the story's `E2E` case.

US-0011-0008 × Normal path ❌. No `E2E` case shows the implement stage consuming
`design-system.yaml` as input. Repair as above.

US-0011-0008 × Oracle strength ❌. There is no case.

US-0011-0009 × Edge cases ❌. The story's own edge is resuming a long stage where it stopped
(`AC-0011-0015`). The annotated journey runs every stage once and never resumes from a
`checkpointRef`, so the edge is not exercised. Repair: `/qfai-atdd` adds a resumed-stage variant to
the journey, or a second annotated case.

US-0011-0010 × Equivalence partitions ❌. No case is annotated for the story. `TDD-0036` is seeded
and waits on the scripted journey `spec-0018` ships. Repair: `/qfai-atdd` once that journey exists.

US-0011-0010 × Normal path ❌. No `E2E` case serves a `diagnose-only` work order. Repair as above.

US-0011-0010 × Oracle strength ❌. There is no case.

US-0011-0011 × Equivalence partitions ❌. No case is annotated for the story (`TDD-0037`, waiting on
`spec-0018`). Repair as for `US-0011-0010`.

US-0011-0011 × Normal path ❌. No `E2E` case serves a `regression-fix` work order. Repair as above.

US-0011-0011 × State transitions ❌. The story's point is that the row stays `done` across the fix
and gains a re-verify round; no case observes the row before and after. Repair as above.

US-0011-0011 × Oracle strength ❌. There is no case.

US-0011-0012 × Equivalence partitions ❌. No case is annotated for the story (`TDD-0038`, waiting on
`spec-0018`), so none of the layer partitions is exercised end to end. Repair as for
`US-0011-0010`.

US-0011-0012 × Normal path ❌. No `E2E` case serves a `test-fix` work order. Repair as above.

US-0011-0012 × Error path ❌. The story owns two kept failures through `AC-0011-0024` and
`AC-0011-0025`: a fix that would cite a different AC or BR returns `needs_repair`, and no work order
is served for an `E2E`, `API` or other `Integration` row. No story-level case reaches either.
`TC-0011-0025` and `TC-0011-0026` cover them at the integration layer and cannot answer the story.
Repair as above.

US-0011-0012 × Boundary values ❌. `AC-0011-0025` puts the boundary at an `Integration` row with one
`L3` test case; no story-level case crosses it. Repair as above.

US-0011-0012 × Combinatorial ❌. Layer and test-case level together decide the owner; no
story-level case combines them. Repair as above.

US-0011-0012 × Oracle strength ❌. There is no case.

### Test cases

TC-0011-0001 × Equivalence partitions ❌. The one annotated case asserts that `SKILL.md` contains
the substrings `todo`, `red`, `green`, `refactor` and `done`. `red` also matches `required` and
`ordered`, so the case distinguishes no input. The `US-0011-0001` E2E case asserts the ordered
lifecycle and cannot be credited here. Repair: `/qfai-implement` test-fix on `TDD-0001` to assert
the ordered phrase and the per-phase evidence.

TC-0011-0001 × Normal path ❌. The row asks for a transition through every phase with evidence at
each step. Neither the order nor the evidence is asserted. Repair as above.

TC-0011-0001 × Error path ❌. Through `EX-0011-0001` the row owns two kept failures:
`BR-0011-0003`, production code written before a failing test is rejected, and `BR-0011-0002`, a
backward transition is prohibited. The case asserts neither. Repair as above, or narrow the
example's `BR-Ref` in `/qfai-sdd` if the row should not own them; see Finding 6.

TC-0011-0001 × State transitions ❌. The row is a walk through the lifecycle state machine, and no
transition or order is asserted. Repair as above.

TC-0011-0001 × Oracle strength ❌. No plausible mutation of the skill removes all five substrings.
Reordering the phases, deleting the lifecycle line, or dropping the evidence contract all leave the
case passing.

TC-0011-0004 × Error path ❌. The kept failure is the error `exception status requires DR-ID in
DR-ID column` (`AC-0011-0004`, `EX-0011-0003`). The case asserts only that some line mentions both
`exception` and `DR-ID`. `tests/assets/changeRequestArtifact.test.ts` asserts the exact message, but
it is unannotated and this row has an annotated case, so it is not credited. Repair: `/qfai-implement`
test-fix on `TDD-0004`, or annotate the existing case.

TC-0011-0004 × Special values ❌. The declared input is an empty `DR-ID` cell. No case plants or
names the empty value. Repair as above.

TC-0011-0004 × State transitions ❌. The scenario is a transition into `exception`. No case asserts
which states may enter `exception` or that the transition is refused. Repair as above.

TC-0011-0006 × Boundary values ❌. The row declares 10 checklist points. The annotated case pins the
heading's count to the length of the numbered list, whatever the count is, and the shipped heading
reads `12-point gate`. The case therefore passes against a count the row contradicts. Repair:
`/qfai-sdd` restates the count in `US-0011-0006`, `AC-0011-0006` and `TC-0011-0006`; see Finding 3.

TC-0011-0008 × Normal path ❌. The case asserts `/nothing to do/i` anywhere in `SKILL.md`. Line 42
contains that phrase in a sentence that forbids reading an empty ledger as "nothing to do", so the
case passes even if the all-done exit (lines 267 and 269) were deleted. The all-done behaviour is not
isolated. Repair: `/qfai-implement` test-fix on `TDD-0008` to assert the exit sentence itself.

TC-0011-0008 × Error path ❌. Through `EX-0011-0001` the row owns `BR-0011-0002` and `BR-0011-0003`
failures, and the case asserts neither. The example is shared with the full-cycle row, which makes
this ownership look accidental; see Finding 6. Repair: narrow the `EX-Ref` in `/qfai-sdd`, or assert
the failures.

TC-0011-0008 × Oracle strength ❌. The named mutation — delete the all-done exit sentence — leaves
the case passing, as the normal-path paragraph explains.

TC-0011-0011 × Equivalence partitions ❌. No case is annotated for the row. Step 2 finds one
unannotated case, in `tests/assets/assets.test.ts`, and it asserts the opposite of the row: the
shipped handoff sample contains `designSystemMirror` and does not contain `extractedDesignSystem`.
Nothing in `packages/qfai/src` or the shipped skills names `extractedDesignSystem`, `mustPreserve`,
`mayAdapt` or `mustNotCopy`. Repair: `/qfai-sdd` settles the drift; see Finding 2.

TC-0011-0011 × Normal path ❌. No case parses a simplified-only handoff, and the field set the row
names is not the one the product ships. Repair as above.

TC-0011-0011 × Error path ❌. The kept failure is a schema warning for a legacy field (`AC-0011-0009`,
`EX-0011-0008`). No code emits one, and no case asserts one. Repair as above.

TC-0011-0011 × Oracle strength ❌. There is no case for the row.

TC-0011-0012 × Error path ❌. The row declares that drift between `design-system.yaml` and root
`DESIGN.md` is surfaced by the design contract validators. `AC-0011-0010` says those validators are
spec-0004's, and their cases are annotated for spec-0004, so none can be credited here. Repair:
record the obligation under `## Cross-spec obligations` naming spec-0004, or annotate a spec-0004
case that plants the drift.

TC-0011-0020 × Special values ❌. `EX-0011-0017` declares that `matchedRowIds` names no row where no
existing obligation matches. Neither the case nor the shipped passage states the empty case. Repair:
the passage is the gap as much as the test; `/qfai-implement` adds the sentence and the assertion.

TC-0011-0020 × Combinatorial ❌. `EX-0011-0017` declares what `matchedRowIds` names per verdict: the
covering row for `defective-test` and `regression`, the matching obligations for `missing-test` and
`expectation-differs`. The case asserts the verdict set and the general clause, not the pairing.
Repair as above.

### Business rules

BR-0011-0002 × Conditional branches ❌. The rule has a second branch: any active status may move to
`exception`. No annotated case asserts it; `TC-0011-0004`'s case only finds the two words on one
line. Repair: `/qfai-implement` test-fix on `TDD-0004`.

BR-0011-0003 × Negative case ❌. The rule states that production code written before a failing test
exists is rejected. The annotated cases assert the order (`TC-0011-0009`) and the gate point
(`TC-0011-0006`), not the rejection. `skillRoster.test.ts` has an unannotated `watch-it-fail` case
that comes close and is not credited. Repair: annotate or add a case for the rejection.

BR-0011-0007 × Positive case ❌. No case asserts the closed field set, and the product ships a
different one. See Finding 2.

BR-0011-0007 × Negative case ❌. No code emits the legacy-field schema warning, and no case asserts
it. See Finding 2.

BR-0011-0007 × Conditional branches ❌. The rule branches on whether a legacy field is present; no
case covers either branch. See Finding 2.

## Every ⚠️ cell, with its rationale

The matrix carries 32 `⚠️` cells and the business rule table 6, 38 in all. Each
paragraph is one cell.

### Stories

US-0011-0001 × Equivalence partitions ⚠️. The serial, one-row-at-a-time partition is asserted.
That the code is traceable — the other half of the story's goal — is not.

US-0011-0002 × Equivalence partitions ⚠️. The prohibited backward partition is asserted, with
`green` -> `red` named. The allowed forward edges are delegated to a pointer, not asserted.

US-0011-0002 × State transitions ⚠️. One prohibited edge and the pointer to the complete edge list
are asserted. The allowed edges and the terminal `done` are not.

US-0011-0004 × Equivalence partitions ⚠️. The rule that `exception` requires a DR-ID is asserted;
the row without one is not distinguished.

US-0011-0004 × Oracle strength ⚠️. The first assertion is an exact phrase. The second,
`/exception[\s\S]{0,400}DR-/` over `execution-ledger.md`, passes wherever any `DR-` follows any
`exception` within 400 characters, which that reference satisfies in many places.

US-0011-0005 × Equivalence partitions ⚠️. The serial default and the parallel conditions are
asserted. The explicit user approval and delivery-planner authorization `BR-0011-0001` requires are
not.

US-0011-0005 × Combinatorial ⚠️. Independent slices, worktree separation and a post-merge verify
are each asserted as present; that parallel dispatch needs all of them together is not.

US-0011-0009 × Equivalence partitions ⚠️. The work-order-bound partition is asserted: every
implement work order carries `target: { kind: "spec", specId: "spec-0001" }`. The resumed stage and
the run without a work order are not.

US-0011-0009 × Normal path ⚠️. The journey shows the run issuing `seam-only` and `implement` work
orders bound to the spec and reaching `qfai_done`, with no question after routing. Stage results are
scripted, so the skill working only the bound rows is not observed.

### Test cases

TC-0011-0002 × Equivalence partitions ⚠️. The backward partition is asserted as prose; the valid
forward partition is not.

TC-0011-0002 × Normal path ⚠️. The prohibition is asserted. The declared outcome — the error
`Backward transition prohibited: green -> red` — is not.

TC-0011-0002 × Error path ⚠️. `/[Bb]ackward.*prohibit/` asserts that the refusal exists, not the
message `AC-0011-0002` fixes. `changeRequestArtifact.test.ts` and `implementVolumePolicy.test.ts`
assert the exact message but are not annotated for this row.

TC-0011-0002 × State transitions ⚠️. Some backward prohibition is asserted; `green` -> `red`
specifically is not.

TC-0011-0002 × Oracle strength ⚠️. Deleting `Backward transitions are prohibited` fails the case.
A line that pairs the two words while permitting a backward move would pass it.

TC-0011-0003 × Error path ⚠️. Self-certification is refused: `skillRoster.test.ts` asserts that
`qa-gatekeeper` confirms or rejects each observation and that no sentence lets the implementation
agent confirm its own. The `BR-0011-0002` and `BR-0011-0003` failures `EX-0011-0001` brings are not
asserted.

TC-0011-0003 × Oracle strength ⚠️. The two `skillRoster.test.ts` cases can fail on a named
mutation (delete ``` `qa-gatekeeper` confirms or rejects each observation ```). The
`implementSkillSpec0011.test.ts` case asserts only that `qa-gatekeeper` appears, which no plausible
edit removes.

TC-0011-0004 × Equivalence partitions ⚠️. A line pairing `exception` and `DR-ID` is asserted; the
rows with and without a DR-ID are not distinguished.

TC-0011-0004 × Normal path ⚠️. The rule's existence is implied by the co-occurrence; the declared
outcome, the error, is not asserted.

TC-0011-0004 × Oracle strength ⚠️. The case fails only if no line names both terms. A line saying
an exception needs no DR-ID would pass it.

TC-0011-0005 × Combinatorial ⚠️. `AC-0011-0005` authorizes parallel dispatch only when every allow
condition holds and no deny condition does. Each condition is asserted as present; the conjunction
is not.

TC-0011-0006 × Error path ⚠️. Completion without RED evidence is asserted as prohibited. The other
gate refusals are in unannotated `describe`s of the same file, and the `BR-0011-0003` rejection is
asserted only as a gate item, not as a refusal.

TC-0011-0006 × State transitions ⚠️. The gate items are asserted; that they must hold before the
`done` transition is asserted only in `TC-0011-0010`'s case.

TC-0011-0006 × Oracle strength ⚠️. The two `completionContract.test.ts` cases are strong: the
heading count is pinned to the numbered list and each gate item has its own pattern. The
`implementSkillSpec0011.test.ts` case, `/done|completion/i`, cannot fail.

TC-0011-0007 × Equivalence partitions ⚠️. Status-only, empty, reasoning-only and command-plus-result
evidence are asserted. Stale evidence, the row's own example (`EX-0011-0004`), is not asserted by an
annotated case.

TC-0011-0007 × Error path ⚠️. Status-only, empty and command-less evidence are asserted as rejected.
Stale evidence is asserted only by the unannotated `fresh evidence requirement` case in
`evidenceContract.test.ts`.

TC-0011-0007 × Oracle strength ⚠️. `evidenceContract.test.ts` matches patterns such as
`/empty[\s\S]*?reject|minimum evidence/i` across `SKILL.md` and every reference joined together,
where any `empty` followed anywhere by `reject` passes. The `implementSkillSpec0011.test.ts` case
asserts only the words `evidence`, `RED` and `GREEN`.

TC-0011-0008 × Equivalence partitions ⚠️. The all-done partition is present by phrase; the ledger
with work left is not distinguished.

TC-0011-0010 × Equivalence partitions ⚠️. `implementation-reviewer` is asserted; the
`completion-reviewer` the row names is not asserted in its case.

TC-0011-0010 × Normal path ⚠️. `done` is asserted to follow every required reviewer's PASS. The
review by `completion-reviewer` is not named in the case.

TC-0011-0010 × Error path ⚠️. `done` before every reviewer has passed is refused. That the worker's
own approval is neither review (`EX-0011-0007`) is in the `describe` name but not in an assertion.

TC-0011-0012 × Equivalence partitions ⚠️. Credited under step 2: the unannotated
`uiAffectingDefinition.test.ts` case asserts that the implement read order includes
`<contractsDir>/design/design-system.yaml`. That it is read as input and never regenerated from
per-iteration HTML is not asserted.

TC-0011-0012 × Normal path ⚠️. The file is read; that its token tables equal the parsed root
`DESIGN.md` tables is spec-0004's validator behaviour and is not asserted for this row.

### Business rules

BR-0011-0001 × Positive case ⚠️. Serial default is asserted by the `US-0011-0005` E2E case. The
explicit user approval and delivery-planner authorization parallel dispatch requires are asserted
only by an unannotated `parallelDispatch.test.ts` case.

BR-0011-0001 × Conditional branches ⚠️. The parallel branch's allow and deny conditions are
asserted; the serial branch is asserted only as a default, not as what happens when authorization
is missing.

BR-0011-0005 × Negative case ⚠️. Status-only, empty and command-less evidence are asserted as
rejected; stale evidence is not asserted by an annotated case.

BR-0011-0006 × Positive case ⚠️. Both reviewers returning PASS before `done` is asserted. That an
implementation worker cannot serve as its own reviewer is not asserted for reviews; the `US-0011-0003`
case asserts it for RED and GREEN observations only.

BR-0011-0008 × Positive case ⚠️. The implement read order names `design-system.yaml`; the
determinism of the mirror is spec-0004's and is not asserted here.

BR-0011-0019 × Positive case ⚠️. The same test turning GREEN, the receipt, the run evidence and the
re-verify round are asserted. The rule's "plus the run's final verify" is neither asserted nor
stated in the shipped passage.

## Findings

1. **`US-0011-0009` is carried by a workflow-core journey.** Its one annotated case drives `qfai workflow` and submits scripted stage results, so it shows the run issuing bound `seam-only` and `implement` work orders, not `/qfai-implement` serving them. The skill side of the story is held by `TC-0011-0013` … `-0018`, which read the shipped reference and cannot answer the story. The matrix scores the story `⚠️` on that basis rather than `✅`.

2. **The handoff field set the pack names is not the one the product ships.** `US-0011-0007`,
   `AC-0011-0009`, `BR-0011-0007`, `EX-0011-0008` and `TC-0011-0011` name `finalIterIndex`,
   `finalArtifact`, `extractedDesignSystem` and `implementationNotes`, and a schema warning for
   `mustPreserve`, `mayAdapt` and `mustNotCopy`. The shipped
   `qfai-prototyping/templates/contracts/prototype-handoff.sample.yaml` has `finalIterIndex`,
   `finalArtifact`, `designMdPath`, `designMdSha256`, `designSystemMirror`, `procurement` and
   `implementationNotes`, and `qfai-implement/SKILL.md` reads `procurement` and `authored`. An
   unannotated case in `tests/assets/assets.test.ts` asserts that `extractedDesignSystem` is absent.
   No source file names any legacy field, so no warning exists. `AC-0011-0010` also keys on
   `extractedDesignSystem`. This is DRIFT under `.qfai/assistant/constitution/drift-protocol.md`:
   the pack is stale against the product, and the repair is a `/qfai-sdd` change to the pack, not a
   test.
3. **The completion gate has 12 points; the pack says 10.** `US-0011-0006`, `AC-0011-0006`,
   `TC-0011-0006` and REQ-0008 in `01_Spec.md` say 10. `SKILL.md` line 586 reads
   `Item completion checklist (12-point gate)`. `completionContract.test.ts` pins the heading to the
   list length on purpose and says so in a comment, so it accepts any count. DRIFT, repaired in
   `/qfai-sdd`.
4. **Three older test cases have only a case that cannot fail.** `TC-0011-0001` (five substrings),
   `TC-0011-0008` (a phrase that also appears in a sentence forbidding the behaviour) and the
   `implementSkillSpec0011.test.ts` halves of `TC-0011-0003` (`qa-gatekeeper` present) and
   `TC-0011-0006` (`/done|completion/i`). Stronger unannotated cases exist for several of them:
   `changeRequestArtifact.test.ts` and `implementVolumePolicy.test.ts` assert the exact backward and
   exception messages, `implementCheckpointVerification.test.ts` asserts the all-done exit sentence,
   and `evidenceContract.test.ts` asserts the stale-evidence rule. Annotating those cases for the
   rows they discharge would move a number of `❌` and `⚠️` cells without new test code.
5. **`AC-0011-0001` … `AC-0011-0011` carry no `US-Refs`.** The eight original stories are therefore
   linked to no acceptance criterion, own no failure, and have `n/a` in `Error path` by the chain
   rather than by content: `US-0011-0002` is about a refused transition. A `/qfai-sdd` pass that adds
   the `US-Refs` would make those cells owed.
6. **`EX-0011-0001` is shared by four test cases of different scope.** Its `BR-Ref` names
   `BR-0011-0002` and `BR-0011-0003`, so `TC-0011-0001`, `-0003`, `-0006` and `-0008` all own the
   backward-transition and test-first failures. For the all-done row (`TC-0011-0008`) that reads as
   an accident of reuse rather than intent.
7. **Six stories have no `E2E` case.** `US-0011-0006`, `-0007` and `-0008` (ledger rows `TDD-0018`
   … `TDD-0020`) have no test and no stated wait. `US-0011-0010` … `-0012` (`TDD-0036` … `-0038`)
   wait on the scripted journey spec-0018 ships.
8. **The ledger is behind the tests for five stories.** `tests/e2e/spec0011ImplementCycleRulesE2E.test.ts`
   carries passing cases for `US-0011-0001` … `-0005`, while ledger rows `TDD-0013` … `TDD-0017`
   are `todo` with `Test file` `-`. The matrix scores the cases; the rows need their handoff filled.
9. **`TC-0011-0011` and `TC-0011-0012` have no ledger test.** Rows `TDD-0011` and `TDD-0012` are
   `todo` with no test file, and no case is annotated for either anywhere in the tree.
