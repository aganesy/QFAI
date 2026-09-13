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

A finding about excess is one line: **where it is, what to cut, and what
replaces it**. The tags cover code, controls, settings and explanatory copy.

| Tag      | Means                                                                                 | What replaces it                            |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `delete` | Unneeded code, controls, settings or explanatory sentences; duplicated implementation | Nothing, or code already present            |
| `stdlib` | A hand-rolled implementation of a standard-library function                           | Name the function                           |
| `native` | Custom code or controls duplicating a platform feature                                | Name the built-in feature                   |
| `yagni`  | A speculative abstraction, control or setting without a current requirement           | Remove it, or inline the kept behavior      |
| `shrink` | The same behavior or meaning with less code or clearer, shorter copy                  | Show the smaller implementation or sentence |

Code tags read against `.agents/rules/minimal-implementation.md`. For controls,
settings and copy, use `.agents/rules/interface-clarity.md`. Every cut preserves
the safety floor in the implementation rule § 2. Neither rule is restated here.

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
