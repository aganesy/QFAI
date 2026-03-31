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

---

- Change ID: DELTA-0006
- Date: 2026-03-30
- Primary: spec-0023 remediation pass — UI-bearing detection unification (REQ-0007)
- Tags: v1.7.7, remediation, surface-classification, discussion-20260329195516830
- Summary: Added US-0023-0009, AC-0023-0024..0029, BR-0023-0026..0031, EX-0023-0036..0041, TC-0023-0036..0041, DR-0082 to enforce explicit surface classification as primary SSOT with content signals as fallback heuristics only.

## Rationale

- discussion-20260329195516830 (v1.7.6 remediation) identified REQ-0007 (UI-bearing detection unification) as a P1 architectural mismatch.
- v1.7.6 documentation stated explicit surface classification takes precedence, but the implementation allowed content signals to override explicit metadata, creating inconsistency.

## Candidates Considered

1. Explicit surface classification as primary SSOT, content signals as fallback (adopted — DR-0082)
2. Content signals as sole detection method (rejected)
3. Equal weight between explicit classification and content signals (rejected)

## Adopted

- Adopted: Two-tier detection model — explicit `surface` field is primary SSOT; content-signal heuristics are fallback only when no explicit field exists
- Why: Eliminates contradiction between documentation and implementation; provides deterministic, maintainer-controlled classification; content signals remain useful as fallback for packs without explicit classification
- Evidence: DR-0082, discussion-20260329195516830 REQ-0007

## Rejected

- Candidate: Content signals as sole detection method
- Reason: Fragile; susceptible to false positives from non-UI HTML fragments; loses the value of intentional explicit declarations
- DO NOT: Allow content signals to override an explicit `surface` declaration

- Candidate: Equal weight between explicit and content signals
- Reason: Conflicts when both are present produce unpredictable results; violates SSOT principle
- DO NOT: Merge or average explicit classification with content-signal heuristics

## Impact

- Affects: packages/qfai/src/core/validators/discussionDesignHardening.ts (isUiBearing function), pack metadata schema
- Validation: qfai validate --fail-on error must pass

## Follow-ups

- Implement BR-0023-0026..0031 in discussionDesignHardening.ts
- Add `surface` field to discussion pack metadata schema
- Owner: aganesy
- Due: v1.7.7 release

---

- Change ID: DELTA-0007
- Date: 2026-03-31
- Primary: v1.7.11 WS-A — 4-axis removal from discussion skill, 3-layer canonical teaching
- Tags: CAP-0023, v1.7.11, 3-layer, 4-axis-removal
- Summary: v1.7.11 WS-A — 4-axis removal from discussion skill, 3-layer canonical teaching (US-0023-0010, AC-0023-0030..0032, BR-0023-0032..0034, EX-0023-0043..0046, TC-0023-0043..0046)

## Rationale (DELTA-0007)

- SKILL.md の completion conditions から 4-axis 参照を除去し、3-layer canonical model を正式な完了条件として採用する
- DR-0102 に基づき、canonical model への一貫した収束を推進する

## Candidates Considered (DELTA-0007)

1. 3-layer canonical model in SKILL.md completion conditions (adopted)
2. Keep 4-axis in conditions (rejected)

## Adopted (DELTA-0007)

- Adopted: 3-layer canonical model in SKILL.md completion conditions (DR-0102)
- Why: 4-axis は deprecated であり、completion conditions に残すと outdated model の永続化を招く

## Rejected (DELTA-0007)

- Candidate: Keep 4-axis in conditions
- Reason: Perpetuates outdated model — 3-layer canonical が正式モデルである以上、completion conditions での 4-axis 参照は混乱を招く
- DO NOT: leave 4-axis references in completion conditions
- Temptation: backward compatibility

## Impact (DELTA-0007)

- Affects: SKILL.md completion conditions, spec-0023/02〜06 (US-0023-0010, AC-0023-0030..0032, BR-0023-0032..0034, EX-0023-0043..0046, TC-0023-0043..0046)
- Validation: qfai validate --fail-on error must pass with error=0

## Follow-ups (DELTA-0007)

- SKILL.md の 4-axis 残存箇所の最終確認
- Owner: aganesy
- Due: v1.7.11 release
