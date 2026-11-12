# US-0001-0242: Parse the diagrams a step wrote

## User Story

As an agent writing Mermaid diagrams in a business flow, I want the step that writes them to run the shipped Mermaid parser on its files, so that a broken diagram is fixed before handoff instead of failing a later CI run.

## Non-goals

- Making Mermaid a dependency of the package.
- Running the parser inside `qfai validate`.
