# 13 Deferred

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Deferred Items

| OQ-ID   | Title                                              | Gate       | Deferred-Reason                                                                                  | Deferred-Until | Owner | Due  | Severity | Impact                                        | Mitigation                                                            | Evidence              |
| ------- | -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ | -------------- | ----- | ---- | -------- | --------------------------------------------- | --------------------------------------------------------------------- | --------------------- |
| OQ-0002 | Reviewer disagreement schema formalization timeline | discussion | v1.7.4 は stabilization リリース。schema formalization は reviewer 体験に依存し、広範な設計議論が必要。 | v1.8 planning  | user  | v1.8 | medium   | spec: reviewer prompt test が structure のみ。implementation: schema なしで prompt 運用。 | REQ-0022 の structure-level test で prompt 形式の基本品質を担保。      | Design spec Section 8 |
| OQ-0003 | Report UX localized variants                       | discussion | v1.7.4 の core scope 外。i18n infrastructure が未整備。                                           | v1.8 planning  | user  | v1.8 | low      | implementation: 英語 only のまま。operations: 日本語ユーザーに英語 error message。 | Error message に rule ID + fix suggestion を含め、言語非依存の actionability を確保。 | Design spec Section 8 |
