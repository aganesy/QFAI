# 01 Spec — Prototyping Playwright CLI Agent Harness

- Spec: spec-0017
- Parent: CAP-0017: `/qfai-prototyping` CLI-first visual review harness
- Delta source: spec-0012 (full-harness evidence), spec-0013 (design contracts), spec-0014 (validator slices), spec-0015 (reviewer gate), spec-0016 (web research)

## Consumer View

- Primary SSOT for execution: `spec-0017/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

This file is the primary SSOT for execution phases.
Execution agents read this file first, then access child files (02-10) for detail.

## Scope

### In

- Playwright CLI を唯一の標準ブラウザ操作手段として位置づける
- AI evaluator sub-agent が CLI を実行して画面操作・snapshot・screenshot・HTML 取得を行うレビューサイクルを定義する
- QFAI runtime / CLI / validator の責務を「評価実施の保証」に限定する (画像の見た目採点はしない)
- prototyping のモード差を `maxCycles` のみとする mode invariant を確立する
- 全モード (low-cost / standard / full-harness) で同一の最厳格レビュー gate を適用する
- `.qfai/evidence/prototyping/iterations/<cycle>/` 配下の cycle evidence path を標準化する
- review bundle (`review-bundle.json`) と Playwright CLI command plan (`playwright-commands.json`) と evaluator review (`evaluator-review.json`) の schema を定義する
- 新 CLI コマンド `qfai prototyping prepare` を追加する
- 旧 `browserProvider` / `renderProvider` config key、Node Playwright 直呼び provider、`capture-screenshots.js`、Playwright MCP 依存を破壊的に削除する
- `FullHarnessIterationEvidence` を `PrototypingCycleEvidence` に置換する

### Out

- Playwright MCP サーバーの標準サポート (任意プラグインとして将来再導入可能) (OOS-001)
- 画像ベースの機械的視覚採点アルゴリズム (OOS-002)
- ブラウザエンジン非 Chromium への対応 (OOS-003)
- AI evaluator sub-agent の LLM モデル選択・ファインチューニング (OOS-004)

## Applicable NFR

- NFR-0017: Mode Invariant Enforcement (maxCycles 以外のモード差が発生した場合 100% error)
- NFR-0018: Evidence Completeness (全 cycle で screenshot/HTML/snapshot/command log/evaluator review 5 種欠落ゼロ)
- NFR-0019: Review Cycle Determinism (同一 screen contract に対し review bundle / command plan は deterministic に生成)
- NFR-0020: Breaking Change Transparency (旧 key / 旧 asset / 旧 schema の検出時は明示 error、silent fallback 禁止)

## Applicable Policy

- Drift Protocol: Upstream artifact edits require user-approved Change Request
- Test-layer policy: `.qfai/assistant/steering/test-layers.md`
- Breaking changes allowed for v1.8.3+ (major bump 相当として扱う)

## Evidence Summary

- Planning session: codex session (2026-04-25) with user (yusuke_senaga)
- Reference article: Anthropic "Harness design for long-running application development" (https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Reference: Playwright Agent CLI docs (https://playwright.dev/agent-cli/capabilities)
- Approved plan: `C:\Users\YusukeSenaga\.claude\plans\ps-c-users-yusukesenaga-documents-githu-functional-unicorn.md`

## Relevant Requirements

- REQ-0001: Prototyping Mode Invariant
- REQ-0002: Playwright CLI Agent Harness
- REQ-0003: AI Evaluator Responsibility Boundary
- REQ-0004: Unified Strictest Completion Gate
- REQ-0005: Cycle-Centric Evidence Schema
- REQ-0006: Review Bundle & Command Plan Artifacts
- REQ-0007: `qfai prototyping prepare` CLI Command
- REQ-0008: Breaking Change Enforcement

## Requirements

### REQ-0001: Prototyping Mode Invariant

All prototyping modes MUST run the same Playwright CLI + AI evaluator review cycle with identical completion gates. The only mode-specific difference is `maxCycles`:

- `low-cost`: 1
- `standard`: 3
- `full-harness`: 20

No mode may weaken evidence requirements, reviewer gate, best-of-history, breakthrough detection, completion criteria, or obligation flags. Any runtime detection of a mode-dependent gate other than `maxCycles` MUST produce `QFAI-PROT-MODE-001` error.

### REQ-0002: Playwright CLI Agent Harness

QFAI MUST provide AI evaluator sub-agents with (a) deterministic Playwright CLI command plans and (b) deterministic evidence paths. The sole standard browser execution surface is `playwright-cli`. The following are prohibited in the standard config path: `browserProvider`, `renderProvider`, `playwright-mcp`, Node Playwright direct invocation.

### REQ-0003: AI Evaluator Responsibility Boundary

The AI evaluator sub-agent MUST perform visual evaluation using captured screenshots, HTML snapshots, and accessibility snapshots. QFAI MUST NOT score visual quality. QFAI validates existence, schema, reference integrity, and review cycle completeness only.

### REQ-0004: Unified Strictest Completion Gate

Every mode MUST satisfy ALL of the following to claim completion:

- 5→3→2→1 direction funnel completed
- winner-selection post polish cycle completed (≥ 1 polish cycle after winner selection)
- best-of-history evidence present
- breakthrough detection evidence present
- independent reviewer gate result `PASS`
- every reviewer sub-agent scored every evaluation axis at `100/100`
- `qfai validate --profile prototyping --fail-on error` passes
- missing evidence is not waived (no silent bypass)

### REQ-0005: Cycle-Centric Evidence Schema

`prototyping.json` MUST center on `cycles[]` of type `PrototypingCycleEvidence`. `FullHarnessIterationEvidence` is deprecated and MUST be replaced. Each cycle MUST reference:

- `playwright-commands.json` (command plan)
- `review-bundle.json` (evaluator input bundle)
- `evaluator-review.json` (evaluator output)
- per-screen `screenshot.png`, `html.html`, `snapshot.txt`, `command-log.json`

Canonical latest paths (`.qfai/evidence/prototyping/screenshots/<screen-id>.png`, `.../html/<screen-id>.html`) MUST be kept in sync with the latest cycle.

### REQ-0006: Review Bundle & Command Plan Artifacts

QFAI MUST produce, per cycle and per screen, a `PlaywrightCliCommandPlan` containing at minimum: `goto`, `snapshot`, `screenshot`, `html`, plus `interaction` entries derived from screen contract `primaryTasks` (natural language note; AI evaluator translates to click/fill). Output paths MUST be determined by QFAI.

The `review-bundle.json` MUST include: screen contract ref, design rubric axisDefs, design system checklist, previousScore ref or null, expected evidence paths, command plan ref.

### REQ-0007: `qfai prototyping prepare` CLI Command

A new command `qfai prototyping prepare --target-url <url> --mode <mode> --cycle <n>` MUST generate, for all declared screens, the review bundles and command plans for cycle `n`. This command MUST NOT perform evaluation. Output schema MUST match validate expectations.

### REQ-0008: Breaking Change Enforcement

Legacy config keys (`prototyping.execution.browserProvider`, `prototyping.execution.renderProvider`) MUST cause config load error. Legacy files (`packages/qfai/assets/scripts/capture-screenshots.js`, `playwrightBrowserQaProvider.ts`, `playwrightRenderAdapter.ts`, `assets/mcp-templates/playwright/`) MUST be removed. No silent aliasing to new keys.

## Entry Points

- US range in this spec: US-0017-0001..US-0017-0006
- Primary actors: Developer, AI Generator sub-agent, AI Evaluator sub-agent, Independent Reviewer sub-agent, Validator
- Notes: Replaces mode-dependent obligations from spec-0012 REQ-0022..0025 (see 09_delta.md)

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
