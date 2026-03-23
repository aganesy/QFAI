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

## AC Catalog (optional)

| ID      | Title                                           | Notes                                  | Priority |
| ------- | ----------------------------------------------- | -------------------------------------- | -------- |
| AC-0019-0001 | DDP 5 必須フィールドの完全性チェック            | NFR-0001 対応                          | P1       |
| AC-0019-0002 | ビジュアルテーゼ 1 文形式チェック               | 雰囲気・素材感・温度・エネルギー含む   | P1       |
| AC-0019-0003 | テーマフィールド 6 項目完全性チェック            | REQ-0002 対応                          | P1       |
| AC-0019-0004 | CTA 階層 3 段階構造チェック                     | REQ-0003 対応                          | P1       |
| AC-0019-0005 | DDP 必須フィールド欠落時のエラー出力            | ネガティブパス                         | P1       |
| AC-0019-0006 | UI-bearing artifact の DDP 存在チェック         | REQ-0001 対応                          | P1       |
| AC-0019-0007 | コンテンツプラン構造チェック                    | セクション役割と順序                   | P1       |
| AC-0019-0008 | インタラクションテーゼ構造チェック              | 2-3 モーション原則                     | P2       |
| AC-0019-0009 | アンチゴール禁止パターン 1 件以上チェック       | REQ-0006, DR-0032 対応                 | P1       |
| AC-0019-0010 | アンチゴール空時の警告出力                      | ネガティブパス                         | P1       |
| AC-0019-0011 | 禁止パターンリストのリスト追加拡張性            | コア変更 0 行                          | P2       |
| AC-0019-0012 | DDP テンプレートの外部ツール非依存              | REQ-0010, NFR-0006 対応                | P1       |
| AC-0019-0013 | 3 ターゲットでの DDP 作成・検証可能性           | エージェント可搬性                     | P1       |
