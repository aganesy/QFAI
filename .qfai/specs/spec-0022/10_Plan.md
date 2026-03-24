# 10 Plan

- Spec: spec-0022
- Parent: CAP-0022

## 実装戦略

### デザインフィデリティ評価の特性

CAP-0022 はレンダリング済み UI のデザインフィデリティを評価するスコアカードベースのレビュー体系を定義する。実装対象はスコアカードテンプレート、バリデーションルール、レビューゲート統合である。

### 主要成果物

| 成果物                   | パス / 対象                    | 操作 | 説明                                                         |
| ------------------------ | ------------------------------ | ---- | ------------------------------------------------------------ |
| スコアカードテンプレート | review/evidence テンプレート内 | 新規 | 4 次元（階層・明確性・a11y・レスポンシブ）のスコアカード     |
| バリデーションルール     | `qfai validate` ルールセット   | 修正 | スコアカード構成・閾値・改善指示の検証ルール追加             |
| レビューゲート統合       | review roster 設定             | 修正 | フィデリティスコアカードをレビューゲートの必須チェックに追加 |
| 破壊的変更管理           | delta テンプレート             | 修正 | 破壊的変更のデルタ記録義務の統合                             |

### 検証戦略

デザインフィデリティ評価のテストケースは以下の検証ルールで実現する:

- E_SCORECARD_4DIM: スコアカードに 4 次元が定義されていること
- E_SCORECARD_SCORE_PROSE: 各次元にスコアと prose コメントが記録されていること
- E_SCORECARD_THRESHOLD: PASS/FAIL 閾値（70）が適用されていること
- E_REVIEW_FAIL_ALTERNATIVE: FAIL 時に改善指示と代替案が記載されていること
- E_BREAKING_DELTA: 破壊的変更が delta に記録されていること

### ATDD アノテーション

本 spec のテストケースは構造検証（L レベル）で実現する。CLI 実行テストは対象外。

## テスト戦略

### L-struct 構造検証（qfai validate）

| 検証項目                   | ルール ID                 | 対応 TC 範囲 |
| -------------------------- | ------------------------- | ------------ |
| 4 次元スコアカード構成     | E_SCORECARD_4DIM          | TC-0022-0001 |
| スコア + prose 記録        | E_SCORECARD_SCORE_PROSE   | TC-0022-0002 |
| PASS/FAIL 閾値判定         | E_SCORECARD_THRESHOLD     | TC-0022-0003 |
| FAIL 時改善指示            | E_REVIEW_FAIL_ALTERNATIVE | TC-0022-0004 |
| 破壊的変更デルタ記録       | E_BREAKING_DELTA          | TC-0022-0005 |
| レビュー再現性             | カスタム検証              | TC-0022-0006 |
| 次元単位 FAIL 境界値       | E_SCORECARD_THRESHOLD     | TC-0022-0007 |
| レスポンシブ viewport 検証 | E_SCORECARD_SCORE_PROSE   | TC-0022-0008 |
| taskFidelity 次元定義検証  | E_SCORECARD_5DIM          | TC-0022-0009 |
| taskFidelity 評価項目記録  | E_SCORECARD_SCORE_PROSE   | TC-0022-0010 |
| warning→error 昇格検証     | 昇格ルール 6 件           | TC-0022-0011 |
| config override 動作検証   | uiux_policy override      | TC-0022-0012 |

### L5 E2E / L3 Integration / L4 API

- 対象外: デザインフィデリティ評価は構造検証と手動レビューで実現する

## 依存関係

- REQ-0009: フィデリティスコアカードの要件定義
- REQ-0011: 破壊的変更ドキュメントの要件定義
- REQ-0012: レビューゲート整合の要件定義
- NFR-0003, NFR-0004: レスポンシブ・a11y の品質基準
- NFR-0007: レビュー再現性の保証
- NFR-0008: 破壊的変更衛生

## バリデーションルール → TC マッピング

| バリデーションルール          | TC-ID                                    |
| ----------------------------- | ---------------------------------------- |
| E_SCORECARD_4DIM              | TC-0022-0001                             |
| E_SCORECARD_SCORE_PROSE       | TC-0022-0002, TC-0022-0008, TC-0022-0010 |
| E_SCORECARD_THRESHOLD         | TC-0022-0003, TC-0022-0007               |
| E_REVIEW_FAIL_ALTERNATIVE     | TC-0022-0004                             |
| E_BREAKING_DELTA              | TC-0022-0005                             |
| E_REVIEW_REPRODUCIBILITY      | TC-0022-0006                             |
| E_SCORECARD_5DIM              | TC-0022-0009                             |
| warning→error 昇格ルール 6 件 | TC-0022-0011                             |
| uiux_policy override          | TC-0022-0012                             |

### TC-0022-0009〜0012 詳細

| TC ID        | Title                                               | Level    | AC-Refs  | Key Assertions                                                                                          |
| ------------ | --------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------- |
| TC-0022-0009 | taskFidelity 次元がスコアカードに定義されていること | L-struct | REQ-0016 | スコアカードに 5 次元（階層・明確性・a11y・レスポンシブ・taskFidelity）が存在する場合 PASS              |
| TC-0022-0010 | taskFidelity 評価項目の記録内容検証                 | L-struct | REQ-0016 | step_count / cta_visibility / empty_state / error_state / primary_flow_clicks の 5 項目が記録されている |
| TC-0022-0011 | warning→error 昇格バリデーション 6 件               | L-struct | REQ-0017 | dual_primary_cta 等 6 件が error として検出され、warning として扱われない                               |
| TC-0022-0012 | config override による warning ダウングレード       | L-struct | REQ-0017 | `uiux_policy.warning_as_error_override` 設定時に昇格ルールが warning に戻る（DR-0037）                  |

## リスクと軽減策

| リスク                                       | 影響度 | 軽減策                                                                                                                                              |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| スコアカード採点の主観性残留                 | 中     | 各次元の採点基準を明示的に定義し、rubric の再現性を NFR-0007 で保証する                                                                             |
| 閾値 70 の妥当性                             | 低     | 運用実績を蓄積し、v1.6.6 以降で閾値の見直しを検討する                                                                                               |
| 破壊的変更の見落とし                         | 高     | レビューゲートで delta 記録の有無を必須チェックとして検証する                                                                                       |
| VRT/RUM 自動化への早期依存                   | 中     | v1.6.6 に deferred とし、手動レビュー体系を先に確立する                                                                                             |
| warning→error 昇格による既存プロジェクト破損 | 高     | `qfai.config.yaml` の `uiux_policy.warning_as_error_override` で昇格ルールをプロジェクト単位で上書き可能とし、移行期間中の影響を軽減する（DR-0037） |

## 実装順序

1. **スコアカードテンプレート定義**: 4 次元のテンプレートと採点基準を策定
2. **バリデーションルール追加**: `qfai validate` にスコアカード検証ルールを追加
3. **レビューゲート統合**: review roster にフィデリティスコアカードを必須チェックとして統合
4. **破壊的変更管理統合**: delta テンプレートに破壊的変更記録義務を統合
5. **09_delta.md**: 変更記録
6. **qfai validate**: 構造検証

### Phase 5: taskFidelity 第 5 スコアカード次元 (REQ-0016)

スコアカードを 4 次元から 5 次元に拡張し、taskFidelity を必須次元として追加する：

- **次元名**: taskFidelity
- **評価項目**:
  - `step_count`: プライマリタスク完了クリック数（目標 ≤3、超過で減点）
  - `cta_visibility`: プライマリ CTA の above-the-fold 視認性
  - `empty_state`: 空状態の定義とアクション有無
  - `error_state`: エラー状態のリカバリー手順有無
  - `primary_flow_clicks`: プライマリフロー全体の最大クリック数（≤3 を目標）
- **スコア範囲**: 0〜100（各項目 20 点満点）
- **バリデーションルール追加**: `E_SCORECARD_5DIM`（5 次元定義の存在チェック）
- **PASS 閾値**: 既存の 70 点を維持（5 次元合算）
- **依存**: REQ-0016

### Phase 6: Warning → Error ゲート昇格 (REQ-0017)

以下の 6 バリデーションを warning から error に昇格させる：

| バリデーション                | 変更前  | 変更後 | 根拠                                    |
| ----------------------------- | ------- | ------ | --------------------------------------- |
| `dual_primary_cta`            | warning | error  | UX の根幹に関わるため即時ブロックが必要 |
| `empty_state_without_action`  | warning | error  | ユーザーを行き止まりにする重大欠陥      |
| `error_without_recovery`      | warning | error  | リカバリーなしエラーは UX 崩壊          |
| `placeholder_or_lorem`        | warning | error  | 未完成コンテンツのリリース防止          |
| `cta_visibility_fail`         | warning | error  | CTA 不可視はコンバージョン破壊          |
| `scorecard_dimension_missing` | warning | error  | スコアカード未完ではレビュー不可        |

- 既存プロジェクトへの影響: `qfai.config.yaml` の `uiux_policy.warning_as_error_override` でプロジェクト単位の上書き可能（DR-0037）
- **依存**: REQ-0017、DR-0037
