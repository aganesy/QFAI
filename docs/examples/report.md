# QFAI Report

> 注意: このレポート例は参考用であり、形式は将来予告なく変更されます。

- 生成日時: 2026-01-01T00:00:00.000Z
- ルート: .
- 設定: qfai.config.yaml
- 版: x.y.z

## Summary

- specs: 1
- scenarios: 1
- contracts: api 1 / ui 1 / db 1 / thema 0
- issues: info 0 / warning 0 / error 1
- fail-on=error: FAIL
- fail-on=warning: FAIL

## Findings

### Issues (by code)

| Severity | Code           | Count |
| -------- | -------------- | ----- |
| error    | QFAI-TRACE-022 | 1     |

### Issues (list)

- ERROR [QFAI-TRACE-022] 契約が Spec から参照されていません: DB-0001 (.qfai/specs)

### IDs

- SPEC: SPEC-0001
- BR: BR-0001
- SC: SC-0001
- UI: UI-0001
- API: API-0001
- DB: DB-0001
- THEMA: (none)

### Traceability

- 上流ID検出数: 6
- コード/テスト参照: あり

### Contract Coverage

- total: 3
- referenced: 2
- orphan: 1
- specContractRefMissing: 0

### Contract → Spec

- API-0001: SPEC-0001
- DB-0001: (none)
- UI-0001: SPEC-0001

### Spec → Contracts

| Spec      | Status   | Contracts         |
| --------- | -------- | ----------------- |
| SPEC-0001 | declared | API-0001, UI-0001 |

### Specs missing contract-ref

- (none)

### SC coverage

- total: 1
- covered: 1
- missing: 0
- testFileGlobs: `tests/**/*.test.ts`, `tests/**/*.spec.ts`, `src/**/*.test.ts`, `src/**/*.spec.ts`
- testFileExcludeGlobs: **/node_modules/**, **/.git/**, **/.qfai/**, **/dist/**, **/build/**, **/coverage/**, **/.next/**, **/out/**
- testFileCount: 1
- missingIds: (none)

### SC → referenced tests

- SC-0001: tests/qfai-traceability.sample.test.ts

### Spec:SC=1:1 violations

- (none)

### Hotspots

- .qfai/specs: total 1 (error 1 / warning 0 / info 0)

## Guidance

- 次の手順: `qfai doctor --fail-on error` → `qfai validate --fail-on error` → `qfai report`
- error があるため、まず error から修正してください。
- 変更区分（Compatibility / Change/Improvement）は `.qfai/specs/*/delta.md` に記録します。
- 参照ルールの正本: `.qfai/promptpack/steering/traceability.md` / `.qfai/promptpack/steering/compatibility-vs-change.md`
