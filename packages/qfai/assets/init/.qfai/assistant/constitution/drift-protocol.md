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

## Reviewer-originated obligations

The rules above govern a downstream phase **editing** upstream SSOT. This section governs the
mirror case: a downstream reviewer **originating** a requirement that upstream SSOT does not
contain. Both are drift.

- Every reviewer finding must cite the upstream obligation it enforces (`AC-*`, `BR-*`, `TC-*`,
  `CON-*`, or a named constitution/catalog rule) in its `Traces to:` field. See
  `shared-skill-delegation-baseline.md#finding-provenance-must`.
- A finding that cannot cite one is reviewer-originated scope. It is **drift**, and it is **not
  satisfiable downstream**: encoding it as production code plus a hard test assertion is the same
  violation as patching upstream SSOT, inverted.
- Such a finding MUST NOT be `blocking` and MUST NOT gate `done`. It is recorded as `advisory` and
  routed to the Change Request / Open Question path — never to the implementer.
- Routing an advisory finding:
  1. Record it in the reviewer response under `Advisory / Change Request proposals`.
  2. Log it to the spec's `08_Open-questions.md`, or raise a Change Request per
     `#when-drift-is-detected` when it changes an already-approved obligation.
  3. The owner phase (`/qfai-sdd`) adjudicates: **promoted** into `AC-*`/`BR-*`/`TC-*`,
     **deferred**, or **rejected-with-rationale**.
  4. Only after promotion and an owner rerun may the obligation become a blocking gate — at which
     point it has an upstream ID and is no longer reviewer-originated.
- Downstream work is not blocked while adjudication is pending: the item may reach `done` against
  its existing upstream obligations, with the advisory recorded.

## Non-negotiable constraints

- Downstream skills must not patch upstream SSOT directly.
- Downstream reviewers must not originate binding obligations that upstream SSOT does not contain.
- If approval is not available, stay in STOP state and report blockers.
