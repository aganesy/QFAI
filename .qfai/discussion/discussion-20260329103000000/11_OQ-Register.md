# 11 OQ Register

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329103000000 |
| Date          | 2026-03-29                   |

## Register

| OQ-ID   | Title                                    | Gate       | Disposition | Owner | Rationale                                                                          | Options                                                                                                        | Recommendation | Next-Decision-Point                | Due    | Evidence              |
| ------- | ---------------------------------------- | ---------- | ----------- | ----- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------- | ------ | --------------------- |
| OQ-0001 | Evidence schema versioning detail        | sdd        | deferred    | team  | v1.7.5 では foundation 優先であり、versioning detail を固定すると scope 超過になる | (A) v1.7.5 で厳密版管理導入 (B) v1.7.5 は最小 schema、v1.7.6 で版管理追加                                      | Option B       | schema update planning             | v1.7.6 | SRC-0001 section 8    |
| OQ-0002 | Browser QA output normalization shape    | sdd        | deferred    | team  | phase別 structured finding は必要だが field taxonomy の詳細固定は後続でよい        | (A) v1.7.5 で完全正規化 (B) 共通 minimum fields のみ定義し詳細は v1.7.6                                        | Option B       | browser QA implementation planning | v1.7.6 | SRC-0001 section 8    |
| OQ-0003 | Visual-review backend naming taxonomy    | discussion | resolved    | agent | Playwright/agent-browser/future backend を束ねる naming は抽象度優先が妥当         | (A) browser backend 固定 (B) visual-review backend 固定 (C) provider abstraction 前提で capability-driven 命名 | Option C       | N/A                                | v1.7.5 | SRC-0001 section 2.3  |
| OQ-0004 | Static/runtime expectation split by mode | discussion | resolved    | agent | review focus 上、mode 差を明示しないと再度 default burden が混入する               | (A) default/standard のみ区分 (B) standard/low-cost/full-harness を明示 (C) mode 差を明文化しない              | Option B       | N/A                                | v1.7.5 | SRC-0001 review focus |

## Summary

| Disposition | Count |
| ----------- | ----- |
| open        | 0     |
| resolved    | 2     |
| deferred    | 2     |
| rejected    | 0     |
| **Total**   | **4** |
