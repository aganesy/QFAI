---
id: 2026-09-12-spec-0002-two-statements-the-product-replaced
status: active
kind: blocker
created: 2026-09-12
updated: 2026-09-12
scope: spec-0002
blocking: true
promote-to: null
links: ["spec-0002"]
---

# spec-0002 states two rules the product replaced

## Context

Four rows of `.qfai/specs/spec-0002/tdd/test-list.md` sat at `done` over
obligations the product contradicts. Three of them also name a test title that no
longer exists.

Those three **are** reported. `selectorResolves` requires the selector text to
appear in the file in full and carries no token fallback, so
`TDDLIST_SELECTOR_UNRESOLVED` names all three — at `warning`, which fails
nothing, which is why they survived at `done`. The issue this work came from
describes a fallback that the validator no longer has; the reporting gap it
infers from that is not the gap.

Repairing the selectors alone would have made the rows resolve while still
discharging nothing, so the obligations were examined first. Two upstream
statements turned out to be the cause, and both are recorded in
`CR-20260912-0003`:

- `REQ-0012` / `AC-0002-0008` / `DR-0002-0001` / `DR-0002-0003` say discussion
  fixes no direction. The product asks the user for one during discussion,
  records it at `01_Context.md#Design Direction`, stops the next stage without
  it, and keeps planner-first only for the screen explorations.
- `REQ-0005` / `AC-0002-0010` say a UI-bearing pack requires
  `prototyping.yaml`. Three shipped documents state verbatim that it is
  optional, and the preflight does not block on its absence.

## What was tried

The obligations were traced to their acceptance criteria, the criteria to the
decision records behind them, and each to the code and tests that would have to
satisfy it. `planner-first` occurs nowhere under `packages/qfai/src/`, and no
validator emits the violation `TC-0002-0009` names — the `discussionDesignHardening`
validator that did was retired in v1.8.9 with the exploration-sidecar family.

`TC-0002-0011` has a test that discharges it against the product:
`packages/qfai/tests/assets/assets.test.ts`, `ensures qfai-discussion skill and
artifact rules
use canonical pack wording`, which reads the skill, the artifact rules and the
package README and requires the same sentence in all three. It cannot be pointed
at while the criterion says the opposite of what that sentence says.

## What the next session picks up

`CR-20260912-0003` is `open` and carries three options with a recommendation. It
needs the user's decision, per statement — they may be settled differently.

Once it resolves, the ledger sweep is enumerated in its approved-actions
section. It is read **per statement**, because the two may be settled
differently — do not apply one option's whole bundle to a split approval.

Statement A, the direction rule, owns `TDD-0008`, `TDD-0009` and `TDD-0010`.
Statement B, the requiredness rule, owns `TDD-0012`. So for `1A/3bB`: option 1
on A resets `TDD-0008` and `TDD-0009` and retires `TDD-0010`, and option 3 on B
retires `TDD-0012` and deletes the legacy-format case its disposition names.

Option 2 resets nothing. No obligation moves under it, and the approved reset is
for a row an approved upstream change invalidated. Its rerun mode is `re-derive`
nonetheless — `confirm-only` writes nothing but the CR reference, and the rerun
has to rewrite `TDD-0012`'s identity. Its rows
take the in-place shared-artifact re-verification plus falsifiability evidence
for each corrected assertion. Option 2 on **B** reaches `TDD-0001` as well:
restoring the preflight check for `prototyping.yaml` edits
`sddPreflight.test.ts`, the file that row's observation covers. Option 2 on A
does not touch that file.

**Option 3 takes a letter when it settles statement B, and not otherwise.**
`3a` writes a new obligation for the legacy-format finding and registers the
surviving case against it; `3b` deletes the case, and with it the only
assertion that the finding is emitted. That case's obligation is
`TC-0002-0011`, which is statement B's, so `3bB` is complete and `3B` alone
authorises neither.

`3A` takes no letter. Statement A's retirement leaves the case owned by
whatever settles B, so a letter there would authorise an action on the other
statement — and rejecting `3A/1B` for want of one would refuse a valid answer.

`TDD-0011` is in neither statement's list. It is **re-verified, not reset**,
under every combination, because the annotation repairs edit the file its
observation covers while its obligation stands. No test is deleted under any
combination except `3bB`, whose disposition is the deletion of
`legacy 4-axis format is error`.

## Two other packs are reached, and a test re-run does not settle either

`spec-0010` requires `/qfai-discussion` to author root `DESIGN.md`
(`US-0010-0009`, `AC-0010-0007`, `BR-0010-0007`), and the Change Request records
`/qfai-sdd` as the producer. **Every statement-A outcome reaches it**, the two
that change nothing there included: settling A without re-deriving `spec-0010`
leaves one of the two packs specifying a producer the product does not have.

`spec-0013` requires the SDD preflight not to block on a missing or old-format
optional side artifact (`REQ-0015`, `AC-0013-0009`). **`2B` reverses it**, and
that pack's own delta records the blocker being removed. `2B` is not approved
without the `spec-0013` re-derivation beside it.

Both are owner re-derivations in the rerun plan, not cross-spec
re-verifications: what disagrees is a requirement, and re-running a test
confirms the observation rather than the requirement it was taken against.

## Constraints to preserve

The four rows are still `Status = done`, and the ledger is untouched. Two edges
were tried and neither exists. `done` is not a status a row may be blocked at —
`TDDLIST_BLOCKED_MISSING_REF` admits `todo`, `red`, `green`, `refactor` and
`review-fix` — so there is no `Blocked-By` cell and no departure metadata to
read; and the backward transition to `todo` is the approved-reset edge, which
needs `CR-20260912-0003` resolved first. The halt is carried by the open Change
Request and by this entry, not by the ledger. A session expecting to find the
rows parked will not find them parked.

## References to consult first

- `.qfai/decisions/CR-20260912-0003-spec-0002-states-two-rules-the-product-replaced.md`
- `.qfai/evidence/coverage-depth-spec-0002.md`, findings 1 through 7 — finding 6
  carries the annotation-repair routes `TDD-0011`'s re-verification depends on,
  and finding 7 the seven ledger rows the seeding contract requires and this
  pack does not have — which is read, not acted on: that gap is outside
  `CR-20260912-0003` and needs a record of its own
- `.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`, the status lifecycle
