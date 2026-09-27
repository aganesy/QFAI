# US-0001-0128: Tailwind-aware design-token validation

## User Story

As a `/qfai-prototyping` operator, I want the shipped `generator-prompt.md` and `findDesignMdViolations` to be Tailwind-aware (a preflight literal allowlist plus body-scope narrowing), so that a faithfully generated iteration does not report `designMdViolations[]` for CDN preflight literals, internal `--tw-*` properties, alpha-modifier `rgba()` or standard utility shorthand.
