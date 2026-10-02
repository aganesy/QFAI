# US-0002-0002: Shipped action pin policy and trailer resolution

## User Story

As an adopter, I want every action reference in the shipped workflows pinned to a 40-hex commit SHA with its readable version written in the step `name:` without a leading `v`, and third-party references limited to a closed sanctioned set holding only the one reference package-manager availability needs, so that the pins stay readable and the comment-blind leakage guard keeps its full breadth.

## Non-goals

- Narrowing a leakage-guard pattern
- A new pragma
- A new allow-list entry in the guard
- Pinning QFAI's own tree, which is outside the shipped surface, so a conventional version trailer is legal there
