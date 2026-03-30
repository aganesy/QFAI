# 04_Sources

## Source Registry

| SRC-ID | Title | Type | Location / Reference | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| SRC-0001 | QFAI v1.7.9 Convergence Design Spec | Document | `C:\Users\YusukeSenaga\Downloads\qfai_v1.7.9_convergence_design_spec_v0.1.md` | 2026-03-30 | Canonical behavioral model, deliverables, PR slicing, release criteria |
| SRC-0002 | QFAI v1.7.9 Issue Register and Execution Plan | Document | `C:\Users\YusukeSenaga\Downloads\qfai_v1.7.9_issue_register_and_execution_plan_v0.1.md` | 2026-03-30 | V179-001..011 issue register, dependencies, release gates |
| SRC-0003 | qfai-discussion skill SSOT | Document | `.qfai/assistant/skills/qfai-discussion/SKILL.md` | 2026-03-30 | 15-file structure, OQ/deferred model, review gate rules |
| SRC-0004 | Discussion README | Document | `.qfai/discussion/README.md` | 2026-03-30 | Required output responsibilities |
| SRC-0005 | Review roster | Policy | `.qfai/assistant/steering/review-roster.yml` | 2026-03-30 | reviewer order, PASS/FAIL/N/A rules |
| SRC-0006 | RCP footer | Policy | `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` | 2026-03-30 | validate hard gate, review cycle restart rules |

## Traceability Notes

- REQ/NFR/OQ はすべて SRC-0001 または SRC-0002 に直接トレースする。
- discussion artifact の構造要件は SRC-0003 / SRC-0004 に従う。
- review artifact の execution order と verdict rule は SRC-0005 / SRC-0006 に従う。

## Trend Scan

0 items — 本パックは non-ui product の discussion であり、UI-bearing project 向け trend scan requirement 自体は REQ として扱うが、当該プロダクトの競合 UI trend 調査は不要。

## Competitive Reference Registry

0 items — non-ui pack のため対象なし。
