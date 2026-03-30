# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0038-0001: prototyping spec引数省略時の自動検出
Scenario: spec引数なしでprototypingを起動し変更specが自動検出される
  Given 現在のブランチでspec-0005のBRファイルが変更されている
  And origin/mainとの差分にspec-0005が含まれる
  When /qfai-prototyping をspec引数なしで起動する
  Then 4ソース統合差分検出が実行される
  And spec-0005が変更specとして検出される
  And 検出された変更specリストがユーザーに提示される

# AC-0038-0002: implement spec引数省略時の自動検出と選択
Scenario: spec引数なしでimplementを起動し変更specが検出・選択できる
  Given 現在のブランチでspec-0003とspec-0012が変更されている
  When /qfai-implement をspec引数なしで起動する
  Then 4ソース統合差分検出が実行される
  And spec-0003とspec-0012が優先度順でリスト表示される
  And ユーザーが選択したspecで作業が開始される

# AC-0038-0003: git不在時のフォールバック
Scenario: git不在環境でtimestamp + delta.mdにフォールバックする
  Given gitがインストールされていない環境である
  When /qfai-prototyping をspec引数なしで起動する
  Then Source A（git diff）はスキップされる
  And Source C（timestamp）とSource D（delta.md）で差分検出が実行される
  And 検出結果にSource Aが「N/A (git unavailable)」と表示される

# AC-0038-0004: 差分ゼロ時のフルスキャンフォールバック
Scenario: 変更specがゼロの場合フルスキャンにフォールバックする
  Given 全ソースで変更specがゼロ件である
  When /qfai-prototyping をspec引数なしで起動する
  Then フルスキャンフォールバックが発動する
  And 全specがprototyping対象として処理される

# AC-0038-0005: specのBR変更と実装の整合性チェック
Scenario: spec BR変更があるのに実装未変更でvalidateがFAILする
  Given 対象specの04_Business-Rules.mdに業務ルール変更がある
  And Traceability Ledgerで実装ファイルが当該ルールに紐づいている
  And 紐づき実装ファイルに変更がない
  When qfai validate を実行する
  Then QFAI-TRACE-001 error/warningが報告される
  And 「業務ルール変更あり、紐づき実装ファイル未変更」と表示される

# AC-0038-0006: Traceability Ledger不在時のwarning
Scenario: Traceability Ledgerが存在しないspecはwarningでスキップ
  Given spec-0038に16_Traceability-ledger.mdが存在しない
  When qfai validate を実行する
  Then トレーサビリティチェックはスキップされる
  And 「Traceability Ledger未定義、チェックスキップ」のwarningが出力される

# AC-0038-0007: --fullフラグによるフルスキャン強制
Scenario: --fullフラグで差分検出をバイパスし全specスキャン
  Given 変更specが2件のみ検出される状態である
  When /qfai-prototyping --full を実行する
  Then 差分検出はスキップされる
  And 全specがprototyping対象として処理される

# AC-0038-0008: Evidence Diff Context記録
Scenario: 差分検出結果がevidenceに記録される
  Given 差分検出でspec-0003(stale)とspec-0012(modified)が検出された
  When prototyping実行が完了する
  Then evidenceファイルにDiff Contextセクションが含まれる
  And last_commit_sha, last_run_timestamp, changed_specs, execution_modeが記録される

# AC-0038-0009: Policy変更時の全spec影響波及
Scenario: _policies配下の変更検出時は保守的に全specを対象とする
  Given _policies/04_Business-Flow.mdに変更がある
  When /qfai-prototyping をspec引数なしで起動する
  Then 全specが対象としてリスト表示される
  And ユーザーに確認プロンプトが表示される

# AC-0038-0010: ベースブランチ設定のカスタマイズ
Scenario: qfai.config.yamlでベースブランチを変更できる
  Given qfai.config.yamlにbaseBranch: "origin/develop"が設定されている
  When /qfai-prototyping をspec引数なしで起動する
  Then git diff origin/develop..HEADで差分検出が実行される
```

## AC Catalog (optional)

| AC-ID       | Title | Notes | Priority |
| ----------- | ----- | ----- | -------- |
| AC-0038-0001 | prototyping自動検出 | 4ソース統合 | P1 |
| AC-0038-0002 | implement自動検出と選択 | 複数spec時のリスト表示 | P1 |
| AC-0038-0003 | git不在フォールバック | timestamp + delta.md | P1 |
| AC-0038-0004 | 差分ゼロフルスキャン | REQ-0013 | P1 |
| AC-0038-0005 | トレーサビリティ整合性チェック | validate統合 | P1 |
| AC-0038-0006 | Ledger不在warning | チェックスキップ | P2 |
| AC-0038-0007 | --fullフラグ | REQ-0011 | P2 |
| AC-0038-0008 | Evidence Diff Context | REQ-0010 | P2 |
| AC-0038-0009 | Policy変更影響波及 | REQ-0012 | P2 |
| AC-0038-0010 | ベースブランチ設定 | REQ-0014 | P3 |
