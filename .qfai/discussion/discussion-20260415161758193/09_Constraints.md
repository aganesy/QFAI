# 09 Constraints

## Technical Constraints

| ID    | Constraint | Rationale | Source |
|-------|------------|-----------|--------|
| TC-01 | Only `packages/qfai/**` is in scope. Repo root `.qfai/**` is out of scope. | PR scope is fixed by design doc section 4. | SRC-0001 §4-1 |
| TC-02 | Backward compatibility is not required. Existing QFAI users who used `standard` or `low-cost` will receive errors after upgrade. | Design doc explicitly states "後方互換は完全に捨てる". No migration guide is required. | SRC-0001 §0 |
| TC-03 | `standard` and `low-cost` modes must not be recoverable via CLI flags, env vars, or API overrides. | The design intent is simplification, not reduction. Any workaround path is a contract violation. | SRC-0001 §3-1 |
| TC-04 | `cli` surface must not appear in `PROTOTYPING_SUPPORTED_SURFACES`. | Explicitly stated in WS-2. `cli` in prototyping context is stale semantics. | SRC-0001 §3-2 |
| TC-05 | `runFullHarness()` must not accept any scalar calibration parameter. | Caller scalar trust is the root cause of calibration SSOT failure (WS-3). | SRC-0001 §3-3 |
| TC-06 | TypeScript `strict: true` must be maintained. No `@ts-ignore` or bare `as` casts. | Project-wide TypeScript policy. | SRC-0002 |

## Operational Constraints

| ID    | Constraint | Rationale | Source |
|-------|------------|-----------|--------|
| OC-01 | Single PR delivery. All 7 workstreams must land together. | Splitting would re-introduce contract inconsistencies between merged workstreams. | SRC-0001 §0 |
| OC-02 | No migration guide or release notes are required for this PR. | No existing users need to be guided; backward compat is abandoned. | SRC-0001 §4-2 |
| OC-03 | Implementation order must follow: WS-1/WS-2 first, then WS-3, then WS-4, WS-5, WS-6, WS-7 last. | Contract must be fixed before docs/tests are updated; otherwise doc update is done twice. | SRC-0001 §8 |

## Legal / Budget / Deadline Constraints

| ID    | Constraint | Notes |
|-------|------------|-------|
| LC-01 | None identified for this internal package change. | — |
