# 04_Sources

| SRC-ID   | Title                                                                             | Type            | Location                                                                                                               | Why it matters                                                                         |
| -------- | --------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| SRC-0001 | User request for v1.6.5 design upgrade                                            | conversation    | current thread                                                                                                         | Goal, scope, and breaking-change allowance                                             |
| SRC-0002 | Designing delightful frontends with GPT-5.4                                       | official blog   | https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4                                         | Latest official guidance on briefs, hierarchy, critique loops, and avoiding generic UI |
| SRC-0003 | AI支援によるWebサービスのデザイン改善を定量・実装可能にするエンジニア向けレポート | local research  | `C:\Users\YusukeSenaga\Downloads\AI支援によるWebサービスのデザイン改善を定量・実装可能にするエンジニア向けレポート.md` | Quantification, CI, metrics, tokens, and non-Figma implementation strategy             |
| SRC-0004 | spec-0013 UI/UX Definition & Review Framework                                     | repo spec       | `.qfai/specs/spec-0013/`                                                                                               | Existing foundation and current gaps                                                   |
| SRC-0005 | v1.5.7 discussion pack                                                            | repo discussion | `.qfai/discussion/discussion-20260315080059347/`                                                                       | Prior decisions and deltas for UI/UX framework                                         |
| SRC-0006 | UI Definition Consumption Protocol                                                | steering        | `.qfai/assistant/steering/ui-definition-protocol.md`                                                                   | Downstream reading order to be extended                                                |
| SRC-0007 | UI/UX Best Practices Reference                                                    | repo reference  | `.qfai/assistant/skills/qfai-discussion/references/ui_ux_best_practices.md`                                            | Existing UI/UX quality baseline                                                        |
| SRC-0008 | ChatGPT QFAI v1.6.4 UI/UX設計機構分析レポート                                     | local research  | `C:\Users\YusukeSenaga\Downloads\qfai_uiux_analysis_and_improvement_plan_v1.6.4.md`                                    | Generic UI 発生の構造的原因分析、10 改善提案、実装優先度整理                           |

## Work Orders Summary

| Step | Role (sub-agent) | Task title          | Input (refs)                                      | Output (refs)     | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------- | ------------------------------------------------- | ----------------- | -------------------- |
| 1    | researcher       | Source triage       | Official + local + repo inputs + ChatGPT analysis | Source candidates | PASS                 |
| 2    | orchestrator     | Source registration | Source candidates                                 | `04_Sources.md`   | PASS                 |
