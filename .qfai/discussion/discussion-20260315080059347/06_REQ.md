# 06_REQ

## Functional Requirements

| REQ-ID   | Title                                          | Description                                                                                                                                                                                                           | Source                      | Priority |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------- |
| REQ-0001 | Design Token YAML スキーマ定義                 | W3C DTCG 準拠の Design Token YAML スキーマを定義する。primitive → semantic → component の 3 層構造をサポートし、色・タイポグラフィ・スペーシング・ボーダー・シャドウ・モーション・ブレークポイントのカテゴリを持つ。  | SRC-0010, US-D001           | Must     |
| REQ-0002 | Design Token プラットフォーム属性              | Design Token YAML にプラットフォーム属性（web / windows / mobile-ios / mobile-android）を持たせ、プラットフォーム固有の値変換ルールを定義できるようにする。                                                           | US-D006, SRC-0019           | Must     |
| REQ-0003 | Design Token 参照解決                          | semantic Token が primitive Token を `{primitive.xxx}` 形式で参照し、値の解決チェーンを検証できるようにする。循環参照・未定義参照をエラーとして検出する。                                                             | US-D001, SRC-0019           | Must     |
| REQ-0004 | HTML+CSS Visual Mock テンプレート              | discussion-pack / spec-pack 内に埋め込むための HTML+CSS Visual Mock のテンプレートと記法ルールを定義する。自己完結型（外部依存なし）で、Design Token のフォールバック値（CSS custom property + fallback）を使用する。 | US-D002, SRC-0019           | Must     |
| REQ-0005 | HTML Mock 状態バリアント                       | 各画面の HTML+CSS Mock で、default / loading / empty / error / disabled の各状態バリアントを定義できる構造を提供する。                                                                                                | US-D002, SRC-0019           | Must     |
| REQ-0006 | HTML Mock レスポンシブバリアント               | HTML+CSS Mock でデスクトップ・タブレット・モバイルの各ブレークポイントでのレイアウト差異を表現できる記法を定義する。                                                                                                  | US-D002, SRC-0019           | Should   |
| REQ-0007 | Mermaid 画面遷移図テンプレート                 | stateDiagram-v2 による画面遷移定義のテンプレートを提供する。各遷移に条件ラベル（認証状態、権限、バリデーション結果等）を付与できる。                                                                                  | US-D003, SRC-0019           | Must     |
| REQ-0008 | Mermaid ナビゲーション構造図                   | flowchart による全体ナビゲーション構造の定義テンプレートを提供する。サイドナビ・タブ・ブレッドクラム等のナビゲーションパターンを表現できる。                                                                          | US-D003, SRC-0019           | Must     |
| REQ-0009 | UI/UX ベストプラクティス DB 構造               | UI/UX ベストプラクティスを格納する構造（YAML/Markdown）を定義する。共通層 + プラットフォーム固有層の 2 層構造。各ルールに ID、カテゴリ、重要度、自動/手動フラグ、検証方法を持つ。                                     | US-D004, SRC-0019           | Must     |
| REQ-0010 | UI/UX アンチパターン DB 構造                   | UI/UX アンチパターンを格納する構造を定義する。各パターンに ID、カテゴリ、重大度、検出方法（自動/手動）、修正ガイダンスを持つ。                                                                                        | US-D004, SRC-0019           | Must     |
| REQ-0011 | qfai validate UI ルール追加                    | `qfai validate` に UI/UX 自動チェックルールを追加する。Design Token 参照整合性、HTML 構文チェック、コントラスト比チェック、タッチターゲットサイズチェック等。                                                         | US-D005, SRC-0019           | Must     |
| REQ-0012 | ui-ux-reviewer チェックリスト拡張              | ui-ux-reviewer エージェントのチェックリストを、体系化されたベストプラクティス/アンチパターン DB に基づいて拡張する。                                                                                                  | US-D005, SRC-0019           | Must     |
| REQ-0013 | プラットフォーム検出と基準適応                 | 対象プロジェクトのプラットフォームを検出（または明示指定）し、該当するプラットフォーム固有のベストプラクティス/アンチパターンを適用する仕組み。                                                                       | US-D006, SRC-0019           | Must     |
| REQ-0014 | UI 定義消費プロトコル定義                      | 下流 skill（prototyping, ATDD, TDD）が UI 定義 3 点セット + UI Contract を読み取り解釈するためのプロトコルを定義する。読み取り順序、優先度、フォールバック規則を含む。                                                | US-D007, SRC-0019           | Must     |
| REQ-0015 | UI 定義整合性チェック                          | Design Token ↔ HTML Mock ↔ UI Contract ↔ Mermaid Flow 間の整合性を自動チェックする仕組み。不整合をエラーとして検出する。                                                                                              | US-D007, SRC-0019           | Must     |
| REQ-0016 | UI Contract YAML 拡張                          | 既存の UI Contract YAML（CON-UI-XXXX）に Design Token 参照フィールドを追加する。後方互換性を維持しつつ、ビジュアル属性を定義可能にする。                                                                              | US-D001, SRC-0001, SRC-0019 | Must     |
| REQ-0017 | UI/UX 調査ワークフロー定義                     | 新プロジェクト開始時に最新の UI/UX ベストプラクティスを都度調査・更新するワークフローを定義する。調査結果の保存形式と既存ルールへの統合手順を含む。                                                                   | US-D008, SRC-0019           | Must     |
| REQ-0018 | CLI UX ガイドライン定義                        | QFAI CLI の出力 UX ガイドラインを定義する。色使い、プログレス表示、エラー表示、レポートフォーマットの基準を含む。                                                                                                     | US-D005, SRC-0019           | Should   |
| REQ-0019 | UI/UX Expert サブエージェント定義              | ユーザビリティ評価・認知負荷分析・情報設計・インタラクション設計を担当するサブエージェントを定義する。作業冒頭での最新ベストプラクティス/アンチパターンリサーチを必須プロトコルとする。                               | US-D009, SRC-0020           | Must     |
| REQ-0020 | Design Expert サブエージェント定義             | ビジュアルデザイン・色彩・タイポグラフィ・レイアウト・Design Token 設計を担当するサブエージェントを定義する。作業冒頭での最新デザインベストプラクティス/アンチパターンリサーチを必須プロトコルとする。                | US-D009, SRC-0020           | Must     |
| REQ-0021 | Screen Transition Expert サブエージェント定義  | 画面遷移フロー設計・状態管理・条件分岐・エラー/例外遷移・ディープリンクを担当するサブエージェントを定義する。作業冒頭での最新画面遷移ベストプラクティス/アンチパターンリサーチを必須プロトコルとする。                | US-D009, SRC-0020           | Must     |
| REQ-0022 | Navigation Expert サブエージェント定義         | IA 構造設計・メニュー/タブ/サイドバー設計・ブレッドクラム・導線最適化・ファネル設計を担当するサブエージェントを定義する。作業冒頭での最新導線設計ベストプラクティス/アンチパターンリサーチを必須プロトコルとする。    | US-D009, SRC-0020           | Must     |
| REQ-0023 | Research-First Protocol 定義                   | 5 つの専門家サブエージェント共通のリサーチプロトコルを定義する。対象プラットフォーム・ドメイン特化のリサーチ項目、出力フォーマット、リサーチ結果の作業への反映方法を含む。                                            | US-D009, SRC-0020           | Must     |
| REQ-0024 | Integrated UI/UX Reviewer サブエージェント定義 | 4専門家の成果物を統合的にレビューし、個別の UI/UX・デザイン評価に加えてサービス全体の使い勝手の良さを統合的に評価するサブエージェントを定義する。作業冒頭でのリサーチ必須。review-roster 13番目として登録。           | US-D010, SRC-0020           | Must     |
| REQ-0025 | 専門家サブエージェント全フェーズ活動定義       | discussion, SDD, prototyping, ATDD の各フェーズにおける専門家サブエージェントの関与範囲と責務を定義する。フェーズごとの活動内容（方針策定/詳細定義/実装品質担保/検証品質担保）を明確化。                              | US-D009, US-D010, SRC-0020  | Must     |

## Sub-agent Artifact Schema (REQ-0019~REQ-0024 補足)

### File Path Convention

```
.qfai/assistant/agents/<role-id>.md
```

対象ファイル:

| role-id                  | File                                                 |
| ------------------------ | ---------------------------------------------------- |
| uiux-expert              | `.qfai/assistant/agents/uiux-expert.md`              |
| design-expert            | `.qfai/assistant/agents/design-expert.md`            |
| screen-transition-expert | `.qfai/assistant/agents/screen-transition-expert.md` |
| navigation-expert        | `.qfai/assistant/agents/navigation-expert.md`        |
| integrated-uiux-reviewer | `.qfai/assistant/agents/integrated-uiux-reviewer.md` |

### Mandatory Sections per Agent File

各エージェント定義ファイルは以下のセクションを必須とする:

1. **Role** — 役割の1行要約
2. **Responsibilities** — 担当領域の箇条書き（最低3項目）
3. **Research-First Protocol** — リサーチ手順（入力/出力/反映方法）
4. **Phase Activities** — discussion / SDD / prototyping / ATDD 各フェーズでの活動内容
5. **Output Schema** — 当該エージェントが生成する成果物のフォーマット定義
6. **Collaboration Rules** — 他エージェントとの協調ルール（ゆるやかな責務分離の適用方法）

### Draft review-roster.yml Entry (REQ-0024)

```yaml
- id: integrated-uiux-reviewer
  name: Integrated UI/UX Reviewer
  scope: [discuss, require, sdd]
  must_check:
    - Verify cross-specialist consistency and holistic service usability.
    - Verify Research-First Protocol compliance across all specialist outputs.
    - Evaluate overall user experience beyond individual component quality.
  can_be_na: true
  na_rule: "Allowed only if no UI/UX-related change exists in the target artifact."
```

## Research-First Protocol Output Schema (REQ-0023 補足)

各専門家サブエージェントは作業冒頭で以下のスキーマに従ったリサーチサマリーを生成し、成果物の先頭セクションに記録する。

### Output Format

```yaml
research_summary:
  agent: <role-id> # e.g., uiux-expert
  platform: <platform-id> # e.g., web, mobile-ios, cross-platform
  timestamp: <ISO-8601> # リサーチ実施日時
  sources:
    - id: <SRC-XXXX> # 04_Sources.md への参照 or インライン
      title: <string>
      url: <string>
      published: <YYYY-MM-DD>
      relevance: <string> # このリサーチにおける関連性の説明
  best_practices:
    - rule_id: <BP-XXXX>
      summary: <string>
      source_id: <SRC-XXXX>
  anti_patterns:
    - pattern_id: <AP-XXXX>
      summary: <string>
      source_id: <SRC-XXXX>
  reflection: # リサーチ結果の作業への反映方法
    - target: <artifact-path or section>
      action: <apply | defer | reject>
      reason: <string>
```

### Validation Rules (NFR-0011 対応)

- `sources[].published` が現在日から2年以内であること（≥80% of entries）
- `sources[].id` が全て populated であること（100% source citation）
- `best_practices` と `anti_patterns` に最低各1件のエントリが存在すること
- `reflection` に最低1件の `apply` アクションが存在すること

### Recording Location

- discussion phase: 各エージェントの work order 結果に `## Research Summary` セクションとして埋め込む
- SDD phase 以降: spec-XXXX 内の対応セクションに `<!-- research-ref: agent=<role-id> timestamp=<ISO-8601> -->` コメントで参照を記録
