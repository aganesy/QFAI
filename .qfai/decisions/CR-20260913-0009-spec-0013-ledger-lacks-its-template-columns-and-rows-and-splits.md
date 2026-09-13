# Change Request

- ID: `CR-20260913-0009`
- Title: `spec-0013's ledger lacks the columns and rows Phase 2b owes, and thirteen rows past todo run several boundaries behind one selector`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-13T09:30:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`.qfai/specs/spec-0013/tdd/test-list.md` is written under the ledger template
and the Phase 2b contract
(`.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`), and it
falls short of both in three ways. No outside fact is needed to see any of
them.

**Columns.** The ledger has nine: `TDD-ID`, `TC-Refs`, `US-Refs`, `Layer`,
`Test file`, `Selector`, `Status`, `DR-ID`, `Evidence`. The template has
fifteen, so `Tier`, `CON-API-Refs`, `Owning module`, `Blocked-By`, `BR-Ref`
and `Boundary` are missing.

**Rows.** Phase 2b seeds one row per coverage-target test case, one
`Integration` row per integration-level test case, one `E2E` row per active
story and one `API` row per owned `CON-API-*`. Against the pack:

| Group                    | Owed                                                                                                                                  | In the ledger                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Integration-level `TC-*` | `TC-0013-0014` to `TC-0013-0019` declare no `Level`, which the template files with the integration group                              | no row for any of the six                    |
| `E2E`                    | every story, because this repository declares no UI-bearing spec: fourteen, at least one row each                                     | one, `TDD-0022`, for `US-0013-0011`          |
| Boundaries               | one row per independently observable boundary a test case states; `TC-0013-0028` states two, the pack returned and no file times read | one, `TDD-0023`, whose case covers the first |
| `API`                    | none: no pack file names a `CON-API-*`                                                                                                | none                                         |

**Rows that run several boundaries.** Thirteen rows past `todo` — eleven at
`done` and two at `exception` — name a `Selector` that runs more than one
independently observable boundary of the obligation the row carries. Phase
2b re-scopes a row past `todo` whatever its status, since Phase Red never
selects it again, and only under a Change Request naming the row, its
boundaries and their order. It splits the row keeping the boundary its
recorded evidence observed. The table under `## Proposed change` names each
of them.

Every `re-derive` rerun of `spec-0013` runs Phase 2b, so a rerun raised for any
other reason would perform the column and row writes above without a record
authorising them, and would stop at the thirteen rows. This record makes those
writes on their own, with nothing else in the pack moving.

## Reproduction

The ledger header on the default branch:

```text
| TDD-ID | TC-Refs | US-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
```

The template header,
`.qfai/assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md`:

```text
| TDD-ID | TC-Refs | Layer | Tier | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs | Owning module | Blocked-By | BR-Ref | Boundary |
```

The cases each of the thirteen selectors runs, from their test files:

```text
sddSkillSpec0013.test.ts             TC-0013-0003 describe: 2 cases
traceabilityIntegrity.test.ts        TDD-0015 describe: 2 cases
sddUiTemplate.test.ts                TC-0013-0025 describe: 2 cases
sddPrimaryTasksLane.test.ts          TC-0013-0026 describe: 2 cases; TC-0013-0027 describe: 3 cases
spec0013UiContractPrimaryTasksE2E    US-0013-0011 describe: 3 cases
activeDiscussionPack.test.ts         TC-0013-0029 describe: 3 cases
surfaceTypePopulate.test.ts          TC-0013-0030 describe: 3 cases; TC-0013-0031 describe: 3 cases
primaryTasksBand.test.ts             TC-0013-0032 describe: 3 cases; TC-0013-0033 describe: 3 cases
primaryTasksStructured.test.ts       TC-0013-0034 describe: 2 cases; TC-0013-0035 describe: 5 cases
```

## Proposed change

Re-derive the ledger to its template, with no statement of the pack moving.
The thirteen rows are split in the order below. Each keeps its `TDD-ID` on the
first boundary listed, with its `Selector` narrowed to that boundary's cases,
and one row is appended at `todo` for each boundary after it.

The kept boundary follows the rule for the row's evidence. A row whose
falsifiability proof covers one boundary keeps that one. A row whose RED was
taken over the whole file, whose proof covers several boundaries, or which
records no RED at all, keeps the first its test case or story lists among
them.

| Row        | Obligation     | Boundaries, kept first                                                                                                                                           | Why the first is kept                                                                                       |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TDD-0003` | `TC-0013-0003` | `/qfai-sdd` continues on an incomplete or contradictory pack; it stops only when no usable source exists                                                         | it records a one-shot GREEN and no RED, so the test case's order decides                                    |
| `TDD-0015` | `TC-0013-0020` | `validateTraceabilityIntegrity` is exported from the validators index; `validate.ts` imports it and calls it in the pipeline                                     | it records no RED, so the test case's order decides                                                         |
| `TDD-0019` | `TC-0013-0025` | the template's screens carry a `primary_tasks` slot; the requirements-analyst guide asks for at least one task per screen                                        | its RED failed both at once, so the test case's order decides                                               |
| `TDD-0020` | `TC-0013-0026` | the lane fails an empty list at `error`, naming the file, the screen and the rule; the `/qfai-prototyping` preflight refuses it                                  | its proof names both the lane and the preflight check, so the test case's order decides                     |
| `TDD-0021` | `TC-0013-0027` | the lane passes a contract whose screens each hold a task; the preflight proceeds on it; a contract from before the slot is treated under the deprecation window | its RED was taken over the whole file                                                                       |
| `TDD-0022` | `US-0013-0011` | the template's slot; the guide's instruction; the lane fails an empty list; the preflight refuses it; the lane passes a non-empty list                           | its RED observed the template-slot case failing                                                             |
| `TDD-0024` | `TC-0013-0029` | a pointer naming a missing pack is an error; an absent pointer is an error; a pointer matching several packs is an error                                         | its proof is the filter matching the pointer against the packs on disk, which the absent case never reaches |
| `TDD-0025` | `TC-0013-0030` | `/qfai-sdd` sets `surface_type: ui-bearing` for a spec with a UI companion; `resolveAllUiBearingSpecs()` requires the frontmatter                                | its recorded RED names no case, so the test case's order decides                                            |
| `TDD-0026` | `TC-0013-0031` | the finding is raised for a companion without the frontmatter; no finding for a spec with no companion                                                           | its recorded RED names no case, so the test case's order decides                                            |
| `TDD-0027` | `TC-0013-0032` | the template's comments state the band; the guide states it; the `QFAI-AUD-020` message names it                                                                 | its RED covered all three at once, so the test case's order decides                                         |
| `TDD-0028` | `TC-0013-0033` | fewer than three tasks warns; more than seven warns; three and seven do not                                                                                      | its RED covered all three at once, so the test case's order decides                                         |
| `TDD-0029` | `TC-0013-0034` | complete structured items are accepted; string-only items are accepted                                                                                           | its proof is the required-key set, which only structured items are measured against                         |
| `TDD-0030` | `TC-0013-0035` | an item missing `id` is rejected; one missing `label`; one missing `acceptance`; one carrying an extra key                                                       | its proof reports each missing key, and the test case lists `id` first among them                           |

A case that states no boundary of its row's obligation moves with the boundary
it exercises:

- `TDD-0021`'s case for an authored but empty list repeats the first boundary
  of `TC-0013-0026`, which `TDD-0020` keeps. It is removed.
- `TDD-0024`'s case asserting that no file times are read states
  `TC-0013-0028`'s second boundary, and becomes the case of the row appended
  for it.
- `TDD-0025`'s cases for a second run changing nothing and for a spec with no
  companion exercise the boundary `TDD-0025` keeps, and stay in its
  `Selector`. So does `TDD-0026`'s case for a spec that already declares the
  frontmatter, and `TDD-0030`'s case for a list whose every entry is malformed.

Where the product answers a boundary differently from the test case — the
floor `TC-0013-0033` states, or the resolver half of `TC-0013-0030` — the row
for it is split all the same. Its RED then fails against the product, and that
disagreement goes through the Drift Protocol rather than through this record.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                   |
| -------------------- | ------------ | ---------------------------------------------------------------- |
| `spec-0013/TDD-0003` | `ledger-row` | Its `Selector` is narrowed to the case where the stage continues |
| `spec-0013/TDD-0015` | `ledger-row` | Its `Selector` is narrowed to the export case                    |
| `spec-0013/TDD-0019` | `ledger-row` | Its `Selector` is narrowed to the template slot's case           |
| `spec-0013/TDD-0020` | `ledger-row` | Its `Selector` is narrowed to the lane's failing case            |
| `spec-0013/TDD-0021` | `ledger-row` | Its `Selector` is narrowed to the passing contract's case        |
| `spec-0013/TDD-0022` | `ledger-row` | Its `Selector` is narrowed to the template slot's case           |
| `spec-0013/TDD-0023` | `ledger-row` | It takes a `Boundary` once a row is appended beside it           |
| `spec-0013/TDD-0024` | `ledger-row` | Its `Selector` is narrowed to the missing pack's case            |
| `spec-0013/TDD-0025` | `ledger-row` | Its `Selector` is narrowed to the population cases               |
| `spec-0013/TDD-0026` | `ledger-row` | Its `Selector` is narrowed to the cases for a companion          |
| `spec-0013/TDD-0027` | `ledger-row` | Its `Selector` is narrowed to the template comment's case        |
| `spec-0013/TDD-0028` | `ledger-row` | Its `Selector` is narrowed to the below-the-band case            |
| `spec-0013/TDD-0029` | `ledger-row` | Its `Selector` is narrowed to the structured items' case         |
| `spec-0013/TDD-0030` | `ledger-row` | Its `Selector` is narrowed to the cases for an item without `id` |

- Not blocked by this CR: every other `spec-0013` row. `TDD-0016` to
  `TDD-0018` sit at `todo`, and Phase Red judges a `todo` row's selector when it
  selects it. The other `exception` rows, `TDD-0001`, `TDD-0002` and `TDD-0004`
  to `TDD-0014`, run one case each and are each alone on their obligation, so
  their `Boundary` is `-`.
- Overlapping open CRs: `none`. A later record that re-derives `spec-0013` is
  applied after this one, against a ledger that already has its columns, its
  rows and its splits.

## Impact scope

- Specs: `spec-0013`
- Plans: `none`
- Tests: the rows above, the rows appended for them, and the rows seeded for
  `TC-0013-0014` to `TC-0013-0019` —
  `packages/qfai/tests/integration/sddSkillSpec0013.test.ts`,
  `packages/qfai/tests/core/traceabilityIntegrity.test.ts`,
  `packages/qfai/tests/integration/specAutoDiscovery.test.ts`,
  `packages/qfai/tests/core/sddTriage.test.ts`,
  `packages/qfai/tests/integration/sddUiTemplate.test.ts`,
  `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`,
  `packages/qfai/tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts`,
  `packages/qfai/tests/core/activeDiscussionPack.test.ts`,
  `packages/qfai/tests/core/surfaceTypePopulate.test.ts`,
  `packages/qfai/tests/integration/primaryTasksBand.test.ts`,
  `packages/qfai/tests/integration/primaryTasksStructured.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0013/tdd/test-list.md`,
  `.qfai/specs/spec-0013/09_delta.md`

## Decision needed from user

Re-derive `spec-0013`'s ledger to its template — the six columns it lacks, the
rows Phase 2b owes, and the thirteen splits in the table — and reset the
thirteen kept rows and `TDD-0023` to `todo`?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013`, mode `re-derive`. No statement moves; the rerun is
   there for the ledger, because its Phase 2b is the only phase that may write
   a row's identity or the table's shape. It writes:
   - the six missing columns, filled on every row: `Tier`, `Owning module` and
     `BR-Ref` derived as the phase derives them, `Boundary` as a slug on each
     split row and `-` on a row alone on its obligation, `CON-API-Refs` as `-`
     and `Blocked-By` empty. No row has a recorded tier, so writing one raises
     none, and no row is reset for its tier;
   - at `todo`, the `Integration` rows `TC-0013-0014` to `TC-0013-0019` are
     owed: one per boundary each test case states, in the order it states them,
     with a `Boundary` slug wherever a test case holds more than one. Thirteen
     rows:
     - `TC-0013-0014`: one row, the result carrying `entries`, `allSpecs` and
       `fullScan`;
     - `TC-0013-0015`: `true` when a `_policies/` file is modified; `false`
       when none is;
     - `TC-0013-0016`: a configured `baseBranch` is read; an absent one returns
       the default;
     - `TC-0013-0017`: one row, old evidence without a Diff Context section
       parsing;
     - `TC-0013-0018`: a backslash round-trips without doubling; a pipe
       round-trips through its `\|` escape; the combination `a\|b`
       round-trips; then one row for each line-break class, `\r\n`, `\r` and
       `\n`, collapsing to a single space;
     - `TC-0013-0019`: one row, a plain ASCII cell round-tripping unchanged;
   - at `todo`, a row for `TC-0013-0028`'s second boundary;
   - at `todo`, the `E2E` rows the thirteen stories without one are owed. That
     count is a floor rather than the number of rows: the phase seeds one row
     per independently observable boundary a story's criteria name;
   - the thirteen splits under `## Proposed change`, each appended row at `todo`
     with its `Boundary` and no `DR-ID`, since no reset reaches a row that did
     not exist.

   No row is retired. The rerun records this Change Request as one row of
   `09_delta.md`'s `## Change Requests` table — `CR ID`, `Upstream artifact`,
   `Mode`, `Approved by`, `Applied at` — not as a `## Triage` row.

2. Downstream ledger sweep: **reset to `todo`**, recording this Change Request's
   ID in `DR-ID`, the thirteen kept rows — `spec-0013/TDD-0003`, `TDD-0015`,
   `TDD-0019`, `TDD-0020`, `TDD-0021`, `TDD-0022`, `TDD-0024`, `TDD-0025`,
   `TDD-0026`, `TDD-0027`, `TDD-0028`, `TDD-0029` and `TDD-0030` — and
   `spec-0013/TDD-0023`. A narrowed `Selector` changes the row's identity, so
   the evidence and the reviewer hashes recorded against the old one no longer
   describe it, and a split row is re-executed whether or not its recorded
   observation would still hold. `TDD-0023` keeps its `Selector`, but the row
   appended beside it gives it a `Boundary`, and once its test case holds two
   rows that cell is part of the row's identity. `TDD-0003` and `TDD-0015` keep
   the Decision Records their `DR-ID` already holds, beside this Change
   Request's ID. `/qfai-implement`'s Change Request preflight writes the reset.

3. **The tests move under `/qfai-atdd spec-0013`.** Every row this record
   touches is an `Integration` or `E2E` row, whose tests that stage writes and
   `/qfai-implement` does not. It removes `TDD-0021`'s case for an authored but
   empty list, moves the file-time case into `TC-0013-0028`'s `describe`, and
   hands each appended or seeded row the case its boundary names, writing one
   where none exists. That run then refreshes
   `.qfai/evidence/coverage-depth-spec-0013.md`, whose account of the ledger's
   shape the rerun changes, through that stage's reviewer gate.

## Resolution

Not yet resolved.
