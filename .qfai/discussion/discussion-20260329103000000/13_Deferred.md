# 13 Deferred

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329103000000 |
| Date          | 2026-03-29                   |

## Deferred Items

| OQ-ID   | Title                                 | Gate | Deferred-Reason                                                          | Deferred-Until                   | Owner | Due    | Severity | Impact                           | Mitigation                                                             | Evidence          |
| ------- | ------------------------------------- | ---- | ------------------------------------------------------------------------ | -------------------------------- | ----- | ------ | -------- | -------------------------------- | ---------------------------------------------------------------------- | ----------------- |
| OQ-0001 | Evidence schema versioning detail     | sdd  | v1.7.5 の目的は foundation 整備であり、詳細版管理まで入れると scope 超過 | v1.7.6 planning kickoff          | team  | v1.7.6 | medium   | spec, implementation, operations | minimum schema を先に固定し、互換性を壊す変更は次期判断に回す          | 11_OQ-Register.md |
| OQ-0002 | Browser QA output normalization shape | sdd  | finding taxonomy の完全正規化は browser QA foundation より後に扱うべき   | browser QA implementation review | team  | v1.7.6 | medium   | spec, tests, implementation      | phase と repair suggestion を minimum mandatory field として先に揃える | 11_OQ-Register.md |
