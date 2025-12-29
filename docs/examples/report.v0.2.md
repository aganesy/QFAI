# QFAI Report

- 生成日時: 2025-01-01T00:00:00.000Z
- ルート: /path/to/project
- 設定: /path/to/project/qfai.config.yaml
- 版: 0.2.8

## 概要

- specs: 1
- scenarios: 1
- decisions: 1
- contracts: api 1 / ui 1 / db 1
- issues: info 0 / warning 1 / error 1

## ID集計

- SPEC: SPEC-0001
- BR: BR-0001
- SC: SC-0001
- UI: UI-0001
- API: API-0001
- DATA: DATA-0001

## トレーサビリティ

- 上流ID検出数: 3
- コード/テスト参照: あり

## Hotspots

- .qfai/spec/spec-0001-sample.md: total 1 (error 1 / warning 0 / info 0)
- src/index.ts: total 1 (error 0 / warning 1 / info 0)

## トレーサビリティ（検証）

- WARNING [QFAI-TRACE-002] Upstream IDs are not referenced in code/tests. (src)

## 検証結果

- ERROR [QFAI-SPEC-001] SPEC ID not found. (.qfai/spec/spec-0001-sample.md)
- WARNING [QFAI-TRACE-002] Upstream IDs are not referenced in code/tests. (src)
