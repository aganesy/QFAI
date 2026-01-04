# QFAI Report

- 生成日時: 2026-01-01T00:00:00.000Z
- ルート: .
- 設定: qfai.config.yaml
- 版: x.y.z

## 概要

- specs: 1
- scenarios: 1
- contracts: api 1 / ui 1 / db 1
- issues: info 0 / warning 0 / error 1

## ID集計

- SPEC: SPEC-0001
- BR: BR-0001
- SC: SC-0001
- UI: UI-0001
- API: API-0001
- DB: DB-0001

## トレーサビリティ

- 上流ID検出数: 6
- コード/テスト参照: あり

## 契約カバレッジ

- total: 3
- referenced: 2
- orphan: 1
- specContractRefMissing: 0

## 契約→Spec

- API-0001: SPEC-0001
- DB-0001: (none)
- UI-0001: SPEC-0001

## Spec→契約

| Spec      | Status   | Contracts         |
| --------- | -------- | ----------------- |
| SPEC-0001 | declared | API-0001, UI-0001 |

## Specで contract-ref 未宣言

- (none)

## SCカバレッジ

- total: 1
- covered: 1
- missing: 0
- testFileGlobs: `tests/**/*.test.ts`, `tests/**/*.spec.ts`, `src/**/*.test.ts`, `src/**/*.spec.ts`
- testFileExcludeGlobs: **/node_modules/**, **/.git/**, **/.qfai/**, **/dist/**, **/build/**, **/coverage/**, **/.next/**, **/out/**
- testFileCount: 1
- missingIds: (none)

## SC→参照テスト

- SC-0001: tests/qfai-traceability.sample.test.ts

## Spec:SC=1:1 違反

- (none)

## Hotspots

- .qfai/specs: total 1 (error 1 / warning 0 / info 0)

## トレーサビリティ（検証）

- ERROR [QFAI-TRACE-022] 契約が Spec から参照されていません: DB-0001 (.qfai/specs)

## 検証結果

- ERROR [QFAI-TRACE-022] 契約が Spec から参照されていません: DB-0001 (.qfai/specs)
