# 02 User Stories

## US Catalog

- US-0019-0001: DDP フィールドの必須定義
- US-0019-0002: DDP 必須フィールドの自動検証
- US-0019-0003: 禁止ジェネリックパターンの明示化
- US-0019-0004: DDP のツール非依存設計
- US-0019-0005: Research-to-Constraint 変換
- US-0019-0006: ハイフィデリティ Story Workshop テンプレート
- US-0019-0007: アンチパターン自動検出バリデーター
- US-0019-0008: Config uiux ポリシー宣言
- US-0019-0009: 主要スクリーン複数オプション比較
- US-0019-0010: 競合参照 UI 必須化

---

## US-0019-0001: DDP フィールドの必須定義

- Parent: CAP-0019
- Source: US-0019-0001
- Requirement: REQ-0001, REQ-0002, REQ-0003

**As a** AI エージェント開発者
**I want to** UI 仕様作成前に DDP フィールド（ビジュアルテーゼ・コンテンツプラン・インタラクションテーゼ・アンチゴール・CTA 階層）を定義したい
**So that** テーマ未定義のまま UI 実装に進むことを防ぎ、意図的に設計された UI を実現できる

- Goal: DDP テンプレートを定義し、ビジュアルテーゼ（1 文）、コンテンツプラン（セクション役割と順序）、インタラクションテーゼ（2-3 のモーション原則）、アンチゴール（UI が「してはならないこと」）、CTA 階層（primary / secondary / tertiary）の 5 フィールドを必須とする。テーマフィールド 6 項目（theme, mood, taste, material, energy, visual anchor）も併せて定義する。
- Non-goals: Figma / Sketch 等のデザインツール統合；DDP の美的品質の自動スコアリング
- Notes: DDP は discussion-pack と spec-pack の両方で使用される。ビジュアルテーゼは雰囲気・素材感・温度・エネルギーを 1 文に凝縮する。

---

## US-0019-0002: DDP 必須フィールドの自動検証

- Parent: CAP-0019
- Source: US-0019-0001
- Requirement: REQ-0001, REQ-0002, REQ-0003

**As a** QA エンジニア
**I want to** DDP の全必須フィールドが埋まっていることを自動検証したい
**So that** 検証漏れを防ぎ、不完全な DDP のまま下流工程に進むことを阻止できる

- Goal: qfai validate に DDP バリデーションルールを追加し、5 必須フィールド（ビジュアルテーゼ・コンテンツプラン・インタラクションテーゼ・アンチゴール・CTA 階層）+ テーマフィールド 6 項目の存在・非空チェックを実行する。CTA 階層の primary/secondary/tertiary 構造チェックも行う。
- Non-goals: ビジュアルテーゼの美的品質の主観的評価；コンテンツプランのセクション数の最適化判定
- Notes: バリデーションは構造的チェック（フィールドの存在と非空）に限定する。内容の質的判断はレビュアーが担当する。

---

## US-0019-0003: 禁止ジェネリックパターンの明示化

- Parent: CAP-0019
- Source: US-0019-0001
- Requirement: REQ-0006

**As a** AI エージェント開発者
**I want to** 禁止ジェネリックパターン（量産型カードグリッド、弱いヒーロー、無意味なグラデーション、過剰アクセント等）が DDP のアンチゴールに明示されていることを確認したい
**So that** 汎用 UI の混入を防ぎ、意図的なデザイン方向性を保証できる

- Goal: 禁止パターンリストを定義し、DDP のアンチゴールフィールドに少なくとも 1 件の禁止パターンが明示されていることをバリデーションで確認する。禁止パターンの追加はリスト拡張のみで可能とする。
- Non-goals: 禁止パターンの自動的な UI コード検出；ビジュアルリグレッションテストによるパターン検出
- Notes: 禁止パターンは DDP のアンチゴールに記述する。レビュー時に禁止パターンの混入が検出された場合は FAIL とする（DR-0032）。

---

## US-0019-0004: DDP のツール非依存設計

- Parent: CAP-0019
- Source: US-0019-0001
- Requirement: REQ-0010

**As a** AI エージェント開発者
**I want to** DDP が Claude Code / Codex / GitHub Copilot のいずれでも Figma 非依存で完結する設計であることを保証したい
**So that** 特定のデザインツールに依存せず、どの AI エージェント環境でも同じ品質の DDP を作成・検証できる

- Goal: DDP テンプレートとバリデーションルールがテキストベースで完結し、Figma / Sketch 等の外部ツールへのハード依存が 0 であることを保証する。3 つの AI エージェントターゲットすべてで DDP の作成・読み取り・検証が可能であること。
- Non-goals: Figma 連携の完全排除（オプショナルな参照は許可）；特定 AI エージェントの最適化
- Notes: 外部ツールはオプショナルな参照としてのみ許容する。DDP の SSOT はテキストアーティファクトに限定する。

---

## US-0019-0005: Research-to-Constraint 変換

- Parent: CAP-0019
- Source: US-0019-0005
- Requirement: REQ-0013

**As a** QFAI ユーザー
**I want to** discussion の research_summary に記述された BP/AP をコントラクト（contracts/design/*.yaml）のルールに自動変換したい
**So that** リサーチ知見が下流エージェントに強制される制約として機能し、研究成果が設計品質に直結する

- Goal: discussion-pack の research_summary セクションに記述された Best Practices（BP）と Anti-Patterns（AP）を、contracts/design/*.yaml ファイルのバリデーションルールに変換する変換プロセスを定義する。変換後のルールは qfai validate で自動チェックされること。
- Non-goals: research_summary の内容の質的評価；BP/AP の優先度ランキング自動化
- Notes: 変換は research_summary → contracts/design/*.yaml の一方向フロー。下流参照（upper-to-lower）は禁止、lower-to-upper のみ許可。

---

## US-0019-0006: ハイフィデリティ Story Workshop テンプレート

- Parent: CAP-0019
- Source: US-0019-0006
- Requirement: REQ-0014

**As a** QFAI ユーザー
**I want to** Story Workshop がリスト画面テンプレート（ページ目的・CTA・検索/フィルター/ソート・4 状態・デスクトップ/モバイル・行クリック・密度根拠）とフォーム画面テンプレート（主タスク・入力グルーピング・バリデーションタイミング・必須/任意/破壊的・4 状態・送信後遷移）を必須とするようにしたい
**So that** 上流定義の品質が下流 UI 実装を制約し、多状態スクリーン仕様の漏れを防ぐことができる

- Goal: Story Workshop テンプレートをリスト画面とフォーム画面の 2 種類に分け、それぞれ規定フィールドを必須として定義する。各テンプレートはページ目的・4 状態（empty/loading/data/error）の明示を最低要件とする。
- Non-goals: テンプレートのビジュアルフィデリティ自動評価；Figma との同期
- Notes: 4 状態（empty / loading / data / error）は全スクリーンで必須。リスト画面の密度根拠はデスクトップ/モバイルで分けて記述する。

---

## US-0019-0007: アンチパターン自動検出バリデーター

- Parent: CAP-0019
- Source: US-0019-0007
- Requirement: REQ-0018

**As a** QFAI ユーザー
**I want to** バリデーターがジェネリック UI アンチパターン（dual primary CTA・過剰必須フィールド・アクションなし空状態・リカバリなしエラー・4 クリック超主フロー・プレースホルダー/Lorem ipsum・ボタンバリアント増殖）を自動検出してほしい
**So that** レビュー前に低品質 UI が捕捉され、レビュアーの審査工数が削減される

- Goal: qfai validate にアンチパターン検出ルールを追加し、上記 7 種のアンチパターンを構造的に検出する。検出時は対象箇所と改善ガイダンスを出力する。
- Non-goals: アンチパターンの自動修正；ビジュアルリグレッションテストとの統合
- Notes: 検出対象は spec-pack および discussion-pack のテキストアーティファクト内の記述。レンダリング済み HTML の解析は対象外。

---

## US-0019-0008: Config uiux ポリシー宣言

- Parent: CAP-0019
- Source: US-0019-0008
- Requirement: REQ-0019

**As a** QFAI ユーザー
**I want to** qfai.config.yaml にプロジェクト固有の UI/UX ポリシー（platform・qualityProfile・requireResearchSummary 等）を宣言したい
**So that** バリデーターがプロジェクトコンテキストを使用し、汎用ルールではなくプロジェクト特化のチェックを実行できる

- Goal: qfai.config.yaml にオプショナルな `uiux` セクションを定義し、platform（web/mobile/desktop）、qualityProfile（standard/high/strict）、requireResearchSummary（true/false）等のキーを許容する。バリデーターは config を読み込みポリシーに応じてチェック強度を調整する。
- Non-goals: config の自動生成；ポリシー間の競合自動解決
- Notes: `uiux` セクションは完全オプショナル。未定義の場合はデフォルト値（qualityProfile=standard 等）を使用する。

---

## US-0019-0009: 主要スクリーン複数オプション比較

- Parent: CAP-0019
- Source: US-0019-0009
- Requirement: REQ-0020

**As a** QFAI ユーザー
**I want to** 主要スクリーンについて 2 つ以上のデザインオプションを pros/cons・目標ビヘイビアー・回避アンチパターンと共に比較してほしい
**So that** 設計判断が意図的に行われ、デフォルト UI の無批判採用を防ぐことができる

- Goal: 主要スクリーン（primary screen）の discussion-pack または spec-pack において、最低 2 つのオプションを比較するセクションを必須とする。各オプションは pros・cons・target_behavior・avoided_anti_patterns を含む構造化された形式で記述する。
- Non-goals: オプション数の上限設定；自動的なオプション推薦
- Notes: "主要スクリーン" の定義はプロジェクトの CTA 階層に基づき、primary CTA を持つスクリーンとする。

---

## US-0019-0010: 競合参照 UI 必須化

- Parent: CAP-0019
- Source: US-0019-0010
- Requirement: REQ-0021

**As a** QFAI ユーザー
**I want to** discussion-pack に 3 件以上の競合/参照 UI（採用すること・拒否すること・翻訳方針）を含めてほしい
**So that** AI エージェントが具体的なビジュアル事例を持って設計を行え、抽象的な指示だけでなく参照に基づく設計品質が実現される

- Goal: UI-bearing discussion-pack には competitive_references セクションを必須とし、3 件以上の参照 UI エントリーを要求する。各エントリーは source・adopt（採用する要素）・reject（拒否する要素）・translation_policy（翻訳方針）を含む。
- Non-goals: 参照 UI の自動収集；スクリーンショット管理
- Notes: 参照は URL または説明テキストで可。Figma 非依存でテキストベースの参照記述を標準とする。
