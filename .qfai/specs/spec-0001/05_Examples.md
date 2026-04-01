# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                     | Expected                                                                           | Notes                     |
| ------------ | ------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| EX-0001-0001 | BR-0001-0001 | REQUIRED_LAYERED_SPEC_FILES_V1421 の内容を参照                            | 01_Spec.md ~ 09_delta.md の 9 エントリが存在する                                   | v1421 ファイルセット      |
| EX-0001-0002 | BR-0001-0002 | REQUIRED_LAYERED_SHARED_FILES_V1421 の内容を参照                          | 01_Objective.md ~ 10_delta.md の 10 エントリが存在する                             | \_policies ファイルセット |
| EX-0001-0003 | BR-0001-0003 | 対象 spec の 01_Spec.md を参照                                            | Parent: CAP-0001 が記載されている                                                  | 1 CAP = 1 spec            |
| EX-0001-0004 | BR-0001-0004 | spec ディレクトリに 01_Spec.md, 02_User-stories.md, 05_Examples.md が存在 | collectSpecEntries() が layout: "layered", layeredStyle: "v1421" を返す            | v1421 検出                |
| EX-0001-0005 | BR-0001-0005 | 01_Spec.md + 02_User-stories.md はあるが v1421 マーカーがない             | v1417 として判定される                                                             | v1417 フォールバック      |
| EX-0001-0006 | BR-0001-0006 | 対象 spec の各 ID を確認                                                  | US-0001-0001, AC-0001-0001, BR-0001-0001, EX-0001-0001, a TC annotation 形式に準拠 | ID フォーマット           |
| EX-0001-0007 | BR-0001-0007 | QFAI フレームワークの連鎖定義を確認                                       | discussion, specs, tests, code, verification の 5 段が列挙されている               | 5 段連鎖                  |
| EX-0001-0008 | BR-0001-0010 | 06_Test-Cases.md の AC-Refs カラムを確認                                  | 全 AC が少なくとも 1 つの TC の参照に含まれている                                  | AC → TC エッジ            |
| EX-0001-0009 | BR-0001-0011 | 05_Examples.md の BR-Ref カラムを確認                                     | 全 BR が少なくとも 1 つの EX の BR-Ref に含まれている                              | BR → EX エッジ            |
| EX-0001-0010 | BR-0001-0012 | 06_Test-Cases.md の EX-Ref カラムを確認                                   | EX が TC の EX-Ref に含まれている                                                  | EX → TC エッジ            |
| EX-0001-0011 | BR-0001-0014 | \_policies/01_Objective.md で個別仕様 ID を検索                           | US/AC/BR/EX/TC の ID が見つからない                                                | upper-to-lower 禁止       |
| EX-0001-0012 | BR-0001-0016 | 01_Spec.md の Escalation Hook セクションを確認                            | Ambiguous, Conflict, Missing, Trade-off の 4 条件が列挙されている                  | Escalation 4 条件         |
| EX-0001-0013 | BR-0001-0017 | drift-protocol.md の Core rule を確認                                     | upstream SSOT の無承認編集禁止が記述されている                                     | Drift コアルール          |
| EX-0001-0014 | BR-0001-0018 | drift-protocol.md の When drift is detected セクションを確認              | STOP → CR → 承認 → owner skill rerun → 再開 の 5 ステップが記述されている          | Drift 5 ステップ          |
| EX-0001-0015 | BR-0001-0019 | drift-protocol.md の Allowed exceptions セクションを確認                  | .qfai/evidence/\*\* append/update のみが許可例外                                   | Drift 許可例外            |
| EX-0001-0016 | BR-0001-0020 | Skill カタログを数える                                                    | 9 エントリが存在する                                                               | Skill 総数                |
| EX-0001-0017 | BR-0001-0021 | 依存関係グラフを確認                                                      | configure -.-> discussion → sdd → prototyping → atdd → verify                      | 実行順序                  |
| EX-0001-0018 | BR-0001-0022 | tdd-red のカタログエントリを参照                                          | status=deprecated, migration-target=qfai-atdd が明記                               | deprecated Skill          |
| EX-0001-0019 | BR-0001-0023 | Canonical Workflow Stages を参照                                          | Stage 0 ~ Stage 6 の 7 ステージが定義されている                                    | 7 ステージ                |
| EX-0001-0020 | BR-0001-0024 | constitution.md を参照                                                    | Article I ~ X の 10 条が記載、非交渉条項と明記                                     | Constitution              |
| EX-0001-0021 | BR-0001-0008 | discussion 段の成果物定義を確認                                           | discussion-pack（15 ファイル）→ REQ/NFR seeds の入出力が記述されている             | discussion 段             |
| EX-0001-0022 | BR-0001-0009 | specs 段の成果物定義を確認                                                | \_policies/ + spec-XXXX/ → US/AC/BR/EX/TC の入出力が記述されている                 | specs 段                  |
| EX-0001-0023 | BR-0001-0013 | spec-XXXX/01_Spec.md の Parent フィールドを確認                           | Parent: CAP-XXXX が存在する                                                        | 01_Spec → CAP エッジ      |
| EX-0001-0024 | BR-0001-0015 | spec-XXXX/01_Spec.md で \_policies 参照を検索                             | CAP, NFR, \_policies への参照が含まれている                                        | lower-to-upper 許可       |
