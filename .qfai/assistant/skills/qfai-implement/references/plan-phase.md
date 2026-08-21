# Phase: Plan

`plan` is the first phase `agent-routing.yml` routes for this skill and the only one carrying
`iteration: per-invocation`. It runs **once**, after Stage 0 + Preflight and before Phase Red selects
anything: `delivery-planner` must read the ledger the approved `CR-*` resets have already been
applied to, or it plans over rows that a reset has just returned to `todo`.

It is not Phase Red step 1 moved earlier. Step 1 picks **which row runs next** and repeats per row;
this phase fixes the frame that selection happens inside, and does not repeat. That is the whole
distinction the `iteration` key exists to record.

## `delivery-planner` — mandatory and blocking

Receives the post-reset `test-list.md` in full, plus the obligation sources each row's `Layer` names
(`TC-Refs` for `Unit` / `Component` / `Integration`, `US-Refs` for `E2E`, `CON-API-Refs` for `API`).

Returns the plan this invocation runs inside:

- the **risk tier** of every row, which scales how often the gates run (`volume-policy.md`);
- the **T1 coherent groups** the gatekeeping and reviews batch over;
- the **parallel dispatch** decision — it is the sole authority for one, and it is taken here, not
  per row (`parallelization-policy.md`);
- the **order** the rows will be worked in, and the multi-spec queue when one was confirmed.

It does **not** pick the row here, and it writes nothing to `test-list.md`: the orchestrator owns
that file (`parallelization-policy.md#ledger-ownership`).

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

Receives the same ledger, each row's `Layer`, and the obligation column that `Layer` names.

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
**not** produce the Coverage Depth Matrix here: `.qfai/evidence/coverage-depth-<spec-id>.md` is
owned from the ATDD stage onward, and this phase neither re-derives nor supersedes it.

## Rerun

`rerun_policy: failed-agents-only`. The two roles read the same ledger but produce independent
outputs — a coverage finding does not change the tiers, and a re-plan does not change which
obligation a row cites — so re-running the one that returned non-PASS is sufficient.
