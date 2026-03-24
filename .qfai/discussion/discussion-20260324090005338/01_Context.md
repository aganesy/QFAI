# 01_Context

## Metadata

| Key | Value |
| --- | --- |
| Discussion ID | discussion-20260324090005338 |
| Date | 2026-03-24 |
| Owner | user |
| Source | QFAI v1.6.5 デザインディレクション＆UI品質強化（ChatGPT分析統合版） |

## Goal and Completion Criteria

- Goal: 前回パック(discussion-20260324054332396)の Design Direction Pack / Navigation / Render Critique / Fidelity 方針に加え、ChatGPT による QFAI v1.6.4 UI/UX 設計機構分析レポートの知見を統合し、generic UI 発生の構造的原因を根本から潰す discussion pack を完成させる。
- Measurable completion criteria:
  - discussion pack 15 ファイルが生成されている
  - ChatGPT レポートの 10 改善提案のうち v1.6.5 スコープ内のものが REQ/NFR に反映されている
  - Research-to-Constraint 変換、テンプレート高忠実度化、UI Contract 体験仕様拡張、Warning→Error 昇格 が要求として定義されている
  - `11_OQ-Register.md` の `Disposition: open` が 0 件
  - review roster の結果が `PASS`

## Stakeholders

- Primary stakeholders: QFAI maintainers, QFAI users, Claude Code / Codex / GitHub Copilot users
- Secondary stakeholders: downstream skills (`/qfai-sdd`, `/qfai-prototyping`, `/qfai-implement`, `/qfai-atdd`), review agents, validator maintainers

## Background

- 前回パック(discussion-20260324054332396)は Design Direction Pack、Navigation/Screen Flow、Render Critique Loop、Design Fidelity Evaluation の 4 capability を定義した。
- その後、ChatGPT による QFAI v1.6.4 の UI/UX 設計機構の網羅的分析レポート(SRC-0008)が提供された。
- レポートの中核判断: 「QFAI は UI を文書化し欠落を検知する仕組みだが、高品質 UI を強制する仕組みにはなっていない。AI は validator を通しやすい最も安い解(generic UI)を選ぶ。」
- 構造的原因として以下が特定された:
  1. Story Workshop テンプレートが generic すぎ、上流入力の品質が下流 UI 品質の上限を決めている
  2. Research Summary が discussion に閉じ、downstream の拘束条件に変換されていない
  3. UI Contract が要素台帳に留まり、体験仕様になっていない
  4. uiFidelity が DOM 充足に偏り、タスク完遂評価がない
  5. validator の多くが warning 止まりで品質を落とせない
  6. Fallback semantics が generic 補完を許している
- これらの知見を v1.6.5 スコープに統合する。

## Inputs

- User request: ChatGPT レポートの取り入れを検討し、v1.6.5 discussion pack に統合する
- Prior discussion: discussion-20260324054332396（v1.6.5 初版パック）
- ChatGPT analysis: `C:\Users\YusukeSenaga\Downloads\qfai_uiux_analysis_and_improvement_plan_v1.6.4.md`
- Existing repository facts:
  - `spec-0013`: UI/UX 定義・レビュー体系
  - `.qfai/assistant/steering/ui-definition-protocol.md`
  - `.qfai/assistant/skills/qfai-discussion/references/ui_ux_best_practices.md`
- External references:
  - OpenAI official blog: `Designing delightful frontends with GPT-5.4`
  - User report: `AI支援によるWebサービスのデザイン改善を定量・実装可能にするエンジニア向けレポート.md`

## Assumptions

- Primary target platform は Web first。
- Figma / Sketch は hard dependency にしない。
- QFAI は AI coding agent だけで完結する text-first workflow を維持する。
- 前回パック(discussion-20260324054332396)の採用判断は維持し、拡張する。
- ChatGPT レポートの Phase 1（すぐやるべき）+ Phase 2（次にやるべき）を v1.6.5 スコープに含める。Phase 3 は deferred。

## Key Issues

1. Story Workshop テンプレートが generic すぎ、下流の UI 品質上限を決めている
2. Research-to-Constraint 変換が弱く、調査結果が downstream 拘束条件にならない
3. UI Contract が要素台帳に留まり、体験仕様（purpose / primary_user_task / states）になっていない
4. uiFidelity が DOM 充足に偏り、taskFidelity（タスク完遂評価）がない
5. UI/UX 関連 validator の多くが warning 止まりで、品質を error で落とせない
6. Anti-pattern 検出が schema 妥当性チェックに留まり、実装 UI に当てていない
7. 複数案比較が mandatory でなく、AI が最安解に固定化しやすい

## Recommended Direction

- 前回パックの 4 capability（DDP / Navigation / Render Critique / Fidelity）を維持しつつ、ChatGPT レポートの構造的改善を requirements として追加する。
- Research-to-Constraint 変換、テンプレート高忠実度化、UI Contract 体験仕様拡張、Warning→Error 昇格を必須要求に含める。
- 複数案比較・競合参考 UI・qfai.config.yaml uiux policy を新規要求として追加する。

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | researcher | ChatGPT レポート分析 | SRC-0008 | 構造的改善候補リスト | PASS |
| 2 | orchestrator | Context 統合 | Prior pack, SRC-0008, repo SSOT | `01_Context.md` | PASS |
