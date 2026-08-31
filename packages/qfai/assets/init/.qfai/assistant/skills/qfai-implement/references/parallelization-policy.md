# Parallelization Policy

Full rules for item-level parallelism inside one spec. `qfai-implement/SKILL.md`
carries the summary and the precedence statement.

## Scope of this policy

- **Cross-spec parallelism is barred.** One spec per invocation, always. This
  is the Non-goal above and it is not approvable.
- **Item-level parallelism inside one spec** is what the rest of this section
  governs. `parallel_groups: []` in `agent-routing.yml` describes **role
  fan-out within a phase**, not item dispatch; it neither permits nor forbids
  what this section decides.

## Gates and precedence

Two gates apply, and **both must hold**:

1. **Technical gate** — the conditions below. Adjudicated by
   `delivery-planner`, which is the sole authority for authorizing parallel
   dispatch.
2. **Consent gate** — explicit user approval.

**Precedence: user approval cannot override a technical DENY.** A DENY from
`delivery-planner` ends the question; approval is only sought after the
technical gate passes.

- **Default**: Serial execution. Items are processed one test at a time in `test-list.md` order.
- Serial execution ensures that each test is written and verified in isolation before moving to the next.

## Allow conditions (all must be true)

Stated as **concurrent write conflicts**, not as the existence of shared
things. A read-only fixture module or a DI container that every item constructs
independently does not veto the policy; a shared database is resolved by
per-worker schema isolation, not by a blanket deny.

- **Every concurrently dispatched row declares an `Owning module`**, and no two
  of them declare the same one. This is the operational form of the next
  bullet: under RED-first the source module does not exist yet, so the only
  thing that can be compared before dispatch is what each row _declares_ it
  will write (`execution-ledger.md#declared-seam-column-optional-required-for-parallel-dispatch`).
  A row carrying `-` in that column is not eligible for parallel dispatch.
- No two concurrently dispatched items **write** the same source module.
- No two concurrently dispatched items **write** the same test module.
- No item **writes** a module that another concurrently dispatched item's test
  or implementation **reads**. A write/read overlap is a conflict even when no
  two items write the same file: the reader's RED/GREEN would observe a
  half-applied module and become timing-dependent.
- No two concurrently dispatched items **mutate** the same fixture instance,
  singleton instance, or DI container instance. (Constructing a fresh instance
  per item is fine.)
- No two concurrently dispatched items **write** the same schema or the same
  database rows. Per-worker schema or database isolation satisfies this.
- No two concurrently dispatched items contend for the same **external runtime
  resource**. Worktree separation isolates the checkout and the index and
  nothing else, so these live outside it and must be checked explicitly:
  - fixed TCP/UDP ports the items' tests bind;
  - absolute or `os.tmpdir()`-rooted paths written outside the worktree;
  - external caches, queues, brokers, containers and other daemons;
  - environment variables and OS-global state the tests set.

  Satisfy it either by a **disjoint write set** (each item owns different
  ports/paths/keys) or by **per-worker isolation** (ephemeral port 0, a
  `mkdtemp` directory per worker, a namespaced cache/queue prefix). A resource
  neither disjoint nor isolated is a DENY: `constitution/workflow.md#concurrency-stage-independent-mandatory`
  requires no shared state, and the collision would appear at run time as a
  flaky RED/GREEN rather than at adjudication.

- No sequential dependency: item B does not consume item A's output.
- A post-merge integration verify plan exists.

Read dependencies are enumerated from the declared write sets: for every write
target, `delivery-planner` resolves the importers reachable from the other
items' test and implementation files. An import graph that cannot be resolved
is a DENY, because the independence claim then has no concrete evidence.

## Isolation requirement (worktree separation)

Adjudicated separately from the "all must be true" list above, and **not
waivable**. Per `constitution/workflow.md#concurrency-stage-independent-mandatory`,
worktree separation is required for parallel execution, so
`delivery-planner` has two outcomes, not three:

- **Separate worktrees in force** (one worker per `git worktree`, one index
  each) -> requirement met.
- **Anything else -> DENY.** Record the reason in the dispatch decision and run
  the items serially.

A branch is **not** a substitute. Branch separation still shares one working
tree and one index: workers observe each other's half-written files and
generated artifacts, which is exactly the hidden coupling the requirement
exists to prevent, and a sweeping stage command would commit a sibling's
in-flight files.

Worktree separation is also **not sufficient on its own**. It separates the
checkout and the index; ports, out-of-worktree paths and external services stay
shared across workers. The external-runtime-resource condition in the allow
list covers those, and it is evaluated whether or not worktrees are in force.

qfai does not provision worktrees itself, so in practice this exception stays
unreachable until the operator (or the orchestrator, explicitly) creates one
worktree per worker. That is the intended outcome: serial execution is the
correct behavior when isolation cannot be guaranteed, and an unreachable
exception is preferable to a documented way around an upstream SSOT rule.

## Deny conditions (any one blocks parallel dispatch)

- Two concurrently dispatched items share the same behavior's Red/Green/Refactor cycle.
- Two concurrently dispatched items declare the same `Owning module`, or either
  of them declares none.
- Two concurrently dispatched items modify the same public API surface. Before
  RED this is evaluated over the declared seams; the surface itself does not
  exist yet.
- Two concurrently dispatched items write the same shared fixture, shared mock,
  or shared global setup **file**. (A shared fixture module that neither item
  writes and each consumes read-only is not a deny — see the allow conditions.)
- Two concurrently dispatched items bind the same fixed port, write the same
  out-of-worktree path, or share an un-namespaced external cache/queue.
- Sequential dependency: "A must finish before B has meaning".
- The independence claim cannot be explained with concrete file/module
  evidence. Before RED that evidence is the rows' declared `Owning module`
  values — not the source tree, which does not yet contain the modules under
  discussion. **If the ledger carries no `Owning module` column, the allow
  conditions cannot be evaluated at all**, and parallel dispatch is permitted
  only for slices whose seams already exist in the repository. "The test files
  differ" is not an independence claim.

## Seam reconciliation (after a parallel run)

The post-merge integration verify detects a broken build. It does not detect
two slices deciding the same thing twice under two names in one module, which
is the outcome the deny conditions exist to prevent — and that outcome can
leave the suite green.

So after the slices merge, and **independently of whether the merged suite
passes**:

1. For each slice, list the `src/` paths it actually touched
   (`git diff --name-only <base>..<slice-head> -- <source root>`).
2. Compare that list against the slice's declared `Owning module`.
3. Report every touched path that no slice declared, and every path touched by
   more than one slice, as a **deny-condition breach**. It is a breach whether
   or not anything broke: the gate was passed on a claim that turned out to be
   false, so the next authorization is being made on the same basis.
4. A breach does not automatically roll back a green merge. It does require the
   overlapping modules to be re-read for duplicated behaviour, and the finding
   to be recorded before `delivery-planner` authorizes another parallel run.

## Ledger ownership

`.qfai/specs/<spec-id>/tdd/test-list.md` has exactly one writer: the
**orchestrator**, in the **trunk**. Both `SKILL.md` citation sites reach this
section by the `#ledger-ownership` anchor, so the whole rule — serial and
parallel — lives under this one heading. A second top-level section restating it
is what let the two halves drift apart.

This is not a style preference. Delegation is mandatory and the orchestrator may
not write code, so the only role that ever observes RED/GREEN is the
implementation agent — and the ledger it would have to write lives _inside_ the
tree that worktree separation copies. N workers would each hold a private copy of
the one table that is the completion gate, and merging them is a text merge of
the artifact the gate reads.

So:

- Parallel workers **MUST NOT** edit `.qfai/specs/<spec-id>/tdd/**`. Their
  worktree copy is read-only for the duration of the slice. This is the scope of
  the prohibition: it is the whole `tdd/` subtree, not `test-list.md` alone.
- Each worker returns, per item it processed: `TDD-ID`, final `Status`, its
  `DR-ID` where the item's status requires one, and the `Evidence` payload
  carrying **every** field of
  `../SKILL.md#per-item-evidence-contract-fresh-evidence-required` — the parent
  directory, because this file lives in `references/`. That contract is
  the only statement of the field list — `Status` and `DR-ID` are ledger cells
  rather than contract fields, which is why they are named here and the fields
  are not. Do not restate the list in this file: an enumeration maintained in two
  places is what went stale, and a worker returning the short copy returns a
  block the next bullet rejects.
- The orchestrator writes those rows into the trunk ledger during
  `../SKILL.md#post-parallel-integration-verify`, before the verify runs.
- A merged item whose row is still `todo` fails that verify. Silence there is
  indistinguishable from work that was never done.

In serial mode the same rule holds with no merge step: the implementation agent
returns Status + Evidence, the orchestrator writes them.

### Coordinated parallel mode

When parallel dispatch is authorized the single-writer rule above applies
unchanged. Two consequences are specific to dispatch:

- Item 10 of the 12-point gate is satisfied by the orchestrator applying a
  **complete** evidence block to the row, not by the worker writing it. A block
  missing any contract field does not satisfy item 10: the orchestrator obtains
  the missing fields first, and the row stays out of `done` until it has them.
- Some contract fields are **not** obtainable that way. Each names a tree that
  no longer exists after the merge, so the worker takes it while that tree is
  still there — before the revert, in its own worktree — and returns it with the
  block. **Which one is required is decided by the row's branch**: demanding the
  other branch's field rejects a conforming block just as surely as accepting a
  missing one lets an unprovable row through.
  - A row **with a RED pair** returns `RED revision` in every round block. A RED
    is observed before the code that makes it pass exists, so on an uncommitted
    tree Phase Green moves the content address by construction and the merged
    trunk no longer holds the tree the RED named. This is the ordinary
    `observed-red` row, not a special case (`evidence-revision.md`).
  - A **`falsifiability`** row returns `Falsifiability revision` **in place of**
    it: its observation is the mutation run that Phase Red step 3c reverts. An
    `observed-red` row has no such field, so requiring it there sends back a row
    that is already complete.
  - A row whose proof was re-taken after a **test-only replacement** returns
    `Replacement proof revision` too — _beside_ its `RED revision`, not instead
    of it. It names the temporary tree the replacement test's mutation proof ran
    against, which is why the contract gives it a field of its own rather than
    letting it overwrite the original RED's address
    (`../SKILL.md#per-item-evidence-contract-fresh-evidence-required`). That
    tree is no more reconstructible from the merged trunk than the other two,
    so a rework row is un-recoverable in the same way — and only a rework row
    is: a row with no replacement owes nothing here.

  `Oracle proof` is **not** in this class, though the orchestrator cannot
  produce it alone either, since it may not write code. The contract gives it no
  revision field of its own, so it rides the row's final `Revision` together
  with the GREEN and the two reviews, and step 2 below re-takes it on the
  integrated tree by **re-delegating** the mutation. The one row that owes no
  separate entry is the one the contract already exempts: a row on the _RED not
  observable_ path satisfies `Oracle proof` with its falsifiability fields
  (`oracle-strength.md`).

  A block missing the field **its own branch** requires goes back to the worker
  that produced it, not to the orchestrator's recovery path — and that return
  path exists only while that worker's worktree does, which is what the next
  subsection sequences.

#### Check completeness before the merge, re-take the rest after it

The two remedies above have opposite deadlines. Run them in one order or a
merged row can never reach `done`:

1. **Before the merge, and before any slice worktree is removed**, the
   orchestrator validates every returned block against the field list the row's
   own branch selects — including `Replacement proof revision` where the row
   took a test-only replacement. A short block goes back to its worker
   **there**, while the tree its missing field names still stands. Afterwards no
   one can re-take `RED revision`, `Falsifiability revision` or
   `Replacement proof revision`: the tree each named is not reconstructible from
   the trunk, and the orchestrator may not write code. So an incomplete block
   blocks the **merge**, which is recoverable, rather than the row, which by
   then is not.
2. **After the merge**, the trunk is a different revision from every slice
   worktree — the sibling slices landed in it. Every field that must name the
   state the item finally landed at is therefore stale on arrival however
   complete the block is: the GREEN `Revision` and the `Oracle proof` bound to
   it, each reviewer's `Reviewed revision` and `Audited evidence hash`, the
   `Round N: Review pack` and its `Round N: Review pack seal`, and all three
   checkpoint verification fields. Gate item 10 requires items 5, 7 and 8 to
   agree on one revision, so applying the worker's payload verbatim leaves every
   merged row unable to reach `done`
   (`evidence-revision.md#what-makes-evidence-stale`). **Re-take those
   observations on the integrated tree** and write the refreshed values into the
   row:
   - **The GREEN and the `Oracle proof` together.** Item 5 is one observation of
     one tree, and `Oracle proof` has no revision field of its own, so keeping
     the slice's mutation result beside a re-run GREEN either backdates it to a
     tree the row never landed at or leaves item 5 stale. Re-delegate the
     mutation and its immediate revert to the implementation agent in the
     integrated worktree, and have `qa-gatekeeper` confirm both. A _RED not
     observable_ row owes nothing here: its falsifiability fields already
     satisfy item 5, and those are step 1's to preserve.
   - **Both reviewers, and the pack each round writes.** A re-dispatch is a new
     review round, so it produces a new `review-<timestamp>/`
     (`review-artifact-layout.md`). Replace `Round N: Review pack` **and**
     `Round N: Review pack seal` as a pair: a new seal under the old path makes
     gate item 10 recompute over a different directory and mismatch, and the old
     seal under the new path leaves the fresh verdict unprotected
     (`evidence-revision.md`).
   - **The checkpoint verification, re-run.** Its seal is an audit hash over the
     recorded command and result _together with_ the `Revision` the checkpoint
     ran against, so refreshing `Revision` alone breaks the seal, and refreshing
     neither leaves item 12 ruling on the worker's private tree. Re-run the
     per-item command set on the integrated tree and replace
     `Checkpoint verification command`, `Checkpoint verification result` and
     `Checkpoint verification seal` (`checkpoint-verification.md`).

   All of it is re-observation, not new code, so it stays inside the
   orchestrator's delegation. Post-merge integration verify does not cover it:
   it rules on the merged suite, not on each row's audit trail.

3. **After the last integration-verify remedy, run step 2 again — over every
   merged item, not only the slice that was faulted.** Any remedy under
   `#failed-integration-verify` edits code or tests, and a revision addresses
   the whole tree, so the observations step 2 just took are stale again by the
   rule that made the slice payloads stale. "The change was unrelated" is not an
   exemption — whether it was unrelated is the judgement the field exists to
   remove (`evidence-revision.md#what-makes-evidence-stale`). Order it so the
   re-take is the **last** thing before the rows go to `done`: a verify that
   passes first time costs one pass, and each further remedy round costs
   another.

`RED revision`, `Falsifiability revision` and `Replacement proof revision` are
exempt from steps 2 and 3 and carry over unchanged — they are transient
observations that name their own tree by design
(`evidence-revision.md#a-transient-observation-names-its-own-revision`). That
exemption is exactly why step 1 has a deadline: they are the only fields the
later steps cannot regenerate.

## Failed integration verify

The old rule was one unconditional destructive branch — "flag all slices for
re-examination and roll back the merge" — with no step attributing the failure to
anything. That contradicts the Gate Failure Autorepair Protocol the skill
imports twenty lines later, which classifies this class as a local,
non-destructive code/test defect to fix and re-run, and reserves stopping for
_destructive_ changes. It also contradicts the forward-only lifecycle, and never
said what happened to the rolled-back items' statuses.

Classify first, then apply the matching remedy.

### 1. Defect outside every merged slice

A stale fixture, a stale composition helper, a shared factory none of the slices
declared. **Fix locally and re-run integration verify. Do not roll back.**

The fix lands outside every slice's declared write boundary, so it is the
**orchestrator's** to make — no slice owns it, and returning it to a worker would
route it to an agent whose boundary excludes the file. Record it in the stage
evidence as an integration fix, not as a slice's work.

### 2. Defect inside one slice

Return **that slice's items only**. The other slices keep their state and their
merged code; re-examining them would discard work the verify did not fault.
Rows go to `review-fix`, which is the status that exists for rework and has an
outbound edge back to `refactor`.

### 3. The union itself is inadmissible

Only when the slices are individually correct and jointly wrong — a genuine
interaction the merge exposed — flag all slices and roll back the merge.

This is the **one sanctioned backward move** in this skill besides an approved
Change Request reset. It is a _merge_ rollback, not a status rollback: the rows
return to `review-fix`, not to `todo`, so the forward-only lifecycle is
unbroken and the RED/GREEN evidence each row already earned is retained. A row
that must genuinely restart needs the upstream-reset rule and its recorded
approval, exactly as elsewhere.

### Round budget

Repeating any of the three without progress escalates to the user on the third
round, per the autorepair protocol. "Roll back and retry" is not a loop.
