# Change Request

- ID: `CR-20260823-0003`
- Title: `Three claims this spec's record retracted are standing as assertions in the execution ledger`
- Raised by: `/qfai-atdd orchestrator, spec-0017; found by round 20's qa-gatekeeper and re-derived independently`
- Raised at: `2026-08-23T00:45:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `1` — the ledger owner writes the correction
- Applied at: `-` — HANDOFF to /qfai-implement: the Evidence cells carrying the retracted claims are its to write
- Superseded by: `-`
- Blocked set: `-`

## What is standing, and where

`.qfai/specs/spec-0017/tdd/test-list.md`, the `Notes` column of rows `TDD-0069` and `TDD-0070`:

```text
:107  "becomes implementable once the pull request has three green"
      retracted because that exit is unreachable — the run it waits for is gated on the
      annotation it would justify (P1d pass 1). This is the cycle CR-20260820-0012 exists for.

:107  "NOT BLOCKED by a CR"
:108  "NOT BLOCKED by a CR"
      retracted because it is the negation of the `Blocked-By: CR-20260820-0012` those rows are
      being given (P1d round 7, `A1`).
```

Re-derived by this stage independently of the finding: all 33 `RETRACTED` needles from
`packages/qfai/tests/assets/retractedClaims.test.ts`, flattened by that guard's own rule, run over
every tracked file. Outside `GOVERNANCE` and the review packs the only asserted hits are the three
above, plus three known false positives in files this skill may not patch.

## Why it is filed rather than fixed

Two reasons, and the second is the one that matters.

**Ownership.** `qfai-implement/references/execution-ledger.md` gives that file one writer, and the
`/qfai-atdd` Read Set Contract says it is "read, never written". This stage may not edit those rows.

**Adding it to `GOVERNANCE` would be worse than leaving it.** `GOVERNANCE` is the list the
retracted-claims guard scans, and the guard runs in a required `e2e` leg. Adding a file this stage
cannot edit turns that leg red against text nobody here may fix — the "a guard that reddens on the
honest edit" hazard the record has tracked since round 10, in its purest form: there would be no honest
edit available at all. So the guard stays where it is and the claims are routed to their owner.

## Options

1. **The ledger's owner corrects the three `Notes` cells** on its next `/qfai-implement` run, and
   `.qfai/specs/spec-0017/tdd/test-list.md` is then added to `GOVERNANCE` so the guard covers it from
   that point.
2. **Add the file to `GOVERNANCE` now** and let the leg go red until the owner corrects it. Truthful
   about the state, and it stops every other spec's work on this repository until an unrelated skill
   runs.
3. **Widen `GOVERNANCE` to the ledger and grant an exemption** for rows a CR blocks. Expressive, and it
   invents an exemption mechanism the guard does not have, which is a change to the guard's contract.
4. **Leave it recorded in the evidence only** (the state before this CR). The claims stay visible to a
   reader of the record and invisible to the instrument built to catch exactly them.

Recommendation: **1**. It puts the correction with the writer who owns the cells, and the `GOVERNANCE`
addition afterwards is what stops it recurring — which is the part option 4 never reaches.

## The related limit, measured

Two of the 33 needles cannot be widened as they stand, and this section deliberately does not write
either of them out, because doing so is itself the offence the guard catches:

- the **pack-count** needle matches a sentence in `_policies/08_Decisions.md`, `_policies/10_delta.md`
  and `spec-0017/09_delta.md` about one design fragmented across three SPEC packs — a different noun
  from a review pack;
- the **seal-filter** needle matches an unrelated rejected option in `_policies/08_Decisions.md` about
  shipping a list-only view.

All three of those files are upstream SSOT this skill may not patch either. A needle that cannot be
widened without accusing a file you cannot fix is a needle at the edge of its scope.
