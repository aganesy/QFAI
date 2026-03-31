# 09 Delta

## Change Summary

- Change ID: DELTA-S34-001
- Date: 2026-03-30
- Primary: spec-0034 initial creation
- Tags: v1.7.8, discussion-architecture, taste-interview, trend-scan, 3-layer, scoring-schema, strategy, screen-contract
- Summary: Initial spec creation for Discussion Canonical Architecture Convergence (CAP-0034) from discussion-20260330035428071

## Rationale

- v1.7.7 gap analysis identified 20 gaps across discussion architecture, prototyping workflow, foundation-only implementations, and repo SSOT
- spec-0034 covers Category A (D-01~D-06): discussion-side canonical architecture convergence
- 6 user stories, 23 acceptance criteria, 22 business rules, 25 examples, 25 test cases

## Candidates Considered

1. 4-axis model immediate error (no migration window)
2. 3-layer model with migration window (adopted)
3. Full anti-preference traceability in v1.7.8

## Adopted

- Adopted: 3-layer model convergence with migration window; 3-point anti-preference traceability
- Why: Migration window protects existing adopters (NFR-0001) while driving convergence (NFR-0005). 3-point anti-preference traceability is sufficient for v1.7.8 scope (AD-007)
- Evidence: discussion-20260330035428071

## Rejected

- Candidate: 4-axis immediate error in v1.7.8 (RJ-003)
- Reason: Migration window needed to avoid breaking existing packs (NFR-0001)
- DO NOT: migration window なしで 4-axis を error にしない
- Temptation: 一気に収束させたい

- Candidate: Full anti-preference traceability in v1.7.8 (RJ-004)
- Reason: Cross-flow traceability infrastructure not yet in place; scope excessive
- DO NOT: v1.7.8 で全フロー anti-preference traceability を要求しない
- Temptation: taste interview の価値を最大化するために全フローで追跡したい

## Impact

- Affects: uiux/ templates, SKILL.md, validators (taste/trend/3-layer/scoring/strategy/screen-contract), reviewer assets, glossary, policy
- Validation: qfai validate pass, TP-01 (3 fixtures per validator), integration tests for sidecar generation

## Follow-ups

- None (all OQs resolved)

## v1.7.9 Convergence Update

- Date: 2026-03-30
- Source: discussion-20260330153902875
- Adopted: discussion completion family を taste/trend/3-layer/strong strategy/strong screen contract に固定
- Rejected: legacy 4-axis を canonical default に戻す案
- DO NOT: convergence release で field family を再分岐させない

---

## Change Summary (DELTA-S34-003)

- Change ID: DELTA-S34-003
- Date: 2026-03-31
- Primary: v1.7.11 WS-A/C/D/E — SKILL.md 4-axis removal + 3-layer canonical teaching
- Tags: v1.7.11, 4-axis-removal, 3-layer, canonical-keywords, SKILL.md
- Summary: v1.7.11 WS-A/C/D/E — SKILL.md 4-axis removal + 3-layer canonical teaching (US-0034-0007..0008, AC-0034-0024..0026, BR-0034-0023..0025, EX-0034-0027..0029, TC-0034-0029..0031)

## Rationale (DELTA-S34-003)

- SKILL.md の completion conditions から 4-axis 参照を完全に除去し、3-layer canonical keywords を必須とする
- DR-0101, DR-0102 に基づき、discussion アーキテクチャの canonical model への最終収束を実現する

## Candidates Considered (DELTA-S34-003)

1. 4-axis removal from completion conditions, 3-layer canonical keywords required (adopted)
2. Keep 4-axis alongside 3-layer (rejected)

## Adopted (DELTA-S34-003)

- Adopted: 4-axis removal from completion conditions, 3-layer canonical keywords required (DR-0101, DR-0102)
- Why: dual model references は認知負荷を増大させ、どちらが canonical か曖昧にする。完全な 3-layer 移行が必要

## Rejected (DELTA-S34-003)

- Candidate: Keep 4-axis alongside 3-layer
- Reason: dual model references を維持すると、どちらが正式モデルか不明確になり、新規ユーザー・既存ユーザー双方に混乱を招く
- DO NOT: maintain dual model references
- Temptation: backward compatibility

## Impact (DELTA-S34-003)

- Affects: SKILL.md, spec-0034/02〜06 (US-0034-0007..0008, AC-0034-0024..0026, BR-0034-0023..0025, EX-0034-0027..0029, TC-0034-0029..0031)
- Validation: qfai validate pass

## Follow-ups (DELTA-S34-003)

- 3-layer canonical keywords の全 SKILL.md への適用確認
- Owner: aganesy
- Due: v1.7.11 release
