# 06 Test Cases

12 items.

| TC-ID        | Title                                  | Level       | EX-Ref       | AC-Refs      |
| ------------ | -------------------------------------- | ----------- | ------------ | ------------ |
| TC-0018-0001 | 39 TOML ファイル存在確認               | integration | EX-0018-0001 | AC-0018-0001 |
| TC-0018-0002 | TOML 必須フィールド検証                | unit        | EX-0018-0001 | AC-0018-0002 |
| TC-0018-0003 | developer_instructions コンテンツ一致  | integration | EX-0018-0003 | AC-0018-0003 |
| TC-0018-0004 | レビュー系 sandbox_mode = read-only    | unit        | EX-0018-0001 | AC-0018-0004 |
| TC-0018-0005 | 実装系 sandbox_mode 省略               | unit        | EX-0018-0002 | AC-0018-0005 |
| TC-0018-0006 | config.toml 存在・妥当性               | integration | EX-0018-0005 | AC-0018-0006 |
| TC-0018-0007 | model フィールド不在確認               | unit        | EX-0018-0001 | AC-0018-0007 |
| TC-0018-0008 | nickname_candidates フィールド不在確認 | unit        | EX-0018-0001 | AC-0018-0008 |
| TC-0018-0009 | name フィールドとファイル名の一致      | unit        | EX-0018-0004 | AC-0018-0009 |
| TC-0018-0010 | TOML 構文妥当性                        | unit        | EX-0018-0008 | AC-0018-0002 |
| TC-0018-0011 | スコープ外エージェントの不在確認       | integration | EX-0018-0007 | AC-0018-0001 |
| TC-0018-0012 | ファイル名 kebab-case 検証             | unit        | EX-0018-0004 | AC-0018-0001 |
| TC-0018-0013 | Auto traceability row for EX-0018-0006 | integration | EX-0018-0006 |  |
| TC-0018-0014 | Auto traceability row for EX-0018-0009 | integration | EX-0018-0009 |  |

## TC-0018-0001: 39 TOML ファイル存在確認

**Level:** integration
**EX Refs:** EX-0018-0001
**AC Refs:** AC-0018-0001

Setup: QFAI リポジトリが存在する。
Action: `.codex/agents/` 内の `.toml` ファイル数をカウント。
Verify:

- 39 ファイルが存在する

## TC-0018-0002: TOML 必須フィールド検証

**Level:** unit
**EX Refs:** EX-0018-0001
**AC Refs:** AC-0018-0002

Setup: `.codex/agents/` 内の全 TOML ファイルを読み込む。
Action: 各ファイルで name/description/developer_instructions の存在を確認。
Verify:

- 全 39 ファイルで 3 フィールドが存在する

## TC-0018-0003: developer_instructions コンテンツ一致

**Level:** integration
**EX Refs:** EX-0018-0003
**AC Refs:** AC-0018-0003

Setup: TOML ファイルとカノニカル MD ファイルを用意。
Action: TOML の developer_instructions とカノニカル MD を比較。
Verify:

- 必須 6 セクション（Mission, Inputs you must read, Deliverables, Stop conditions / Must-reject conditions, Sign-off checklist, Output format）が含まれている

## TC-0018-0004: レビュー系 sandbox_mode = read-only

**Level:** unit
**EX Refs:** EX-0018-0001
**AC Refs:** AC-0018-0004

Setup: 25 レビュー系 TOML ファイルを読み込む。
Action: sandbox_mode フィールドを確認。
Verify:

- 全て "read-only" が設定されている

## TC-0018-0005: 実装系 sandbox_mode 省略

**Level:** unit
**EX Refs:** EX-0018-0002
**AC Refs:** AC-0018-0005

Setup: 14 実装系 TOML ファイルを読み込む。
Action: sandbox_mode キーの不在を確認。
Verify:

- sandbox_mode キーが存在しない

## TC-0018-0006: config.toml 存在・妥当性

**Level:** integration
**EX Refs:** EX-0018-0005
**AC Refs:** AC-0018-0006

Setup: QFAI リポジトリが存在する。
Action: `.codex/config.toml` を TOML パーサーで読み込み、[agents] セクションを確認。
Verify:

- パースエラーなし
- max_threads/max_depth が存在する

## TC-0018-0007: model フィールド不在確認

**Level:** unit
**EX Refs:** EX-0018-0001
**AC Refs:** AC-0018-0007

Setup: `.codex/agents/` 内の全 39 TOML ファイルを読み込む。
Action: model キーの不在を確認。
Verify:

- model キーが存在しない

## TC-0018-0008: nickname_candidates フィールド不在確認

**Level:** unit
**EX Refs:** EX-0018-0001
**AC Refs:** AC-0018-0008

Setup: `.codex/agents/` 内の全 39 TOML ファイルを読み込む。
Action: nickname_candidates キーの不在を確認。
Verify:

- nickname_candidates キーが存在しない

## TC-0018-0009: name フィールドとファイル名の一致

**Level:** unit
**EX Refs:** EX-0018-0004
**AC Refs:** AC-0018-0009

Setup: `.codex/agents/` 内の全 TOML ファイルを読み込む。
Action: 各 TOML の name フィールドをファイル名（拡張子除く）と比較。
Verify:

- 全て一致する

## TC-0018-0010: TOML 構文妥当性

**Level:** unit
**EX Refs:** EX-0018-0008
**AC Refs:** AC-0018-0002

Setup: 全 39 TOML + config.toml を用意。
Action: TOML パーサーで全ファイルをパース。
Verify:

- パースエラー 0

## TC-0018-0011: スコープ外エージェントの不在確認

**Level:** integration
**EX Refs:** EX-0018-0007
**AC Refs:** AC-0018-0001

Setup: `.codex/agents/` ディレクトリを確認。
Action: design-expert 等 5 エージェントの TOML が存在しないことを確認。
Verify:

- 5 ファイルが存在しない

## TC-0018-0012: ファイル名 kebab-case 検証

**Level:** unit
**EX Refs:** EX-0018-0004
**AC Refs:** AC-0018-0001

Setup: `.codex/agents/` 内の全 TOML ファイル名を取得。
Action: 全ファイル名が `/^[a-z][a-z0-9-]*\.toml$/` パターンに一致することを確認。
Verify:

- 全て一致する
