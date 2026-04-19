# 02 User Stories

## US Catalog

- US-0004-0001: バリデーション実行 - validate で全バリデータ(33+)を順次実行し Issue[] を集約
- US-0004-0002: バリデーションフェーズ制御 - --phase full|atdd|tdd|refinement でスコープ制御
- US-0004-0003: 終了コード制御 - --fail-on error|warning|never で終了コード制御
- US-0004-0004: GitHub Actions 出力 - --format github でアノテーション形式出力（最大100件）
- US-0004-0005: バリデーション結果 JSON 出力 - validate.json に構造化結果出力
- US-0004-0006: ランログ生成 - .qfai/report/run-\*/ にタイムスタンプ付きログ保存
- US-0004-0007: ウェイバー適用 - waivers.yml で Issue の suppress/downgrade
- US-0004-0008: スペック必須ファイル検証 - レイヤードスペック必須ファイル存在チェック
- US-0004-0009: ID フォーマット検証 - ID 形式・重複チェック
- US-0004-0010: トレーサビリティ検証 - AC->TC, BR->EX, EX->TC 参照整合性
- US-0004-0011: ATDD アノテーション検証 - テストファイル内のアノテーション検証
- US-0004-0012: ディスカッションパック検証 - 15ファイル存在・内容・OQ ゲート
- US-0004-0013: コントラクト検証 - UI/API/DB コントラクト ID 整合性
- US-0004-0014: Mermaid 図検証 - mermaid フェンスブロック形式チェック
- US-0004-0015: Phase guard - CI で --phase refinement をブロック
- US-0004-0016: Canonical UIX validator aggregation - runAllUixValidators() を canonical aggregator 化（REQ-0011）
- US-0004-0017: 3-layer テンプレートファミリーバリデータ整合 - 新 3-layer ファイル名・スキーマ期待（REQ-0012）
- US-0004-0018: Truthful render-evidence state handling - プレースホルダー排除、truthful state 返却（REQ-0013）
- US-0004-0019: Browser QA truthful implementation - minimal runner で truthful 報告
- US-0004-0020: Canonical/Legacy Validator Separation
- US-0004-0021: IssueCategory Discrimination
- US-0004-0022: Prototyping Recommendation Validation（REQ-0014）
- US-0004-0023: Full-Harness Iteration Integrity Error Enforcement (v1.7.15, REQ-0124..REQ-0134)
- US-0004-0024: Reviewer and Convergence Evidence Truthfulness (v1.7.15, REQ-0125..REQ-0127)
- US-0004-0025: Evidence Grounding Validators (v1.7.15, REQ-0128..REQ-0134)

## US-0004-0001: バリデーション実行

- Parent: CAP-0004
- Goal: `qfai validate` で全バリデータ（33+）を順次実行し、検出された Issue を集約して返す
- Non-goals: 個別バリデータの修正機能
- Notes: バリデータは独立して実行され、結果は Issue[] として統合される

## US-0004-0002: バリデーションフェーズ制御

- Parent: CAP-0004
- Goal: `--phase full|atdd|tdd|refinement` でバリデーション対象のスコープを制御する
- Non-goals: カスタムフェーズ定義
- Notes: デフォルトは full

## US-0004-0003: 終了コード制御

- Parent: CAP-0004
- Goal: `--fail-on error|warning|never` でバリデーション結果に基づく終了コードを制御する。config の validation.failOn がフォールバック
- Non-goals: カスタム終了コード

## US-0004-0004: GitHub Actions 出力

- Parent: CAP-0004
- Goal: `--format github` で ::error / ::warning アノテーション形式で出力する（重複排除後、最大100件）
- Non-goals: 他 CI ツール固有の出力形式

## US-0004-0005: バリデーション結果 JSON 出力

- Parent: CAP-0004
- Goal: `validate.json` に構造化されたバリデーション結果（issues, counts, traceability）を出力する
- Non-goals: カスタム出力スキーマ
- Notes: report コマンドの入力として使用可能

## US-0004-0006: ランログ生成

- Parent: CAP-0004
- Goal: `.qfai/report/run-*/` にタイムスタンプ付きの実行ログを保存する
- Non-goals: ログのローテーション

## US-0004-0007: ウェイバー適用

- Parent: CAP-0004
- Goal: waivers.yml に基づき、特定の Issue を suppress または downgrade する
- Non-goals: ウェイバーの自動生成
- Notes: suppressed=true フラグで内部保持

## US-0004-0008: スペック必須ファイル検証

- Parent: CAP-0004
- Goal: レイヤードスペック（01_Spec..09_delta）の必須ファイル存在チェック
- Non-goals: ファイル内容の意味的検証

## US-0004-0009: ID フォーマット検証

- Parent: CAP-0004
- Goal: CAP/US/AC/BR/EX/TC の形式チェック・重複チェック
- Non-goals: ID の自動採番

## US-0004-0010: トレーサビリティ検証

- Parent: CAP-0004
- Goal: AC->TC, BR->EX, EX->TC, Spec->CAP の参照整合性チェック
- Non-goals: 参照の自動修復

## US-0004-0011: ATDD アノテーション検証

- Parent: CAP-0004
- Goal: テストファイル内の QFAI アノテーション（US/TC/CON-API）の存在・形式を検証する
- Non-goals: アノテーションの自動挿入

## US-0004-0012: ディスカッションパック検証

- Parent: CAP-0004
- Goal: ディスカッションパックの 15ファイル存在、内容充足、blocking OQ 検出を行う
- Non-goals: ディスカッション内容の品質評価

## US-0004-0013: コントラクト検証

- Parent: CAP-0004
- Goal: UI/API/DB コントラクトの ID 形式・重複・参照整合性チェック
- Non-goals: コントラクトの自動生成

## US-0004-0014: Mermaid 図検証

- Parent: CAP-0004
- Goal: spec/discussion 内の mermaid フェンスブロックの存在・形式チェック
- Non-goals: Mermaid 図のレンダリング検証

## US-0004-0015: Phase guard

- Parent: CAP-0004
- Goal: CI 環境で `--phase refinement` が指定された場合、バリデーションをブロックし refinement issue を生成する
- Non-goals: 他フェーズのブロック

## US-0004-0016: Canonical UIX validator aggregation

- Parent: CAP-0004
- Goal: `runAllUixValidators()` をレガシー互換ラッパーではなく canonical aggregator として動作させ、validate.ts が直接ルーティングする
- Non-goals: レガシー 4-axis 集約ロジックの維持
- Notes: REQ-0011。D-001（3-layer evaluation model as canonical）に基づく。旧集約パスは完全に除去する

## US-0004-0017: 3-layer テンプレートファミリーバリデータ整合

- Parent: CAP-0004
- Goal: UIX バリデータが新 3-layer テンプレートファミリー（11_design_taste_interview, 20_design_eval_invariant, 21_design_eval_trend_derived, 22_design_eval_product_specific, 23_design_eval_aggregate, 24_design_eval_dynamic_overrides）のファイル名・スキーマを期待するように整合させる
- Non-goals: テンプレート内容の自動生成
- Notes: REQ-0012。D-004（旧 4-axis テンプレートの完全除去）に基づく

## US-0004-0018: Truthful render-evidence state handling

- Parent: CAP-0004
- Goal: render-evidence バリデータがプレースホルダーではなく truthful な状態（captured | skipped | failed）を返す
- Non-goals: render-evidence の自動キャプチャ実行
- Notes: REQ-0013。スキップ理由を明示し、fake-complete な evidence を排除する

## US-0004-0019: Browser QA truthful implementation

- Parent: CAP-0004
- Goal: Browser QA バリデータが minimal runner を維持しつつ、fake-complete ではなく実際のテスト実行状態を truthful に報告する
- Non-goals: フル Browser QA フレームワークの実装
- Notes: REQ-0014。minimal runner のスコープを明確にし、未実行テストを pass と偽らない

## US-0004-0020: Canonical Validator Pipeline

As a QFAI user, I want the validate pipeline to use only canonical validators in production, so that validation results are accurate and consistent. v1.7.14: legacy validators are completely removed from the source tree (DR-0115).

## US-0004-0021: IssueCategory Discrimination

As a CI/CD engineer, I want validator issues tagged with `category: "canonical"` or `"change"`, so that I can filter and prioritize findings by their source. v1.7.14: "compatibility" category removed (DR-0108).

## US-0004-0022: Prototyping Recommendation Validation

As a QFAI user, I want `qfai validate` to check prototyping.yaml schema (required fields, mode validity, allowed_modes consistency), so that invalid prototyping recommendations are caught early.

## US-0004-0023: Full-Harness Iteration Integrity Error Enforcement (v1.7.15)

- Parent: CAP-0004
- Goal: CI rejects full-harness evidence containing synthetic/zero-seeded/single-iteration-converged patterns by enforcing PROT-295..306, PROT-308..309 as error severity
- Non-goals: Downgrading these rules to warnings
- Notes: REQ-0124..REQ-0134。v1.7.15 で PROT-290..292 を warning→error に昇格し、PROT-295..306, PROT-308..309 を新規 error として追加

## US-0004-0024: Reviewer and Convergence Evidence Truthfulness (v1.7.15)

- Parent: CAP-0004
- Goal: Validator rejects evidence where reviewer is placeholder, convergence claims single-iteration, or weightedTotal is pre-scored, ensuring full-harness evidence reflects real iterative review
- Non-goals: Validating reviewer identity against external systems
- Notes: REQ-0125..REQ-0127。PROT-290, PROT-295, PROT-296, PROT-308, PROT-309 が対応

## US-0004-0025: Evidence Grounding Validators (v1.7.15)

- Parent: CAP-0004
- Goal: Validator rejects evidence where specCoverage is zero-seeded, mockPaths contain synthetic passes, calibrationRef is empty, or structural counts (reviewerLogs/iterations/scoringTrace) do not match iterationCount
- Non-goals: Validating evidence content quality beyond structural integrity
- Notes: REQ-0128..REQ-0134。PROT-291, PROT-297, PROT-298, PROT-301, PROT-304, PROT-305, PROT-306 が対応

## US-0004-0026: Rev2 Evidence Category and Schema Validators (v1.7.15 rev2)

- Parent: CAP-0004
- Goal: Validator rejects evidence where discussion/screenContract/trend evidenceRefs are empty, declared DB objects lack observation, uiFidelity claims completed without screen-level data, iteration evidenceRefs miss required categories, or request.l1/l2 from old schema is detected
- Non-goals: Implementing the runtime checks themselves (covered by spec-0012)
- Notes: REQ-0136。既存 rule ID の severity upgrade と新 rule ID の追加

## US-0004-0027: Validator Tests Fixture Rev2 Alignment (v1.7.15 rev2)

- Parent: CAP-0004
- Goal: Test fixtures for prototypingEvidence validators are updated to reflect rev2 runtime contract, removing obsolete normal-path patterns and adding rev2 error-path fixtures
- Non-goals: Comprehensive runtime testing (covered by spec-0012 tests)
- Notes: REQ-0137

## US-0004-0028: Design guideline coverage warning validator (v1.7.17)

- Parent: CAP-0004
- Goal: Validator warns when a UI-bearing discussion pack has no usable `design_guideline_research` coverage in `04_Sources.md`
- Non-goals: Validating the factual correctness of the external guideline itself
- Notes: REQ-0138

## US-0004-0029: Trend-derived anchor concreteness warning validator (v1.7.17)

- Parent: CAP-0004
- Goal: Validator warns when `score_anchors` in trend-derived axes use abstract adjectives without quantitative proxy
- Non-goals: Scoring the quality of the chosen threshold values
- Notes: REQ-0139
