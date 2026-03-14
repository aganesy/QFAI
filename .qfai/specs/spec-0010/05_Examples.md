# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                          | Expected                                                                                                               | Notes                                |
| ------------ | ------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| EX-0010-0001 | BR-0010-0001 | `.qfai/assistant/steering/` ディレクトリを検査                 | manifest.md, product.md, structure.md, tech.md, test-layers.md の 5 ファイルが存在する                                 | Steering 文書 5 ファイル構成の検証   |
| EX-0010-0002 | BR-0010-0003 | manifest.md の内容を参照                                       | product mission, axioms, compatibility rubric, governance, evidence のセクションが含まれる                             | Decision Spine 責務の検証            |
| EX-0010-0003 | BR-0010-0004 | `.qfai/assistant/instructions/` ディレクトリを検査             | workflow.md, drift-protocol.md, constitution.md, agent-selection.md, requirements-decomposition.md の 5 ファイルが存在 | Instructions 文書 5 ファイル構成検証 |
| EX-0010-0004 | BR-0010-0006 | `.qfai/assistant/steering/review-roster.yml` を参照            | 10 reviewers のエントリが定義されている                                                                                | Review Roster 10 名構成の検証        |
| EX-0010-0005 | BR-0010-0007 | reviewer が N/A 評決を下す場合                                 | na_rule フィールドに理由が記載されている。理由なしの場合はバリデーションエラー                                         | N/A 評決ルールの検証                 |
| EX-0010-0006 | BR-0010-0008 | 3 番目のレビュアー（reviewer）が FAIL を出す                   | 修正後に新 review-pack が作成され、1 番目のレビュアー（qa-lead）から再開される                                         | FAIL 時ループ復帰の検証              |
| EX-0010-0007 | BR-0010-0009 | review-pack に追記する                                         | 既存エントリが保持されたまま新エントリが末尾に追加される                                                               | append-only ポリシーの検証           |
| EX-0010-0008 | BR-0010-0010 | エージェントが Article IV（SDD is SSOT）に反する操作を試行     | 操作が拒否される。Constitution は例外なく適用される                                                                    | 非交渉原則の検証                     |
| EX-0010-0009 | BR-0010-0011 | constitution.md の内容を参照                                   | Article I〜Article X の 10 条がすべて記載されている                                                                    | 10 Articles 網羅性の検証             |
| EX-0010-0010 | BR-0010-0012 | qfai-sdd Skill を開始する                                      | Stage 0（steering refresh）が最初に実行される                                                                          | Stage 0 必須実行の検証               |
| EX-0010-0011 | BR-0010-0013 | prototyping が不要なケースで Stage 3 完了後に遷移              | Stage 4 をスキップし Stage 5（acceptance tests）に直接遷移する                                                         | Stage 4 オプショナルの検証           |
| EX-0010-0012 | BR-0010-0014 | Canonical Workflow 全体を参照                                  | Stage 0〜Stage 6 の 7 ステージが順序付きで定義されている                                                               | 7 ステージ構成の検証                 |
| EX-0010-0013 | BR-0010-0015 | Stage 2（requirements）が完了し Stage 3（specification）に遷移 | Stage 2 の完了が確認された後にのみ Stage 3 が開始される                                                                | 遷移条件の検証                       |
| EX-0010-0014 | BR-0010-0016 | qfai-sdd スキルがユーザーに scope 確認をする場合               | AskUserQuestion ツールが使用される。プレーンテキストでの質問は行われない                                               | Happy path: MUST 使用の検証          |
| EX-0010-0015 | BR-0010-0016 | AskUserQuestion が利用不可な環境でスキルが質問する場合         | 理由を明示した上でプレーンテキストにフォールバックし、構造化選択肢を維持する                                           | Negative path: フォールバックの検証  |
| EX-0010-0017 | BR-0010-0017 | constitution.md に Article X を追加した後にコンパクト実行      | constitution.md が P1 として再読み込みされ、Article X の MUST ルールが有効なまま                                       | コンパクト耐性の検証                 |
| EX-0010-0018 | BR-0010-0019 | 全 9 SKILL.md の AskUserQuestion Protocol セクションを検査     | すべてのスキルで「使用しなければならない」（MUST）と記載されており、「優先して使用する」が残っていない                 | 文言統一の検証                       |
| EX-0010-0019 | BR-0010-0021 | --auto フラグ付きでスキルを実行する場合                        | AskUserQuestion による質問がゼロで、前提が成果物に明示的に記録される                                                   | --auto 整合性の検証                  |
| EX-0010-0020 | BR-0010-0020 | フォールバック使用時に理由を明示しない場合                     | ルール違反として検出される。理由なしのフォールバックは許容されない                                                     | Edge: 理由なしフォールバックの検証   |
