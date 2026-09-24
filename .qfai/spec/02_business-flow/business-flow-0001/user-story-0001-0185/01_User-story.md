# US-0001-0185: Research Skill Packaging

## User Story

- Parent: CAP-0016
- Goal: Developer wants reusable SKILL.md definitions encoding research procedures with progressive disclosure for consistent research steps
- Non-goals: Runtime skill execution engine, IDE-specific skill integration
- Notes: Maps to REQ-0007, REQ-0008. YAML frontmatter with name, description, allowed-tools.

## Legacy Source Scope

### In

- 標準リサーチパイプライン定義 (search→rank→fetch→extract→sanitize→cache→verify→cite)
- MCP 統合テンプレート (Brave Search, Firecrawl, Playwright)
- コンテンツサニタイゼーション層
- ドメイン/URL 許可リスト設定スキーマ
- リサーチスキル SKILL.md テンプレート
- サブエージェントアーキテクチャ定義
- 構造化リサーチログスキーマ
- 評価メトリクス定義とゴールデンタスク構造
- HITL レビューゲート定義
- レートリミット処理とキャッシュ戦略
- MCP 障害復旧処理
- クロスエージェント設定テンプレート
- サンドボックス設定テンプレート

### Out

- カスタム MCP サーバー開発 (OOS-001)
- LLM モデル選択・ファインチューニング (OOS-002)
- GUI/IDE 固有実装 (OOS-003)
- RAG インフラ (OOS-004)
- 組織 IAM/SSO 統合 (OOS-005)
- 外部 API 課金管理 (OOS-006)
- Apify MCP 深度統合 (OOS-007, deferred to post-v1.8.0)

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0016/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0016/02_User-stories.md#us-0016-0003`
