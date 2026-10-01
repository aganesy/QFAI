---
category: copilot
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# Best Practices (GitHub Copilot)

Common rules for working with Copilot.

## Tone and Style

- Skip unnecessary preamble and state the key points briefly (aim for four lines or fewer apart from code and logs).
- Confirm unknowns with the fewest questions possible, and do not proceed on guesses.

## Workflow

1. First read the relevant files and specifications (do not start writing code straight away).
2. For complex work, present a plan in small steps and implement after agreement.
3. Keep changes small, then run the nearest tests and report the results.
4. State any remaining risks or open points, and ask for follow-up where needed.

## Execution Tips

- Run read-only commands together and summarize the results concisely.
- Run only the tests and builds that are needed, and on failure give a log summary and the planned response.
- Do not output secrets. Suppressions such as `eslint-disable*` and `@ts-ignore` are prohibited by default unless the user permits them (details: `.instruction/00_universal/quality.md`).
- Use MCP actively (list and when to use each: `.instruction/02_project/mcp.md`).
