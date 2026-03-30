# 14_Review-Request

## Review Target

| Key           | Value                                     |
| ------------- | ----------------------------------------- |
| Discussion ID | discussion-20260330035428071               |
| Pack Path     | `.qfai/discussion/discussion-20260330035428071/` |
| Date          | 2026-03-30                                |
| Requested By  | agent                                     |

## Review Scope

全 15 mandatory files:

1. `01_Context.md`
2. `02_Inception-Deck.md`
3. `03_Story-Workshop.md`
4. `04_Sources.md`
5. `05_Scope.md`
6. `06_REQ.md`
7. `07_NFR.md`
8. `08_Glossary.md`
9. `09_Constraints.md`
10. `10_Policy.md`
11. `11_OQ-Register.md`
12. `12_OQ-Resolution-Log.md`
13. `13_Deferred.md`
14. `14_Review-Request.md`
15. `99_delta.md`

## Reviewer Roster

Roster SSOT: `.qfai/assistant/steering/review-roster.yml`

| # | Reviewer ID              | Name                      | can_be_na |
| - | ------------------------ | ------------------------- | --------- |
| 1 | qa-lead                  | Quality Lead              | false     |
| 2 | qa-gatekeeper            | QA Gatekeeper             | false     |
| 3 | reviewer                 | Independent Reviewer      | false     |
| 4 | code-reviewer            | Code Reviewer             | true      |
| 5 | architect-reviewer       | Architect Reviewer        | true      |
| 6 | qa-reviewer              | QA Reviewer               | true      |
| 7 | frontend-reviewer        | Frontend Reviewer         | true      |
| 8 | backend-reviewer         | Backend Reviewer          | true      |
| 9 | design-review-lead       | Design Review Lead        | true      |
| 10 | runtime-gatekeeper      | Runtime Gatekeeper        | true      |
| 11 | devils-advocate         | Devil's Advocate          | false     |
| 12 | pattern-doubler         | Pattern Doubler           | true      |
| 13 | integrated-uiux-reviewer | Integrated UI/UX Reviewer | true      |

## Pre-Review Checklist

- [x] All 15 mandatory files exist and are populated
- [x] `Disposition: open` count = 0 in `11_OQ-Register.md`
- [x] `13_Deferred.md` has table header (0 items)
- [x] `02_Inception-Deck.md` includes Mermaid diagram
- [x] `03_Story-Workshop.md` includes Mermaid diagram
- [x] Example Seeds present in `03_Story-Workshop.md`
- [x] Surface type = non-ui (no uiux/ sidecar required)

## Review Execution Notes

- Execution order: reviewers 1-10 → devils-advocate (11) → pattern-doubler (12) → integrated-uiux-reviewer (13)
- FAIL from any reviewer → immediate fix and full restart from reviewer 1
- RCP footer: `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`
