# require

## Purpose

`require/` stores **one** requirements document (`require.md`) that becomes input to:
- spec packs (`specs/spec-*/spec.md`)
- contracts (`contracts/**`)
- acceptance scenarios (`specs/spec-*/scenario.feature`)

## Required files

```text
require/
  README.md
  require.md
```

## Output contract

- There MUST be exactly one `require.md`.
- Requirements MUST be **testable** (observable outcomes; avoid “should be easy”).
- Each requirement MUST be atomic and have a stable ID.

## Template (require.md)

```md
# Requirements

## Metadata

| Key | Value |
|---|---|
| Product | <name> |
| Created | <YYYY-MM-DD> |
| Updated | <YYYY-MM-DD> |
| Owner | <role/person> |
| Scope | <short> |

## Glossary

- **<term>**: <definition>

## Functional Requirements (REQ-FUNC)

> Rules:
> - One bullet = one requirement.
> - Split if multiple independent clauses exist.

- [REQ-FUNC-0001][P0] <single verifiable statement>.
- [REQ-FUNC-0002][P1] <single verifiable statement>.

## Non-functional Requirements (REQ-NFR)

- [REQ-NFR-0001][P0] <performance / security / availability requirement>.
- [REQ-NFR-0002][P1] <observability / operability requirement>.

## Constraints

- [REQ-CONSTR-0001] <e.g., supported browsers / regions / legal constraints>.

## Open Questions

- [OQ-REQ-0001] <question>

## Change Log

| Date | Change |
|---|---|
| <YYYY-MM-DD> | <what changed> |
```

## Sample (excerpt)

```md
## Functional Requirements (REQ-FUNC)

- [REQ-FUNC-0010][P0] A signed-in user can create a product with required fields (code, name, unit, cost, price).
- [REQ-FUNC-0011][P0] Product code MUST be unique across the system; duplicates MUST be rejected with a user-visible error.
- [REQ-FUNC-0012][P1] A user can search products by code or name substring; deleted products are hidden by default.
```

## Checklist

- [ ] All requirements are atomic (no “and/or” hiding multiple rules).
- [ ] Each requirement has an ID and priority.
- [ ] Glossary exists for domain terms that appear in requirements/specs/contracts.
- [ ] Open Questions are explicit and scoped.

## Anti-patterns

- “As a user I want … so that …” without verifiable outcomes.
- Multiple rules in one requirement (“… and … and …”).
- UI/DB/API design details embedded here (put those in `contracts/`).
