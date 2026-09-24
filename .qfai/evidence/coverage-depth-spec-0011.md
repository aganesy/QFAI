# Coverage Depth Matrix — spec-0011

## Scope

Produced by `test-design-analyst` in the `coverage` phase of the `/qfai-atdd` run started
`2026-09-23T19:33:24.738Z`, over the working tree of branch `claude/qfai-steering-discussion-69d8a9`.
The subject is the `/qfai-implement` skill naming the existing home of each record instead of a
work-log entry under `.qfai/steering/` (`09_delta.md` `## Triage (2026-09-23)`).

**Matrix row.** The one test case this run writes an acceptance test for, `TC-0011-0013`. It
declares `Level` `integration`, routes to `packages/qfai/tests/integration/**`, and is carried by
three ledger rows, one per boundary: `TDD-0021`, `TDD-0022` and `TDD-0023`.

**Not scored in this run.** The 8 user stories and `TC-0011-0001` … `TC-0011-0012` predate the
change, and the change neither adds nor removes a case for them. Those twelve test cases declare no
`Level`, so they route to `tests/integration/**` too. They are listed under "Obligations not
scored". Whether they belong in this run's matrix is an open preflight decision.

**Business rule table.** Every active `BR-0011-*` heading of `04_Business-Rules.md` owns a row: nine
rules, none carrying a retiring `Status:`.

No `CON-API-*` or `CON-DB-*` contract exists in this repository, and no file of this pack binds one.

## How the cells are scored

The rules are the ones stated in `coverage-depth-spec-0004.md` under "How the cells are scored":

- Rows are ✅ when the case and its ledger rows have passing tests.
- Oracle strength is ✅ when a run shows each named mutation failing the test.
- Carried business rule rows are scored from `06_Test-Cases.md` and the ledger.

In this pack every carried covering row is `exception` or `todo`:

- `exception` rows have a test in `implementSkillSpec0011.test.ts` or `completionContract.test.ts`,
  but no RED/GREEN recorded. They score ⚠️.
- `todo` rows with no test file (`—`) score ❌.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status  |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------- |
| TC-0011-0013 | ✅                     | ✅          | n/a        | ⚠️         | n/a             | n/a            | ✅                | n/a           | ✅              | done    |

Totals across the nine scored columns, 9 cells: **✅ 4 / ⚠️ 1 / ❌ 0**, `n/a` 4.

### Row notes

The subject is the shipped text under
`packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/`.

- Equivalence partitions: the three record kinds the rule routes, a stop, a decision, and a
  consultation or out-of-scope discovery.
- Normal path, `TDD-0021` (`record-homes-stated`): in `SKILL.md` and
  `references/execution-ledger.md`, one statement records a stop in `Blocked-By`, and one
  statement sends a decision, a consultation and an out-of-scope discovery to `/qfai-sdd` as a
  Change Request. Both are asserted inside the extracted bullet or paragraph, not as whole-file
  substrings.
- State transitions, `TDD-0022` (`resume-closes-no-record`): the `blocked -> todo` bullet of
  `references/execution-ledger.md` is extracted by its lead text. The test asserts that the bullet
  was found and is non-empty, then that it contains no `archived` and no instruction to close a
  record.
- `TDD-0023` (`no-surface-reference`): every file under the skill directory is read, and the test
  asserts the file count is above zero. No file may contain `.qfai/steering/` or
  `worklog-entry.schema.md`, and neither `SKILL.md` nor `references/execution-ledger.md` may contain
  "work-log entry".
- Error path `n/a`: `BR-0011-0009` names no failure.
- Oracle mutations, each applied to the shipped text:
  - `TDD-0021`: delete the out-of-scope discovery clause.
  - `TDD-0022`: re-insert "set its `status:` to `archived`".
  - `TDD-0023`: re-insert the `.qfai/steering/<id>.md` sentence.

## Business rule coverage

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                | Status  |
| ------------ | ------------- | ------------- | -------------------- | ------------------------------------------ | ------- |
| BR-0011-0001 | ⚠️            | n/a           | ⚠️                   | TC-0011-0005                               | carried |
| BR-0011-0002 | ⚠️            | ⚠️            | n/a                  | TC-0011-0001 … -0004, -0006, -0008         | carried |
| BR-0011-0003 | ⚠️            | ⚠️            | n/a                  | TC-0011-0001, -0003, -0006, -0008          | carried |
| BR-0011-0004 | ⚠️            | n/a           | n/a                  | TC-0011-0009                               | carried |
| BR-0011-0005 | ⚠️            | ⚠️            | n/a                  | TC-0011-0007                               | carried |
| BR-0011-0006 | ⚠️            | n/a           | n/a                  | TC-0011-0010                               | carried |
| BR-0011-0007 | ❌            | ❌            | n/a                  | TC-0011-0011                               | carried |
| BR-0011-0008 | ❌            | n/a           | n/a                  | TC-0011-0012                               | carried |
| BR-0011-0009 | ✅            | n/a           | n/a                  | TC-0011-0013 (TDD-0021, TDD-0022, TDD-0023) | done    |

Totals across the three scored columns, 27 cells: **✅ 1 / ⚠️ 10 / ❌ 3**, `n/a` 13.

`Covering TC` is derived from `06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`.

`BR-0011-0009` states three unconditional clauses, so its Conditional cell is `n/a`. A line of
`BR-0011-0005` begins "Status-only evidence …". It is rule text, not a retiring `Status:`, so the
rule is active.

## Every ❌ cell, named

Three cells, all in carried rows. This change neither created them nor can close them: it adds no
case outside its own rule (Article VII of `.qfai/assistant/constitution/constitution.md`). No
`DR-*` or `CR-*` carries them yet. The completion review decides whether carried rows gate this run.

| Cell                          | Why it is uncovered                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `BR-0011-0007` Positive case  | `TC-0011-0011` is row `TDD-0011` at `todo` with no test file (`—`). Only the carrier `tests/integration/qfai-traceability.md` names it |
| `BR-0011-0007` Negative case  | The rule's kept failure, the schema warning on the legacy handoff fields, has no case with a test                                     |
| `BR-0011-0008` Positive case  | `TC-0011-0012` is row `TDD-0012` at `todo` with no test file (`—`). Only the carrier names it                                         |

## Every ⚠️ cell, named

### Matrix (1)

- `TC-0011-0013` Edge cases: `AC-0011-0012` names `SKILL.md` and `references/**`. The positive
  record-home check (`TDD-0021`) reads `SKILL.md` and `references/execution-ledger.md` only. The
  absence check (`TDD-0023`) covers every file, so a stray instruction elsewhere to write an entry
  under `.qfai/steering/` is still caught. A reference that routes a record somewhere else without
  naming the surface is not.

### Business rule table (10)

- Positive ⚠️ on `BR-0011-0001` … `-0006`: every covering row (`TDD-0001` … `TDD-0010`) is
  `exception`. A test exists and asserts on the text of `SKILL.md`, but no RED/GREEN was recorded.
- Negative ⚠️ on `BR-0011-0002`, `-0003` and `-0005`: the kept failures are backward-transition
  rejection, production code written before a failing test, and rejected evidence. Each has a
  covering case only among those `exception` rows.
- Conditional ⚠️ on `BR-0011-0001`: the serial default and the parallel branch are asserted as text
  in one `exception` case.

## Obligations not scored in this run

| Obligation                   | Ledger rows         | State                                                           |
| ---------------------------- | ------------------- | --------------------------------------------------------------- |
| US-0011-0001 … US-0011-0008  | TDD-0013 … TDD-0020 | `todo`, E2E; 0001..0005 also referenced by a real E2E test      |
| TC-0011-0001 … TC-0011-0010  | TDD-0001 … TDD-0010 | `exception`                                                     |
| TC-0011-0011, TC-0011-0012   | TDD-0011, TDD-0012  | `todo`, no test file, carrier-only                              |

## Findings

1. **No matrix existed for spec-0011 before this run.** This one scores only the change's row.
2. **`TC-0011-0013` binds its three boundaries to one test case.** The rows follow the ledger (one
   per boundary), so the three selectors must live in separate `it` blocks. Otherwise the first
   failing assertion hides the other two REDs.

## Totals for the stage evidence

**✅ 5 / ⚠️ 11 / ❌ 3**, `n/a` 17, across 36 scored cells: 9 matrix cells and 27 business rule
cells.
