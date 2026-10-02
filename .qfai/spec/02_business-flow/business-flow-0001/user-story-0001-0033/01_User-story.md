# US-0001-0033: Managed `.gitignore` block

## User Story

As an operator, I want `qfai init` to append the QFAI managed block to my root `.gitignore`, ignoring `.qfai/report/*`, `.qfai/evidence/*`, `.qfai/discussion/*`, `.qfai/review/*` and `.qfai/run/` with no negation that re-includes a path under `.qfai/evidence/`, and to strip on a rerun every line an earlier release wrote and this one retired, so that QFAI's work records stay local and my own entries are left alone.

## Non-goals

- Changing or deleting the project's own `.gitignore` entries.
- A negation that tracks a review pack; `review-*/` directories stay ignored, and a project that wants to track one adds its own negation.
