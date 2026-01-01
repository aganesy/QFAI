# QFAI Report

- 生成日時: 2026-01-01T00:00:00.000Z
- ルート: /path/to/project
- 設定: /path/to/project/qfai.config.yaml
- 版: x.y.z

## 概要

- specs: 1
- scenarios: 1
- contracts: api 1 / ui 1 / db 1
- issues: info 1 / warning 0 / error 2

## ID集計

- SPEC: SPEC-0001
- BR: BR-0001
- SC: SC-0001
- UI: UI-0001
- API: API-0001
- DATA: DATA-0001

## トレーサビリティ

- 上流ID検出数: 6
- コード/テスト参照: なし

## SCカバレッジ

- total: 1
- covered: 0
- missing: 1
- missingIds: SC-0001 (.qfai/specs/spec-0001/scenario.md)

## SC→参照テスト

- SC-0001: (none)

## Spec:SC=1:1 違反

- (none)

## Hotspots

- .qfai/specs/spec-0001/spec.md: total 1 (error 1 / warning 0 / info 0)
- src: total 1 (error 0 / warning 0 / info 1)

## トレーサビリティ（検証）

- INFO [QFAI-TRACE-002] 上流 ID がコード/テストに参照されていません（参考情報）。 (src)

## 検証結果

- ERROR [QFAI-SPEC-001] SPEC ID が見つかりません。 (.qfai/specs/spec-0001/spec.md)
- INFO [QFAI-TRACE-002] 上流 ID がコード/テストに参照されていません（参考情報）。 (src)
