# 10 Plan

## Purpose

This is the How-only implementation plan for spec-0025 (CAP-0025: Design Audit & Slop Guardrails).

## Implementation Strategy

### New Files (3)

| File | Path | Responsibility |
|---|---|---|
| designAudit.ts | `packages/qfai/src/core/validators/designAudit.ts` | 7 audit dimension の静的 design quality 監査。UI-bearing gating → data loading → dimension analysis → findings generation → Issue[] conversion |
| designSlop.ts | `packages/qfai/src/core/validators/designSlop.ts` | AI slop パターン検知。designSlopPatterns.json ルールロード → pattern/count/consistency チェック → findings generation |
| designSlopPatterns.json | `packages/qfai/src/core/validators/designSlopPatterns.json` | Slop ルール定義（JSON）。各ルール: id, category, tier, scopes, match, message, guidance |

### Modified Files (4-6)

| File | Path | Changes |
|---|---|---|
| index.ts | `packages/qfai/src/core/validators/index.ts` | validateDesignAudit, validateDesignSlop の export 追加 |
| config.ts | `packages/qfai/src/core/config.ts` | QfaiUiuxConfig に audit セクション追加 (enabled, slopDetection, maxPrimaryCtas, maxRawTokenLiteralWarnings, maxDuplicateFindingsPerRule) |
| report.ts | `packages/qfai/src/core/report.ts` | "Design Audit Findings" / "Slop Guardrails Findings" グループ化セクション追加 |
| validate.ts | `packages/qfai/src/core/validate.ts` (or equivalent) | designAudit/designSlop の呼び出し統合 |

### Optional Extensions (changes only if needed)

| File | Path | Changes |
|---|---|---|
| designToken.ts | `packages/qfai/src/core/validators/designToken.ts` | token drift 検知のための usage drift source 追加 |
| uiDefinitionConsistency.ts | `packages/qfai/src/core/validators/uiDefinitionConsistency.ts` | anchor screen CTA mismatch / state coverage mismatch 拡張 |

## Implementation Order (PR 内)

1. config 拡張 + shared rule schema
2. designAudit.ts 実装
3. designSlop.ts + designSlopPatterns.json 実装
4. index.ts に validator 登録
5. report グループ化拡張
6. token/consistency helpers 拡張（必要時のみ）
7. fixtures + tests 追加
8. docs / CHANGELOG 更新

## Test Strategy

### New Tests (2)

| Test File | Path | Coverage |
|---|---|---|
| designAudit.test.ts | `packages/qfai/tests/core/designAudit.test.ts` | 7 dimension 各種 findings、UI-bearing gating、quality profile mapping、config 制御、finding deduplication |
| designSlop.test.ts | `packages/qfai/tests/core/designSlop.test.ts` | SLP-01〜SLP-06 パターン検知、JSON ルールロード、graceful degradation、category-based severity |

### Test Fixtures (10 種)

1. Clean UI-bearing pack (all pass)
2. Missing primary CTA (QFAI-AUD-001)
3. Dual-primary CTA (QFAI-AUD-020)
4. Missing error/empty states (QFAI-AUD-003)
5. Token drift over threshold (QFAI-AUD-004)
6. Generic AI dashboard shell (SLP-01)
7. False-positive guard: minimal admin screen
8. qualityProfile matrix (default/high/strict)
9. audit.enabled: false
10. slopDetection: false

### Existing Test Updates

- ddpValidation.test.ts: DDP anti-pattern ルール移行の確認
- designToken.test.ts: token drift 拡張の確認
- report.test.ts: グループ化セクションの確認
- uiDefinitionConsistency.test.ts: state coverage 拡張の確認

### CI Matrix

- Node 18 + Node 20
- `pnpm -C packages/qfai test`

## Quality Gates

- `pnpm format:check && pnpm lint && pnpm check-types` — pass
- `pnpm test` — all existing + new tests pass
- `qfai validate --fail-on error` — error=0
- QFAI-COV-201/202/203/204/205/206 — all zero

## Risk Mitigations

| Risk | Mitigation |
|---|---|
| False positives on minimal/internal tools | UI-bearing gating + style-heuristic advisory + audit.enabled: false |
| Validator sprawl / overlap | DDP 構造は ddpValidation.ts に集約、audit は designAudit.ts に一元化 |
| Token drift noise | threshold-based 検知（maxRawTokenLiteralWarnings） |
| Report verbosity | dimension/category グルーピング + maxDuplicateFindingsPerRule |
