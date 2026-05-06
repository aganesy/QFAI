# 10 Plan

## Goal

- Keep prototyping SSOT aligned to the current skill-first architecture and reviewer-score evidence model.

## Current State

- The single-thread UX-loop is the active model: `qfai prototyping iterate --cycle <n>` drives 0..14 cycles, `qfai prototyping certify` seals the run.
- The 4 reviewer axes are `informationArchitecture`, `navigationFlow`, `usability`, `functionality`; convergence requires every axis at `exceptional` plus `layoutAntiPatternsDetected[] === [] && designMdViolations[] === []`.
- DESIGN.md (root) is the brand SSOT. The SDD lock at `.qfai/contracts/design/DESIGN.md.lock.yaml#designMdSha256` is the single source of truth for the frozen sha256; `prototyping.json#designMd.sha256` is a lock-anchored cache.
- Validate/verify hold the machine gates; the prototyping certify gate adds the DESIGN.md compliance scan over every final-iteration HTML file.
- Legacy v1.x surfaces (round/candidate/absorption funnel, `fullHarness.iterations[]`, `scoringTrace[]`, `allReviewerAxesPerfect100`, mode budgets, hard-floor evaluation rubric) are PURGED from the active spec and the public code surface (see `09_delta.md` CHG-001).
- Former `spec-0017` (CAP-0017 v2.0) and `spec-0018` are absorbed into `spec-0012`; the standalone directories no longer exist.

## Next Maintenance Steps

1. Keep `spec-0012` aligned with `qfai-prototyping` SKILL.md and its references.
2. When the iterate / certify schema changes, update `prototypingIterate.ts`, `prototypingCertify.ts`, `iteration.ts`, `evaluatorReview.ts`, and this spec together.
3. Keep `16_Traceability-ledger.md` and `tdd/test-list.md` aligned with real remaining tests only.
4. Do not recreate standalone prototyping spec packs unless the product surface genuinely splits again; extend `spec-0012` instead.
