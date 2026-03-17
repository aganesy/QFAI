# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

---

### US-0014-0001: Unified Implementation Entry

```gherkin
# AC-0014-0001
Scenario: Single entry point invocation
  Given spec-XXXX に有効な test-list.md が存在する
  And test-list.md に status = todo のアイテムが 3 件存在する
  When ユーザーが `/qfai-implement spec-XXXX` を実行する
  Then qfai-implement が起動し 3 件の TDD マイクロサイクルを順次実行すること
  And 完了時に "All items complete" メッセージが表示されること
```

```gherkin
# AC-0014-0002
Scenario: TDD micro-cycle enforcement
  Given test-list.md のアイテム TDD-001 の status が todo である
  When qfai-implement がアイテム TDD-001 を処理する
  Then status が todo → red → green → refactor → done の順に遷移すること
  And Red フェーズでテストが FAIL することを確認してから Green フェーズに進むこと
  And Green フェーズでテストが PASS することを確認してから Refactor フェーズに進むこと
```

```gherkin
# AC-0014-0003
Scenario: Sequential item processing
  Given test-list.md に status = todo のアイテムが 2 件、status = done のアイテムが 1 件存在する
  When qfai-implement を実行する
  Then status = done のアイテムはスキップされること
  And status = todo のアイテムのみが順次処理されること
  And 全アイテムが done の場合は "nothing to do" メッセージが表示されること
```

---

### US-0014-0002: Execution Ledger

```gherkin
# AC-0014-0004
Scenario: test-list.md creation from template
  Given qfai init で新しい spec-XXXX が作成される
  When spec ディレクトリの初期化が完了する
  Then `.qfai/specs/spec-XXXX/tdd/test-list.md` がテンプレートから生成されること
  And ヘッダ行とセパレータ行が正しい形式であること
```

```gherkin
# AC-0014-0005
Scenario: Required columns present
  Given test-list.md が存在する
  When テーブル構造を検査する
  Then TDD-ID, TC-Refs, Layer, Test file, Selector, Status の必須列がすべて存在すること
```

```gherkin
# AC-0014-0006
Scenario: Status lifecycle tracking
  Given test-list.md のアイテムの Status 列が存在する
  When Status 列の値を検査する
  Then 許可されるステータス値は todo, red, green, refactor, done, exception のみであること
  And ステータス遷移は todo→red→green→refactor→done の順のみ許可されること
  And exception へはいずれのアクティブステータスからも遷移可能であること
  And 逆方向の遷移は禁止されること
```

---

### US-0014-0003: Old Skill Removal

```gherkin
# AC-0014-0007
Scenario: Skill body deletion
  Given qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor のスキルボディファイルが存在する
  When v1.6.0 マイグレーションを実行する
  Then 3 つのスキルボディディレクトリとファイルがすべて削除されること
  And スキルレジストリから 3 エントリが除去されること
```

```gherkin
# AC-0014-0008
Scenario: Wrapper entry removal
  Given .agents, .claude, .codex のラッパーファイルに旧スキルエントリが存在する
  When v1.6.0 マイグレーションを実行する
  Then 全ラッパーレイヤーから qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor のエントリが削除されること
```

```gherkin
# AC-0014-0009
Scenario: Orphan reference zero
  Given v1.6.0 マイグレーションが完了している
  When リポジトリ全体で "qfai-tdd-red", "qfai-tdd-green", "qfai-tdd-refactor" を grep する
  Then canonical assets（src/, wrappers, skill registry, tests, documentation）でのヒット数が 0 であること
  And CHANGELOG やコードコメント内の歴史的参照は非機能的参照として例外とする
```

---

### US-0014-0004: Validator Phase 1

```gherkin
# AC-0014-0010
Scenario: File existence check
  Given spec-XXXX のパスが指定される
  When Phase 1 バリデータを実行する
  And `.qfai/specs/spec-XXXX/tdd/test-list.md` が存在しない
  Then エラーコード TDDLIST_MISSING が返されること
```

```gherkin
# AC-0014-0011
Scenario: Table structure check
  Given test-list.md ファイルが存在する
  When Phase 1 バリデータを実行する
  And ファイル内に Markdown テーブルが存在しない
  Then エラーコード TDDLIST_TABLE_MISSING が返されること
```

```gherkin
# AC-0014-0012
Scenario: Required column check
  Given test-list.md に Markdown テーブルが存在する
  When Phase 1 バリデータを実行する
  And 必須列（TDD-ID, TC-Refs, Layer, Test file, Selector, Status）のいずれかが欠落している
  Then エラーコード TDDLIST_REQUIRED_COLUMN_MISSING が欠落列名とともに返されること
```

```gherkin
# AC-0014-0013
Scenario: Status enum check
  Given test-list.md のテーブルに Status 列が存在する
  When Phase 1 バリデータを実行する
  And Status 列に "wip" など許可されていない値が含まれる
  Then エラーコード TDDLIST_INVALID_STATUS が不正な値とともに返されること
```

```gherkin
# AC-0014-0014
Scenario: TC reference check
  Given test-list.md の TC-Refs 列に spec 内の既知テストケースに一致しない参照が記載されている
  When Phase 1 バリデータを実行する
  And 該当参照が spec 内のテストケースに解決できない
  Then エラーコード TDDLIST_UNKNOWN_REF が返されること
```

```gherkin
# AC-0014-0015
Scenario: Error code mapping
  Given Phase 1 バリデータが各チェックを実行する
  When チェック失敗が検出される
  Then 以下のエラーコードが正確にマッピングされること:
    | Check              | Error Code                      |
    | File existence     | TDDLIST_MISSING                 |
    | Table existence    | TDDLIST_TABLE_MISSING           |
    | Required columns   | TDDLIST_REQUIRED_COLUMN_MISSING |
    | Status enum        | TDDLIST_INVALID_STATUS          |
    | TC ref existence   | TDDLIST_UNKNOWN_REF             |
```

---

### US-0014-0005: Wrapper Synchronization

```gherkin
# AC-0014-0016
Scenario: .agents sync
  Given .agents/ ディレクトリのラッパー設定が存在する
  When v1.6.0 ラッパー同期を実行する
  Then .agents/ に qfai-implement エントリが追加されること
  And .agents/ から qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor エントリが削除されること
```

```gherkin
# AC-0014-0017
Scenario: .claude sync
  Given .claude/commands/ ディレクトリのラッパー設定が存在する
  When v1.6.0 ラッパー同期を実行する
  Then .claude/commands/ に qfai-implement エントリが追加されること
  And .claude/commands/ から旧スキルエントリが削除されること
```

```gherkin
# AC-0014-0018
Scenario: .codex sync
  Given .codex/ ディレクトリのラッパー設定が存在する
  When v1.6.0 ラッパー同期を実行する
  Then .codex/ に qfai-implement エントリが追加されること
  And .codex/ から旧スキルエントリが削除されること
  And 未存在のラッパーディレクトリは正しい内容で新規作成されること
```

---

## AC Catalog (optional)

| ID           | Title                             | US-Ref       | Priority |
|--------------|-----------------------------------|--------------|----------|
| AC-0014-0001 | Single entry point invocation     | US-0014-0001 | P1       |
| AC-0014-0002 | TDD micro-cycle enforcement       | US-0014-0001 | P1       |
| AC-0014-0003 | Sequential item processing        | US-0014-0001 | P1       |
| AC-0014-0004 | test-list.md creation from template | US-0014-0002 | P1     |
| AC-0014-0005 | Required columns present          | US-0014-0002 | P1       |
| AC-0014-0006 | Status lifecycle tracking         | US-0014-0002 | P1       |
| AC-0014-0007 | Skill body deletion               | US-0014-0003 | P1       |
| AC-0014-0008 | Wrapper entry removal             | US-0014-0003 | P1       |
| AC-0014-0009 | Orphan reference zero             | US-0014-0003 | P1       |
| AC-0014-0010 | File existence check              | US-0014-0004 | P1       |
| AC-0014-0011 | Table structure check             | US-0014-0004 | P1       |
| AC-0014-0012 | Required column check             | US-0014-0004 | P1       |
| AC-0014-0013 | Status enum check                 | US-0014-0004 | P1       |
| AC-0014-0014 | TC reference check                | US-0014-0004 | P1       |
| AC-0014-0015 | Error code mapping                | US-0014-0004 | P1       |
| AC-0014-0016 | .agents sync                      | US-0014-0005 | P1       |
| AC-0014-0017 | .claude sync                      | US-0014-0005 | P1       |
| AC-0014-0018 | .codex sync                       | US-0014-0005 | P1       |
