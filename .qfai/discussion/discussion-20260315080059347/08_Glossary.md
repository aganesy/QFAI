# 08_Glossary

| Term | Definition | Source |
|------|-----------|--------|
| Design Token | UI のビジュアル属性（色、タイポグラフィ、スペーシング等）を名前付きの値として定義するシステム。primitive → semantic → component の 3 層構造で管理する。 | W3C DTCG |
| Primitive Token | 生の値を保持する最低層のトークン。例: `color.blue.600: #2563eb` | W3C DTCG |
| Semantic Token | 意味的な名前を持ち、Primitive Token を参照するトークン。例: `color.primary: {color.blue.600}` | W3C DTCG |
| Component Token | 特定の UI コンポーネントに紐づくトークン。例: `button.primary.bg: {color.primary}` | W3C DTCG |
| HTML+CSS Visual Mock | discussion/spec 内に埋め込まれる自己完結型の HTML+CSS スニペット。Design Token のフォールバック値を持ち、ブラウザで直接プレビュー可能。 | This discussion |
| Mermaid 画面遷移図 | Mermaid 記法（stateDiagram, flowchart）で記述された画面間の遷移フロー定義。 | This discussion |
| UI Contract | `.qfai/contracts/ui/` に配置される YAML ファイル。画面の構造（screens, elements, actions）を定義する。ID フォーマット: `CON-UI-XXXX` | SRC-0001 |
| UI 定義 3 点セット | Design Token YAML + HTML+CSS Visual Mock + Mermaid 画面遷移図の組み合わせ。UI の見た目・構造・遷移を網羅的に定義する。 | This discussion |
| UI Fidelity | prototyping の成果物と UI 定義の一致度。`qfai prototyping --autogen-ui-fidelity` で測定。 | SRC-0002 |
| data-qfai マーカー | HTML 要素に付与する `data-qfai="CONTRACT_ID:ELEMENT_ID"` 形式の属性。UI Contract との紐付けに使用。 | SRC-0001 |
| Nielsen's Heuristics | Jakob Nielsen による 10 のユーザビリティヒューリスティクス。UI/UX レビューの基本フレームワーク。 | SRC-0008 |
| Gestalt 原則 | 視覚認知の法則（近接、類似、閉合、連続、共通運命等）。レイアウト設計の基盤。 | SRC-0015 |
| WCAG | Web Content Accessibility Guidelines。W3C によるアクセシビリティ標準。 | SRC-0009 |
| ベストプラクティス DB | UI/UX のベストプラクティスを体系化したルールセット。プラットフォーム共通層 + プラットフォーム固有層の 2 層構造。 | This discussion |
| アンチパターン DB | UI/UX のアンチパターン（ダークパターン含む）を体系化したルールセット。自動検出ルールと手動チェック項目に分類。 | This discussion |
| UI/UX 消費プロトコル | 下流 skill（prototyping, ATDD, TDD）が UI 定義 3 点セット + UI Contract を読み取り解釈する手順の定義。 | This discussion |
| プラットフォーム適応型基準 | 対象プロジェクトのプラットフォーム（Web/Windows/Mobile）に応じて適用される UI/UX レビュー基準。共通層 + 固有層の 2 層構造。 | This discussion |
| Heuristic Evaluation | ユーザビリティの専門家が、一連のユーザビリティ原則（ヒューリスティクス）に照らして UI を評価する手法。 | SRC-0008 |
| Cognitive Walkthrough | ユーザーのタスク遂行プロセスをステップごとにたどり、認知的な障害を特定する評価手法。 | UX research |
| Design System | 再利用可能なコンポーネント、パターン、ガイドラインの集合。Design Token はその基盤要素。 | Industry standard |
| Atomic Design | Brad Frost 提唱の UI 設計手法。Atoms → Molecules → Organisms → Templates → Pages の 5 階層。 | Brad Frost |
| Research-First Protocol | 専門家サブエージェントが作業開始前に必ず実施するリサーチプロトコル。対象プラットフォーム・ドメインに関する最新のベストプラクティスとアンチパターンを調査し、その結果を作業の基盤とする。 | This discussion (drift) |
| UI/UX Expert | ユーザビリティ評価・認知負荷分析・情報設計・インタラクション設計を専門とするサブエージェント。 | This discussion (drift) |
| Design Expert | ビジュアルデザイン・色彩・タイポグラフィ・レイアウト・Design Token 設計を専門とするサブエージェント。 | This discussion (drift) |
| Screen Transition Expert | 画面遷移フロー設計・状態管理・条件分岐・エラー/例外遷移・ディープリンクを専門とするサブエージェント。 | This discussion (drift) |
| Navigation Expert | IA 構造設計・メニュー/タブ/サイドバー設計・ブレッドクラム・導線最適化・ファネル設計を専門とするサブエージェント。 | This discussion (drift) |
| Integrated UI/UX Reviewer | 4 専門家の成果物を統合的にレビューし、個別評価に加えてサービス全体の使い勝手の良さを統合的に評価するサブエージェント。review-roster 13 番目。 | This discussion (drift) |
| ゆるやかな責務分離 | 4 専門家間の責務境界の設計方針。大枠で領域を分けるが、重複する領域は複数の専門家が協調して担当し、統合レビュアーが最終調整を行う。 | This discussion (drift) |
| IA（情報アーキテクチャ） | 情報の組織化・分類・ナビゲーション構造の設計。カードソート・ツリーテスト等の手法で検証する。 | SRC-0021 |
