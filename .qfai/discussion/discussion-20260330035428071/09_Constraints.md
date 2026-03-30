# 09_Constraints

## Technical Constraints

| ID   | Constraint                                        | Rationale                                                      | Impact                              |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| TC-01 | TypeScript / Node.js runtime                      | QFAI は TypeScript ベースの CLI/フレームワーク                   | 全実装は TypeScript で行う           |
| TC-02 | Monorepo (packages/qfai/)                         | 既存の monorepo 構造を維持                                       | パッケージ分割は行わない             |
| TC-03 | Deterministic validator only                      | validator に LLM/AI 判定を含めない                               | 品質判定は reviewer 側で行う         |
| TC-04 | Backward compatible migration                     | v1.7.6/v1.7.7 pack を即座に壊さない                             | migration window 内は warning level  |
| TC-05 | Non-UI project safety                             | non-UI project で新 validator が over-fire しない               | 全新 validator に surface type guard |

## Operational Constraints

| ID   | Constraint                                        | Rationale                                                      | Impact                              |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| OC-01 | CI green gate 維持                                | 既存 CI workflow が PASS し続ける                                | 全変更に対して CI テスト必須         |
| OC-02 | `qfai validate --fail-on error` PASS              | validate hard gate が v1.7.8 でも PASS                          | 新 validator は error/warning level を正しく設定 |

## Legal/Compliance Constraints

| ID   | Constraint                                        | Rationale                                                      | Impact                              |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| LC-01 | 0 items                                           | v1.7.8 に法的/コンプライアンス制約なし                           | N/A                                 |

## Budget/Resource Constraints

| ID   | Constraint                                        | Rationale                                                      | Impact                              |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| BC-01 | 0 items                                           | v1.7.8 に予算制約なし                                           | N/A                                 |

## Deadline Constraints

| ID   | Constraint                                        | Rationale                                                      | Impact                              |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| DC-01 | v1.7.7 直後の correction release                  | v1.7.8 は次の feature release (v1.8.0) 前に完了すべき           | P0 deliverables を優先実装           |
