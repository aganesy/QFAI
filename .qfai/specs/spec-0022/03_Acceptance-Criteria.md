# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0022-0001
Scenario: スコアカードが 4 次元で構成されている
  Given フィデリティスコアカードテンプレートが存在する
  When スコアカードの構成を確認する
  Then 階層（hierarchy）次元が定義されている
  And 明確性（clarity）次元が定義されている
  And アクセシビリティ（accessibility）次元が定義されている
  And レスポンシブ（responsiveness）次元が定義されている
```

```gherkin
# AC-0022-0002
Scenario: 各次元にスコアと prose コメントが記録される
  Given レンダリング済み UI のレビューを実施する
  When スコアカードを記入する
  Then 各次元に数値スコア（0-100）が記録されている
  And 各次元に prose コメント（根拠説明）が記録されている
```

```gherkin
# AC-0022-0003
Scenario: PASS/FAIL 閾値が適用される
  Given スコアカードの 4 次元にスコアが記入されている
  When PASS/FAIL 判定を行う
  Then 各次元のスコアが閾値（70）以上であれば PASS と判定される
  And いずれかの次元が閾値未満であれば FAIL と判定される
  And 総合スコアが閾値（70）以上であれば総合 PASS と判定される
```

```gherkin
# AC-0022-0004
Scenario: スコアカード基準でプロトタイプの改善点が特定される
  Given FAIL 判定のスコアカードが存在する
  When 改善点を確認する
  Then FAIL となった次元ごとに具体的な改善指示が記載されている
  And 改善指示は客観的な基準に基づいている
```

```gherkin
# AC-0022-0005
Scenario: レビューゲートで FAIL 時に具体的代替案が返される
  Given スコアカード評価で FAIL が発生した
  When レビューゲートの判定結果を確認する
  Then FAIL の根拠が prose で記載されている
  And 具体的な代替案が最低 1 つ提示されている
  And 代替案はスコアカードの評価基準に紐づいている
```

```gherkin
# AC-0022-0006
Scenario: 破壊的変更がデルタに記録されている
  Given v1.6.5 で破壊的変更が発生した
  When デルタログを確認する
  Then 破壊的変更の内容が delta に記録されている
  And マイグレーションノート（影響範囲と移行手順）が記録されている
```

```gherkin
# AC-0022-0007
Scenario: 同一 artifact に同一 rubric を適用すると同一結果が得られる
  Given スコアカード rubric が定義されている
  When 同一 artifact に対して 2 回評価を実施する
  Then 2 回の評価結果が一致する
```

## AC Catalog (optional)

| AC_ID        | Title                              | Notes    | Priority |
| ------------ | ---------------------------------- | -------- | -------- |
| AC-0022-0001 | 4 次元スコアカード構成             | REQ-0009 | P1       |
| AC-0022-0002 | スコア + prose 記録                | REQ-0009 | P1       |
| AC-0022-0003 | PASS/FAIL 閾値判定                 | REQ-0009 | P1       |
| AC-0022-0004 | FAIL 時の改善指示                  | REQ-0009 | P1       |
| AC-0022-0005 | レビューゲート FAIL 時の代替案     | REQ-0012 | P1       |
| AC-0022-0006 | 破壊的変更デルタ記録               | REQ-0011 | P1       |
| AC-0022-0007 | レビュー再現性                     | NFR-0007 | P2       |
