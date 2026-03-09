# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Level: L-struct（構造検証 — `qfai validate` による静的検査）

## Test Case Table (required)

| TC-ID        | Level   | AC-Refs                   | EX-Ref       | Steps                                                                        | Expected                                                                                       | Notes                  |
| ------------ | ------- | ------------------------- | ------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------- |
| TC-0008-0001 | L-struct | AC-0008-0001              | EX-0008-0001 | カタログテーブルの行数をカウントする                                          | 39 行のエージェント定義が存在する                                                               | カタログ行数           |
| TC-0008-0002 | L-struct | AC-0008-0001              | EX-0008-0002 | カタログテーブルの各行のカラム数を確認する                                    | 各行に ID, name, mission, category の 4 カラムが存在する                                        | 必須カラム             |
| TC-0008-0003 | L-struct | AC-0008-0001,AC-0008-0002 | EX-0008-0003 | カタログの全 category 値を抽出し許可値と照合する                              | planning, implementation, review, operations の 4 値のみ                                        | カテゴリ値制約         |
| TC-0008-0004 | L-struct | AC-0008-0002              | EX-0008-0004 | planning カテゴリの行数をカウントする                                         | 12 行                                                                                          | planning 数            |
| TC-0008-0005 | L-struct | AC-0008-0002              | EX-0008-0005 | implementation カテゴリの行数をカウントする                                   | 13 行                                                                                          | implementation 数      |
| TC-0008-0006 | L-struct | AC-0008-0002              | EX-0008-0006 | review カテゴリの行数をカウントする                                           | 10 行                                                                                          | review 数              |
| TC-0008-0007 | L-struct | AC-0008-0002              | EX-0008-0007 | operations カテゴリの行数をカウントする                                       | 4 行                                                                                           | operations 数          |
| TC-0008-0008 | L-struct | AC-0008-0003              | EX-0008-0008 | 標準契約テンプレートセクションのフィールド見出しを確認する                    | Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format が存在する | 標準契約フィールド     |
| TC-0008-0009 | L-struct | AC-0008-0004              | EX-0008-0011 | Orchestrator Protocol セクションに MAY only リストが記載されていることを確認  | "Work Orders 作成", "タスク委任", "成果物統合", "結果提示" が記載                               | MAY only 制約          |
| TC-0008-0010 | L-struct | AC-0008-0004              | EX-0008-0012 | Orchestrator Protocol セクションに MUST NOT リストが記載されていることを確認  | "一次成果物の直接生成" と "Reviewer 兼任・委任スキップ" が記載                                  | MUST NOT 制約          |
| TC-0008-0011 | L-struct | AC-0008-0005              | EX-0008-0014 | Capability Probe セクションが存在し手順が記載されていることを確認             | ステージ開始時の無害テスト実行手順が記載されている                                              | Capability Probe       |
| TC-0008-0012 | L-struct | AC-0008-0005              | EX-0008-0015 | Capability Probe 失敗時の Simulation Mode 提案が記載されていることを確認      | ツール利用不可時にユーザーへ Simulation Mode を提案する手順が記載されている                      | Probe 失敗時対応       |
| TC-0008-0013 | L-struct | AC-0008-0006              | EX-0008-0016 | Simulation Mode セクションに許可文言要件が記載されていることを確認            | "Simulation mode allowed" の明示的許可文言が必要であることが記載されている                       | Simulation Mode 許可   |
| TC-0008-0014 | L-struct | AC-0008-0006              | EX-0008-0017 | Simulation Mode セクションに無許可時の禁止が記載されていることを確認          | 明示的許可なしでの Simulation Mode 移行が禁止されていることが記載されている                      | Simulation Mode 禁止   |
| TC-0008-0015 | L-struct | AC-0008-0007              | EX-0008-0018 | Work Orders Summary セクションのテーブルヘッダーを確認する                    | Step, Role, Task title, Input, Output, Status の 6 カラムが定義されている                       | Work Orders カラム     |
| TC-0008-0016 | L-struct | AC-0008-0007              | EX-0008-0019 | Work Orders Summary の Status カラムの許可値が記載されていることを確認        | PASS / REVISE の 2 値のみ許可と記載されている                                                   | Status 許可値          |
| TC-0008-0017 | L-struct | AC-0008-0001              | EX-0008-0022 | カタログセクションに SSOT 注記が記載されていることを確認                      | SSOT は `.qfai/assistant/agents/*.md` であることが明記されている                                 | SSOT 関係              |
| TC-0008-0018 | L-struct | AC-0008-0001,AC-0008-0003,AC-0008-0004,AC-0008-0007 | | spec-0008 の全セクション（カタログ、標準契約、Orchestrator Protocol、Work Orders）が存在することを確認 | 4 セクションすべてが存在する | 統合構造検証           |
