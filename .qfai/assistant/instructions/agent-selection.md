---
id: agent-selection
category: project
update_frequency: occasional
---

# Agent Selection (Delegation playbook)

## Goal

Delegate work to specialized roles to reduce blind spots and improve quality.

## Feedback quality rule (all agents)

- 全てのサブエージェントは、フィードバック（特に FAIL 判定）を提出する際、具体的な代替案・修正案を必ず記載しなければならない。
- 代替案のない否定的フィードバックは無効とし、再判定を要求する。

## Default delegation map

- **Researcher**: collect pre-knowledge (English sources), glossary, risks, and question angles
- **Orchestrator**: plan, delegate, integrate, and enforce stage gates (no direct implementation)
- **Test Volume Estimator**: compute ATDD floors and detect underestimation
- **OQ Harvester**: extract undefined/ambiguous decisions and draft question candidates
- **OQ Reviewer**: review OQ candidates for completeness, neutrality, and safe deferral
- **Option Explorer**: propose multiple solution options + trade-offs + recommendation for 09_delta.md
- **Option Reviewer**: review options for bias, missing alternatives, and unsafe deferrals
- **Requirements Analyst**: clarify intent, scope, acceptance criteria, open questions
- **Planner**: plan phases, risks, gating, rollback strategy
- **Architect**: design, boundaries, compatibility considerations
- **Contract Designer**: contracts (UI/API: YAML, DB: SQL), IDs, indexing implications
- **QA Engineer**: risk-based checks, regression scope, quality gate review
- **Test Engineer**: US/TC/CON-API obligations and test scaffolding strategy
- **ATDD Implementers**: E2E/API/Integration implementation per required coverage (`US` / `TC` / `CON-API`)
- **Front-end / Back-end Engineer**: implementation within repo conventions
- **UI/UX Reviewer**: layout sanity, interaction usability, and UI guardrail checks
- **DevOps/CI Engineer**: verify-pack/CI impacts
- **Code Reviewer**: style, maintainability, correctness
- **Reviewer**: non-edit completion audit (PASS/FAIL + rework list)
- **Runtime Gatekeeper**: runtime evidence and smoke verification
- **Prototyping Coverage Auditor**: detect missing spec rows and unresolved checks in prototyping coverage evidence
- **Doc Steward**: doc impact analysis and README/mermaid updates
- **Devil's Advocate (devils-advocate)**: challenge all assumptions as fundamentally wrong, provide concrete alternatives for every objection
  - 責務: 「現状すべてが間違っている」という前提でレビューし、こじつけ・屁理屈・全否定を駆使して自分のビジョン（あるべき姿）を提示する
  - 委任ルール: 既存10レビュアーの後（11番目）に実行。FAIL時は必ず代替案を提示。代替案なしFAILは無効。3回連続FAILでアドバイザリー降格（当該サイクル限定）
  - 選択シナリオ: 全スキルのレビューサイクルで必ず実行（can_be_na: false）。設計・仕様・要件の盲点発見が目的
- **Pattern Doubler (pattern-doubler)**: demand 2x the current ID-bearing pattern count, propose concrete additions with rationale
  - 責務: ID付き項目（US, AC, BR, EX, TC）の数を現状の2倍に増やすよう、こじつけ・屁理屈・全否定を駆使して不足パターンを指摘する
  - 委任ルール: 既存10レビュアーの後（12番目、devils-advocateの後）に実行。追加パターンの根拠提示が必須
  - 選択シナリオ: /qfai-sdd のレビューサイクルで実行。spec packにID付き項目がない場合のみN/A可（can_be_na: true）

## If subagents are not supported

Emulate the delegation by doing role-by-role analysis in order:
Requirements → Plan → Design → Contracts → Tests → Implementation → Review → QA.
