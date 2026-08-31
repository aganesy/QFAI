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
- `Round N: Interrupted RED revision` / `Round N: Interrupted RED test hash`
  (with its manifest) / `Round N: Interrupted RED command` /
  `Round N: Interrupted RED result` — **only on a round a resumption re-observed
  the RED into** (`#what-opens-a-round`): the RED run the block interrupted,
  moved here verbatim **before** the fresh run is written over the round's own
  RED fields. That interrupted run was a real execution of this row's RED gate,
  already submitted to `qa-gatekeeper`, and `qfai-implement/SKILL.md`
  "Evidence hard rules" requires every run of the same gate to be reported in
  order — so re-observing into the same fields with nothing moved aside
  deletes an audited observation and reports the second run as if it were the
  only one. **It mirrors the round's own RED fields one for one, the
  `RED test hash` and its manifest included**: those two pin the test content
  and the fixtures the run executed, and the fresh RED overwrites them like
  every other RED field, so moving the revision, command and result alone
  preserves a run with no way left to say what it ran. **A round whose RED
  observation was the falsifiability trio moves the trio, not a RED pair**:
  `Round N: Interrupted RED Satisfied-by` /
  `Round N: Interrupted Falsifiability command` /
  `Round N: Interrupted Falsifiability result`, plus
  `Round N: Interrupted RED failure mode` wherever the round recorded one. The
  group mirrors whichever form the round actually held; writing the interrupted
  run into RED-pair fields alone loses which predicate was broken and loses that
  the observation was a falsifiability one at all, and neither is recoverable
  from the fresh run that overwrote the live fields.
  Repeat the group,
  oldest first, when a row was blocked at `red` more than once. **It is absent
  when the block interrupted no run at all** — a row blocked at `red` before
  its RED was observed has nothing to move here, and an empty group would
  report an execution that never happened (`#what-opens-a-round`).
  **A verdict already recorded against the moved run is recomputed from this
  group, not from the round's live RED fields** — the group is that
  observation's audit subject once it has been moved, so the earlier `PASS`
  stays reproducible instead of going stale against a run it never read
  (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md`)
- `Round N: GREEN command` — the exact command executed to observe success
- `Round N: GREEN result` — the success output
- `Round N: reviewer verdict` — the verdict that closed the round (`PASS`, or
  `REVISE` plus the finding, and which rework path it took). Absent on round 1
  when no review has run yet.
- `Round N: Resumed-from-blocked` — **on the round a `blocked` -> `todo`
  resumption wrote into, or on the highest existing round when the resumption
  opened none** (`#what-opens-a-round`): the blocker and the status the row was
  blocked at
  (`CR-20260421-0004 — blocked at green`), **copied whole out of `Blocked-By`**
  before that transition clears it. Both halves are already in that cell: the
  `Any active status -> blocked` transition writes them together
  (`execution-ledger.md#obligation-columns-optional-required-by-layer`), which
  is what makes this field a copy rather than a reconstruction — the departure
  status stops being observable the moment the row sits at `blocked`, so a
  resumption in a later session has nothing to derive it from.
  `Blocked-By` is a ledger column the row holds
  only while it is `blocked`, so without this field a resumption leaves no
  trace once the row moves on, and the two ways a row arrives at `todo`
  carrying a retained GREEN — this resumption and an approved upstream reset —
  are indistinguishable afterwards. It is what makes the self-reference
  `red-not-observable.md` opens to a resumed row checkable; a round without it
  was not written by a resumption and that form is closed to the row.

## What opens a round

Round 1 is the original RED/GREEN cycle. Each blocking reviewer `REVISE` that
requires new production behaviour adds a round. A `REVISE` that needs none
(naming, duplication, comments) opens no round and is verified by a refreshed
`Refactor verify` pair instead. Rounds are numbered and repeatable, not appended
as free prose.

**A row resumed from `blocked` writes into a round too — which one depends on
whether the block left a round open.** `blocked` is reachable from any active
status (`execution-ledger.md#allowed-transitions`), so a row can be stopped
either before or after a round was closed by its GREEN pair, and
`blocked -> todo` restarts its cycle. **The departure status is what names the
case**, read from `Round N: Resumed-from-blocked` once the resumption has
copied it out of `Blocked-By`. Every status the widened edge admits has a case
here; a departure this list did not cover would leave the resumed cycle with no
round to write into, which is a row that cannot legally reach `done`.

- **Blocked at `green` or `refactor`** — the round it was in holds both pairs
  and is closed. The resumed cycle is the **next round**, not a second round 1:
  overwriting the earlier pair would erase the only record of what was observed
  before the blocker.
- **Blocked at `red`** — the round it was in was open when the block landed, so
  the resumed cycle **continues that unfinished round**. Opening the next round
  instead would strand this one without the GREEN pair "one block per RED/GREEN
  cycle" requires, and no gate can read a round in that state. **What the
  continuation does about the RED depends on whether one had been observed**,
  because `qfai-implement/SKILL.md` Phase Red writes `todo -> red` at step 2 and
  observes the RED at step 4 — a blocker found while the test is still being
  authored parks the row at `red` with the round holding no RED at all:
  - **The round holds a RED pair** (or the falsifiability trio that stands in
    its place) — move that run into the round's `Interrupted RED` group,
    re-observe the RED into the round's own RED fields, and close it with the
    GREEN pair. Re-observing over its RED pair is not the problem the field list
    names of one address held by two rounds: there is still exactly one round,
    and the address it recorded is **retained beside** the fresh one rather than
    replaced.
  - **The round holds neither** — the block interrupted the test authoring, not
    a run. Write the RED into the round's own RED fields as its first
    observation and close it with the GREEN pair; **no `Interrupted RED` group
    is written**, because that group holds a run that happened and there is
    none. Requiring the move unconditionally left this row with nothing to move
    and so no legal way to resume the round it is sitting on.
- **Blocked at `review-fix`** — the status alone does not say how far the
  rework got, because it does not change across the rework
  (`#where-the-rounds-happen`), so the **round** decides which of the cases
  above applies. A rework round that had taken its RED and not its GREEN is the
  `red` case: continue it, `Interrupted RED` group included. **A highest round
  that holds both pairs but carries no reviewer verdict of its own is the
  rework's round, finished and not yet re-submitted** — the review is requested
  at `refactor` (`qfai-implement/SKILL.md`), so a block taken between the GREEN
  and that return leaves exactly this shape. The resumed cycle **opens no
  round**: this one is complete, and `Round N: Resumed-from-blocked` goes on it.
  Take the row back to `refactor` and re-submit, as the ordinary `review-fix` ->
  `refactor` return does. Reading this state as "the rework had not opened a
  round" sent the resumption to a verdict that does not exist yet, and either
  stranded the row or opened a duplicate round over finished work.
  A highest round
  already closed by its GREEN pair **and carrying its own verdict** means the
  rework had not opened a round, and
  **which of the two rework paths it was on is what says whether the resumption
  opens one** — read that off `Round N: reviewer verdict` on that round, which
  records the finding _and the path it took_ for exactly this reason:
  - **The path that opens a round** — the `REVISE` needed new production
    behaviour. The resumed cycle opens the **next round**, as the
    `green` / `refactor` case does.
  - **The path that opens none**
    (`#a-revise-that-needs-no-new-production-behaviour` — naming, duplication, a
    comment) — the resumption **opens none either**. It picks that path up where
    the block stopped it: make the change, re-run the item's tests, refresh the
    `Refactor verify` pair, and return to `refactor`. Sending this row to a next
    round would demand a fresh RED for rework that has no RED phase; the test
    passes against the row's own untouched implementation, and the
    self-reference of `red-not-observable.md` is open only where the departure
    status names a round a GREEN pair closed — so the row would fall to
    "anything else" and `exception`, the dead end this list exists to prevent.
    `Round N: Resumed-from-blocked` goes on the highest existing round, the one
    the `REVISE` closed, since the resumption writes no new one.

  **The `REVISE` is not discharged by the resumption** on either path: the
  restarted work re-submits at `refactor` as the ordinary `review-fix` ->
  `refactor` return does, and the reviewer verdict on the round that `REVISE`
  closed still names the finding the rework owes.

- **Blocked at `todo`** — no round was open, so the resumed cycle is the row's
  **next** round: round 1 on a row that carries none, and the number after the
  highest on a row that already carries rounds. **Unless the highest round holds
  nothing but `Resumed-from-blocked`** — a resumption writes that field before
  the fresh RED it owes, so a row blocked again while still at `todo` leaves a
  round opened and empty. That round is unfinished, not closed: the next
  resumption **continues it**, appending its blocker to the field and writing
  its RED/GREEN pair into it. Opening the number after it instead would strand a
  round that can never take the RED/GREEN pair "one block per RED/GREEN cycle"
  requires, once per repeat.
  A row at `todo` is not always
  one that never ran — an approved upstream reset and `exception` -> `todo`
  both return a row to `todo` with its earlier rounds retained
  (`execution-ledger.md#allowed-transitions`), and it can be blocked again
  before it takes its fresh RED. Numbering that resumption round 1 would write
  `Resumed-from-blocked` and a new RED/GREEN pair into a `Round 1` that already
  describes the pre-reset obligation, either overwriting that record or mixing
  two cycles under one number.

In every case the rounds recorded before the block are retained, and
`Round N: Resumed-from-blocked` is written on the round the resumption writes
into — or, on the one path that opens no round, on the highest existing round.

Every field in a round block carries the `Round N:` prefix, and **this list
is the whole of it** — `Revision`, the RED pair (or the falsifiability trio in
its place), the GREEN pair, the reviewer verdict, `Resumed-from-blocked` on
a round a resumption wrote into (or the highest existing round when it opened
none), and the `Interrupted RED` group on a round a resumption re-observed the
RED into — in whichever of the two forms that round's own observation took. Row-level fields are not round
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

**A block taken while on this path resumes on it.** `blocked` is reachable from
`review-fix` (`execution-ledger.md#allowed-transitions`), and step 4's record of
the path taken is what a later session reads to come back here rather than
opening a round this rework has no RED for (`#what-opens-a-round`).

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
