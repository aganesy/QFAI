# Drift Protocol

This file defines mandatory change control for all downstream execution phases.

## Core rule

- Do not edit upstream SSOT artifacts unless explicit user approval exists.

Upstream artifacts include, at minimum:

- `01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `07_Decisions.md`, `08_Open-questions.md`, `09_delta.md`
- `_shared/*` layered artifacts and `11_Contracts.md` (or project-equivalent contract index)
- `10_Plan.md` and other owner-phase planning outputs
- contracts and schema decisions owned by earlier phases
- outputs of discuss/require/refinement/planning stages
- `scenario.feature` / `case-catalogue.md` may exist as legacy artifacts, but are not mandatory upstream inputs

## Allowed exceptions (minimal whitelist)

- `.qfai/evidence/**` append/update
- progress status updates only when the project workflow explicitly allows downstream updates

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
