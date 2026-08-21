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

## Coordinated parallel mode (ledger ownership)

When parallel dispatch is authorized, the ledger has one writer:

- The **orchestrator** owns every `test-list.md` write. Workers never edit it.
- Workers return a per-item evidence block carrying **every** field of the
  `SKILL.md` "Per-item evidence contract": `TDD-ID`, `TC-ref`, RED command and
  result, GREEN command and result, Refactor verify command and result,
  `Spec review`, `Code quality review`, and `Prototype parity` for UI-affecting
  items — plus the resulting status and `DR-ID`.
- Item 10 of the 11-point gate is satisfied by the orchestrator applying a
  **complete** evidence block to the row, not by the worker writing it. A block
  missing any contract field does not satisfy item 10: the orchestrator obtains
  the missing fields first, and the row stays out of `done` until it has them.

## Ledger ownership

`.qfai/specs/<spec-id>/tdd/test-list.md` has exactly one writer: the
**orchestrator**, in the **trunk**.

This is not a style preference. Delegation is mandatory and the orchestrator may
not write code, so the only role that ever observes RED/GREEN is the
implementation agent — and the ledger it would have to write lives _inside_ the
tree that worktree separation copies. N workers would each hold a private copy of
the one table that is the completion gate, and merging them is a text merge of
the artifact the gate reads.

So:

- Parallel workers **MUST NOT** edit `.qfai/specs/<spec-id>/tdd/**`. Their
  worktree copy is read-only for the duration of the slice.
- Each worker returns, per item it processed: `TDD-ID`, final `Status`, and the
  `Evidence` payload in the per-item evidence contract's form.
- The orchestrator writes those rows into the trunk ledger during
  `../SKILL.md#post-parallel-integration-verify`, before the verify runs.
- A merged item whose row is still `todo` fails that verify. Silence there is
  indistinguishable from work that was never done.

In serial mode the same rule holds with no merge step: the implementation agent
returns Status + Evidence, the orchestrator writes them.

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
