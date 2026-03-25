# 10 Plan

- Spec: spec-0023
- Parent: CAP-0023

## 実装戦略

### Discussion Design Hardening の特性

CAP-0023 は UI-bearing ディスカッションパックの設計方向を構造的に検証する 7 つの新規バリデータ（QFAI-DDP-019..025）と、それを支えるテンプレート・ドキュメント更新を定義する。既存の `ddpValidation.ts` が持つ UI-bearing 検出ロジックを拡張し、DDS（Design Direction Summary）セクションの完全性を error 厳格度で強制する。

### 主要成果物

| 成果物                  | パス / 対象                                                                   | 操作 | 説明                                                                        |
| ----------------------- | ----------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| UI-bearing 検出関数     | `packages/qfai/src/core/validators/discussionDesignHardening.ts`              | 新規 | `isUiBearing()` — HTML タグ・Mermaid screen flow によるアーティファクト検出 |
| DDS 構造バリデータ 7 件 | 同上                                                                          | 新規 | QFAI-DDP-019..025 の各バリデーション関数                                    |
| バリデータ登録          | `packages/qfai/src/core/validators/index.ts`                                  | 修正 | 新規バリデータの export 追加                                                |
| オーケストレータ統合    | `packages/qfai/src/core/validate.ts`                                          | 修正 | `validateProject()` の findings 配列に新規バリデータ呼び出しを追加          |
| テンプレート更新        | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/` | 修正 | 03, 04, 14, 99 テンプレートに DDS プレースホルダー追加                      |
| SKILL.md 更新           | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`   | 修正 | UI-bearing オーサリング要件セクション追加                                   |

## Phase 1: UI-bearing 検出リファクタ

**Target**: US-0023-0001 (AC-0023-0001..0003)
**Files**: `packages/qfai/src/core/validators/discussionDesignHardening.ts` (新規)
**Approach**:

1. `isUiBearing(packRoot: string): Promise<boolean>` をエクスポート関数として作成
2. 検出ロジック（DR-0042 準拠）:
   - 03_Story-Workshop.md をファイルシステムから読み込み
   - HTML 要素検出: `<style>`, `<div>`, `<section>` 等の HTML タグ存在
   - Mermaid screen flow 検出: `stateDiagram`, `flowchart`, `graph` ブロック内の screen 名パターン
   - いずれか一致で `true` を返す
3. 既存 `ddpValidation.ts` の `UI_BEARING_KEYWORDS_RE` はキーワードベース（DR-0042 で禁止）なので、新関数はアーティファクト/セクション存在ベースに置換
4. 非 UI パックでは `false` を返し、Phase 2 の全バリデータがスキップされる（BR-0023-0002, NFR-0002）
5. ファイル読み込みエラー時は `false` を返す（安全側フォールバック）

## Phase 2: 構造バリデータ実装 (QFAI-DDP-019..025)

**Target**: US-0023-0002..0007 (AC-0023-0004..0023)
**Files**: `packages/qfai/src/core/validators/discussionDesignHardening.ts`
**Approach**:

1. エントリポイント関数 `validateDiscussionDesignHardening(root: string, config: QfaiConfig): Promise<Issue[]>` を作成
2. 内部で `isUiBearing()` を呼び、`false` なら即座に空配列を返す
3. `true` の場合、以下 7 バリデータを順次実行し Issue を収集

既存の `issue()` ユーティリティ（`validators/utils.ts`）を使用し、全バリデータで `severity: "error"` を固定（DR-0045）。

### 実装順序とバリデータ詳細

| 順序 | Validator ID | 関数名                     | 検証対象ファイル     | 検証内容                                                                                                                  | AC-Refs                    |
| ---- | ------------ | -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1    | QFAI-DDP-019 | `validateDdsPresence`      | 03_Story-Workshop.md | `## Design Direction Summary` 見出し + 6 サブセクション存在                                                               | AC-0023-0004, AC-0023-0005 |
| 2    | QFAI-DDP-020 | `validateOptionComparison` | 03_Story-Workshop.md | DDS 内の `Option` エントリ >=2 件                                                                                         | AC-0023-0006, AC-0023-0007 |
| 3    | QFAI-DDP-021 | `validateAnchorScreen`     | 03_Story-Workshop.md | アンカースクリーン選択の明示（比較オプションへの参照）                                                                    | AC-0023-0008, AC-0023-0009 |
| 4    | QFAI-DDP-022 | `validateCompetitiveRefs`  | 04_Sources.md        | 各競合参考に adopted_points, rejected_points, local_translation の 3 フィールド存在（プレースホルダー不可: BR-0023-0007） | AC-0023-0010..0012         |
| 5    | QFAI-DDP-023 | `validateCtaHierarchy`     | 03_Story-Workshop.md | DDS 内 CTA 階層セクションに primary CTA が定義されている                                                                  | AC-0023-0021               |
| 6    | QFAI-DDP-024 | `validateStateCoverage`    | 03_Story-Workshop.md | DDS 内に empty, loading, error, populated の 4 状態定義                                                                   | AC-0023-0022               |
| 7    | QFAI-DDP-025 | `validateDesignAntiGoals`  | 03_Story-Workshop.md | DDS 内に >=1 件のデザインアンチゴール                                                                                     | AC-0023-0023               |

### エラーメッセージフォーマット (NFR-0003)

全バリデータのエラーメッセージは 3 パート構造を遵守:

```text
"{フィールド名}: {失敗理由}. {修正方法}"
```

例: `"Competitive Reference: 'rejected_points' is missing. Add rejected_points describing what was not adopted and why"`

### プレースホルダー判定 (BR-0023-0007)

QFAI-DDP-022 で使用するプレースホルダー検出ロジック:

- 空文字列 `""`
- `"TBD"`, `"TODO"`, `"N/A"` (大文字小文字不問)
- 既存の `ddpValidation.ts` の banned patterns ロジックを参考にしつつ独立実装

## Phase 3: オーケストレータ統合

**Target**: BR-0023-0018 (DR-0046)
**Files**:

- `packages/qfai/src/core/validators/index.ts`
- `packages/qfai/src/core/validate.ts`

**Approach**:

1. `index.ts` に `export { validateDiscussionDesignHardening } from "./discussionDesignHardening.js"` を追加
2. `validate.ts` の import に `validateDiscussionDesignHardening` を追加
3. `findings` 配列に `...(await validateDiscussionDesignHardening(root, config))` を追加（`validateDdpFields` の直後が論理的に適切）
4. `UIUX_VALIDATION_BUDGET_MS` 外で実行（DDS バリデータは構造検証であり UI/UX レンダリング検証ではない）

## Phase 4: テンプレート更新

**Target**: US-0023-0008 (AC-0023-0017..0018), US-0023-0006..0007 (AC-0023-0013..0016)
**Files**:

| テンプレート                     | 追加内容                                                               |
| -------------------------------- | ---------------------------------------------------------------------- |
| `templates/03_Story-Workshop.md` | `## Design Direction Summary` セクション + 6 サブセクションスタブ      |
| `templates/04_Sources.md`        | Competitive Reference Registry テンプレート（3 必須フィールドスタブ）  |
| `templates/14_Review-Request.md` | `## Design Direction Decisions` セクション（アンカー・却下・採用参照） |
| `templates/99_delta.md`          | `## Rejected Visual Directions` セクション（理由・再発防止スタブ）     |
| `SKILL.md`                       | UI-bearing オーサリング要件セクション（7 バリデータの pass 基準一覧）  |

### 03_Story-Workshop.md DDS テンプレート構造

```markdown
## Design Direction Summary

### Option Comparison

<!-- 2つ以上の設計オプションを記載 -->

- **Option A**: [名称と説明]
- **Option B**: [名称と説明]

### Anchor Screen Selection

<!-- 選択されたアンカースクリーンを明示 -->

Selected: [Option X] — [選択理由]

### CTA Hierarchy

<!-- CTA 階層を定義 -->

- Primary: [CTA ラベルと配置]
- Secondary: [CTA ラベルと配置]

### State Coverage

<!-- 4 状態の定義 -->

- empty: [空状態の表示]
- loading: [読み込み中の表示]
- error: [エラー状態の表示]
- populated: [データ表示時の表示]

### Design Anti-goals

<!-- 意図的に避ける設計パターン -->

- Anti-goal: [避けるパターンと理由]

### Competitive References

<!-- 04_Sources.md の競合参照を要約 -->
```

## テスト戦略

### L2 ユニットテスト

**Location**: `packages/qfai/tests/core/discussionDesignHardening.test.ts`
**Framework**: vitest
**Coverage**: TC-0023-0001..0024, TC-0023-0032 (24 テストケース)

| テスト分類                  | TC 範囲            | テスト件数 | 内容                                                       |
| --------------------------- | ------------------ | ---------- | ---------------------------------------------------------- |
| isUiBearing() 検出          | TC-0023-0001..0004 | 4          | HTML タグ、div 要素、プレーンテキスト、Mermaid screen flow |
| QFAI-DDP-019 DDS 存在       | TC-0023-0005..0007 | 3          | 全サブセクション有、部分欠損、誤配置                       |
| QFAI-DDP-020 オプション比較 | TC-0023-0008..0009 | 2          | 2 件以上、1 件のみ                                         |
| QFAI-DDP-021 アンカー       | TC-0023-0010..0011 | 2          | 有効参照、未選択                                           |
| QFAI-DDP-022 競合参照       | TC-0023-0012..0016 | 5          | 全フィールド有、欠損、TBD、空文字、N/A                     |
| QFAI-DDP-023 CTA 階層       | TC-0023-0017..0018 | 2          | primary 有、primary 無                                     |
| QFAI-DDP-024 状態カバレッジ | TC-0023-0019..0020 | 2          | 4 状態完備、error 欠損                                     |
| QFAI-DDP-025 アンチゴール   | TC-0023-0021..0022 | 2          | 1 件以上、0 件                                             |
| 横断: severity 検証         | TC-0023-0023       | 1          | 全バリデータが severity="error" を出力                     |
| 横断: 3 パートメッセージ    | TC-0023-0024       | 1          | フィールド名 + 理由 + 修正方法の構造検証                   |

**Fixture 方式**: `packages/qfai/tests/fixtures/discussion-hardening/` 配下にミニマルなマークダウンフィクスチャファイルを作成。各バリデータの pass/fail ケースに対応する discussion pack 構造を用意。

**Coverage 目標**: NFR-0004 準拠で 100% branch coverage。TC-0023-0032 で coverage レポートを検証。

### L3 インテグレーションテスト

**Location**: `packages/qfai/tests/integration/discussionDesignHardening.test.ts`
**Coverage**: TC-0023-0025..0031, TC-0023-0033..0034 (10 テストケース)

| テスト分類                   | TC 範囲      | 内容                                                              |
| ---------------------------- | ------------ | ----------------------------------------------------------------- |
| Review-Request 統合          | TC-0023-0025 | 14_Review-Request.md に Design Direction Decisions セクション存在 |
| Delta ログ統合               | TC-0023-0026 | 99_delta.md に Rejected Visual Directions セクション存在          |
| SKILL.md ドキュメント        | TC-0023-0027 | SKILL.md に 7 バリデータの pass 基準一覧                          |
| テンプレートスキャフォールド | TC-0023-0028 | assets/init/ テンプレートに DDS プレースホルダー                  |
| validate パイプライン統合    | TC-0023-0029 | `validateProject()` 経由で QFAI-DDP-019..025 が実行される         |
| 後方互換性                   | TC-0023-0030 | v1.6.5 non-UI パック "api-rate-limiting" で zero new issues       |
| パフォーマンス               | TC-0023-0031 | 新規バリデータ追加による validate 実行時間 delta <=500ms          |
| qualityProfile 非介入        | TC-0023-0033 | qualityProfile 値に関わらずバリデータ実行                         |
| 同一チェンジセット           | TC-0023-0034 | バリデータコード + SKILL.md + テンプレートが同一 PR に含まれる    |

### ATDD アノテーション

テストファイルに QFAI トレーサビリティアノテーションを付与:

```typescript
// QFAI:SPEC-0023:US-0023-0001
describe("isUiBearing", () => {
  // QFAI:SPEC-0023:TC-0023-0001
  it("detects HTML style tag as UI-bearing", async () => { ... });
});
```

## バリデーションルール → TC マッピング

| バリデーションルール | TC-ID                                                                |
| -------------------- | -------------------------------------------------------------------- |
| isUiBearing()        | TC-0023-0001, TC-0023-0002, TC-0023-0003, TC-0023-0004               |
| QFAI-DDP-019         | TC-0023-0005, TC-0023-0006, TC-0023-0007                             |
| QFAI-DDP-020         | TC-0023-0008, TC-0023-0009                                           |
| QFAI-DDP-021         | TC-0023-0010, TC-0023-0011                                           |
| QFAI-DDP-022         | TC-0023-0012, TC-0023-0013, TC-0023-0014, TC-0023-0015, TC-0023-0016 |
| QFAI-DDP-023         | TC-0023-0017, TC-0023-0018                                           |
| QFAI-DDP-024         | TC-0023-0019, TC-0023-0020                                           |
| QFAI-DDP-025         | TC-0023-0021, TC-0023-0022                                           |
| 横断: severity       | TC-0023-0023                                                         |
| 横断: message format | TC-0023-0024                                                         |
| Integration          | TC-0023-0025..0031, TC-0023-0033, TC-0023-0034                       |
| Branch coverage      | TC-0023-0032                                                         |

## 依存関係

- REQ-0001..0014: spec-0023 の要件定義（01_Spec.md 参照）
- DR-0042: UI-bearing 検出方式（アーティファクト存在ベース）
- DR-0043: DDS 配置先（03_Story-Workshop.md）
- DR-0044: 競合参照 3 必須フィールド
- DR-0045: バリデータ厳格度（error 固定）
- DR-0046: 既存 validate.ts への統合方式
- DR-0047: qualityProfile 非介入
- NFR-0001: パフォーマンス <=500ms delta
- NFR-0002: 後方互換性（non-UI パックで zero new issues）
- NFR-0003: 3 パートエラーメッセージ
- NFR-0004: 100% branch coverage
- NFR-0005: 同一チェンジセット（バリデータ + SKILL.md + テンプレート）

## リスクと軽減策

| リスク                                      | 影響度 | 軽減策                                                                                                                 |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| isUiBearing() の誤検出（false positive）    | 高     | アーティファクト存在ベース（DR-0042）により精度確保。v1.6.5 non-UI パックを回帰ベースラインとして使用（TC-0023-0030）  |
| isUiBearing() の見逃し（false negative）    | 中     | HTML タグ + Mermaid screen flow の二重検出。テストフィクスチャで境界ケースを網羅（TC-0023-0001..0004）                 |
| パフォーマンス予算超過（>500ms）            | 中     | 各バリデータは既に読み込み済みの 03_Story-Workshop.md を再利用。ファイル I/O を最小化。TC-0023-0031 で計測検証         |
| 既存 ddpValidation.ts との isUiBearing 競合 | 中     | 新関数は独立モジュール。既存 `UI_BEARING_KEYWORDS_RE` は触らない。将来の統合は別 spec で対応                           |
| 後方互換性の破損                            | 高     | 全バリデータを `isUiBearing()` でゲート。non-UI パックでは一切発火しない。各バリデータ追加後に既存テストスイートを実行 |
| テンプレート更新と SKILL.md の同期漏れ      | 中     | NFR-0005 により単一 PR で全成果物を含める。TC-0023-0034 で PR diff の完全性を検証                                      |
| DDS サブセクション見出しのパース精度        | 中     | Markdown heading 正規表現を厳密に定義。テストフィクスチャで heading レベル（##, ###）のバリエーションを検証            |

## 実装順序

1. **isUiBearing() 検出関数**: 新規ファイル作成 + L2 テスト (TC-0023-0001..0004) — Red-Green
2. **QFAI-DDP-019 DDS 存在検証**: バリデータ実装 + L2 テスト (TC-0023-0005..0007)
3. **QFAI-DDP-020 オプション比較**: バリデータ実装 + L2 テスト (TC-0023-0008..0009)
4. **QFAI-DDP-021 アンカースクリーン**: バリデータ実装 + L2 テスト (TC-0023-0010..0011)
5. **QFAI-DDP-022 競合参照**: バリデータ実装 + L2 テスト (TC-0023-0012..0016)
6. **QFAI-DDP-023 CTA 階層**: バリデータ実装 + L2 テスト (TC-0023-0017..0018)
7. **QFAI-DDP-024 状態カバレッジ**: バリデータ実装 + L2 テスト (TC-0023-0019..0020)
8. **QFAI-DDP-025 デザインアンチゴール**: バリデータ実装 + L2 テスト (TC-0023-0021..0022)
9. **横断テスト**: severity + message format (TC-0023-0023..0024)
10. **オーケストレータ統合**: index.ts + validate.ts 修正 + L3 テスト (TC-0023-0029..0031, TC-0023-0033)
11. **テンプレート更新**: 03, 04, 14, 99 テンプレート修正 + L3 テスト (TC-0023-0025..0028)
12. **SKILL.md 更新**: UI-bearing 要件セクション追加 + L3 テスト (TC-0023-0027)
13. **同一チェンジセット検証**: TC-0023-0034
14. **バージョンバンプ**: package.json → 1.7.0 + CHANGELOG

## Work Orders Summary

| Step | Role (sub-agent) | Task title     | Input (refs)                                          | Output (refs)           | Status (PASS/REVISE) |
| ---- | ---------------- | -------------- | ----------------------------------------------------- | ----------------------- | -------------------- |
| 1    | Architect        | Plan structure | spec-0023/01_Spec, discussion pack, validate.ts       | 10_Plan.md              | PASS                 |
| 2    | TestStrategist   | Test strategy  | 06_Test-Cases, test-layers, existing test conventions | 10_Plan.md test section | PASS                 |
