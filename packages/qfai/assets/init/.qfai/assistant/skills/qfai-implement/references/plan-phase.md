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
`US-*`, and `.qfai/contracts/api/**` for `CON-API-*`. Deriving the inputs from the rows instead hides
the gap this role is here for: a ledger holding no `E2E` / `API` row cites no `US-*` or `CON-API-*`
source at all, so the missing-row check below would have nothing to compare against in exactly the
case where an obligation is most likely to have been dropped.

Returns **coverage and layer-ownership findings**:

- a row citing an obligation its `Layer` does not own — an `E2E` row hanging off a `TC-*`, an
  `Integration` row hanging off a `US-*`;
- an in-scope obligation with no row at all, which is the gap `ledger-preconditions.md` separates
  from a truthfully empty ledger;
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
