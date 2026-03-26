# Review Request

## Metadata

| Key       | Value                                              |
| --------- | -------------------------------------------------- |
| Scope     | sdd                                                |
| Target    | spec-0018 (CAP-0018: Codex Sub-Agent TOML Support) |
| Skill     | /qfai-sdd                                          |
| Timestamp | 2026-03-23T13:07:16+09:00                          |

## Review Artifacts

- `.qfai/specs/_policies/03_Capabilities.md` (CAP-0018 追加)
- `.qfai/specs/_policies/08_Decisions.md` (DR-0027〜DR-0030 追加)
- `.qfai/specs/_policies/10_delta.md` (CAP-0018 エントリ追加)
- `.qfai/specs/spec-0018/01_Spec.md`
- `.qfai/specs/spec-0018/02_User-stories.md`
- `.qfai/specs/spec-0018/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0018/04_Business-Rules.md`
- `.qfai/specs/spec-0018/05_Examples.md`
- `.qfai/specs/spec-0018/06_Test-Cases.md`
- `.qfai/specs/spec-0018/07_Decisions.md`
- `.qfai/specs/spec-0018/08_Open-questions.md`
- `.qfai/specs/spec-0018/09_delta.md`
- `.qfai/specs/spec-0018/10_Plan.md`
- `.qfai/report/preflight_summary.md`
- `.qfai/report/validate.log`
- `.qfai/report/specs-coverage/spec-0018.md`

## Validate Gate Evidence

- Command: `qfai validate --fail-on error --format github`
- Result: error=60 (all pre-existing), warning=37, info=3
- spec-0018 specific errors: 0
- spec-0018 warnings: 2 (QFAI-DENSITY-002, QFAI-DENSITY-004 — density signals, not errors)

## Roster

13 reviewers per `.qfai/assistant/steering/review-roster.yml`
