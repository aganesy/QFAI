# Round Evidence

Per-round fields of the `qfai-implement` evidence contract. The skill's
`### Per-item evidence contract` section carries the summary.

## Round block

One block per RED/GREEN cycle. Round 1 is the original cycle; each blocking
reviewer `REVISE` that requires new production behaviour adds a round.

- `Round N: Revision` — the state this round's observations were made
  against (`evidence-revision.md`)
- `Round N: RED revision` — the tree that round's RED was observed on, and
  `Round N: RED test hash` with its manifest. Each round's RED is taken on its
  own tree, so holding one of each for the row meant a second round either
  overwrote the first pair's address or inherited it — neither of which any
  reader can audit
- `Round N: RED command` — the exact command executed to observe failure
- `Round N: RED result` — the failure output (result completeness is
  best-effort; truncated output is acceptable)
- `Round N: Satisfied-by` / `Falsifiability command` / `Falsifiability result`
  — **in place of the RED pair** on a `falsifiability` row. It is that row's
  RED observation, so it sits where the RED pair sits and takes the same prefix;
  writing it unprefixed left the completion gate unable to find the round it
  belongs to
- `Round N: GREEN command` — the exact command executed to observe success
- `Round N: GREEN result` — the success output
- `Round N: reviewer verdict` — the verdict that closed the round (`PASS`, or
  `REVISE` plus the finding, and which rework path it took). Absent on round 1
  when no review has run yet.
- `Round N: Review pack` — the `review-<timestamp>/` directory this round's
  verdicts were written to, and `Round N: Review pack seal` with the hash that
  seals it. Written once the round's last reviewer response has landed, and
  recomputed at gate item 10. The procedure, the subject and why the seal lives
  outside the pack are stated once in
  `evidence-revision.md#review-pack-seal` — do not restate them here

## What opens a round

Round 1 is the original RED/GREEN cycle. Each blocking reviewer `REVISE` that
requires new production behaviour adds a round. A `REVISE` that needs none
(naming, duplication, comments) opens no round and is verified by a refreshed
`Refactor verify` pair instead. Rounds are numbered and repeatable, not appended
as free prose.

Every field in a round block carries the `Round N:` prefix, and **this list
is the whole of it** — `Revision`, the RED pair (or the falsifiability trio in
its place), the GREEN pair, the reviewer verdict, and the `Review pack` /
`Review pack seal` pair. Row-level fields are not round
fields and take no prefix: `TDD-ID`, the obligation reference, `Test file`,
`Selector`, `Layer`, and the refactor-verify pair. `RED revision`,
`RED test hash` and `Falsifiability revision` were on that list until a
second round showed they describe a round's RED, not the row's.

## Single-round items

A single-round item satisfies the contract with `Round 1: ...` and no
reviewer-verdict line, which is the same content the previous one-pair
contract required. Nothing existing becomes non-conformant.

## Where the rounds happen

An item at `review-fix` may re-enter the RED/GREEN cycle as many times as the
rework needs. Each pass is its own round block.

**The row's `Status` stays `review-fix` throughout.** The RED/GREEN passes are
work, not ledger states here: `review-fix -> red` and `review-fix -> green` are
not allowed transitions, and writing either would be the backward transition
the lifecycle forbids. `review-fix -> refactor` is the only status change the
rework produces; the rounds themselves are recorded in `Evidence`.

## A `REVISE` that needs no new production behaviour

`implementation-reviewer` frequently returns `REVISE` for naming, duplication
or a comment — rework that changes no observable behaviour. There is no new
failing test to write, so opening a round would mean inventing a RED phase for
a change that has none. That rework takes the second path:

1. The status contract is unchanged: the row still moves
   `refactor -> review-fix` and back.
2. **No round is opened.** Round blocks record RED/GREEN cycles; a
   behaviour-preserving change has none.
3. Make the change, re-run the item's tests, and refresh
   `Refactor verify command` / `Refactor verify result`. That refreshed pair is
   the evidence the change kept GREEN, and it must be fresh — the pre-rework
   pair is stale evidence.
4. Record the trigger and the path taken on the current round's
   `Round N: reviewer verdict` line, then return to `refactor` and re-submit.

Which path applies is decided by the finding, not by the reviewer: a `REVISE`
that requires new production behaviour opens round N+1 even when it came from
`implementation-reviewer`.

## Who the rework goes back to

Returning to `refactor` re-submits the item to **every routed blocking reviewer
whose verdict the rework could invalidate** — always the reviewer that opened
the round, plus any reviewer that already returned `PASS` on artifacts the
rework changed. A `PASS` recorded against the pre-rework test or production
code is stale evidence: it does not count towards "After all routed blocking
reviewers return PASS" and must be re-earned before the item may reach `done`.

## Resuming a `review-fix` item

A `review-fix` row can outlive the session that created it — the operator
interrupts, or the run ends between the `REVISE` and the rework. On the next
start, `review-fix` rows are selected **before** any `todo` row (Required
Process, Phase: Red, step 1), so an interrupted rework is always resumed
rather than stranded behind newer items.

Resuming a `review-fix` row:

1. Read the round blocks already in the item's evidence and take the highest
   `Round N`; the reviewer verdict on that round names the finding to fix.
2. Pick the path the finding calls for: open round `N + 1` and run the
   RED/GREEN cycle when the fix needs new production behaviour, or take the
   behaviour-preserving path above when it does not.
3. Return the row to `refactor` and re-submit per **Who the rework goes back
   to** above.

A `review-fix` row must already have a `Test file` — it reached `refactor`
before the `REVISE`. `validateTddList` checks the file exists for
`review-fix` exactly as it does for `green`, `refactor` and `done`, so a
rework row that lost its test file is reported (`TDDLIST_TEST_FILE_MISSING`)
instead of being accepted as a valid ledger state.
