# Coverage Depth Matrix — spec-0003

## Scope

Produced by `test-design-analyst` in the `coverage` phase of the `/qfai-atdd` run started
`2026-09-23T19:33:24.738Z`, over the working tree of branch `claude/qfai-steering-discussion-69d8a9`.
The subject is `qfai init` no longer seeding or touching the work-log surface `.qfai/steering/`
(`09_delta.md` `## Triage (2026-09-23)`).

**Matrix rows.** The three test cases this run writes acceptance tests for: `TC-0003-0059`,
`TC-0003-0060` and `TC-0003-0061`, carried by the ledger rows `TDD-0092` … `TDD-0097`. All three
declare `Level` `integration` and route to `packages/qfai/tests/integration/**`.

**Not scored in this run.** The 27 user stories and the other 43 integration-routed test cases of
this pack predate the change, and the change neither adds nor removes a case for them.
`US-0003-0016` was narrowed by the change, but its row `TDD-0064` was not reset. They are listed
under "Obligations not scored". Whether they belong in this run's matrix is an open preflight
decision.

**Business rule table.** Every active `BR-0003-*` of the Rule Table in `04_Business-Rules.md` owns a
row: 49 rules, `BR-0003-0001` … `BR-0003-0050` less `BR-0003-0016`, which this change removed.

No `CON-API-*` or `CON-DB-*` contract exists in this repository, and no file of this pack binds one.
`CLI-INIT`, `CLI-WFSET` and the other CLI contracts owe no `QFAI-ATDD-113` / `-115` coverage.

## How the cells are scored

- **Matrix rows (planned).** No acceptance test for these rows exists yet. A cell is ✅ when the
  test case design declares a case for the category and a seeded ledger row carries it. The row
  notes name the assertion the `red` phase writes. The completion review re-reads the cells against
  the written tests.
- **Oracle strength** is ⚠️ on every planned row: each names its mutation, and no run has shown it
  yet.
- **`n/a`** is used only where the category's obligation is absent for the row.
- **Business rule rows this change does not touch ("carried")** are scored from
  `06_Test-Cases.md` and the ledger, not from a test run:
  - Positive ✅: a covering case has a `done` row.
  - Positive ⚠️: the covering rows are `exception` or `blocked`, so a test file exists but the row
    is open or never recorded a RED/GREEN.
  - Positive ❌: no covering case has a test file.
  - Negative is scored only where the rule names a failure.
  - Conditional ⚠️: the rule has branches and the design has a case for only some of them.

`Covering TC` is derived from `06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status  |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------- |
| TC-0003-0059 | ✅                     | ✅          | n/a        | ⚠️         | n/a             | n/a            | n/a               | n/a           | ⚠️              | planned |
| TC-0003-0060 | ✅                     | n/a         | n/a        | ⚠️         | n/a             | n/a            | n/a               | ✅            | ⚠️              | planned |
| TC-0003-0061 | ✅                     | n/a         | ✅         | ✅         | ✅              | n/a            | n/a               | ⚠️            | ⚠️              | planned |

Totals across the nine scored columns, 27 cells: **✅ 8 / ⚠️ 6 / ❌ 0**, `n/a` 13.

### Row notes

**TC-0003-0059 (`TDD-0092`, `TDD-0093`).** `runInit` in an empty temp directory.

- `TDD-0092` (`no-steering-path`). Planned assertions:
  - `.qfai/steering` does not exist, asserted by an `lstat` that must fail with `ENOENT`, not by an
    empty glob;
  - no report line names a path with a `.qfai/steering/` segment.

  The matcher must not match `.qfai/assistant/steering/`, which the legacy-migration lines still
  print.
- `TDD-0093` (`no-worklog-instructions-line`): the generated `.github/copilot-instructions.md`
  names neither `.qfai/steering/` nor `worklog-entry.schema.md`, and has no "work-log" line.
- Error path `n/a`: `BR-0003-0049` declares no failure.
- Oracle mutations:
  - `TDD-0092`: restore the `seedProjectSteering` call in `cli/commands/init.ts`.
  - `TDD-0093`: restore the "AI work-log surface" line in the instructions builder of the same
    file.

**TC-0003-0060 (`TDD-0094`, `TDD-0095`).** `Type: edge`, so Normal path is `n/a` and
`TC-0003-0059` carries it.

- Fixture: an initialised temp directory whose `.qfai/steering/` holds an edited `README.md` and one
  adopter entry, with no `.gitkeep` and no `_templates/entry.md`. The fixture builds exactly this
  set whatever `init` seeded (`EX-0003-0053`).
- Planned assertions: after the run, the recursive path set and every SHA-256 equal the pre-run
  values. The pre-run set has two files, so the comparison is not over an empty set.
- Combinatorial: plain run (`TDD-0094`) and `--force` run (`TDD-0095`).
- Oracle mutation: restore `seedProjectSteering`, which writes the two missing files.

**TC-0003-0061 (`TDD-0096`, `TDD-0097`).** `Type: edge`.

- Error path: the refusal to delete an edited copy is the data-loss floor of
  `.agents/rules/minimal-implementation.md` § 2. `TDD-0097` covers it.
- Boundary values: the recorded hash matching (`TDD-0096`) against not matching (`TDD-0097`).
- Planned assertions:
  - `TDD-0096`: the file is gone, and the re-read lock has other keys but none for
    `catalog/worklog-entry.schema.md`.
  - `TDD-0097`: the bytes equal the edited content, and the report carries the withdrawn-asset note
    "is no longer shipped by this release, but its content has been edited, so it was not removed".
    The generic diverged-file note does not match.
- Oracle mutations:
  - `TDD-0096`: skip `retireVerifiedGovernedAsset` in `retireWithdrawnGovernedAssets`.
  - `TDD-0097`: drop the `currentHash !== previousHash` guard in the same function.

## Business rule coverage

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                                | Status  |
| ------------ | ------------- | ------------- | -------------------- | ---------------------------------------------------------- | ------- |
| BR-0003-0001 | ⚠️            | n/a           | n/a                  | TC-0003-0001, TC-0003-0002                                 | carried |
| BR-0003-0002 | ⚠️            | n/a           | n/a                  | TC-0003-0003                                               | carried |
| BR-0003-0003 | ⚠️            | n/a           | n/a                  | TC-0003-0004                                               | carried |
| BR-0003-0004 | ⚠️            | n/a           | n/a                  | TC-0003-0005                                               | carried |
| BR-0003-0005 | ❌            | n/a           | n/a                  | TC-0003-0016                                               | carried |
| BR-0003-0006 | ⚠️            | n/a           | n/a                  | TC-0003-0006                                               | carried |
| BR-0003-0007 | ❌            | n/a           | ❌                   | TC-0003-0017                                               | carried |
| BR-0003-0008 | ⚠️            | ⚠️            | n/a                  | TC-0003-0010                                               | carried |
| BR-0003-0009 | ⚠️            | ⚠️            | ⚠️                   | TC-0003-0011, TC-0003-0012, TC-0003-0013                   | carried |
| BR-0003-0010 | ⚠️            | n/a           | ⚠️                   | TC-0003-0014                                               | carried |
| BR-0003-0011 | ⚠️            | n/a           | n/a                  | TC-0003-0007, TC-0003-0008                                 | carried |
| BR-0003-0012 | ⚠️            | n/a           | ⚠️                   | TC-0003-0015                                               | carried |
| BR-0003-0013 | ✅            | n/a           | n/a                  | TC-0003-0018, TC-0003-0020                                 | carried |
| BR-0003-0014 | ✅            | n/a           | ⚠️                   | TC-0003-0019                                               | carried |
| BR-0003-0015 | ✅            | n/a           | n/a                  | TC-0003-0021                                               | carried |
| BR-0003-0017 | ✅            | n/a           | n/a                  | TC-0003-0023                                               | carried |
| BR-0003-0018 | ✅            | n/a           | n/a                  | TC-0003-0024                                               | carried |
| BR-0003-0019 | ✅            | n/a           | n/a                  | TC-0003-0025                                               | carried |
| BR-0003-0020 | ✅            | n/a           | n/a                  | TC-0003-0026                                               | carried |
| BR-0003-0021 | ✅            | n/a           | ⚠️                   | TC-0003-0027                                               | carried |
| BR-0003-0022 | ✅            | ✅            | ⚠️                   | TC-0003-0028                                               | carried |
| BR-0003-0023 | ✅            | n/a           | ⚠️                   | TC-0003-0029                                               | carried |
| BR-0003-0024 | ✅            | ⚠️            | n/a                  | TC-0003-0030                                               | carried |
| BR-0003-0025 | ✅            | n/a           | n/a                  | TC-0003-0031                                               | carried |
| BR-0003-0026 | ⚠️            | ⚠️            | n/a                  | TC-0003-0032                                               | carried |
| BR-0003-0027 | ✅            | ✅            | n/a                  | TC-0003-0033                                               | carried |
| BR-0003-0028 | ✅            | ✅            | n/a                  | TC-0003-0034                                               | carried |
| BR-0003-0029 | ✅            | n/a           | n/a                  | TC-0003-0035                                               | carried |
| BR-0003-0030 | ✅            | n/a           | ⚠️                   | TC-0003-0036                                               | carried |
| BR-0003-0031 | ✅            | n/a           | ✅                   | TC-0003-0037                                               | carried |
| BR-0003-0032 | ✅            | n/a           | n/a                  | TC-0003-0038                                               | carried |
| BR-0003-0033 | ✅            | ✅            | ✅                   | TC-0003-0039                                               | carried |
| BR-0003-0034 | ✅            | n/a           | n/a                  | TC-0003-0040                                               | carried |
| BR-0003-0035 | ✅            | ✅            | n/a                  | TC-0003-0041                                               | carried |
| BR-0003-0036 | ✅            | n/a           | n/a                  | TC-0003-0042                                               | carried |
| BR-0003-0037 | ✅            | n/a           | ✅                   | TC-0003-0043, TC-0003-0053                                 | carried |
| BR-0003-0038 | ✅            | ✅            | n/a                  | TC-0003-0044                                               | carried |
| BR-0003-0039 | ✅            | n/a           | n/a                  | TC-0003-0045                                               | carried |
| BR-0003-0040 | ✅            | ✅            | ✅                   | TC-0003-0046                                               | carried |
| BR-0003-0041 | ✅            | n/a           | ✅                   | TC-0003-0047                                               | carried |
| BR-0003-0042 | ✅            | n/a           | n/a                  | TC-0003-0048                                               | carried |
| BR-0003-0043 | ✅            | ✅            | n/a                  | TC-0003-0049                                               | carried |
| BR-0003-0044 | ✅            | n/a           | n/a                  | TC-0003-0050                                               | carried |
| BR-0003-0045 | ✅            | n/a           | n/a                  | TC-0003-0051, TC-0003-0054                                 | carried |
| BR-0003-0046 | ✅            | n/a           | n/a                  | TC-0003-0052                                               | carried |
| BR-0003-0047 | ⚠️            | n/a           | ⚠️                   | TC-0003-0056, TC-0003-0057                                 | carried |
| BR-0003-0048 | ⚠️            | ⚠️            | ⚠️                   | TC-0003-0058                                               | carried |
| BR-0003-0049 | ✅            | n/a           | ✅                   | TC-0003-0059 (TDD-0092, -0093), TC-0003-0060 (TDD-0094, -0095) | planned |
| BR-0003-0050 | ✅            | ✅            | ⚠️                   | TC-0003-0061 (TDD-0096, TDD-0097)                          | planned |

Totals across the three scored columns, 147 cells: **✅ 49 / ⚠️ 29 / ❌ 3**, `n/a` 66.

Rules this change touches:

- `BR-0003-0049`, planned:
  - Positive: `TDD-0092` … `TDD-0095`.
  - Negative `n/a`: the rule names no failure.
  - Conditional: with and without `--force` (`TDD-0094`, `TDD-0095`), and an empty against a
    populated directory (`TDD-0092`, `TDD-0094`).
- `BR-0003-0050`, planned:
  - Positive: `TDD-0096`.
  - Negative: `TDD-0097`, the edited copy kept, which is a data-loss floor case.

## Every ❌ cell, named

Three cells, all in carried rows. This change neither created them nor can close them: it adds no
case outside its own rules (Article VII of `.qfai/assistant/constitution/constitution.md`). No
`DR-*` or `CR-*` carries them yet. The completion review decides whether carried rows gate this run.

| Cell                                   | Why it is uncovered                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `BR-0003-0005` Positive case           | The only covering case, `TC-0003-0016`, is row `TDD-0016` at `exception` with no test file (`—`)           |
| `BR-0003-0007` Positive case           | The only covering case, `TC-0003-0017`, is row `TDD-0017` at `exception` with no test file (`—`)           |
| `BR-0003-0007` Conditional branches    | Neither branch of "inside a Git repository / outside it" has a case with a test                             |

## Every ⚠️ cell, named

### Matrix (6)

- `TC-0003-0059` Edge cases: the design runs a plain `init` in an empty directory only. The
  `--force` regeneration of the instructions file is not exercised. The same builder writes both,
  so the gap is partial.
- `TC-0003-0060` Edge cases: the design compares bytes and path sets and does not assert the report.
  Under the current code a populated directory with an edited `README.md` is exactly where the
  report names `.qfai/steering/` paths, in the create-only drift note. `BR-0003-0049` asks for no
  such name. Only `TC-0003-0059`, in an empty directory, asserts the report (Finding 2).
- `TC-0003-0061` Combinatorial: only the `--force` branch is exercised for the withdrawn schema. A
  plain run, which must keep the file and its record, has no case.
- Oracle strength on all three rows: the mutations are named in the row notes and not yet shown to
  fail the tests.

### Business rule table (29)

- Positive ⚠️:
  - `BR-0003-0001` … `-0004`, `-0006`, `-0008` … `-0012`: the covering rows `TDD-0001` … `TDD-0015`
    are `exception` (`one-shot GREEN 2026-04-14`). Several of their tests match the text of
    `init.ts` rather than running `init`, for example the `TC-0003-0011` … `-0013` cases in
    `initSpec0003.test.ts`.
  - `BR-0003-0026`: `TDD-0032` is `todo`.
  - `BR-0003-0047`, `BR-0003-0048`: `TDD-0058` … `TDD-0063` are `blocked`.
- Negative ⚠️:
  - `BR-0003-0008`: `TDD-0010` is a `unit`, `exception` row.
  - `BR-0003-0009`: the refusal to overwrite an entry that resolves outside the project is asserted
    only as a source-text match (`TC-0003-0013`). This is a security floor cell (Finding 1).
  - `BR-0003-0024`: floating-tag rejection is carried by `TC-0003-0032`, which is `todo`.
  - `BR-0003-0026`: `TDD-0032` is `todo`.
  - `BR-0003-0048`: the covering rows are `blocked`.
- Conditional ⚠️:
  - `BR-0003-0009`, `-0010`, `-0012`, `-0014`, `-0021`, `-0022`, `-0023`, `-0030`: the rule
    branches, and the design has a case for only some branches.
  - `BR-0003-0047`, `-0048`: the covering rows are `blocked`.
  - `BR-0003-0050`: the plain-run branch has no case, as in the matrix above.

## Obligations not scored in this run

| Obligation                                   | Ledger rows                                   | State                                                     |
| -------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| 27 user stories, US-0003-0001 … US-0003-0028 | TDD-0064 … TDD-0091                           | `todo`, E2E; most are carrier-only                        |
| TC-0003-0001 … -0017                         | TDD-0001 … TDD-0017                           | `exception`                                               |
| TC-0003-0018 … -0054 (integration-routed)    | TDD-0018 … TDD-0056                           | `done`, except `TDD-0028`, `TDD-0032`, `TDD-0056` `todo`  |
| TC-0003-0055                                 | TDD-0057                                      | `green`                                                   |
| TC-0003-0056 … -0058                         | TDD-0058 … TDD-0063                           | `blocked`                                                 |

## Findings

1. **A security floor cell is ⚠️.** Per the checklist, a safety-floor cell that is not ✅ is a
   REVISE whatever its rationale. The cell is carried, `BR-0003-0009`'s negative case. Behavioural
   escape-refusal tests do exist in `tests/cli/init.test.ts` for other entries (around lines 207
   and 1986), but none is bound to this rule. This predates the change and is raised for the
   preflight decision on carried rows.
2. **`TC-0003-0060` does not assert the report of a populated directory.** `BR-0003-0049` says init
   names no `.qfai/steering/` path in its report. The case most likely to break that rule is a
   populated directory, and its test compares bytes only. Adding the assertion would widen the
   declared boundaries, so it is raised as an advisory for `/qfai-sdd`, not written here.
3. **No matrix existed for spec-0003 before this run.**

## Totals for the stage evidence

**✅ 57 / ⚠️ 35 / ❌ 3**, `n/a` 79, across 174 scored cells: 27 matrix cells and 147 business rule
cells.
