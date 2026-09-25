# BF-0001: Develop and verify a QFAI project

## Purpose

Take a project need through discussion, story and contract authoring, acceptance
tests, implementation, verification and a report. The current story tree and
contracts are the execution source; discussion records the decisions that led
to them.

## Flow

```mermaid
flowchart TD
  Need[Project need] --> Discuss[Discuss scope and open decisions]
  Discuss --> SDD[Author flows, stories, criteria and contracts]
  SDD --> Validate[Validate current story tree]
  Validate --> Ready{Valid and decisions closed?}
  Ready -->|No| Repair[Resolve finding in owning artifact]
  Repair --> Validate
  Ready -->|Yes| UI{UI contracts declare screens?}
  UI -->|Yes| Prototype[Prototype against frozen design and screen contracts]
  UI -->|No| ATDD[Write acceptance tests]
  Prototype --> ATDD
  ATDD --> Implement[Implement EX-scoped TDD cycles]
  Implement --> Verify[Run repository gates and reviewers]
  Verify --> Gate{All gates pass?}
  Gate -->|No| Repair
  Gate -->|Yes| Report[Produce validation and delivery report]
```

## Alternate and exception paths

- Missing usable discussion source stops SDD until the source is supplied.
- An open product decision returns to discussion and SDD before implementation.
- UI work requires its declared screen contracts and frozen design inputs;
  missing inputs stop prototyping and UI validation.
- A failed validation or reviewer gate returns to the artifact that owns the
  finding. Completion is recorded only after the relevant gate passes.
- A scope change discovered after an accepted implementation item follows the
  drift protocol through SDD before another item is selected.
