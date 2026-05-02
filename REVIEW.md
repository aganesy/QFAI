# Code Review Policy

## Always Flag

The following categories must ALWAYS be reported as inline PR comments,
regardless of confidence level or severity.
Do not suppress any actionable finding.

- Style and formatting inconsistencies
- Naming improvements (variables, functions, types, files)
- Minor readability improvements
- Redundant or dead code
- Missing or incomplete comments/documentation
- Import ordering or unused imports
- Potential typos in strings, comments, or identifiers
- Minor performance improvements
- Simplification opportunities
- Inconsistency with existing codebase patterns
- Missing error handling or incomplete error messages
- Type safety improvements (e.g., unnecessary `as` assertions)
- Test coverage gaps (missing edge cases, incomplete assertions)
- TODO/FIXME/HACK comments without tracking references
- Traceability gaps (ID collisions, unregistered references, spec-to-code drift)
- Regex or pattern contract mismatches between test and production code
- Cross-file reference errors (broken paths, wrong anchors)
- Distributed surface leaks (internal spec IDs, internal version markers, schemaVersion fields appearing under paths listed in `packages/qfai/package.json#files`; see `.claude/rules/distributed-surface.md`)

## Severity Prefixes

Use the following severity prefixes on every comment:

- [BLOCKER] — Must fix before merge
- [MAJOR] — Should fix before merge
- [MINOR] — Should fix, can be deferred
- [NIT] — Stylistic or minor improvement
- [FYI] — Informational, no action required

YOU MUST post ALL findings including [NIT] and [FYI] as inline PR comments.
Do not suppress low-severity findings.
Every actionable observation should appear as a review comment on the relevant line.

## Skip

(No categories are skipped.)

## Review Language

- Default: Japanese
- Follow `Review Language:` header in PR description if present
