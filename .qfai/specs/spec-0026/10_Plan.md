# 10 Plan

## Purpose

This is the How-only implementation plan for spec-0026 (CAP-0026: Discussion/UIUX Authoring Foundation).

## Implementation Strategy

### Slice 1: uiux/ Sidecar Templates (11 new files)

| File                     | Path                                                                                          | Responsibility                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 00_index.md              | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/00_index.md` | サイドカーファイルマニフェスト（11ファイル一覧と概要）                              |
| 10_strategy.md           | `...templates/uiux/10_strategy.md`                                                            | YAML 実装戦略テンプレート（surface classification 結果参照、version フィールド含む）|
| 20_eval_axis_usability.md| `...templates/uiux/20_eval_axis_usability.md`                                                 | ユーザビリティ評価軸（evaluation criteria, measurement approach）                  |
| 21_eval_axis_consistency.md| `...templates/uiux/21_eval_axis_consistency.md`                                              | 一貫性評価軸                                                                       |
| 22_eval_axis_accessibility.md| `...templates/uiux/22_eval_axis_accessibility.md`                                          | アクセシビリティ評価軸                                                             |
| 23_eval_axis_delight.md  | `...templates/uiux/23_eval_axis_delight.md`                                                   | デライト評価軸（product-specific axes のベース）                                   |
| 30_comparison.md         | `...templates/uiux/30_comparison.md`                                                          | オプション比較テンプレート（2+ オプション × スコアリング軸）                       |
| 31_anchor.md             | `...templates/uiux/31_anchor.md`                                                              | アンカースクリーン選定テンプレート                                                 |
| 40_contracts.md          | `...templates/uiux/40_contracts.md`                                                           | スクリーンコントラクトドラフトテンプレート                                         |
| 50_review_bundle.md      | `...templates/uiux/50_review_bundle.md`                                                       | レビュー入力バンドルテンプレート                                                   |
| 60_critique_loop.md      | `...templates/uiux/60_critique_loop.md`                                                       | クリティークループ追跡テンプレート                                                 |

### Slice 2: SKILL.md Update (1 modified file)

| File     | Path                                                                                        | Changes                                                                                         |
| -------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| SKILL.md | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`                 | UI-bearing 検出セクション追加、surface classification カテゴリ定義、完了条件更新、サイドカー生成フロー追加 |

### Slice 3: Direct Template Replacement (3 replaced files)

| File                  | Path                                                                   | Changes                                                                                              |
| --------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 03_Story-Workshop.md  | `...templates/03_Story-Workshop.md`                                    | プライマリを behavior obligations にシフト、HTML/CSS mock をフォールバックに降格                      |
| 04_Sources.md         | `...templates/04_Sources.md`                                           | translation-aware competitive reference registry 追加 (adopted/rejected/local_translation 3フィールド)|
| 14_Review-Request.md  | `...templates/14_Review-Request.md`                                    | sidecar artifact review scope セクション追加                                                          |

### Slice 4: Batch A/B Template Augmentation (12 augmented files)

| Files                                    | Path                    | Changes                                                            |
| ---------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| 01, 02, 05-12, 99 (Batch A + Batch B)  | `...templates/*.md`     | UX intent クロスリファレンスプレースホルダー追加（graceful degrade 対応）|

## Implementation Order (PR 内)

1. uiux/ サイドカーテンプレート11ファイル作成（Slice 1）
2. SKILL.md UI-bearing フロー更新（Slice 2）
3. ダイレクトテンプレート置換 (03, 04, 14)（Slice 3）
4. バッチ A/B テンプレート UX intent 拡張（Slice 4）
5. verify-pack 実行・修正
6. テスト追加・更新
7. CHANGELOG 更新

## Test Strategy

### Asset Integrity Tests

| Test Area          | Verification                                                                | Coverage                    |
| ------------------ | --------------------------------------------------------------------------- | --------------------------- |
| verify-pack        | 全 init アセットのファイル存在・構造チェック                                | TC-0026-0018, TC-0026-0019 |
| Schema conformance | サイドカー YAML ファイルのパース・version フィールド確認                    | TC-0026-0002                |
| Template output    | UI-bearing/非 UI フィクスチャでの qfai-discussion 出力検証                   | TC-0026-0001, TC-0026-0003 |

### Test Fixtures (8 種)

1. UI-bearing プロジェクト (web-ui) — full sidecar generation
2. Non-UI プロジェクト (CLI tool) — sidecar skip
3. Ambiguous signal (web endpoint without UI components) — classification edge
4. Partial sidecar (testing graceful degradation)
5. SKILL.md UI-bearing flow (completion conditions)
6. SKILL.md non-UI flow (unchanged conditions)
7. Template output with competitive references
8. Template output without competitive references

### Existing Test Updates

- verify-pack: 新しいアセットファイルの存在確認追加
- init.test.ts: 新テンプレート配布の確認

### CI Matrix

- Node 18 + Node 20
- `pnpm -C packages/qfai test`

## Quality Gates

- `pnpm format:check && pnpm lint && pnpm check-types` — pass
- `pnpm test` — all existing + new tests pass
- `qfai validate --fail-on error` — error=0
- QFAI-COV-201/202/203/204/205/206 — all zero
- verify-pack — pass

## Risk Mitigations

| Risk                                          | Mitigation                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| オーサリング摩擦増加                          | minimal-but-complete テンプレート（DR-0056）、バッチグルーピング        |
| SKILL.md の曖昧性                             | 明示的 surface classification カテゴリ（DR-0057）、完了条件チェックリスト |
| コア/サイドカー境界のブラー                   | 責務境界ルール、クロスリファレンスは参照のみ                             |
| 非 UI プロジェクトへの影響                    | UI-bearing gating、非 UI フィクスチャでの回帰テスト                      |
| Init アセット配布の不整合                     | verify-pack による自動検証                                               |
