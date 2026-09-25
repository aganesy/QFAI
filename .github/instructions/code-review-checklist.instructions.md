---
applyTo: "**/*"
excludeAgent: "coding-agent"
---

# Copilot Code Review Checklist (Repository)

Review checklist:

- Design: fits existing architecture/patterns; avoid over-engineering.
- Correctness: edge cases, error handling, input validation, concurrency safety.
- Security/Privacy: secrets, authZ/authN, data exposure, logging.
- Performance: N+1, unnecessary full scans, expensive operations, caching.
- Maintainability: duplication, naming clarity, modularity, responsibility boundaries.
- Tests: appropriate unit/integration/e2e coverage; tests fail when code is wrong.
- Docs/UX: README/RELEASE/usage steps are consistent and copy-pasteable; UI changes make sense.
- Consistency/style: follow existing conventions; style-only nits should be labeled [NIT].
- Writing (`.agents/rules/documentation-clarity.md`), for the diff only:
  - [MAJOR] issue/PR numbers, ticket IDs or team-local names in code or Markdown.
  - [MINOR] comments that narrate how the work went instead of current behavior.
  - [NIT] self-evident, repeated or wordy text; phrasing that reads as a literal translation.

Specific checks:

- If the PR claims "no behavior change," verify the diff matches; otherwise raise [MAJOR].
- For documentation-only PRs, check the steps are self-consistent and free of contradicting prerequisites.
