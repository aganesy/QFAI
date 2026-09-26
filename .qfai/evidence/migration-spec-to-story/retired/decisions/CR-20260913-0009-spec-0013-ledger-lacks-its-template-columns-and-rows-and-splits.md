# Change Request

- ID: `CR-20260913-0009`
- Title: `spec-0013's ledger lacks the columns and rows Phase 2b owes, and twelve rows past todo run several boundaries behind one selector`
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

**Rows that run several boundaries.** Twelve rows past `todo` — eleven at
`done` and one at `exception` — name a `Selector` that runs more than one
independently observable boundary of the obligation the row carries. Phase
2b re-scopes a row past `todo` whatever its status, since Phase Red never
selects it again, and only under a Change Request naming the row, its
boundaries and their order. It splits the row keeping the boundary its
recorded evidence observed. The table under `## Proposed change` names each
of them.

Every `re-derive` rerun of `spec-0013` runs Phase 2b, so a rerun raised for any
other reason would perform the column and row writes above without a record
authorising them, and would stop at the twelve rows. This record makes those
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

Every test case the ledger's `TC-Refs` column names, read off the table:

```text
$ awk -F'|' '/^\\| TDD-/ { gsub(/ /, "", $3); print $3 }' \
  .qfai/specs/spec-0013/tdd/test-list.md | sort -u | tr '\n' ' '
- TC-0013-0001 TC-0013-0002 TC-0013-0003 TC-0013-0004 TC-0013-0005 TC-0013-0006
TC-0013-0007 TC-0013-0008 TC-0013-0009 TC-0013-0010 TC-0013-0011 TC-0013-0012
TC-0013-0013 TC-0013-0020 TC-0013-0021 TC-0013-0022 TC-0013-0023 TC-0013-0024
TC-0013-0025 TC-0013-0026 TC-0013-0027 TC-0013-0028 TC-0013-0029 TC-0013-0030
TC-0013-0031 TC-0013-0032 TC-0013-0033 TC-0013-0034 TC-0013-0035 TC-Refs
```

The list steps from `TC-0013-0013` to `TC-0013-0020`, so no row names
`TC-0013-0014` to `TC-0013-0019`, each of which `06_Test-Cases.md` declares.
`TC-Refs` at the end is the column header the pattern also matches.

The cases each selector runs, counted per `describe` in its own file:

```text
$ for f in <the eight files the selectors name>; do
  awk -v f="$(basename "$f")" '/^describe\(/ { t=$0; sub(/^describe\("/, "", t); sub(/".*/, "", t); next }
                              /^  it\(/ { n[t]++ }
                              END { for (k in n) printf "%s  %s  %d\n", f, k, n[k] }' "$f"
done | sort

activeDiscussionPack.test.ts  TC-0013-0028: active pack resolved from state.json#discussion.currentId  1
activeDiscussionPack.test.ts  TC-0013-0029: ambiguous/absent active pointer raises a recovery error  3
primaryTasksBand.test.ts  TC-0013-0032: the primary_tasks ceiling is documented and named in the warning  3
primaryTasksBand.test.ts  TC-0013-0033: primary_tasks above 7 warns; 1 through 7 do not  3
primaryTasksBand.test.ts  the shipped ui-contract.sample.yaml sits under its own ceiling  2
primaryTasksStructured.test.ts  TC-0013-0034: structured primary_tasks accepted  2
primaryTasksStructured.test.ts  TC-0013-0035: incomplete / open structured primary_tasks rejected  5
sddPrimaryTasksLane.test.ts  TC-0013-0026: QFAI-AUD-001 aligned lane fails when primary_tasks is empty  2
sddPrimaryTasksLane.test.ts  TC-0013-0027: QFAI-AUD-001 aligned lane passes when primary_tasks is non-empty  3
sddSkillSpec0013.test.ts  TC-0013-0001: Phase Order Enforcement  1
sddSkillSpec0013.test.ts  TC-0013-0002: Contract Index Alignment  1
sddSkillSpec0013.test.ts  TC-0013-0003: Usable-Source Preflight Stop  2
sddSkillSpec0013.test.ts  TC-0013-0004: Slice Gate US->AC->BR->EX->TC  1
sddSkillSpec0013.test.ts  TC-0013-0005: Plan After Slice Gate  1
sddSkillSpec0013.test.ts  TC-0013-0006: Reference Direction Enforcement  1
sddSkillSpec0013.test.ts  TC-0013-0007: Validate Gate error=0  1
sddSkillSpec0013.test.ts  TC-0013-0008: Business Flow Mermaid  1
sddSkillSpec0013.test.ts  TC-0013-0009: Delta Rejected Guardrails  1
sddSkillSpec0013.test.ts  TC-0013-0010: Coverage Placeholder for EX-0013-0005  1
sddUiTemplate.test.ts  TC-0013-0025: shipped ui-contract.sample.yaml carries a primary_tasks list per screen  2
spec0013UiContractPrimaryTasksE2E.test.ts  US-0013-0011: UI contract primary_tasks slot + QFAI-AUD-001 aligned validate lane  3
surfaceTypePopulate.test.ts  TC-0013-0030: populateSurfaceTypeIfUiCompanion auto-populates frontmatter  3
surfaceTypePopulate.test.ts  TC-0013-0031: D-SURFACE-TYPE-MISSING warns on companion-without-frontmatter  3
```

A test case stating two independently observable outcomes, against the one row
that carries it:

```text
$ grep -n '^## TC-0013-0022' -A 6 .qfai/specs/spec-0013/06_Test-Cases.md
147:## TC-0013-0022: DESIGN.md sha256 Lock Written at Phase 0
148-
149-- EX-Ref: EX-0013-0012
150-- AC-Refs: AC-0013-0015
151-- Type: normal
152-- Verify `/qfai-sdd` Phase 0 produces `.qfai/contracts/design/DESIGN.md.lock.yaml` with
   `sha256` matching `sha256(DESIGN.md bytes)` and a `lockedAt` ISO 8601 timestamp; absence
   of root `DESIGN.md` halts Phase 0 with an error-severity finding routed through the
   design contract validator family owned by spec-0004.

$ grep -n '^| TDD-0016 ' .qfai/specs/spec-0013/tdd/test-list.md
20:| TDD-0016 | TC-0013-0022 | - | integration | — |
   TC-0013-0022: DESIGN.md sha256 Lock Written at Phase 0 | todo | DR-NOTE-3 | pending — ...
```

The last two lines of each excerpt are wrapped for width; nothing else is
changed. The lock write and the halt on a missing `DESIGN.md` are two outcomes a
test observes separately, and one row carries both.

## Proposed change

Re-derive the ledger to its template, with no statement of the pack moving.
The twelve rows are split in the order below. Each keeps its `TDD-ID` on the
first boundary listed, with its `Selector` narrowed to that boundary's cases,
and one row is appended at `todo` for each boundary after it.

The kept boundary follows the rule for the row's evidence. A row whose
falsifiability proof covers one boundary keeps that one. A row whose RED was
taken over the whole file, whose proof covers several boundaries, or which
records no RED at all, keeps the first its test case or story lists among
them.

| Row        | Obligation     | Boundaries, kept first                                                                                                                                                                        | Why the first is kept                                                                                       |
| ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TDD-0003` | `TC-0013-0003` | the SDD preflight continues on an incomplete or contradictory pack; it stops only when no usable source exists                                                                                | it records a one-shot GREEN and no RED, so the test case's order decides                                    |
| `TDD-0019` | `TC-0013-0025` | every screen of the template carries `primary_tasks: []`; the requirements-analyst guide asks for at least one task per screen                                                                | its RED failed both at once, so the test case's order decides                                               |
| `TDD-0020` | `TC-0013-0026` | the lane fails an empty list at `error`, naming the file, the screen and the rule; the `/qfai-prototyping` preflight refuses it                                                               | its proof names both the lane and the preflight check, so the test case's order decides                     |
| `TDD-0021` | `TC-0013-0027` | the lane passes a contract whose screens each hold a task; the preflight proceeds on it; a contract from before the slot is informational and non-blocking under the deprecation window       | its RED was taken over the whole file                                                                       |
| `TDD-0022` | `US-0013-0011` | the template's slot; the guide's instruction; the lane fails an empty list; the preflight refuses it; the lane passes a non-empty list                                                        | its RED observed the template-slot case failing                                                             |
| `TDD-0024` | `TC-0013-0029` | a pointer naming a missing pack raises an error naming the candidate `discussion-*` directories and the recovery command `qfai discussion use <id>`; an absent pointer raises that same error | its proof is the filter matching the pointer against the packs on disk, which the absent case never reaches |
| `TDD-0025` | `TC-0013-0030` | `/qfai-sdd` sets `surface_type: ui-bearing` for a spec with a UI companion; `resolveAllUiBearingSpecs()` requires the frontmatter                                                             | its recorded RED names no case, so the test case's order decides                                            |
| `TDD-0026` | `TC-0013-0031` | `qfai sdd lint` emits the finding at warning severity during the window for a companion without the frontmatter; it emits none for a spec with no companion                                   | its recorded RED names no case, so the test case's order decides                                            |
| `TDD-0027` | `TC-0013-0032` | `templates/contracts/ui-spec.yaml`'s comments state the band; the guide states it; the `QFAI-AUD-020` message names it                                                                        | its RED covered all three at once, so the test case's order decides                                         |
| `TDD-0028` | `TC-0013-0033` | fewer than three tasks warns; more than seven warns; exactly three does not; exactly seven does not                                                                                           | its RED covered all three at once, so the test case's order decides                                         |
| `TDD-0029` | `TC-0013-0034` | complete structured items are accepted; string-only items are accepted                                                                                                                        | its proof is the required-key set, which only structured items are measured against                         |
| `TDD-0030` | `TC-0013-0035` | an item missing `id` is rejected; one missing `label`; one missing `acceptance`; one carrying an extra key                                                                                    | its proof reports each missing key, and the test case lists `id` first among them                           |

A case that states no boundary of its row's obligation moves with the boundary
it exercises:

- `TDD-0021`'s case for an authored but empty list repeats the first boundary
  of `TC-0013-0026`, which `TDD-0020` keeps. It is removed.
- `TDD-0024`'s case asserting that no file times are read states
  `TC-0013-0028`'s second boundary, and the row appended for it takes the
  boundary but not the case as written: the case searches `discussionPack.ts`
  for `mtime`, `birthtime` and `statSync`, which a resolver delegating to
  another module, or calling a metadata API by another name, passes. The
  appended row's case observes the metadata reads made while
  `resolveActiveDiscussionPack` runs and requires there to be none.
- `TDD-0025`'s cases for a second run changing nothing and for a spec with no
  companion state no boundary of what the row keeps, which is the stage writing
  the frontmatter for a spec that has a companion. Both leave the `Selector`,
  under the rule the ATDD pass applies below. `TDD-0026`'s case for a spec that
  already declares the frontmatter leaves it on the same terms: `TC-0013-0031`
  specifies a warning for a companion without the frontmatter and no finding
  where there is no companion, so a third condition in the selector fails the
  warning row on a behaviour neither boundary states. `TDD-0030`'s case for a
  list whose every entry is malformed does exercise the boundary its row keeps
  and stays.

The cases the kept boundaries retain reach the execution path their test case
names, and assert that boundary alone:

- `TDD-0003`'s two cases run the SDD preflight over an incomplete pack and over
  one with no usable source. The cases `sddSkillSpec0013.test.ts` carries today
  search `SKILL.md` for sentences, which pass while the preflight stops on an
  incomplete pack or continues with no source at all.
- `TDD-0026`'s two cases enter through `qfai sdd lint`, the command
  `TC-0013-0031` names, rather than calling `validateSurfaceTypeDrift`
  directly, so a lint path that stopped registering the validator fails them.
- `TDD-0029`'s two cases in `primaryTasksStructured.test.ts` drop their
  `QFAI-AUD-020` and `QFAI-AUD-001` assertions, as `TDD-0030`'s case drops its
  empty-list one: a regression in the band or the empty-list check would
  otherwise fail the row while both of its boundaries hold.

Where the product answers a boundary differently from the test case — the
floor `TC-0013-0033` states, or the resolver half of `TC-0013-0030` — the row
for it is split all the same. Its RED then fails against the product, and that
disagreement goes through the Drift Protocol rather than through this record.

That includes `TDD-0019`'s first boundary. `TC-0013-0025` requires every
screen of the shipped template to carry `primary_tasks: []`, and the template
ships populated entries, so the kept boundary is the test case's own and not
the weaker check its current case makes, that the slot holds a list.

`TC-0013-0029` also names a pointer resolving to a duplicate pack. No
directory can hold two packs of one name, since both readers match the
entries of one listing by exact name, so that condition is not observable and
no row is seeded for it: Phase 2b owes a row per independently observable
boundary, and no stage could advance one for a state no test can construct.

**Six rows name a test file outside the layer their test case routes to.**
`TDD-0014` and `TDD-0015` name
`packages/qfai/tests/core/traceabilityIntegrity.test.ts`, `TDD-0023` and
`TDD-0024` name `packages/qfai/tests/core/activeDiscussionPack.test.ts`, and
`TDD-0025` and `TDD-0026` name
`packages/qfai/tests/core/surfaceTypePopulate.test.ts`. `TC-0013-0020` and
`TC-0013-0021` declare no `Level`, and `TC-0013-0028` to `TC-0013-0031` declare
`integration`, both of which route to `tests/integration/**`. Their selectors
resolve where they are, so no later stage could repair the cells. The rerun
writes those rows' `Test file` and `Selector` back to `-`, the one value a later
stage fills, and the rows appended beside them start at `-` as well.
`TDD-0014` runs one boundary and is not split.

**Three `exception` rows name no case at all.** The selectors of `TDD-0011`,
`TDD-0012` and `TDD-0013` quote their test cases' titles, `Coverage Placeholder
for EX-0013-0006`, `Coverage Placeholder for EX-0013-0007` and `Test Case Type
Column Presence`, and `specAutoDiscovery.test.ts` titles its describes under
those ids after a spec and implementation pass, a missing-ledger warning and
`--full` routing. Each selector matches no test, and none of those cases
exercises the obligation its row carries. The rerun writes their `Test file`
and `Selector` back to `-` too.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                  |
| -------------------- | ------------ | ------------------------------------------------------------------------------- |
| `spec-0013/TDD-0003` | `ledger-row` | Its `Selector` is narrowed to the case where the stage continues                |
| `spec-0013/TDD-0011` | `ledger-row` | Its `Test file` and `Selector` go back to `-`: its selector matches no test     |
| `spec-0013/TDD-0012` | `ledger-row` | Its `Test file` and `Selector` go back to `-`: its selector matches no test     |
| `spec-0013/TDD-0013` | `ledger-row` | Its `Test file` and `Selector` go back to `-`: its selector matches no test     |
| `spec-0013/TDD-0014` | `ledger-row` | Its `Test file` and `Selector` go back to `-` for its integration test          |
| `spec-0013/TDD-0015` | `ledger-row` | Its `Test file` and `Selector` go back to `-` for its integration test          |
| `spec-0013/TDD-0016` | `ledger-row` | It takes a `Boundary`, and a row is appended for the missing-`DESIGN.md` error  |
| `spec-0013/TDD-0018` | `ledger-row` | It takes a `Boundary`, and a row is appended for the extra active row's finding |
| `spec-0013/TDD-0019` | `ledger-row` | Its `Selector` is narrowed to the template slot's case                          |
| `spec-0013/TDD-0020` | `ledger-row` | Its `Selector` is narrowed to the lane's failing case                           |
| `spec-0013/TDD-0021` | `ledger-row` | Its `Selector` is narrowed to the passing contract's case                       |
| `spec-0013/TDD-0022` | `ledger-row` | Its `Selector` is narrowed to the template slot's case                          |
| `spec-0013/TDD-0023` | `ledger-row` | It takes a `Boundary`, and its `Test file` and `Selector` go back to `-`        |
| `spec-0013/TDD-0024` | `ledger-row` | Its `Test file` and `Selector` go back to `-` for the missing pack              |
| `spec-0013/TDD-0025` | `ledger-row` | Its `Test file` and `Selector` go back to `-` for the population cases          |
| `spec-0013/TDD-0026` | `ledger-row` | Its `Test file` and `Selector` go back to `-` for a companion's cases           |
| `spec-0013/TDD-0027` | `ledger-row` | Its `Selector` is narrowed to the template comment's case                       |
| `spec-0013/TDD-0028` | `ledger-row` | Its `Selector` is narrowed to the below-the-band case                           |
| `spec-0013/TDD-0029` | `ledger-row` | Its `Selector` is narrowed to the structured items' case                        |
| `spec-0013/TDD-0030` | `ledger-row` | Its `Selector` is narrowed to the cases for an item without `id`                |

- Not blocked by this CR: every other `spec-0013` row. `TDD-0017` sits at
  `todo` on a test case stating one boundary. The other `exception` rows, `TDD-0001`, `TDD-0002` and `TDD-0004`
  to `TDD-0010`, each run one case titled after their own test case in
  `packages/qfai/tests/integration/sddSkillSpec0013.test.ts`, and each is alone
  on its obligation, so their `Boundary` is `-`.
- Overlapping open CRs: `none`. A later record that re-derives `spec-0013` is
  applied after this one, against a ledger that already has its columns, its
  rows and its splits.

## Impact scope

- Specs: `spec-0013` — its ledger, and `US-0013-0003`'s statement
- Plans: `none`
- Tests: the rows above, the rows appended for them, the rows seeded for
  `TC-0013-0014` to `TC-0013-0019`, and the `E2E` rows seeded for the thirteen
  stories without one, `US-0013-0001` to `US-0013-0010` and `US-0013-0012` to
  `US-0013-0014` —
  `packages/qfai/tests/integration/sddSkillSpec0013.test.ts`,
  `packages/qfai/tests/core/traceabilityIntegrity.test.ts`,
  `packages/qfai/tests/integration/specAutoDiscovery.test.ts`,
  `packages/qfai/tests/core/sddTriage.test.ts`,
  `packages/qfai/tests/integration/sddUiTemplate.test.ts`,
  `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`,
  `packages/qfai/tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts`,
  `packages/qfai/tests/core/activeDiscussionPack.test.ts`,
  `packages/qfai/tests/core/surfaceTypePopulate.test.ts`,
  `packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts`,
  `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`,
  `packages/qfai/tests/integration/primaryTasksBand.test.ts`,
  `packages/qfai/tests/integration/primaryTasksStructured.test.ts`, the new
  tests the `/qfai-atdd spec-0013` pass writes under
  `packages/qfai/tests/integration/**` and `packages/qfai/tests/e2e/**`, and
  that pass's `.qfai/evidence/atdd-spec-0013.md` and
  `.qfai/evidence/coverage-depth-spec-0013.md`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0013/tdd/test-list.md`,
  `.qfai/specs/spec-0013/09_delta.md`, `.qfai/specs/spec-0013/02_User-stories.md`

## Decision needed from user

Re-derive `spec-0013`'s ledger to its template — the six columns it lacks, the
rows Phase 2b owes, and the twelve splits in the table — and reset these
eighteen rows to `todo`, so that the credit each holds and its reviewer verdicts
are re-earned rather than carried? And, in `02_User-stories.md`, bring
`US-0013-0003`'s statement to what its own criteria say: the stage continues on
an incomplete or contradictory pack and stops only where no usable source
exists.

The rounds already written stay where they are. A reset returns a row to `todo`
with its earlier rounds retained, and this record's ID goes in each row's
`DR-ID`, so what stands there reads as history that no longer counts toward
completion. Discarding it would delete the audit trail and break the numbering
the re-execution continues from.

- The twelve kept rows of the splits: `TDD-0003`, `TDD-0019`, `TDD-0020`,
  `TDD-0021`, `TDD-0022`, `TDD-0024`, `TDD-0025`, `TDD-0026`, `TDD-0027`,
  `TDD-0028`, `TDD-0029` and `TDD-0030`.
- The five rows whose `Test file` and `Selector` go back to `-`: `TDD-0011`,
  `TDD-0012`, `TDD-0013`, `TDD-0014` and `TDD-0023`.

`TDD-0015` is reset with them for its test-path correction and is **not** split:
`AC-0013-0014` keeps the two halves of validator registration one failure mode
at its own granularity, so this record does not decompose it below that.

## Approved actions (owner skill rerun plan)

1. Correct `US-0013-0003` first. The story asks the stage to stop for an
   incomplete pack or a blocking open question; `AC-0013-0003` and
   `TC-0013-0003` ask it to continue and to stop only where no usable source
   exists. The criteria moved under the record that changed them and the story
   did not, so the pack states two things at once, and an `E2E` row seeded from
   the story could not be satisfied without contradicting the integration row
   this record resets. The story's statement is brought to what its criteria
   say, and its `E2E` row is then seeded with the rest.

2. `/qfai-sdd spec-0013`, mode `re-derive`. No statement moves; the rerun is
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
       `fullScan`, each populated correctly: in the forced full-scan scenario
       `fullScan` is `true` and `entries` holds every changed spec, beside the
       `allSpecs` contents the carrier already checks;
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
   - at `todo`, a row for the second boundary of `TC-0013-0022` — a missing root
     `DESIGN.md` halting Phase 0 with an error — and one for the second boundary
     of `TC-0013-0024` — an extra active row raising a contract-index finding —
     with a `Boundary` on `TDD-0016` and `TDD-0018` beside them. A row at `todo`
     is split here like any other: Phase 2b splits on the boundaries its test
     case states, whatever the row's status, and leaving the decision to Phase
     Red either seeds one boundary or raises the question again from there;
   - at `todo`, the `E2E` rows the thirteen stories without one are owed. That
     count is a floor rather than the number of rows: the phase seeds one row
     per independently observable boundary a story's criteria name;
   - the twelve splits under `## Proposed change`, each appended row at `todo`
     with its `Boundary` and no `DR-ID`, since no reset reaches a row that did
     not exist;
   - `-` in the `Test file` and `Selector` of `TDD-0011` to `TDD-0015` and
     `TDD-0023` to `TDD-0026`, and of every row appended beside them.

   No row is retired. The rerun records this Change Request as one row of
   `09_delta.md`'s `## Change Requests` table — `CR ID`, `Upstream artifact`,
   `Mode`, `Approved by`, `Applied at` — not as a `## Triage` row.

3. Downstream ledger sweep: **reset to `todo`**, recording this Change Request's
   ID in `DR-ID`, the twelve kept rows — `spec-0013/TDD-0003`,
   `TDD-0019`, `TDD-0020`, `TDD-0021`, `TDD-0022`, `TDD-0024`, `TDD-0025`,
   `TDD-0026`, `TDD-0027`, `TDD-0028`, `TDD-0029` and `TDD-0030` — and
   `spec-0013/TDD-0011`, `TDD-0012`, `TDD-0013`, `TDD-0014`, `TDD-0015` and
   `TDD-0023`. A
   narrowed `Selector`, or one written back to `-`, changes the row's identity, so
   the evidence and the reviewer hashes recorded against the old one no longer
   describe it, and a split row is re-executed whether or not its recorded
   observation would still hold. **`TDD-0023`'s `Selector` goes back to `-`**, as
   action 2 writes it, and the row appended beside it gives it a `Boundary` as
   well; once its test case holds two rows that cell is part of the row's
   identity too. **`TDD-0015` is reset for its test-path correction and is not
   split**: `AC-0013-0014` states that partial wiring is one failure mode at its
   granularity and keeps the export and the invocation below it, so a record
   that split the row would decompose an obligation the criterion deliberately
   holds together. The `exception` rows among
   them, `TDD-0003` and `TDD-0011` to `TDD-0015`, keep the Decision Records their
   `DR-ID` already holds, beside this Change Request's ID. `/qfai-implement`'s Change Request preflight writes the reset.

4. **The tests move under `/qfai-atdd spec-0013`.** Every row this record
   touches is an `Integration` or `E2E` row, whose tests that stage writes and
   `/qfai-implement` does not. That pass:
   - removes `TDD-0021`'s case for an authored but empty list;
   - **strengthens the two template-slot cases of the kept rows.**
     `TDD-0019` and `TDD-0022` are kept rows, so nothing above rewrites them,
     and their cases in `sddUiTemplate.test.ts` and
     `spec0013UiContractPrimaryTasksE2E.test.ts` assert that the property is
     present and an array. Both obligations require the literal
     `primary_tasks: []`, which a populated template satisfies on those
     assertions, so each case asserts the empty value before its row is
     re-executed;
   - **gives `TC-0013-0030` a case that runs `/qfai-sdd`.** The case in
     `spec0013ActivePointerSurfaceType.test.ts` imports
     `populateSurfaceTypeIfUiCompanion` and calls it, and no production caller
     invokes it — every call under `packages/qfai` is a test's. So that case
     passes over a path the stage does not take, and the test case is about the
     stage. The row's case reaches the `/qfai-sdd` execution path; where no such
     path exists, the RED that produces is the finding, and it enters the Drift
     Protocol rather than being covered by the helper;
   - **holds `TDD-0027` to the artifact its test case names.**
     `TC-0013-0032` requires the band in `templates/contracts/ui-spec.yaml`, and
     the existing case reads `ui-contract.sample.yaml`. No `ui-spec.yaml` exists
     under `packages/qfai/assets`, so the substitute passes while the named
     artifact is absent. The case reads the named path, and its RED is the
     finding;
   - **drops from each retained selector the case that exercises another
     boundary.** `TDD-0025`'s kept boundary requires a companion and a
     frontmatter write, so its no-companion case and its case for a second run
     changing nothing are both removed: no boundary in the table above owns
     either — `TC-0013-0030`'s two are the companion-driven write and the
     resolver's strict reading, `TDD-0026`'s no-companion clause is about a
     different subject, the validator raising no finding, and the helper running
     twice is a property no criterion states at all — so moving one would put it
     on a row it does not belong to. Each returns when an upstream obligation
     states it and a row is seeded for it; and `TDD-0030`'s missing-`id` case also asserts the empty-list
     `QFAI-AUD-001` outcome, which is a different obligation, so that assertion
     goes. Either would let an unrelated failure red a row whose own boundary
     still holds, which is the isolation the split is for;
   - fills each `Test file` and `Selector` written back to `-` with a
     `tests/integration/**` case for its boundary: the cases in
     `spec0013ActivePointerSurfaceType.test.ts`, split one per boundary, for
     `TC-0013-0028` to `TC-0013-0031`, the file-time case among them, a new
     case for each of `TC-0013-0020`'s two boundaries, and a new case each for
     `TC-0013-0011` to `TC-0013-0013` and `TC-0013-0021` that exercises the
     obligation its test case states;
   - **says what becomes of every case a repoint leaves behind.** Each row
     whose case moves to a `tests/integration/**` one leaves the case it had:
     the three in `specAutoDiscovery.test.ts` annotated `TC-0013-0011` to
     `TC-0013-0013`, `TDD-0014` and `TDD-0015` in `traceabilityIntegrity.test.ts`,
     `TDD-0023` and `TDD-0024` in `activeDiscussionPack.test.ts`, `TDD-0025` and
     `TDD-0026` in `surfaceTypePopulate.test.ts`, and the two in
     `sddTriage.test.ts` annotated `TC-0013-0018` and `TC-0013-0019`, whose rows
     are seeded with their authoritative cases under `tests/integration/**`. No
     row in any pack names those cases once the repoint is written, so each is
     removed in the same pass that writes the case taking over its obligation. A
     case observing something no seeded row states is kept instead, with its
     `QFAI:SPEC-0013:TC-*` annotation and the `TC-` or `TDD-` prefix in its title
     dropped, so nothing reads as the case of a row that does not own it. Left as
     they are, they run in the full suite as duplicates, and a failure in one has
     no row and no evidence path answerable for repairing it;
   - writes `TDD-0023`'s case so it tells packs apart: it creates more than one
     pack, points `currentId` at one that is not the newest, and asserts that
     exact pack, since with one pack a resolver ignoring the pointer and
     returning the only directory passes;
   - hands each other appended or seeded row the case its boundary names,
     writing one where none exists. The `E2E` cases for `US-0013-0012` to
     `US-0013-0014` in `spec0013ActivePointerSurfaceTypeE2E.test.ts` are split
     one per boundary, and `US-0013-0001` to `US-0013-0010` take new cases.
     `US-0013-0013`'s population case reaches the `/qfai-sdd` execution path,
     for the reason `TC-0013-0030`'s does: the case there invokes
     `populateSurfaceTypeIfUiCompanion` itself, and split as it stands it would
     go green while the stage still never calls the helper.

   The pass is not limited to those rows: it takes up every ATDD-owned
   `spec-0013` row still owed, `TDD-0016` to `TDD-0018` among them, each of the
   first and last of those now holding one boundary of its test case with a row
   appended for the other. It then
   refreshes `.qfai/evidence/atdd-spec-0013.md` and
   `.qfai/evidence/coverage-depth-spec-0013.md`, whose account of the ledger's
   shape the rerun changes, through that stage's reviewer gate.

## Resolution

Not yet resolved.
