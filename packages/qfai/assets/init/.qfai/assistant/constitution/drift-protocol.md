# Drift Protocol

This file defines mandatory change control for all downstream execution phases.

## Core rule

- Do not edit upstream SSOT artifacts unless explicit user approval exists.

Upstream artifacts include, at minimum:

- `01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `07_Decisions.md`, `08_Open-questions.md`, `09_delta.md`
- `_policies/*` layered artifacts and `11_Contracts.md` (or project-equivalent contract index)
- `10_Plan.md` and other owner-phase planning outputs
- Legacy spec-pack SSOT files when present: `spec.md`, `delta.md`, `plan.md`, `traceability-matrix.md`, `scenario.feature`, `case-catalogue.md`, and numbered pack files (for example `01_Spec.md`..`18_delta.md`)
- contracts and schema decisions owned by earlier phases
- outputs of discussion/sdd/review stages

## Allowed exceptions (minimal whitelist)

- `.qfai/evidence/**` append/update
- progress status updates only when the project workflow explicitly allows downstream updates

Any exception beyond this list requires explicit user approval.

## When drift is detected

1. STOP downstream editing immediately.
2. Create a Change Request as a file at
   `.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md`, from
   `.qfai/assistant/skills/qfai-sdd/templates/change-request.md`. The ID
   pattern is `CR-\d{8}-\d{4}` and the file carries `ID`, `Status`
   (`open` / `approved` / `rejected` / `superseded`), `Approved by`,
   `Approved at` and `Approved option` so the approval is a record, not a
   memory. Reference it from `09_delta.md` / `07_Decisions.md` and from any
   ledger row it resets, using the `DR-ID` column — that column carries both
   `DR-*` and `CR-*` references. Contents:
   - context (what conflicts)
   - proposed change
   - options (at least 3) and recommendation
   - impact scope (spec/plan/tests/contracts/schema)
   - decision needed from user
   - approved actions (owner skill rerun plan)
3. Wait for explicit user approval, then set `Status` and the approval fields.
4. Rerun the owner skill for the upstream artifact.
5. Resume downstream work only after upstream artifacts are updated. Record
   that fact in the CR: fill `Resolution` and set `Applied at`. Approval alone
   does not release the downstream gate — `qfai-implement` treats an
   `approved` CR without `Applied at` as unresolved.

## Non-negotiable constraints

- Downstream skills must not patch upstream SSOT directly.
- If approval is not available, stay in STOP state and report blockers.
