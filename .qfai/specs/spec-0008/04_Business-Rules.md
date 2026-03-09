# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                                    | AC-Refs                   | Rule                                                                                                                                     | Notes         | NFR-Refs |
| ------------ | ---------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| BR-0008-0001 | カタログに 39 エージェント必須           | AC-0008-0001              | エージェントカタログテーブルは正確に 39 行のエージェント定義を含むこと                                                                    | REQ-0005 準拠 |          |
| BR-0008-0002 | カタログの必須カラム                     | AC-0008-0001              | カタログテーブルの各行は ID、名前（name）、ミッション（mission）、カテゴリ（category）の 4 カラムを持つこと                               | REQ-0005 準拠 |          |
| BR-0008-0003 | カテゴリ値の制約                         | AC-0008-0001,AC-0008-0002 | カテゴリは planning, implementation, review, operations の 4 値のみ許可                                                                  | REQ-0005 準拠 |          |
| BR-0008-0004 | カテゴリ別エージェント数                 | AC-0008-0002              | planning: 12、implementation: 13、review: 10、operations: 4 であること                                                                   | REQ-0005 準拠 |          |
| BR-0008-0005 | 標準契約の必須フィールド                 | AC-0008-0003              | 標準契約構造は Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format の 6 フィールドを含むこと  | REQ-0006 準拠 |          |
| BR-0008-0006 | Mission は 1 行                          | AC-0008-0003              | Mission フィールドは 1 行のミッションステートメントであること                                                                              | REQ-0006 準拠 |          |
| BR-0008-0007 | Inputs You Must Read はファイル参照      | AC-0008-0003              | Inputs You Must Read フィールドは必須のファイル参照リストであること                                                                        | REQ-0006 準拠 |          |
| BR-0008-0008 | Orchestrator MAY only 制約               | AC-0008-0004              | Orchestrator は Work Orders 作成、タスク委任、成果物統合、結果提示のみ許可される                                                          | REQ-0007 準拠 |          |
| BR-0008-0009 | Orchestrator 直接生成禁止                | AC-0008-0004              | Orchestrator は一次成果物（コード、テスト、ドキュメント等）の初版を直接生成してはならない                                                  | REQ-0007 準拠 |          |
| BR-0008-0010 | Orchestrator 自己承認禁止                | AC-0008-0004              | Orchestrator は Reviewer を兼任してはならず、委任をスキップしてはならない                                                                  | REQ-0007 準拠 |          |
| BR-0008-0011 | Capability Probe 実行タイミング          | AC-0008-0005              | 各ステージ開始時に 1 回の無害なテスト（Capability Probe）を実行すること                                                                   | REQ-0007 準拠 |          |
| BR-0008-0012 | Capability Probe 失敗時の対応            | AC-0008-0005              | Capability Probe が失敗した場合、ユーザーに Simulation Mode を提案すること                                                                | REQ-0007 準拠 |          |
| BR-0008-0013 | Simulation Mode の明示的許可要件         | AC-0008-0006              | Simulation Mode はユーザーの明示的な許可文言 "Simulation mode allowed" がある場合のみ許可される                                           | REQ-0007 準拠 |          |
| BR-0008-0014 | Simulation Mode 無許可時の禁止           | AC-0008-0006              | 明示的な許可文言がない場合、Simulation Mode に移行してはならない                                                                          | REQ-0007 準拠 |          |
| BR-0008-0015 | Work Orders Summary の必須カラム         | AC-0008-0007              | Work Orders Summary テーブルは Step, Role（sub-agent）, Task title, Input（refs）, Output（refs）, Status（PASS/REVISE）の 6 カラムを持つ | REQ-0008 準拠 |          |
| BR-0008-0016 | Work Orders Status 値の制約              | AC-0008-0007              | Status カラムの値は PASS または REVISE の 2 値のみ許可                                                                                   | REQ-0008 準拠 |          |
| BR-0008-0017 | カタログは SSOT ではなくサマリ           | AC-0008-0001              | spec-0008 のカタログはサマリテーブルであり、SSOT は `.qfai/assistant/agents/*.md` であること                                               | 設計方針      |          |
