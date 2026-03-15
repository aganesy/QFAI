# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

---

### US-0013-0001: Design Token によるビジュアル定義

```gherkin
# AC-0013-0001
Scenario: Design Token YAML スキーマが W3C DTCG 準拠で有効
  Given design-tokens.yaml に version, platform, primitive, semantic セクションが存在する
  When qfai validate を実行する
  Then DTCG スキーマバリデーションが PASS し、エラーが 0 件であること
  And primitive → semantic の参照チェーンがすべて解決されること
```

```gherkin
# AC-0013-0002
Scenario: 未定義 Token 参照の検出
  Given semantic.color.primary が "{primitive.color.purple.500}" を参照している
  And primitive.color.purple.500 が design-tokens.yaml に定義されていない
  When qfai validate を実行する
  Then エラー "Unresolved token reference: {primitive.color.purple.500}" が出力されること
  And 参照元の Token パス（semantic.color.primary）がエラーメッセージに含まれること
```

```gherkin
# AC-0013-0003
Scenario: Design Token プラットフォーム属性の検証
  Given design-tokens.yaml の platform フィールドに "web" が設定されている
  When qfai validate を実行する
  Then platform 属性が "web | windows | mobile-ios | mobile-android" の列挙値として有効であることを確認すること
  And platform に対応するプラットフォーム固有ルールが適用されること
```

---

### US-0013-0002: HTML+CSS Visual Mock による画面定義

```gherkin
# AC-0013-0004
Scenario: HTML Mock がブラウザで外部依存なしに表示される
  Given HTML+CSS Visual Mock ファイルが discussion-pack 内に存在する
  And Mock は外部 CSS / JS ファイルへのリンクを含まない
  When ブラウザまたは jsdom でファイルを直接開く
  Then Design Token のフォールバック値（CSS var() 第 2 引数）によって正常にレンダリングされること
  And ネットワークリクエストが 0 件であること
```

```gherkin
# AC-0013-0005
Scenario: HTML Mock が状態バリアントを定義している
  Given 画面に対して default / loading / empty / error の各状態バリアント HTML が存在する
  When qfai validate が状態バリアントチェックを実行する
  Then 各バリアントに data-state 属性または識別コメントが存在すること
  And 各バリアントが独立した HTML セクションとして分離されていること
```

```gherkin
# AC-0013-0006
Scenario: HTML Mock がレスポンシブバリアントを記述している
  Given HTML Mock にデスクトップ・タブレット・モバイルの 3 ブレークポイントのバリアントがある
  When qfai validate がレスポンシブバリアントチェックを実行する
  Then 各ブレークポイントに data-breakpoint 属性または識別コメントが存在すること
  And 各バリアントが最大幅などのレイアウト差異を CSS で表現していること
```

---

### US-0013-0003: Mermaid による画面遷移定義

```gherkin
# AC-0013-0007
Scenario: Mermaid stateDiagram-v2 による画面遷移図の有効性
  Given spec の Mermaid ブロックが ```mermaid フェンスで囲まれている
  And フェンス内に stateDiagram-v2 宣言が存在する
  When qfai validate が Mermaid 構文チェックを実行する
  Then Mermaid パーサーがエラーなく図をパースできること
  And 画面ノードと遷移エッジがすべて有効なシンボルであること
```

```gherkin
# AC-0013-0008
Scenario: Mermaid flowchart によるナビゲーション構造図の有効性
  Given spec の Mermaid ブロックに flowchart TD 宣言が存在する
  When qfai validate が Mermaid 構文チェックを実行する
  Then Mermaid パーサーがエラーなく図をパースできること
  And ナビゲーション要素（サイドナビ、タブ、ブレッドクラム等）がノードとして定義されていること
```

```gherkin
# AC-0013-0009
Scenario: 画面遷移に条件ラベルが付与されている
  Given stateDiagram-v2 内に認証が必要な画面遷移が存在する
  When qfai validate が遷移ラベルチェックを実行する
  Then 各遷移エッジに条件ラベル（認証状態、権限、バリデーション結果等）が付与されていること
  And 未ラベルの遷移エッジが警告として報告されること
```

---

### US-0013-0004: UI/UX ベストプラクティス・アンチパターン体系

```gherkin
# AC-0013-0010
Scenario: ベストプラクティス DB が正しい構造を持つ
  Given best-practices.yaml ファイルが共通層エントリを持つ
  When DB 構造バリデーションを実行する
  Then 各エントリに id (BP-XXXX), category, severity, auto_check (boolean), validation_method が存在すること
  And id が "BP-" プレフィックスを持つ 4 桁の連番形式であること
```

```gherkin
# AC-0013-0011
Scenario: アンチパターン DB が正しい構造を持つ
  Given anti-patterns.yaml ファイルが共通層エントリを持つ
  When DB 構造バリデーションを実行する
  Then 各エントリに id (AP-XXXX), category, severity, detection_method (auto | manual), fix_guidance が存在すること
  And severity が "critical | major | minor" の列挙値であること
```

```gherkin
# AC-0013-0012
Scenario: プラットフォーム固有ルールが適用される
  Given best-practices.yaml が platform: web のエントリを持つ
  And 対象プロジェクトのプラットフォームが "web" である
  When レビューを実行する
  Then web 固有ルール（例: semantic HTML, WCAG 2.2 AA）が適用されること
  And windows / mobile 固有ルールは適用されないこと
```

---

### US-0013-0005: 自動+手動ハイブリッドレビュー

```gherkin
# AC-0013-0013
Scenario: qfai validate が UI/UX 自動チェックを実行する
  Given HTML Mock と Design Token と UI Contract が揃っている
  When qfai validate を実行する
  Then Design Token 参照整合性チェックが実行されること
  And HTML 構文チェックが実行されること
  And コントラスト比チェック（WCAG 2.2 AA）が実行されること
  And タッチターゲットサイズチェック（44x44px 以上）が実行されること
  And 実行時間の増加が 2 秒未満であること
```

```gherkin
# AC-0013-0014
Scenario: 手動レビューチェックリストが自動チェックと明確に分離されている
  Given ui-ux-reviewer チェックリストが更新されている
  When ui-ux-reviewer がレビューを実行する
  Then auto_check: true のルールは qfai validate 担当として除外されること
  And auto_check: false のルールのみが手動チェック対象として列挙されること
  And 手動チェック結果が自動チェック結果と独立したセクションに記録されること
```

---

### US-0013-0006: プラットフォーム適応型定義

```gherkin
# AC-0013-0015
Scenario: プラットフォームが検出され固有ルールが適応される
  Given プロジェクト設定に platform: "mobile-ios" が指定されている
  When qfai validate または review が実行される
  Then iOS 固有の UI ガイドライン（Human Interface Guidelines）に基づくルールが適用されること
  And web / android 固有ルールは適用されないこと
```

```gherkin
# AC-0013-0016
Scenario: 不明プラットフォームに対して共通ルールでフォールバックする
  Given プロジェクト設定に platform: "unknown-platform" が指定されている
  When qfai validate を実行する
  Then 警告 "Unknown platform: unknown-platform. Falling back to common rules." が出力されること
  And プラットフォーム固有ルールなしで共通ルールのみが適用されること
  And バリデーションが中断されずに完了すること
```

---

### US-0013-0007: 下流 skill の UI 定義消費プロトコル

```gherkin
# AC-0013-0017
Scenario: 下流 skill が UI 定義 4 点セットを定められた順序で読み取る
  Given Design Token YAML, HTML Mock, UI Contract YAML, Mermaid Flow が存在する
  When prototyping skill が UI 定義消費プロトコルに従い読み取りを開始する
  Then 読み取り順序が "1. Design Token → 2. UI Contract → 3. HTML Mock → 4. Mermaid Flow" であること
  And 欠落した定義ファイルがある場合は警告を出力してフォールバック規則に従うこと
```

```gherkin
# AC-0013-0018
Scenario: UI 定義間の不整合が自動検出される
  Given HTML Mock が var(--color-primary, #2563eb) を使用している
  And Design Token YAML で semantic.color.primary の値が "{primitive.color.blue.700}" に変更されている
  And primitive.color.blue.700 の値が #1d4ed8 である
  When qfai validate の整合性チェックを実行する
  Then HTML Mock のフォールバック値 #2563eb と Token 解決値 #1d4ed8 の不一致が警告として報告されること
```

---

### US-0013-0008: UI/UX 調査の都度実行

```gherkin
# AC-0013-0019
Scenario: /qfai-discussion 実行時に UI/UX 調査が自動トリガーされる
  Given /qfai-discussion コマンドが実行される
  And プロジェクトのプラットフォームが "web" と判定される
  When discussion ワークフローが開始される
  Then Web 向け UI/UX ベストプラクティス調査が自動的に実行されること
  And 調査結果が discussion-pack の Research Summary セクションに記録されること
  And ソース明記率が 100% であること
```

```gherkin
# AC-0013-0020
Scenario: 調査結果が既存ルールと矛盾する場合に更新プロトコルが適用される
  Given 新規調査で既存の BP-0001 ルールと相反する最新情報が得られた
  When 調査結果を discussion-pack に統合する
  Then 矛盾する既存ルールとの差分が "reflection" セクションに記録されること
  And "action: reject" または "action: defer" として既存ルール優先の判断が明記されること
  And ユーザーへの確認なしに既存ルールが自動上書きされないこと
```

---

### US-0013-0009: 専門家サブエージェント体制

```gherkin
# AC-0013-0021
Scenario: 4 専門家サブエージェントのエージェント定義ファイルが完備されている
  Given .qfai/assistant/agents/ ディレクトリが存在する
  When エージェント定義ファイルを確認する
  Then 以下のファイルが存在すること:
    | uiux-expert.md             |
    | design-expert.md           |
    | screen-transition-expert.md |
    | navigation-expert.md        |
  And 各ファイルに Role, Responsibilities, Research-First Protocol, Phase Activities, Output Schema, Collaboration Rules セクションが存在すること
```

```gherkin
# AC-0013-0022
Scenario: Research-First Protocol が共通スキーマに準拠している
  Given 専門家サブエージェントが作業を開始する
  When Research-First Protocol が実行される
  Then research_summary.sources[].published が現在日から 2 年以内のエントリが ≥ 80% であること
  And research_summary.sources[].id が全エントリに存在すること
  And research_summary.best_practices と anti_patterns に最低各 1 件のエントリがあること
  And research_summary.reflection に最低 1 件の action: apply エントリがあること
```

```gherkin
# AC-0013-0023
Scenario: 専門家サブエージェントが全フェーズで活動する
  Given 専門家サブエージェント定義ファイルに Phase Activities セクションがある
  When Phase Activities を確認する
  Then discussion / SDD / prototyping / ATDD の全フェーズが定義されていること
  And 各フェーズの活動内容（方針策定/詳細定義/実装品質担保/検証品質担保）が明記されていること
```

```gherkin
# AC-0013-0024
Scenario: 専門家間の責務境界がゆるやかな分離で定義されている
  Given 各エージェント定義ファイルに Collaboration Rules セクションがある
  When フォーム設計などの重複領域が発生する
  Then 複数の専門家が協調して成果物を生成できること
  And 重複領域の最終調整責任が Integrated UI/UX Reviewer に委譲されること
```

---

### US-0013-0010: 統合 UI/UX レビュー

```gherkin
# AC-0013-0025
Scenario: Integrated UI/UX Reviewer が 4 専門家の成果物を統合評価する
  Given 4 専門家の成果物がすべて揃っている
  When Integrated UI/UX Reviewer がレビューを実行する
  Then 個別の UI/UX・デザイン・画面遷移・導線設計が各専門観点でレビューされること
  And サービス全体の UX 一貫性（ナビゲーションフロー、視覚的一貫性、インタラクション一貫性）が評価されること
  And レビュー項目の 100% に「サービス全体への影響」記述があること
```

```gherkin
# AC-0013-0026
Scenario: Integrated UI/UX Reviewer が review-roster の 13 番目として登録されている
  Given review-roster.yml が存在する
  When review-roster.yml を確認する
  Then id: integrated-uiux-reviewer のエントリが存在すること
  And scope に discuss, require, sdd が含まれること
  And must_check にクロス専門家整合性チェックと全体的なサービス使いやすさ評価が含まれること
  And can_be_na: true かつ na_rule に "UI/UX 変更がない場合のみ N/A 可" が明記されていること
```

---

## AC Catalog (optional)

| ID            | Title                                            | Notes                              | Priority |
| ------------- | ------------------------------------------------ | ---------------------------------- | -------- |
| AC-0013-0001  | Design Token YAML スキーマが W3C DTCG 準拠で有効 | primitive → semantic 参照解決含む  | P1       |
| AC-0013-0002  | 未定義 Token 参照の検出                          | エラーメッセージに参照元パス含む   | P1       |
| AC-0013-0003  | Design Token プラットフォーム属性の検証          | 列挙値チェック + ルール適用確認    | P1       |
| AC-0013-0004  | HTML Mock がブラウザで外部依存なしに表示される   | NFR-0004 対応                      | P1       |
| AC-0013-0005  | HTML Mock が状態バリアントを定義している         | 5 状態バリアント                   | P1       |
| AC-0013-0006  | HTML Mock がレスポンシブバリアントを記述している | 3 ブレークポイント                 | P2       |
| AC-0013-0007  | Mermaid stateDiagram-v2 の有効性                 | 構文チェック                       | P1       |
| AC-0013-0008  | Mermaid flowchart によるナビゲーション構造図     | 構文チェック                       | P1       |
| AC-0013-0009  | 画面遷移に条件ラベルが付与されている             | 未ラベル遷移を警告                 | P2       |
| AC-0013-0010  | ベストプラクティス DB が正しい構造を持つ         | BP-XXXX ID 形式チェック            | P1       |
| AC-0013-0011  | アンチパターン DB が正しい構造を持つ             | severity 列挙値チェック            | P1       |
| AC-0013-0012  | プラットフォーム固有ルールが適用される           | 他プラットフォームルールの排除確認 | P1       |
| AC-0013-0013  | qfai validate が UI/UX 自動チェックを実行する    | 実行時間 < 2s 含む                 | P1       |
| AC-0013-0014  | 手動レビューと自動チェックの明確分離             | auto_check フラグで分離            | P1       |
| AC-0013-0015  | プラットフォーム検出と固有ルール適応             | mobile-ios HIG ルール適用確認      | P1       |
| AC-0013-0016  | 不明プラットフォームへの共通ルールフォールバック | バリデーション中断なし             | P1       |
| AC-0013-0017  | 下流 skill が 4 点セットを定められた順序で読む   | 読み取り順序と欠落時フォールバック | P1       |
| AC-0013-0018  | UI 定義間の不整合が自動検出される               | Token 値とフォールバック値の差異   | P1       |
| AC-0013-0019  | /qfai-discussion 実行時に UI/UX 調査が自動起動  | ソース明記率 100% 確認             | P1       |
| AC-0013-0020  | 調査結果と既存ルールの矛盾時に更新プロトコル適用 | 自動上書き禁止                     | P1       |
| AC-0013-0021  | 4 専門家エージェント定義ファイルが完備           | 6 必須セクション確認               | P1       |
| AC-0013-0022  | Research-First Protocol が共通スキーマ準拠       | NFR-0011 数値目標達成確認          | P1       |
| AC-0013-0023  | 専門家が全フェーズで活動定義を持つ               | 4 フェーズ × 4 専門家              | P1       |
| AC-0013-0024  | 専門家責務境界がゆるやかな分離で定義             | 重複領域の協調と統合調整           | P2       |
| AC-0013-0025  | Integrated Reviewer が 4 専門家成果物を統合評価  | サービス全体影響記述 100%          | P1       |
| AC-0013-0026  | Integrated Reviewer が review-roster 13 番目登録 | can_be_na と na_rule 確認          | P1       |
