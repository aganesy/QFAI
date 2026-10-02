---
category: universal
update-frequency: rare
dependencies: none
version: 1.1.0
---

# Communication and Confirmation Process

Defines when to reach out and how to proceed so that agreement is reached early and rework is avoided.

## Basic Principles

- **Ask about anything unclear right away**: Do not proceed on guesses or assumptions.
- **Share progress often on long tasks**: If a task looks likely to take 30 minutes or more, report interim progress.
- **Report completion concretely**: Give the changes, the changed files and the test results together.

## Cases Where You Should Stop and Confirm

1. **Unclear requirements**: More than one interpretation is possible, or the completion criteria are vague.
2. **A technical choice forks**: Several implementation options exist and a trade-off must be judged, or the work departs from existing patterns.
3. **High-risk changes**: The impact is wide, the change is a large-scale overhaul, or there is a risk of data inconsistency.
4. **A premise changes**: A dependency is updated, a requirement is added or changed, or a new constraint comes to light.
5. **Abstract instructions**: Words such as "appropriately" or "efficiently" come with no concrete standard or measurable completion condition.

## How to Write a Question

The shape of a question is owned by `.agents/rules/user-questions.md`: what parts
it carries, when it offers choices, and when it recommends one. Follow that file.

A form restated here is a copy that drifts, and the drift is invisible until
someone follows the copy — which is what this directory says about every rule it
points at.

## Progress Reports

Keep reports brief, as bullet points, and include the following.

- **Status**: Separate what is done, in progress and not started.
- **Issues and problems**: What occurred, what has been handled and what is unresolved.
- **Next step**: The immediate work, the points that need the user's confirmation and the expected risks.

## Completion Reports

On completion, share the following together.

- **Summary**: What was changed, and why.
- **Changed files**: The purpose and main changes for each file.
- **Tests**: The tests that were run and their results, or the reason if none were run.
- **Notes and risks**: The impact, the remaining tasks and the points that need confirmation.
