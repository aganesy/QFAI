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
  neither disjoint nor isolated is a DENY: `constitution/workflow.md`
  (Implementation stage) requires no shared state, and the collision would
  appear at run time as a flaky RED/GREEN rather than at adjudication.

- No sequential dependency: item B does not consume item A's output.
- A post-merge integration verify plan exists.

Read dependencies are enumerated from the declared write sets: for every write
target, `delivery-planner` resolves the importers reachable from the other
items' test and implementation files. An import graph that cannot be resolved
is a DENY, because the independence claim then has no concrete evidence.

## Isolation requirement (worktree separation)

Adjudicated separately from the "all must be true" list above, and **not
waivable**. Per `constitution/workflow.md` (Implementation stage),
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
correct behaviour when isolation cannot be guaranteed, and an unreachable
exception is preferable to a documented way around an upstream SSOT rule.

## Deny conditions (any one blocks parallel dispatch)

- Two concurrently dispatched items share the same behavior's Red/Green/Refactor cycle.
- Two concurrently dispatched items modify the same public API surface.
- Two concurrently dispatched items write the same shared fixture, shared mock,
  or shared global setup **file**. (A shared fixture module that neither item
  writes and each consumes read-only is not a deny — see the allow conditions.)
- Two concurrently dispatched items bind the same fixed port, write the same
  out-of-worktree path, or share an un-namespaced external cache/queue.
- Sequential dependency: "A must finish before B has meaning".
- The independence claim cannot be explained with concrete file/module evidence.

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
