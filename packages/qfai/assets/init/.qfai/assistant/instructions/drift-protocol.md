# Drift Protocol

This file defines mandatory change control for all downstream execution phases.

## Core rule

- Do not edit upstream SSOT artifacts unless explicit user approval exists.

Upstream artifacts include, at minimum:

- `spec.md`, `delta.md`, `scenario.feature`, `case-catalogue.md`, `traceability-matrix.md`, `plan.md`
- contracts and schema decisions owned by earlier phases
- outputs of discuss/require/refinement/planning stages

## Allowed exceptions (minimal whitelist)

- `.qfai/evidence/**` append/update
- `traceability-matrix.md` progress status updates when the project workflow explicitly allows downstream updates

Any exception beyond this list requires explicit user approval.

## When drift is detected

1. STOP downstream editing immediately.
2. Create a Change Request that includes:
   - context (what conflicts)
   - proposed change
   - options (at least 3) and recommendation
   - impact scope (spec/plan/tests/contracts/schema)
   - decision needed from user
   - approved actions (owner skill rerun plan)
3. Wait for explicit user approval.
4. Rerun the owner skill for the upstream artifact.
5. Resume downstream work only after upstream artifacts are updated.

## Non-negotiable constraints

- Downstream skills must not patch upstream SSOT directly.
- If approval is not available, stay in STOP state and report blockers.
