<!-- markdownlint-disable MD024 -->

# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-25
- Primary: spec-0023 initial creation
- Tags: CAP-0023, v1.7.0
- Summary: Full spec creation for Discussion Design Hardening capability

## Rationale

- v1.7.0 introduces hardened discussion phase for UI-bearing packs, requiring 7 new structural validators (QFAI-DDP-019..025) and template/documentation updates

## Candidates Considered

1. Extend existing DDP validators inline (adopted)
2. Create separate validator module family (rejected)

## Adopted

- Adopted: Extend existing DDP validators (QFAI-DDP series)
- Why: Maintains naming consistency with QFAI-DDP-001..018; single orchestrator integration point; familiar pattern for maintainers
- Evidence: DR-0046 (OQ-0005 resolution)

## Rejected

- Candidate: Separate QFAI-DPACK-DDS validator module family
- Reason: Creates two incompatible naming series causing traceability confusion; violates DDP naming convention
- DO NOT: Create a parallel validator naming series outside of QFAI-DDP
- Temptation: "DDS is a new concern, so it deserves its own namespace" — but this fragments traceability and confuses reviewers

---

- Change ID: DELTA-0002
- Date: 2026-03-25
- Primary: DDS placement decision
- Tags: OQ-0002, DR-0043
- Summary: DDS placed in 03_Story-Workshop.md, not 02_Inception-Deck.md

## Rationale

- 02 is for alignment and convergence; concrete design details belong in 03 per SSOT principle

## Candidates Considered

1. Place DDS in 03_Story-Workshop.md (adopted)
2. Place DDS in 02_Inception-Deck.md (rejected)

## Adopted

- Adopted: DDS in 03_Story-Workshop.md
- Why: SSOT principle — avoids drift from maintaining design direction in dual locations
- Evidence: DR-0043

## Rejected

- Candidate: DDS in 02_Inception-Deck.md
- Reason: 02 is for alignment and convergence, not concrete design details; mixing concerns violates SSOT
- DO NOT: Place concrete design decisions in 02_Inception-Deck.md
- Temptation: "Inception Deck already covers design, so DDS fits there" — but 02 should remain a convergence-only document

---

- Change ID: DELTA-0003
- Date: 2026-03-25
- Primary: Validator severity decision
- Tags: OQ-0004, DR-0045
- Summary: All new structural validators emit error severity immediately (no warning phase)

## Rationale

- Structural presence is binary (present/absent); warning phase adds no value for binary checks

## Candidates Considered

1. Immediate error severity (adopted)
2. Gradual warning-first phase (rejected)

## Adopted

- Adopted: Immediate error for all new structural validators
- Why: Binary structural checks do not benefit from an intermediate warning phase; delays adoption
- Evidence: DR-0045

## Rejected

- Candidate: Gradual warning-first approach
- Reason: Structural presence is binary; a warning phase delays adoption of a necessary quality gate
- DO NOT: Introduce a warning-first phase for structural presence checks
- Temptation: "Warning first is safer for rollout" — but structural absence is definitively incorrect, not ambiguous

---

- Change ID: DELTA-0004
- Date: 2026-03-25
- Primary: Competitive reference fields scope
- Tags: OQ-0003, DR-0044
- Summary: 3 mandatory fields: adopted_points, rejected_points, local_translation

## Rationale

- Minimal judgment traces without excessive onboarding friction; source_url and relevance_score were considered but rejected

## Candidates Considered

1. 3 mandatory fields (adopted)
2. 5 mandatory fields including source_url and relevance_score (rejected)

## Adopted

- Adopted: 3 mandatory fields
- Why: Provides sufficient traceability without excessive overhead
- Evidence: DR-0044

## Rejected

- Candidate: 5 mandatory fields
- Reason: Increases onboarding friction without proportional traceability benefit
- DO NOT: Require source_url or relevance_score as mandatory competitive reference fields
- Temptation: "More fields = more traceability" — but metrics belong in a dedicated audit step, not discussion gate

---

- Change ID: DELTA-0005
- Date: 2026-03-25
- Primary: qualityProfile gating decision
- Tags: OQ-0007, DR-0047
- Summary: qualityProfile infrastructure preserved but DDS structural errors not gated by profile

## Rationale

- Profile-sensitive behavior deferred to future release; structural errors are universal regardless of profile

## Candidates Considered

1. Preserve but don't gate (adopted)
2. Gate DDS checks by profile level (rejected)

## Adopted

- Adopted: Preserve qualityProfile infrastructure, DDS errors at all profile levels
- Why: Structural completeness is binary and should not be profile-dependent
- Evidence: DR-0047

## Rejected

- Candidate: Profile-gated DDS checks (e.g., strict only)
- Reason: Profile gating for structural presence creates false sense of optional completeness
- DO NOT: Gate structural presence validators by qualityProfile
- Temptation: "Let standard profile skip DDS checks for easier adoption" — but structural absence is always wrong regardless of profile

## Impact

- Affects: packages/qfai/src/core/validators/, assets/init/ templates, SKILL.md
- Validation: qfai validate --fail-on error must pass with error=0

## Follow-ups

- v1.7.1+: Heuristic/aesthetic checks for DDS content quality (OQ-0006 deferred)
- Owner: aganesy
- Due: v1.7.2 discussion phase
