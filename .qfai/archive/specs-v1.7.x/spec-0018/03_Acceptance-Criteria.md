# 03 Acceptance Criteria

9 items.

## AC-0018-0001: 39 TOML ファイルの存在

**US Ref:** US-0018-0001

```gherkin
Given QFAI リポジトリが存在する
When `.codex/agents/` ディレクトリを確認する
Then 39 個の `.toml` ファイルが存在する
And 各ファイル名は Claude Code エージェントのファイル名と一致する（kebab-case）
```

## AC-0018-0002: TOML 必須フィールド

**US Ref:** US-0018-0001

```gherkin
Given 任意の `.codex/agents/*.toml` ファイル
When TOML パーサーで読み込む
Then `name` フィールドが存在し、空でない
And `description` フィールドが存在し、空でない
And `developer_instructions` フィールドが存在し、空でない
```

## AC-0018-0003: developer_instructions コンテンツ一致

**US Ref:** US-0018-0001

```gherkin
Given 任意の `.codex/agents/<name>.toml` ファイル
When `developer_instructions` の内容を確認する
Then カノニカルソース `.qfai/assistant/agents/<name>.md` の Mission, Inputs, Deliverables, Stop conditions, Checklist, Output format セクションが含まれている
```

## AC-0018-0004: レビュー系エージェントの sandbox_mode

**US Ref:** US-0018-0002

```gherkin
Given 25 個のレビュー/分析系エージェント TOML ファイル
When `sandbox_mode` フィールドを確認する
Then `sandbox_mode = "read-only"` が設定されている
```

## AC-0018-0005: 実装系エージェントの sandbox_mode 省略

**US Ref:** US-0018-0002

```gherkin
Given 14 個の実装系エージェント TOML ファイル
When `sandbox_mode` フィールドを確認する
Then `sandbox_mode` フィールドが存在しない
```

## AC-0018-0006: config.toml の存在と妥当性

**US Ref:** US-0018-0003

```gherkin
Given QFAI リポジトリが存在する
When `.codex/config.toml` を確認する
Then ファイルが存在する
And `[agents]` セクションが存在する
And `max_threads` と `max_depth` が設定されている
And TOML パーサーでエラーなくパースできる
```

## AC-0018-0007: model フィールド省略

**US Ref:** US-0018-0001

```gherkin
Given 任意の `.codex/agents/*.toml` ファイル
When `model` フィールドを確認する
Then `model` フィールドが存在しない（親セッション継承）
```

## AC-0018-0008: nickname_candidates フィールド省略

**US Ref:** US-0018-0001

```gherkin
Given 任意の `.codex/agents/*.toml` ファイル
When `nickname_candidates` フィールドを確認する
Then `nickname_candidates` フィールドが存在しない
```

## AC-0018-0009: name フィールドの一致

**US Ref:** US-0018-0001

```gherkin
Given 任意の `.codex/agents/<name>.toml` ファイル
When `name` フィールドの値を確認する
Then ファイル名（拡張子除く）と一致する
```
