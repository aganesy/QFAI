# 10 Plan — Web Research Enhancement

## Implementation approach

### Overview

CAP-0016 (Web Research Enhancement) は CLI エージェントの Web リサーチ能力を標準化するフレームワーク仕様である。実装は以下の 4 フェーズで段階的に進める。

### Phase 1: Pipeline Foundation + MCP Templates

**Scope**: REQ-0001, REQ-0002, REQ-0003, REQ-0004, REQ-0017, REQ-0018

- 標準リサーチパイプラインの 8 ステージインターフェース定義
- MCP 統合テンプレート作成:
  - Brave Search MCP (.mcp.json / config.toml / mcp-config.json)
  - Firecrawl MCP (local npx + hosted URL)
  - Playwright MCP (multi-CLI support)
- サンドボックス設定テンプレート作成 (FS/network restrictions per CLI agent)
- クロスエージェント設定テンプレート検証 (at least 2/3 agents)

**Deliverables**:

- `assets/init/.qfai/assistant/skills/web-research/SKILL.md` (pipeline definition)
- `assets/mcp-templates/brave-search/` (.mcp.json, config.toml, mcp-config.json)
- `assets/mcp-templates/firecrawl/` (.mcp.json, config.toml, mcp-config.json)
- `assets/mcp-templates/playwright/` (.mcp.json, config.toml, mcp-config.json)
- `assets/sandbox-templates/` (per-agent sandbox configs)

**Verification**: TC-0016-0001, TC-0016-0004, TC-0016-0021

### Phase 2: Security Hardening

**Scope**: REQ-0005, REQ-0006, REQ-0014, REQ-0016

- コンテンツサニタイゼーション層実装:
  - 制御文字除去
  - aria-hidden 要素除去
  - display:none 要素除去
- ドメイン/URL 許可リスト設定スキーマ定義
- リダイレクトチェーン検証
- レートリミット処理（429 検出 + バックオフ）
- MCP 障害復旧（クラッシュ検出 + フォールバック）

**Deliverables**:

- Content sanitization module (spec definition)
- Domain allowlist/denylist configuration schema (YAML)
- Rate limit handling specification
- MCP failure recovery specification

**Verification**: TC-0016-0005, TC-0016-0006, TC-0016-0009, TC-0016-0010, TC-0016-0011, TC-0016-0012, TC-0016-0013, TC-0016-0014, TC-0016-0020, TC-0016-0022, TC-0016-0025

### Phase 3: Skills & Observability

**Scope**: REQ-0007, REQ-0008, REQ-0009, REQ-0010, REQ-0015

- Web research SKILL.md テンプレート（YAML frontmatter + progressive disclosure）
- サブエージェントアーキテクチャ定義（Researcher/Implementer/Verifier 分離）
- 構造化リサーチログスキーマ定義
- キャッシュ戦略定義（hash(URL+etag)、24h デフォルト TTL）

**Deliverables**:

- Web research SKILL.md template
- Sub-agent architecture specification
- Research session log schema (JSON)
- Cache strategy specification

**Verification**: TC-0016-0007, TC-0016-0008, TC-0016-0015, TC-0016-0016, TC-0016-0023, TC-0016-0024

### Phase 4: Evaluation & HITL

**Scope**: REQ-0011, REQ-0012, REQ-0013

- 評価メトリクス定義（citation precision, coverage, freshness, security hygiene）
- ゴールデンタスク構造定義
- HITL レビューゲート定義（リスクベースのトリガー条件）
- セキュリティクリティカルゲートのバイパス防止

**Deliverables**:

- Evaluation metrics specification
- Golden task format definition
- HITL gate trigger condition specification
- HITL gate behavior specification (approve/reject/timeout)

**Verification**: TC-0016-0017, TC-0016-0018, TC-0016-0019, TC-0016-0020

## Test approach

### Layer Assignment

| Layer       | Coverage Target                                               | Annotation Pattern       |
| ----------- | ------------------------------------------------------------- | ------------------------ |
| Integration | Pipeline stages, sanitization, allowlist, cache, MCP recovery | `QFAI:SPEC-0034:TC-XXXX` |
| E2E         | Full research workflow, HITL gate flows                       | `QFAI:SPEC-0034:US-XXXX` |

### Test Location

- `packages/qfai/tests/integration/web-research/` — Pipeline stage tests, sanitization tests, allowlist tests
- `packages/qfai/tests/e2e/web-research/` — End-to-end research workflow tests, HITL flow tests

### Hard Gates

- Every `US-*` must be referenced from `tests/e2e/**`
- Every `TC-*` must be referenced from `tests/integration/**`
- `qfai validate --fail-on error` must pass with zero errors

### Test Priorities

1. **Must** (blocking): TC-0016-0001 (pipeline), TC-0016-0009 (injection defense), TC-0016-0012/TC-0016-0013 (allowlist), TC-0016-0015 (log completeness)
2. **Should** (high value): TC-0016-0005 (MCP crash), TC-0016-0006 (rate limit), TC-0016-0018 (HITL trigger)
3. **Could** (completeness): TC-0016-0017 (golden task eval), TC-0016-0024 (cache staleness)

## Risk mitigation

| Risk                                  | Mitigation                                                                     | Owner |
| ------------------------------------- | ------------------------------------------------------------------------------ | ----- |
| MCP server API changes                | Template versioning + compatibility matrix                                     | agent |
| Prompt injection vectors evolve       | Moderate sanitization baseline + extensible rule set                           | agent |
| Apify SSE deprecation (2026-04-01)    | Deferred to post-v1.8.0 (OQ-0003/DR-0082)                                      | agent |
| Cross-agent config format divergence  | Test against 2/3 agents per template; document agent-specific differences      | agent |
| Conservative defaults too restrictive | max_threads/max_depth configurable; defaults are safe starting point (DR-0085) | agent |

## Dependencies

- Brave Search API key (for integration testing)
- Firecrawl API key or local npx setup (for integration testing)
- Node 18+ and Docker (for MCP server testing)
- Existing QFAI validation infrastructure (`qfai validate`)
