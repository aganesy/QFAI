# 07 Non-Functional Requirements

## Document Info

| Field | Value |
|---|---|
| Discussion | discussion-20260317102145554 |
| Subject | QFAI v1.6.0 -- Implementation phase redesign |
| Date | 2026-03-17 |

## Requirements

### NFR-0001 Validator performance

- **Description:** Phase 1 validator shall complete within acceptable time for developer workflow.
- **Measurable Target:** < 5s for single spec validation.
- **Source:** SRC-0001 §6

### NFR-0002 Migration completeness

- **Description:** No old skill reference shall survive in the repository after v1.6.0 PR merge.
- **Measurable Target:** 0 grep hits for old skill names across entire repo.
- **Source:** SRC-0001 §12

### NFR-0003 Test regression prevention

- **Description:** Assets tests shall detect re-introduction of old skill references.
- **Measurable Target:** Assets test fails if old skill name appears in canonical assets.
- **Source:** SRC-0001 §9.5

### NFR-0004 Backward compatibility (non-implementation skills)

- **Description:** Non-implementation skills (discussion, sdd, atdd, verify) shall be unaffected.
- **Measurable Target:** All existing non-implementation skill tests pass without modification.
- **Source:** SRC-0001 §2.1

### NFR-0005 Single PR atomicity

- **Description:** All v1.6.0 changes shall be delivered in a single atomic PR.
- **Measurable Target:** 1 PR with all changes; no partial migration states.
- **Source:** SRC-0001 §2.1
