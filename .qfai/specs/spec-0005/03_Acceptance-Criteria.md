# 03 Acceptance Criteria

## AC Gherkin (required)

```gherkin
# AC-0005-0001
Scenario: Markdown レポート生成
  Given validate.json が存在する
  When `qfai report --format md` を実行する
  Then paths.outDir 配下に report.md が生成される
  And エグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスが含まれる
```

```gherkin
# AC-0005-0002
Scenario: JSON レポート生成
  Given validate.json が存在する
  When `qfai report --format json` を実行する
  Then paths.outDir 配下に report.json が生成される
  And 構造化レポートデータが含まれる
```

```gherkin
# AC-0005-0003
Scenario: --base-url でリポジトリリンク付与
  Given validate.json が存在する
  When `qfai report --format md --base-url https://github.com/org/repo` を実行する
  Then レポート内のファイルパスにリポジトリ URL リンクが付与される
```

```gherkin
# AC-0005-0004
Scenario: --run-validate で内部バリデーション実行
  Given スペック構造が存在する（validate.json は不要）
  When `qfai report --run-validate` を実行する
  Then バリデーションが内部実行され、その結果でレポートが生成される
  And validate.json も更新される
```

```gherkin
# AC-0005-0005
Scenario: validate.json 不在時のエラー
  Given validate.json が存在しない
  When `qfai report` を実行する
  Then "入力ファイルが見つかりません" エラーメッセージが表示される
  And exit code 2 で終了する
```

```gherkin
# AC-0005-0006
Scenario: --out で出力先制御
  Given validate.json が存在する
  When `qfai report --out /tmp/custom-report.md` を実行する
  Then /tmp/custom-report.md にレポートが出力される
```

```gherkin
# AC-0005-0007
Scenario: spec-pack レポート生成
  Given validate.json が存在する
  When `qfai report` を実行する
  Then report.md に加えて spec 単位のレポートも出力される
```

```gherkin
# AC-0005-0008
Scenario: --run-validate + --phase refinement の phase guard
  Given CI 環境でスペック構造が存在する
  When `qfai report --run-validate --phase refinement` を実行する
  Then phase guard エラーが表示される
  And exit code 1 で終了する
```

```gherkin
# AC-0005-0009
Scenario: Prototyping セクション出力
  Given prototyping evidence が存在する
  When `qfai report --format md` を実行する
  Then report.md に ## Prototyping セクションが含まれる
  And mode, obligations, evidence coverage, render, browserQa, calibration サブセクションが含まれる
```

```gherkin
# AC-0005-0010
Scenario: Prototyping セクション — evidence なし
  Given prototyping evidence が存在しない
  When `qfai report --format md` を実行する
  Then report.md に ## Prototyping セクションが含まれる
  And recommendationArtifact status が "missing" または "no-pack" と表示される
```

## AC Catalog (optional)

| AC-ID        | Title                     | Notes    | Priority |
| ------------ | ------------------------- | -------- | -------- |
| AC-0005-0001 | Markdown レポート         | REQ-0020 | P1       |
| AC-0005-0002 | JSON レポート             | REQ-0021 | P1       |
| AC-0005-0003 | --base-url リンク         | REQ-0022 | P2       |
| AC-0005-0004 | --run-validate            | REQ-0023 | P1       |
| AC-0005-0005 | validate.json 不在エラー  | REQ-0024 | P1       |
| AC-0005-0006 | --out 出力先              | REQ-0025 | P2       |
| AC-0005-0007 | spec-pack レポート        | REQ-0026 | P2       |
| AC-0005-0008 | phase guard               | REQ-0027 | P1       |
| AC-0005-0009 | Prototyping セクション    | REQ-0028 | P2       |
| AC-0005-0010 | Prototyping evidence なし | REQ-0028 | P2       |
