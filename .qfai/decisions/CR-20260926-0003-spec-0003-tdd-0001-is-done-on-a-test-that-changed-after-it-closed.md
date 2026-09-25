# Change Request

- ID: `CR-20260926-0003`
- Title: `spec-0003 TDD-0001 is done on a proof taken before its test changed`
- Raised by: `qfai-atdd`
- Raised at: `2026-09-25T22:24:32Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`spec-0003/TDD-0001` is `done`. Its `Test file` is
`packages/qfai/tests/integration/initSpec0003.test.ts`, and its entry at
`.qfai/evidence/atdd-spec-0003.md#tdd-0001` records the Round 1 proof with
`RED test hash` `5944d673da0c6056d3cb765a2a2bb103efe8ab8595e2f0b3d11715a7bb56ecb3`.

The work-log removal (`e31df1883`) then deleted the `TC-0003-0022` block and a
`joinProjectSteering` assertion from that file, because the code they checked
is gone. The file the hash covers changed, so the hash no longer recomputes and
`validate --profile tdd` reports `QFAI-TDDLIST-008` on the row. The finding is
inside the dogfood pin for `spec-0003/tdd/test-list.md`.

The obligation still holds. The cross-spec review re-ran the row's selector and
its recorded mutation at `03762f3cf` and ruled it `re-reviewed`. That record is
the `spec-0003/TDD-0001` subsection of `## Shared-artifact re-verify` in
`.qfai/evidence/coverage-depth-spec-0003.md`.

That record cannot clear the finding where the dogfood check runs:

- No live row owns the edit. The spec-0003 row it belonged to, `TDD-0022`, is
  deleted, and the work-log rows are withdrawn by `CR-20260925-0010`. So the
  record is stage-level.
- The gate reads a stage-level record only when the stage file's
  `## Final status` names a review pack whose seal recomputes. Review packs
  under `.qfai/review/` are not committed, and the gate counts a pack missing
  from the checkout as no seal. On a fresh clone, which is what CI runs on, the
  record is never read.

`done` has one exit: the upstream reset. No approved Change Request names this
row, so `/qfai-implement` cannot re-take the proof in the row's own entry.

A second edit to the same case is proposed on its own branch: the bullet 3 check
of `TC-0003-0001` compares resolved paths instead of the raw link text. It
replaces the row's `RED test hash` again, and its handover says the row needs
a reset for the same reason. One reset covers both edits, whichever order they
land in.

## Reproduction

At `b5d357c14`, the ledger row and the entry:

```text
.qfai/specs/spec-0003/tdd/test-list.md
  5: | TDD-0001 | TC-0003-0001 | ... | done | DR-0003-0006, CR-20260923-0011 | ... -> .qfai/evidence/atdd-spec-0003.md#tdd-0001 |
.qfai/evidence/atdd-spec-0003.md
  1008: - RED test hash: 5944d673da0c6056d3cb765a2a2bb103efe8ab8595e2f0b3d11715a7bb56ecb3
```

The edit after the row closed:

```text
git diff --stat e31df1883^ e31df1883 -- packages/qfai/tests/integration/initSpec0003.test.ts
 packages/qfai/tests/integration/initSpec0003.test.ts | 11 -----------
```

The stage record's gate, in `packages/qfai/src/core/validators/tddList.ts`
(`hasSealedStageStatus`): the recorded pack path is checked with `lstat`, and a
failure returns `false`. `.gitignore` line 64 ignores `.qfai/review/*`.

## Proposed change

1. `TDD-0001` goes to `todo` with this record added to `DR-ID`. Its `TC-Refs`,
   `Test file` and `Selector` stay as they are.
2. `/qfai-atdd spec-0003` hands the row over again on the falsifiability branch,
   against the test file as it then stands. Where the resolved-path check of
   bullet 3 has landed, the handover names its mutation beside the Round 1
   mutation.
3. `/qfai-implement spec-0003` re-takes the proof as Round 2 of the row's entry,
   writes the new `RED test hash` and manifest there, and closes the row through
   `qa-gatekeeper`, `completion-reviewer`, `implementation-reviewer` and the
   checkpoint.
4. The dogfood pin for `spec-0003/tdd/test-list.md` is lowered by the count that
   falls, and raised by none.

## Options (at least 3) and recommendation

| #   | Option                                                                         | Cost                                                                     | Risk                                                                                                                        | Recommended |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Reset `TDD-0001` and re-take its proof in its own entry                        | One ledger cell, one handover, one implement round with its reviews      | The row is open until the round closes                                                                                      | ✅           |
| 2   | Keep the row `done` and seal the stage record through a spec-0003 stage review | One stage review pack and a `## Final status` in the coverage-depth file | The pack is not committed, so CI never reads the record: the finding and the pin stay. The next edit to the file repeats it |             |
| 3   | Keep the row `done` and leave the finding inside the dogfood pin               | None                                                                     | The row stays `done` on a proof whose manifest no longer matches its test                                                   |             |

Option 1 is the only one that clears the finding on CI. Option 2 clears it only
on the machine that holds the pack.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                        |
| -------------------- | ------------ | --------------------------------------------------------------------- |
| `spec-0003/TDD-0001` | `ledger-row` | Its proof was taken on the test before the work-log removal edited it |

- Not blocked by this CR: `spec-0003/TDD-0025`, the other `done` row naming the
  same test file. Its entry records no RED test manifest, so no hash of it moved.
- Overlapping open CRs: `CR-20260924-0005` and `CR-20260925-0006` edit other
  spec-0003 rows and name neither this row nor this test file.

## Impact scope

- Specs: `spec-0003`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0003/tdd/test-list.md`,
  `.qfai/specs/spec-0003/09_delta.md`

## Decision needed from user

Approve the reset of `spec-0003/TDD-0001`, so its proof is re-taken in its own
entry on the test file as it now stands?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003` records this request in `09_delta.md`, and resets
   `TDD-0001` to `todo` with this record in `DR-ID`. No other row.
2. `/qfai-atdd spec-0003` hands `TDD-0001` over on the falsifiability branch.
3. `/qfai-implement spec-0003` takes `TDD-0001` through the cycle.
4. Lower the dogfood pin where the count fell, and fill `Resolution` and
   `Applied at`.

## Resolution

Pending explicit approval and the owner rerun.
