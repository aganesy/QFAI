# 08 Review Request

## Target Discuss Pack

- Pack path: `.qfai/discuss/discuss-YYYYMMDDhhmmssSSS/`
- Scope: context, hearing, OQ register, deferred decisions, and delta

## Roster Source

- Use `.qfai/assistant/steering/review-roster.yml` as SSOT.
- Run all reviewers in roster order.

## Required Review Outcomes

- Allowed per reviewer: `PASS`, `FAIL`, `N/A`.
- `N/A` requires an explicit reason following roster `na_rule`.
- If any reviewer returns `FAIL`, return, fix, and restart full roster review.
- Mark fixed only when all reviewers are `PASS` or `N/A`.

## Review Focus

- Completeness of discuss context and hearing outputs
- OQ state integrity (`open` must be zero at completion)
- Deferred metadata completeness and risk handling
- Traceability of decisions and rationale
