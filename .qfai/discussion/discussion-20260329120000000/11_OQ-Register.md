# 11 OQ Register

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Register

| OQ-ID   | Title                                              | Gate       | Disposition | Owner | Rationale                                                                                          | Options                                                                                                                                      | Recommendation                                       | Next-Decision-Point | Due       | Evidence                         |
| ------- | -------------------------------------------------- | ---------- | ----------- | ----- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------- | --------- | -------------------------------- |
| OQ-0001 | Legacy pack warning-to-error ratchet timing         | discussion | resolved    | agent | Ratchet timing は migration adoption rate に依存。v1.7.4 で hard-code するのは早計。              | (A) v1.7.4 で即 error (B) v1.7.4 で warning + config flag で error opt-in (C) v1.8 まで warning のみ                                         | Option B: warning default + config flag for error    | N/A                 | v1.7.4    | Design spec Section 4, 10_Policy |
| OQ-0002 | Reviewer disagreement schema formalization timeline | discussion | deferred    | user  | v1.8 前に formalize する必要があるが、v1.7.4 のスコープ外。reviewer prompt structure test で十分。 | (A) v1.7.4 で schema 定義 (B) v1.8 で schema 定義 (C) schema なし、prompt test のみ                                                          | Option B: v1.8 で schema 定義                         | v1.8 planning       | v1.8      | Design spec Section 8            |
| OQ-0003 | Report UX localized variants                       | discussion | deferred    | user  | Localization は v1.7.4 の core scope ではない。英語 report で十分。                                | (A) v1.7.4 で i18n 対応 (B) v1.8 で i18n 対応 (C) 英語 only を維持                                                                           | Option B: v1.8 で i18n 対応                           | v1.8 planning       | v1.8      | Design spec Section 8            |
| OQ-0004 | Stale asset auto-refresh helper necessity           | discussion | resolved    | agent | Auto-refresh は migration guidance で代替可能。helper は automation scope (v1.8)。                 | (A) v1.7.4 で auto-refresh CLI コマンド (B) v1.7.4 で migration guidance のみ (C) v1.8 で auto-refresh                                        | Option B: migration guidance only in v1.7.4          | N/A                 | v1.7.4    | Design spec Section 8            |
| OQ-0005 | UIX-VAL rule ID naming convention                  | discussion | resolved    | agent | 既存の code pattern (`QFAI-AUD-*`, `SLP-*`) との一貫性が必要。                                    | (A) `UIX-VAL-001` 連番 (B) `UIX-VAL-SIDECAR-MISSING` semantic name (C) `QFAI-UIX-001` QFAI prefix 付き連番                                   | Option B: semantic name for readability              | N/A                 | v1.7.4    | SRC-0005, SRC-0011               |
| OQ-0006 | Config key for migration severity escalation        | discussion | resolved    | agent | config 構造は既存の `uiux` section に合わせる。                                                   | (A) `uiux.migration.strict: true` (B) `uiux.migration.severity: error` (C) `validators.uixVal.migrationSeverity: error`                      | Option A: `uiux.migration.strict` for simplicity     | N/A                 | v1.7.4    | SRC-0008                         |

## Summary

| Disposition | Count |
| ----------- | ----- |
| open        | 0     |
| resolved    | 4     |
| deferred    | 2     |
| rejected    | 0     |
| **Total**   | **6** |
