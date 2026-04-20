# 05_Scope — スコープ定義

## In Scope（スコープ内）

- `packages/qfai/src/core/harness/measurement.ts` — category refs 厳格化・validatePanelScore() 呼び出し組み込み
- `packages/qfai/src/core/harness/panelScore.ts` — evidenceRefs 厳格化・axes 非空チェック
- `packages/qfai/src/core/harness/types.ts` — 必要に応じて DTO 型定義の更新
- `packages/qfai/src/core/prototyping/specCoverage.ts` — 01_Spec.md のみスキャンするよう変更
- `packages/qfai/src/core/prototyping/refSemantics.ts` — isSpecDeclarationRef() を line-ref only grammar へ変更
- `packages/qfai/src/core/index.ts` — runMeasurement / validatePanelScore の public export 削除
- `packages/qfai/src/core/validators/prototypingEvidence.ts` — 必要に応じて isSpecDeclarationRef() への一本化
- `packages/qfai/tests/core/harness/measurement.test.ts` — 現行 DTO・現行 ref grammar へ全面更新
- `packages/qfai/tests/core/harness/panelScore.test.ts` — 現行 DTO へ全面更新・evidenceRefs 厳格化テスト追加
- `packages/qfai/tests/core/prototyping/specCoverage.test.ts` — 新規作成または既存拡張
- `packages/qfai/tests/core/prototyping/refSemantics.test.ts` — 新規作成または既存拡張
- `packages/qfai/README.md` — helper public export 削除・declaredRef 説明更新・stale 例の修正

## Out of Scope（スコープ外）

- `repo root ./.qfai/**` — 運用ディレクトリ（QFAI パッケージ改善時は .qfai/ を直接編集しない）
- full-harness scoring rubric 再設計
- Browser QA orchestration 再設計
- calibration pack 再設計
- non-UI prototyping 再導入
- public helper (`runMeasurement` / `validatePanelScore`) の互換レイヤー追加
- migration support / deprecation warning / alias export
- `packages/qfai` 以外のパッケージへの変更

## Constraints（制約概要）

- Technical constraints: `packages/qfai/**` のみ変更対象（詳細は 09_Constraints.md）
- Operational constraints: 単一 PR 完結・stale テスト削除（詳細は 09_Constraints.md）
- Legal / compliance constraints: 該当なし（内部パッケージ改善）

## Success Criteria（成功基準）

| Criterion | Measurement                                                               | Target | Priority |
| --------- | ------------------------------------------------------------------------- | ------ | -------- |
| SC-001    | `src/core/index.ts` から `runMeasurement` / `validatePanelScore` の export が消えている | 0件残存 | must |
| SC-002    | `runMeasurement()` が `#screen:<slug>` 形式を reject する                 | PASS (error thrown/returned) | must |
| SC-003    | `runMeasurement()` が空 l1.axes / l2.axes を reject する                  | PASS (error thrown/returned) | must |
| SC-004    | `validatePanelScore()` が空 evidenceRefs を reject する                   | PASS (error thrown/returned) | must |
| SC-005    | `isSpecDeclarationRef()` が `.qfai/specs/<id>/01_Spec.md#L<n>` のみ true  | PASS | must |
| SC-006    | `isSpecDeclarationRef()` が notes.md / anchor / discussion ref を false   | PASS | must |
| SC-007    | `specCoverage.ts` が 01_Spec.md のみから declaredRef を生成する            | PASS | must |
| SC-008    | `measurement.test.ts` が現行 DTO フィクスチャで GREEN                     | all tests GREEN | must |
| SC-009    | `panelScore.test.ts` が現行 panel score shape で GREEN                    | all tests GREEN | must |
| SC-010    | `specCoverage.test.ts` が存在し GREEN                                     | all tests GREEN | must |
| SC-011    | `refSemantics.test.ts` が存在し GREEN                                     | all tests GREEN | must |
| SC-012    | `pnpm format:check && pnpm lint && pnpm check-types` が通過               | exit 0 | must |
| SC-013    | `packages/qfai/README.md` から helper public API 記述が削除されている      | 0件残存 | must |

## Assumptions（前提）

- rev10（discussion-20260416195444737）の変更は完了済みで PR マージ済みであること
- WS-1（helper export 削除・category refs 厳格化）と WS-2（declaredRef semantic closure）のソース変更は、delivery-planner の評価によりすでに着地済みである可能性が高い
- 主な残件は WS-3（テストファイル新規作成・既存テスト更新）であること
- vitest が CI で利用可能で、全テストが `pnpm test` で実行できること
