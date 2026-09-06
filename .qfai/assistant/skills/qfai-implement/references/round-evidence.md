# Round Evidence

Per-round fields of the `qfai-implement` evidence contract. The skill's
`### Per-item evidence contract` section carries the summary.

## Round block

One block per RED/GREEN cycle. Round 1 is the original cycle; each blocking
reviewer `REVISE` that requires new production behaviour adds a round.

**Where a block goes.** A `#### Round N` heading **inside the row's own
`### TDD-NNNN` section** of the evidence file the row's `Layer` owns, never
beside it. The nesting is the whole of the attribution: a `### Round N` written
after the row's section is that section's sibling and terminates it, so two rows
reworked in the same cycle produce two `### Round 2` blocks that no reader — and
no audit subject — can attribute to a row. A round block is not a section of the
evidence template either: the row's entry is its only home.

**A block an earlier run already wrote at `###`.** The contract said `###`
before this rule, so a row whose rework was interrupted — the operator stopped,
or the run ended between the `REVISE` and the fix — comes back carrying its
rounds as the row section's _siblings_. Such a block is **unmigrated evidence,
not an absent field**: a reader extracting only `#### Round N` skips it in
silence, so the earlier rounds' RED/GREEN drop out of the completion-review
subject and the review PASSes over a hash that never covered them, and
**Resuming a `review-fix` item** below takes the highest round as lower than it
is. Migrate before anything reads the file: re-nest each `###` round heading
at `####` inside the `### TDD-NNNN` section it belongs to. That is a
heading-depth move and nothing else — no field value changes, no observation is
re-taken, and no hash that was valid before it stops being valid. **Attribution
has to be certain.** When more than one row could own the block — several
`### TDD-NNNN` sections, and nothing in the block naming one — **stop and
report the file** instead of choosing: a guess writes the round into another
row's `Audited evidence hash`, which is the exact confusion the nesting exists
to end.

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
- `Round N: RED failure mode` — `assertion` | `expected-error` |
  `falsifiability`, classifying **that round's** RED (`red-admissibility.md`).
  A round-1 `falsifiability` row whose corrected acceptance test fails naturally
  in round 2 (`../../qfai-atdd/references/review-fix-rounds.md`) changes mode
  between rounds, so one row-level field either rewrote round 1's
  classification or left round 2 misclassified
- `Round N: Satisfied-by` / `Falsifiability command` / `Falsifiability result`
  — **in place of the RED pair** on a `falsifiability` row, with
  `Round N: Falsifiability revision` **in place of `Round N: RED revision`** as
  that trio's address. It is that row's RED observation, so all of it sits where
  the RED pair and its address sit and takes the same prefix; writing any of it
  unprefixed left the completion gate unable to find the round it belongs to,
  and a branch-2 row that reached Round 2 unable to say which mutation run the
  address described — the round before it having been overwritten or reused
- `Round N: Falsifiability revision` — the mutated tree that round's
  falsifiability run was observed against, taken before the revert destroys it
  (`evidence-revision.md`). It is that observation's address, so it takes the
  prefix for the same reason the trio does
- `Round N: Replacement proof revision` — the tree this round's re-taken
  `Oracle proof` ran against, present only where a `REVISE` replaced the
  acceptance test (`../../qfai-atdd/references/review-fix-rounds.md`). The
  replacement, and so the re-take, happens per round, so one slot either
  overwrote the earlier round's address or left this round's proof attributed to
  a tree it never ran on. `Round N: RED revision` is left alone — it addresses
  the natural RED the same block describes
- `Round N: GREEN command` — the exact command executed to observe success
- `Round N: GREEN result` — the success output
- `Round N: Oracle proof` — the production mutation that made this round's test
  fail again, taken in Phase: Green step 2a against the code this round wrote
  (`equivalent-mutant` in its place, per `oracle-strength.md`). A later round
  rewrites that code, so round 1's proof no longer shows that the pass depends
  on this item's behaviour; one slot for the row either overwrote it or left the
  row reusing a stale one, with nothing in the record saying which. A
  `falsifiability` row's mutation run **is** that round's proof and is not
  repeated — the trio above stands in its place
- `Round N: Review pack` — the `review-<timestamp>/` directory this round's
  verdicts were written to, and `Round N: Review pack seal` beside it (hashing
  procedure: `evidence-revision.md`). Each review creates a new pack, so a
  bare row-level hash left the completion gate unable to say which directory to
  recompute over — it either checked another round's pack or stopped a correct
  item. **One pair per review attempt, not one per round**: a `REVISE` that
  needs no new production behaviour re-reviews inside the same round (below),
  and every review creates its own pack (`../SKILL.md`), so write the pair once
  per attempt and qualify it `Round N: Review pack (attempt M)` /
  `Round N: Review pack seal (attempt M)`, `M` numbered from 1 in review order
  and omitted where the round holds a single attempt. Overwriting the pair lost
  the `REVISE` attempt's audit trail; keeping the first left the completion gate
  recomputing over a pack the round did not close on. `M` qualifies the field
  name only — the pack directory layout is unchanged (`../SKILL.md`)
- `Round N: reviewer verdict` — the verdict that closed the round (`PASS`, or
  `REVISE` plus the finding, and which rework path it took). Absent on round 1
  when no review has run yet. A round with several review attempts records each
  attempt's verdict here in review order, under the same `(attempt M)`
  qualifier, so every pack in the round has the verdict it carried beside it.

## What opens a round

Round 1 is the original RED/GREEN cycle. Each blocking reviewer `REVISE` that
requires new production behaviour adds a round. A `REVISE` that needs none
(naming, duplication, comments) opens no round and is verified by a refreshed
`Refactor verify` pair instead. Rounds are numbered and repeatable, not appended
as free prose.

Every field in a round block carries the `Round N:` prefix, and **this list
is the whole of it** — `Revision`, the RED pair with `RED revision` and
`RED test hash` (or, in their place, the falsifiability trio with
`Falsifiability revision`), the `RED failure mode` that classifies it, the
`Replacement proof revision` where the test was replaced, the GREEN pair, the
`Oracle proof`, the review pack and its seal, the reviewer
verdict. Row-level
fields are not round fields and take no prefix: `TDD-ID`, the obligation
reference, `Test file`, `Selector`, `Layer`, the refactor-verify fields — the
pair and its `Refactor verify revision` — and the checkpoint fields, the pair
with its `Checkpoint verification revision` and seal
(`checkpoint-verification.md`). `RED revision`,
`RED test hash` and `Falsifiability revision` were on that list until a
second round showed they describe a round's RED, not the row's.

The row-level half is not enumerated exhaustively, so **which half a field
belongs to is decided by its producer, not by its absence from a list**: a field
its producer writes once per round takes the prefix and belongs in the block
above; a field written once for the row does not. A per-round field missing from
the enumeration is an omission to be fixed here — it is not row-level by
default, and no other file may decide it (`../SKILL.md`).

## Single-round items

A single-round item satisfies the contract with `Round 1: ...` and no
reviewer-verdict line, which is the same content the previous one-pair
contract required. Nothing existing becomes non-conformant.

**An entry written before a field joined this list carries it unprefixed.** Read
an unprefixed occurrence of any field above as belonging to that entry's
**highest-numbered** round, **not** to round 1: the field was one row-level slot
then, so every round overwrote it and the value that survived is the last one
written. On a single-round entry that is `Round 1`. The earlier rounds have no
copy and none can be made — the tree an `Oracle proof` or a RED addressed is
destroyed by the revert or by Phase Green — so their absence is not a finding,
and requiring the prefix on a row already at `refactor` or `review-fix` would
strand a correctly evidenced row with no way to produce what it asks for.
Rewrite the value under its round's prefix the next time the row opens a round;
a bare value left beside a prefixed one for the same round is a duplicate, not
two rounds. A row that never opens another round keeps the unprefixed form and
reaches `done` on it.

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
3. Make the change, re-run the item's tests, and refresh all three
   `Refactor verify` fields — `command`, `result` and `revision`. That refreshed
   triple is the evidence the change kept GREEN, and it must be fresh: the
   pre-rework one is stale evidence, and the revision moved with the change, so
   leaving it behind would make the re-review disagree with it at gate item 10.
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

1. Migrate any round block the evidence still carries at `###` first
   (**Where a block goes** above). An interrupted rework is the case that
   predates the nesting rule, so it is the one that has them, and every step
   below reads blocks this one has not moved as if they were not there.
2. Read the round blocks already in the item's evidence and take the highest
   `Round N`; the reviewer verdict on that round names the finding to fix.
3. Pick the path the finding calls for: open round `N + 1` and run the
   RED/GREEN cycle when the fix needs new production behaviour, or take the
   behaviour-preserving path above when it does not.
4. Return the row to `refactor` and re-submit per **Who the rework goes back
   to** above.

A `review-fix` row must already have a `Test file` — it reached `refactor`
before the `REVISE`. `validateTddList` checks the file exists for
`review-fix` exactly as it does for `green`, `refactor` and `done`, so a
rework row that lost its test file is reported (`TDDLIST_TEST_FILE_MISSING`)
instead of being accepted as a valid ledger state.
