# 07_NFR

## Non-Functional Requirements Table

| NFR-ID   | Title                            | Description                                                                                                                                  | Source             | Category        | Target                                        | Status |
| -------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------- | --------------------------------------------- | ------ |
| NFR-0001 | Backward compatibility           | v1.7.6/v1.7.7 で生成された discussion pack および sidecar が v1.7.8 validator で immediate error にならない（migration window 内は warning） | SRC-0001 (G-13)    | Compatibility   | Migration window 内: warning only             | draft  |
| NFR-0002 | Non-UI project safety            | non-UI project (surface_type: non-ui) に対して UI-bearing 専用の新 validator が発火しない                                                    | SRC-0001 (G-18)    | Correctness     | UI-bearing validator の non-UI fire count = 0 | draft  |
| NFR-0003 | Validator determinism            | 全新 validator rule が deterministic（同一入力 → 同一出力）であり、semantic judgment を含まない                                              | SRC-0001 (Sec 7)   | Reliability     | Non-deterministic validator = 0               | draft  |
| NFR-0004 | Validator/reviewer separation    | deterministic validate と semantic review が混在しない。validator は構造・存在チェックのみ、reviewer は品質判定                              | SRC-0001 (Sec 1.2) | Maintainability | Mixed validator/reviewer = 0                  | draft  |
| NFR-0005 | SSOT convergence                 | skill docs / templates / validators / policy / glossary / specs / core modules が同一 canonical model を参照                                 | SRC-0001 (Sec 4.3) | Consistency     | Conflicting model references = 0              | draft  |
| NFR-0006 | Test coverage for new validators | 全新 validator rule に pass/fail/non-UI の最低 3 fixture テストが存在                                                                        | SRC-0001 (Sec 8)   | Testability     | Test per new validator >= 3                   | draft  |
| NFR-0007 | CLI/skill body alignment         | `qfai prototyping --mode` CLI behavior と skill body 記述が矛盾しない                                                                        | SRC-0001 (G-08)    | Consistency     | CLI/skill drift = 0                           | draft  |
| NFR-0008 | Feature maturity consistency     | README / CHANGELOG / steering / source comments で同一 subsystem の maturity 表現が矛盾しない                                                | SRC-0001 (G-14)    | Documentation   | Contradictory maturity labels = 0             | draft  |
| NFR-0009 | Migration documentation          | 全 migration path (old → intermediate → final) に user-facing upgrade guidance が存在                                                        | SRC-0001 (G-13)    | Usability       | Undocumented migration path = 0               | draft  |
| NFR-0010 | Scoring-ready completeness       | 全 scoring-ready axis artifact が 16 mandatory fields を持つ                                                                                 | SRC-0001 (G-04)    | Completeness    | Missing field per axis = 0                    | draft  |

## Category Legend

- Compatibility: 後方互換性
- Correctness: 正確性
- Reliability: 信頼性
- Maintainability: 保守性
- Consistency: 一貫性
- Testability: テスト容易性
- Documentation: 文書品質
- Usability: 使いやすさ
- Completeness: 完全性

## Rules

- Each NFR must have a measurable target.
- Status: `draft` → `reviewed` → `approved`.
