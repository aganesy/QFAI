# 03 Acceptance Criteria

## Purpose

- 受入シナリオをこのファイルに集約する。
- Gherkin はここに記述し、Business Rules には記述しない。

---

## AC Gherkin (required)

```gherkin
# AC-0012-0001: devils-advocate が 11 番目のレビュアーとして can_be_na: false で登録される
Scenario: devils-advocate のロースター登録確認
  Given review-roster.yml に既存 10 レビュアーが登録されている
  When devils-advocate エントリを 11 番目に追加する
  Then review-roster.yml の 11 番目エントリの id が "devils-advocate" である
  And そのエントリの can_be_na が false である
  And scope に "discuss", "require", "sdd" が含まれる
  And 既存 10 エントリは変更されていない
```

```gherkin
# AC-0012-0002: pattern-doubler が 12 番目のレビュアーとして can_be_na: true で登録される
Scenario: pattern-doubler のロースター登録確認
  Given review-roster.yml に 11 エントリ（devils-advocate 含む）が登録されている
  When pattern-doubler エントリを 12 番目に追加する
  Then review-roster.yml の 12 番目エントリの id が "pattern-doubler" である
  And そのエントリの can_be_na が true である
  And scope に "discuss", "require", "sdd" が含まれる
  And 既存 11 エントリは変更されていない
```

```gherkin
# AC-0012-0003: devils-advocate の FAIL がロースター先頭からの再実行を引き起こす
Scenario: devils-advocate FAIL によるブロッキング動作
  Given 成果物ドラフトが完成し既存 10 レビュアーが全員 PASS している
  When devils-advocate が FAIL を返す
  Then スキルは次フェーズに進まない（ブロッキング）
  And 修正フローが起動されロースター先頭からの再実行が強制される
  And FAIL 理由と具体的代替案がレビュー結果に記載されている
```

```gherkin
# AC-0012-0004: pattern-doubler の FAIL がロースター先頭からの再実行を引き起こす
Scenario: pattern-doubler FAIL によるブロッキング動作
  Given 成果物ドラフトが完成し既存 11 レビュアー（devils-advocate 含む）が全員 PASS している
  When pattern-doubler が FAIL を返す
  Then スキルは次フェーズに進まない（ブロッキング）
  And 修正フローが起動されロースター先頭からの再実行が強制される
  And 不足パターンの具体的指摘がレビュー結果に記載されている
```

```gherkin
# AC-0012-0005: devils-advocate の 3 回連続 FAIL でアドバイザリーに降格される
Scenario: devils-advocate の連続 FAIL によるアドバイザリー降格
  Given 同一成果物に対して devils-advocate が 2 回連続 FAIL を返している
  When 3 回目のレビューでも devils-advocate が FAIL を返す
  Then devils-advocate はアドバイザリー（非ブロッキング）に降格される
  And スキルは FAIL を無視して次フェーズに進む
  And 降格記録が RCP アーティファクトに残される
```

```gherkin
# AC-0012-0006: devils-advocate の FAIL には具体的代替案が必須
Scenario: devils-advocate FAIL 時の代替案必須チェック
  Given devils-advocate がレビューを実行している
  When devils-advocate が代替案なしで FAIL を返そうとする
  Then その FAIL は無効として処理される
  And "代替案が提示されていないため FAIL は受理できません" のエラーが記録される
  And devils-advocate に再判定が要求される
```

```gherkin
# AC-0012-0007: agent-selection.md に両エージェントの役割定義が含まれる
Scenario: agent-selection.md の役割定義確認
  Given agent-selection.md が v1.5.6 対応版に更新されている
  When agent-selection.md の内容を確認する
  Then devils-advocate の役割・責務・委任ルールが記載されている
  And pattern-doubler の役割・責務・委任ルールが記載されている
  And 「いつ選択するか」のシナリオ行が両エージェントに存在する
```

```gherkin
# AC-0012-0008: 全 9 SKILL.md ファイルが両エージェントをレビューフェーズに参照している
Scenario: 全スキルの SKILL.md 統合確認
  Given 9 つの QFAI スキル（qfai-discussion, qfai-sdd, qfai-configure, qfai-prototyping, qfai-atdd, qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor, qfai-verify）がある
  When 各スキルの SKILL.md のレビューフェーズを確認する
  Then 9 ファイル全てに devils-advocate へのレビュー委任ステップが存在する
  And 9 ファイル全てに pattern-doubler へのレビュー委任ステップが存在する
  And 実行順序が「既存 10 → devils-advocate (11) → pattern-doubler (12)」である
```

```gherkin
# AC-0012-0009: RCP フッターが両エージェント分更新されている
Scenario: RCP フッターの更新確認
  Given 各スキルの rcp_footer.md が存在する
  When rcp_footer.md の内容を確認する
  Then devils-advocate の記載が追加されている
  And pattern-doubler の記載が追加されている
  And 既存 10 レビュアーの記載は変更されていない
```

```gherkin
# AC-0012-0010: パターンカウントの単位が ID 付き項目である
Scenario: パターンカウント単位の確認
  Given pattern-doubler がレビューを実行している
  When 成果物内のパターンをカウントする
  Then カウント対象は ID を持つ項目（US, AC, BR, EX, TC プレフィックスの連番項目）のみである
  And ID を持たない説明文・コメントはカウント対象外である
  And 倍増目標は「カウントされた ID 付き項目数 × 2」である
```

```gherkin
# AC-0012-0011: 既存 10 レビュアーの動作が変更されていない（後方互換）
Scenario: 既存レビュアーへの非影響確認
  Given review-roster.yml に 12 エントリが登録された状態
  When 既存 10 レビュアーのエントリを確認する
  Then 各エントリの id, name, scope, can_be_na, must_check が変更前と同一である
  And 既存 10 レビュアーの実行順序（1 番目〜10 番目）が変更されていない
```

```gherkin
# AC-0012-0012: レビューサイクル時間が現行の 2 倍以内に収まる
Scenario: レビューサイクル時間の性能確認
  Given 新 2 エージェント追加前の基準レビューサイクル時間が計測されている
  When 新 2 エージェントを含む 12 レビュアー全員がレビューを実行する
  Then 総レビューサイクル時間が基準値の 2 倍以内である
  And タイムアウトが発生していない
```

```gherkin
# AC-0012-0013: 全レビュアーが FAIL 判定時に代替案を提示する義務がある
Scenario: 全レビュアー共通の代替案提示義務確認
  Given review-roster.yml に feedback_policy が定義されている
  And agent-selection.md に Feedback quality rule セクションが存在する
  And 全 9 SKILL.md の Reviewer Gate に「全レビュアー共通: 代替案提示義務」が記載されている
  When 任意のレビュアー（既存 10 名を含む）が代替案なしで FAIL を返そうとする
  Then その FAIL は無効として処理される
  And 具体的な代替案・修正案の提示が要求される
  And review-roster.yml の feedback_policy.alternative_required が true である
```

---

## AC Catalog (optional)

| ID           | Title                                                       | Notes                   | Priority |
| ------------ | ----------------------------------------------------------- | ----------------------- | -------- |
| AC-0012-0001 | devils-advocate ロースター登録（11 番目・can_be_na: false） | US-0012-0001 対応       | P1       |
| AC-0012-0002 | pattern-doubler ロースター登録（12 番目・can_be_na: true）  | US-0012-0002 対応       | P1       |
| AC-0012-0003 | devils-advocate FAIL によるブロッキング・再実行             | US-0012-0003 対応       | P1       |
| AC-0012-0004 | pattern-doubler FAIL によるブロッキング・再実行             | US-0012-0004 対応       | P1       |
| AC-0012-0005 | devils-advocate 3 回連続 FAIL でアドバイザリー降格          | US-0012-0005 対応       | P1       |
| AC-0012-0006 | devils-advocate FAIL 時の代替案必須                         | POL-01 対応             | P1       |
| AC-0012-0007 | agent-selection.md に両エージェントの役割定義               | REQ-0002, REQ-0006 対応 | P1       |
| AC-0012-0008 | 全 9 SKILL.md が両エージェントをレビューフェーズに参照      | REQ-0009, REQ-0010 対応 | P1       |
| AC-0012-0009 | RCP フッター更新                                            | REQ-0011 対応           | P1       |
| AC-0012-0010 | パターンカウント単位が ID 付き項目                          | REQ-0007 対応           | P2       |
| AC-0012-0011 | 既存 10 レビュアー後方互換                                  | NFR-0003, POL-04 対応   | P1       |
| AC-0012-0012 | レビューサイクル時間が 2 倍以内                             | NFR-0001 対応           | P2       |
| AC-0012-0013 | 全レビュアー共通の代替案提示義務                            | REQ-0015, POL-08 対応   | P1       |
