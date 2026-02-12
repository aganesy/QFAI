# 17 Plan

## Metadata

| Key        | Value       |
| ---------- | ----------- |
| Spec ID    | SPEC-0001   |
| Plan owner | Engineering |
| Created    | 2026-02-12  |
| Updated    | 2026-02-12  |

## Context and Scope

- Scope: deliver draft create API and UI entry point with duplicate protection.
- Exclusions: final order confirmation and payment.

## Execution Strategy

- Slice 1: deliver AC-0001-0001 with EX-0001 and TC-0001-0001.
- Slice 2: deliver AC-0001-0002 and AC-0001-0003 with EX-0002, EX-0003, TC-0001-0002, TC-0001-0003.

## Milestones

| Milestone | Output                                | Exit criteria                            |
| --------- | ------------------------------------- | ---------------------------------------- |
| M1        | API create endpoint                   | AC-0001-0001 tests pass                  |
| M2        | duplicate handling and error contract | AC-0001-0002 and AC-0001-0003 tests pass |

## Verification and Gates

- Keep `@layer-*` alignment with steering policy.
- Validate AC to EX to TC chain via `16_Traceability-ledger.md`.

## Risks and Mitigations

| Risk           | Impact              | Mitigation                         | Owner   |
| -------------- | ------------------- | ---------------------------------- | ------- |
| duplicate race | inconsistent result | DB uniqueness and conflict mapping | backend |

## Open Questions

- OQ-SPEC-0001-0001 remains pending product decision.

## Done Checklist

- [ ] Milestones completed
- [ ] Traceability updated
- [ ] Risks reviewed
- [ ] Reviewer approval recorded
