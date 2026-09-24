# US-0001-0076: Worker-Scoped Credential-Reuse Guidance

## User Story

As a QA Engineer running acceptance tests in parallel, I want `/qfai-atdd` to carry backend-agnostic guidance on reusing one authenticated session per parallel worker — the seven session-reuse rules, the companion rule that a caller-injected environment identifier forbids the harness from provisioning or tearing that environment down, and the credential-class script-naming rule as adopter guidance — so that I can stop authenticating once per test without the guidance picking a browser backend for me, and without QFAI adding a validator, a finding code, a test layer or an annotation token to police it.

## Legacy Source Scope

- In:
  - ATDD skill (`/qfai-atdd`) workflow definition
  - E2E / API / Integration acceptance test orchestration aligned with US / TC / CON-API obligations; on the story tree, aligned with BF (E2E) and AC (integration or API) obligations
  - Test Volume Estimator (signal table with evidence)
  - Coverage obligations checklist (US -> E2E, TC -> Integration, CON-API -> API); on the story tree, BF -> E2E and AC -> integration or API
  - Annotation obligations (`QFAI:SPEC-XXXX:US-YYYY`, `QFAI:SPEC-XXXX:TC-YYYY`, `QFAI:CON-API-XXXX`)
  - Forbidden reference enforcement (TC annotations in E2E/API tests are forbidden)
  - Sub-agent delegation (test-design-analyst, acceptance-test-engineer, completion-reviewer, qa-gatekeeper, implementation-reviewer)
  - Evidence file production (`.qfai/evidence/atdd-<spec-id>.md`)
  - Stage gates (P0-P8) enforcement
  - `qfai atdd scaffold` placeholder skeletons; on the story tree, per story (`--story`) or per business flow (`--flow`)
  - Scoped completion gate: `qfai validate --profile atdd --fail-on error`, scoped by `--spec` in the spec-pack layout and by `--flow` on the story tree
  - Reviewer Gate with independent non-edit reviewer
  - Credential-reuse guidance for acceptance-test harnesses (worker-scoped session reuse; backend-agnostic prose, no validator and no new vocabulary)
- Out:
  - Unit / Component test implementation (belongs to `/qfai-implement`)
  - Product feature changes beyond ATDD execution needs
  - Spec artifact authoring (belongs to `/qfai-sdd`)

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0008/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0008/02_User-stories.md#us-0008-0008`
