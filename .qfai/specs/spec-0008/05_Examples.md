# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                           | Expected                                                                                                                             | Notes                      |
| ------------ | ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| EX-0008-0001 | BR-0008-0001 | カタログテーブルの行数をカウント                                | 39 行（ヘッダー除く）                                                                                                                | カタログ行数検証           |
| EX-0008-0002 | BR-0008-0002 | カタログの 1 行目を確認                                         | `orchestrator`, `Orchestrator`, `ワークフロー全体の委任・統合・提示を行う`, `planning` の 4 カラムが存在する                          | 必須カラム存在確認         |
| EX-0008-0003 | BR-0008-0003 | カタログの全カテゴリ値を抽出                                    | planning, implementation, review, operations の 4 値のみ                                                                             | カテゴリ値制約             |
| EX-0008-0004 | BR-0008-0004 | planning カテゴリのエージェント数をカウント                     | 12（orchestrator, planner, researcher, interviewer, facilitator, option-explorer, option-reviewer, oq-harvester, oq-reviewer, requirements-analyst, coverage-planner, test-volume-estimator） | planning 数確認            |
| EX-0008-0005 | BR-0008-0004 | implementation カテゴリのエージェント数をカウント               | 13（architect, frontend-engineer, backend-engineer, contract-designer, test-engineer, test-case-owner, unit-test-scope-enforcer, atdd-e2e-implementer, atdd-api-implementer, atdd-integration-implementer, prototyping-coverage-auditor, doc-steward, devops-ci-engineer） | implementation 数確認      |
| EX-0008-0006 | BR-0008-0004 | review カテゴリのエージェント数をカウント                       | 10（reviewer, code-reviewer, architect-reviewer, qa-reviewer, frontend-reviewer, backend-reviewer, design-review-lead, runtime-gatekeeper, ui-ux-reviewer, design-owner） | review 数確認              |
| EX-0008-0007 | BR-0008-0004 | operations カテゴリのエージェント数をカウント                   | 4（qa-lead, qa-gatekeeper, qa-engineer, project-lead）                                                                               | operations 数確認          |
| EX-0008-0008 | BR-0008-0005 | 標準契約テンプレートのフィールドを確認                          | Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format の 6 フィールドが存在する             | 標準契約フィールド確認     |
| EX-0008-0009 | BR-0008-0006 | Mission フィールドのサンプル                                    | "ワークフロー全体の委任・統合・提示を行う" のような 1 行テキスト                                                                     | Mission 1 行確認           |
| EX-0008-0010 | BR-0008-0007 | Inputs You Must Read フィールドのサンプル                       | 仕様ディレクトリの 01_Spec.md や contracts/ 配下ファイルのようなファイルパス参照リスト                                                 | ファイル参照確認           |
| EX-0008-0011 | BR-0008-0008 | Orchestrator が Work Orders を作成する                          | Work Orders テーブルが生成され、各行にサブエージェントが割り当てられる                                                                | MAY: Work Orders 作成      |
| EX-0008-0012 | BR-0008-0009 | Orchestrator がコードを直接生成しようとする                     | MUST NOT 違反。Orchestrator はコード生成を backend-engineer 等に委任しなければならない                                                | MUST NOT: 直接生成禁止     |
| EX-0008-0013 | BR-0008-0010 | Orchestrator がレビューを自己承認しようとする                   | MUST NOT 違反。Orchestrator は reviewer 等の別エージェントに委任しなければならない                                                    | MUST NOT: 自己承認禁止     |
| EX-0008-0014 | BR-0008-0011 | ステージ開始時に Capability Probe を実行                        | 無害なテスト（例: ファイル読み取り可否の確認）が 1 回実行される                                                                       | Capability Probe 実行      |
| EX-0008-0015 | BR-0008-0012 | Capability Probe が失敗する                                     | "ツールが利用できません。Simulation mode を許可しますか？" のような提案がユーザーに表示される                                          | Probe 失敗時の提案         |
| EX-0008-0016 | BR-0008-0013 | ユーザーが "Simulation mode allowed" と入力する                 | Simulation Mode が有効化され、ツール実行をシミュレーションで代替する                                                                  | Simulation Mode 許可       |
| EX-0008-0017 | BR-0008-0014 | ユーザーが Simulation Mode を許可しない                         | Simulation Mode には移行せず、処理を中断またはユーザーに代替手段を提案する                                                            | Simulation Mode 拒否       |
| EX-0008-0018 | BR-0008-0015 | Work Orders Summary テーブルのサンプル                          | Step=1, Role=architect, Task=アーキテクチャ設計, Input=01_Spec.md, Output=contracts/arch-design.md, Status=PASS のような行             | Work Orders サンプル       |
| EX-0008-0019 | BR-0008-0016 | Status カラムに "PASS" を設定                                   | 有効な値として受理される                                                                                                             | Status PASS                |
| EX-0008-0020 | BR-0008-0016 | Status カラムに "REVISE" を設定                                 | 有効な値として受理される                                                                                                             | Status REVISE              |
| EX-0008-0021 | BR-0008-0016 | Status カラムに "DONE" を設定しようとする                       | 無効な値として拒否される（PASS / REVISE のみ許可）                                                                                   | Status 不正値              |
| EX-0008-0022 | BR-0008-0017 | カタログテーブルとエージェント定義ファイルの関係を確認          | カタログはサマリであり、詳細は `.qfai/assistant/agents/*.md` を参照する旨が明記されている                                              | SSOT 関係確認              |
