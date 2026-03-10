# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                              | AC-Refs                   | Rule                                                                                                                                                                    | Notes         | NFR-Refs |
| ------------ | ---------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| BR-0009-0001 | 5段連鎖の段構成                    | AC-0009-0001              | トレーサビリティ連鎖は discussion, specs, tests, code, verification の5段で構成される                                                                                   | REQ-0009 準拠 |          |
| BR-0009-0002 | discussion 段の成果物              | AC-0009-0002              | discussion 段は discussion-pack（15ファイル）を入力とし、REQ/NFR seeds を出力する                                                                                       | REQ-0009 準拠 |          |
| BR-0009-0003 | specs 段の成果物                   | AC-0009-0002              | specs 段は \_policies/ + spec-XXXX/ を含み、US/AC/BR/EX/TC を出力する                                                                                                   | REQ-0009 準拠 |          |
| BR-0009-0004 | tests 段の成果物                   | AC-0009-0002              | tests 段は tests/e2e/, tests/api/, tests/integration/ に QFAI アノテーション付きテストを配置する                                                                        | REQ-0009 準拠 |          |
| BR-0009-0005 | verification 段の成果物            | AC-0009-0002              | verification 段は qfai validate 実行結果と evidence を生成する                                                                                                          | REQ-0009 準拠 |          |
| BR-0009-0006 | \_policies/ 層の構成               | AC-0009-0003,AC-0009-0004 | \_policies/ は 01_Objective から 10_delta までの共有ポリシーファイルで構成される                                                                                        | REQ-0010 準拠 |          |
| BR-0009-0007 | spec-XXXX/ 層の構成                | AC-0009-0003,AC-0009-0005 | spec-XXXX/ は 01_Spec から 10_Plan までの Capability 固有ファイルで構成される                                                                                           | REQ-0010 準拠 |          |
| BR-0009-0008 | 1 CAP = 1 spec directory           | AC-0009-0003              | 1つの CAP に対して1つの spec-XXXX/ ディレクトリが対応する                                                                                                               | REQ-0010 準拠 |          |
| BR-0009-0009 | 実行コンシューマーのデフォルト読取 | AC-0009-0006              | 実行コンシューマーはデフォルトで spec-XXXX/01_Spec.md のみを読み、\_policies/ はデフォルトでは読まない                                                                  | REQ-0010 準拠 |          |
| BR-0009-0010 | upper-to-lower 参照禁止            | AC-0009-0007              | \_policies/ ファイルは US/AC/BR/EX/TC の ID および spec-XXXX 参照を含んではならない                                                                                     | REQ-0011 準拠 |          |
| BR-0009-0011 | lower-to-upper 参照許可            | AC-0009-0008              | spec-XXXX/ ファイルは CAP, NFR, \_policies/ への参照を含むことができる                                                                                                  | REQ-0011 準拠 |          |
| BR-0009-0012 | Escalation トリガー4条件           | AC-0009-0009              | Escalation Hook のトリガーは Ambiguous, Conflict, Missing, Trade-off の4条件である                                                                                      | REQ-0012 準拠 |          |
| BR-0009-0013 | Escalation ターゲット4ファイル     | AC-0009-0010              | Escalation のターゲットは \_policies/01_Objective.md, 02_Initiative.md, 07_Constraints.md, 08_Decisions.md の4ファイルである                                            | REQ-0012 準拠 |          |
| BR-0009-0014 | Drift Protocol コアルール          | AC-0009-0011              | downstream は承認なしに upstream SSOT を編集してはならない                                                                                                              | REQ-0013 準拠 |          |
| BR-0009-0015 | ドリフト検出時の5ステップ手順      | AC-0009-0012              | ドリフト検出時は STOP → CR（context, proposed change, 3+選択肢, impact scope, decision needed, approved actions）→ ユーザー承認 → owner skill rerun → 再開 の手順に従う | REQ-0013 準拠 |          |
| BR-0009-0016 | Drift Protocol 許可例外            | AC-0009-0013              | .qfai/evidence/\*\* の append/update のみが承認不要の例外として許可される。それ以外はすべてユーザー承認が必要                                                           | REQ-0013 準拠 |          |
| BR-0009-0017 | 01_Spec → CAP 必須エッジ           | AC-0009-0014              | 各 spec-XXXX/01_Spec.md は Parent: CAP-XXXX を含まなければならない                                                                                                      | REQ-0009 準拠 |          |
| BR-0009-0018 | AC → TC 必須エッジ                 | AC-0009-0014              | 各 AC に対して最低1つの TC が存在しなければならない                                                                                                                     | REQ-0009 準拠 |          |
| BR-0009-0019 | BR → EX 必須エッジ                 | AC-0009-0014              | 各 BR に対して最低1つの EX が存在しなければならない                                                                                                                     | REQ-0009 準拠 |          |
| BR-0009-0020 | EX → TC 必須エッジ                 | AC-0009-0014              | 各 EX は最低1つの TC によって実現されなければならない                                                                                                                   | REQ-0009 準拠 |          |
