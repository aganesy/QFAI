# Parallelization Policy

Full rules for item-level parallelism inside one spec. `qfai-implement/SKILL.md`
carries the summary and the precedence statement.

## Scope of this policy

- **Cross-spec parallelism is barred.** One spec per invocation, always. This
  is the Non-goal above and it is not approvable.
- **Item-level parallelism inside one spec** is what the rest of this section
  governs. `parallel_groups` in `agent-routing.yml` describes **role fan-out
  within a phase**, not item dispatch — whatever value it holds; it neither
  permits nor forbids what this section decides. Role fan-out is not thereby
  ungoverned: `## Role fan-out inside one row (build phase)` below binds it.

## Role fan-out inside one row (build phase)

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
  waivable: `constitution/workflow.md#concurrency-stage-independent-mandatory`
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
  `#seam-reconciliation-after-a-parallel-run` diffs slices, and a fanned-out
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

## Re-verify each merged item on the integrated tree

Worktree separation puts item 6's post-refactor re-run and the items 7 / 8
reviews inside the worker's own worktree, so all three name **that** tree's
address. The merge then adds every other slice's change, and the tree the item
is delivered on is no longer the tree those three observations describe. Gate
item 10 reads `Refactor verify revision` and the two `Reviewed revision` values
as the final tree's address (`references/evidence-revision.md`), so without a
re-take a merged item either cannot satisfy that rule honestly or carries a PASS
taken on a tree that no longer exists. The integration verify above does not
stand in for it: it re-runs the suite, not each item's gate, and it writes
nothing back into the item's evidence.

So after the merge and its integration verify, and **before any merged item goes
`done`** — which is reachable only because the reconciliation write holds a
worker's returned `done` at `refactor` until these steps pass
(`#ledger-ownership`):

1. Re-run each merged item's relevant test suite once on the integrated tree and
   refresh all three of its `Refactor verify` fields — `command`, `result` and
   `revision` (`references/round-evidence.md`). One narrow run per item; the
   integration verify is what covers them jointly.
2. Re-request `completion-reviewer` and `implementation-reviewer` for that item
   against the same tree, so items 7 and 8 name the address item 6 now carries.
   **A UI-affecting item re-requests `product-surface-reviewer` there too**, so
   item 9's PASS names it as well — prototype parity on a visual-prototyping
   target, and on a cli-only target the captured-output surface review item 9
   puts in parity's place, since `/qfai-prototyping` rejects `cli` and leaves no
   prototype to compare against. That verdict is a reading of reviewed output,
   and the worker took it before any other slice was in the
   tree: a merged sibling's stylesheet, layout container or shared component can
   change what this item renders without moving its own suite off GREEN, so the
   two code reviews above do not stand in for it. Gate item 9 admits a UI item
   to `done` only on that PASS
   (`../SKILL.md#item-completion-checklist-12-point-gate`),
   and a pre-merge one is evidence about a tree the item does not ship on.
3. An item whose `Refactor verify revision` already resolves to the integrated
   tree — nothing landed after its slice — is current as recorded and needs
   neither step. Record which check was made; do not assume it.
4. A re-verify that is not GREEN, or any of those re-reviews returning `REVISE`,
   keeps that item out of `done`: classify it as a failed integration verify
   (`#failed-integration-verify`) and leave the row at the `refactor` the
   reconciliation write held it at, or move it `refactor -> review-fix`. Both
   are listed edges (`execution-ledger.md#allowed-transitions`) **because the
   row was never written `done`** — the same remedy applied to a row already at
   `done` would need `done -> refactor` or `done -> review-fix`, neither of
   which that list carries. It does not by itself invalidate the other slices.

This is the same re-take a T1 group close performs, for the same reason
(`volume-policy.md#group-formation-states-and-transitions`): the address was
taken before the tree the item ships on existed.

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
- **The reconciliation write replays the row's own path, one listed edge at a
  time.** A dispatched row is still `todo` in the trunk — workers never edited
  it — so assigning the returned status directly is a single unlisted jump:
  `todo -> refactor` and `todo -> done` are both absent from
  `execution-ledger.md#allowed-transitions`, whose enumeration is complete, so
  the write that records a wholly _successful_ parallel run would be the
  lifecycle violation. Walk the edges the worker actually traversed instead —
  `todo -> red` on its RED, `red -> green` on its GREEN, `green -> refactor` on
  its refactor-verify — recording that phase's returned evidence at the step
  that produced it. The intermediate states are the worker's, restored in the
  trunk rather than invented: the orchestrator has each phase's command, result
  and revision in the returned block, and a block missing one cannot be replayed
  past it, which is the same defect as a missing contract field above.
- **A returned `done` is written as `refactor`, not as `done`.** The replay
  stops one edge short of it. That write happens _before_ the integration verify
  and before the post-merge re-take above, so taking the last step too would
  settle the completion decision ahead of both
  gates that still have to pass on the integrated tree — and settle it
  irreversibly: `done -> refactor` and `done -> review-fix` are not in that list
  either, so a re-verify that then failed could not be recorded at all.
  `refactor` is the review-ready state a T1 row already parks in, so the hold
  loses no evidence and adds no status value.
- Every other returned status is reached by continuing the same replay to it,
  never by jumping: `refactor -> review-fix` for a returned `review-fix`, the
  active-status edge to `exception` for a returned `exception`, `todo -> blocked`
  for a row the worker could not start. A returned status with no listed path
  from `todo` is not written at all — report it as a reconciliation failure and
  leave the row where the replay stopped, because inventing the edge is what
  this rule exists to prevent.
- The orchestrator writes `refactor -> done` only once the integration verify,
  that item's re-verify and **every re-review it owes** have returned PASS on
  the merged tree — `completion-reviewer` and `implementation-reviewer` on every
  item, and `product-surface-reviewer` as well on a UI-affecting one. That is
  the ledger write gate item 10 reads, and it is now the first time the row's
  status asserts anything about the integrated tree.
- A merged item whose row is still `todo` fails that verify. Silence there is
  indistinguishable from work that was never done.

In serial mode the same rule holds with no merge step, and the replay has
nothing to reconstruct: the implementation agent returns Status + Evidence after
each phase and the orchestrator writes them then, so the row walks those same
edges as they happen rather than afterwards.

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
