# 03 Acceptance Criteria

## AC Gherkin (required)

```gherkin
# AC-0004-0001
Scenario: 全バリデータ実行で Issue 集約
  Given 正常なスペック構造が存在する
  When `qfai validate` を実行する
  Then 全バリデータ（33+）が順次実行され、Issue が集約されて出力される
```

```gherkin
# AC-0004-0002
Scenario: --phase でスコープ制御
  Given スペック構造とテストファイルが存在する
  When `qfai validate --phase atdd` を実行する
  Then ATDD フェーズに該当するバリデータのみ実行される
```

```gherkin
# AC-0004-0003
Scenario: --fail-on error でエラー時のみ失敗
  Given バリデーションで warning のみ検出される
  When `qfai validate --fail-on error` を実行する
  Then 終了コード 0 で終了する
```

```gherkin
# AC-0004-0004
Scenario: --fail-on warning で警告時に失敗
  Given バリデーションで warning が検出される
  When `qfai validate --fail-on warning` を実行する
  Then 終了コード 1 で終了する
```

```gherkin
# AC-0004-0005
Scenario: --format github でアノテーション出力
  Given バリデーションで Issue が検出される
  When `qfai validate --format github` を実行する
  Then ::error または ::warning 形式で重複排除された Issue が出力される（最大100件）
```

```gherkin
# AC-0004-0006
Scenario: validate.json 出力
  Given バリデーションが完了する
  When `qfai validate` を実行する
  Then validate.json に issues, counts, traceability が出力される
```

```gherkin
# AC-0004-0007
Scenario: ランログ生成
  Given バリデーションが完了する
  When `qfai validate` を実行する
  Then .qfai/report/run-*/ ディレクトリにログが保存される
```

```gherkin
# AC-0004-0008
Scenario: ウェイバーによる suppress
  Given waivers.yml に特定の Issue コードの suppress ルールがある
  When `qfai validate` を実行する
  Then 該当 Issue は suppressed=true としてマークされる
```

```gherkin
# AC-0004-0009
Scenario: スペック必須ファイル欠落検出
  Given spec-0001/01_Spec.md が欠落している
  When `qfai validate` を実行する
  Then E_SPEC_MISSING_FILESET エラーが報告される
```

```gherkin
# AC-0004-0010
Scenario: ID フォーマット不正検出
  Given スペック内に不正な ID 形式がある
  When `qfai validate` を実行する
  Then E_ID_FORMAT エラーが報告される
```

```gherkin
# AC-0004-0011
Scenario: トレーサビリティエッジ欠落検出
  Given AC を参照する TC が存在しない
  When `qfai validate` を実行する
  Then QFAI-COV-201 エラーが報告される
```

```gherkin
# AC-0004-0012
Scenario: ATDD アノテーション検証成功
  Given テストファイルに正しい QFAI アノテーションがある
  When `qfai validate --phase atdd` を実行する
  Then アノテーション検証が成功する
```

```gherkin
# AC-0004-0013
Scenario: blocking OQ 検出
  Given ディスカッションパックに status=open の OQ がある
  When `qfai validate` を実行する
  Then QFAI-DPACK-004 エラーが報告される
```

```gherkin
# AC-0004-0014
Scenario: 冪等性確認
  Given 同一スペック構造が存在する
  When `qfai validate` を2回連続で実行する
  Then 両方の validate.json の内容が同一である（タイムスタンプ除く）
```

```gherkin
# AC-0004-0015
Scenario: phase guard で refinement ブロック
  Given CI 環境で `--phase refinement` が指定される
  When `qfai validate --phase refinement` を実行する
  Then refinement issue が生成され、終了コード 1 で終了する
```

```gherkin
# AC-0004-0016
Scenario: runAllUixValidators() が canonical aggregator として動作する
  Given UIX バリデータが登録されている
  When `runAllUixValidators(root, config)` を実行する
  Then レガシー互換パスを経由せず canonical aggregator として全 UIX Issue を集約して返す
```

```gherkin
# AC-0004-0017
Scenario: バリデータが新 3-layer テンプレートファイル名を期待する
  Given UI-bearing なディスカッションパックが存在する
  When UIX バリデータを実行する
  Then 11_design_taste_interview.md, 20_design_eval_invariant.md, 21_design_eval_trend_derived.md, 22_design_eval_product_specific.md, 23_design_eval_aggregate.md, 24_design_eval_dynamic_overrides.md を検証対象とする
```

```gherkin
# AC-0004-0018
Scenario: 旧 4-axis ファイルが存在する場合にエラー
  Given uiux/ に旧 4-axis ファイル（20_eval_axis_usability 等）が存在する
  When UIX バリデータを実行する
  Then validation error が報告され、新 3-layer ファイルへの移行が促される
```

```gherkin
# AC-0004-0019
Scenario: Non-UI パックで UIX バリデータをスキップ
  Given UI コントラクトを含まないスペックが存在する
  When `qfai validate` を実行する
  Then UIX バリデータはスキップされ、エラーも警告も生成しない
```

```gherkin
# AC-0004-0020
Scenario: render-evidence が truthful state を返す
  Given render-evidence 対象のスペックが存在する
  When render-evidence バリデータを実行する
  Then captured | skipped | failed のいずれかの truthful な状態が返され、プレースホルダーは使用されない
```

```gherkin
# AC-0004-0021
Scenario: Browser QA minimal runner が truthful に報告する
  Given Browser QA テスト対象が存在する
  When Browser QA バリデータを実行する
  Then minimal runner が実際の実行状態を報告し、未実行テストを pass として偽らない
```

```gherkin
# AC-0004-0022
Scenario: Canonical-only production path
  Given validate pipeline is running
  When validators are registered
  Then runCanonicalUixValidators is registered (not runAllUixValidators)
  And validateDdpFields is NOT registered
```

```gherkin
# AC-0004-0023
Scenario: IssueCategory on canonical issues
  Given a canonical validator emits an issue
  When the issue is collected
  Then issue.category === "canonical"
```

```gherkin
# AC-0004-0024
Scenario: prototypingRecommendation validation
  Given a discussion-pack with invalid prototyping.yaml
  When `qfai validate` runs
  Then QFAI-PROT-153/154/155/156 issues are emitted
```

## AC Catalog (optional)

| AC_ID        | Title                              | Notes        | Priority |
| ------------ | ---------------------------------- | ------------ | -------- |
| AC-0004-0001 | 全バリデータ実行                   | REQ-0010     | P1       |
| AC-0004-0002 | --phase スコープ制御               | REQ-0011     | P1       |
| AC-0004-0003 | --fail-on error                    | REQ-0012     | P1       |
| AC-0004-0004 | --fail-on warning                  | REQ-0012     | P1       |
| AC-0004-0005 | --format github                    | REQ-0013     | P1       |
| AC-0004-0006 | validate.json 出力                 | REQ-0014     | P1       |
| AC-0004-0007 | ランログ生成                       | REQ-0015     | P2       |
| AC-0004-0008 | ウェイバー suppress                | REQ-0110     | P1       |
| AC-0004-0009 | 必須ファイル欠落                   | REQ-0100     | P1       |
| AC-0004-0010 | ID フォーマット不正                | REQ-0101     | P1       |
| AC-0004-0011 | トレーサビリティ欠落               | REQ-0102     | P1       |
| AC-0004-0012 | ATDD アノテーション                | REQ-0103     | P1       |
| AC-0004-0013 | blocking OQ 検出                   | REQ-0104     | P1       |
| AC-0004-0014 | 冪等性確認                         | NFR-0012     | P1       |
| AC-0004-0015 | phase guard                        | phase policy | P1       |
| AC-0004-0016 | Canonical UIX aggregator           | REQ-0011     | P1       |
| AC-0004-0017 | 3-layer テンプレートファイル名期待 | REQ-0012     | P1       |
| AC-0004-0018 | 旧 4-axis ファイルエラー           | REQ-0012     | P1       |
| AC-0004-0019 | Non-UI パック UIX スキップ         | REQ-0012     | P2       |
| AC-0004-0020 | render-evidence truthful state     | REQ-0013     | P1       |
| AC-0004-0021 | Browser QA truthful runner         | REQ-0014     | P1       |
| AC-0004-0022 | Canonical-only production path     | REQ-0113,0116 | P1      |
| AC-0004-0023 | IssueCategory on canonical issues  | REQ-0114     | P1       |
| AC-0004-0024 | prototypingRecommendation validation | REQ-0115   | P1       |
