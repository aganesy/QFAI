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
- Simplification opportunities (see **Findings about excess** below for the shape)
- Inconsistency with existing codebase patterns
- Missing error handling or incomplete error messages
- Type safety improvements (e.g., unnecessary `as` assertions)
- Test coverage gaps (missing edge cases, incomplete assertions)
- TODO/FIXME/HACK comments without tracking references
- Traceability gaps (ID collisions, unregistered references, spec-to-code drift)
- Regex or pattern contract mismatches between test and production code
- Cross-file reference errors (broken paths, wrong anchors)
- Distributed surface leaks (internal spec IDs, internal version markers, schemaVersion fields appearing under paths listed in `packages/qfai/package.json#files`; see `.claude/rules/distributed-surface.md`)

## Findings about excess

A finding about code that should not exist is one line: **where it is, what to
cut, and what replaces it**. Tag it with the reason.

| Tag      | Means                                                                               | What replaces it      |
| -------- | ----------------------------------------------------------------------------------- | --------------------- |
| `delete` | Dead code, unused flexibility, a speculative feature                                | Nothing               |
| `stdlib` | A hand-rolled thing the standard library ships                                      | Name the function     |
| `native` | Code or a dependency doing what the platform already does                           | Name the feature      |
| `yagni`  | An abstraction with one implementation, config nobody sets, a layer with one caller | Inline it             |
| `shrink` | The same logic, fewer lines                                                         | Show the shorter form |

The ladder these tags read against is
`.agents/rules/minimal-implementation.md`. It is not restated here.

A finding that names no replacement is not actionable: the author cannot act on
it and the reviewer cannot be held to it. "This might be more complex than
necessary, have you considered whether all of this is needed" says neither what
to cut nor what would stand in its place.

Applies to findings about excess only. Correctness, security and performance
keep the shape the rest of this document describes.

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
