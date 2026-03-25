# Review Request

- Target: spec-0010 (CAP-0010 Steering & Governance) — AskUserQuestion MUST 化追加
- Scope: sdd
- Discussion: discussion-20260314053646704
- Date: 2026-03-14

## Changes Under Review

| File                                | Change                                         | Importance |
| ----------------------------------- | ---------------------------------------------- | ---------- |
| spec-0010/01_Spec.md                | REQ-0019〜0022 追加、Scope・NFR・Evidence 更新 | 高         |
| spec-0010/02_User-stories.md        | US-0010-0006 追加、US-0010-0004 Article X 反映 | 高         |
| spec-0010/03_Acceptance-Criteria.md | AC-0010-0006〜0010 追加（5 Gherkin シナリオ）  | 高         |
| spec-0010/04_Business-Rules.md      | BR-0010-0016〜0021 追加（6 ルール）            | 高         |
| spec-0010/05_Examples.md            | EX-0010-0014〜0020 追加（7 例）                | 中         |
| spec-0010/06_Test-Cases.md          | TC-0010-0014〜0020 追加（7 テストケース）      | 中         |
| spec-0010/09_delta.md               | DELTA-0010-0002 追加                           | 中         |
| spec-0010/10_Plan.md                | 成果物・検証項目・リスク・順序を更新           | 中         |
| \_policies/06_Glossary.md           | Constitution/AskUserQuestion Protocol 定義更新 | 中         |
| \_policies/08_Decisions.md          | DR-0012 追加                                   | 中         |
| \_policies/10_delta.md              | 採用エントリ 3 件追加                          | 低         |

## Review Roster

10 reviewers from review-roster.yml:

1. qa-lead (mandatory)
2. qa-gatekeeper (mandatory)
3. reviewer (mandatory)
4. code-reviewer
5. architect-reviewer
6. qa-reviewer
7. frontend-reviewer
8. backend-reviewer
9. design-review-lead
10. runtime-gatekeeper

## Completion Conditions

- All mandatory reviewers (qa-lead, qa-gatekeeper, reviewer) must return PASS
- Other reviewers may return N/A with na_rule rationale
- No FAIL allowed

## Notes

- Markdown-only changes (no TypeScript, no runtime impact)
- No contract changes (QFAI CLI has 0 contracts)
- Pre-existing validate errors are documented in evidence (not caused by this SDD)
- Simulation mode: subagents simulated with user approval
