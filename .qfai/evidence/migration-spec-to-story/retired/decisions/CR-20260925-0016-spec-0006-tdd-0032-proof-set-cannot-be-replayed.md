# Change Request

- ID: `CR-20260925-0016`
- Title: `The recorded proof set of spec-0006 TDD-0032 cannot be replayed`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-25T02:36:16Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`spec-0006` `TDD-0032` is `done`. Its test case is `TC-0006-0030`: the drift
message names the manual repair and no command token. The test file is
`packages/qfai/tests/integration/spec0006WorkflowsIntegrity.repairText.test.ts`,
and its oracle proof is a set of mutants, each reaching a different assertion of
the message.

A cross-spec re-review of a row whose proof is a set has to replay the whole set:
a partial replay leaves assertions unchecked. For this row it cannot. The row's
own evidence, `implement-spec-0006.md` section `### TDD-0032`, says so in two
places:

- `#### Named gap: G4-R20-G4-R29 are cited but not recorded`. Those ten mutants
  appear only in the coverage map. They have no needle, no replacement text and
  no mutant blob, and the record states their reproducibility "is lost for good".
- The first of its record corrections, which withdraws the claim that eighteen
  rounds were recorded as needle and replacement text. Of those rounds, six carry
  replacement text, none carries a needle, none carries a blob, and two (`R12`,
  `R13`) are prose descriptions. The record calls that table "not
  reconstructible".

The coverage map still names the assertion each lost mutant reached:

| Mutants   | Assertions they reached |
| --------- | ----------------------- |
| `R20–R23` | `P`, `C4`               |
| `R21`     | `T6`                    |
| `R24–R29` | `P`, `C2`               |

An assertion identity is not a predicate. A mutant can only be rebuilt against
the predicate it broke, so none of the ten can be rebuilt from the map.

The later rounds `R30`–`R42` carry replacement text and a blob, but no needle.

This is a gap in the record, not in the test. `qa-gatekeeper` confirmed it
(instance `xspec-audit`): "D-P requires the full recorded set", and these ten
"cannot be rebuilt".

## Reproduction

The gap is in the record, so reproducing it is a read, not a run.

```sh
grep -nE "R2[0-9]\b" .qfai/evidence/implement-spec-0006.md
```

At `25d428853` it prints five lines, all inside `### TDD-0032`:

- line 3909, one narrative mention of `R23`;
- lines 4078 and 4079, the coverage map
  (`P←R4–R11/R20–R40, C2←R4/R5/R6/R11/R17/R24–R29, C4←R7/R20–R23, … T6←R8/R21`);
- lines 4090 and 4093, the named-gap paragraph.

No table row carries any of the ten.

What does replay is one mutant from the earlier set, the packaged path dropped
from the repair instruction in `packages/qfai/src/core/doctor.ts`
(`tmp/cross-spec-mutations-qa/cases18.json`):

```json
"from": "same name in ${workflowsDiff.packagedDir}. ",
"to": "same name in nowhere. "
```

Result from `tmp/cross-spec-mutations-qa/runs18.json`, on the same test bytes
(SHA-256 `c62f8bd80dc4cc024ea7959aa73b142303ba9412144e6ea7218460c8a21cfea5`) and
source bytes (SHA-256
`41872f6288cf51f7d123ed205e6209dd1c201c6e2e6fcdd3b461940a2f654975`) as the tree
at `25d428853`:

```text
mutant: Tests 1 failed | 1 passed (2)
GREEN:  Tests 2 passed (2)
```

That run proves one assertion. It does not stand in for the set.

## Proposed change

Re-establish the row's oracle proof as a recorded set, derived from the
assertions `TC-0006-0030` requires. The test and the production code are not
expected to change.

1. For each assertion the row's test makes, record at least one mutant in the
   form the other rows of this spec already use: file, literal needle, literal
   replacement, mutant blob, the run, and the assertion it reddens.
2. Replace the lost labels rather than reconstructing them. `R1`–`R29` are not
   rebuilt from memory. Each assertion they reached is covered by a mutant under
   step 1, and the coverage map names only recorded mutants.
3. Give `R30`–`R42` their needles, so the whole set can be replayed from base
   plus needle.
4. Where no mutant can reach an assertion, record it under
   `oracle-strength.md#the-equivalent-mutant-case`, with its reason.

This record resets no row. It approves re-recording the proof of a `done` row
whose test and obligation are unchanged. The row is then re-verified in place,
as `qfai-implement/references/checkpoint-verification.md` requires.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                                                       |
| -------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `spec-0006/TDD-0032` | ledger-row | Its recorded proof set is partly lost, so the cross-spec re-review cannot replay it. |

- Not blocked by this CR: every other row of the `spec-0006` ledger. The other
  six rows the re-review replayed as full sets (`TDD-0030`, `TDD-0031`,
  `TDD-0033`, `TDD-0038`, `TDD-0039` and `TDD-0040`) replayed completely.
- Overlapping open CRs: none names this row. `CR-20260925-0007` names
  `spec-0006/TDD-0020`, a different row.

## Impact scope

- Specs: `spec-0006` (records this CR only)
- Plans: none
- Tests: none
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0006/09_delta.md`

## Decision needed from user

Approve re-recording the oracle proof of `spec-0006` `TDD-0032` as a replayable
set, followed by in-place re-verification of the row?

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the approver and time here. Run
   `/qfai-sdd spec-0006` in `confirm-only` mode. It records this CR in the
   `## Change Requests` table of `spec-0006/09_delta.md` and writes nothing else.
2. `/qfai-implement spec-0006` records the set that `## Proposed change`
   describes in the row's section of `implement-spec-0006.md`, runs every
   mutant, and restores each file byte-identically. `qa-gatekeeper` audits each
   observation.
3. Re-verify the row in place, following `checkpoint-verification.md`: the
   selector re-run, the recorded set re-taken and reverted, the restored GREEN,
   and fresh `implementation-reviewer` and `completion-reviewer` verdicts.
4. Fill `Resolution` and `Applied at` once step 3 passes.

## Resolution

Pending explicit approval and the owner rerun.
