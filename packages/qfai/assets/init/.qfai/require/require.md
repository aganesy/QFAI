# Requirements

## Metadata

| Key     | Value         |
| ------- | ------------- |
| Product | <name>        |
| Created | <YYYY-MM-DD>  |
| Updated | <YYYY-MM-DD>  |
| Owner   | <role/person> |
| Scope   | <short>       |

## Inputs (SSOT)

- Glossary: `require/glossary.md`
- Actors: `require/actors.md`
- Business flows: `require/business-flows.md`

## Business Flow Coverage Map

> Purpose: ensure every **in-scope** BF step is covered by REQ and/or a SPEC slice.
> If a step is out-of-scope, say so explicitly.

| BF step ID | Step summary | In/Out | Covered by (REQ-*/spec-*/scenario) | Notes |
| --- | --- | --- | --- | --- |
| BF-0001-S01 | <...> | In | REQ-FUNC-0001, spec-0001 | |
| BF-0001-S02 | <...> | Out | - | Reason |

## Functional Requirements (REQ-FUNC)

> Rules:
>
> - One bullet = one requirement.
> - Split if multiple independent clauses exist.

- [REQ-FUNC-0001][P0] <single verifiable statement>.
- [REQ-FUNC-0002][P1] <single verifiable statement>.

## Non-Functional Requirements (REQ-NFR)

- [REQ-NFR-0001][P1] <single verifiable statement>.
