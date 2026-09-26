# US-0001-0073: ATDD Reviewer Gate

## User Story

As a project lead, I want an independent Reviewer to validate coverage obligations, forbidden references, and evidence completeness before ATDD completion, so that no acceptance test gaps survive undetected. On the story tree, I want the scoped completion gate to run per business flow (`--flow BF-NNNN`), so that a run is judged on the flow it owns.

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0008/02_User-stories.md#us-0008-0005`
