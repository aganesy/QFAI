# Change Request

- ID: `CR-20260924-0005`
- Title: `The out-of-project refusal of init --force has no test case`
- Raised by: `qfai-atdd`
- Raised at: `2026-09-24T01:16:59Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Identifier

This record was raised as `CR-20260924-0001`. The main branch gives that ID to
the record retiring two repository skills, so this one is `CR-20260924-0005`.
Records written before the change keep the old ID: commit messages, and the
audited `TDD-0068` and `TDD-0070` sections of `.qfai/evidence/atdd-spec-0004.md`,
whose evidence hashes an edit would break.

## Context

**The rule.** `BR-0003-0009` in `.qfai/specs/spec-0003/04_Business-Rules.md`
makes the instructions files create-only without `--force`, and has `--force`
regenerate them. Its last clause is a refusal: an existing entry that resolves
outside the project, for example through a symlinked ancestor directory, is not
overwritten even with `--force`. A write outside the project destroys a file
that belongs to someone else, so this is the data-loss floor of
`.agents/rules/minimal-implementation.md` § 2.

**What the pack traces from it.** The rule cites `AC-0003-0011`, `-0012` and
`-0013`. Its examples are `EX-0003-0009` (create), `EX-0003-0010` (skip without
`--force`) and `EX-0003-0011` (regenerate with `--force`). Its test cases are
`TC-0003-0011`, `-0012` and `-0013`, which verify those three outcomes. None of
the criteria, examples or test cases states the refusal. The clause has no
case in the pack.

**What the product does.** The refusal is implemented. In
`packages/qfai/src/cli/commands/init.ts`, the instructions loop computes
`escapesProject` from `resolvesOutsideProject` and skips the file with
"resolves outside the project (not overwritten, even with --force)". The case
`--force does not overwrite instructions reached through a symlinked ancestor`
in `packages/qfai/tests/cli/init.test.ts` (line 2509) exercises it. That case
carries no `QFAI:SPEC-0003:*` annotation, and it returns early and passes when
the host cannot create the symlink.

**What the matrix records.** `.qfai/evidence/coverage-depth-spec-0003.md`
credits a cell only to a case that runs and that an annotation binds to the
obligation. The unannotated case credits nothing, so the `BR-0003-0009` row
scores:

- `Negative case` ❌ (the Business rule coverage table, Group 6 and Finding 3);
- `Conditional branches` ⚠️, "the out-of-project branch is not credited".

The run's evidence and session S1 decision D13 describe the gap as a ⚠️ cell.
The matrix scores the Negative column ❌ and the Conditional column ⚠️. The rule
below treats both marks the same way.

**Why a written reason cannot close it.**
`.claude/skills/qfai-atdd/references/test-case-depth-checklist.md` says a cell
whose kept failures include a safety-floor failure "is ✅ or the row is a
REVISE". Neither ⚠️ with a rationale nor ❌ with a Decision Record discharges
it.

**Class.** Decided per `.qfai/assistant/constitution/drift-protocol.md#defect-or-new-scope-decide-this-first`:

- Not a defect in the deliverable. The product refuses, and a case shows it.
- Not reviewer-originated product scope. The finding traces to `BR-0003-0009`
  and to the checklist's safety-floor rule, not to `none`.
- What is new is a test-case obligation in the pack. Adding it edits
  `06_Test-Cases.md` and `05_Examples.md`, which are upstream SSOT, so it takes
  the Change Request path.
- Not defect drift in the pack either. No rule of the pack requires each clause
  of a business rule to have its own example, so no reproduction shows the pack
  contradicting itself. The obligation can be placed in more than one reasonable
  way, which makes the class `intent`.

**Why now.** The gap predates the change under way, which removes the
`.qfai/steering/` work-log surface. That change does not cause it and touches
none of the artifacts above. In the `/qfai-atdd` run started
`2026-09-23T19:33:24.738Z`, the user decided (S1 D13, through a structured
question) to raise this request, to leave the change unwidened, and to report
spec-0003's ATDD as not PASS on this cell until the request lands.

**Not discharged here.** Finding 3 of the matrix gives two other safety-floor
cells the same cause, and this request leaves both open:

- `US-0003-0012` × Error path. A story row cannot borrow a `TC-*` case, so it
  needs a case at the story's own layer.
- `TC-0003-0013` × Error path. Under the recommended option the refusal is owned
  by the new test case, and the next full recompute of the matrix rescores this
  cell against the restated pack.

## Proposed change

Give the refusal its own example and test case in spec-0003, so the
`BR-0003-0009` Negative and Conditional cells can be credited to an owned case
that runs. Option 2 below is recommended:

1. `05_Examples.md` gains one example with `BR-Ref` `BR-0003-0009`, at the next
   free `EX-0003-*` ID (`EX-0003-0055` today):
   - Given: `.github/instructions` is a symlink or junction to a directory
     outside the project that holds both instructions files.
   - When: `qfai init --force` runs.
   - Then: both files at the link target are byte-identical to their pre-run
     content.
2. `06_Test-Cases.md` gains one test case at the next free `TC-0003-*` ID
   (`TC-0003-0062` today). It has `Level` `integration`, `AC-Refs`
   `AC-0003-0013`, that example as `EX-Ref`, and `Type` `error`. Its section
   states Setup, Action and Verify for the example. Setup shows the ancestor
   link exists before init runs. The case either runs or reports itself
   skipped; it does not return early and pass.
3. `/qfai-sdd` Phase 2b seeds one `Integration` row on that test case at `todo`,
   at the next free `TDD-ID` (`TDD-0100` today). The row records this request in
   `DR-ID`, has `Test file` and `Selector` `-`, and has `Boundary`
   `force-refuses-overwrite-outside-project`.
4. `/qfai-atdd spec-0003` writes the acceptance test and hands the row over.
   Where the test lives, and whether the unannotated case at
   `packages/qfai/tests/cli/init.test.ts` line 2509 is reused, is that stage's
   decision. On Windows a directory junction needs no Developer Mode, which may
   let the case run on every host the suite uses.

No existing criterion, example, test case or ledger row changes.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                             | Cost                                                         | Risk                                                                                                                                                                                                                                                           | Recommended |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Add a new criterion (`AC-0003-0040`, a Gherkin scenario for the refusal) to `03_Acceptance-Criteria.md`, add it to `BR-0003-0009`'s `AC-Refs`, and add the example and test case of option 2 on it | One scenario, one `AC-Refs` cell, one example, one test case | The scenario restates a clause the rule already holds, and the edit reaches `03_Acceptance-Criteria.md` and `04_Business-Rules.md` for no coverage gain                                                                                                        |             |
| 2   | Add one example on `BR-0003-0009` and one test case on `AC-0003-0013` for the refusal, and seed one row. No criterion or rule changes                                                              | One example, one test case, one row                          | `AC-0003-0013`'s scenario states the regenerate outcome and not the refusal. The chain still closes, because `BR-0003-0009` decomposes that criterion and holds the clause                                                                                     | ✅          |
| 3   | Widen `TC-0003-0013` and `EX-0003-0011` with the refusal, with no new test case                                                                                                                    | Two cell edits and one Verify bullet                         | Changes the obligation of `spec-0003/TDD-0013`, an `exception` row under `DR-0003-0006`, so that row is reset. One test case then covers two opposite outcomes under one `Type`                                                                                |             |
| 4   | Change no spec. Annotate the existing case at `tests/cli/init.test.ts` line 2509 for `TC-0003-0013`                                                                                                | One annotation                                               | Credits a refusal to a test case whose declared Verify does not contain it, which the matrix's binding rule does not accept. The case still passes when no symlink can be made. It contradicts the user's decision to add a test case through a Change Request |             |

Option 2 adds the least beyond the gap. The rule already states the clause, so a
new criterion restates it (option 1), and a wider existing test case reopens a
row the gap does not concern (option 3).

## Blocked downstream items

| Item                             | Kind         | Why it depends on the artifact                                                                                                                                               |
| -------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| spec-0003 ATDD completion (PASS) | `spec`       | The `BR-0003-0009` Negative cell is a safety-floor cell and must be ✅ before `.qfai/evidence/atdd-spec-0003.md` can report PASS. Held on this cell until this request lands |
| `spec-0003/TDD-0013`             | `ledger-row` | Only under option 3, which changes the obligation its `TC-Refs` (`TC-0003-0013`) names                                                                                       |

- Not blocked by this CR:
  - `spec-0003/TDD-0094` … `TDD-0099`, the rows of the work-log surface removal.
    Their `TC-Refs` name `TC-0003-0059` … `-0061`, on `BR-0003-0049` and
    `BR-0003-0050`, and this request changes none of them.
  - `spec-0003/TDD-0011`, `TDD-0012` and `TDD-0013` under options 1, 2 and 4,
    whose test cases are unchanged.
  - The spec-0004, spec-0011 and spec-0013 rows of the same `/qfai-atdd` run.
- Overlapping open CRs: `CR-20260913-0014` is open and also appends examples,
  test cases and ledger rows to `.qfai/specs/spec-0003/`. Both only append, so
  neither assumes the other has landed. Whichever is applied second takes the
  next free IDs at its rerun, which is why the IDs above are marked "today".

## Impact scope

- Specs: `spec-0003`
- Plans: `none`
- Tests: one new acceptance test for the new test case, at the path
  `/qfai-atdd` selects under `packages/qfai/tests/integration/**`; one new ledger
  row (`TDD-0100` today)
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0003/05_Examples.md`,
  `.qfai/specs/spec-0003/06_Test-Cases.md`,
  `.qfai/specs/spec-0003/09_delta.md`,
  `.qfai/specs/spec-0003/tdd/test-list.md`

Option 1 also edits `.qfai/specs/spec-0003/03_Acceptance-Criteria.md` and
`.qfai/specs/spec-0003/04_Business-Rules.md`. The approval that chooses it
extends the list above with those two paths.

## Decision needed from user

Which option closes the `BR-0003-0009` negative cell: option 2 (recommended),
which adds one example and one test case for the out-of-project refusal and
seeds one row; option 1, which also adds a criterion; option 3, which widens
`TC-0003-0013`; or option 4, which only annotates the existing case?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003`, mode `re-derive`, limited to appending the example and
   test case of the approved option. It changes nothing else, and records this
   request as one row of `09_delta.md` `## Change Requests`. It mints no
   `DR-*`, so `07_Decisions.md` is not written.
2. Downstream ledger sweep:
   - Seed (Phase 2b), not a sweep: one `Integration` row on the new test case at
     `todo`, with this request in `DR-ID`.
   - Reset to `todo`: none under options 1, 2 and 4. Under option 3:
     `spec-0003/TDD-0013`.
   - Retire: none.
3. `/qfai-atdd spec-0003` writes the acceptance test for the new row, hands it
   over, and rescores the `BR-0003-0009` row in
   `.qfai/evidence/coverage-depth-spec-0003.md`.
4. `/qfai-implement spec-0003` takes the new row through the falsifiability
   path. The refusal already exists, so the RED is the mutation that drops
   `escapesProject` from `refuseOverwrite` in
   `packages/qfai/src/cli/commands/init.ts`.

## Resolution
