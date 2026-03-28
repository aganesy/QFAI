# 99 Delta (Change Log)

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Adopted Decisions

| Decision ID | Title                                   | Date       | Adopted Option                              | Rationale                                                                                   |
| ----------- | --------------------------------------- | ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| DEC-001     | Warning-to-error ratchet                | 2026-03-29 | Warning default + config flag (OQ-0001 B)   | Phased adoption prevents legacy project breakage while enabling strict mode for early adopters |
| DEC-002     | No auto-refresh in v1.7.4               | 2026-03-29 | Migration guidance only (OQ-0004 B)         | Auto-refresh requires CLI infra out of stabilization scope; guidance is sufficient           |
| DEC-003     | Semantic rule IDs                       | 2026-03-29 | `UIX-VAL-SIDECAR-MISSING` style (OQ-0005 B) | Improves actionability; user understands issue from ID alone                                |
| DEC-004     | Migration config key                    | 2026-03-29 | `uiux.migration.strict` boolean (OQ-0006 A) | Simplest path; aligns with existing `uiux` config section                                   |
| DEC-005     | Semantic rule IDs for UIX-VAL           | 2026-03-29 | `UIX-VAL-SIDECAR-MISSING` style (OQ-0005 B) | Improves actionability; user understands issue from ID alone                                |
| DEC-006     | Minimum content threshold for fields    | 2026-03-29 | 20-char minimum for critical narrative fields | Deterministic floor above trivially empty strings; prevents false-pass accumulation          |
| DEC-007     | UI-bearing detection formal signal set  | 2026-03-29 | Positive signals + negative overrides table  | Prevents false-positive classification; each signal/override has dedicated fixture test      |
| DEC-008     | Phase 1 exit criterion                  | 2026-03-29 | 30 days post-release or 1+ strict adoption   | Prevents Phase 1 from persisting indefinitely; data-driven promotion                        |
| DEC-009     | Validator implementation sequence       | 2026-03-29 | 8-step dependency order (TC-09)              | Prevents implementation churn from building completeness checks before detection foundation  |
| DEC-010     | CHANGELOG test count carry-over        | 2026-03-29 | Fix "25 new tests" -> "26 new tests" (REQ-0023) | PR #181 NIT #3005345979 unreplied; actual diff shows 26 `it()` additions                    |

## Rejected Options

| Decision ID | Rejected Option                            | Reason                                                                        | Recurrence Prevention                                                     |
| ----------- | ------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DEC-001     | (A) v1.7.4 で即 error                      | Legacy project が即座に壊れる。adoption runway がない。                        | Migration enforcement policy の Phase 定義を維持する。                     |
| DEC-001     | (C) v1.8 まで warning のみ                 | 早期 adopter が strict mode を使えない。feedback loop が遅れる。               | Config flag の提供を義務付ける。                                           |
| DEC-002     | (A) v1.7.4 で auto-refresh CLI             | CLI command infra + template diffing が stabilization scope を超える。         | v1.8 planning で auto-refresh を明示的にスコープに含める。                 |
| DEC-004     | (B) `uiux.migration.severity: error`       | String value は typo リスクあり。boolean のほうが明確。                        | Config key に boolean を使うガイドラインを維持する。                        |
| DEC-004     | (C) `validators.uixVal.migrationSeverity`  | 既存の `uiux` section と分離される。config の一貫性が損なわれる。              | UIX 関連 config は `uiux` section に集約するルールを維持する。             |
| DEC-005     | (A) `UIX-VAL-001` 連番                     | Rule ID から内容が推測できない。actionability が低い。                         | Rule ID には semantic name を使うガイドラインを維持する。                   |
| DEC-005     | (C) `QFAI-UIX-001` prefix 付き連番         | Prefix は冗長。既存 pattern も混在しており統一困難。                           | 新規 family は semantic name pattern を採用する。                          |

## Drift Events

0 items

## Change History

| Date       | Change Type | Files Affected                          | Description                                                      |
| ---------- | ----------- | --------------------------------------- | ---------------------------------------------------------------- |
| 2026-03-29 | Initial     | All 15 files                            | Initial discussion pack creation                                 |
| 2026-03-29 | Fix         | 06_REQ, 10_Policy, 09_Constraints, 99_delta | Address R11 devils-advocate FAIL cycle 1: min-length threshold, signal set, phase exit criterion |
| 2026-03-29 | Fix         | 09_Constraints, 99_delta                    | Address R11 devils-advocate FAIL cycle 2: validator implementation dependency order (TC-09)      |
| 2026-03-29 | Addition    | 06_REQ, 04_Sources, 99_delta                | Carry-over PR #181 NIT: CHANGELOG test count correction (REQ-0023, SRC-0014, DEC-010)           |
