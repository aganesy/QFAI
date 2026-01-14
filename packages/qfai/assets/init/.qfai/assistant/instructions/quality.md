---
id: quality
category: universal
update_frequency: occasional
---

# Quality (Gates, tests, and safety)

## Quality gates (baseline)

When code changes are requested, the expected minimum gates are:

- `pnpm format:check`
- `pnpm lint`
- `pnpm check-types`
- `pnpm test`
- `pnpm verify:pack` (when publishing/distribution matters)

## Do not weaken safety nets

- Do not suppress or disable checks via inline ignores unless explicitly approved.
- If a rule must be changed, justify with evidence and update tests/docs accordingly.

## Testing expectations

- Prefer adding/adjusting tests over weakening validation.
- Keep outputs deterministic (avoid time/randomness).
