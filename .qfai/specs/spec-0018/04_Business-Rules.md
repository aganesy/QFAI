# 04 Business Rules

6 items.

## BR-0018-0001: TOML ファイル生成ルール

各 TOML ファイルは `name`, `description`, `developer_instructions` の 3 つの必須フィールドを含まなければならない。Codex サブエージェント仕様の必須要件（SRC-0002）。

- AC Refs: AC-0018-0001, AC-0018-0002

## BR-0018-0002: sandbox_mode 分類ルール

エージェントの sandbox_mode は役割に基づいて決定する。レビュー/分析系 = "read-only"、実装系 = 省略（親セッション継承）。DR-0029 に基づく。レビュー系の安全性確保と実装系の機能性を両立。

- AC Refs: AC-0018-0004, AC-0018-0005

## BR-0018-0003: コンテンツ変換ルール

developer_instructions はカノニカル MD の以下のセクションを含まなければならない: Mission, Inputs you must read, Deliverables (MANDATORY), Stop conditions (Blockers), Sign-off checklist, Output format。エージェント機能の完全性を保証。

- AC Refs: AC-0018-0003

## BR-0018-0004: フィールド省略ルール

`model` と `nickname_candidates` フィールドは全エージェントで省略しなければならない。DR-0028/discussion-20260323111959112 の決定。柔軟性とシンプルさを優先。

- AC Refs: AC-0018-0007, AC-0018-0008

## BR-0018-0005: 命名規則

TOML ファイル名は kebab-case でカノニカルエージェント名と一致しなければならない。`name` フィールドもファイル名（拡張子除く）と一致しなければならない。プラットフォーム間の一貫性とエージェント識別の信頼性。

- AC Refs: AC-0018-0009, AC-0018-0001

## BR-0018-0006: config.toml 設定ルール

config.toml は `[agents]` セクションに `max_threads` と `max_depth` を含まなければならない。`max_depth = 1` で再帰委譲を抑制する。予測可能なエージェント動作を保証（SRC-0001 の設計意図に基づく）。

- AC Refs: AC-0018-0006
