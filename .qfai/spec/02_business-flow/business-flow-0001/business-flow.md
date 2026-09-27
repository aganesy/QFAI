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
  Request[Free-text change request] --> Route[Route it and announce the plan]
  Route -->|Chain the planned stages| SDD
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
  Gate -->|Yes, in a run| Finish[Judge the run gates and completion target]
  Finish --> Report
```

## Alternate and exception paths

- Missing usable discussion source stops SDD until the source is supplied.
- An open product decision returns to discussion and SDD before implementation.
- UI work requires its declared screen contracts and frozen design inputs;
  missing inputs stop prototyping and UI validation.
- A failed validation or reviewer gate returns to the artifact that owns the
  finding. Completion is recorded only after the relevant gate passes.
- A free-text change request in mode `active` is routed by `qfai-run` and
  driven through `npx qfai workflow`, which chains the planned stages with no
  stage typed by the operator and ends at `finish`. A new story, and each change
  a story-authoring stage makes to the tree, wait for the operator's approval.
  A request that is not a change, or a mode of `off` or `shadow`, starts no run.
- A scope change discovered after an accepted implementation item follows the
  drift protocol through SDD before another item is selected.
