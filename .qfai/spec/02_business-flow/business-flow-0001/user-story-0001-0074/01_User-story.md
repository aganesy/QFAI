# US-0001-0074: Test Case Quality Depth Verification

## User Story

As a QA Engineer, I want test cases evaluated for quality depth (boundary values, error paths, edge cases, equivalence partitioning) in addition to traceability coverage, so that normal-path-only test suites are identified as incomplete. On the story tree, I want that depth evaluated for each BF and AC.

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0008/02_User-stories.md#us-0008-0006`
