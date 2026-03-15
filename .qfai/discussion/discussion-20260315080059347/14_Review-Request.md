# 14_Review-Request

## Review Target

- **Scope**: discussion
- **Pack**: `.qfai/discussion/discussion-20260315080059347/`
- **Roster**: `.qfai/assistant/steering/review-roster.yml` + Integrated UI/UX Reviewer (13th)
- **Cycle**: 2 (drift update: specialist sub-agent additions)

## Review Files (15 mandatory)

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

## Pre-Review Gate Check

- [ ] All 15 files exist and are populated
- [ ] `Disposition: open` count = 0 in `11_OQ-Register.md`
- [ ] `02_Inception-Deck.md` includes at least one Mermaid diagram
- [ ] `03_Story-Workshop.md` includes at least one Mermaid diagram
- [ ] `03_Story-Workshop.md` includes HTML+CSS screen mock
- [ ] `03_Story-Workshop.md` includes Example Seeds with perspective coverage
- [ ] Deferred items (if any) have full metadata in `13_Deferred.md`
- [ ] `qfai validate --fail-on error --format github` passes

## Requested Reviewers

Per `.qfai/assistant/steering/review-roster.yml`:

| #   | Reviewer ID              | Name                      | Scope   |
| --- | ------------------------ | ------------------------- | ------- |
| 1   | qa-lead                  | Quality Lead              | discuss |
| 2   | qa-gatekeeper            | QA Gatekeeper             | discuss |
| 3   | reviewer                 | Independent Reviewer      | discuss |
| 4   | code-reviewer            | Code Reviewer             | discuss |
| 5   | architect-reviewer       | Architect Reviewer        | discuss |
| 6   | qa-reviewer              | QA Reviewer               | discuss |
| 7   | frontend-reviewer        | Frontend Reviewer         | discuss |
| 8   | backend-reviewer         | Backend Reviewer          | discuss |
| 9   | design-review-lead       | Design Review Lead        | discuss |
| 10  | runtime-gatekeeper       | Runtime Gatekeeper        | discuss |
| 11  | devils-advocate          | Devil's Advocate          | discuss |
| 12  | pattern-doubler          | Pattern Doubler           | discuss |
| 13  | integrated-uiux-reviewer | Integrated UI/UX Reviewer | discuss |

## Drift Changes for This Review Cycle

This review cycle covers drift additions from 2026-03-16:

- 5 specialist sub-agents (UI/UX Expert, Design Expert, Screen Transition Expert, Navigation Expert, Integrated UI/UX Reviewer)
- Research-First Protocol for all specialists
- New OQ-0011~OQ-0013 (all resolved)
- New REQ-0019~REQ-0025, NFR-0011~NFR-0012
- New US-D009~US-D010 with Example Seeds
- Updated Stakeholders, Team composition, Scope, Glossary
