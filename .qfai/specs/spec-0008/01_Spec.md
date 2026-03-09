# 01 Spec

- Spec: spec-0008
- Parent: CAP-0008

## Consumer View

- Primary SSOT for execution: `spec-0008/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- SSOT 注記: エージェント定義の SSOT は `.qfai/assistant/agents/*.md` である。本 spec はフレームワーク設計意図を文書化する

## Scope

- In: Agent Delegation フレームワーク設計（エージェントカタログ、標準契約構造、Orchestrator Protocol、Work Orders）
- Out: 個別エージェントの実装詳細、CLI コマンド、ランタイム実行エンジン

## Applicable NFR

- （本 spec はフレームワーク設計 spec のため、直接的な NFR 参照なし）

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: エージェントカタログテーブル、標準契約テンプレート、Orchestrator Protocol 定義、Work Orders スキーマ

## Relevant Requirements

- REQ-0005: エージェントカタログ定義 — 39 のサブエージェントの ID・名前・ミッション・カテゴリ（planning, implementation, review, operations）を spec-0008 で定義
- REQ-0006: エージェント標準契約定義 — エージェントの標準契約構造（Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format）
- REQ-0007: Orchestrator Protocol 定義 — Orchestrator の制約（委任のみ・直接生成禁止・自己承認禁止）と Capability Probe / Simulation Mode
- REQ-0008: Work Orders 定義 — Work Orders Summary（テーブルスキーマ: Step, Role, Task title, Input refs, Output refs, Status）

## Entry points

- US range in this spec: US-0008-0001..US-0008-0004
- Primary actors: Orchestrator エージェント、サブエージェント、AI エージェント統合開発者
- Notes: Agent Delegation フレームワークの設計仕様。39 のサブエージェントの役割定義と委任プロトコルを規定する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
