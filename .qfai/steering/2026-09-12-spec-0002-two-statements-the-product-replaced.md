---
id: 2026-09-12-spec-0002-two-statements-the-product-replaced
status: active
kind: consultation-needed
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

**Option 2 is read per statement too, because the two halves differ.**

- **On A**, no obligation moves: the option restores the behaviour the direction
  rule already requires. `TDD-0008` and `TDD-0009` are not reset; they take the
  in-place shared-artifact re-verification plus falsifiability evidence for each
  corrected assertion.
- **On B**, the requiredness statements are re-derived around the visual-surface
  predicate, because the restored preflight lets a cli-only pack through while
  those statements make requiredness follow from the UI-bearing flag.
  `TDD-0012`'s obligation therefore moves: it is **reset to `todo`** with the
  change request in `DR-ID`, and re-pointed in the same rerun. Following the
  in-place path instead would leave its `done` evidence attached to an
  obligation the approval replaced.

The rerun mode is `re-derive` under both — `confirm-only` writes nothing but
the change request's reference. Option 2 on **B** reaches `TDD-0001` as well:
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

## Four other packs are reached, and a test re-run does not settle any

`spec-0010` owns two chains here: the producer (`US-0010-0009`, `AC-0010-0007`,
`BR-0010-0007`), which the Change Request records as `/qfai-sdd` today, and the
direction rule itself (`US-0010-0008` through `TC-0010-0006`), which statement A
changes or retires. **Every statement-A outcome reaches both**, the two that
change nothing there included.

`spec-0013` is reached by both sub-branches. `REQ-0015` and the side-artifact
`AC-0013-0009` say the preflight does not block on a missing or old-format
optional side artifact, which **`2B` reverses** — that pack's own delta records
the blocker being removed. Separately `US-0013-0009` through `TC-0013-0022`
assign the `DESIGN.md.lock.yaml` write to Phase 0, which **`2a` moves**. Its
`todo` row `TDD-0016` is listed in the Change Request's blocked set, which is
what suppresses it; it resets under `2a` and stays where it is otherwise.

The re-derived requiredness rule is **not** "UI-bearing": a cli-only pack is
`ui_bearing: true` and may not carry `prototyping.yaml`, so the blocker rests on
a visual prototyping surface instead.

`spec-0004` and `spec-0012` are reached by `2a`, and by one edit: that
sub-option authorises the design-contract gate to exempt a pack which has not
reached prototyping, and those two packs are where the gate is specified
(`REQ-0025` / `AC-0004-0008`, and `DR-0012-0020`).

Three of the four packs carry ledger dispositions the Change Request approves
rather than leaves to the sweep. `spec-0004/TDD-0008` resets under `2a` because
the obligation under it changes. `spec-0010` has five:

| Row                                | `1A`            | `3A`                                        | `2A`                            |
| ---------------------------------- | --------------- | ------------------------------------------- | ------------------------------- |
| `TDD-0006`, `TDD-0007`, `TDD-0008` | reset to `todo` | retired, `Evidence` copied in, ids reserved | re-verified in place, not reset |
| `TDD-0010`                         | reset to `todo` | retired as never executed, id reserved      | released as it stands           |
| `TDD-0011`                         | reset to `todo` | reset to `todo`                             | reset to `todo`                 |

`TDD-0011` resets under every statement-A outcome because `TC-0010-0007`, the
producer obligation, is re-derived under all of them. The rest re-verify in
place.

**The impact scope is reduced to the approved outcome before `Status: approved`
is written.** The drift guard reads a path rather than the condition beside it,
so a document left whole would have one option authorising every other
option's edits.

All four are owner re-derivations in the rerun plan, not cross-spec
re-verifications: what disagrees is a requirement, and re-running a test
confirms the observation rather than the requirement it was taken against.

These prerequisites land before the Change Request is applied, each as its own
record:

- `spec-0002`'s ledger repair. Phase 2b of the `re-derive` would otherwise seed
  its missing rows unauthorised.
- `spec-0010`'s ledger repair, for the same reason: eight columns and no `E2E`
  row for any of twelve active stories.
- The ledger repairs of `spec-0004`, `spec-0012` and `spec-0013`, before an
  approval that re-derives them: `2a` reaches all three and `2B` reaches
  `spec-0013`. Their nine-column tables would otherwise be migrated and seeded
  by the same rerun.
- `spec-0013`'s duplicate id. Its `03_Acceptance-Criteria.md` declares
  `AC-0013-0009` twice, so a rerun keyed to that id sweeps whichever of the two
  it finds, and `2B` waits on it.

After the two ledger repairs, the Change Request is refreshed before approval:
the seeded `E2E` rows for `US-0002-0005`, `US-0010-0008` and `US-0010-0009`
join its blocked set by id, with the dispositions its approved actions give
them.

`spec-0010/TDD-0011` is not parked. It is listed in the Change Request's
blocked set, and that listing is what suppresses it. It stays at `todo`, and
its eight-column ledger has no `Blocked-By` column, so no parking transition
could be written and no departure metadata exists to recover. It targets
`TC-0010-0007`, the producer obligation every statement-A outcome re-derives.

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
