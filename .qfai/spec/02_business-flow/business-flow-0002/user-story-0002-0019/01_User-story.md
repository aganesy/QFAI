# US-0002-0019: Runner parallelism derived from QFAI's own workload

## User Story

As a maintainer tuning a 415-file suite, I want each vitest project to carry explicit pool, worker, concurrency, file-parallelism and hook-timeout settings and every slice surface (vitest project names, per-slice scripts and the slice matrix of every CI job) to hold the same names, so that a slice is tunable and addressable by one name everywhere.

## Non-goals

- Copying the source repository's numbers, which are justified as network-bound and do not transfer to this filesystem- and subprocess-bound suite.
- Introducing a retry setting.
- Tuning several projects in one pull request.
- Treating the declared starting value as final without measurement.
- Revising the user's stated starting value without the user's sign-off.
