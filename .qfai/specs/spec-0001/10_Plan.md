# 10 Plan

- Spec: spec-0001
- Parent: CAP-0001

## Implementation approach

### フレームワーク設計仕様の特性

CAP-0001 はフレームワーク設計仕様であり、実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。既に `specLayout.ts`、`specPack.ts`、`specPackIds.ts` として実装済み。

### 主要成果物

| 成果物             | パス                                               | 操作 | 説明                                   |
| ------------------ | -------------------------------------------------- | ---- | -------------------------------------- |
| spec-pack 構造定義 | `.qfai/specs/spec-0001/01_Spec.md` ~ `09_delta.md` | 新規 | 統合された spec-pack 構造仕様          |
| 実装コード（既存） | `packages/qfai/src/core/specLayout.ts`             | 参照 | v1421 レイアウト検出・必須ファイル定義 |
| 実装コード（既存） | `packages/qfai/src/core/validators/specPack.ts`    | 参照 | spec-pack バリデーション               |
| 実装コード（既存） | `packages/qfai/src/core/specPackIds.ts`            | 参照 | ID フォーマット検証                    |

### 検証戦略

- E_SPEC_MISSING_FILESET: spec-0001 の必須ファイル存在確認
- E_SPEC_MISSING_PARENT: 01_Spec.md に Parent: CAP-0001 が記載
- QFAI-COV-201: AC → TC エッジ充足
- QFAI-COV-202: BR → EX エッジ充足
- QFAI-COV-203: EX → TC エッジ充足

## Test approach

### L-struct 構造検証（qfai validate）

| 検証項目               | ルール ID                 | 対応 TC 範囲       |
| ---------------------- | ------------------------- | ------------------ |
| 必須ファイルセット存在 | E_SPEC_MISSING_FILESET    | TC-0001-0001, 0002 |
| Parent CAP 参照        | E_SPEC_MISSING_PARENT     | TC-0001-0024       |
| v1421 レイアウト検出   | カスタム検証              | TC-0001-0003, 0004 |
| ID フォーマット        | QFAI-SPACK-XXX            | TC-0001-0005       |
| トレーサビリティ連鎖   | カスタム検証              | TC-0001-0006~0009  |
| 参照方向ルール         | E_POLICIES_UPPER_TO_LOWER | TC-0001-0010, 0011 |
| Escalation Hook        | カスタム検証              | TC-0001-0012       |
| Drift Protocol         | カスタム検証              | TC-0001-0013~0015  |
| Skill カタログ         | カスタム検証              | TC-0001-0016~0018  |
| Canonical Workflow     | カスタム検証              | TC-0001-0019, 0020 |

### L5 E2E / L3 Integration / L4 API

- 対象外: フレームワーク設計仕様は CLI 実行テストを持たない

## Dependencies

- spec-0001 は QFAI の構造設計原則を定義するため、全 spec が本 spec の原則に従う
- spec-0002（discussion-pack 構造定義）は本 spec の spec-pack 構造ルールに準拠する

## Risk mitigation

| リスク                       | 影響度 | 軽減策                                                    |
| ---------------------------- | ------ | --------------------------------------------------------- |
| 統合による情報欠落           | 中     | 09_delta.md に Consolidation Mapping を記録               |
| specLayout.ts との不整合     | 中     | 実装コードを SSOT とし、spec は設計意図の文書化に留める   |
| 参照方向ルール違反の見落とし | 高     | qfai validate の E_POLICIES_UPPER_TO_LOWER_REF で自動検出 |
| トレーサビリティエッジの欠損 | 高     | qfai validate の QFAI-COV-201~203 で自動検出              |
