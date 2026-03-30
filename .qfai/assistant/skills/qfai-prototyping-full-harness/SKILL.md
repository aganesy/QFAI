# /qfai-prototyping-full-harness

[DRIFT-PROTOCOL:MANDATORY]

Premium prototyping skill with planner/generator/evaluator iteration loop.
Full-harness mode is an **explicit, non-default** path activated only via
`qfai prototyping --mode full-harness` or discussion artifact recommendation.

> This skill defines a real execution workflow — it is NOT a routing-only redirect.

## When to Use

- Projects requiring L3–L5 fidelity evidence (production-ready prototypes).
- Evaluation needs: weighted multi-dimension scoring with decision gates.
- Explicit opt-in only; never auto-activated from config, env, or standard mode.

## Workflow Loop

The full-harness iteration loop proceeds through four phases per cycle:

### Planner Phase

- Generate strategy from spec constraints, budget, and prior iteration feedback.
- Produce a ranked plan with target dimensions, expected quality floor, and cost estimate.
- Constraints propagated from discussion artifact recommendation.

### Generator Phase

- Execute prototyping output production based on planner strategy.
- Incorporate refinement notes from prior evaluator feedback.
- Produce render evidence, test results, and validator output as artifacts.

### Evaluator Phase

- Apply weighted scoring across configured dimensions (floor enforcement).
- Decision gate: converge, refine, or pivot based on scoring-ready schema.
- Record scoring trace with dimension-level breakdown for auditability.

### Decision Gate

- Convergence criteria: all dimension floors met AND aggregate score above threshold.
- Refinement: loop back to generator with evaluator feedback.
- Pivot: loop back to planner with strategic reassessment.
- Termination: max iterations reached OR convergence achieved.

## Evidence Collection

Every full-harness run MUST produce:

- Render evidence with `captured / skipped / failed` status (3-state vocabulary).
- Iteration history (planner input → generator output → evaluator score per cycle).
- Scoring trace with dimension-level breakdown.
- Termination reason (converged / max-iterations / manual-stop).
- Validator output from `qfai validate` at each iteration.

## Reviewer Invocation

- Generate review summary at convergence or termination.
- Review findings must reference iteration history and scoring trace.
- Reviewer sign-off is a required gate before evidence is finalized.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - evidence completeness and iteration history integrity,
  - scoring trace auditability and calibration adherence,
  - Drift Protocol was enforced,
  - test-layer obligations match `test-layers.md` and plan,
  - floors and ratios are **signals, not gates**.
- Reviewer returns only `PASS` or `REVISE`.
- Every `REVISE` must include a concrete alternative proposal.

## Calibration Integration

- Scoring-ready schema defines dimension weights and floor thresholds.
- Calibration config is read from `qfai.config.yaml` under `prototyping.calibration`.
- Threshold adjustments are logged in iteration history for traceability.

## Three-Mode Positioning

This skill covers **full-harness** mode only. See also:

| Mode | Scope | Skill |
| --- | --- | --- |
| **low-cost** | Static checks only (L1/L2) | `/qfai-prototyping` |
| **standard** | Static + optional light runtime (L2/L3) | `/qfai-prototyping` |
| **full-harness** | Static + runtime-heavy (L3/L4/L5) | `/qfai-prototyping-full-harness` (this skill) |

Standard and low-cost modes are handled by the standard `/qfai-prototyping` skill.
Full-harness adds runtime-heavy obligations: API non-404 checks, DB existence verification,
and UI route reachability — these are NOT imposed on standard or low-cost modes.

## Non-UI Projects

For non-UI projects (`surface: non-ui`), this skill returns n/a.
Full-harness obligations assume a UI-bearing surface.

## Sub-agent Delegation (MANDATORY)

This section is mandatory and overrides conflicting fallback text.

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results to the user.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT serve as Reviewer or skip delegation for convenience.

### Capability Probe (MUST)

1. Run one harmless Probe Task (for example: "reply with ok") once at stage start.
2. If subagents are unavailable, explicitly ask the user for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when the user explicitly states `Simulation mode allowed`.
- Record both in evidence:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

## CRITICAL CONSTRAINTS (Read First)

- Scope is full-harness prototyping only — do not run standard/low-cost validation.
- Contracts are strict inputs in this stage.
- Runtime checks are mandatory for this mode (UI reachability, endpoint liveness, DB presence).
- Evidence must capture iteration-level detail including scoring traces.
- DONE is forbidden when iteration loop has not converged or max-iterations is not reached.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- resolve or explicitly defer ambiguous items,
- verify every required artifact exists and is complete,
- scan outputs for placeholders (TBD/TODO/OPEN QUESTION and equivalents),
- run the smallest executable smoke proof and record outcomes.

## Evidence (MANDATORY)

Create/update both artifacts in `.qfai/evidence/`:

1. Markdown evidence with sections:
   - Iteration History (planner/generator/evaluator per cycle)
   - Scoring Trace (dimension-level breakdown)
   - Termination Reason
   - Work Orders Summary
2. JSON evidence with minimum fields:
   - `iterations[]` with per-cycle scoring and decision
   - `meta.generatedAt`, `meta.toolVersion`, `meta.commands[]`

## FINAL CHECKLIST (Check Last)

- [ ] All iteration cycles are recorded with scoring traces.
- [ ] Convergence or termination condition was met.
- [ ] Reviewer returned PASS.
- [ ] Evidence artifacts are updated.
- [ ] `qfai validate --fail-on error` passes.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated.
- [ ] Open questions were logged when needed.
- [ ] Completion message was presented to the user.
- [ ] Next actions were enumerated.

## Completion Message & Next Actions (MUST)

When complete, provide a final user-facing completion message and list actions.

- Proceed (recommended): `/qfai-atdd`.
  Action: implement acceptance tests against the full-harness prototype.
- Quality gate run: `/qfai-verify`.
  Action: run full validation/report flow and publish gate evidence.
- Rework prototyping: rerun `/qfai-prototyping-full-harness`.
  Action: fix convergence failures or scoring trace gaps.
