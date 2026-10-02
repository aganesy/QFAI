---
applyTo: "**/*.ts"
excludeAgent: "coding-agent"
---

# Copilot Code Review: TypeScript (Repository)

TypeScript specific checks:

- Avoid `as` type assertions unless a preceding type guard or runtime check justifies them; prefer type narrowing.
- Prefer discriminated unions over plain string-literal unions when branching logic depends on the variant.
- In catch blocks, narrow `unknown` errors before accessing properties; flag bare `(error as Error).message`.
- Flag a Promise that is neither awaited nor returned.
  Returning propagates only when its caller awaits or adopts the Promise.
  Subject to the safety floor in `.agents/rules/minimal-implementation.md` § 2, do not ask for a catch
  around a failure that no specification, contract or observation names.
  At a callback boundary that ignores return values, require an adapter that
  adopts asynchronous work and handles rejections under the same floor.
- Keep generic type parameters to a minimum; overly complex generics hurt readability more than they help type safety.
