# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0008-0001
Scenario: エージェントカタログに 39 エージェントが記載されている
  Given spec-0008 のエージェントカタログテーブルが存在する
  When カタログの行数をカウントする
  Then 39 行のエージェント定義が存在する
  And 各行に ID、名前、ミッション、カテゴリが記載されている
  And カテゴリは planning, implementation, review, operations のいずれかである
```

```gherkin
# AC-0008-0002
Scenario: エージェントカタログのカテゴリ別内訳が正しい
  Given spec-0008 のエージェントカタログテーブルが存在する
  When カテゴリ別にエージェント数をカウントする
  Then planning カテゴリに 12 エージェントが存在する
  And implementation カテゴリに 13 エージェントが存在する
  And review カテゴリに 10 エージェントが存在する
  And operations カテゴリに 4 エージェントが存在する
```

```gherkin
# AC-0008-0003
Scenario: エージェント標準契約構造が定義されている
  Given spec-0008 にエージェント標準契約セクションが存在する
  When 契約構造のフィールドを確認する
  Then Mission フィールドが定義されている
  And Inputs You Must Read フィールドが定義されている
  And Deliverables フィールドが定義されている
  And Stop Conditions フィールドが定義されている
  And Sign-off Checklist フィールドが定義されている
  And Output Format フィールドが定義されている
```

```gherkin
# AC-0008-0004
Scenario: Orchestrator Protocol の MAY / MUST NOT が明文化されている
  Given spec-0008 に Orchestrator Protocol セクションが存在する
  When Protocol の制約を確認する
  Then MAY only として「Work Orders 作成」「タスク委任」「成果物統合」「結果提示」が記載されている
  And MUST NOT として「一次成果物の直接生成」が記載されている
  And MUST NOT として「Reviewer 兼任・委任スキップ」が記載されている
```

```gherkin
# AC-0008-0005
Scenario: Capability Probe が定義されている
  Given spec-0008 に Capability Probe セクションが存在する
  When Capability Probe の仕様を確認する
  Then ステージ開始時に無害なテストを実行する手順が記載されている
  And ツール利用不可時に Simulation Mode をユーザーに提案する手順が記載されている
```

```gherkin
# AC-0008-0006
Scenario: Simulation Mode が定義されている
  Given spec-0008 に Simulation Mode セクションが存在する
  When Simulation Mode の仕様を確認する
  Then ユーザーの明示的な許可文言 "Simulation mode allowed" が必要であることが記載されている
  And 明示的許可なしでは Simulation Mode に移行できないことが記載されている
```

```gherkin
# AC-0008-0007
Scenario: Work Orders Summary スキーマが定義されている
  Given spec-0008 に Work Orders Summary セクションが存在する
  When スキーマのカラムを確認する
  Then Step カラムが定義されている
  And Role（sub-agent）カラムが定義されている
  And Task title カラムが定義されている
  And Input（refs）カラムが定義されている
  And Output（refs）カラムが定義されている
  And Status（PASS/REVISE）カラムが定義されている
```

## AC Catalog (optional)

| AC_ID        | Title                              | Notes    | Priority |
| ------------ | ---------------------------------- | -------- | -------- |
| AC-0008-0001 | 39 エージェントカタログ記載        | REQ-0005 | P1       |
| AC-0008-0002 | カテゴリ別内訳の正確性             | REQ-0005 | P1       |
| AC-0008-0003 | 標準契約構造の定義                 | REQ-0006 | P1       |
| AC-0008-0004 | Orchestrator Protocol MAY/MUST NOT | REQ-0007 | P1       |
| AC-0008-0005 | Capability Probe 定義              | REQ-0007 | P1       |
| AC-0008-0006 | Simulation Mode 定義               | REQ-0007 | P1       |
| AC-0008-0007 | Work Orders Summary スキーマ定義   | REQ-0008 | P1       |
