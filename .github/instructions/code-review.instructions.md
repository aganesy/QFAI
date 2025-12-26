---
applyTo: "**/*"
excludeAgent: "coding-agent"
---

# Copilot Code Review Instructions (Repository)

Goal:

- Provide high-quality, line-level PR review comments that improve code health.
- Base the review on the PR description and the diff against the merge target.

Language:

- Default: Japanese.
- If the PR description includes `Review Language:` (e.g., `ja`, `en`, `ja+en`), follow it.
- For multi-language requests, write each comment in all requested languages, Japanese first.

Process:

1. Read the PR description (use the PR template sections) and extract:
   - Why/background
   - Business/process position
   - Intended behavior change
   - Design decisions and alternatives
   - Risks and tests
2. Compare the description with the diff. If missing or inconsistent, leave a single top-level review comment requesting clarification.
3. Review every changed line and surrounding context. Prefer inline comments for concrete issues.

Comment format:

- Prefix severity: [BLOCKER], [MAJOR], [MINOR], [NIT], or [FYI].
- Include: Issue -> Why (impact/risk) -> Suggestion (concrete fix or test).
- Use respectful, code-focused language and explain reasoning.
- Provide positive feedback when something is notably well done.

Review checklist (from code review best practices):

- Design: fits existing architecture/patterns; avoid over-engineering.
- Correctness: edge cases, error handling, input validation, concurrency safety.
- Security/Privacy: secrets, authZ/authN, data exposure, logging.
- Performance: N+1, unnecessary full scans, expensive operations, caching.
- Maintainability: duplication, naming clarity, modularity, responsibility boundaries.
- Tests: appropriate unit/integration/e2e coverage; tests fail when code is wrong.
- Docs/UX: README/RELEASE/usage steps are consistent and copy-pasteable; UI changes make sense.
- Consistency/style: follow existing conventions; style-only nits should be labeled [NIT].

Specific checks:

- If the PR claims "no behavior change," verify the diff matches; otherwise raise [MAJOR].
- For documentation-only PRs, validate that steps are self-consistent and have no contradicting prerequisites.

Constraints:

- Copilot reviews are comments only and do not block merging; be explicit about severity.
- If a change affects user-facing behavior, call out expected impact and any missing tests or docs.
