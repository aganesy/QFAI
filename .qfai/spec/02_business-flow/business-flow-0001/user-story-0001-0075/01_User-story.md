# US-0001-0075: ATDD Scaffold Bulk Skeleton Generation

## User Story

As a QA Engineer, I want `qfai atdd scaffold --spec spec-NNNN` to read the spec test*cases and emit one `tests/atdd/spec-NNNN/<TC-ID>.test.*`skeleton per TC (with framework primitives, a`// TODO: implement assertion for <TC-ID>`marker, and comment references to related US-* / CON-API-\_), so that I can bootstrap acceptance-test files in bulk without hand-creating each file — while`qfai validate`flags any unfilled placeholder via`D-SCAFFOLD-PLACEHOLDER` (warning, escalating to error after 3 validate cycles per DR-0272) and re-running the scaffold never overwrites my filled-in (non-TODO) content. On the story tree, I want `qfai atdd scaffold (--story US-NNNN-NNNN | --flow BF-NNNN)` to write one skeleton per AC of the story, or one E2E skeleton for the flow, never overwriting an existing file, with `D-SCAFFOLD-PLACEHOLDER` keyed by the AC or BF ID.

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0008/02_User-stories.md#us-0008-0007`
