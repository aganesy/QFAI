# Review Request

## Review Scope

| Key         | Value                                            |
| ----------- | ------------------------------------------------ |
| Target      | `.qfai/discussion/discussion-20260307180000000/` |
| Layer       | discussion                                       |
| Review Pack | `.qfai/review/review-20260307180000000/`         |
| Created At  | 2026-03-07T18:00:00.000Z                         |
| Roster      | `.qfai/assistant/steering/review-roster.yml`     |

## Target Files

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

## Review Criteria

- [ ] Context -> Inception Deck -> Story Workshop の因果が通っているか
- [ ] REQ と NFR の境界が崩れていないか
- [ ] Glossary / Constraints / Policy が意思決定の入力として使える粒度か
- [ ] 99_delta.md が検討ログを持っているか
- [ ] 11_OQ-Register.md に open+Gate が残っていないか
- [ ] 03_Story-Workshop.md に図があるか

## Reviewers

| #   | ID                 | Role                 | Scope                 |
| --- | ------------------ | -------------------- | --------------------- |
| R01 | qa-lead            | Quality Lead         | discuss, require, sdd |
| R02 | qa-gatekeeper      | QA Gatekeeper        | discuss, require, sdd |
| R03 | reviewer           | Independent Reviewer | discuss, require, sdd |
| R04 | code-reviewer      | Code Reviewer        | discuss, require, sdd |
| R05 | architect-reviewer | Architect Reviewer   | discuss, require, sdd |
| R06 | qa-reviewer        | QA Reviewer          | discuss, require, sdd |
| R07 | frontend-reviewer  | Frontend Reviewer    | discuss, require, sdd |
| R08 | backend-reviewer   | Backend Reviewer     | discuss, require, sdd |
| R09 | design-review-lead | Design Review Lead   | discuss, require, sdd |
| R10 | runtime-gatekeeper | Runtime Gatekeeper   | discuss, require, sdd |

## RCP Rules

- Review Completion Process follows `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`
- Each reviewer returns PASS / FAIL / N/A
- N/A requires na_rule justification
- Any FAIL triggers immediate rework cycle
- After rework, a new review cycle is created and roster is re-executed from R01
