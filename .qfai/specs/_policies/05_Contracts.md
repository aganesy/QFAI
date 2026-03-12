# 05 Contracts

## Purpose

- Keep contracts as SSOT under `.qfai/contracts/**` with deterministic IDs.
- Use this file as a readable policy-layer index with short IDs for planning and review.

## Contract Index

### DB Contracts

0 items

QFAI は CLI ツールであり、データベースを使用しない。全てのデータはファイルシステム上の YAML/JSON/Markdown ファイルとして管理される。

| Short ID | Entity | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

### API Contracts

0 items

QFAI は HTTP/gRPC サービスを提供しない。`validate.json` は内部契約であり、バージョン間の互換性は保証されない（OC-02 参照）。外部向けの安定 API は存在しない。

| Short ID | Router | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

### UI Contracts

0 items

QFAI は GUI を持たない CLI ツールである。`qfai prototyping` コマンドは対象プロジェクトの UI コントラクトを検証する機能であり、QFAI 自体の UI コントラクトではない。

| Short ID | Screen | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

## Mapping Rules

- QFAI は CLI ツールのため、DB/API/UI コントラクトは全て 0 items である。
- `validate.json` は内部契約として扱い、Contract Index には含めない。
- 将来的にコントラクトが必要になった場合は、本ファイルにエントリを追加する。

## ER Diagram

QFAI はデータベースを使用しないため、ER Diagram は省略する。
