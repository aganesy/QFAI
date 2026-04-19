# 06_REQ — 機能要件定義

<!-- UX-INTENT: ui_bearing: false — screen contracts 不要 -->

## Requirements Table

| REQ-ID   | Title                                                               | Description                                                                                                                                                                                                              | Source             | Priority | Status |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | -------- | ------ |
| REQ-0001 | `runMeasurement` / `validatePanelScore` の public export 削除       | `src/core/index.ts` から `runMeasurement` と `validatePanelScore` の export を削除する。deep import 互換パスも作らない。破壊的変更として確定。                                                                          | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0002 | `runMeasurement()` の全カテゴリ ref strict 検証                     | `runMeasurement()` は次の全カテゴリが非空かつ concrete artifact ref であることを検証する: `renderRefs`, `browserQaRefs`, `runtimeGateRefs`, `uiObservationRefs`, `specCoverageRefs`, `discussionRefs`, `trendRefs`, `screenContractRefs`。空配列・絶対パス・synthetic token は reject する。 | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0003 | `runMeasurement()` の `screenContractRefs` canonical 形式検証       | `runMeasurement()` の `screenContractRefs[]` は `.qfai/discussion/<pack>/uiux/40_screen_contracts.md#<screenId>` 形式のみ受け付ける。`#screen:<slug>` 形式は reject する。                                               | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0004 | `runMeasurement()` の `l1.axes` / `l2.axes` 非空検証               | `runMeasurement()` は `l1.axes` と `l2.axes` のいずれかが空配列の場合に reject する。axes の非空チェックは `validatePanelScore()` 呼び出し前に実施する。                                                                | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0005 | `runMeasurement()` が `validatePanelScore()` を mandatory 呼び出し  | `runMeasurement()` は計算開始前に必ず `validatePanelScore(l1)` と `validatePanelScore(l2)` を呼び出す。validator が失敗した場合は計算を中断してエラーを返す。                                                           | SRC-0001           | must     | draft  |
| REQ-0006 | `validatePanelScore()` の `axes` 非空検証                           | `validatePanelScore()` は `axes.length === 0` を reject する。axes が 1 件以上あることを必須とする。                                                                                                                    | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0007 | `validatePanelScore()` の `evidenceRefs` 厳格検証                   | `validatePanelScore()` は各 axis につき `evidenceRefs.length >= 1` を必須とし、各 ref が concrete artifact ref であることを検証する。空文字・絶対パス・synthetic token は reject する。                                  | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0008 | `specCoverage.ts` を `01_Spec.md` のみのスキャンに変更              | `buildSpecCoverageSummary()` / `buildPerSpecCoverage()` は spec ディレクトリ配下の全 `.md` ファイルの走査を廃止し、各 spec の `01_Spec.md` のみを declaration source として読む。`01_Spec.md` が存在しない spec は宣言 source 不在として扱う。 | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0009 | `isSpecDeclarationRef()` を line-ref only grammar に限定            | `refSemantics.ts` の `isSpecDeclarationRef()` は `.qfai/specs/<specId>/01_Spec.md#L<正の整数>` のみを `true` とする。`#anchor` 形式・`notes.md`・`appendix.md`・discussion ref・screen contract ref・`#L0`・絶対パスはすべて `false` を返す。`prototypingEvidence.ts` が独自 declaredRef ロジックを持つ場合は `isSpecDeclarationRef()` に一本化する。 | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0010 | `measurement.test.ts` を現行 DTO・ref grammar へ全面更新            | `tests/core/harness/measurement.test.ts` のフィクスチャを現行 `MeasurementInput` DTO に全面更新する。削除済みフィールド（`runtimeGate.uiRoutes`, `runtimeGate.apiEndpoints`, `uiObservation.domLabelsFound`, `uiObservation.elementsPlaced`, `uiObservation.actionsWired`, `uiObservation.htmlCaptureRefs` 等）を持つフィクスチャを削除する。`#screen:dashboard` reject などの負例ケースを追加する。 | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0011 | `panelScore.test.ts` を現行 panel score shape で全面更新            | `tests/core/harness/panelScore.test.ts` を現行 `PanelScore` 型（axes + evidenceRefs 構造）に全面更新する。`evidenceRefs` 厳格検証・empty axes・rationale 空・score 範囲外の各負例テストを含める。旧 DTO フィールド前提のテストを削除する。 | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0012 | `specCoverage.test.ts` 新規作成または既存拡張                       | `tests/core/prototyping/specCoverage.test.ts` が存在しない場合は新規作成、存在する場合は拡張する。`01_Spec.md#L<n>` を正例とし、`notes.md#L10` / `appendix.md#L3` / `01_Spec.md#route-home` / discussion ref / screen contract ref の各否定例を含める。 | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0013 | `refSemantics.test.ts` 新規作成または既存拡張                       | `tests/core/prototyping/refSemantics.test.ts` が存在しない場合は新規作成、存在する場合は拡張する。`isSpecDeclarationRef()` の許可文法（`01_Spec.md#L14`）と拒否文法（`#L0`, `#anchor`, `notes.md`, discussion ref, absolute path）を網羅的にテストする。 | SRC-0001, SRC-0002 | must     | draft  |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
- REQ-0001〜0009 は WS-1/WS-2 のソース変更に対応。REQ-0010〜0013 は WS-3 のテスト同期に対応。
- README 同期（設計書 WS-3）は NFR-0005 として定義する（実装の副産物ではなく品質要件）。
