# require

## Purpose

`require/` is the **requirements source of truth** for the project.

In the current standard, requirements are decomposed from the **top-level domain context**:

1. **Glossary** (terms)
2. **Actors** (who/what interacts)
3. **Business Flows** (narrative backbone)

From that context you derive:

- atomic requirements (`REQ-*`)
- spec packs (`specs/spec-*/spec.md`) sliced from **Business Flow steps**
- acceptance scenarios (`specs/spec-*/scenario.feature`)

## Required files

```text
require/
├── README.md
├── glossary.md
├── actors.md
├── business-flows.md
├── require.md
└── open-questions.md
```

> Compatibility note:
> Some older projects may only have `require.md` and `open-questions.md`.
> Templates generate the full set; validation strictness may be phased in later.

## Output contract

- There MUST be exactly one `require.md`.
- `glossary.md`, `actors.md`, `business-flows.md` MUST be treated as **SSOT**.
- Requirements MUST be **testable** (observable outcomes; avoid "should be easy").
- Each requirement MUST be atomic and have a stable ID.
- `open-questions.md` MUST exist and track Open/Answered/Deferred.
- Open MUST be 0 at completion; Deferred requires explicit user approval evidence.
- `require.md` MUST include a **Business Flow Coverage Map** (traceability from BF steps to REQ/SPEC).

## ID rules

- Terms: `TERM-0001`
- Actors: `ACT-0001`
- Business flows: `BF-0001`
  - Steps: `BF-0001-S01` (S02, S03...)

Keep IDs stable once referenced by REQ/SPEC/SCENARIO.

---

## Template (glossary.md)

```md
# Glossary

## Terms

- [TERM-0001] **<term>**: <definition>.
  - Synonyms: <optional>
  - Notes: <optional>
```

## Template (actors.md)

```md
# Actors

## Actors

- [ACT-0001] <name>
  - Type: Primary | Supporting | System
  - Intent: <what the actor tries to achieve>
  - Responsibilities: <bullets>
  - Notes: <optional>
```

## Template (business-flows.md)

```md
# Business Flows

## Flows

- [BF-0001] <name>
  - Goal: <one verifiable outcome>
  - Primary actor: [ACT-0001]
  - Supporting actors: [ACT-0002], ...
  - Trigger: <what starts the flow>
  - Preconditions: <optional>
  - Success criteria: <observable outcomes>
  - Steps:
    - [BF-0001-S01] <verb phrase> (actor/system)
    - [BF-0001-S02] <verb phrase> (actor/system)
  - Variations / Exceptions:
    - V1: <when> -> <difference>
  - Related requirements: <optional list of REQ-\* once created>
```

## Template (require.md)

```md
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

| BF step ID  | Step summary | In/Out | Covered by (REQ-_/spec-_/scenario) | Notes  |
| ----------- | ------------ | ------ | ---------------------------------- | ------ |
| BF-0001-S01 | <...>        | In     | REQ-FUNC-0001, spec-0001           |        |
| BF-0001-S02 | <...>        | Out    | -                                  | Reason |

## Functional Requirements (REQ-FUNC)

> Rules:
>
> - One bullet = one requirement.
> - Split if multiple independent clauses exist.

- [REQ-FUNC-0001][P0] <single verifiable statement>.
- [REQ-FUNC-0002][P1] <single verifiable statement>.

## Non-Functional Requirements (REQ-NFR)

- [REQ-NFR-0001][P1] <single verifiable statement>.
```

## Template (open-questions.md)

```md
# Open Questions

## Open

- [OQ-0001] <question>. (Owner: <role>, Due: <YYYY-MM-DD>)

## Answered

- [OQ-0002] <question> -> <answer>. (Evidence: <link>)

## Deferred

- [OQ-0003] <question>. (Reason: <why> / Evidence: <link>)
```
