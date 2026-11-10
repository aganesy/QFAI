# US-0001-0240: Warn on an oversized Mermaid diagram

## User Story

As a reader of a specification diagram, I want validation to warn when a Mermaid diagram has more nodes or edges than the project's budget, so that the author splits it into an overview and detail diagrams before it becomes unreadable.

## Non-goals

- Rendering a diagram or judging its layout.
- Counting a diagram type that draws no nodes and edges, such as a pie chart or a Gantt chart.
