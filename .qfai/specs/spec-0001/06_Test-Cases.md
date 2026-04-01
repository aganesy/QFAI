# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Level: L-struct（構造バリデーション — `qfai validate` による静的検証）

## Test Case Table (required)

| TC-ID        | Level    | AC-Refs      | EX-Ref       | Steps                                                                                  | Expected                                                 | Notes                |
| ------------ | -------- | ------------ | ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------- |
| TC-0001-0001 | L-struct | AC-0001-0001 | EX-0001-0001 | REQUIRED_LAYERED_SPEC_FILES_V1421 のエントリ数を確認                                   | 9 ファイルが定義されている                               | v1421 spec ファイル  |
| TC-0001-0002 | L-struct | AC-0001-0002 | EX-0001-0002 | REQUIRED_LAYERED_SHARED_FILES_V1421 のエントリ数を確認                                 | 10 ファイルが定義されている                              | \_policies ファイル  |
| TC-0001-0003 | L-struct | AC-0001-0003 | EX-0001-0004 | v1421 マーカー付きディレクトリで collectSpecEntries() を実行                           | layeredStyle: "v1421" と判定される                       | v1421 検出           |
| TC-0001-0004 | L-struct | AC-0001-0003 | EX-0001-0005 | v1421 マーカーなしで 01_Spec.md + 02_User-stories.md 存在時                            | v1417 として判定される                                   | v1417 フォールバック |
| TC-0001-0005 | L-struct | AC-0001-0004 | EX-0001-0006 | spec-0001 の全 ID が KIND-0001-YYYY 形式であるか検証                                   | 全 ID が形式に準拠                                       | ID フォーマット      |
| TC-0001-0006 | L-struct | AC-0001-0005 | EX-0001-0007 | フレームワーク定義で 5 段連鎖の記述を検索                                              | 5 段が定義されている                                     | 5 段連鎖             |
| TC-0001-0007 | L-struct | AC-0001-0006 | EX-0001-0008 | 03_Acceptance-Criteria の全 AC が 06_Test-Cases の AC-Refs に含まれるか検証            | 全 AC がカバーされている                                 | AC → TC              |
| TC-0001-0008 | L-struct | AC-0001-0006 | EX-0001-0009 | 04_Business-Rules の全 BR が 05_Examples の BR-Ref に含まれるか検証                    | 全 BR がカバーされている                                 | BR → EX              |
| TC-0001-0009 | L-struct | AC-0001-0006 | EX-0001-0010 | 05_Examples の全 EX が 06_Test-Cases の EX-Ref に含まれるか検証                        | 全 EX がカバーされている                                 | EX → TC              |
| TC-0001-0010 | L-struct | AC-0001-0007 | EX-0001-0011 | \_policies/ 全ファイルで US-XXXX, AC-XXXX, BR-XXXX, EX-XXXX, TC-XXXX, spec-XXXX を検索 | いずれも見つからない                                     | upper-to-lower 禁止  |
| TC-0001-0011 | L-struct | AC-0001-0007 | EX-0001-0024 | spec-XXXX/01_Spec.md で CAP, NFR, \_policies 参照を検索                                | 参照が存在する                                           | lower-to-upper 許可  |
| TC-0001-0012 | L-struct | AC-0001-0008 | EX-0001-0012 | 01_Spec.md の Escalation Hook セクションで 4 トリガー条件を検証                        | Ambiguous, Conflict, Missing, Trade-off が列挙されている | Escalation トリガー  |
| TC-0001-0013 | L-struct | AC-0001-0009 | EX-0001-0013 | drift-protocol.md の Core rule を検証                                                  | upstream SSOT 無承認編集禁止が記述                       | Drift コアルール     |
| TC-0001-0014 | L-struct | AC-0001-0009 | EX-0001-0014 | drift-protocol.md の 5 ステップ手順を検証                                              | STOP, CR, 承認, owner skill rerun, 再開 が記述           | Drift 5 ステップ     |
| TC-0001-0015 | L-struct | AC-0001-0009 | EX-0001-0015 | drift-protocol.md の Allowed exceptions を検証                                         | .qfai/evidence/\*\* のみ許可                             | Drift 許可例外       |
| TC-0001-0016 | L-struct | AC-0001-0010 | EX-0001-0016 | Skill カタログのエントリ数を確認                                                       | 9 Skill が定義されている                                 | Skill カタログ       |
| TC-0001-0017 | L-struct | AC-0001-0011 | EX-0001-0017 | 依存関係グラフの順序と DAG 性を確認                                                    | 正しい順序で循環なし                                     | Skill 依存関係       |
| TC-0001-0018 | L-struct | AC-0001-0010 | EX-0001-0018 | deprecated Skill のステータスと移行先を確認                                            | 3 Skill が deprecated、移行先は qfai-atdd                | deprecated Skill     |
| TC-0001-0019 | L-struct | AC-0001-0012 | EX-0001-0019 | Canonical Workflow Stages のステージ数を確認                                           | 7 ステージが定義されている                               | 7 ステージ           |
| TC-0001-0020 | L-struct | AC-0001-0012 | EX-0001-0020 | Constitution の Article 数と非交渉原則を確認                                           | 10 Articles、非交渉条項と明記                            | Constitution         |
| TC-0001-0021 | L-struct | AC-0001-0005 | EX-0001-0021 | discussion 段の成果物を構造的に検証                                                    | discussion-pack → REQ/NFR seeds が記述                   | discussion 段        |
| TC-0001-0022 | L-struct | AC-0001-0005 | EX-0001-0022 | specs 段の成果物を構造的に検証                                                         | \_policies/ + spec-XXXX/ → US/AC/BR/EX/TC が記述         | specs 段             |
| TC-0001-0023 | L-struct | AC-0001-0006 | EX-0001-0023 | spec-XXXX/01_Spec.md の Parent: CAP-XXXX を検証                                        | Parent フィールドが存在し CAP 形式                       | 01_Spec → CAP        |
| TC-0001-0024 | L-struct | AC-0001-0001 | EX-0001-0003 | spec-0001 の 01_Spec.md に Parent: CAP-0001 が存在するか検証                           | Parent: CAP-0001 が記載                                  | Parent CAP 参照      |
