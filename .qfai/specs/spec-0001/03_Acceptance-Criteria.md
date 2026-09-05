# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0001-0001
Scenario: v1421 layered spec の必須ファイル 9 件が定義されている
  Given specLayout.ts の REQUIRED_LAYERED_SPEC_FILES_V1421 を参照する
  When ファイル一覧を確認する
  Then 01_Spec.md, 02_User-stories.md, 03_Acceptance-Criteria.md, 04_Business-Rules.md, 05_Examples.md, 06_Test-Cases.md, 07_Decisions.md, 08_Open-questions.md, 09_delta.md の 9 ファイルが定義されている
```

```gherkin
# AC-0001-0002
Scenario: _policies の必須ファイル 10 件が定義されている
  Given specLayout.ts の REQUIRED_LAYERED_SHARED_FILES_V1421 を参照する
  When ファイル一覧を確認する
  Then 01_Objective.md から 10_delta.md までの 10 ファイルが定義されている
```

```gherkin
# AC-0001-0003
Scenario: レイアウト検出が v1421 を正しく判別する
  Given spec ディレクトリに 01_Spec.md, 02_User-stories.md, 05_Examples.md が存在する
  When collectSpecEntries() を実行する
  Then layout が "layered"、layeredStyle が "v1421" と判定される
```

```gherkin
# AC-0001-0004
Scenario: ID フォーマットが spec 番号付き 4-4 桁形式に準拠する
  Given spec-0001 のドキュメントを参照する
  When ID パターンを確認する
  Then US/AC/BR/EX/TC の各 ID が spec-0001 namespace の 4-4 桁形式に従っている
```

```gherkin
# AC-0001-0005
Scenario: トレーサビリティ連鎖の 5 段が定義されている
  Given QFAI フレームワークの仕様を参照する
  When トレーサビリティ連鎖を確認する
  Then discussion → specs → tests → code → verification の 5 段が定義されている
  And 各段の成果物が明記されている
```

```gherkin
# AC-0001-0006
Scenario: 必須トレーサビリティエッジが定義されている
  Given トレーサビリティ連鎖の定義が存在する
  When 必須エッジを確認する
  Then 01_Spec → CAP（Parent 参照）が必須である
  And acceptance criteria ごとに少なくとも 1 test case が必須である
  And business rule ごとに少なくとも 1 example が必須である
  And example ごとに少なくとも 1 test case が必須である
```

```gherkin
# AC-0001-0007
Scenario: upper-to-lower 参照が禁止されている
  Given _policies/ のファイルを参照する
  When 個別 spec ID を検索する
  Then US/AC/BR/EX/TC の ID および spec-XXXX 参照が含まれていない
```

```gherkin
# AC-0001-0008
Scenario: Escalation Hook の 4 トリガー条件が定義されている
  Given spec-XXXX/01_Spec.md を参照する
  When Escalation Hook セクションを確認する
  Then Ambiguous, Conflict, Missing, Trade-off の 4 条件が定義されている
```

```gherkin
# AC-0001-0009
Scenario: Drift Protocol の手順が定義されている
  Given drift-protocol.md を参照する
  When ドリフト検出時の手順を確認する
  Then STOP → CR → 承認 → owner skill rerun → 再開 の手順が定義されている
```

```gherkin
# AC-0001-0010
Scenario: 9 Skill のカタログが定義されている
  Given Skill オーケストレーション仕様を参照する
  When Skill 一覧を確認する
  Then discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor の 9 Skill が定義されている
```

```gherkin
# AC-0001-0011
Scenario: Skill 依存関係が DAG で定義されている
  Given Skill 依存関係を参照する
  When 依存グラフを確認する
  Then configure -.-> discussion → sdd → prototyping(optional) → atdd → verify の順序が定義されている
  And 循環依存が存在しない
```

```gherkin
# AC-0001-0012
Scenario: Canonical Workflow Stages が定義されている
  Given Steering & Governance 仕様を参照する
  When Canonical Workflow Stages を確認する
  Then Stage 0（steering refresh）～ Stage 6（verify）の 7 ステージが定義されている
  And Stage 0 は全 Skill 開始時に必須である
  And Stage 4（prototyping）はオプショナルである
```

## AC Catalog (optional)

| AC-ID        | Title                   | Notes    | Priority |
| ------------ | ----------------------- | -------- | -------- |
| AC-0001-0001 | v1421 spec 必須ファイル | REQ-0001 | P1       |
| AC-0001-0002 | \_policies 必須ファイル | REQ-0001 | P1       |
| AC-0001-0003 | レイアウト検出 v1421    | REQ-0002 | P1       |
| AC-0001-0004 | ID フォーマット         | REQ-0003 | P1       |
| AC-0001-0005 | トレーサビリティ 5 段   | REQ-0004 | P1       |
| AC-0001-0006 | 必須トレーサビリティ    | REQ-0004 | P1       |
| AC-0001-0007 | upper-to-lower 禁止     | REQ-0005 | P1       |
| AC-0001-0008 | Escalation Hook         | REQ-0006 | P1       |
| AC-0001-0009 | Drift Protocol          | REQ-0007 | P1       |
| AC-0001-0010 | Skill カタログ          | REQ-0008 | P1       |
| AC-0001-0011 | Skill 依存関係          | REQ-0008 | P1       |
| AC-0001-0012 | Canonical Workflow      | REQ-0009 | P1       |
