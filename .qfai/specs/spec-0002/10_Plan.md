# 10 Plan

- Spec: spec-0002
- Parent: CAP-0002

## 実装戦略

### 実装済みコンポーネント

CAP-0002 の多くは既に実装済みである。本 spec は設計意図と構造ルールを文書化する。

### 主要成果物

| 成果物                   | パス                                                         | 操作 | 説明                                     |
| ------------------------ | ------------------------------------------------------------ | ---- | ---------------------------------------- |
| discussion-pack 構造定義 | `.qfai/specs/spec-0002/01_Spec.md` ~ `09_delta.md`           | 新規 | 統合された discussion-pack 構造仕様      |
| 実装コード（既存）       | `packages/qfai/src/core/discussionPack.ts`                   | 参照 | discussion-pack 検査・readiness チェック |
| 実装コード（既存）       | `packages/qfai/src/core/validators/discussionPack.ts`        | 参照 | QFAI-DPACK-001~008 バリデータ            |
| 実装コード（既存）       | `packages/qfai/src/core/discussionDesignHardening.ts`        | 参照 | QFAI-DDP-019~025 DDS バリデータ          |
| テスト（既存）           | `packages/qfai/tests/core/discussionDesignHardening.test.ts` | 参照 | DDS バリデータユニットテスト             |

### 検証戦略

- QFAI-DPACK-001~008: discussion-pack 構造バリデーション
- QFAI-DDP-019~025: DDS バリデーション
- UIX-VAL-TASTE-\*: taste interview バリデーション
- UIX-VAL-TREND-\*: trend scan バリデーション
- UIX-VAL-DYNAMIC-AXIS-\*: scoring-ready schema バリデーション
- UIX-VAL-STRATEGY-\*: strategy artifact バリデーション
- UIX-VAL-SCREEN-CONTRACT-\*: screen contract バリデーション

## テスト戦略

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

- 旧 spec-0023 の integration テスト（TDD-0025~0041）は `packages/qfai/tests/core/discussionDesignHardening.integration.test.ts` に実装済み
- 旧 spec-0026/0034 のバリデータテストは各テストファイルに実装済み

## 依存関係

- spec-0002 は spec-0001（spec-pack 構造定義）のトレーサビリティ連鎖ルールに準拠
- discussion-pack は SDD フェーズ（spec 作成）の入力となる

## リスクと軽減策

| リスク                                    | 影響度 | 軽減策                                                    |
| ----------------------------------------- | ------ | --------------------------------------------------------- |
| 4-axis → 3-layer migration の混乱         | 中     | migration window（warning → error）で段階的に移行         |
| サイドカー構造の後方互換性                | 中     | YAML スキーマにバージョンフィールドを含め、後方互換を保証 |
| 非 UI パックへの誤影響                    | 高     | 全 UI-bearing バリデータに non-UI guard pattern を適用    |
| scoring-ready schema の 16 フィールド負荷 | 低     | フィールドは必須だが内容の質はレビュアーが判断            |
