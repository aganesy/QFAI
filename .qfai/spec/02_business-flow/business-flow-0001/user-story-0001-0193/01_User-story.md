# US-0001-0193: Repair a bug the stories already describe without uncovering an example

## User Story

As an operator, I want a defect I report against behaviour a story already states to be repaired against that story, with a missing test written against the example that states the case, or against one example appended under the existing criterion when none does, and a regression an existing test catches fixed in production code, so that every example keeps its annotating test.

## Non-goals

- An example that loses its annotating test.
- A change to a criterion or a rule statement for a change that did not happen.
- The diagnose-only operation and the production fix itself.
- Seeding a defect example.
