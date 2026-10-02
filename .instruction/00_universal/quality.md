---
category: universal
update-frequency: occasional
dependencies: none
version: 1.0.1
---

# Quality Standards and the Confidence Rule

Defines the quality standards that every agent follows.

## Basic Principles

- Clarify the purpose and completion criteria of each change, and back them with tests.
- Do not merge while confidence is below 95%. Ask about anything unclear, and add tests or evidence.
- Prefer reusing existing types and patterns, and state the reason when departing from them.

## Suppressing Static Analysis (Prohibited by Default)

- Do not add or use suppression comments or directives without the user's explicit permission.
  - Examples: `eslint-disable*`, `@ts-ignore`
- When existing code already has a suppression, propose a remedy such as removing it, fixing the type definitions or rethinking the implementation approach, and leave the decision to act to the user.
- When an exception is necessary, state the reason, the alternatives and the impact briefly, and limit it to the smallest scope (for example, the target line only).

## Testing and Verification

- When the specification changes, write a reproduction test first and make it pass after the fix.
- Add or update tests nearby, and report the results (state the command and whether it passed or failed).
- If a test could not be run, state the reason and the alternative means of confirmation.

## Logging and Error Handling

- Use specific messages and avoid excessive logging.
- Do not expose unnecessary internal information or secrets to users.
- Do not swallow exceptions; show whether recovery is possible and how far the impact reaches.

## Performance and Security

- Avoid N+1 queries and needless full-table fetches, and consider batching or caching where needed.
- Enforce input validation and authentication/authorization. Do not hold or output secrets in plain text.

## Review and Report Template

- Present the change summary, impact, tests run and remaining risks as bullet points.
- List serious concerns in priority order, and state unresolved questions explicitly.
