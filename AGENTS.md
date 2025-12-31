# AI Agent Instructions（Universal）

このファイルは全AIエージェント共通の作業ルール。  
詳細は `.instruction/` 配下の各ドキュメントを参照し、必要に応じて読み直す。

## 言語

- 報告/Plan/最終出力は日本語。
- ユーザーが明示しない限り、この言語ルールを優先する。

## コア姿勢

- 常に「なぜ」を掘り、目的/制約/完了条件を先に確定する。
- 正常系だけでなく異常系・境界値・運用時の振る舞いも同等に扱う。
- 技術/ビジネス/UX/セキュリティ/運用の多面的視点で影響を評価する。
- 95% 以上確信できない前提は質問で潰し、推測で進めない。

## 作業開始前の整理（必須）

着手前に関連ファイル/仕様を読み、以下を短く構造化して明文化する。

1. 目的と完了条件（測定可能な形で）
2. 既存構造・パターン・制約
3. 影響範囲とリスク（機能/性能/UX/セキュリティ/運用）
4. 実装案の候補（標準/保守的/大胆）と比較、推奨理由
5. 不明点・確認事項

必要ならこの時点で質問を投げ、回答を待ってから進める。

## 計画（Plan）

- 3ステップ以上、複数領域に跨る、選択肢がある、高リスクの場合は Plan を作る。
- Plan は 1-2時間程度の粒度で小さく分解し、テスト方針とリスク対策も含める。
- 実行中に前提が変わったら Plan を更新して共有する。

Planテンプレート:

- ゴール/完了条件
- インプット（仕様/制約/依存）
- スコープ（やる/やらない）
- 手順（小さなステップ）
- テスト方針
- リスクと確認点

## 実装ガイド

- 既存の型/ユーティリティ/実装パターンを最優先で再利用する。
- 変更は小さく段階的に。局所修正→検証→次の順で進める。
- SOLID/KISS/YAGNI/DRY を自己レビュー基準にする。
- 型安全を徹底し `any`・型無効化（`@ts-ignore`等）を原則禁止する。
- 入力は型とバリデーションで検証し、失敗パスを先に書く。
- 早期 return でネストを浅くし、読みやすさと責務を守る。
- ログ/エラーメッセージは具体的かつ最小限。秘密情報を含めない。
- N+1 や不要な全件取得を避け、必要ならバッチ/キャッシュ/差分取得を検討する。
- 既存パターンから逸脱する場合は、理由・代替案・影響を明記する。

## デザイン/UXの観点

- ユーザー行動と必須入力、エラー時の導線が定義されているか確認する。
- 状態は最小限にし、責務ごとに hooks/コンポーネントを分割する。
- アクセシビリティや国際化が必要な場合は初期設計に含める。
- 大きなリスト/重い描画は避け、必要ならメモ化やページングを設計する。

## 調査・デバッグ

- まず事象を再現し、期待/実際/環境を記録する。
- 影響範囲を特定し、仮説を列挙して優先度順に検証する。
- 再現テスト追加→修正→再実行で副作用も確認する。
- 報告は「事象/再現/期待・実際/環境/調査結果/修正/テスト/残リスク」。

## テスト・検証

- 振る舞い変更・バグ修正は再現テストを先に書く。
- 近傍の適切な層（unit/integration/e2e）でカバーする。
- 実行コマンドと結果（成功/失敗）を必ず報告する。
- 実行できない場合は理由と代替確認手段を書く。
- TypeScriptファイルを変更したら、必ず  
  `pnpm format:check && pnpm lint && pnpm check-types`  
  を実行し結果を報告する。

## 品質評価/自動化

- 正確性/安全性/性能/運用性/可読性の観点でリリース可否を判断する。
- 自動チェックの優先度は Lint/Format → 型 → テスト → メトリクス監視。
- カバレッジ、複雑度、重複度、性能劣化などの変化を意識する。

## コミュニケーション

- 不明点や分岐判断が必要な場合、即相談し最小限の質問で具体化する。
- 30分以上かかりそうな作業は途中経過を短く共有する。
- 完了時は「変更概要/影響範囲/実行テスト/残リスク」を箇条書きで報告する。
- トーンは簡潔に（要点4行以内を目安、コード/ログ除く）。

## レビュー運用（追加ルール）

- PR確認で追加指摘が0件なら、5分待機して再確認する。
- 追加指摘が0件の確認を4回連続で満たしたら完了とみなす。

質問テンプレート:

1. 現状理解
2. 不明点
3. 選択肢
4. 推奨案と理由
5. 追加で欲しい情報

## サブエージェント/分担（必要時）

- 役割が明確なサブエージェントがいる場合は委譲を検討する。
- Plan で担当範囲を分け、統合後に必ず全体テスト/整合確認を行う。

---

## `.instruction` ドキュメント参照ガイド（ユースケース）

### Universal（常に前提）

- 思考・分析の型: `.instruction/00_universal/thinking.md`
- 品質基準/自信度/レビュー報告: `.instruction/00_universal/quality.md`
- 質問/確認/進捗/完了報告の型: `.instruction/00_universal/communication.md`
- SOLID/KISS/YAGNI/DRY チェック: `.instruction/00_universal/development-principles-checklist.md`

### 計画/設計系

- 計画の立て方: `.instruction/01_specialties/planning.md`
- 相談・レビューの進め方: `.instruction/01_specialties/consultation.md`
- 設計レビュー指針（UI/UX/API）: `.instruction/01_specialties/design.md`

### 実装/原則

- 実装ガイド: `.instruction/01_specialties/implementation.md`
- 開発原則チェックリスト（詳細）: `.instruction/01_specialties/development-principles-checklist.md`
- 品質自動化ガイド（CI/ゲート）: `.instruction/01_specialties/development-principles-automation.md`
- 開発原則の測定指標: `.instruction/01_specialties/development-principles-metrics.md`

### テスト/品質判断

- テスト指針: `.instruction/01_specialties/testing.md`
- 品質評価の観点（リリース判断）: `.instruction/01_specialties/quality-evaluation.md`

### 調査/障害対応

- 調査・デバッグ手順: `.instruction/01_specialties/investigation-debug.md`

### プロジェクト理解（このリポジトリ限定）

- プロジェクト構成: `.instruction/02_project/architecture.md`
- 採用技術一覧（言語/フレームワーク/ライブラリ等）: `.instruction/02_project/tech-stack.md`
- 開発手順とコマンド: `.instruction/02_project/development.md`
- ドメイン概要: `.instruction/02_project/domain.md`
- 実装パターン: `.instruction/02_project/patterns.md`
- SDD運用: `.instruction/02_project/spec-driven-development.md`
- MCP運用: `.instruction/02_project/mcp.md`
- エージェント選択: `.instruction/02_project/agent-selection.md`
- オーケストレータ運用: `.instruction/02_project/orchestrator.md`

### AIツール別の癖/運用

- Codex ベストプラクティス: `.instruction/03_ai-agents/codex/best-practices.md`
- Codex よく使うコマンド: `.instruction/03_ai-agents/codex/commands.md`
- Claude Code 運用: `.instruction/03_ai-agents/claude-code/*`
- Copilot ベストプラクティス: `.instruction/03_ai-agents/copilot/best-practices.md`

---

## 具体的な作業シナリオ

※各シナリオで列挙したパスの用途は、直前の「`.instruction` ドキュメント参照ガイド（ユースケース）」を参照する。

- 新機能追加
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/planning.md`
  4. `.instruction/01_specialties/implementation.md`
  5. `.instruction/01_specialties/testing.md`
  6. `.instruction/00_universal/quality.md`
- バグ修正
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/investigation-debug.md`
  4. `.instruction/01_specialties/testing.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/00_universal/quality.md`
- リファクタリング
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/planning.md`
  4. `.instruction/01_specialties/development-principles-checklist.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
- パフォーマンス改善
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/planning.md`
  4. `.instruction/01_specialties/implementation.md`
  5. `.instruction/01_specialties/development-principles-metrics.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
- セキュリティ/権限/入力検証の変更
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/design.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/01_specialties/quality-evaluation.md`
  8. `.instruction/00_universal/quality.md`
- UI/UX改修
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/design.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
- 情報設計/画面遷移の変更
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/design.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
- API/スキーマ設計変更
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/design.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/01_specialties/quality-evaluation.md`
  8. `.instruction/00_universal/quality.md`
- データモデル/DB変更の影響調査
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/02_project/architecture.md`
  4. `.instruction/02_project/domain.md`
  5. `.instruction/01_specialties/investigation-debug.md`
  6. `.instruction/01_specialties/planning.md`
  7. `.instruction/00_universal/quality.md`
- GraphQLクエリ/ミューテーション追加
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/02_project/patterns.md`
  4. `.instruction/01_specialties/implementation.md`
  5. `.instruction/01_specialties/testing.md`
  6. `.instruction/00_universal/quality.md`
- 既存パターンが不明/迷う
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/02_project/architecture.md`
  4. `.instruction/02_project/patterns.md`
  5. `.instruction/01_specialties/consultation.md`
  6. `.instruction/01_specialties/implementation.md`
  7. `.instruction/00_universal/quality.md`
- 仕様が曖昧/選択肢が多い相談
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/00_universal/communication.md`
  4. `.instruction/01_specialties/consultation.md`
  5. `.instruction/01_specialties/planning.md`
  6. `.instruction/00_universal/quality.md`
- 大規模変更/影響が広い作業
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/planning.md`
  4. `.instruction/01_specialties/consultation.md`
  5. `.instruction/02_project/architecture.md`
  6. `.instruction/01_specialties/implementation.md`
  7. `.instruction/01_specialties/testing.md`
  8. `.instruction/01_specialties/quality-evaluation.md`
  9. `.instruction/00_universal/quality.md`
- 依存更新/新ライブラリ導入
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/planning.md`
  4. `.instruction/01_specialties/development-principles-automation.md`
  5. `.instruction/01_specialties/development-principles-metrics.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/01_specialties/quality-evaluation.md`
  8. `.instruction/00_universal/quality.md`
- CI/自動化/品質ゲート改善
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/development-principles-automation.md`
  4. `.instruction/01_specialties/development-principles-metrics.md`
  5. `.instruction/01_specialties/planning.md`
  6. `.instruction/01_specialties/implementation.md`
  7. `.instruction/01_specialties/testing.md`
  8. `.instruction/00_universal/quality.md`
- メトリクス悪化の原因調査
  1. `.instruction/01_specialties/development-principles-metrics.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/investigation-debug.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
- テスト追加/改善のみ
  1. `.instruction/01_specialties/testing.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/implementation.md`
  4. `.instruction/00_universal/quality.md`
- テスト失敗の調査
  1. `.instruction/01_specialties/investigation-debug.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/testing.md`
  4. `.instruction/01_specialties/implementation.md`
  5. `.instruction/00_universal/quality.md`
- リリース前の総合チェック
  1. `.instruction/01_specialties/quality-evaluation.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/development-principles-metrics.md`
  4. `.instruction/01_specialties/testing.md`
  5. `.instruction/00_universal/quality.md`
- 開発環境が動かない/セットアップ確認
  1. `.instruction/02_project/development.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/investigation-debug.md`
  4. `.instruction/00_universal/communication.md`
  5. `.instruction/00_universal/quality.md`
- ドメイン理解が必要な仕様相談
  1. `.instruction/02_project/domain.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/00_universal/thinking.md`
  4. `.instruction/00_universal/communication.md`
  5. `.instruction/01_specialties/consultation.md`
  6. `.instruction/01_specialties/planning.md`
- アクセシビリティ改善
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/design.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
- 国際化/多言語対応
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/design.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
- エラーメッセージ/ログ改善
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/implementation.md`
  4. `.instruction/01_specialties/testing.md`
  5. `.instruction/00_universal/quality.md`
- 監視/運用フックの追加
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/design.md`
  4. `.instruction/01_specialties/planning.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/01_specialties/development-principles-metrics.md`
  8. `.instruction/00_universal/quality.md`
- 仕様変更の影響調査のみ
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/02_project/architecture.md`
  4. `.instruction/02_project/domain.md`
  5. `.instruction/01_specialties/investigation-debug.md`
  6. `.instruction/01_specialties/planning.md`
- ドキュメント更新
  1. `.instruction/00_universal/thinking.md`
  2. `.instruction/00_universal/communication.md`
  3. `.instruction/00_universal/quality.md`
- サブエージェント分担が有効なタスク
  1. `.instruction/02_project/orchestrator.md`
  2. `.instruction/02_project/tech-stack.md`
  3. `.instruction/01_specialties/planning.md`
  4. `.instruction/01_specialties/consultation.md`
  5. `.instruction/01_specialties/implementation.md`
  6. `.instruction/01_specialties/testing.md`
  7. `.instruction/00_universal/quality.md`
