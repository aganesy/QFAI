# Change Request

- ID: `CR-20260823-0004`
- Title: `A requirement with two accepting branches still owes a covered TC for the branch it did not take`
- Raised by: `/qfai-sdd orchestrator, spec-0017; found while clearing the last QFAI-ATDD-112 finding`
- Raised at: `2026-08-23T08:30:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `3` — replace TC-0017-0032 with the rule its BR actually states
- Applied at: `2026-08-23T00:00:00Z` — EX-0017-0029 / TC-0017-0032 rewritten as the conditional; covered and falsified
- Superseded by: `-`
- Blocked set: `spec-0017 TDD-0032 (TC-0017-0032)`

## The shape

`DR-0017-0002` records build-artifact reuse as a requirement with **two accepting branches**, and says
so in those words:

> The requirement is therefore satisfied by **either** landing the reuse (`AC-0017-0014`) **or**
> recording a measurement that shows a wall-clock regression and keeping the rebuilds
> (`AC-0017-0015`). Both branches are accepting, which is what keeps the requirement falsifiable in
> both directions.

`AC-0017-0015`'s branch is now covered: `TC-0017-0033`, `-0034` and `-0035` land with this change.

`AC-0017-0014`'s branch is not, and cannot be. `TC-0017-0032` asserts that "the bundler invocation
count **falls** against the recorded baseline". That is only true if the reuse lands. Taking the other
branch — measure, find a regression, keep the rebuilds — satisfies the requirement and leaves
`TC-0017-0032` permanently uncovered, because the thing it asserts did not happen.

`QFAI-ATDD-112` is indifferent to that. It fires on any declared `TC` with no annotation in the
directory its `Level` routes to, whatever the requirement's own disjunction says. So a requirement the
spec calls satisfied keeps a gate red, and the only ways out are to land a change the measurement may
say is wrong, or to annotate a test that asserts something untrue.

**This is the last finding in `QFAI-ATDD-112` for this spec.** Eight TCs at the start of this session,
one now, and it is this one.

## Why it is filed rather than fixed

Because every fix is a decision about what a two-branch requirement means, and none of them is this
stage's to take:

- retiring a `TC` is a spec change with a visible loss of coverage;
- landing artifact reuse is a change whose _outcome_ is unknown until CI measures it, and the rule
  that governs it (`BR-0017-0030`) forbids adopting it on argument;
- and changing `QFAI-ATDD-112` is a shipped validator's semantics, which reaches every adopter.

## What landing the reuse actually costs, measured rather than assumed

Recorded here because `CR-20260820-0007` states one constraint and the tree turns out to hold a
second, cheaper shape it did not consider.

Two bundler invocations happen in the test matrix today — `ci.yml`'s `test` job builds for the `e2e`
and `integration` slices only. The `build` job already produces and uploads an artifact.

- **A producer job**, the shape `CR-20260820-0007` assumed. Only the two legs that need the bundle
  wait for it. It adds a fifteenth CI check name, and the required-checks set is a repository setting
  no agent can reconfigure — so it needs a human step, and change 9's oracle `R6` reddens `TDD-0043`
  until that setting catches up.
- **No new job**: point the existing `test` job at `build` with `needs:` and download instead of
  rebuilding. No new check name, so no repository-settings change. But `needs:` is per job and not per
  matrix cell, so **all seven slices** would wait for `build` — including the five that never build
  today. That is a real wall-clock cost, and whether it exceeds the two builds it removes is exactly
  the thing that has to be measured rather than argued.

Neither is free, and the second is the one that can be done without a human. It is also the one most
likely to measure as a regression, which is `AC-0017-0015`'s branch — the branch already covered.

## Options

1. **Measure the no-new-job shape and let the number decide.** Land `needs: build` plus a download on
   a scratch commit, read the wall-clock across three runs, keep it if it improves and revert with the
   measurement recorded if it does not. Honest, and it is what `BR-0017-0030` asks for. Cost: CI
   rounds, and a likely revert.
2. **Land the producer job.** Needs the required-checks set updated by a human first, and coordination
   with `TDD-0043`. Most likely to make the count fall, most expensive to arrange.
3. **Retire `TC-0017-0032`, replacing it with a case that asserts the disjunction.** One `TC` per
   requirement rather than one per branch: "the reuse landed and the count fell, OR a regression is
   recorded and the rebuilds are kept". Removes the structural problem for every future two-branch
   requirement in this spec. Cost: a spec change, and a case whose oracle is a disjunction is weaker
   than either branch asserted alone.
4. **Waive the row.** A user-approved `TDDLIST-001` waiver on `TDD-0032`. Cheapest, and it leaves the
   shape in place for the next two-branch requirement.

Recommended: **3**, with **1** as the thing to do afterwards if the reuse is still wanted. Option 3
fixes the mismatch between a disjunctive requirement and a per-branch gate; option 1 then answers the
engineering question on its own timetable rather than against a red gate.

## Impact

- Specs: `spec-0017 — 06_Test-Cases.md (TC-0017-0032), 05_Examples.md (EX-0017-0029)` under option 3
- Plans: `10_Plan.md` step for artifact reuse under options 1 and 2
- Tests: `packages/qfai/tests/...` — a new case under option 3; none under 4
- Contracts: `none`
- Schema: `none`

## Decision needed from user

Replace `TC-0017-0032` with a case asserting the requirement's disjunction (option 3), measure the
no-new-job reuse shape and let the number decide (option 1), arrange the producer job and the
repository-settings change (option 2), or waive the row (option 4)?
