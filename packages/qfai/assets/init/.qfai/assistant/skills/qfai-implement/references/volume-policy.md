# Volume Policy

## Why this exists

The per-item ceremony in `SKILL.md` is written for a ledger of tens of rows. At
the volume `/qfai-sdd` and `/qfai-atdd` routinely produce it is arithmetically
unfinishable, and an unfinishable process is abandoned wholesale — taking the
RED/GREEN evidence and the drift discipline with it. Scaling the ceremony is
what keeps those intact; dropping a gate is not on the table.

## Risk tier (derive per row)

Derive the tier from the ledger row's `Layer`, what the item touches, and what
it would cost to get wrong. `/qfai-sdd` Phase 2b derives it once per row, while
it is seeding the row, and writes it to that row's `Tier` column:

| Tier              | Row shape                                                                                                              | Ceremony                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **T1 — standard** | Pure decision logic; unit/component layer; touches no infrastructure, no public API surface, no UI; not critical below | `qa-gatekeeper` confirms RED/GREEN once per coherent group instead of once per row. Reviews are batched the same way (below).     |
| **T2 — elevated** | Touches infrastructure, a public API surface, a contract (`CON-*`), or persisted schema — **or** is critical (below)   | Full per-item ceremony: per-row `qa-gatekeeper` RED and GREEN turns, per-row `completion-reviewer` and `implementation-reviewer`. |
| **T3 — surface**  | Changes UI behavior or rendered output                                                                                 | T2 plus `product-surface-reviewer`.                                                                                               |

The tier lives in the row's own `Tier` column
(`execution-ledger.md#declared-tier-column-optional-seeded-at-ledger-authoring-time`).
It is **not** recorded in `Evidence`: that cell is a pointer rather than a
payload, and it is written last, by the agent whose ceremony the tier decides —
a tier kept there cannot be read before the work it sizes, which is what left
T1 unreachable.

A row whose `Tier` cell is blank or `-` is **T1**: the tier is seeded upstream
now, so an unescalated row is one the seeder found no reason to escalate.

**The column is read per ledger table, not per file.** `/qfai-implement` appends
a table per change request, so one `test-list.md` can hold a freshly seeded
table beside one that predates the column. A ledger **table** whose header
carries no `Tier` is not covered by that default — derive the tier of every row
in _that_ table from the table above before processing it and apply the
criticality tie-break below, whatever a neighbouring table declares. An absent
column is not a claim of T1, and a sibling table's column does not stand in for
the missing one.

### Criticality outranks connectedness

Tiering is not only about what the code is wired to. A row is **T2 regardless of
layer**, even as pure unit-level logic touching nothing else, when it implements:

- an authorization or authentication decision (permission checks, role/scope
  evaluation, token or session validity);
- cryptographic verification (signature, MAC, hash comparison, nonce or replay
  checks, key selection);
- money or accounting arithmetic (pricing, billing, tax, interest, currency
  conversion, ledger balancing);
- data-integrity or safety-critical logic (irreversible mutation and deletion
  rules, quota and rate limits, PII redaction or retention, consent
  enforcement, idempotency keys).

Cheap to connect is not the same as cheap to get wrong. When it is arguable
whether a row is critical, it is critical.

### Routing is unchanged

The tier scales **how often** a gate runs, never **whether** it runs.
`agent-routing.yml` keeps `qa-gatekeeper`, `completion-reviewer` and
`implementation-reviewer` all **mandatory** for `qfai-implement`; T1 only
changes the submitted unit from one row to one coherent group. Every row is
still covered by a live turn from each of those agents, and a group that has
not been confirmed leaves all of its members short of the 12-point gate.

`blocking_agents` lists all three, so a `REVISE` from any of them blocks
`done`; item 8 of the 12-point gate requires the `implementation-reviewer` PASS
on the same terms. The two lists agree on **who** blocks — they differ in
**what** they authorise. Read the 12-point gate as the authority for an item
transition; `blocking_agents` governs phase progression, not the ledger write.

## Batched review

For T1 rows, run **one** `completion-reviewer` pass and **one**
`implementation-reviewer` pass per _coherent group_ — the set of items that
share one `BR-Ref` value — instead of one pass per item. The group key is a
ledger column (`execution-ledger.md#group-key-column-optional-required-for-t1-batching`)
precisely so every operation below is a predicate over the row, not over a join
the runner would have to redo, differently, on each row selection. The group is
the review unit:

- record the group's member `TDD-ID`s as a single block in the evidence file;
- a `REVISE` on the group blocks every member until it is resolved;
- a group must not mix tiers; a T2 or T3 row is always reviewed alone.

### Group formation (states and transitions)

Batching adds **no** status value. It adds exactly **one** lifecycle edge, the
`refactor -> red` QA rejection recovery in `SKILL.md`, because confirming
RED/GREEN after the row has left `red` is only meaningful if a rejected row can
redo it. A T1 row whose refactor verify is GREEN sits in `refactor` — that is
the review-ready state — and waits there for its group. Members still move
`refactor -> done`, only together.

- **Open** the group when a T1 row reaches `refactor` and no group is open. Its
  `BR-Ref` value becomes the group's key. `-` is **not** a shared key, and an
  **empty cell reads exactly as `-`** — the validator treats the two as one
  legal "not resolved" state, so this rule must too. A row carrying either
  opens a group of one that closes the moment that row reaches `refactor`,
  however many other unresolved rows the ledger holds. Reading `-` (or `""`) as
  one key would merge rows no `BR` relates and, with a second unresolved row
  still `todo`, leave both close conditions below false.
- **Resume** before anything else. Open is an event, and an interrupted run
  loses events: if the last member reached `refactor` and the process stopped
  before the review, the ledger holds only `refactor` rows, no group is open,
  and nothing fires Open again — Phase Red selects `review-fix` and `todo` rows
  only, so those members would sit at `refactor` for good. So **at the start of
  a run, if no group is open and any T1 row is at `refactor` with its group
  unreviewed, reopen the group on the `BR-Ref` of the first such row in ledger
  order** and continue from Fill. The ledger is the durable state; nothing else
  has to be persisted, because `Status = refactor` on a T1 row already means
  "in-flight member of a group that has not been reviewed". A `refactor` row
  whose group was reviewed has moved to `done` with the rest, so it cannot be
  picked up twice. `-` and empty-cell rows reopen as the group of one they
  always were, and close immediately.
- **Fill** it by continuing to process the ledger's remaining T1 rows carrying
  that same `BR-Ref`, one item at a time. **While a group is open, this
  selection outranks ledger order**: `SKILL.md` Phase Red step 1 takes the
  first `todo` row carrying the **open key**, not the first `todo` row in the
  ledger. Keys need not be contiguous, so on `BR-A, BR-B, BR-A` the positional
  pick is the `B` — which can neither join the open `A` group nor open one of
  its own, while the `A` below it holds that group open. Selection returns to
  ledger order only once no `todo` T1 row carries the key, and the second close
  condition has closed the group by then. **It outranks the named-row override
  too.** `SKILL.md`'s "a named row wins" is a selection rule, not a licence to
  strand one: a named T1 row whose `BR-Ref` differs from the open key is
  **deferred** until the group closes, then processed in the order given. Open
  fires on a T1 row _reaching_ `refactor` while no group is open — an event,
  not a state — so a differently-keyed row driven to `refactor` underneath an
  open group can neither join it nor be offered one later, and sits at
  `refactor` permanently. Deferral cannot deadlock: both close conditions read
  the open key's own T1 rows, so the group closes without the deferred row. A
  named row carrying the open key is an ordinary member; a named T2 / T3 row is
  reviewed alone and is never deferred. The one-item-at-a-time constraint is
  about the Red/Green cycle: at most one row is in `red` or `green` at any
  moment. A row parked in `refactor` is an in-flight member of the **open**
  group, not an abandoned item, so parking is not a violation of that
  constraint.
- **Close** the group — this is the review-start condition — at whichever comes
  first: every **T1** row carrying the key has reached `refactor`; no `todo`
  **T1** row carrying the key remains **anywhere** in the ledger (the rest are
  parked in `blocked` / `exception` and will not reach `refactor`); the ledger
  has no `todo` rows left. A group never spans a spec, so finishing a ledger
  also closes the open group.
- The keyed conditions scan the **whole** ledger, not the next `todo` row.
  Ledger order need not put one key's rows together, and the default serial run
  walks it in order (`references/parallelization-policy.md`), so on
  `BR-A, BR-B, BR-A` "the next `todo` row carries a different `BR-Ref`" is true
  while an unprocessed `A` still sits below it. Closing there opens a second
  group on the same key later, which breaks both "one review per `BR-Ref`" and
  the batch reduction it buys.
- Both keyed conditions read **T1 members only**. Tier is derived per row, so
  one `BR-Ref` can hold T2 and T3 rows as well; those are reviewed alone and
  neither join the group nor hold it open. Counting them as members strands it:
  Fill advances only the key's remaining T1 rows, so a `todo` T2 row sharing the
  key leaves both keyed conditions false at once — the group never closes, and
  no member ever reaches `done`.
- The last close condition is a **terminator, not a grouping rule**. It closes
  whatever group is still open when the ledger runs out. A run that reaches it
  without ever having closed a group on one of the other two has batched the
  whole spec into one group — which mixes every tier the ledger holds and is
  already forbidden above.
- **Re-verify every member on the closed tree, before the reviews.** A member
  parked in `refactor` recorded its `Refactor verify revision` against the tree
  as it stood then, and every later member's production or test change moves
  that address by construction. The group's single `completion-reviewer` /
  `implementation-reviewer` pass reads the closed tree, so without this step the
  earlier members' item 6 names a revision the two verdicts do not, and gate
  item 10 — items 6, 7 and 8 name the **same** revision
  (`references/evidence-revision.md`) — could never be satisfied for them. On
  close, re-run each member's relevant test suite once on the closed tree and
  refresh all three of its `Refactor verify` fields — `command`, `result` and
  `revision` — the same refresh a behaviour-preserving rework requires
  (`references/round-evidence.md`). One narrow run per member, not a full suite:
  the group's checkpoint below is what covers them jointly. A member whose
  re-verify is not GREEN stops the close, and it is the group that waits.
- **Review** on close: one `qa-gatekeeper` turn over the members' recorded
  RED/GREEN evidence, one `completion-reviewer` pass, one
  `implementation-reviewer` pass. On `REVISE` no member goes `done`; where the
  faulted member goes depends on what was faulted:
  - `completion-reviewer` / `implementation-reviewer` `REVISE`, or a
    `qa-gatekeeper` `REVISE` about how the evidence was **written** — fix in
    place; the member stays in `refactor` and the refactor verify re-runs.
  - `qa-gatekeeper` `REVISE` rejecting the **cycle** (the RED never failed, or
    failed for the wrong reason) — that member takes the `refactor -> red` QA
    rejection recovery, cites the verdict in `Evidence`, and re-runs its
    micro-cycle. The group stays open and is reviewed again on close. Leaving it
    in `refactor` instead would strand it: forward-only means it could never
    redo the RED the gatekeeper rejected.
- **Checkpoint, then the ledger write.** Reviews passing is not the last gate:
  `SKILL.md` Refactor step 5 and the gate item that cites
  `SKILL.md#checkpoint-verification` (item 12 of the 12-point gate) both require
  checkpoint verification to pass **before** a row becomes `done`. Run it once
  for the group after the three reviews return PASS, and only then transition
  every member `refactor -> done` in the same ledger write. A failing checkpoint
  leaves the whole group in `refactor` — no member goes `done` on a regression
  the checkpoint would have caught.
- A group left open when the run ends is a completion prohibition: rows still in
  `refactor` already block spec-level completion.

### When the ledger carries no `BR-Ref` column

A ledger seeded before the column existed has no key, and every predicate above
is unevaluable against it. Do **not** fall through to "the ledger has no `todo`
rows left": that is the terminator, and using it as the grouping rule makes the
whole spec one group. Pick one of two, in this order:

1. Reseed the ledger through `/qfai-sdd` Phase 2b, which fills `BR-Ref`. This is
   a schema addition — it writes no `Status` or `Evidence` cell — so it is not
   the regeneration the ledger's delta rule forbids.
2. Resolve the key yourself, once per row, by the procedure
   `execution-ledger.md` states (`TC-Refs` -> the TC's `EX-Ref` in
   `06_Test-Cases.md` -> that `EX`'s `BR-Ref` in `05_Examples.md`, which may
   itself name several `BR-*`; only a TC with no `EX-Ref` falls back to its
   `AC-Refs` -> every `BR` whose `AC-Refs` names one of them in
   `04_Business-Rules.md`; the lowest-numbered `BR-*` of the whole union wins),
   and record the group's key next to its member `TDD-ID`s in the evidence
   file. The tie-break is what makes the answer the same for the next agent
   that reads the same rows.

When neither is available — no `04_Business-Rules.md`, or no `BR` reaches the
row — every T1 row is its own group and is reviewed alone. That costs the
batching, not the gate.

## Multi-spec queue

Auto-discovery may accept **several** specs and process them **one spec at a
time**, in the order the user confirms. This is a queue, not parallelism: the
one-spec-at-a-time and one-item-at-a-time constraints are unchanged. It removes
the "invoke the skill eight times by hand" tax without touching the parallelism
question.

### Advancing the queue

The queue is only a queue if the skill walks it. Record the confirmed order
once, then after each ledger:

1. Close the spec normally — report its result, and satisfy the spec completion
   conditions or report the blockers. `exception` rows do not stop the queue;
   they are reported with their DR-IDs and carried into the final summary.
2. Look at the remaining queue. **Empty -> exit.** Otherwise announce the next
   `spec-id` and **re-validate the frame before loading its ledger.** The plan
   was fixed before the first row of the first spec moved (`plan-phase.md`), and
   the specs ahead of this one have since written production code and may have
   opened Change Requests, so check the two inputs that pass was taken over:
   - the **in-scope `CR-*` set** for this spec — re-run step 1 of
     `change-request-reset.md#the-mandatory-preflight` and compare it with what
     the `plan` pass enumerated;
   - the **revision** the plan was taken against, by the procedure in
     `evidence-revision.md#the-field`, against the tree as it stands now.

   **Both unchanged -> reuse the plan.** Load the spec's `test-list.md` and
   restart at Phase: Red — **inside the plan already fixed for that spec**: the
   tiers, groups, dispatch decision and row order it runs under are the ones
   that pass returned, and the transition re-enters neither Stage 0 nor `plan`.
   That is the ordinary path and what `iteration: per-invocation` buys.

   **Either moved -> re-enter Stage 0 step 2 and `plan`** over the specs still
   queued, and run this one inside the plan that pass returns. A `CR-*` created
   or approved mid-run has had no reset applied to it, so the old plan moves
   rows an approved reset had already invalidated; and an earlier spec's edits
   move the import graph the dependency order, the risk tiers and the
   **parallel dispatch** decision were derived from, so the old plan can license
   a parallel run against a dependency graph that no longer exists. Record which
   of the two fired in `.qfai/evidence/implement-<spec-id>.md`.

   Re-entry on a moved frame is **not** the per-ledger iteration
   `per-invocation` rules out: it is the same re-entry a blocking
   `delivery-planner` REVISE already takes (`plan-phase.md`), and the check
   above is the only thing that reaches it.

3. "Report and exit" in CRITICAL CONSTRAINTS applies per ledger, not per run: a
   ledger whose rows are all `done` yields "nothing to do" **for that spec** and
   the queue advances past it rather than ending the run.
4. Exit only after the last queued spec, with a summary naming every processed
   spec and its outcome.

A queue entry is never skipped silently: a spec that cannot be started (missing
ledger, unresolved Change Request) is reported as blocked and the queue moves
on to the next entry. That determination is made in the `plan` phase, which
read every queued ledger, so it is surfaced up front rather than discovered
when the queue reaches the entry — for everything knowable at that point. A
spec the step-2 re-validation newly blocks, because the run itself raised the
unresolved Change Request, is reported at that transition instead: the up-front
pass cannot have judged a CR that did not exist when it ran.

## Cost visibility

Before starting, state the implied cost: rows × gate cycles at the derived
tiers. If the ledger exceeds ~50 rows, surface that number to the user before
processing begins, and offer T1 batching explicitly.
