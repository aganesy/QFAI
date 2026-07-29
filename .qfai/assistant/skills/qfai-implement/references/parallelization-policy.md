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
- No two concurrently dispatched items **mutate** the same fixture instance,
  singleton instance, or DI container instance. (Constructing a fresh instance
  per item is fine.)
- No two concurrently dispatched items **write** the same schema or the same
  database rows. Per-worker schema or database isolation satisfies this.
- No sequential dependency: item B does not consume item A's output.
- A post-merge integration verify plan exists.
- Worktree separation (or branch separation) per
  `constitution/workflow.md` Concurrency rules is in force, or the declared
  degraded mode is recorded. **Recommendation, not a hard allow-condition**:
  qfai does not currently provision worktrees itself, so requiring worktree
  separation as a precondition would make the exception unreachable.

## Deny conditions (any one blocks parallel dispatch)

- Two concurrently dispatched items share the same behavior's Red/Green/Refactor cycle.
- Two concurrently dispatched items modify the same public API surface.
- Two concurrently dispatched items write the same shared fixture, shared mock,
  or shared global setup **file**.
- Sequential dependency: "A must finish before B has meaning".
- The independence claim cannot be explained with concrete file/module evidence.

## Coordinated parallel mode (ledger ownership)

When parallel dispatch is authorized, the ledger has one writer:

- The **orchestrator** owns every `test-list.md` write. Workers never edit it.
- Workers return a per-item evidence block (RED/GREEN commands and output,
  status, `DR-ID`).
- Item 10 of the 11-point gate is satisfied by the orchestrator applying the
  worker's evidence block to the row, not by the worker writing it.
