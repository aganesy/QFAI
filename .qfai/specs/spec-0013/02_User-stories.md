# 02 User Stories

## US Catalog

- US-0013-0001: Design Token によるビジュアル定義
- US-0013-0002: HTML+CSS Visual Mock による画面定義
- US-0013-0003: Mermaid による画面遷移定義
- US-0013-0004: UI/UX ベストプラクティス・アンチパターン体系
- US-0013-0005: 自動+手動ハイブリッドレビュー
- US-0013-0006: プラットフォーム適応型定義
- US-0013-0007: 下流 skill の UI 定義消費プロトコル
- US-0013-0008: UI/UX 調査の都度実行
- US-0013-0009: 専門家サブエージェント体制
- US-0013-0010: 統合 UI/UX レビュー
- US-0013-0011: 画面コントラクトのリッチスキーマ定義 [remediation v1.7.7]

---

## US-0013-0001: Design Token によるビジュアル定義

- Parent: CAP-0013
- Source: US-0013-0001
- Requirement: REQ-0001, REQ-0002, REQ-0003, REQ-0016

**As a** QFAI ユーザー（対象プロジェクトの開発者）
**I want to** Design Token YAML で色・タイポグラフィ・スペーシング等のビジュアル属性を一元管理できる
**So that** UI の見た目に関する仕様が明確に定義され、実装時の認識齟齬がなくなる

- Goal: W3C DTCG 準拠の Design Token YAML スキーマ（primitive → semantic → component 3 層）を定義し、参照解決・バリデーションが機能すること
- Non-goals: Figma / Sketch 等のデザインツールとの連携；グラフィカルな Token エディタの提供；実行時 CSS 変数の動的解決
- Notes: Token ファイルの保存先は `.qfai/contracts/design/`（OQ-0001 決定）。プラットフォーム属性（web / windows / mobile-ios / mobile-android）を持つ。循環参照・未定義参照をエラーとして検出する。

---

## US-0013-0002: HTML+CSS Visual Mock による画面定義

- Parent: CAP-0013
- Source: US-0013-0002
- Requirement: REQ-0004, REQ-0005, REQ-0006

**As a** QFAI ユーザー
**I want to** discussion-pack / spec-pack 内に HTML+CSS のインラインモックを記述できる
**So that** 画面の具体的な見た目を人間が直接確認でき、prototyping skill が正確に実装できる

- Goal: 自己完結型 HTML+CSS Visual Mock テンプレートを定義し、default / loading / empty / error / disabled の各状態バリアントおよびレスポンシブバリアントを表現できること
- Non-goals: JavaScript インタラクションの実行；外部ライブラリの読み込み；ビジュアルリグレッションテスト
- Notes: CSS custom property + fallback 値のデュアル方式（OQ-0003 決定）を採用。HTML Mock は外部依存なしでブラウザで直接プレビュー可能であること（NFR-0004）。

---

## US-0013-0003: Mermaid による画面遷移定義

- Parent: CAP-0013
- Source: US-0013-0003
- Requirement: REQ-0007, REQ-0008

**As a** QFAI ユーザー
**I want to** Mermaid 図で画面遷移・ナビゲーション・条件分岐を記述できる
**So that** アプリケーション全体の導線を俯瞰でき、UX の一貫性をレビューできる

- Goal: stateDiagram-v2 による画面遷移テンプレートと flowchart によるナビゲーション構造テンプレートを定義し、遷移条件ラベル（認証状態、権限、バリデーション結果等）を付与できること
- Non-goals: Mermaid 以外の図表記法（PlantUML, Draw.io 等）のサポート；インタラクティブな遷移シミュレーション
- Notes: Mermaid 図は ` ```mermaid ` フェンス内にのみ記述する（TC-03 制約）。stateDiagram-v2 と flowchart の両形式をサポートする。

---

## US-0013-0004: UI/UX ベストプラクティス・アンチパターン体系

- Parent: CAP-0013
- Source: US-0013-0004
- Requirement: REQ-0009, REQ-0010

**As a** QFAI ユーザー
**I want to** UI/UX のベストプラクティスとアンチパターンが体系化されたレビュー基準を持てる
**So that** prototyping / 実装のレビュー時にアンチパターンを検出し、品質を担保できる

- Goal: ベストプラクティス DB と アンチパターン DB の構造定義（YAML/Markdown）を確立し、共通層 + プラットフォーム固有層の 2 層構造で管理できること
- Non-goals: ベストプラクティスの永続的なグローバル DB 構築（都度調査方式 OQ-0002）；特定 FW に最適化したルール固定
- Notes: 各ルールに ID（BP-XXXX / AP-XXXX）、カテゴリ、重要度/重大度、自動/手動フラグ、検証方法を持つ。ルール追加はファイル追加のみで可能（NFR-0003）。

---

## US-0013-0005: 自動+手動ハイブリッドレビュー

- Parent: CAP-0013
- Source: US-0013-0005
- Requirement: REQ-0011, REQ-0012, REQ-0018

**As a** QFAI ユーザー
**I want to** `qfai validate` で自動チェック可能な項目と、ui-ux-reviewer が手動チェックする項目が明確に分離されている
**So that** 効率的かつ網羅的な UI/UX 品質チェックが実行できる

- Goal: qfai validate に UI/UX 自動チェックルール（Design Token 参照整合性、HTML 構文、コントラスト比、タッチターゲット等）を追加し、ui-ux-reviewer チェックリストを拡張すること
- Non-goals: 完全自動化によるレビュー担当者の廃止；リアルタイムのライブプレビュー検証
- Notes: 自動チェックが優先、矛盾する場合は手動レビューが上位（OQ-0009 決定）。レビューの再現性 100% を担保（NFR-0010）。

---

## US-0013-0006: プラットフォーム適応型定義

- Parent: CAP-0013
- Source: US-0013-0006
- Requirement: REQ-0013

**As a** QFAI ユーザー
**I want to** 対象プロジェクトのプラットフォーム（Web / Windows / Mobile）に応じて UI/UX 定義とレビュー基準が適応される
**So that** プラットフォーム固有のベストプラクティスとアンチパターンが適切に適用される

- Goal: プラットフォームを検出または明示指定し、該当プラットフォーム固有の BP/AP ルールを適用する。不明プラットフォームの場合は共通ルールにフォールバックする
- Non-goals: 特定プラットフォーム専用のコアロジック変更；クロスプラットフォームフレームワーク（Electron 等）への固定最適化
- Notes: 新プラットフォーム追加時はコア変更 0 行（NFR-0002）。対象はすべてのプラットフォーム（OQ-0008 決定）。

---

## US-0013-0007: 下流 skill の UI 定義消費プロトコル

- Parent: CAP-0013
- Source: US-0013-0007
- Requirement: REQ-0014, REQ-0015

**As a** QFAI skill 開発者
**I want to** discussion / spec の UI 定義（Design Token + HTML Mock + Mermaid Flow + UI Contract）を下流 skill が正確に読み取り解釈するプロトコルが定義されている
**So that** prototyping / ATDD / TDD skill が UI 仕様通りに実装・テストを生成できる

- Goal: 読み取り順序、優先度、フォールバック規則を含む消費プロトコルを定義し、4 定義間の整合性チェックを自動化すること
- Non-goals: 下流 skill の実装そのもの（spec-0006 等で管理）；消費プロトコルの動的バージョンネゴシエーション
- Notes: 整合性チェック不整合は 100% 検出（NFR-0008）。プロトコル変更時の後方互換性を維持する。

---

## US-0013-0008: UI/UX 調査の都度実行

- Parent: CAP-0013
- Source: US-0013-0008
- Requirement: REQ-0017

**As a** QFAI ユーザー
**I want to** 新しいプロジェクトやプラットフォームに取り組む際に、最新の UI/UX ベストプラクティスを都度調査・更新できる
**So that** 時代遅れのルールに縛られず、最新の基準でレビューできる

- Goal: /qfai-discussion 実行時に自動トリガーされる UI/UX 調査ワークフローを定義し、調査結果を discussion-pack に記録する手順を確立すること
- Non-goals: ベストプラクティスのグローバル永続 DB 構築；外部 BP サービスへの API 連携
- Notes: 調査トリガーは /qfai-discussion 実行時（OQ-0004 決定）。調査結果の永続保存はしない（OQ-0002 決定）。

---

## US-0013-0009: 専門家サブエージェント体制

- Parent: CAP-0013
- Source: US-0013-0009
- Requirement: REQ-0019, REQ-0020, REQ-0021, REQ-0022, REQ-0023, REQ-0025

**As a** QFAI ユーザー（対象プロジェクトの開発者）
**I want to** UI/UX Expert、Design Expert、Screen Transition Expert、Navigation Expert の 4 専門家サブエージェントが各専門領域で最新リサーチに基づいた定義・提案を行う
**So that** 各専門領域のベストプラクティスに基づいた高品質な UI/UX 定義が実現し、専門的な観点の見落としがなくなる

- Goal: 4 専門家サブエージェントのエージェント定義ファイル（Role / Responsibilities / Research-First Protocol / Phase Activities / Output Schema / Collaboration Rules）を `.qfai/assistant/agents/` に作成し、Research-First Protocol を共通化すること
- Non-goals: サブエージェントの完全自律動作（Orchestrator の統括が前提）；専門家間の完全な責務分離（ゆるやかな分離 OQ-0011 決定）
- Notes: 全フェーズ活動（OQ-0012 決定）。責務境界はゆるやかな分離、重複領域は複数専門家が協調（OQ-0011 決定）。

---

## US-0013-0010: 統合 UI/UX レビュー

- Parent: CAP-0013
- Source: US-0013-0010
- Requirement: REQ-0024, REQ-0025

**As a** QFAI ユーザー
**I want to** Integrated UI/UX Reviewer が 4 専門家の成果物を統合的にレビューし、個別評価だけでなくサービス全体の使い勝手の良さを評価する
**So that** 個別最適化の寄せ集めではなく、ユーザー体験として一貫した高品質なサービスが設計される

- Goal: Integrated UI/UX Reviewer サブエージェントを定義し、review-roster の 13 番目として登録する。個別専門領域評価に加えてサービス全体の UX 一貫性評価を実施できること
- Non-goals: 既存 ui-ux-reviewer の置き換え；リアルタイムの統合レビューダッシュボード
- Notes: review-roster の 13 番目として追加（OQ-0013 決定）。統合レビュー項目の 100% に「サービス全体への影響」記述あり（NFR-0012）。

---

## US-0013-0011: 画面コントラクトのリッチスキーマ定義 [remediation v1.7.7]

- Parent: CAP-0013
- Source: discussion-20260329195516830, REQ-0006
- Requirement: REQ-0006-REM

**As a** QFAI ユーザー（画面コントラクトを定義する開発者）
**I want to** 画面コントラクトが route/screen identity、actor、purpose、observable outcomes、multi-screen 構造を含む
**So that** コントラクトが下流 skill（prototyping / ATDD / TDD）に必要な完全なコンテキストを提供し、実装上の曖昧さがなくなる

- Goal: UI Contract YAML スキーマを拡張し、route/screen identity（route, screenId）、actor、purpose、primary tasks、required states、transitions、observable outcomes の各フィールドを必須または省略可能として定義すること。multi-screen 構造はデフォルト値として single-screen に退縮する。
- Non-goals: 既存 CON-UI-XXXX の破壊的変更；バリデーション対象の非 UI サーフェスへの強制適用
- Notes: 既存後方互換性は NFR-0001 で保証。v1.7.5 以前のコントラクトはマイグレーション既定値で補完。非 UI サーフェスでも purpose と observable outcomes は必須、route/screen identity は省略可。
