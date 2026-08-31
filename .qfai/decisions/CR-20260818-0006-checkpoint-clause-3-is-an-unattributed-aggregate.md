# Change Request

- ID: `CR-20260818-0006`
- Title: `Checkpoint step-4 clause 3 is an unattributed aggregate while clause 5 is explicitly per-row, so a sibling spec's findings — or a validator defect — block a row that cannot discharge them`
- Raised by: `/qfai-implement orchestrator, spec-0006 item-12 checkpoint at 6be8de00; the blocking delta measured and attributed per spec before filing`
- Raised at: `2026-08-18T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — read clause 3 per attribution, as clause 5 already is
- Applied at: `2026-08-23T00:00:00Z` — see Resolution
- Superseded by: `-`
- Blocked set: `spec-0006 TDD-0034, TDD-0035, TDD-0036, TDD-0037` — all four are blocked from refactor to done by this clause and by nothing else in their own scope

## The measurement

`references/checkpoint-verification.md` § "The one substitution: a measured delta for step 4" lets
step 4 be judged on a delta instead of exit 0, when five clauses hold. At `6be8de00`, for spec-0006's
four remaining rows:

| clause                                                                                 | state                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — baseline captured before the slice's first code change, counts **and** finding IDs | **holds**. `.qfai/evidence/implement-spec-0006.md` § "Checkpoint step-4 baseline" records `info=4 warning=352 error=2`, `QFAI-TEST-001` 0, and the full ID sets of both errors.                                           |
| 2 — zero `QFAI-TEST-001`                                                               | **holds**. Measured 0.                                                                                                                                                                                                    |
| 3 — no severity count higher than the baseline's                                       | **FAILS**. `warning` is **364**, baseline **352**.                                                                                                                                                                        |
| 4 — no row's `TC-*` re-enters the unreferenced list                                    | **holds**. Zero `SPEC-0006:TC-*` in the `QFAI-ATDD-112` list; all nine departed.                                                                                                                                          |
| 5 — every baseline finding is unattributable to the row being closed                   | **holds**. The two standing errors are `QFAI-ATDD-111` (`SPEC-0006:US-0006-0011`, a `/qfai-sdd` Phase 2b obligation this skill may not create) and `QFAI-ATDD-112` (residue now entirely spec-0003 / 0008 / 0015 / 0017). |

Four of five hold. The one that fails, attributed:

```text
TDDLIST_STALE_STATUS at 6be8de00 = 16
  spec-0003   1   \
  spec-0012   3    >  4 = the baseline's share
  spec-0017  12   <-  the entire delta
spec-0006       0
```

**Not one of the twelve belongs to spec-0006.** They are spec-0017 rows 7, 9, 10, 11, 31, 38, 40, 41,
43, 71, 72 and 73, and they appeared because spec-0017's first change created the test file its ledger
names for all 82 of its rows. `CR-20260818-0001` measures them as **false positives**: the rows have
no test, and each warning fires only because `selectorResolves` falls back to containment of the
selector's last identifier-shaped token, which in this repository's house style is an ordinary English
word (`removed`, `open`, `only`, `name`, `set`).

So the state is: four spec-0006 rows cannot reach `done` because of twelve warnings that belong to a
different spec, are individually false, and are already filed as a validator defect.

## Why this is a defect in the clause and not just bad luck

The same document reasons the opposite way one clause later, in terms:

> Clause 5 is the load-bearing one. … **Read per row, not per spec**: a finding naming another row's
> obligation in the same spec, or an obligation owned by an upstream phase, does not block this row.

Clause 5 is carefully attributed — it even anticipates the sibling-row case and the upstream-phase
case. Clause 3 is an unattributed total over the whole repository. The two cannot both be right about
the same question: if a **baseline** finding naming another row's obligation does not block a row,
a **new** finding naming another _spec's_ row cannot sensibly block it either.

The asymmetry is not theoretical. `--profile tdd` is repository-wide, so clause 3 couples every
slice's checkpoint to every other slice's in-progress state. Two consequences, both live here:

- **Ordinary sibling progress trips it.** A slice that seeds `todo` rows raises the aggregate; the
  slices next door then cannot close until it finishes. That inverts the usual direction of a gate:
  progress elsewhere becomes an obstacle.
- **A false signal has the same force as a true one.** Clause 3 reads counts, not causes, so a
  validator defect blocks a row exactly as hard as a real regression would. It is the one clause with
  no attribution and therefore the one that cannot tell the difference.

Worth stating plainly: the slice's own recorded pass criterion — "the aggregate is **unchanged** from
this baseline **and** `QFAI-TEST-001` stays at 0 **and** the row's own TC has left the
`QFAI-ATDD-112` list" — inherits the same flaw, because its first conjunct is clause 3. Two of its
three conjuncts hold at `6be8de00`.

## Options (at least 3) and recommendation

### Option A — read clause 3 per attribution, as clause 5 already is (recommended)

Clause 3 becomes: no severity count **attributable to this slice** is higher than the baseline's. The
delta is attributed the same way clause 5 requires findings to be — by naming the spec and row each
finding belongs to, which the validator already prints on every line. A slice records the attributed
delta rather than the raw total.

Cost: the checkpoint record grows by one attribution table per boundary, and a slice that genuinely
regresses a sibling spec must notice it — which the raw total would have caught for free. Mitigation:
require the attributed delta AND the raw total to be recorded, so a cross-spec regression is visible
even though it does not block.

### Option B — resolve `CR-20260818-0001` first and let clause 3 stand

Fixing `TDDLIST_STALE_STATUS`'s last-token fallback removes the twelve false positives and restores
`warning` to 352, so clause 3 holds and these four rows close with no change to the checkpoint
contract.

Cost: it unblocks **these** rows and leaves the clause's generality untouched, so the next slice that
seeds `todo` rows next door hits it again — with true positives that time, which no CR will remove.
It is also a production change to a validator, so it needs its own row and its own oracle.

### Option C — leave clause 3 as written and park the four rows

The rows stay at `refactor` until spec-0017's twelve rows advance past `todo`. Honest, and the record
already says `refactor` means "implemented, not review-closed".

Cost: 77 of spec-0017's 82 rows are still `todo`, so this is an indefinite park, and it makes
spec-0006's completion a function of spec-0017's schedule. It also means the four rows sit `done`-ready
with three blocking-agent PASSes on items 3/5 and no defect of their own.

**Recommendation: A, with B taken anyway.** A is the durable fix and it makes clause 3 consistent with
the clause the document itself calls load-bearing. B is worth doing on its own merits — the false
positives are a real defect and they degrade a signal every adopter sees — but B alone leaves the
clause able to block the next slice for a reason that slice does not own. C is only acceptable if
neither is wanted, and it should then be recorded as a deliberate park rather than as a gate result.

## Impact scope

- Shipped surface: `assets/init/.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md`
  and its `sync:ssot` mirror, under A. Inside the distributed surface.
- Production: none under A or C; `src/core/validators/tddList.ts` under B (that is
  `CR-20260818-0001`'s scope, not this one's).
- Specs: none. Ledger rows: none reset — under A or B the four rows close; under C they stay
  `refactor`.
- Adopter-visible: yes under A — it changes what the checkpoint asks adopters to record.

## Decision needed from user

Choose A, B, C, or A+B; and if C, confirm the four rows should be parked at `refactor` rather than
closed.

## Approved actions (owner skill rerun plan)

1. Owner is the packaged prompt text that states checkpoint step-4 clause 3 — an unattributed
   aggregate where clause 5 is explicitly per-row. Edit the packaged copy under
   `packages/qfai/assets/init/**`, propagate by reinstall. **No mode applies** — packaged prompt text under `packages/qfai/assets/init/**`, outside the step-4 invocation table.
2. Downstream ledger sweep: **no rows are reset**, and four rows are UNBLOCKED. The four named in
   this CR's `Blocked set` are held at `refactor` by this clause and by nothing in their own scope:
   - `spec-0006 TDD-0034`, `TDD-0035`, `TDD-0036`, `TDD-0037`
     Approving an option that makes clause 3 per-row lets those four reach `done` without any
     further work on them. That is a forward transition, not the sanctioned backward reset.
3. Cross-check after applying: the checkpoint must pass for a row whose own spec contributes no
   findings while a sibling spec's findings remain outstanding, demonstrated rather than asserted.

## Resolution

checkpoint-verification.md clause 3 rewritten; the raw total is still recorded beside the attributed delta so a real cross-spec regression stays visible

Pending.
