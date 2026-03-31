# 04 Business Rules

10 items.

## BR-0017-0001: File existence check triggers skip

ファイルが既に存在する場合、配置をスキップする。ファイルの内容は検査しない。

- AC Refs: AC-0017-0001, AC-0017-0002, AC-0017-0003, AC-0017-0004
- REQ Refs: REQ-0001, REQ-0002, REQ-0003

## BR-0017-0002: --force flag has no effect on instructions

`--force` フラグは instructions ファイルの配置に影響しない。既存ファイルがある場合は常にスキップする。

- AC Refs: AC-0017-0005
- REQ Refs: REQ-0003
- Constraint Refs: TC-25

## BR-0017-0003: Directory creation is recursive

`.github/instructions/` ディレクトリが存在しない場合、`.github/` を含めて再帰的に作成する。既存の `.github/` 内のファイル/ディレクトリには影響しない。

- AC Refs: AC-0017-0006, AC-0017-0007
- REQ Refs: REQ-0006

## BR-0017-0004: Template source is assets/init/.github/instructions/

配布するテンプレートのソースは `packages/qfai/assets/init/.github/instructions/` に格納されたアセットファイルとする。

- AC Refs: AC-0017-0001, AC-0017-0002
- REQ Refs: REQ-0004
- DR Refs: DR-0023
- Constraint Refs: TC-26

## BR-0017-0005: frontmatter applyTo is `**/*`

配布する instructions ファイルの YAML frontmatter で `applyTo: "**/*"` を設定し、全ファイルを対象とする。

- AC Refs: AC-0017-0001, AC-0017-0002
- DR Refs: DR-0025
- REQ Refs: REQ-0001, REQ-0002

## BR-0017-0006: frontmatter excludeAgent is `coding-agent`

配布する instructions ファイルの YAML frontmatter で `excludeAgent: "coding-agent"` を設定し、コード生成エージェントを除外する。

- AC Refs: AC-0017-0001, AC-0017-0002
- DR Refs: DR-0026
- REQ Refs: REQ-0001, REQ-0002

## BR-0017-0007: SDD marker at end of file

配布する instructions テンプレートの末尾付近に `<!-- qfai:language-rules -->` マーカーコメントを配置する。このマーカーは `/qfai-sdd` が言語固有ルールを追記する挿入ポイントとなる。

- AC Refs: AC-0017-0012
- REQ Refs: REQ-0007
- DR Refs: DR-0024

## BR-0017-0008: Activation guidance only when files created

アクティベーション案内メッセージは、1つ以上の instructions ファイルが新規作成された場合にのみ出力する。全てスキップされた場合は出力しない。

- AC Refs: AC-0017-0013
- REQ Refs: REQ-0008

## BR-0017-0009: created/skipped counts include instructions files

`qfai init` のレポート出力において、created カウントと skipped paths に instructions ファイルを含める。

- AC Refs: AC-0017-0009, AC-0017-0010
- REQ Refs: REQ-0005

## BR-0017-0010: Empty file (0 bytes) is treated as existing

0バイトの空ファイルであっても「存在する」として扱い、上書きしない。

- AC Refs: AC-0017-0014
- REQ Refs: REQ-0003
