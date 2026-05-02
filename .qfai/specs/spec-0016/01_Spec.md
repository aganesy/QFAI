# 01 Spec — Web Research Enhancement

- Spec: spec-0016
- Parent: CAP-0016: Web リサーチ能力強化
- Status: active
- Superseded-by: -
- Deprecated-at: -

## Consumer View

- Primary SSOT for execution: `spec-0016/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

This file is the primary SSOT for execution phases.
Execution agents read this file first, then access child files (02-08) for detail.

## Scope

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

## Applicable NFR

- NFR-0001: Prompt Injection Resistance (100% block rate against OWASP test suite)
- NFR-0002: Secret Non-Exposure (zero credential exposure)
- NFR-0003: Sandbox Default-Deny (zero unauthorized domain access)
- NFR-0004: Search Latency (p95 < 5s)
- NFR-0005: Fetch+Extract Latency (p95 < 15s/URL)
- NFR-0006: MCP Failure Recovery (< 10s)
- NFR-0007: Rate Limit Compliance (zero violations after initial 429)
- NFR-0008: Configuration Portability (2/3 CLI agent compatibility)
- NFR-0009: Research Audit Trail (100% log completeness)
- NFR-0010: Setup Time (< 15min for experienced developer)
- NFR-0011: Node.js Version (18 LTS + 22 LTS)
- NFR-0012: OWASP LLM Top 10 (documented mitigation)

## Applicable Policy

- Drift Protocol: Upstream artifact edits require user-approved Change Request
- Test-layer policy: `.qfai/assistant/steering/test-layers.md`

## Evidence Summary

- Discussion pack: discussion-20260328212829687
- Preflight: .qfai/report/preflight_summary.md
- Source: SRC-0001 (deep research report on CLI agent web research enhancement)

## Relevant Requirements

- REQ-0001 to REQ-0018 (see 04_Business-Rules.md for BR decomposition)

## Entry Points

- US range in this spec: US-0016-0001..US-0016-0008
- Primary actors: Developer, CLI Agent, Security Reviewer, QA Engineer
- Notes: User stories map from discussion US-WR-001..US-WR-008

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: term or concept unclear → `_policies/06_Glossary.md`
- Conflict: spec conflicts with another spec → `_policies/08_Decisions.md`
- Missing: constraint or policy not in spec → `_policies/07_Constraints.md`
- Trade-off: competing concerns → `_policies/01_Objective.md`, `_policies/08_Decisions.md`

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
