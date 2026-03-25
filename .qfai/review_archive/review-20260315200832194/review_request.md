# Review Request

## Target

- Scope: sdd
- Spec: spec-0013 (CAP-0013: UI/UX 定義・レビュー体系)
- Discussion pack: `.qfai/discussion/discussion-20260315080059347/`

## Artifacts under review

- `.qfai/specs/_policies/03_Capabilities.md` (CAP-0013 追加)
- `.qfai/specs/_policies/04_Business-Flow.md` (v1.5.7 flowchart 追加)
- `.qfai/specs/_policies/06_Glossary.md` (新用語追加)
- `.qfai/specs/_policies/07_Constraints.md` (新制約追加)
- `.qfai/specs/_policies/08_Decisions.md` (OQ-0001〜0013 決定記録)
- `.qfai/specs/_policies/10_delta.md` (DELTA-P003)
- `.qfai/specs/spec-0013/01_Spec.md`
- `.qfai/specs/spec-0013/02_User-stories.md`
- `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0013/04_Business-Rules.md`
- `.qfai/specs/spec-0013/05_Examples.md`
- `.qfai/specs/spec-0013/06_Test-Cases.md`
- `.qfai/specs/spec-0013/07_Decisions.md`
- `.qfai/specs/spec-0013/08_Open-questions.md`
- `.qfai/specs/spec-0013/09_delta.md`
- `.qfai/specs/spec-0013/10_Plan.md`
- `.qfai/evidence/sdd-spec-0013.md`
- `.qfai/report/validate.log`
- `.qfai/report/specs-coverage/spec-0013.md`

## Validate gate

- `qfai validate --fail-on error --format github` 実行済み
- spec-0013 新規エラー種別: なし
- 残存エラー: 全 spec 共通の既知パターン（テーブルヘッダー ID 誤検出）

## Traceability

| Layer | Count              |
| ----- | ------------------ |
| US    | 10                 |
| AC    | 26                 |
| BR    | 48                 |
| EX    | 88                 |
| TC    | 60 (L3: 56, L5: 4) |
| DEC   | 13                 |

## Review roster

12 reviewers per `.qfai/assistant/steering/review-roster.yml`:
R01: qa-lead, R02: qa-gatekeeper, R03: reviewer, R04: code-reviewer,
R05: architect-reviewer, R06: qa-reviewer, R07: frontend-reviewer,
R08: backend-reviewer, R09: design-review-lead, R10: runtime-gatekeeper,
R11: devils-advocate, R12: pattern-doubler
