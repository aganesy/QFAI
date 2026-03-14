# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0011-0001
Scenario: Preflight Diff 自動実行
  Given evidence ファイルに前回の Diff Context が記録されている
  When /qfai-prototyping または /qfai-atdd を実行する
  Then 実行前に Preflight Diff Protocol が自動的に実行される
  And changed_specs リストが算出される
```

```gherkin
# AC-0011-0002
Scenario: 3ソース変更検出
  Given Source A（git diff）で spec-0001 が変更されている
  And Source B（timestamp）で spec-0002 が変更されている
  And Source C（delta.md）に spec-0001 の変更コンテキストが記載されている
  When Preflight Diff Protocol を実行する
  Then changed_specs に spec-0001 と spec-0002 が含まれる
  And change_context に spec-0001 の delta.md 情報が含まれる
```

```gherkin
# AC-0011-0003
Scenario: Diff Summary 提示
  Given Preflight Diff Protocol で changed_specs が算出されている
  When Diff Summary を表示する
  Then 変更 spec 一覧、変更ソース、change_context が人間可読な形式で提示される
```

```gherkin
# AC-0011-0004
Scenario: フルモードフォールバック
  Given evidence ファイルが存在しない
  When /qfai-prototyping を実行する
  Then フルスキャンモードで全 spec を対象に処理が実行される
  And execution_mode=full が evidence に記録される
```

```gherkin
# AC-0011-0005
Scenario: アノテーションスキャン
  Given テストファイルに QFAI トレーサビリティアノテーションがある
  And スケルトンコードに QFAI トレーサビリティアノテーションがある
  When Implementation State Analysis を実行する
  Then spec-0001 に対するアノテーション情報が収集される
```

```gherkin
# AC-0011-0006
Scenario: obligation 分類
  Given spec-0001 に対応するテスト・スケルトンが全て存在する
  And spec-0002 に対応するテスト・スケルトンが存在しない
  When Implementation State Analysis を実行する
  Then spec-0001 は implemented に分類される
  And spec-0002 は missing に分類される
```

```gherkin
# AC-0011-0007
Scenario: stale 判定
  Given spec-0003 の Primary=Behavior で changed_specs に含まれている
  And spec-0003 に対応するテストが存在するが spec 変更後に更新されていない
  When Implementation State Analysis を実行する
  Then spec-0003 は stale に分類される
```

```gherkin
# AC-0011-0008
Scenario: prototyping changed_specs のみ更新
  Given changed_specs に spec-0001 のみ含まれる
  And spec-0002 は unchanged である
  When /qfai-prototyping をインクリメンタルモードで実行する
  Then spec-0001 のスケルトンのみ更新される
  And spec-0002 のスケルトンは更新されない
```

```gherkin
# AC-0011-0009
Scenario: prototyping unchanged Runtime Gate のみ
  Given spec-0002 は unchanged である
  When /qfai-prototyping をインクリメンタルモードで実行する
  Then spec-0002 に対しては Runtime Gate チェックのみ実行される
```

```gherkin
# AC-0011-0010
Scenario: prototyping Tags 絞り込み
  Given changed_specs に spec-0001 が含まれる
  When /qfai-prototyping をインクリメンタルモードで実行する
  Then spec-0001 に関連する Tags のみがスケルトン生成対象となる
```

```gherkin
# AC-0011-0011
Scenario: evidence last_commit_sha
  Given スキル実行が完了する
  When evidence ファイルに Diff Context セクションを記録する
  Then last_commit_sha に現在の git HEAD SHA が記録される
```

```gherkin
# AC-0011-0012
Scenario: evidence last_run_timestamp
  Given スキル実行が完了する
  When evidence ファイルに Diff Context セクションを記録する
  Then last_run_timestamp に ISO 8601 形式のタイムスタンプが記録される
```

```gherkin
# AC-0011-0013
Scenario: evidence spec リスト
  Given インクリメンタルモードで spec-0001, spec-0003 を処理した
  When evidence ファイルに Diff Context セクションを記録する
  Then changed_specs に [spec-0001, spec-0003] が記録される
  And execution_mode=incremental が記録される
```

```gherkin
# AC-0011-0014
Scenario: --full フラグ
  Given evidence ファイルが存在する
  When /qfai-prototyping --full を実行する
  Then Preflight Diff を実行せずフルスキャンモードで全 spec を処理する
  And execution_mode=full が evidence に記録される
```

```gherkin
# AC-0011-0015
Scenario: _policies 変更時全 spec 影響
  Given Source A（git diff）で _policies/01_Objective.md が変更されている
  When Preflight Diff Protocol を実行する
  Then changed_specs に全 spec が含まれる
  And ユーザーに「Policy 変更のため全 spec を対象にします」と確認メッセージが提示される
```

```gherkin
# AC-0011-0016
Scenario: verify フルスキャン維持
  Given evidence ファイルに Diff Context が記録されている
  When /qfai-verify を実行する
  Then Preflight Diff Protocol は実行されない
  And 常にフルスキャンで全 spec を検証する
```

```gherkin
# AC-0011-0017
Scenario: atdd incremental missing テスト生成
  Given spec-0002 が missing（テスト未作成）と分類されている
  When /qfai-atdd をインクリメンタルモードで実行する
  Then spec-0002 のテストが新規生成される
```

```gherkin
# AC-0011-0018
Scenario: atdd incremental stale テスト更新
  Given spec-0003 が stale（テスト古い）と分類されている
  When /qfai-atdd をインクリメンタルモードで実行する
  Then spec-0003 の既存テストが更新される
```

```gherkin
# AC-0011-0019
Scenario: atdd incremental unchanged スキップ
  Given spec-0004 が unchanged と分類されている
  When /qfai-atdd をインクリメンタルモードで実行する
  Then spec-0004 のテストは処理されずスキップされる
```

```gherkin
# AC-0011-0020
Scenario: git 不可時 Source A スキップ
  Given git リポジトリが存在しない（または git コマンドが利用不可）
  When Preflight Diff Protocol を実行する
  Then Source A はスキップされ Source B のみで changed_specs が算出される
  And エラーではなく警告としてログに記録される
```

```gherkin
# AC-0011-0021
Scenario: 統合判定 union ロジック
  Given Source A で spec-0001 が変更検出される
  And Source B で spec-0001 と spec-0003 が変更検出される
  When 統合判定を行う
  Then changed_specs = [spec-0001, spec-0003]（union）となる
```

```gherkin
# AC-0011-0022
Scenario: 既存 evidence 後方互換
  Given evidence ファイルに Diff Context セクションが存在しない（旧フォーマット）
  When /qfai-prototyping を実行する
  Then エラーにならずフルスキャンモードにフォールバックする
```

## AC Catalog (optional)

| AC_ID        | Title                         | Notes              | Priority |
| ------------ | ----------------------------- | ------------------ | -------- |
| AC-0011-0001 | Preflight Diff 自動実行       | REQ-0001           | P1       |
| AC-0011-0002 | 3ソース変更検出               | REQ-0002/03/04     | P1       |
| AC-0011-0003 | Diff Summary 提示             | NFR-0005           | P2       |
| AC-0011-0004 | フルモードフォールバック      | REQ-0010           | P1       |
| AC-0011-0005 | アノテーションスキャン        | REQ-0006           | P1       |
| AC-0011-0006 | obligation 分類               | REQ-0006           | P1       |
| AC-0011-0007 | stale 判定                    | REQ-0006, DR-0010  | P1       |
| AC-0011-0008 | prototyping changed のみ更新  | REQ-0008           | P1       |
| AC-0011-0009 | prototyping unchanged Gate    | REQ-0008           | P1       |
| AC-0011-0010 | prototyping Tags 絞り込み     | REQ-0008           | P2       |
| AC-0011-0011 | evidence last_commit_sha      | REQ-0009           | P1       |
| AC-0011-0012 | evidence last_run_timestamp   | REQ-0009           | P1       |
| AC-0011-0013 | evidence spec リスト          | REQ-0009           | P1       |
| AC-0011-0014 | --full フラグ                 | REQ-0011           | P1       |
| AC-0011-0015 | \_policies 変更時全 spec 影響 | REQ-0012, DR-0011  | P1       |
| AC-0011-0016 | verify フルスキャン維持       | REQ-0013, DR-0007  | P1       |
| AC-0011-0017 | atdd missing テスト生成       | REQ-0007           | P1       |
| AC-0011-0018 | atdd stale テスト更新         | REQ-0007           | P1       |
| AC-0011-0019 | atdd unchanged スキップ       | REQ-0007           | P1       |
| AC-0011-0020 | git 不可時 Source A スキップ  | NFR-0003, REQ-0002 | P1       |
| AC-0011-0021 | 統合判定 union ロジック       | REQ-0005           | P1       |
| AC-0011-0022 | 既存 evidence 後方互換        | NFR-0004           | P1       |
