# Coverage Depth Matrix — spec-0001

## Scope

This matrix scores every active obligation of spec-0001, read from the spec files in full and not
from the rows of `.qfai/specs/spec-0001/tdd/test-list.md`:

- the ten user stories `02_User-stories.md` declares, `US-0001-0001` … `US-0001-0010`;
- the thirty-two test cases `06_Test-Cases.md` declares, `TC-0001-0001` … `TC-0001-0032`;
- the thirty-one business rules of the Rule Table in `04_Business-Rules.md`, `BR-0001-0001` …
  `BR-0001-0031`.

No story carries a `- x-qfai-status: planned` meta line, and no rule carries a status retiring it,
so every one of them is active and owns a row.

**Every story owes an E2E test.** No spec in this project declares a user-facing surface: no
`01_Spec.md` carries `surface_type: ui-bearing` frontmatter or a legacy prototyping heading, there is
no `.qfai/contracts/ui/` directory, and `qfai.config.yaml` pins no `prototyping.primarySpecId`.
Surface scoping therefore does not apply (`catalog/test-layers.md`, E2E obligations), and the E2E
obligation stays project-wide. No file under `packages/qfai/tests/**` carries a
`QFAI:SPEC-0001:US-*` annotation outside a fixture string, so all ten story rows are scored against
nothing.

**How a row is read.** A test-case row is scored against the case whose title names it, and against
any other case that exercises the behaviour its `Expected` cell names. Where that second case carries
no annotation for the row, the row says so and the gap is listed under Findings. Contracts: none of
spec-0001's files reference a `CON-API-*` or `CON-DB-*`, so no contract-derived failure is scored.
The spec does reference the CLI contracts `CLI-WF` and `CLI-WFFILE`; their clauses reach the rows
through `BR-0001-0021` and `BR-0001-0025` … `BR-0001-0030`, and are scored there.

**What `n/a` means here.** Many test cases in this spec assert that a shipped or specification
document states a rule. For those rows the input is one fixed file, so there is no parameter to
partition, no ordered domain, no special value and no interaction to cross, and the cell is `n/a`.
A prohibition on a document's content — "no skill carries this key", "exactly one line cites this
file" — is the row's own normal path, asserted by the scan; it is not a failure the system emits, so
it does not open an `Error path` cell. An `Error path` cell opens where the chain names a failure the
system reports or refuses (a validator finding, the entry check's refusal), or where a violation was
actually observed.

**Row verdicts.** A row's `Status` is `❌` when any of its scored cells is `❌`, `⚠️` when any is
`⚠️`, and `✅` otherwise. It is the row's verdict, not a scored cell.

Committed, because it is a governance record. "Every ❌ cell, named" enumerates all 153 of them, and
"Every ⚠️ cell, named" gives a rationale for each of the 50 partial scores.

## What was measured, and how

Each file below was run on its own from `packages/qfai`, on 2026-09-25, with
`NO_COLOR=1 node node_modules/vitest/vitest.mjs run <file> --reporter=verbose`. All passed.

| File                                                        | Result    | Carries a spec-0001 annotation |
| ----------------------------------------------------------- | --------- | ------------------------------ |
| `tests/integration/specPackSpec0001.test.ts`                | 24 passed | `TC-0001-0001` … `-0024`       |
| `tests/integration/stage0ReuseSpec0001.test.ts`             | 1 passed  | `TC-0001-0025`                 |
| `tests/integration/stageSkillEntryCheckSpec0001.test.ts`    | 2 passed  | `TC-0001-0026`, `-0027`        |
| `tests/integration/stageSkillDescriptionsSpec0001.test.ts`  | 1 passed  | `TC-0001-0028`                 |
| `tests/integration/stageSkillStandaloneSpec0001.test.ts`    | 1 passed  | `TC-0001-0029`                 |
| `tests/integration/orchestratedModeReferenceSpec0001.test.ts` | 1 passed | `TC-0001-0030`                 |
| `tests/integration/stageSkillModelInvocationSpec0001.test.ts` | 1 passed | `TC-0001-0031`                 |
| `tests/integration/governanceTextSpec0001.test.ts`          | 1 passed  | `TC-0001-0032`                 |
| `tests/core/specLayoutCaseExact.test.ts`                    | 4 passed  | none                           |
| `tests/assets/specRequiredFilesParity.test.ts`              | 14 passed | none                           |
| `tests/core/layerCoverage.test.ts`                          | 21 passed | none                           |
| `tests/core/idFormatScanning.test.ts`                       | 20 passed | none                           |
| `tests/core/specScopeValidate.test.ts`                      | 13 passed | none                           |
| `tests/core/skillRegistrationContract.test.ts`              | 70 passed | none                           |

The last six were located by reading the source the spec names (`specLayout.ts`, the coverage and ID
validators, the skill front-matter gate) and following it to the tests that drive it. They are the
only behavioural evidence for `TC-0001-0001` … `-0009` and for the length and bracket rules of
`BR-0001-0026`.

The annotations in the other search hits are fixture strings: `tests/core/atdd*.test.ts`,
`tests/core/tddListObligationColumns.test.ts`, `tests/integration/atddScaffold*.test.ts` and
`tests/integration/cli/commands/validate.tddProfileAtddGates.test.ts` build them as test input.

### `specPackSpec0001.test.ts` holds one regular expression per test case

Each of its 24 cases reads one file — `src/core/specLayout.ts`, `src/core/validators/specPack.ts`,
the shipped `drift-protocol.md` or `constitution.md`, or spec-0001's own `01_Spec.md` — and asserts
one pattern. Most patterns name the topic, not the `Expected` cell: `/Article/` for "ten articles,
non-negotiable", `/STOP|Change Request|CR/i` for the five drift steps (`CR` case-insensitive matches
any `cr` in the file), `/evidence|exception|allow/i` for the whitelist's two additions. A row whose
only case is one of these is scored on what the pattern can detect.

The file-level annotation block names all 24 test cases, so every case in the file answers for every
one of them. Rows are scored against the case whose `describe` title names them; the one exception is
`TC-0001-0024`, whose `Expected` cell is asserted verbatim by the `TC-0001-0023` case.

### What was checked in the tree rather than inferred

Six rows name an expected state that the tree contradicts. Each was checked directly:

1. `REQUIRED_LAYERED_SPEC_FILES_V1421` in `src/core/specLayout.ts` lists ten files, `10_Plan.md`
   included and required. `TC-0001-0001` expects nine, and `BR-0001-0001` calls `10_Plan.md`
   optional.
2. `REQUIRED_LAYERED_SHARED_FILES_V1421` lists eleven `_policies` files, `11_Slice-Policy.md`
   included. `TC-0001-0002` expects ten.
3. `.qfai/specs/_policies/` holds spec IDs: nine of its eleven files match `spec-NNNN` or a
   `US`/`AC`/`BR`/`EX`/`TC` ID. Only `01_Objective.md` and `04_Business-Flow.md` hold none.
   `TC-0001-0010` expects none. The only upward-reference rule in `src/**`,
   `E_UPWARD_REF_FORBIDDEN` in `validators/specPack.ts`, checks files inside one spec of the older
   spec-pack layout and never reads `_policies`.
4. `## Allowed exceptions (minimal whitelist)` in the shipped `constitution/drift-protocol.md` has no
   entry for a spec-unchanged bugfix and none for a missing-test row appended after diagnosis; the
   words "bugfix" and "diagnos" occur nowhere in the file. `TC-0001-0015` expects both.
5. The shipped assistant tree names no `tdd-red`, `tdd-green` or `tdd-refactor` catalog entry, and no
   "Canonical Workflow" or `Stage 6` appears in it; the only numbered stage section is `## Stage 0` in
   `shared-skill-operating-baseline.md`. `TC-0001-0018` and `TC-0001-0019` expect both.
   `tests/assets/assets.test.ts` holds a case titled "ensures old tdd skills are abolished (not
   shipped)"; it was read, not run, and contributes to no cell.
6. The shipped `constitution.md` has eleven `## Article` headings, I to XI, and no statement that
   they are non-negotiable. `TC-0001-0020` expects ten, stated as non-negotiable.

Two positive facts were checked the same way: every `01_Spec.md` under `.qfai/specs/` carries a
`Parent: CAP-NNNN` line, and every AC, BR and EX of spec-0001 is reached by at least one TC or EX.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0001-0001 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0002 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0003 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0004 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0005 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0006 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0007 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0008 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0001-0010 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0001-0001 | ⚠️                     | ❌          | ✅         | ✅         | n/a             | ⚠️             | n/a               | n/a           | ⚠️              | ❌     |
| TC-0001-0002 | ⚠️                     | ❌          | ❌         | ❌         | n/a             | ❌             | n/a               | n/a           | ⚠️              | ❌     |
| TC-0001-0003 | ⚠️                     | ⚠️          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ⚠️              | ❌     |
| TC-0001-0004 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0001-0005 | ✅                     | ⚠️          | ⚠️         | ✅         | ✅              | ✅             | n/a               | ⚠️            | ⚠️              | ⚠️     |
| TC-0001-0006 | n/a                    | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0001-0007 | ✅                     | ⚠️          | ✅         | ✅         | n/a             | ✅             | n/a               | ✅            | ⚠️              | ⚠️     |
| TC-0001-0008 | ✅                     | ⚠️          | ✅         | ✅         | n/a             | ✅             | n/a               | ✅            | ⚠️              | ⚠️     |
| TC-0001-0009 | ✅                     | ⚠️          | ✅         | ✅         | n/a             | ✅             | n/a               | ✅            | ⚠️              | ⚠️     |
| TC-0001-0010 | ❌                     | ❌          | ❌         | ❌         | n/a             | ❌             | n/a               | n/a           | ❌              | ❌     |
| TC-0001-0011 | ⚠️                     | ⚠️          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0001-0012 | ⚠️                     | ⚠️          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0001-0013 | n/a                    | ⚠️          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0001-0014 | n/a                    | ❌          | n/a        | n/a        | n/a             | n/a            | ❌                | n/a           | ❌              | ❌     |
| TC-0001-0015 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0001-0016 | ⚠️                     | ⚠️          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0001-0017 | ❌                     | ❌          | n/a        | ❌         | n/a             | n/a            | ❌                | ❌            | ❌              | ❌     |
| TC-0001-0018 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0001-0019 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | ❌                | n/a           | ❌              | ❌     |
| TC-0001-0020 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0001-0021 | n/a                    | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0001-0022 | ⚠️                     | ⚠️          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0001-0023 | ⚠️                     | ⚠️          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0001-0024 | n/a                    | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0001-0025 | ✅                     | ✅          | n/a        | ✅         | n/a             | n/a            | n/a               | ✅            | ✅              | ✅     |
| TC-0001-0026 | ✅                     | ✅          | ✅         | ⚠️         | n/a             | n/a            | ✅                | ✅            | ✅              | ⚠️     |
| TC-0001-0027 | ✅                     | ✅          | ✅         | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ✅     |
| TC-0001-0028 | ✅                     | ✅          | ✅         | n/a        | ✅              | ✅             | n/a               | n/a           | ✅              | ✅     |
| TC-0001-0029 | n/a                    | ✅          | n/a        | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ✅     |
| TC-0001-0030 | ✅                     | ✅          | n/a        | n/a        | ✅              | n/a            | n/a               | n/a           | ✅              | ✅     |
| TC-0001-0031 | ⚠️                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ⚠️     |
| TC-0001-0032 | n/a                    | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ✅     |

Totals across the nine depth columns of 42 rows — 10 stories and 32 test cases, 378 cells:
**✅ 57 / ⚠️ 36 / ❌ 136**, with 149 `n/a`.

By row group: the ten story rows hold ❌ 90; the thirty-two test-case rows hold ✅ 57 / ⚠️ 36 /
❌ 46 / `n/a` 149.

Row verdicts over the same 42 rows: **✅ 7 / ⚠️ 11 / ❌ 24**. `US/TC ID` and `Status` are not
scored cells and are in neither count.

### Business rule coverage

One row per active `BR-0001-*` of the Rule Table in `04_Business-Rules.md`; all 31 are active.
`Covering TC` follows each rule to its examples through `BR-Ref`, and each example to its test cases
through `EX-Ref`.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                | Status |
| ------------ | ------------- | ------------- | -------------------- | -------------------------- | ------ |
| BR-0001-0001 | ❌            | ✅            | ❌                   | TC-0001-0001               | ❌     |
| BR-0001-0002 | ❌            | ❌            | n/a                  | TC-0001-0002               | ❌     |
| BR-0001-0003 | ⚠️            | n/a           | n/a                  | TC-0001-0024               | ⚠️     |
| BR-0001-0004 | ⚠️            | n/a           | ❌                   | TC-0001-0003               | ❌     |
| BR-0001-0005 | ❌            | n/a           | ❌                   | TC-0001-0004               | ❌     |
| BR-0001-0006 | ⚠️            | ⚠️            | n/a                  | TC-0001-0005               | ⚠️     |
| BR-0001-0007 | ✅            | n/a           | n/a                  | TC-0001-0006               | ✅     |
| BR-0001-0008 | ❌            | n/a           | n/a                  | TC-0001-0021               | ❌     |
| BR-0001-0009 | ⚠️            | n/a           | n/a                  | TC-0001-0022               | ⚠️     |
| BR-0001-0010 | ✅            | ✅            | n/a                  | TC-0001-0007               | ✅     |
| BR-0001-0011 | ✅            | ✅            | n/a                  | TC-0001-0008               | ✅     |
| BR-0001-0012 | ✅            | ✅            | n/a                  | TC-0001-0009               | ✅     |
| BR-0001-0013 | ⚠️            | n/a           | n/a                  | TC-0001-0023               | ⚠️     |
| BR-0001-0014 | ❌            | ❌            | n/a                  | TC-0001-0010               | ❌     |
| BR-0001-0015 | ⚠️            | n/a           | n/a                  | TC-0001-0011               | ⚠️     |
| BR-0001-0016 | ⚠️            | n/a           | n/a                  | TC-0001-0012               | ⚠️     |
| BR-0001-0017 | ⚠️            | n/a           | n/a                  | TC-0001-0013               | ⚠️     |
| BR-0001-0018 | ❌            | n/a           | n/a                  | TC-0001-0014               | ❌     |
| BR-0001-0019 | ❌            | n/a           | ❌                   | TC-0001-0015               | ❌     |
| BR-0001-0020 | ⚠️            | n/a           | n/a                  | TC-0001-0016               | ⚠️     |
| BR-0001-0021 | ❌            | n/a           | ❌                   | TC-0001-0017               | ❌     |
| BR-0001-0022 | ❌            | n/a           | n/a                  | TC-0001-0018               | ❌     |
| BR-0001-0023 | ⚠️            | n/a           | ⚠️                   | TC-0001-0019, TC-0001-0025 | ⚠️     |
| BR-0001-0024 | ❌            | n/a           | n/a                  | TC-0001-0020               | ❌     |
| BR-0001-0025 | ✅            | ✅            | ✅                   | TC-0001-0026, TC-0001-0027 | ✅     |
| BR-0001-0026 | ✅            | ✅            | n/a                  | TC-0001-0028               | ✅     |
| BR-0001-0027 | ✅            | n/a           | ✅                   | TC-0001-0029               | ✅     |
| BR-0001-0028 | ✅            | n/a           | n/a                  | TC-0001-0030               | ✅     |
| BR-0001-0029 | ✅            | n/a           | ⚠️                   | TC-0001-0031               | ⚠️     |
| BR-0001-0030 | ⚠️            | n/a           | n/a                  | TC-0001-0032               | ⚠️     |
| BR-0001-0031 | ✅            | n/a           | n/a                  | TC-0001-0032               | ✅     |

Totals across the three scored columns over 31 rows, 93 cells: **✅ 18 / ⚠️ 14 / ❌ 17**, with 44
`n/a`. Row verdicts: **✅ 9 / ⚠️ 11 / ❌ 11**.

`n/a` in `Negative case` means the rule names no failure the system reports and none was observed.
`n/a` in `Conditional branches` means the rule has one branch.

### Totals for the whole file

Over all 471 scored cells — 378 matrix depth cells (42 rows × 9 columns) and 93 business rule cells
(31 rows × 3 columns): **✅ 75 / ⚠️ 50 / ❌ 153**, with 193 `n/a`.

### Safety floor

No scored failure here is a safety-floor failure. The failures this spec keeps are findings the
validator reports about a project's own documents — a missing required file, a malformed or
duplicated ID, an AC with no test case — and the entry check's refusal of an unissued work order.
None of them is input the code would otherwise mishandle, lose data over or expose. The reading code
that parses those files is covered by the specs that own the parsers. `qa-gatekeeper` should confirm
this judgement, because it decides whether the `❌` cells below can be carried with a justification.

## Every ❌ cell, named

153 in all: 136 in the matrix and 17 in the business rule table. No Decision Record or Change Request
carries any of them yet; each names where the repair belongs.

### The ten stories — `US-0001-0001` … `US-0001-0010` (90 cells)

No test under `packages/qfai/tests/e2e/**`, or anywhere else, references a spec-0001 story. The ledger
seeds one `Layer = E2E` row per story (`TDD-0025` … `TDD-0033` and `TDD-0042`), all at `todo` with no
`Test file`.

- **Equivalence partitions, Normal path, Error path, Edge cases, Boundary values, Special values,
  State transitions, Combinatorial, Oracle strength** — nine cells on each of the ten rows, each `❌`
  because the row has no case at any depth. Without a case there is no input, no path and no
  assertion, so no category can be judged present or absent for the story, and `⚠️` would overstate
  every one. The cells are re-scored when an E2E test exists.

Why no test-case row stands in for a story: the test-case rows check that a document or a constant
says something. A story is observed end to end — a `qfai validate` run over a pack for
`US-0001-0001` … `-0006`, an agent following the drift protocol or the skill order for `-0007` …
`-0009`, and a free-text request handed to `qfai-run` for `-0010`. Crediting a document check to a
story would report the E2E obligation as met by a layer that holds no test for it.

`US-0001-0010` names `spec-0018` as the blocker of its E2E row in its `Notes`, while `TDD-0042`
carries `-` in `Blocked-By` (see Findings).

### TC-0001-0001 — 9 required spec files (1 cell)

- **Normal path** — the declared expectation, nine files with `10_Plan.md` optional, contradicts the
  code, which requires ten. `specRequiredFilesParity.test.ts` pins the constant to the shipped
  catalog and `specLayoutCaseExact.test.ts` seeds ten files; both confirm ten. This is drift, not a
  missing test: no test can make both true. Route to `/qfai-sdd` for a Change Request that either
  adopts `10_Plan.md` as required in `BR-0001-0001`, `AC-0001-0001`, `EX-0001-0001` and
  `TC-0001-0001`, or reverses the code.

### TC-0001-0002 — 10 required `_policies` files (4 cells)

- **Normal path** — drift, as above: the code and the shipped catalog require eleven files,
  `11_Slice-Policy.md` included. Route to `/qfai-sdd`.
- **Error path** — `BR-0001-0002` makes every `_policies` file required, so a missing one is a kept
  failure. No case removes a `_policies` file and expects it reported; `specLayoutCaseExact.test.ts`
  seeds no `_policies` directory at all.
- **Edge cases** — no case covers a mis-cased or symlinked `_policies` file, the edges
  `specLayoutCaseExact.test.ts` covers for the spec directory.
- **Special values** — no empty, mis-cased or dangling `_policies` entry is supplied.

### TC-0001-0003 — v1421 detection (3 cells)

- **Edge cases** — the marker probe is case-exact on purpose (the source comment says casing is what
  separates v1417 from v1421). No case supplies a mis-cased marker such as `05_examples.md`.
- **Special values** — the same mis-cased marker is the special value this input admits; untested.
- **Combinatorial** — `BR-0001-0005` fixes the priority v1421 > v1417 > v1416 > spec-pack > legacy
  when several layouts' files coexist. No case seeds a directory holding two layouts' files.

### TC-0001-0004 — v1417 fallback (6 cells)

The only case asserts that `specLayout.ts` contains the string `v1417`, which the `LayeredStyle` type
union holds whatever the detection does.

- **Equivalence partitions** — the partition "base files, no v1421 marker" is never supplied.
- **Normal path** — no case seeds a v1417 directory or asserts `layeredStyle: "v1417"`. No test in
  the package asserts `layeredStyle` at all.
- **Edge cases** — a directory whose only marker is mis-cased, which should fall back to v1417, is
  untested.
- **Special values** — same mis-cased marker; untested.
- **Combinatorial** — v1417 files coexisting with v1416 or spec-pack files; untested.
- **Oracle strength** — setting `hasLayeredV1417` to `false` leaves the case green.

### TC-0001-0010 — no spec IDs in `_policies` (6 cells)

The expected state is false in the tree (see "What was checked in the tree"). That makes the
violation an observed failure, which the checklist keeps whatever the spec says. The case reads
spec-0001's `01_Spec.md` for the words `参照方向`, not the `_policies` files.

- **Equivalence partitions** — neither the compliant partition (a `_policies` file with no spec ID)
  nor the violating one is read by any case.
- **Normal path** — the `Expected` cell, "none found", does not hold, and no case reads the files it
  names.
- **Error path** — the observed violation has no case, and no validator reports it:
  `E_UPWARD_REF_FORBIDDEN` covers a different layout and never reads `_policies`. Route to
  `/qfai-sdd`: either qualify `BR-0001-0014` (the `_policies` decision log and delta cite specs by
  design) or add a check and clean the files.
- **Edge cases** — a spec ID inside a fenced example, and the `CAP-NNNN` IDs `_policies` may carry,
  are untested.
- **Special values** — placeholder IDs such as `spec-XXXX` are untested.
- **Oracle strength** — adding `spec-0001` to `_policies/01_Objective.md` leaves the case green, as
  the existing references already do.

### TC-0001-0013 — drift protocol core rule (1 cell)

- **Oracle strength** — the case matches `/SSOT|upstream/i` over the whole file. `upstream` occurs
  35 times outside `## Core rule`, so deleting the section leaves the case green.

### TC-0001-0014 — drift protocol five steps (3 cells)

- **Normal path** — `/STOP|Change Request|CR/i` is satisfied by any `cr` in the file, so the case
  asserts none of the five steps.
- **State transitions** — the five steps are an ordered procedure. No case asserts any step or their
  order.
- **Oracle strength** — deleting `## When drift is detected` leaves the case green.

### TC-0001-0015 — drift protocol whitelist (3 cells)

The two added exceptions are absent from the shipped whitelist (see "What was checked in the tree").
The row's `Notes` say the case was rewritten in place and its re-observation is owed to ATDD; the
case was not rewritten.

- **Equivalence partitions** — the held entries and the two new entries are the members the case is
  meant to hold. None is asserted.
- **Normal path** — the expected state does not hold in the shipped file, and the case cannot tell.
  This is an implementation gap: `/qfai-implement` owes the two entries, and the case owes the
  membership check `TC-0001-0015` describes.
- **Oracle strength** — `/evidence|exception|allow/i` matches the file with or without the
  whitelist.

### TC-0001-0017 — skill order within each plan (6 cells)

The case matches `/依存関係|dependency/i` in spec-0001's `01_Spec.md`. No case reads
`process/workflows/*.yml`. The row's `Notes` say the re-observation is owed to ATDD; it was not done.

- **Equivalence partitions** — the five plans are the partitions; none is read.
- **Normal path** — no case checks that a stage never depends on a stage whose skill comes later in
  the order, or that no stage names `qfai-run`.
- **Edge cases** — a plan naming only some of the ordered skills (`direct.yml`), and a plan with or
  without the optional prototyping stage, are untested.
- **State transitions** — each plan's `after` graph is the stage progression the rule orders. No
  transition is read.
- **Combinatorial** — five plans against the ordered skill set; nothing crossed.
- **Oracle strength** — moving the verify stage ahead of the ATDD stage in `bugfix.yml` leaves the
  case green. Cycles and unknown kinds are `spec-0018`'s load refusals, as the row's `Notes` say, and
  are not counted here.

### TC-0001-0018 — deprecated TDD skills (3 cells)

The shipped tree holds no catalog entry for `tdd-red`, `tdd-green` or `tdd-refactor`; the skills were
removed, and `qfai-implement` took over their work. `BR-0001-0022` names `qfai-atdd` as the migration
target. Drift; route to `/qfai-sdd` to restate or retire the rule.

- **Equivalence partitions** — the three skills are unread.
- **Normal path** — the expected entries do not exist, and the case matches `Skill` in `01_Spec.md`.
- **Oracle strength** — no production change can make `/Skill|オーケストレーション|deprecated/i` fail
  on `01_Spec.md`.

### TC-0001-0019 — seven canonical stages (4 cells)

No shipped file states the seven stages. Drift, or a statement that was never carried into the
shipped tree; route to `/qfai-sdd`.

- **Equivalence partitions** — the seven stages, mandatory Stage 0 and optional Stage 4, are unread.
- **Normal path** — the case matches `/Canonical Workflow|Governance/i` in spec-0001's own
  `01_Spec.md`.
- **State transitions** — the stages run in order; no transition is asserted.
- **Oracle strength** — the pattern reads the spec, not the product; no product change can fail it.

### TC-0001-0020 — ten non-negotiable articles (3 cells)

The shipped constitution has eleven articles and no non-negotiable statement. Drift; route to
`/qfai-sdd`. `TC-0001-0032`'s `Notes` rely on this row to hold "no article gains an exception", so
that clause of `AC-0001-0018` is held by nothing either.

- **Equivalence partitions** — articles I to X, one member each, are unread.
- **Normal path** — the count and the non-negotiable statement are neither asserted nor true.
- **Oracle strength** — `/Article/` matches any constitution with at least one article.

### TC-0001-0021 — discussion stage artifacts (2 cells)

- **Normal path** — the case reads `01_Spec.md` for the word `discussion`. The expected statement,
  discussion pack in and REQ/NFR seeds out, is in `04_Business-Rules.md` (`BR-0001-0008`), not in the
  file the case reads.
- **Oracle strength** — `discussion` occurs in `01_Spec.md` for unrelated reasons (discussion pack
  IDs, scope lines), so removing the statement changes nothing.

### TC-0001-0022 — specs stage artifacts (1 cell)

- **Oracle strength** — the five substrings `US`, `AC`, `BR`, `EX`, `TC` occur in `01_Spec.md` in the
  ID-format line, the entry-points line and elsewhere. Deleting the statement of the specs stage
  leaves the case green.

### The ❌ cells of the business rule table (17)

- **BR-0001-0001, Positive case** — drift, as `TC-0001-0001`: the rule's nine files and optional
  `10_Plan.md` contradict the code.
- **BR-0001-0001, Conditional branches** — the rule has a branch, a pack without `10_Plan.md`, which
  it calls valid. The code reports it missing, and no case supplies it. Drift.
- **BR-0001-0002, Positive case** — drift, as `TC-0001-0002`: eleven files, not ten.
- **BR-0001-0002, Negative case** — no case supplies a missing `_policies` file.
- **BR-0001-0004, Conditional branches** — any one of four markers makes v1421. Only the case with
  all four present runs.
- **BR-0001-0005, Positive case** — no case runs the priority order.
- **BR-0001-0005, Conditional branches** — five layouts in priority; no branch is exercised beyond
  v1421.
- **BR-0001-0008, Positive case** — `TC-0001-0021` asserts only a topic word, in a file that does not
  hold the statement.
- **BR-0001-0014, Positive case** — the rule is violated in the tree.
- **BR-0001-0014, Negative case** — the observed violation is a kept failure with no case and no
  check.
- **BR-0001-0018, Positive case** — `TC-0001-0014` asserts none of the five steps.
- **BR-0001-0019, Positive case** — the two added exceptions are absent from the shipped whitelist.
- **BR-0001-0019, Conditional branches** — a spec-unchanged bugfix, a missing-test row appended after
  diagnosis, and every other change are three branches; none is tested.
- **BR-0001-0021, Positive case** — no case reads the plans.
- **BR-0001-0021, Conditional branches** — prototyping is optional, so a plan with and without it
  are two branches; neither is read.
- **BR-0001-0022, Positive case** — drift: the entries do not exist and the named migration target
  is not the one that replaced the skills.
- **BR-0001-0024, Positive case** — drift: eleven articles, no non-negotiable statement.

## Every ⚠️ cell, named

50 in all: 36 in the matrix and 14 in the business rule table.

### Matrix (36)

- **TC-0001-0001, Equivalence partitions** — the complete set and the set missing one file are both
  supplied by `specLayoutCaseExact.test.ts`. The partition the spec calls valid, a set without
  `10_Plan.md`, is not, and the code would reject it.
- **TC-0001-0001, Special values** — mis-cased names and dangling or real symlinks are supplied; an
  empty required file is not.
- **TC-0001-0001, Oracle strength** — the annotated case matches `v1421` in the constant's own name
  and cannot fail. The parity test fails if the constant changes without the catalog, and the
  case-exact test fails if a name is added that the seed lacks.
- **TC-0001-0002, Equivalence partitions** — only the complete registry is represented, through the
  parity comparison; no incomplete `_policies` set is supplied.
- **TC-0001-0002, Oracle strength** — the annotated case (`/SHARED.*V1421|policies/i`) cannot fail;
  the parity test fails on a one-sided change to the constant.
- **TC-0001-0003, Equivalence partitions** — the all-markers partition is supplied; the four
  single-marker partitions are not.
- **TC-0001-0003, Normal path** — `specLayoutCaseExact.test.ts` asserts `layout: "layered"` and no
  missing files for a full v1421 seed. `layeredStyle: "v1421"` is never asserted; it holds only
  because a v1417 verdict would load another required set and report files missing.
- **TC-0001-0003, Oracle strength** — forcing v1417 when markers are present fails "reports nothing
  missing" through that indirect route. The annotated case cannot fail.
- **TC-0001-0005, Normal path** — `idFormatScanning.test.ts` accepts canonical IDs. No case scans
  spec-0001's own pack, which is what the row names; `qfai validate` does, but outside a test.
- **TC-0001-0005, Error path** — malformed digit counts and a cross-spec duplicate
  (`specScopeValidate.test.ts`, `QFAI-ID-001`) are reported. An ID whose number part names a
  different spec than its directory, which `BR-0001-0006` also forbids, is not supplied.
- **TC-0001-0005, Combinatorial** — the cases cross format with the `US`, `AC` and `CAP` kinds; `BR`,
  `EX` and `TC` are not crossed with the malformed shapes.
- **TC-0001-0005, Oracle strength** — the annotated case matches placeholders in `01_Spec.md` and
  cannot fail; the scanning cases assert exact output with `toEqual` and fail on a changed pattern.
- **TC-0001-0006, Oracle strength** — the pattern pins the five words in order but matches two lines
  of `01_Spec.md`, so deleting the chain from the scope line leaves it green.
- **TC-0001-0007, Normal path** — `layerCoverage.test.ts` accepts a fully linked v1421 fixture. No
  case runs the check over spec-0001's own pack, which is what the row names.
- **TC-0001-0007, Oracle strength** — removing the `QFAI-COV-201` push in `layerCoverage.ts` fails
  "emits coverage errors when AC/BR/EX links are missing". The annotated case, `/AC|TC|…/i` over the
  validator source, cannot fail.
- **TC-0001-0008, Normal path** — as `TC-0001-0007`, for BR → EX.
- **TC-0001-0008, Oracle strength** — as `TC-0001-0007`, for `QFAI-COV-202`.
- **TC-0001-0009, Normal path** — as `TC-0001-0007`, for EX → TC.
- **TC-0001-0009, Oracle strength** — as `TC-0001-0007`, for `QFAI-COV-203`.
- **TC-0001-0011, Equivalence partitions** — the upward references are of three kinds, CAP, NFR and
  `_policies`; only the `_policies` permission text is matched.
- **TC-0001-0011, Normal path** — the case asserts the permission text, not that the references
  exist. They do exist in `01_Spec.md`.
- **TC-0001-0011, Oracle strength** — deleting the NFR list leaves the case green; deleting the
  permission text fails it.
- **TC-0001-0012, Equivalence partitions** — three of the four triggers are asserted; `Trade-off` is
  not.
- **TC-0001-0012, Normal path** — the three words are matched anywhere in the file, not in
  `### When to Escalate`, and only in spec-0001's `01_Spec.md` while the row names any spec's.
- **TC-0001-0012, Oracle strength** — deleting the `Trade-off` line leaves the case green.
- **TC-0001-0013, Normal path** — the case reads the right file and names the topic, but asserts
  nothing of the prohibition.
- **TC-0001-0016, Equivalence partitions** — of the two added skills, `qfai-maintain` is covered and
  `qfai-run` is not.
- **TC-0001-0016, Normal path** — `qfai-maintain/SKILL.md` existence is asserted by the cases for
  `TC-0001-0028` and `TC-0001-0031`, which loop over it. No spec-0001 case asserts
  `qfai-run/SKILL.md`. The row's own case matches `Skill` in `01_Spec.md`.
- **TC-0001-0016, Oracle strength** — deleting `qfai-maintain/SKILL.md` fails those two cases;
  deleting `qfai-run/SKILL.md` fails none.
- **TC-0001-0022, Equivalence partitions** — the five output kinds are each matched as a substring;
  the input side, `_policies/` and `spec-XXXX/`, is not.
- **TC-0001-0022, Normal path** — the kinds are matched, not the statement that the specs stage
  produces them.
- **TC-0001-0023, Equivalence partitions** — the row names every spec's `01_Spec.md`; one spec is
  read.
- **TC-0001-0023, Normal path** — `Parent: CAP-0001` is asserted for spec-0001 only. The other specs
  carry the line today, but no case reads them.
- **TC-0001-0023, Oracle strength** — changing spec-0001's `Parent` line fails the case; removing it
  from any other spec does not.
- **TC-0001-0026, Edge cases** — `EX-0001-0026` adds two edges the case does not assert: the worker
  says nothing to the operator, and under `shadow` the skill behaves as when invoked by name.
- **TC-0001-0031, Equivalence partitions** — `EX-0001-0031` includes the out-of-scope partition, a
  skill no plan names (`qfai-grill`). The case reads only the seven plan skills.

### Business rule table (14)

- **BR-0001-0003, Positive case** — one CAP-to-spec pair is checked; the rule is about every pair.
- **BR-0001-0004, Positive case** — detection with all markers present is observed only indirectly
  (see `TC-0001-0003`).
- **BR-0001-0006, Positive case** — canonical IDs are accepted by the scanner; spec-0001's own IDs
  are not scanned by a test.
- **BR-0001-0006, Negative case** — malformed and duplicated IDs are reported; an ID naming the wrong
  spec is not supplied.
- **BR-0001-0009, Positive case** — the output kinds are matched as substrings only.
- **BR-0001-0013, Positive case** — one spec is read, while the rule covers every `01_Spec.md`.
- **BR-0001-0015, Positive case** — permission text asserted; CAP and NFR references not.
- **BR-0001-0016, Positive case** — three of four triggers.
- **BR-0001-0017, Positive case** — topic word only.
- **BR-0001-0020, Positive case** — `qfai-maintain` covered, `qfai-run` not.
- **BR-0001-0023, Positive case** — the Stage 0 reuse half is fully asserted by `TC-0001-0025`; the
  seven-stages half has no shipped statement (`TC-0001-0019`).
- **BR-0001-0023, Conditional branches** — equal key, changed key and outside a run are all asserted;
  Stage 4 present and absent are not.
- **BR-0001-0029, Conditional branches** — the in-scope branch (a skill a plan names) is asserted;
  the out-of-scope branch is not read.
- **BR-0001-0030, Positive case** — both statements are asserted. The rule's "except no article" is
  delegated to `TC-0001-0020`, which holds nothing (see its row).

## What the ✅ rows rest on

The mutation that makes each fully covered row fail:

| Row | Production mutation that fails the case                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `TC-0001-0024` | Change `Parent: CAP-0001` in spec-0001's `01_Spec.md`; `CAP-0001` occurs only on that line             |
| `TC-0001-0025` | Delete "only when the key recorded with it, recomputed, is equal" from `## Stage 0` of the baseline    |
| `TC-0001-0027` | Delete "return the refusal to the harness" from the `error` row of the entry check                     |
| `TC-0001-0028` | Put any sentence before "Use when" in one plan skill's `description:`; or raise the 1024 limit in `assistantAssets.ts` |
| `TC-0001-0029` | Delete "start no other stage" from the `by-name` row                                                   |
| `TC-0001-0030` | Add a second line citing `references/orchestrated-mode.md` to one plan skill's `SKILL.md`              |
| `TC-0001-0032` | Delete "binds the stage to its target" from the shared baselines                                       |

`TC-0001-0026` is `⚠️` only for its edge cell; its oracle fails when "in the same turn" is deleted from
the `pass-on` row. `TC-0001-0031`'s oracle fails when `disable-model-invocation: true` is added to
`qfai-sdd/SKILL.md`.

These rows verify shipped text. Whether an agent behaves as the text says is the E2E layer's, owed by
the story rows above.

## Findings

1. **Drift: required spec files.** `BR-0001-0001`, `AC-0001-0001`, `EX-0001-0001` and `TC-0001-0001`
   say nine files with `10_Plan.md` optional; the code and the shipped catalog require ten. Route to
   `/qfai-sdd`.
2. **Drift: required `_policies` files.** `BR-0001-0002` and its chain say ten; the code requires
   eleven, `11_Slice-Policy.md` included. Route to `/qfai-sdd`.
3. **Observed violation: upward references.** `_policies` files cite spec IDs, against
   `BR-0001-0014`, and no check enforces the rule. Route to `/qfai-sdd` to qualify the rule or add a
   check.
4. **Implementation gap: drift-protocol whitelist.** The two exceptions `BR-0001-0019` adds are not in
   the shipped `drift-protocol.md`. `TDD-0015` sits at `exception` with evidence from 2026-04-14,
   before the rule changed.
5. **Drift: deprecated TDD skills.** The shipped tree has no catalog entry for them, and the skill
   that replaced them is `qfai-implement`, not the `qfai-atdd` `BR-0001-0022` names. Route to
   `/qfai-sdd`.
6. **Drift: canonical workflow stages.** No shipped file states the seven stages `BR-0001-0023` and
   `AC-0001-0012` describe; only Stage 0 exists. Route to `/qfai-sdd`.
7. **Drift: constitution articles.** Eleven articles ship, not ten, and none is stated as
   non-negotiable. `TC-0001-0032` hands "no article gains an exception" to `TC-0001-0020`, which
   cannot hold it. Route to `/qfai-sdd`.
8. **Twenty-four cases that cannot fail on their obligation.** `specPackSpec0001.test.ts` answers for
   `TC-0001-0001` … `-0024` with one pattern each, mostly over spec-0001's own `01_Spec.md`.
   `TC-0001-0015`, `-0016` and `-0017` say their re-observation is owed to ATDD; none was rewritten.
9. **The behavioural tests carry no annotation.** `specLayoutCaseExact`, `specRequiredFilesParity`,
   `layerCoverage`, `idFormatScanning`, `specScopeValidate` and `skillRegistrationContract` hold the
   only real evidence for `TC-0001-0001` … `-0009` and `BR-0001-0026`'s limits, and none names a
   spec-0001 test case. Traceability points at the weak file.
10. **v1417 detection and layout priority are untested.** No test in the package asserts
    `layeredStyle`, so `TC-0001-0004` and `BR-0001-0005` have no behavioural case.
11. **No story has an E2E test.** All ten E2E rows are `todo`. `US-0001-0010` says its row is blocked
    by `spec-0018`, but `TDD-0042` carries `-` in `Blocked-By`.
12. **`Type` lives in `Notes`.** `TC-0001-0027` writes "Type: error" in `Notes`; `06_Test-Cases.md`
    has no `Type` column, so the row declares no type and owes a normal path, scored on its own
    direction.
13. **An annotation the spec promises is missing.** `TC-0001-0031`'s `Notes` say its test also
    carries `spec-0018`'s adapter assertion; the test carries only the spec-0001 annotation.
14. **Clauses left to review by design.** `AC-0001-0014`'s "does not summarize the pipeline" and
    `AC-0001-0016`'s "no other orchestrated-mode text" have no test; their test cases' `Notes` assign
    them to review. They are not scored as gaps because the test cases' `Expected` cells exclude them.
15. **Generic rows read one spec.** `TC-0001-0012` and `TC-0001-0023` name any spec's `01_Spec.md`
    and read spec-0001's only.
16. **`BR-0001-0013` has no enforcing check.** Every `01_Spec.md` complies today; nothing reports one
    that does not.

## Follow-up this matrix does not discharge

- A Change Request through `/qfai-sdd` for findings 1, 2, 3, 5, 6 and 7. Until one is approved the
  `❌` cells they carry stay, justified by the drift.
- The two whitelist entries of finding 4, through `/qfai-implement`, with `TC-0001-0015` rewritten
  to hold the membership its `Steps` describe.
- Rewriting the `TC-0001-0001` … `-0024` cases to assert their `Expected` cells, or moving their
  annotations onto the behavioural tests listed in finding 9.
- E2E tests for the ten stories.
