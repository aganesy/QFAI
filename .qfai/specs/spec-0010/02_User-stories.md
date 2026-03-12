# 02 User Stories

## US Catalog

- US-0010-0001: Steering 文書構造定義 - 5 つの steering 文書の役割・責務・適用範囲を定義
- US-0010-0002: Instructions 文書構造定義 - 5 つの instructions 文書の役割・責務・適用範囲を定義
- US-0010-0003: Review Roster & RCP 定義 - 10 reviewers の構成とレビュープロセスルールを定義
- US-0010-0004: Constitution 位置づけ定義 - 非交渉条項 Article I〜IX の位置づけと適用範囲を定義
- US-0010-0005: Canonical Workflow Stages 定義 - Stage 0〜6 の全体像・入出力・遷移条件を定義

## US-0010-0001: Steering 文書構造定義

- Parent: CAP-0010
- Goal: 5 つの steering 文書（manifest.md, product.md, structure.md, tech.md, test-layers.md）について、各文書の役割・責務・適用範囲をフレームワーク設計仕様として定義する
- Non-goals: 各 steering 文書の逐語的複製（SSOT は `.qfai/assistant/steering/*.md`）
- Notes: REQ-0014 準拠。manifest は Decision Spine、product は Product Steering、structure は Structure Steering、tech は Tech Steering、test-layers は Test Layers Policy を担う

## US-0010-0002: Instructions 文書構造定義

- Parent: CAP-0010
- Goal: 5 つの instructions 文書（workflow.md, drift-protocol.md, constitution.md, agent-selection.md, requirements-decomposition.md）について、各文書の役割・責務・適用範囲をフレームワーク設計仕様として定義する
- Non-goals: 各 instructions 文書の逐語的複製（SSOT は `.qfai/assistant/instructions/*.md`）
- Notes: REQ-0015 準拠。workflow は SDD→ATDD→TDD→Verification パイプライン、drift-protocol は逸脱制御、constitution は 9 Articles、agent-selection はエージェント選択ルール、requirements-decomposition は要件分解ルールを担う

## US-0010-0003: Review Roster & RCP 定義

- Parent: CAP-0010
- Goal: 10 reviewers（qa-lead, qa-gatekeeper, reviewer, code-reviewer, architect-reviewer, qa-reviewer, frontend-reviewer, backend-reviewer, design-review-lead, runtime-gatekeeper）の構成、PASS/FAIL/N/A 評決ルール、FAIL 時のループ復帰ルール、append-only ポリシーを定義する
- Non-goals: 個別レビュー結果の記録、レビュー実行時の自動化実装
- Notes: REQ-0016 準拠。SSOT は `.qfai/assistant/steering/review-roster.yml`。Any FAIL → 即時修正 → 新 review-pack → 最初のレビュアーから再開

## US-0010-0004: Constitution 位置づけ定義

- Parent: CAP-0010
- Goal: Constitution の 9 Articles（Article I〜IX）について、各条項の位置づけ・適用範囲・例外なし原則をフレームワーク設計仕様として定義する
- Non-goals: 各 Article の逐語的複製（SSOT は `.qfai/assistant/instructions/constitution.md`）
- Notes: REQ-0017 準拠。Constitution は非交渉条項であり、すべてのエージェント・すべての Skill に適用される

## US-0010-0005: Canonical Workflow Stages 定義

- Parent: CAP-0010
- Goal: Stage 0（steering refresh）〜Stage 6（verify）の全 7 ステージについて、各ステージの目的・入力・出力・遷移条件を定義する
- Non-goals: 各 Stage の実装詳細、個別 Skill の内部処理フロー
- Notes: REQ-0018 準拠。Stage 0 は全 Skill の開始時に必須実行。Stage 4（prototyping）はオプショナル
