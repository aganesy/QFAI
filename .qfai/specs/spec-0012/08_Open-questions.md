# 08 Open Questions

3 resolved, 2 deferred.

## OQ-0004: Parameterized Route Matching Strategy (resolved)

- Status: Resolved at SDD
- Resolution: DR-0012-0027 — パターンベースマッチング（Option B）を採用
- Source: discussion-20260414195449523

## OQ-0006: L2 Heuristic Complete Deprecation (deferred)

- Status: Deferred to v1.8
- Rationale: 構造化パース優先は v1.7.15 rev4 で実施。ヒューリスティック完全廃止は v1.8 で対応
- Source: discussion-20260414195449523

## OQ-0002: prototyping.yaml Surface Field Validation (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0033 — validator reject のみ採用（schema 変更なし）
- Source: discussion-20260415014056471

## OQ-0004-rev5: Parameterized Route Mapping in Browser QA (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0034 — パターンベースマッチング（Option B）採用
- Source: discussion-20260415014056471

## OQ-0006-rev5: packResolver.ts Error Type Design (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0035 — PrototypingError 派生型（Option A）採用
- Source: discussion-20260415014056471

## OQ-0005: L2 Full Redesign Scope (deferred to v1.8)

- Status: Deferred to v1.8
- Rationale: rev5 では structured parse 優先 + fallback 格下げで最小整合。L2 完全刷新は v1.8 planning phase で対応
- Source: discussion-20260415014056471
