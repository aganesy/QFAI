# US-0001-0033: Managed `.gitignore` block

## User Story

As an operator, I want `qfai init` to append the QFAI managed block to my root `.gitignore`, ignoring `.qfai/report/*`, `.qfai/evidence/*` and `.qfai/review/*` with no negation that re-includes a path under `.qfai/evidence/`, ignoring nothing under `.qfai/deliberation/`, and to rebuild it on a rerun, so that QFAI's work records stay local, its deliberation records are tracked, and my own entries are left alone.

## Non-goals

- Changing or deleting the project's own `.gitignore` entries.
- A negation that tracks a review pack; `review-*/` directories stay ignored, and a project that wants to track one adds its own negation.
