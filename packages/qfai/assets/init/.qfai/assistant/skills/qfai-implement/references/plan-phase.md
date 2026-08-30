# Phase: Plan

`plan` is the first phase `agent-routing.yml` routes for this skill and the only one carrying
`iteration: per-invocation`. It runs **once**, after Stage 0 + Preflight and before Phase Red selects
anything: `delivery-planner` must read the ledger the approved `CR-*` resets have already been
applied to, or it plans over rows that a reset has just returned to `todo`.

**Per invocation means per queue, not per spec.** When auto-discovery confirms several specs
(`volume-policy.md#multi-spec-queue`), Stage 0 step 2 applies the approved resets to **every** queued
ledger and this phase plans all of them in the same pass, returning one plan per `spec-id`. A queue
transition then resumes at Phase Red inside the plan already fixed for that spec and does **not**
re-enter this phase — which is what `iteration: per-invocation` means, and why a queued spec that
cannot be planned (missing ledger, unresolved Change Request) is reported as blocked here, before the
first row of the first spec moves, rather than at its own turn. Planning only the head of the queue
would leave every later spec with no reset, no tier, no group and no dispatch decision.

**Reuse is conditional on the frame not having moved.** The specs ahead of a queued one write
production code and can open Change Requests, so a plan taken before the first row moved is not
automatically still true when the queue reaches that spec. The transition therefore compares the
in-scope `CR-*` set and the plan's revision against the tree as it then stands, and re-enters Stage 0
step 2 and this phase over the **remaining** queue when either moved
(`volume-policy.md#advancing-the-queue`). Reusing a stale plan there moves rows past a mid-run
approved reset and can license a parallel dispatch against an import graph the earlier specs already
changed. That re-entry is a repair on a moved frame — the same one a blocking REVISE below takes —
not the per-ledger iteration `per-invocation` rules out; when nothing moved, nothing is re-entered.

**This does not loosen the cross-spec bar.** "One spec at a time, always"
(`parallelization-policy.md#scope-of-this-policy`) forbids two specs being **in flight together**; it
is a concurrency rule, not a count of how many ledgers one framing pass may read. A confirmed queue
is still walked one spec at a time — Phase Red never holds rows from two `spec-id`s at once — which
is why the boundary rule is stated as "at a time" and not "per invocation" in both places that carry
it.

It is not Phase Red step 1 moved earlier. Step 1 picks **which row runs next** — walking the order
this phase returned — and repeats per row; this phase fixes the frame that selection happens inside,
and does not repeat. That is the whole distinction the `iteration` key exists to record.

## `delivery-planner` — mandatory and blocking

Receives every queued spec's post-reset `test-list.md` in full, plus the obligation sources each
row's `Layer` names (`TC-Refs` for `Unit` / `Component` / `Integration`, `US-Refs` for `E2E`,
`CON-API-Refs` for `API`).

Returns the plan this invocation runs inside:

- the **risk tier** of every row, which scales how often the gates run (`volume-policy.md`);
- the **T1 coherent groups** the gatekeeping and reviews batch over;
- the **parallel dispatch** decision — it is the sole authority for one, and it is taken here, not
  per row (`parallelization-policy.md`);
- the **order** the rows will be worked in, one order per queued `spec-id`.

It does **not** pick the row here, and it writes nothing to `test-list.md`: the orchestrator owns
that file (`parallelization-policy.md#ledger-ownership`).

**Phase Red step 1 consumes that order.** "The first `todo` row" there means the first one this
plan's order reaches, not the topmost line in the file — otherwise the planner's dependency and risk
judgement is returned and then discarded, and the sole authority for item selection decides nothing.
The three entries that name their own row — a handed-over `TDD-ID`, a mutation-only request, and a
`review-fix` row resuming its rework — keep the precedence step 1 gives them and never consult the
order; it decides only which `todo` row is next.

**Blocking means the invocation stops.** A non-PASS at this point is not a per-row REVISE — no row
has moved yet — so nothing proceeds to Phase Red until the objection is answered and this step is
re-entered. Starting rows against a plan the sole authority for item scope has rejected is the
failure this gate exists to prevent: the scope objection would otherwise surface only after the rows
it invalidates already carry RED evidence.

**An invocation whose scope is already fixed is confirmed, not re-planned.** A named-`TDD-ID`
handover from `/qfai-atdd` stage gate P1c, and a mutation-only request over a `done` row, both carry
their scope from the caller and both take precedence in Phase Red step 1. The planner confirms the
handover is workable — the row exists, is not `blocked`, and its tier does not demand a group that
was never formed — and leaves the order alone. Re-planning them here would override the precedence
Phase Red step 1 states and, for a mutation-only request, would re-order a ledger that this
invocation is not going to write to at all.

## `test-design-analyst` — mandatory, not blocking

Receives the same ledgers and each row's `Layer`, and — **listed independently of which rows exist**
— each queued spec's whole obligation set: `06_Test-Cases.md` for `TC-*`, `02_User-stories.md` for
`US-*`, and `.qfai/contracts/api/**` for `CON-API-*`. Deriving the `TC-*` set from the rows instead
hides the gap this role is here for: a coverage-target `TC-*` whose row was dropped is cited by
nothing, so a check that starts from the rows can never see it. `US-*` and `CON-API-*` are read for
the **layer-ownership** check below — which obligation an `E2E` / `API` row may cite — not as a row
census. `.qfai/contracts/api/**` is the one entry of that set a spec may legitimately not have — a
spec with no API surface, or a fresh install, which ships no such directory — and its `CON-API-*` set
is then **empty, not missing**: the role card marks it conditional for exactly this reason
(`agents/test-design-analyst.md`, "Inputs you must read"), so it is not a missing required source
artifact and stops nothing here or in the phases `qfai-sdd` and `qfai-atdd` route the same card in.

Returns **coverage and layer-ownership findings**:

- a row citing an obligation its `Layer` does not own — an `E2E` row hanging off a `TC-*`, an
  `Integration` row hanging off a `US-*`;
- an in-scope **coverage-target `TC-*`** with no row at all, which is the gap
  `ledger-preconditions.md` separates from a truthfully empty ledger. **`US-*` and `CON-API-*` are
  not row-producing obligations** — `/qfai-sdd` Phase 2b seeds one row per coverage-target `TC-*`
  only — so a ledger holding **zero** `E2E` / `API` rows is normal on a first run and is never a
  missing-row finding; those two are discharged by the acceptance tests' annotations and checked by
  `QFAI-ATDD-111` / `113`
  (`../../qfai-atdd/references/red-provenance.md#a-spec-with-no-atdd-owned-rows`). Raising them here
  produces a handoff to `/qfai-sdd` or `/qfai-atdd` that neither skill may satisfy;
- a `Selector` accumulating unrelated boundaries, which invalidates the row's RED before it is taken
  (`selector-granularity.md`, enforced per row by Phase Red step 5).

**Not blocking, because the repair is upstream.** This skill may not invent rows that no `TC-*`
backs (Preconditions), so a finding that needs a new row or a new test case leaves as a handoff note
to `/qfai-sdd` or `/qfai-atdd`, while the rows that _are_ well-formed proceed. A blocking verdict
here would stop those rows for a defect they do not have.

Record the findings in `.qfai/evidence/implement-<spec-id>.md`, written by the orchestrator, and
carry each one into the row it names so the reviewers see it at that row's `review` phase. Do
**not** produce, re-derive or supersede the Coverage Depth Matrix here, and do **not** return REVISE
because it is absent or incomplete: `.qfai/evidence/coverage-depth-<spec-id>.md` is owned from the
ATDD stage onward, and this phase is the **named exception** to that obligation in the role's own
card (`agents/test-design-analyst.md`, "Test Case Quality Depth") and in the
`manifest/agent-catalog.yml` copy of it, which carry the same sentence. The input here is an
execution ledger, not a spec's test cases, so a matrix produced against it would describe neither.

## Rerun

`rerun_policy: changed-scope-dependents`. A `delivery-planner` REVISE on item scope is repaired by
splitting a selector, adding a ledger row, or changing which obligation a row cites — every one of
which changes what the analyst read, so re-running the planner alone would leave the analyst's PASS
standing over a ledger that no longer exists. The ATDD scope gate carries this policy for the same
reason. A repair that touches nothing the analyst read — a re-tiering, a regrouping, a dispatch or
order change — re-runs the planner only, which is what "dependents" already scopes it to.

**An installed project may still route the old policy — check before relying on it.**
`npx qfai init --force` regenerates `assistant/skills/**` and `assistant/agents/**` but leaves
`assistant/manifest/**` alone (those are `qfai-configure`'s artifacts), so a project can take this
file without taking the routing change that goes with it and keep `rerun_policy: failed-agents-only`
on the `plan` phase. Under that policy a `delivery-planner` scope REVISE re-runs the planner alone
and the analyst's PASS stands over a ledger that no longer exists — the stale verdict this policy
exists to prevent. So **read this phase's `rerun_policy` out of the project's own
`assistant/manifest/agent-routing.yml`** when the phase starts, and when it reads
`failed-agents-only`: re-run `test-design-analyst` by hand after every scope repair, and record in
`.qfai/evidence/implement-<spec-id>.md` that the routing predates this contract, so its verdict is
read as the hand-routed one it is. Routing it by hand is the stopgap, not the fix — bringing
`agent-routing.yml` and `agent-catalog.yml` forward is the same merge
`../../qfai-atdd/references/stale-manifest.md` sets out (diff the project's copies against
`node_modules/qfai/assets/init/.qfai/assistant/manifest/**` and merge the shipped contracts in,
keeping the project's own routing choices). There is no migration command to invoke; do not wait for
one.
