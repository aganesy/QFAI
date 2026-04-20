# 08_Glossary — 用語集

## Term Definitions

| Term                         | Definition                                                                                                                                                                      | Context                          | Source   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- |
| `declaredRef`                | spec coverage において「宣言された参照先」を示す ref。rev11 から `.qfai/specs/<specId>/01_Spec.md#L<正の整数>` 形式に限定される。notes.md・discussion ref・アンカー形式は禁止。 | specCoverage, refSemantics       | SRC-0001 |
| `isSpecDeclarationRef()`     | `refSemantics.ts` に定義された純粋述語関数。`declaredRef` が許可された grammar に一致するかを判定する。許可形式: `.qfai/specs/<specId>/01_Spec.md#L<正の整数>` のみ。           | refSemantics.ts                  | SRC-0001 |
| `runMeasurement()`           | `src/core/harness/measurement.ts` に定義された内部ヘルパー関数。rev11 以降は public export から除去され、package 内部でのみ使用される。入力の category refs を厳格に検証する。  | harness/measurement.ts           | SRC-0001 |
| `validatePanelScore()`       | `src/core/harness/panelScore.ts` に定義された内部ヘルパー関数。rev11 以降は public export から除去。axes が非空であること・各 axis の evidenceRefs が非空かつ concrete ref であることを強制する。 | harness/panelScore.ts            | SRC-0001 |
| concrete artifact ref        | `.qfai/` 配下の実在するアーティファクトファイルへの相対パス参照。絶対パス・synthetic token（`"TODO"`, `"pending"` 等）・空文字は concrete ref ではない。                         | runMeasurement, validatePanelScore | SRC-0001 |
| canonical screen contract ref | `uiux/40_screen_contracts.md` のスクリーン要素への正規参照形式。形式: `.qfai/discussion/<pack>/uiux/40_screen_contracts.md#<screenId>`。`#screen:<slug>` 形式は許可されない（rev11 以降 reject）。 | measurement.ts, screenContracts  | SRC-0001 |
| stale DTO                    | 現行の型定義（`MeasurementInput`・`PanelScore` 等）に存在しない obsolete フィールドを含む Data Transfer Object。例: `runtimeGate.uiRoutes`, `uiObservation.domLabelsFound`。 | harness tests                    | SRC-0001 |
| public surface               | `src/core/index.ts` からエクスポートされる API の総体。rev11 では `runMeasurement` / `validatePanelScore` を public surface から除去し、production path API のみに縮退する。  | index.ts                         | SRC-0001 |
| fail-closed                  | バリデーション違反時に必ずエラー（throw またはエラーオブジェクト返却）で応答し、silent fallback・warning-only・auto-normalization を行わない設計原則。                              | 全バリデーションロジック           | SRC-0001 |
| semantic closure             | 型・runtime・validator・tests・README が同一の semantic contract を共有し、矛盾や乖離がない状態。rev11 は package-wide semantic closure の完全達成を目標とする。                 | packages/qfai 全体               | SRC-0001 |
| specCoverage                 | `src/core/prototyping/specCoverage.ts` に実装された、spec ディレクトリの宣言行を解析して coverage summary を生成する機能。rev11 から各 spec の `01_Spec.md` のみをスキャン対象とする。 | prototyping/specCoverage.ts      | SRC-0001 |
| predicate consolidation      | `isSpecDeclarationRef()` のロジックを `refSemantics.ts` に一本化し、他モジュールで重複実装しないポリシー。違反は DC-03 禁止事項に該当する。                                       | refSemantics.ts (SSOT)           | SRC-0001 |
| panel score                  | `validatePanelScore()` が受け取る評価スコアオブジェクト。`axes: { key, score, rationale, evidenceRefs[] }[]` の配列を持つ。axes は非空必須、各 evidenceRefs も非空必須（rev11 以降）。 | harness/panelScore.ts            | SRC-0001 |
| WS-1                         | Workstream 1: helper public surface の縮退と内部 helper の厳格化（index.ts・measurement.ts・panelScore.ts）。                                                                   | rev11 設計書 sec.6               | SRC-0001 |
| WS-2                         | Workstream 2: `declaredRef` を canonical declaration line ref に限定（specCoverage.ts・refSemantics.ts）。                                                                      | rev11 設計書 sec.6               | SRC-0001 |
| WS-3                         | Workstream 3: stale harness tests を current contract ベースへ全面更新（measurement.test.ts・panelScore.test.ts・specCoverage.test.ts・refSemantics.test.ts）。                  | rev11 設計書 sec.6               | SRC-0001 |

## Abbreviations

| Abbreviation | Full Form                               | Notes                                      |
| ------------ | --------------------------------------- | ------------------------------------------ |
| DTO          | Data Transfer Object                    | 関数間でデータを渡す型付きオブジェクト      |
| WS           | Workstream                              | rev11 の作業単位（WS-1, WS-2, WS-3）       |
| DoD          | Definition of Done                      | rev11 完了定義（設計書 sec.5）             |
| CI           | Continuous Integration                  | format/lint/check-types/test の自動チェック |
| SSOT         | Single Source of Truth                  | predicate は refSemantics.ts が SSOT       |
| PR           | Pull Request                            | すべての変更を含む単一の GitHub PR          |

## Rules

- 本用語集の定義は全 discussion アーティファクト（06_REQ.md, 07_NFR.md, 09_Constraints.md, 10_Policy.md 等）で一貫して使用する。
- 曖昧または文脈依存の用語は Context 列に使用箇所を明記する。
