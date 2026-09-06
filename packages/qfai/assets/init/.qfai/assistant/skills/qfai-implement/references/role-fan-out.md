# Role fan-out inside one row (build phase)

Split out of `parallelization-policy.md`, which is about dispatching ROWS in
parallel. This file is about the roles inside one row's build phase, which hold
whether or not anything is dispatched.
`parallelization-policy.md#role-fan-out-inside-one-row-build-phase` points here.

The manifest ships exactly one non-empty `parallel_groups`:
`qfai-implement`'s `build` phase groups `frontend-engineer` and
`backend-engineer`. Both are `conditional_agents` in that phase, and Handoff
Contract 1 assigns the row to the _appropriate_ implementation agent, so the
group is a permission, not a roster: the two run concurrently only **when both
roles apply to the row and the planner selects both**. A frontend-only or
backend-only row routes one role — starting the other anyway hands it work
another specialist owns, which is one of its own stop conditions. Do not read
the empty lists elsewhere in `agent-routing.yml` as a statement that nothing
ever runs concurrently.

That fan-out dispatches no second **item**, so the gates below that exist to
authorize a second item do not apply to it: it needs no `delivery-planner`
authorization and no user consent. **Those two are the whole exemption.** The
row's own contract, the constitution's concurrency rule, and the allow list's
external-runtime-resource condition all still bind it:

- **One row, one `Owning module`, split between the roles.** The fan-out does
  not widen the row's declared seam. Both roles write inside that one module,
  and each is given a disjoint set of paths within it before either starts;
  work that will not fit the module belongs to a **different ledger row**, not
  to a second writer on this one. `delivery-planner` may only _select_ such a
  row: rows are upstream (`SKILL.md` Non-goals) and `/qfai-sdd` is their
  producer, so neither the planner nor this skill may author one here. **If no
  such row exists, do not fan out and do not invent one** — raise a Change
  Request and hand the redesign to `/qfai-sdd`. This is the usual shape of one
  full-stack behaviour that needs a frontend and a backend module at once:
  splitting it into two rows is not the remedy either, because neither half is
  independently observable and `references/selector-granularity.md` allows one
  independently observable boundary per row.
- **External runtime resources are checked for the roles too.** Two roles
  running a suite — and often a dev server — at the same time contend exactly
  as two items do, and separate worktrees do not help: fixed ports, paths
  outside the worktree or under `os.tmpdir()`, shared test databases, caches,
  queues and OS-global environment state stay shared, as
  `## Isolation requirement (worktree separation)` states below. So evaluate
  the allow list's **external runtime resource** condition over the two roles,
  by the same disjoint-write-set or per-worker-isolation test, before starting
  them. Neither disjoint nor isolated has the same outcome it has for items:
  the roles run one at a time.
- **No disjoint split, no fan-out.** A row whose work cannot be divided into
  non-overlapping write ranges runs its roles **one at a time** — the
  item-level gate's DENY-to-serial outcome, applied inside the row. This is not
  waivable: `.qfai/assistant/constitution/workflow.md#concurrency-stage-independent-mandatory`
  binds every set of delegated agents that write concurrently, and it requires
  worktree separation whenever they do. In one checkout the second role
  overwrites the first's edits; in separate worktrees the same module comes
  back as a merge conflict.
- **One evidence block per row.** The per-item evidence contract is satisfied
  once, by the orchestrator, from what the roles returned — never one block per
  role, and a row whose block is missing a field stays out of `done` exactly as
  in the coordinated mode below.
- **One GREEN, judged over both outputs — taken on the merged tree by one
  role.** `qa-gatekeeper` blocks `build` on the row's single GREEN
  observation, and that observation covers the merged result of both roles;
  neither role's output is admissible on its own. On a full-stack row neither
  worktree can produce it: each holds half the behaviour, so the selector
  fails there for a reason that is not the row's. **Nobody else may supply it
  either** — Handoff Contract 2 has the _implementation agent_ submit the
  GREEN run and Contract 3 has `qa-gatekeeper` judge what was submitted, so
  the orchestrator cannot synthesize a pass it never observed (it may not
  write or run production code at all) and the gatekeeper cannot stand in for
  an observation nobody made. So once the per-role reconciliation below
  passes, the orchestrator merges the two heads and **re-delegates the merged
  tree to one of the two roles: the one that owns the row's `Selector`** — its
  layer decides, a UI or E2E selector being the frontend's and an API or
  service-level one the backend's. That role runs Phase Green steps 2 and 2a
  against the merged tree — `Oracle proof` mutation, its failing output, the
  immediate revert, and the restored run that **is** the GREEN — and returns
  both in the per-item evidence contract's form for the orchestrator to write
  into the row's one evidence block before `qa-gatekeeper` is routed. Only
  that one agent runs, so no worktree separation is owed for this step; it is
  still the `build` phase and still one of its `conditional_agents`, so it
  needs no new routing. If the only predicate that can falsify the row sits in
  the other role's assigned range, that role takes the mutation run on the
  same merged tree **after** the first role's run and never beside it — two
  runs, still one evidence block. A fanned-out row that reaches `build` with
  no such post-merge run has no admissible GREEN and does not leave it.
- **Seam reconciliation stays per row, and adds a per-role pass.**
  `parallelization-policy.md#seam-reconciliation-after-a-parallel-run` diffs
  slices, and a fanned-out
  row is one slice: its touched `src/` paths are compared against its one
  declared `Owning module` just as a serially implemented row's are. That
  comparison alone cannot see the split, because it reads the roles' merged
  result — two roles that both wrote the same file, whether the conflict was
  resolved by hand or the hunks merged cleanly, still land inside the one
  module and pass it. So diff **each role's own head** as well
  (`git diff --name-only <base>..<role-head> -- <source root>`), against the
  path set that role was assigned **and** against the other role's, and report
  every path outside its assignment, or touched by both, as a deny-condition
  breach under step 3 of that section. Without this pass the non-overlapping
  write ranges required above are asserted at dispatch and never verified.

  That command is a **two-commit range**, which `git diff` defines as a
  separate usage from its working-tree forms: it enumerates commits and
  nothing else, so a role that returns with its edits still in its index, its
  working tree, or as untracked files contributes an empty list and passes the
  comparison however it wrote. So **reconcile no uncommitted role.** Each role
  commits in its own worktree before it returns — `git add` over the paths it
  was assigned, so that anything it wrote outside them stays visible in
  `git status` instead of being swept into the same commit unexamined — and
  returns that commit as its `<role-head>`. Verify the return rather than
  trust it: `git status --porcelain` in that worktree must come back empty.
  A non-empty status is itself a deny-condition breach — record it, add every
  path it names (untracked `??` entries included) to that role's touched set,
  and compare the union against both the assignment and the other role
  **before anything merges**.
