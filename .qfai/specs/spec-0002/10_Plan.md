# 10 Plan

- Spec: spec-0002
- Parent: CAP-0002

## Implementation approach

### 実装済みコンポーネント

CAP-0002 の多くは既に実装済みである。本 spec は設計意図と構造ルールを文書化する。

### 主要成果物

| 成果物                   | パス                                                  | 操作 | 説明                                     |
| ------------------------ | ----------------------------------------------------- | ---- | ---------------------------------------- |
| discussion-pack 構造定義 | `.qfai/specs/spec-0002/01_Spec.md` ~ `09_delta.md`    | 新規 | 統合された discussion-pack 構造仕様      |
| 実装コード（既存）       | `packages/qfai/src/core/discussionPack.ts`            | 参照 | discussion-pack 検査・readiness チェック |
| 実装コード（既存）       | `packages/qfai/src/core/validators/discussionPack.ts` | 参照 | QFAI-DPACK-001~008 バリデータ            |

> v1.8.9: `discussionDesignHardening.ts` and its proving tests were retired
> together with the legacy exploration-sidecar family; the corresponding rows
> were removed from this active deliverables table. The DESIGN.md-driven
> equivalent is owned by the post-1.8.9 prototyping spec and anchored by
> `validateDesignContractReadiness` in
> `packages/qfai/src/core/validators/designContractReadiness.ts`.

### 検証戦略

- QFAI-DPACK-001~008: discussion-pack 構造バリデーション
- QFAI-DDP-019~025: DDS バリデーション
- UIX-VAL-TASTE-\*: taste interview バリデーション
- UIX-VAL-TREND-\*: trend scan バリデーション
- UIX-VAL-DYNAMIC-AXIS-\*: scoring-ready schema バリデーション
- UIX-VAL-STRATEGY-\*: strategy artifact バリデーション
- UIX-VAL-SCREEN-CONTRACT-\*: screen contract バリデーション

## Test approach

### Unit（L3）

| 検証項目                   | バリデータ ID           | 対応 TC 範囲      |
| -------------------------- | ----------------------- | ----------------- |
| 15 ファイル構造            | QFAI-DPACK-001~008      | TC-0002-0001~0007 |
| UI-bearing 検出            | カスタム検証            | TC-0002-0008~0010 |
| DDS バリデータ 7 件        | QFAI-DDP-019~025        | TC-0002-0011~0016 |
| サイドカー生成             | カスタム検証            | TC-0002-0017~0018 |
| 3-layer / 4-axis migration | UIX-VAL 系              | TC-0002-0019~0020 |
| scoring-ready schema       | UIX-VAL-DYNAMIC-AXIS    | TC-0002-0021      |
| strategy artifact          | UIX-VAL-STRATEGY        | TC-0002-0022~0023 |
| screen contract            | UIX-VAL-SCREEN-CONTRACT | TC-0002-0024~0025 |
| taste interview            | UIX-VAL-TASTE           | TC-0002-0026      |
| trend scan                 | UIX-VAL-TREND           | TC-0002-0027      |
| CTA / state / anti-goals   | QFAI-DDP-023~025        | TC-0002-0028~0030 |

### Integration / E2E

- 旧 spec-0023 の integration テスト（TDD-0025~0041）は v1.7.13 で `packages/qfai/tests/core/discussionDesignHardening.integration.test.ts` に実装され、v1.8.9 で同 validator の retire とともに削除済み
- 旧 spec-0026/0034 のバリデータテストは各テストファイルに実装済み

## Dependencies

- spec-0002 は spec-0001（spec-pack 構造定義）のトレーサビリティ連鎖ルールに準拠
- discussion-pack は SDD フェーズ（spec 作成）の入力となる

## Risk mitigation

| リスク                                    | 影響度 | 軽減策                                                    |
| ----------------------------------------- | ------ | --------------------------------------------------------- |
| 4-axis → 3-layer migration の混乱         | 中     | migration window（warning → error）で段階的に移行         |
| サイドカー構造の後方互換性                | 中     | YAML スキーマにバージョンフィールドを含め、後方互換を保証 |
| 非 UI パックへの誤影響                    | 高     | 全 UI-bearing バリデータに non-UI guard pattern を適用    |
| scoring-ready schema の 16 フィールド負荷 | 低     | フィールドは必須だが内容の質はレビュアーが判断            |

## v1.7.12 Implementation Strategy

- **Phase**: Template family replacement
- **Bundle**: A (discussion-pack canonicalization)

### Steps

1. Delete old 4-axis template files (20-23*eval_axis*\*) from both dogfood and init paths
2. Create new 3-layer files (11*design_taste_interview, 20-24_design_eval*\*) in both paths
3. Rewrite 00_index.md to list only new canonical family
4. Update UI-bearing completion conditions to reference 3-layer model
5. Verify dogfood/init parity

### Test Strategy

- Vitest unit tests for sidecar structure validation
- Parity tests for dogfood/init sync

## v1.8.1 Implementation Notes

- markdown-only readiness: `packages/qfai/src/core/discussionPack.ts` — `REQUIRED_DISCUSSION_PACK_SIDE_ARTIFACTS = []`, `missingSideArtifacts` is retained only as a compatibility-shaped empty array
- Discussion design hardening sidecar-first rewrite (v1.8.1, retired in v1.8.9): the
  former `packages/qfai/src/core/validators/discussionDesignHardening.ts` had all 7
  validators rewritten for uiux/ sidecar primary truth; the file was removed in v1.8.9
  together with the legacy exploration-sidecar family
- Issue code migration: QFAI-DDP-019~025 → UIX-VAL-DDH-\* canonical codes
- Implemented in v1.7.13-18..22.
