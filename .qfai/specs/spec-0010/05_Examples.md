# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                                                     | Expected                                                                                                              | Notes                                |
| ------------ | ------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| EX-0010-0001 | BR-0010-0001 | `.qfai/assistant/steering/` ディレクトリを検査                                                            | manifest.md, product.md, structure.md, tech.md, test-layers.md の 5 ファイルが存在する                                | Steering 文書 5 ファイル構成の検証   |
| EX-0010-0002 | BR-0010-0003 | manifest.md の内容を参照                                                                                  | product mission, axioms, compatibility rubric, governance, evidence のセクションが含まれる                            | Decision Spine 責務の検証            |
| EX-0010-0003 | BR-0010-0004 | `.qfai/assistant/instructions/` ディレクトリを検査                                                        | workflow.md, drift-protocol.md, constitution.md, agent-selection.md, requirements-decomposition.md の 5 ファイルが存在 | Instructions 文書 5 ファイル構成検証 |
| EX-0010-0004 | BR-0010-0006 | `.qfai/assistant/steering/review-roster.yml` を参照                                                       | 10 reviewers のエントリが定義されている                                                                               | Review Roster 10 名構成の検証        |
| EX-0010-0005 | BR-0010-0007 | reviewer が N/A 評決を下す場合                                                                            | na_rule フィールドに理由が記載されている。理由なしの場合はバリデーションエラー                                        | N/A 評決ルールの検証                 |
| EX-0010-0006 | BR-0010-0008 | 3 番目のレビュアー（reviewer）が FAIL を出す                                                              | 修正後に新 review-pack が作成され、1 番目のレビュアー（qa-lead）から再開される                                        | FAIL 時ループ復帰の検証              |
| EX-0010-0007 | BR-0010-0009 | review-pack に追記する                                                                                    | 既存エントリが保持されたまま新エントリが末尾に追加される                                                              | append-only ポリシーの検証           |
| EX-0010-0008 | BR-0010-0010 | エージェントが Article IV（SDD is SSOT）に反する操作を試行                                                | 操作が拒否される。Constitution は例外なく適用される                                                                   | 非交渉原則の検証                     |
| EX-0010-0009 | BR-0010-0011 | constitution.md の内容を参照                                                                              | Article I〜Article IX の 9 条が すべて記載されている                                                                  | 9 Articles 網羅性の検証              |
| EX-0010-0010 | BR-0010-0012 | qfai-sdd Skill を開始する                                                                                 | Stage 0（steering refresh）が最初に実行される                                                                         | Stage 0 必須実行の検証               |
| EX-0010-0011 | BR-0010-0013 | prototyping が不要なケースで Stage 3 完了後に遷移                                                         | Stage 4 をスキップし Stage 5（acceptance tests）に直接遷移する                                                        | Stage 4 オプショナルの検証           |
| EX-0010-0012 | BR-0010-0014 | Canonical Workflow 全体を参照                                                                              | Stage 0〜Stage 6 の 7 ステージが順序付きで定義されている                                                              | 7 ステージ構成の検証                 |
| EX-0010-0013 | BR-0010-0015 | Stage 2（requirements）が完了し Stage 3（specification）に遷移                                            | Stage 2 の完了が確認された後にのみ Stage 3 が開始される                                                               | 遷移条件の検証                       |
