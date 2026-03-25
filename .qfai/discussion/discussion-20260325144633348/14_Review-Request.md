# 14_Review-Request

## Scope

- scope: `discussion-20260325144633348`
- layer: `discussion`
- review-pack: `review-20260325144633348`

## Target Files

1. `.qfai/discussion/discussion-20260325144633348/01_Context.md`
2. `.qfai/discussion/discussion-20260325144633348/02_Inception-Deck.md`
3. `.qfai/discussion/discussion-20260325144633348/03_Story-Workshop.md`
4. `.qfai/discussion/discussion-20260325144633348/04_Sources.md`
5. `.qfai/discussion/discussion-20260325144633348/05_Scope.md`
6. `.qfai/discussion/discussion-20260325144633348/06_REQ.md`
7. `.qfai/discussion/discussion-20260325144633348/07_NFR.md`
8. `.qfai/discussion/discussion-20260325144633348/08_Glossary.md`
9. `.qfai/discussion/discussion-20260325144633348/09_Constraints.md`
10. `.qfai/discussion/discussion-20260325144633348/10_Policy.md`
11. `.qfai/discussion/discussion-20260325144633348/11_OQ-Register.md`
12. `.qfai/discussion/discussion-20260325144633348/12_OQ-Resolution-Log.md`
13. `.qfai/discussion/discussion-20260325144633348/13_Deferred.md`
14. `.qfai/discussion/discussion-20260325144633348/14_Review-Request.md`
15. `.qfai/discussion/discussion-20260325144633348/99_delta.md`

## Review Focus

1. `06_REQ.md` と `07_NFR.md` の境界が崩れていないか。
2. render evidence automation のスコープが capture / validation に留まり、browser QA / repair / external critique を混ぜていないか。
3. `11_OQ-Register.md` の `Disposition: open` が 0 になっているか。
4. `13_Deferred.md` に deferred OQ の metadata が完全に入っているか。
5. 後方互換、no new top-level command、path-only storage、lazy Playwright の方針が一貫しているか。
6. `03_Story-Workshop.md` の Example Seeds が happy / negative / edge / permission / state transition / idempotency を網羅しているか。
7. Mermaid は `02` と `03` に存在し、HTML+CSS mock が UI 参照として成立しているか。

## Design Direction Decisions

- Anchor option: Option B - renderEvidence helper extraction
- Selection reason: CLI を肥大化させず、capture logic を v1.7.4+ の browser QA に再利用できるため
- Rejected options: 2
- Competitive references adopted: `prototypingEvidence.ts`, `renderCritique.ts`, Vercel deployment/log UX
- Local translation policy: 見た目の流用ではなく、operational readability に効く要素だけを render evidence summary に翻訳する

## Required Reviewers

| # | Reviewer ID | Required | File |
| --- | --- | --- | --- |
| 1 | qa-lead | true | R01_qa-lead.md |
| 2 | qa-gatekeeper | true | R02_qa-gatekeeper.md |
| 3 | reviewer | true | R03_reviewer.md |
| 4 | code-reviewer | true | R04_code-reviewer.md |
| 5 | architect-reviewer | true | R05_architect-reviewer.md |
| 6 | qa-reviewer | true | R06_qa-reviewer.md |
| 7 | frontend-reviewer | true | R07_frontend-reviewer.md |
| 8 | backend-reviewer | true | R08_backend-reviewer.md |
| 9 | design-review-lead | true | R09_design-review-lead.md |
| 10 | runtime-gatekeeper | true | R10_runtime-gatekeeper.md |
| 11 | devils-advocate | true | R11_devils-advocate.md |
| 12 | pattern-doubler | true | R12_pattern-doubler.md |
| 13 | integrated-uiux-reviewer | true | R13_integrated-uiux-reviewer.md |

## RCP Rules

- Any `FAIL` requires immediate return to fix.
- 修正後は review cycle を新規作成し、roster を先頭から再実行する。
- `N/A` は `na_rule` を満たす理由が必須である。
- `qfai validate --fail-on error --format github` を各 review cycle の前提とする。
- `overall_status: PASS` は全 reviewer が `PASS` または有効な `N/A` のときのみ成立する。

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | worker | Review request first draft | discussion pack, roster SSOT, rcp footer | `14_Review-Request.md` | PASS |
| 2 | orchestrator | Review request integration | worker draft, RCP normalization | `14_Review-Request.md` | PASS |
