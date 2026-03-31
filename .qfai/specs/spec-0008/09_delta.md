# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0013 (UI/UX review -- ATDD-relevant parts)
- Old spec-0013 covered UI/UX review framework including ATDD integration
- ATDD acceptance test orchestration parts are now captured in this spec (spec-0008)

## Adopted

- AD-0008-0001: ATDD skill consolidation -- all acceptance test orchestration (E2E/API/Integration) unified under CAP-0008
- AD-0008-0002: Layer-annotation mapping -- strict annotation per test layer (US for E2E, TC for Integration, CON-API for API)

## Rejected

- RJ-0008-0001: Unit/Component test inclusion in ATDD
  - DO NOT include unit/component tests in this skill scope
  - Temptation: adding unit tests to ATDD for "completeness"
  - Reason: unit/component tests belong to `/qfai-implement` per separation of concerns

## ID Renumbering

| Old ID                       | New ID                      | Notes                             |
| ---------------------------- | --------------------------- | --------------------------------- |
| spec-0013 US/TC (ATDD parts) | US-0008-YYYY / TC-0008-YYYY | Renumbered to spec-0008 namespace |
