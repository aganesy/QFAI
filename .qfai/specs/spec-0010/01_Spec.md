# 01 Spec

- Spec: spec-0010
- Parent: CAP-0010

## Consumer View

- Primary SSOT for execution: `spec-0010/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- SSOT 注記: Steering 文書の SSOT は `.qfai/assistant/steering/*.md`、Instructions 文書の SSOT は `.qfai/assistant/instructions/*.md` である。本 spec はフレームワーク設計意図を文書化する

## Scope

- In: Steering & Governance フレームワーク設計（Steering 文書構造、Instructions 文書構造、Review Roster & RCP、Constitution（Article I〜X）、Canonical Workflow Stages、AskUserQuestion MUST 化）
- Out: 各 Steering/Instructions 文書の逐語的複製、Review の実行時挙動、個別 Stage の実装詳細

## Applicable NFR

- NFR-0001: コンパクト耐性 — AskUserQuestion MUST ルールがコンテキストコンパクト実行後も有効であること（constitution.md P1 再読み込みで保証）
- NFR-0002: 文言一貫性 — 全ファイルで AskUserQuestion MUST 表現が統一されていること

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: Steering 文書カタログ、Instructions 文書カタログ、Review Roster スキーマ、Constitution Articles 一覧（I〜X）、Canonical Workflow Stages 定義、AskUserQuestion MUST 化 discussion-20260314053646704

## Relevant Requirements

- REQ-0014: Steering 文書構造定義 — 5 つの steering 文書（manifest, product, structure, tech, test-layers）の役割・責務・適用範囲
- REQ-0015: Instructions 文書構造定義 — 5 つの instructions 文書（workflow, drift-protocol, constitution, agent-selection, requirements-decomposition）の役割・責務・適用範囲
- REQ-0016: Review Roster & RCP 定義 — 10 reviewers の構成・PASS/FAIL/N/A ルール・ループ復帰ルール・append-only ポリシー
- REQ-0017: Constitution 位置づけ定義 — 非交渉条項 Article I〜X の位置づけ・適用範囲・例外なし原則
- REQ-0018: Canonical Workflow Stages 定義 — Stage 0（steering refresh）〜Stage 6（verify）の全体像・各ステージの入出力・遷移条件
- REQ-0019: AskUserQuestion MUST 化 — 全 9 QFAI スキルで AskUserQuestion 使用を MUST とし、constitution.md Article X として非交渉条項化
- REQ-0020: communication.md AskUserQuestion セクション — 使用義務・フォールバック・--auto 整合性を明記
- REQ-0021: フォールバック手順定義 — 技術的に利用不可能な場合の明示的フォールバック手順
- REQ-0022: --auto フラグ整合性 — --auto 使用時の AskUserQuestion ゼロ質問ルール明記

## Entry points

- US range in this spec: US-0010-0001..US-0010-0006
- Primary actors: Orchestrator エージェント、サブエージェント、フレームワーク設計者
- Notes: Steering & Governance フレームワークの設計仕様。プロジェクトの統治構造全体（文書体系・レビュー・憲法・ワークフロー）を規定する

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
