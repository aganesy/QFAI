# 04 Business Flow

## Purpose

- Describe the high-level business process as upstream input for user stories and examples.

## Actors / Systems

- Actor:
- System:

## Preconditions

- Preconditions:

## Flow Overview

```mermaid
flowchart TD
  A[Start] --> B{Condition?}
  B -->|Yes| C[Happy path]
  B -->|No| D[Alternate path]
  C --> E[End]
  D --> E[End]
```

## Alternate / Exception Flows

- ALT-01:
- EX-01:

## Notes

- If required, add another ` ```mermaid ` block with `sequenceDiagram`.
- Do not use ` ```text ` or language-less fences for Mermaid diagrams.
- Keep Gherkin scenarios in `spec-XXXX/05_Examples.feature`.
