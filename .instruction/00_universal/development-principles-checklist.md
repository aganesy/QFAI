---
category: universal
update-frequency: occasional
dependencies: [quality.md]
version: 1.0.0
---

# Development Principles Checklist (Common)

A checklist for applying SOLID / KISS / YAGNI / DRY by the same standard in every implementation.

## Related Documents

- How much code implements a behaviour: `.agents/rules/minimal-implementation.md`
- Quality standards: [quality.md](./quality.md)
- Claude Code best practices: [../03_ai-agents/claude-code/best-practices.md](../03_ai-agents/claude-code/best-practices.md)
- Project implementation patterns: [../02_project/patterns.md](../02_project/patterns.md)

## SOLID Checks

- **SRP**: Each file, function or component has one responsibility. Its name shows what it is responsible for, and it does not change for more than one reason.
- **OCP**: Can the design be extended without rewriting existing code? Can behaviour be switched through configuration or dependency injection?
- **LSP**: Does substituting a type leave things working? Does a derived type avoid strengthening preconditions and weakening postconditions?
- **ISP**: Are interfaces small and split by role? Are implementers forced to provide methods they do not need?
- **DIP**: Does the code depend on abstractions rather than concrete types? Provide an interface at each module boundary.

## How much code — KISS, YAGNI, DRY

The ladder is in `.agents/rules/minimal-implementation.md`. Apply it from there
rather than from a copy here.

Sharing has a floor the ladder does not set: extract on the third occurrence.
Earlier than that, code pulled in different directions by several callers costs
more than the repetition did.

## Implementation Checks (Excerpt)

- Type safety: Avoid `any`, and validate inputs and outputs with a schema or zod.
- Exception handling: Write the failure path first, and keep user-facing and log-facing messages separate.
- Tests: Add a test nearby for any behaviour change. Confirm the sequence of reproduction test, fix, pass.
- Logging: Keep it minimal and specific. Include no secrets.
- Performance: Avoid N+1 queries and needless full-table fetches. Consider caching and batch processing.

## Self-Review Template

```
- Does it meet the goal and the completion criteria?
- Is the responsibility single, and does it follow reusable patterns?
- Are error paths and boundary values covered?
- Are the tests sufficient, and what are the results?
- What are the impact and the remaining risks?
```
