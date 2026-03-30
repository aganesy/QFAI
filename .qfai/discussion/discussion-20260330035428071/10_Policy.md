# 10_Policy

## Security Policies

| ID   | Policy                                            | Description                                                    |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- |
| SP-01 | 0 items                                           | v1.7.8 にセキュリティポリシー変更なし                           |

## Compliance Policies

| ID   | Policy                                            | Description                                                    |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- |
| CP-01 | Validator/reviewer separation                     | deterministic validation と semantic review を分離するポリシー（NFR-0004 参照） |

## Quality Policies

| ID   | Policy                                            | Description                                                    |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- |
| QP-01 | Canonical model single source                     | 3-layer evaluation model が唯一の canonical model。4-axis は legacy |
| QP-02 | Static-first prototyping default                  | prototyping のデフォルトは static analysis 優先。runtime check は mode-aware |
| QP-03 | Honest evidence reporting                         | render evidence / browser QA は actual 結果を報告。placeholder / foundation-only を許容しない |
| QP-04 | Feature maturity vocabulary                       | complete / foundation-only / preview / correction target の 4 語のみ使用 |
| QP-05 | Non-UI explicit n/a path                          | non-UI project では UI-bearing 専用 artifact/validator を n/a として扱う |

## Testing Policies

| ID   | Policy                                            | Description                                                    |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- |
| TP-01 | New validator test minimum                        | 全新 validator に pass / fail / non-UI の最低 3 fixture テスト  |
| TP-02 | Migration path test                               | old / intermediate / final の各 migration path にテスト        |
| TP-03 | Test layers policy                                | `.qfai/assistant/steering/test-layers.md` に準拠               |
