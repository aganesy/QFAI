# US-0001-0315: Review every screen against the same sourced checklist

## User Story

As a project lead whose agents build business screens, I want the product-surface review to walk one fixed checklist of usability heuristics, accessibility criteria and widget patterns, each with its source, and to report every item, so that two review rounds of the same screen cover the same ground and a gap in coverage shows instead of depending on what the reviewer happened to notice.

## Non-goals

- An automated check of any checklist item; the accessibility test layer already runs axe.
- A change to which findings may block a review, beyond naming the trace an accessibility finding carries.
- The prototype review loop, whose reviewer prompt sets its own criteria.
