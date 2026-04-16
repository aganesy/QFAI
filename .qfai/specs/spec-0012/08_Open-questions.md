# 08 Open Questions

3 resolved, 2 deferred. (rev8 adds 4 resolved; cumulative: 13 resolved, 2 deferred)

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

## OQ-0001-rev7: packHash in calibrationRef (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0041 — defer packHash; packPath+packVersion+configPath sufficient
- Source: discussion-20260415203030886

## OQ-0002-rev7: Error Class Location (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0042 — prototyping/errors.ts (SRP; independently testable)
- Source: discussion-20260415203030886

## OQ-0003-rev7: configPath Mandatory vs Optional (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0043 — optional (configPath?: string); validator skips when absent
- Source: discussion-20260415203030886

## OQ-0004-rev7: Obsolete Field Detection Timing (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0044 — normalize-time; consistent with existing config.ts patterns
- Source: discussion-20260415203030886

## OQ-0005-rev7: surfacePolicy Rejection Message Generation (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0045 — generate from PROTOTYPING_SUPPORTED_SURFACES constant; DRY
- Source: discussion-20260415203030886

## OQ-0001-rev8: pathUtils.ts as New File vs Inline Helpers (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0046 — standalone leaf module pathUtils.ts (Option A); no import from execution.ts or its importers (circular import prevention)
- Source: discussion-20260416023323603

## OQ-0002-rev8: measurement.ts Scope (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0047 — include measurement.ts conditionally; update to shared helpers only if confirmed to use absolute paths (conservative scope)
- Source: discussion-20260416023323603

## OQ-0003-rev8: runtimeGate.evidenceRefs Empty Array Policy (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0048 — fail-closed: empty array runtimeGate.evidenceRefs is always a validator error; no valid case for empty array in full-harness UI-only output
- Source: discussion-20260416023323603

## OQ-0004-rev8: README.md Update Scope (resolved at discussion)

- Status: Resolved at discussion
- Resolution: Update README.md only if existing description is absent or obsolete. No new DR required; conditional update confirmed in discussion-20260416023323603 OQ-0004 resolution.
- Source: discussion-20260416023323603