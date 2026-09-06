# Parallelization Policy

Full rules for item-level parallelism inside one spec. `qfai-implement/SKILL.md`
carries the summary and the precedence statement.

## Scope of this policy

- **Cross-spec parallelism is barred.** One spec **at a time**, always — never
  two specs in flight together. This is the Non-goal above and it is not
  approvable. It is a concurrency rule, not a count of the ledgers one
  invocation may read: a confirmed multi-spec queue
  (`volume-policy.md#multi-spec-queue`) is walked one spec after another and
  does not breach it, which is why the `per-invocation` `plan` phase may frame
  every queued ledger in one pass (`plan-phase.md`).
- **Item-level parallelism inside one spec** is what the rest of this section
  governs. `parallel_groups` in `agent-routing.yml` describes **role fan-out
  within a phase**, not item dispatch — whatever value it holds; it neither
  permits nor forbids what this section decides. Role fan-out is not thereby
  ungoverned: `## Role fan-out inside one row (build phase)` below binds it.

## Role fan-out inside one row (build phase)

Who does what inside ONE row's build phase — the roles, what each owns, and what
none of them may do — is in `role-fan-out.md`. It is true whether or not
anything is dispatched in parallel, which is why it is not stated here: this
file is about dispatching rows.

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

1. For each slice, list the paths it actually touched under the production roots
   `catalog/structure.md` declares — the `Production roots` field of its
   `## Key packages / entrypoints` section, which Stage 0 already required be
   read and refreshed against the repository
   (`git diff --name-only <base>..<slice-head> -- <source root>`, substituting
   `<source root>` from that field rather than assuming `src/`; a repo may
   keep production code under `app/`, `lib/`, `internal/`, `cmd/` or
   `packages/*/src`). The field holds **Git pathspecs, not only directory
   names** — pass every entry through verbatim. A repo whose production code
   sits at the repository root declares globs there (`*.go` alongside `cmd/`
   and `internal/`; `*.py` alongside the package directory) precisely so this
   pathspec never has to be a bare `.`, which would carry `go.mod`,
   `package.json`, CI config, documentation and build output into the
   production list and make step 5 report each of them as an undeclared seam
   breach.
   **A catalog written before that field existed carries no `Production roots`
   line.** `assistant/catalog/**` is create-only, so upgrading the tool and
   re-running `npx qfai init --force` refreshes `assistant/skills/**` and leaves
   an installed project's catalog untouched: the policy arrives, the field does
   not. Do not fall back to a literal `src/` — derive the roots once from that
   catalog's `Core modules` and `CLI / service entry` values checked against the
   repository listing, **write the derived `Production roots` line back into
   `catalog/structure.md` in the same pass**, and reconcile against it. Every
   later run then reads the field like any other.
   **Re-establish the roots against the merged tree before using them.** Stage 0
   refreshed that field before any slice ran, so a root a slice _created_ is not
   in it — and the mis-read-root branch in step 3 does not catch that either,
   because a slice that also touched a known root produces a non-zero diff and
   never reaches it. Take the whole merged diff once with no pathspec
   (`git diff --name-only <base>..<merge-head>`), and for every path outside the
   declared roots decide whether it is shipped source. Add each new
   shipped-source root to `Production roots`, write it back the same way, and
   only then run the per-slice pathspec. Without this pass a slice can add a
   whole directory of production code that no ownership comparison ever sees.
2. Build **two lists with two commands** — the production list and the
   test/fixture list. Not one list split in half: each needs its own pathspec.
   The **production list** is step 1's pathspec with the test and fixture
   patterns excluded:
   `git diff --name-only <base>..<slice-head> -- <source root> ':(exclude)**/*.test.*' ':(exclude)**/*_test.go' ':(exclude)**/__tests__/**' ':(exclude)**/testdata/**'`
   Step 1's pathspec is positive only, so a repo that colocates tests with
   production code — `app/foo.test.ts` beside `app/foo.ts`, Go's `_test.go` in
   the package it tests — otherwise lists them as touched production paths and
   step 5 reports each one as an ownership breach. `Production roots` alone
   cannot do this: the excluded files sit **inside** a declared root.
   The **test/fixture list is a second command with its own positive
   pathspec** — there is no such thing as inverting the first one. Git applies
   exclude pathspecs after the non-exclude ones and, when there are no
   non-exclude ones, to the whole tree (`git help glossary`, "pathspec"), so
   adding a test glob beside `<source root>` unions the two and an
   exclude-only pathspec just re-derives production. Name the test paths
   positively instead:
   `git diff --name-only <base>..<slice-head> -- 'tests/**' '**/*.test.*' '**/*_test.go' '**/__tests__/**' '**/testdata/**'`
   taking the patterns from this repo's own test and fixture naming — the
   `testFileGlobs` of `qfai.config.yaml` and the `Test file` column of the
   dispatched rows — and extending them to whatever it actually uses.
   **Derive it independently of `Production roots`, never by subtraction from
   the production list.** That field excludes tests by construction, so in the
   ordinary layout — production under `src/`, tests under `tests/` — step 1's
   list never contained a test path to begin with, and filtering one out of the
   other yields an empty test list on every run while step 6 reports a clean
   check. Two slices both writing `tests/shared-helper.ts` or a shared fixture
   outside every production root is a deny condition in its own right (see the
   allow / deny conditions above), and the one the merged suite is least likely
   to reveal: the writes can interleave into a file that still compiles and
   still passes. Step 6 checks this list.
3. A zero-path **production** list is not by itself evidence of a clean seam,
   and it is not automatically a mis-read root either. **Settle it by
   observation, not from the evidence blocks.** The per-item evidence contract
   (`SKILL.md` "Per-item evidence contract", `references/round-evidence.md`)
   records commands, results and revisions and no manifest of changed files;
   `Refactor verify result` proves the suite was green, not what the refactor
   edited. Asking a reader to confirm from those blocks that Refactor and every
   review-fix round left production files untouched asks for a fact nothing
   recorded — a worker who simply never mentions a production edit passes the
   check. Take the slice's whole diff with **no pathspec** instead
   (`git diff --name-only <base>..<slice-head>`): it covers every phase of the
   slice — RED, Green, Refactor and each review-fix round — and depends on no
   root, so neither an incomplete `Production roots` nor an unrecorded edit can
   hide inside it.
   - It is empty too: the slice changed nothing, and the empty production list
     is sound. That is what a slice of falsifiability-path items looks like —
     `references/red-not-observable.md` adds no production code and reverts its
     mutation.
   - It lists paths: classify each one as shipped source, as test or fixture,
     or as neither (config, documentation, build output). Any shipped-source
     path the production list did not carry is a **mis-read root** — or a
     step 2 exclude pattern too broad for this repo. Correct
     `Production roots` per step 1 or the pattern, write it back, and re-run
     before continuing. The empty production list is legitimate only when no
     listed path is shipped source.

   Judge it on that diff rather than on the RED route because Refactor edits
   shipped code by design and an `implementation-reviewer` REVISE for naming or
   duplication takes the no-round path: both change production code with no RED
   of their own, so a falsifiability-only RED never implied an empty production
   diff.

4. Compare the production list from step 2 against the slice's declared
   `Owning module`.
5. Report every touched production path that no slice declared, and every one
   touched by more than one slice, as a **deny-condition breach**. It is a
   breach whether or not anything broke: the gate was passed on a claim that
   turned out to be false, so the next authorization is being made on the same
   basis.
6. Check the test and fixture list from step 2 separately, against each slice's
   declared `Test file` rather than its `Owning module` — the ownership rule for
   these paths is a different one. A path written by more than one slice is a
   deny-condition breach on the same terms as above. Not being declared by any
   slice is not a breach here: a slice legitimately writes fixtures its ledger
   row does not name. Overlap is what this list is for.
7. A breach does not automatically roll back a green merge. It does require the
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
  remove (`evidence-revision.md#what-makes-evidence-stale`). Order it so the

  re-take is the **last** thing before the rows go to `done`: a verify that
  passes first time costs one pass, and each further remedy round costs
  another.

In serial mode the same rule holds with no merge step, and the replay has
nothing to reconstruct: the implementation agent returns Status + Evidence after
each phase and the orchestrator writes them then, so the row walks those same
edges as they happen rather than afterwards.
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
