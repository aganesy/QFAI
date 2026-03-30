# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0002-0001
Scenario: 全バリデータ実行で Issue 集約
  Given 正常なスペック構造が存在する
  When `qfai validate` を実行する
  Then 全バリデータ（33+）が順次実行される
  And 検出された Issue が集約されて出力される
```

```gherkin
# AC-0002-0002
Scenario: バリデーション成功時の終了コード
  Given 全スペックが完備している（issues=0）
  When `qfai validate` を実行する
  Then 終了コード 0 で終了する
```

```gherkin
# AC-0002-0003
Scenario: --phase でスコープ制御
  Given スペック構造とテストファイルが存在する
  When `qfai validate --phase atdd` を実行する
  Then ATDD フェーズに該当するバリデータのみ実行される
  And 他フェーズのバリデータはスキップされる
```

```gherkin
# AC-0002-0004
Scenario: --phase full でデフォルト全実行
  Given スペック構造が存在する
  When `qfai validate --phase full` を実行する
  Then 全バリデータが実行される
```

```gherkin
# AC-0002-0005
Scenario: --fail-on error でエラー時のみ失敗
  Given バリデーションで warning のみ検出される
  When `qfai validate --fail-on error` を実行する
  Then 終了コード 0 で終了する
```

```gherkin
# AC-0002-0006
Scenario: --fail-on warning で警告時に失敗
  Given バリデーションで warning が検出される
  When `qfai validate --fail-on warning` を実行する
  Then 終了コード 1 で終了する
```

```gherkin
# AC-0002-0007
Scenario: --fail-on never で常に成功
  Given バリデーションで error が検出される
  When `qfai validate --fail-on never` を実行する
  Then 終了コード 0 で終了する
```

```gherkin
# AC-0002-0008
Scenario: --format github でアノテーション出力
  Given バリデーションで Issue が検出される
  When `qfai validate --format github` を実行する
  Then ::error または ::warning 形式で Issue が出力される
```

```gherkin
# AC-0002-0009
Scenario: --format github で100件超の切り詰め
  Given バリデーションで 120件の Issue が検出される
  When `qfai validate --format github` を実行する
  Then 100件のアノテーションが出力される
  And "20 more issues truncated" メッセージが表示される
```

```gherkin
# AC-0002-0010
Scenario: validate.json 出力
  Given バリデーションが完了する
  When `qfai validate` を実行する
  Then validate.json に issues, summary, metadata が出力される
```

```gherkin
# AC-0002-0011
Scenario: ランログ生成
  Given バリデーションが完了する
  When `qfai validate` を実行する
  Then .qfai/report/run-YYYYMMDDTHHMMSS/ ディレクトリにログが保存される
```

```gherkin
# AC-0002-0012
Scenario: ウェイバーによる suppress
  Given waivers.yml に特定の Issue コードの suppress ルールがある
  When `qfai validate` を実行する
  Then 該当 Issue は suppressed=true としてマークされる
  And デフォルト出力には表示されない
```

```gherkin
# AC-0002-0013
Scenario: ウェイバーによる downgrade
  Given waivers.yml に特定の Issue コードの downgrade ルールがある
  When `qfai validate` を実行する
  Then 該当 Issue の severity が warning から info に低下する
```

```gherkin
# AC-0002-0014
Scenario: スペック必須ファイル欠落検出
  Given spec-0001/01_Spec.md が欠落している
  When `qfai validate` を実行する
  Then E_SPEC_MISSING_FILESET エラーが報告される
```

```gherkin
# AC-0002-0015
Scenario: スペック必須ファイル完備
  Given spec-0001/ に 01_Spec ~ 08_Open-questions が全て存在する
  When `qfai validate` を実行する
  Then 必須ファイル検証でエラーが発生しない
```

```gherkin
# AC-0002-0016
Scenario: ID フォーマット不正検出
  Given スペック内に不正な ID 形式がある
  When `qfai validate` を実行する
  Then E_ID_FORMAT エラーが報告される
```

```gherkin
# AC-0002-0017
Scenario: ID 重複検出
  Given 同一スペック内に AC-0002-0001 が 2箇所定義されている
  When `qfai validate` を実行する
  Then E_ID_DUPLICATE エラーが報告される
```

```gherkin
# AC-0002-0018
Scenario: トレーサビリティエッジ欠落検出
  Given AC-0002-0003 を参照する TC が存在しない
  When `qfai validate` を実行する
  Then W_TRACE_MISSING_EDGE 警告が報告される
```

```gherkin
# AC-0002-0019
Scenario: トレーサビリティ完備
  Given 全 AC に対応する TC、全 BR に対応する EX、全 EX に対応する TC が存在する
  When `qfai validate` を実行する
  Then トレーサビリティ検証でエラー・警告が発生しない
```

```gherkin
# AC-0002-0020
Scenario: ATDD アノテーション検証成功
  Given テストファイルに `QFAI:SPEC-0001:US-0002-0001` アノテーションがある
  When `qfai validate --phase atdd` を実行する
  Then アノテーション検証が成功する
```

```gherkin
# AC-0002-0021
Scenario: testsDir 不在時の ATDD スキップ
  Given testsDir に指定されたディレクトリが存在しない
  When `qfai validate` を実行する
  Then ATDD アノテーション検証がスキップされる
```

```gherkin
# AC-0002-0022
Scenario: ディスカッションパック必須ファイル欠落
  Given ディスカッションパックの 03_Story-Workshop.md が欠落している
  When `qfai validate` を実行する
  Then E_DPACK_MISSING_FILE エラーが報告される
```

```gherkin
# AC-0002-0023
Scenario: blocking OQ 検出
  Given ディスカッションパックの 08_Open-questions.md に status=open の OQ がある
  When `qfai validate` を実行する
  Then E_DPACK_BLOCKING_OQ エラーが報告される
```

```gherkin
# AC-0002-0024
Scenario: コントラクト ID 形式チェック
  Given API コントラクトに不正な ID 形式がある
  When `qfai validate` を実行する
  Then E_CONTRACT_ID_FORMAT エラーが報告される
```

```gherkin
# AC-0002-0025
Scenario: コントラクト参照整合性
  Given スペック内のコントラクト参照先が存在しない
  When `qfai validate` を実行する
  Then W_CONTRACT_REF_MISSING 警告が報告される
```

```gherkin
# AC-0002-0026
Scenario: Mermaid フェンスブロック形式チェック
  Given spec 内に不正な mermaid フェンスブロックがある
  When `qfai validate` を実行する
  Then E_MERMAID_FORMAT エラーが報告される
```

```gherkin
# AC-0002-0027
Scenario: _policies/04_Business-Flow.md の Mermaid 必須チェック
  Given _policies/04_Business-Flow.md に mermaid ブロックが存在しない
  When `qfai validate` を実行する
  Then E_MERMAID_MISSING エラーが報告される
```

```gherkin
# AC-0002-0028
Scenario: 冪等性 - 2回連続実行で同一結果
  Given 同一のスペック構造が存在する
  When `qfai validate` を2回連続で実行する
  Then 両方の validate.json の内容が同一である（タイムスタンプ除く）
```

```gherkin
# AC-0002-0029
Scenario: validateProject() が canonical entrypoint を呼び出す
  Given runCanonicalUixValidators() が登録されている
  When validateProject() を実行する
  Then UIX バリデータは runCanonicalUixValidators() 経由で実行される
  And runAllUixValidators() は直接呼び出されない
```

```gherkin
# AC-0002-0030
Scenario: runAllUixValidators() が deprecation warning を発行する
  Given runAllUixValidators() が呼び出される
  When 旧アグリゲータが実行される
  Then deprecation warning が出力される
  And 内部的に runCanonicalUixValidators() へ委譲される
  And バリデーション結果は canonical entrypoint と同一である
```

## AC Catalog (optional)

| AC_ID        | Title                      | Notes              | Priority |
| ------------ | -------------------------- | ------------------ | -------- |
| AC-0002-0001 | 全バリデータ実行           | REQ-0010           | P1       |
| AC-0002-0002 | 成功時終了コード           | REQ-0012, NFR-0061 | P1       |
| AC-0002-0003 | --phase atdd スコープ制御  | REQ-0011           | P1       |
| AC-0002-0004 | --phase full 全実行        | REQ-0011           | P1       |
| AC-0002-0005 | --fail-on error            | REQ-0012           | P1       |
| AC-0002-0006 | --fail-on warning          | REQ-0012           | P1       |
| AC-0002-0007 | --fail-on never            | REQ-0012           | P1       |
| AC-0002-0008 | --format github 出力       | REQ-0013           | P1       |
| AC-0002-0009 | --format github 100件超    | REQ-0013           | P2       |
| AC-0002-0010 | validate.json 出力         | REQ-0014           | P1       |
| AC-0002-0011 | ランログ生成               | REQ-0015           | P2       |
| AC-0002-0012 | ウェイバー suppress        | REQ-0110, NFR-0011 | P1       |
| AC-0002-0013 | ウェイバー downgrade       | REQ-0110           | P1       |
| AC-0002-0014 | 必須ファイル欠落           | REQ-0100           | P1       |
| AC-0002-0015 | 必須ファイル完備           | REQ-0100           | P1       |
| AC-0002-0016 | ID フォーマット不正        | REQ-0101           | P1       |
| AC-0002-0017 | ID 重複                    | REQ-0101           | P1       |
| AC-0002-0018 | トレーサビリティ欠落       | REQ-0102           | P1       |
| AC-0002-0019 | トレーサビリティ完備       | REQ-0102           | P1       |
| AC-0002-0020 | ATDD アノテーション成功    | REQ-0103           | P1       |
| AC-0002-0021 | testsDir 不在スキップ      | REQ-0103           | P2       |
| AC-0002-0022 | ディスカッションパック欠落 | REQ-0104           | P1       |
| AC-0002-0023 | blocking OQ 検出           | REQ-0104           | P1       |
| AC-0002-0024 | コントラクト ID 形式       | REQ-0105           | P1       |
| AC-0002-0025 | コントラクト参照整合性     | REQ-0105           | P1       |
| AC-0002-0026 | Mermaid 形式チェック       | REQ-0108           | P1       |
| AC-0002-0027 | Business-Flow Mermaid 必須 | REQ-0112           | P1       |
| AC-0002-0028 | 冪等性確認                 | NFR-0012           | P1       |
| AC-0002-0029 | canonical entrypoint 呼出  | REQ-0010, REQ-0011 | P1       |
| AC-0002-0030 | 旧アグリゲータ deprecation | REQ-0012, DR-0101  | P1       |
