# 06 REQ

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329130000123 |
| Date          | 2026-03-29                   |

## Functional Requirements

| REQ-ID   | Requirement                                                                                                                    | Source Refs       | Notes                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- | -------------------------------- |
| REQ-0001 | `/qfai-prototyping` default mode は static-first obligations のみで完了判定できなければならない                                | SRC-0001          | runtime-heavy default correction |
| REQ-0002 | API non-404、DB existence、UI route reachability は default hard gate ではなく opt-in または上位フェーズへ移さなければならない | SRC-0001          | phase boundary correction        |
| REQ-0003 | prototyping DONE 条件は source、route、state、contract-level obligations 中心に再定義されなければならない                      | SRC-0001          | static L1 foundation             |
| REQ-0004 | render evidence は screenshot、viewport metadata、DOM/HTML snapshot reference を表現できなければならない                       | SRC-0001          | evidence foundation              |
| REQ-0005 | render evidence の capture status は少なくとも `captured`、`skipped`、`failed` を区別できなければならない                      | SRC-0001          | mode-aware evidence              |
| REQ-0006 | visual-review / browser evidence backend は provider abstraction を通じて登録できなければならない                              | SRC-0001          | backend extensibility            |
| REQ-0007 | backend capability declaration は optional registration と fail-open / skipped semantics を持たなければならない                | SRC-0001          | non-web safety                   |
| REQ-0008 | browser QA は smoke、interaction、visual、accessibility の phase を個別に扱えなければならない                                  | SRC-0001          | phase decomposition              |
| REQ-0009 | browser QA 出力は structured findings と repair suggestions を返せなければならない                                             | SRC-0001          | actionable follow-up             |
| REQ-0010 | standard / low-cost / full-harness など mode ごとの expectation 差分を明示できなければならない                                 | SRC-0001          | mode-aware obligations           |
| REQ-0011 | non-web / non-visual project は browser availability や external tool install 成功を前提にせず処理できなければならない         | SRC-0001,SRC-0007 | compatibility protection         |
| REQ-0012 | docs、report、tests は新しい static/runtime boundary と optional capability semantics を説明・検証できなければならない         | SRC-0001,SRC-0008 | downstream clarity               |
