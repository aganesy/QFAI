---
category: project
update-frequency: occasional
dependencies:
  - 00_universal/thinking.md
  - 00_universal/quality.md
  - 00_universal/communication.md
  - 01_specialties/planning.md
  - 01_specialties/testing.md
  - 02_project/development.md
  - 02_project/tech-stack.md
  - 02_project/patterns.md
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 仕様書駆動開発（SDD）運用ガイド

本プロジェクトにおける Spec-Driven Development（SDD: 仕様書駆動開発）の運用を、成果物（ドキュメント）と品質ゲートを中心に定義する。

## SDD の要点（本プロジェクト版）

- **仕様書を一次成果物（Source of Truth）として扱う**: 実装は仕様書から導く。実装で発見した差分は「コードを直す」だけでなく「仕様書へ戻す」ことを基本とする。
- **分割して合意する**: 要件→仕様書→チケット→実装→検証 を段階化し、各段階でレビュー可能な粒度に落とす。
- **曖昧さの排除を優先**: 95% 以上の確信が持てない前提は質問で潰す（推測で進めない）。
- **トレーサビリティを維持**: 要件→仕様書→チケット→テスト観点 の対応を残す。

## 全体フロー（成果物ベース）

```text
.professional/require（入力: お客様提供ドキュメント）
        ↓
.professional/specification（出力: 内部仕様書・詳細設計）
        ↓
.professional/ticket（出力: 実装チケット）
        ↓
src/（実装） → テスト → レビュー
```

## フェーズ別の重要事項と成果物

### Phase 0: 準備（前提・ツール）

**目的**: 要件ソース（PDF 等）を確実に読める状態と、既存パターン参照の前提を揃える。

- 前提ドキュメント: `AGENTS.md`, `.instruction/02_project/*`
- 推奨 MCP（詳細は `.instruction/02_project/mcp.md`）:
  - PDF→Markdown: `markitdown`
  - PDF→画像: `vibe-pdf-read`（スキャン PDF 対応のため）
  - OCR: `ocr`（画像化した PDF ページの文字起こし）
  - セマンティック検索/安全編集: `serena`
  - 公式ドキュメント参照: `context7`
  - UI 実挙動確認: `chrome-devtools`（必要時）

**品質ゲート（最低限）**:

- 仕様の入力（`.professional/require`）を読み取れること（テキスト抽出できない場合は OCR へ切替）

### Phase 1: 要件の取り込み（.professional/require）

**目的**: 要件ソースを読み込み、業務背景・機能要件・非機能要件・制約・用語を整理する。

- 入力: `.professional/require/**`（md/csv/pdf/xlsx 等）
- 成果物（最低限）:
  - `.professional/specification/overview.md` に「業務背景・機能一覧・制約」を反映（次フェーズで生成）
  - 不明点リスト（レビュー時に提示）

**運用上の停止条件（重要）**:

- 要件ソースに取り消し線が含まれる場合は運用ルール違反として停止し、該当箇所を報告する（詳細はプロンプト参照）。

### Phase 2: 内部仕様書（.professional/specification）

**目的**: 実装可能な詳細度で、仕様の一貫性と境界（スコープ/対象外）を確定する。

- 生成コマンド（Copilot）: `/requirements-to-specifications` または `/requirements-to-tickets`
- 成果物:
  - `.professional/specification/overview.md`（全体設計・機能一覧・分割方針）
  - `.professional/specification/spec-XXX.md`（機能別詳細仕様）

**本プロジェクト固有の制約（必ず反映）**:

- 認証/ログイン機能は実装対象外（既存 `src/frontend/providers/auth-provider.tsx` を前提）
- メニュー画面は個別画面として作らず、サイドバーのメニュー一覧で実現
- 画面デザインは要件の画面イメージを踏襲せず、既存 UI（`src/frontend/components/ui/`）を最大限活用

**品質ゲート（最低限）**:

- 機能一覧の各項目が、いずれかの `spec-XXX.md` でカバーされている
- `overview.md` と `spec-XXX.md` の間に矛盾がない

### Phase 3: チケット化（.professional/ticket）

**目的**: 実装/テスト/完了条件が明確な「実行単位」を作る。

- 生成コマンド（Copilot）: `/specification-to-tickets` または `/requirements-to-tickets`
- 成果物:
  - `.professional/ticket/ticket-XXX.md`（チェックボックス付き実装手順 + テスト設計 + 完了条件）

**品質ゲート（最低限）**:

- 全 `spec-XXX.md` が、いずれかの `ticket-XXX.md` に対応している
- 各チケットに「テスト観点」と「完了条件」がある
- 依存関係が矛盾していない（実装順が決められる）

### Phase 4: 実装（src/）

**目的**: チケットを仕様どおりに実装し、テストで裏付ける。

- 実装前:
  - 既存実装パターン（`.instruction/02_project/patterns.md`）を確認
  - 不明点が残る場合は実装せず質問する
- 実装後（TypeScript 変更がある場合）:
  - `pnpm format:check && pnpm lint && pnpm check-types`
  - 必要に応じて `pnpm test:unit` / `pnpm test:integration` / `pnpm test:e2e`

## 役割分担（推奨）

- 要件の解釈/曖昧性排除: `.github/agents/requirements-analyst.agent.md`
- アーキテクチャ/分割方針/影響分析: `.github/agents/architect.agent.md`
- 実装: `.github/agents/frontend-developer.agent.md`, `.github/agents/backend-developer.agent.md`, `.github/agents/database-developer.agent.md`
- テスト: `.github/agents/unit-test-engineer.agent.md`, `.github/agents/integration-qa.agent.md`
- セキュリティ観点: `.github/agents/security-analyst.agent.md`, `.github/agents/security-reviewer.agent.md`
- 変更後レビュー: `.github/agents/code-reviewer.agent.md`
