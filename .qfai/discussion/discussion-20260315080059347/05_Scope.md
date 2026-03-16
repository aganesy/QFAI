# 05_Scope

## In Scope

### 1. UI/UX ビジュアル定義体系

- **Design Token YAML**: W3C DTCG 準拠の Design Token スキーマ定義（primitive → semantic → component 3 層構造）
- **HTML+CSS Visual Mock**: discussion/spec 内に埋め込む自己完結型 HTML+CSS モック
- **Mermaid 画面遷移図**: stateDiagram / flowchart による画面遷移・ナビゲーション定義
- **UI Contract YAML 拡張**: 既存 CON-UI-XXXX フォーマットに Design Token 参照を追加

### 2. UI/UX 品質基準

- **ベストプラクティス体系化**: Nielsen's Heuristics、Gestalt 原則、各プラットフォームガイドライン等の体系化
- **アンチパターン体系化**: レイアウト、フォーム、ナビゲーション、フィードバック、モバイル、パフォーマンス、ダークパターン
- **プラットフォーム適応型基準**: Web/Windows/Mobile 各プラットフォームの固有基準

### 3. レビュー体系

- **自動チェック（qfai validate）**: Design Token 参照整合性、HTML 構文、アクセシビリティ基本チェック
- **手動レビュー（ui-ux-reviewer）**: 主観的 UX 判断、ユーザーフロー一貫性、ビジュアルバランス
- **アンチパターン検出**: 自動で検出可能な項目のルール化

### 4. 下流 skill 連携プロトコル

- **UI 定義消費プロトコル**: prototyping/ATDD/TDD skill が 3 点セット + UI Contract を読み取る手順
- **整合性チェック**: Design Token ↔ HTML mock ↔ UI Contract 間の整合性検証
- **変更伝播**: UI 定義変更時の下流 skill への影響検知

### 5. CLI UX 設計

- **QFAI CLI 出力の UX**: ターミナル出力フォーマット、色使い、プログレス表示、エラー表示
- **CLI レポートフォーマット**: validate/report コマンドの出力改善

### 6. 専門家サブエージェント体制

- **UI/UX Expert**: ユーザビリティ評価・認知負荷分析・情報設計・インタラクション設計
- **Design Expert**: ビジュアルデザイン・色彩・タイポグラフィ・レイアウト・Design Token 設計
- **Screen Transition Expert**: 画面遷移フロー設計・状態管理・条件分岐・エラー/例外遷移
- **Navigation Expert**: IA 構造設計・メニュー/タブ/サイドバー設計・ブレッドクラム・導線最適化
- **Integrated UI/UX Reviewer**: 4専門家の統合レビュー + サービス全体の使い勝手評価
- **Research-First Protocol**: 全専門家が作業冒頭でベストプラクティス/アンチパターンを必須リサーチ
- **全フェーズ活動**: discussion, SDD, prototyping, ATDD の各フェーズで専門家が関与
- **ゆるやかな責務分離**: 重複領域は複数専門家が協調、統合レビュアーが最終調整

## Out of Scope

| Item                                    | Reason                         | Future consideration     |
| --------------------------------------- | ------------------------------ | ------------------------ |
| Figma/Sketch 等のデザインツール直接連携 | v1.5.7 では text-based で完結  | v1.6.x 以降で検討        |
| ビジュアルリグレッションテスト          | スクリーンショット比較は別施策 | v1.6.x 以降で検討        |
| QFAI 自身の GUI/Web UI                  | CLI ツールの方針維持           | 需要次第                 |
| 特定 FW/プラットフォーム限定最適化      | プラットフォーム非依存を維持   | 各プロジェクトで都度対応 |
| リアルタイムコラボレーション            | 非同期ワークフローに集中       | v2.x で検討              |

## Success Criteria

1. **prototyping skill が正確に実装可能**: UI 定義 3 点セット（Design Token + HTML mock + Mermaid）から、prototyping skill がビジュアル通りのプロトタイプを実装できること
2. **レビューでアンチパターン検出可能**: qfai validate と ui-ux-reviewer が UI/UX アンチパターンを検出し、具体的な修正提案を出せること
3. **人間が見てわかる**: discussion/spec の UI 定義を人間が閲覧し、具体的な画面イメージが把握できること
4. **既存体系との整合性**: 既存の UI Contract YAML（CON-UI-XXXX）および prototyping 仕様（spec-0006）と矛盾なく統合できること
5. **専門家リサーチ品質**: 各専門家サブエージェントが作業冒頭で実施するリサーチが、対象プラットフォーム・ドメインに適した最新のベストプラクティス/アンチパターンを網羅していること
6. **統合的サービス品質**: 統合レビュアーが個別評価の総和ではなく、サービス全体のユーザー体験として一貫性・使いやすさを評価できること
