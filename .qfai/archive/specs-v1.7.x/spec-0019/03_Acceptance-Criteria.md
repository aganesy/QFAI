# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

---

### US-0019-0001: DDP フィールドの必須定義

```gherkin
# AC-0019-0001
Scenario: DDP 5 必須フィールドが全て定義されている
  Given discussion-pack または spec-pack に DDP セクションが存在する
  And ビジュアルテーゼ、コンテンツプラン、インタラクションテーゼ、アンチゴール、CTA 階層の 5 フィールドが全て非空で定義されている
  When qfai validate を実行する
  Then DDP 必須フィールドチェックが PASS すること
  And 各フィールドが空でないことが確認されること
```

```gherkin
# AC-0019-0002
Scenario: ビジュアルテーゼが 1 文形式で定義されている
  Given DDP のビジュアルテーゼフィールドが存在する
  And ビジュアルテーゼが雰囲気・素材感・温度・エネルギーを含む 1 文で記述されている
  When qfai validate を実行する
  Then ビジュアルテーゼ形式チェックが PASS すること
  And 複数文や箇条書きのみの場合は警告が出力されること
```

```gherkin
# AC-0019-0003
Scenario: テーマフィールド 6 項目が全て定義されている
  Given DDP にテーマフィールドセクションが存在する
  And theme, mood, taste, material, energy, visual anchor の 6 項目が全て非空で定義されている
  When qfai validate を実行する
  Then テーマフィールド完全性チェックが PASS すること
```

```gherkin
# AC-0019-0004
Scenario: CTA 階層が primary / secondary / tertiary で定義されている
  Given DDP に CTA 階層セクションが存在する
  And primary CTA が 1 件以上定義されている
  And secondary CTA と tertiary CTA がそれぞれ定義されている
  When qfai validate を実行する
  Then CTA 階層構造チェックが PASS すること
  And primary CTA の優先順位が最高であることが確認されること
```

```gherkin
# AC-0019-0005
Scenario: DDP 必須フィールドが欠落している場合にエラーが出力される
  Given discussion-pack に DDP セクションが存在する
  And ビジュアルテーゼフィールドが空である
  When qfai validate を実行する
  Then エラー "DDP required field missing: visual_thesis" が出力されること
  And バリデーション結果が FAIL となること
```

---

### US-0019-0002: DDP 必須フィールドの自動検証

```gherkin
# AC-0019-0006
Scenario: UI-bearing artifact に DDP が存在しない場合にエラーが出力される
  Given UI-bearing artifact（UI 変更を含む discussion-pack）が存在する
  And DDP セクションが定義されていない
  When qfai validate を実行する
  Then エラー "Design Direction Pack is required for UI-bearing artifacts" が出力されること
  And バリデーション結果が FAIL となること
```

```gherkin
# AC-0019-0007
Scenario: コンテンツプランにセクション役割と順序が定義されている
  Given DDP のコンテンツプランフィールドが存在する
  And セクション名と各セクションの役割（hero, support, detail, CTA 等）が定義されている
  When qfai validate を実行する
  Then コンテンツプラン構造チェックが PASS すること
  And セクション順序が明示されていることが確認されること
```

```gherkin
# AC-0019-0008
Scenario: インタラクションテーゼが 2-3 のモーション原則を含む
  Given DDP のインタラクションテーゼフィールドが存在する
  And 2 件以上 3 件以下のモーション原則が記述されている
  When qfai validate を実行する
  Then インタラクションテーゼ構造チェックが PASS すること
```

---

### US-0019-0003: 禁止ジェネリックパターンの明示化

```gherkin
# AC-0019-0009
Scenario: アンチゴールに禁止ジェネリックパターンが 1 件以上明示されている
  Given DDP のアンチゴールフィールドが存在する
  And アンチゴールに禁止ジェネリックパターン（量産型カードグリッド、弱いヒーロー、無意味なグラデーション、過剰アクセント等）が 1 件以上記述されている
  When qfai validate を実行する
  Then アンチゴール禁止パターンチェックが PASS すること
```

```gherkin
# AC-0019-0010
Scenario: アンチゴールが空または禁止パターンを含まない場合に警告が出力される
  Given DDP のアンチゴールフィールドが空である
  When qfai validate を実行する
  Then 警告 "DDP anti-goals should contain at least one banned generic pattern" が出力されること
```

```gherkin
# AC-0019-0011
Scenario: 禁止パターンリストの拡張がリスト追加のみで可能
  Given 禁止パターンリストに新規パターン "decorative-charts-without-job" を追加する
  When qfai validate を実行する
  Then 新規パターンがバリデーションルールとして認識されること
  And バリデーションエンジンのコア変更が 0 行であること
```

---

### US-0019-0004: DDP のツール非依存設計

```gherkin
# AC-0019-0012
Scenario: DDP テンプレートが外部デザインツールへの依存を持たない
  Given DDP テンプレートファイルが存在する
  When テンプレートの内容を検査する
  Then Figma / Sketch / Adobe XD 等の外部ツールへのハード依存（必須参照）が 0 件であること
  And テンプレートがプレーンテキスト / Markdown / YAML のみで構成されていること
```

```gherkin
# AC-0019-0013
Scenario: 3 つの AI エージェントターゲットで DDP の作成・検証が可能
  Given DDP テンプレートとバリデーションルールが定義されている
  When Claude Code / Codex / GitHub Copilot の各環境で DDP を作成する
  Then 各環境で DDP テンプレートが読み取り可能であること
  And 各環境で DDP バリデーションが実行可能であること
  And ツール固有の API 呼び出しが 0 件であること
```

---

---

### US-0019-0005: Research-to-Constraint 変換

```gherkin
# AC-0019-0014
Scenario: research_summary の BP が contracts/design/*.yaml ルールに変換される
  Given discussion-pack の research_summary セクションに BP エントリーが 1 件以上存在する
  And 変換プロセスが実行される
  When contracts/design/*.yaml ファイルを確認する
  Then research_summary の各 BP に対応するバリデーションルールが存在すること
  And qfai validate が変換後のルールを認識して実行できること
```

```gherkin
# AC-0019-0015
Scenario: research_summary が空の場合に変換がスキップされ警告が出力される
  Given discussion-pack の research_summary セクションが空または存在しない
  And requireResearchSummary=true が qfai.config.yaml に設定されている
  When qfai validate を実行する
  Then 警告 "research_summary is empty; no constraints converted" が出力されること
  And バリデーション結果が FAIL となること
```

---

### US-0019-0006: ハイフィデリティ Story Workshop テンプレート

```gherkin
# AC-0019-0016
Scenario: リスト画面テンプレートが全必須フィールドを含む
  Given Story Workshop にリスト画面テンプレートが定義されている
  And page_objective, primary_cta, search_filter_sort, states（empty/loading/data/error）, desktop_layout, mobile_layout, row_click_behavior, density_rationale が全て非空で定義されている
  When qfai validate を実行する
  Then リスト画面テンプレート完全性チェックが PASS すること
```

```gherkin
# AC-0019-0017
Scenario: フォーム画面テンプレートが全必須フィールドを含む
  Given Story Workshop にフォーム画面テンプレートが定義されている
  And primary_task, input_grouping, validation_timing, required_optional_destructive, states（empty/loading/data/error）, post_submit_destination が全て非空で定義されている
  When qfai validate を実行する
  Then フォーム画面テンプレート完全性チェックが PASS すること
```

---

### US-0019-0007: アンチパターン自動検出バリデーター

```gherkin
# AC-0019-0018
Scenario: dual primary CTA が検出されエラーが出力される
  Given spec-pack または discussion-pack に同一画面で primary CTA が 2 件以上定義されている
  When qfai validate を実行する
  Then エラー "Anti-pattern detected: dual primary CTA on screen [screen_name]" が出力されること
  And バリデーション結果が FAIL となること
```

```gherkin
# AC-0019-0019
Scenario: 7 種のアンチパターンが全て検出対象として機能する
  Given バリデーターが以下のルールセットを持つ: dual-primary-cta, excess-required-fields, empty-state-without-action, error-without-recovery, 4-plus-click-primary-flow, placeholder-lorem-ipsum, button-variant-proliferation
  When 各アンチパターンを含むサンプルファイルに対して qfai validate を実行する
  Then 各アンチパターンに対してエラーまたは警告が出力されること
  And 検出件数が 7 件であること
```

---

### US-0019-0008: Config uiux ポリシー宣言

```gherkin
# AC-0019-0020
Scenario: qfai.config.yaml の uiux セクションがバリデーターに反映される
  Given qfai.config.yaml に uiux.qualityProfile=strict が定義されている
  When qfai validate を実行する
  Then バリデーターが strict プロファイルのルールセットを適用すること
  And standard プロファイルでは警告にとどまるルールが FAIL として扱われること
```

```gherkin
# AC-0019-0021
Scenario: uiux セクションが未定義の場合にデフォルト値が使用される
  Given qfai.config.yaml に uiux セクションが存在しない
  When qfai validate を実行する
  Then バリデーターがデフォルト値（qualityProfile=standard, requireResearchSummary=false）を使用すること
  And エラーが出力されないこと
```

---

### US-0019-0009: 主要スクリーン複数オプション比較

```gherkin
# AC-0019-0022
Scenario: 主要スクリーンに 2 つ以上のオプションが比較形式で定義されている
  Given 主要スクリーンの discussion-pack または spec-pack に design_options セクションが存在する
  And design_options に 2 件以上のエントリーが存在する
  And 各エントリーに pros, cons, target_behavior, avoided_anti_patterns が定義されている
  When qfai validate を実行する
  Then 主要スクリーンオプション比較チェックが PASS すること
```

```gherkin
# AC-0019-0023
Scenario: 主要スクリーンにオプションが 1 件以下の場合にエラーが出力される
  Given 主要スクリーンの spec-pack に design_options セクションが 1 件しか存在しない
  When qfai validate を実行する
  Then エラー "Primary screen must have at least 2 design options for comparison" が出力されること
  And バリデーション結果が FAIL となること
```

---

### US-0019-0010: 競合参照 UI 必須化

```gherkin
# AC-0019-0024
Scenario: UI-bearing discussion-pack に 3 件以上の競合参照 UI が存在する
  Given UI-bearing discussion-pack に competitive_references セクションが存在する
  And 3 件以上のエントリーが存在し、各エントリーに source, adopt, reject, translation_policy が定義されている
  When qfai validate を実行する
  Then 競合参照 UI 完全性チェックが PASS すること
```

```gherkin
# AC-0019-0025
Scenario: competitive_references が 2 件以下の場合にエラーが出力される
  Given UI-bearing discussion-pack に competitive_references セクションが存在する
  And エントリーが 2 件以下である
  When qfai validate を実行する
  Then エラー "UI-bearing discussion-pack requires at least 3 competitive UI references (found N)" が出力されること
  And バリデーション結果が FAIL となること
```

---

## AC Catalog (optional)

| ID           | Title                                            | Notes                                | Priority |
| ------------ | ------------------------------------------------ | ------------------------------------ | -------- |
| AC-0019-0001 | DDP 5 必須フィールドの完全性チェック             | NFR-0001 対応                        | P1       |
| AC-0019-0002 | ビジュアルテーゼ 1 文形式チェック                | 雰囲気・素材感・温度・エネルギー含む | P1       |
| AC-0019-0003 | テーマフィールド 6 項目完全性チェック            | REQ-0002 対応                        | P1       |
| AC-0019-0004 | CTA 階層 3 段階構造チェック                      | REQ-0003 対応                        | P1       |
| AC-0019-0005 | DDP 必須フィールド欠落時のエラー出力             | ネガティブパス                       | P1       |
| AC-0019-0006 | UI-bearing artifact の DDP 存在チェック          | REQ-0001 対応                        | P1       |
| AC-0019-0007 | コンテンツプラン構造チェック                     | セクション役割と順序                 | P1       |
| AC-0019-0008 | インタラクションテーゼ構造チェック               | 2-3 モーション原則                   | P2       |
| AC-0019-0009 | アンチゴール禁止パターン 1 件以上チェック        | REQ-0006, DR-0032 対応               | P1       |
| AC-0019-0010 | アンチゴール空時の警告出力                       | ネガティブパス                       | P1       |
| AC-0019-0011 | 禁止パターンリストのリスト追加拡張性             | コア変更 0 行                        | P2       |
| AC-0019-0012 | DDP テンプレートの外部ツール非依存               | REQ-0010, NFR-0006 対応              | P1       |
| AC-0019-0013 | 3 ターゲットでの DDP 作成・検証可能性            | エージェント可搬性                   | P1       |
| AC-0019-0014 | research_summary BP の contracts 変換            | REQ-0013 対応                        | P1       |
| AC-0019-0015 | research_summary 空時の警告/FAIL 出力            | requireResearchSummary=true 時       | P1       |
| AC-0019-0016 | リスト画面テンプレート全必須フィールドチェック   | REQ-0014 対応                        | P1       |
| AC-0019-0017 | フォーム画面テンプレート全必須フィールドチェック | REQ-0014 対応                        | P1       |
| AC-0019-0018 | dual primary CTA 自動検出                        | REQ-0018 対応                        | P1       |
| AC-0019-0019 | 7 種アンチパターン全検出対象確認                 | REQ-0018 対応                        | P1       |
| AC-0019-0020 | uiux.qualityProfile のバリデーター反映           | REQ-0019 対応                        | P1       |
| AC-0019-0021 | uiux 未定義時のデフォルト値使用                  | REQ-0019 対応                        | P2       |
| AC-0019-0022 | 主要スクリーン 2 オプション以上チェック          | REQ-0020 対応                        | P1       |
| AC-0019-0023 | 主要スクリーンオプション不足時エラー             | ネガティブパス                       | P1       |
| AC-0019-0024 | competitive_references 3 件以上チェック          | REQ-0021 対応                        | P1       |
| AC-0019-0025 | competitive_references 不足時エラー              | ネガティブパス                       | P1       |
