# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0007-0001
Scenario: 9 つの Skill カタログが定義されている
  Given spec-0007 が存在する
  When Skill カタログセクションを参照する
  Then 9 つの Skill（discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor）が記載されている
  And 各 Skill に名前・目的・引数ヒント・ロール・必須出力が定義されている
```

```gherkin
# AC-0007-0002
Scenario: Skill 間の依存関係と実行順序が定義されている
  Given spec-0007 が存在する
  When 依存関係セクションを参照する
  Then configure -.-> discussion → sdd → prototyping(optional) → atdd → verify の実行順序が定義されている
  And 循環依存が禁止されている旨が明記されている
```

```gherkin
# AC-0007-0003
Scenario: 各 Skill の完了契約が定義されている
  Given spec-0007 が存在する
  When 完了契約セクションを参照する
  Then 各 Skill に必須成果物一覧が定義されている
  And 各 Skill に OQ exit 条件が定義されている
  And 各 Skill に Gate pass 条件が定義されている
```

```gherkin
# AC-0007-0004
Scenario: 各 Skill の Evidence 要件が定義されている
  Given spec-0007 が存在する
  When Evidence 要件セクションを参照する
  Then Evidence のパス命名規則が定義されている
  And Evidence の必須セクションが定義されている
  And Evidence の gitignore ポリシーが定義されている
```

```gherkin
# AC-0007-0005
Scenario: 非推奨 Skill の移行先が明記されている
  Given spec-0007 が存在する
  When 非推奨 Skill（tdd-red, tdd-green, tdd-refactor）のセクションを参照する
  Then 各非推奨 Skill に deprecated ステータスが明記されている
  And 移行先として qfai-atdd が指定されている
```

```gherkin
# AC-0007-0006
Scenario: 全 9 スキルに AskUserQuestion Protocol セクションが存在する
  Given 全 9 SSOT スキルの SKILL.md が存在する
  When 各 SKILL.md の AskUserQuestion Protocol セクションを参照する
  Then 全 9 スキルに `## User Questions (AskUserQuestion Protocol)` セクションが存在する
  And セクションの配置場所が DRIFT-PROTOCOL 直後である
  And セクション名が全スキルで統一されている
```

```gherkin
# AC-0007-0007
Scenario: AskUserQuestion Protocol に優先使用・構造化選択肢・フォールバックが規定されている
  Given 任意の SSOT スキルの SKILL.md を参照する
  When AskUserQuestion Protocol セクションの内容を確認する
  Then AskUserQuestion 優先使用ルールが記載されている
  And 構造化選択肢の優先ルールが記載されている
  And AskUserQuestion 利用不可時のフォールバック動作が記載されている
```

```gherkin
# AC-0007-0008
Scenario: 各スキルにスキル固有の質問例が記載されている
  Given 任意の SSOT スキルの SKILL.md を参照する
  When AskUserQuestion Protocol セクション内のスキル固有例を確認する
  Then そのスキル特有の質問場面が括弧内で例示されている
  And 例示がそのスキルのドメインに適合している
```

## AC Catalog (optional)

| AC_ID        | Title                        | Notes              | Priority |
| ------------ | ---------------------------- | ------------------ | -------- |
| AC-0007-0001 | Skill カタログ定義           | REQ-0001           | P1       |
| AC-0007-0002 | Skill 依存関係・実行順序定義 | REQ-0002           | P1       |
| AC-0007-0003 | Skill 完了契約定義           | REQ-0003           | P1       |
| AC-0007-0004 | Skill Evidence 要件定義      | REQ-0004           | P1       |
| AC-0007-0005 | 非推奨 Skill 移行先明記      | REQ-0001, REQ-0002 | P1       |
| AC-0007-0006 | AskUserQuestion Protocol セクション存在・配置確認 | REQ-0005 (disc REQ-0001, REQ-0006) | P1 |
| AC-0007-0007 | 優先使用・構造化選択肢・フォールバック規定 | REQ-0005 (disc REQ-0002, REQ-0003, REQ-0004) | P1 |
| AC-0007-0008 | スキル固有の質問例存在 | REQ-0005 (disc REQ-0005) | P1 |
