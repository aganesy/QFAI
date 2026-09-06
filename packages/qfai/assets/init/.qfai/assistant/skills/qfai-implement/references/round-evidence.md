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
- `Round N: RED assertion-stripped result` — the same command re-run with the
  row's assertions neutralized. A reviewer judges the RED pair and its
  assertion-stripped run together, so the two are recorded together:
  row's assertions neutralized, the strip diff and its **passing** output, the
  test restored immediately. Per round because each round's RED is taken on its
  own tree and is stripped there (`red-admissibility.md`). A round whose RED
  predates this field records `pre-contract` instead — see
  **A round whose RED predates a field**
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
`Refactor verify` pair instead. One further round is opened by no reviewer at
all — the **evidence-migration round** below, whose trigger is a
canonical-skills update. Rounds are numbered and repeatable, not appended
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

## A round whose RED predates a field

That last sentence binds fields added later, and
`RED assertion-stripped result` is the first of them. A row resumed at `green`,
`refactor` or `review-fix` after the canonical skills were updated has a
Round 1 RED taken under the previous contract, and the run the field asks for is
no longer takeable there: the production code that makes the test pass is in
the tree, so a stripped run would pass for a reason that says nothing about
the assertions, and the failure it would have to be taken against is gone.
Required retroactively, the field would leave a legitimately evidenced row
unable to finish, with no migration and no way back.

Such a round records the field as `pre-contract`, and the warrant has to be
**checkable against the update**, not merely plausible. "The round already has
its GREEN pair" is not that: a round that took its RED after the update, skipped
the strip, then wrote production code and a GREEN pair satisfies it exactly as a
genuinely pre-contract round does, and a `RED revision` of the form
`working-tree+<content hash>` is ordered against nothing at all. Left there, the
criterion this contract just made mandatory would stay optional for any new
round willing to write four characters. So the warrant is the round's
`RED revision` **as a commit**, shown to be older than the field:

`Round 1: RED assertion-stripped result: pre-contract — RED observed at <git rev>, an ancestor of <field commit>, which added this field`

- `<git rev>` is a commit — never `working-tree+<content hash>`. A content hash
  has no position in history, so it cannot show the RED came first.
- `<field commit>` is the commit that introduced
  `RED assertion-stripped result` into this project's `.qfai` tree — the
  **oldest** commit that changed its occurrence count in this file:
  `git log --reverse --format=%H -S'RED assertion-stripped result' -- <this file>`,
  first line. **Do not filter that log to added files.** A project that
  already had a `.qfai` tree receives the field as a _modification_ of this
  file, so `--diff-filter=A` matches nothing there and would make
  `pre-contract` unavailable on every project that was ever updated rather
  than initialized after the field.
- The ancestry must be **strict**: `<git rev>` is an ancestor of
  `<field commit>` **and** the two revisions differ —
  `git merge-base --is-ancestor <git rev> <field commit>` plus
  `<git rev> != <field commit>`. `--is-ancestor` alone also holds when the RED
  was taken **on** `<field commit>`, a tree that already carries the field and
  on which the stripped run was therefore takeable. That, and only that, is
  the "before" this value asserts.
- Where the project does not track `.qfai`, there is no such commit and
  `pre-contract` is **unavailable** — nothing in the tree orders the RED
  against the update. So is a round whose `RED revision` is
  `working-tree+<content hash>`. Neither is stranded by that: both take the
  **evidence-migration round** below.
- The round must already hold a complete GREEN pair. A round still at RED can
  take the stripped run now and therefore must — so `pre-contract` on a RED
  being submitted for `red`-phase review is a REVISE, whatever the row's
  `Status`, and a round this cycle opens never qualifies.

A round that cannot show that ancestry has no warrant, and the field is a
REVISE. The way back is a fresh observation, not a weaker warrant: the rework
opens round N+1, whose RED and stripped run are both taken on its own tree. It
grandfathers an observation that has already happened; it is not a value a
round may choose.

## The evidence-migration round

`pre-contract` being unavailable does not make the row unfinishable, and no
reviewer `REVISE` is needed to reopen it. A round whose warrant cannot exist —
the project does not track `.qfai`, or the round's `RED revision` is
`working-tree+<content hash>` — opens one **evidence-migration round**, the
only round whose trigger is the canonical-skills update itself rather than a
finding:

1. Take the row's production behaviour back out of the tree: check out the
   parent of the commit that made the row GREEN, or revert the row's own
   production change on a scratch tree. The row's `Test file` stays as it is,
   so the failure is the row's assertions again.
2. Observe the RED there and take its stripped run on that same tree, both
   exactly as `red-admissibility.md` requires. Then write **the whole of this
   round's RED subject** against that tree — the pair, the stripped run,
   `RED revision`, and `RED test hash` with its manifest wherever the row owes
   one — from the **Round block** list above, which is the only statement of it.
   Step 4 puts the production code back and the tree these fields address stops
   existing, so this is the last moment any of them can be taken.
3. **Submit that RED to `qa-gatekeeper`, routing phase `red`, and obtain its
   verdict here — before the restore.** This round is judged as an ordinary
   round, so it owes the ordinary RED gate an ordinary subject, and the
   completion gate re-asks for that verdict on every round. Restoring first and
   submitting after would put the gatekeeper in front of a tree the RED was not
   observed on, and would close the migration on the one round nobody judged —
   which is the audit gap the migration exists to repair, reproduced by the
   procedure meant to repair it. Nothing here is exempt from the gate: the round
   carries no absence to admit, so a REVISE is answered as it is in any other
   round.
4. Restore the production code and re-run to take this round's GREEN pair.
5. Record the trigger on `Round N: reviewer verdict` as "evidence migration —
   `RED assertion-stripped result` added by the canonical-skills update; round
   N-1 could not warrant `pre-contract`".

It needs no gate of its own — step 3 sends it through the one every round
uses — and it is no bypass: it costs a real RED observation, a real stripped
run and a real verdict, which is the whole of what the field asks for. So
`pre-contract` is **not** available on a migration round — the round exists to
produce the very run it would excuse — and a row takes at most one per field.

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
