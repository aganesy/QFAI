# 14_Review-Request

## Review Target

| Key           | Value                                            |
| ------------- | ------------------------------------------------ |
| Discussion ID | discussion-20260330153902875                     |
| Pack Path     | `.qfai/discussion/discussion-20260330153902875/` |
| Date          | 2026-03-30                                       |
| Requested By  | agent                                            |

## Review Scope

全 15 mandatory files を対象とする。

## Reviewer Roster

Roster SSOT: `.qfai/assistant/steering/review-roster.yml`

| #   | Reviewer ID              | Name                      | can_be_na |
| --- | ------------------------ | ------------------------- | --------- |
| 1   | qa-lead                  | Quality Lead              | false     |
| 2   | qa-gatekeeper            | QA Gatekeeper             | false     |
| 3   | reviewer                 | Independent Reviewer      | false     |
| 4   | code-reviewer            | Code Reviewer             | true      |
| 5   | architect-reviewer       | Architect Reviewer        | true      |
| 6   | qa-reviewer              | QA Reviewer               | true      |
| 7   | frontend-reviewer        | Frontend Reviewer         | true      |
| 8   | backend-reviewer         | Backend Reviewer          | true      |
| 9   | design-review-lead       | Design Review Lead        | true      |
| 10  | runtime-gatekeeper       | Runtime Gatekeeper        | true      |
| 11  | devils-advocate          | Devil's Advocate          | false     |
| 12  | pattern-doubler          | Pattern Doubler           | true      |
| 13  | integrated-uiux-reviewer | Integrated UI/UX Reviewer | true      |

## Review Focus

- v1.7.9 が convergence release として truthfully 定義されているか
- P0 / release-blocking P1 の scope と gate が明示されているか
- REQ/NFR/OQ/constraints/policy が `/qfai-sdd` へ十分接続できるか
- non-ui pack と UI-bearing support requirement の区別が明確か
- Mermaid diagram と Example Seeds が decision quality に足るか

## Pre-Review Checklist

- [x] All 15 mandatory files exist and are populated
- [x] `Disposition: open` count = 0 in `11_OQ-Register.md`
- [x] `13_Deferred.md` has table header with 0 items row
- [x] `02_Inception-Deck.md` includes Mermaid diagram
- [x] `03_Story-Workshop.md` includes Mermaid diagram
- [x] Example Seeds present in `03_Story-Workshop.md`
- [x] Surface type = non-ui (no uiux/ sidecar required)

## Review Execution Notes

- Execute reviewers in roster order.
- FAIL from any reviewer requires a new review pack and restart from reviewer 1.
- Common footer SSOT: `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`
