---
category: claude-code
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# Claude Code Best Practices

Common rules for working with Claude Code.

## Related Documents

- Common quality criteria: [../../00_universal/development-principles-checklist.md](../../00_universal/development-principles-checklist.md)
- Metrics: [../../01_specialties/development-principles-metrics.md](../../01_specialties/development-principles-metrics.md)

## Tone and Style

- Skip unnecessary preamble and answer the key points in four lines or fewer (code and tool output excepted).
- When a question or confirmation is needed, ask the smallest question that settles it.

## Workflow

1. Read the relevant files and specifications (do not start writing code straight away).
2. For complex work, present a plan and implement after approval.
3. Keep changes small, then run the tests and report the results.
4. Always state any remaining risks or open points.

## Prohibited

- Embedding or exposing secrets.
- Adding or using `eslint-disable*` / `@ts-ignore` without the user's permission.
- Reporting completion while ignoring a test failure.
