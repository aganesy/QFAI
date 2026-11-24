# Golden task evaluation

How a regression evaluation of this skill is run and scored. Read it before
you run or report a golden task evaluation.

## Golden Task Evaluation

**Golden task** sets are curated query-answer pairs, each with its expected
sources and citations, used for regression evaluation. Each golden task is
scored against 4 metrics:

- **Citation precision** — accuracy of generated citations.
- **Coverage** — completeness of query facet coverage.
- **Freshness** — recency of cited sources.
- **Security hygiene** — sanitization pass rate.

Each score is compared with its target in Section 5 of the skill's `SKILL.md`,
and the scores and the comparison are reported with the evaluation run.
