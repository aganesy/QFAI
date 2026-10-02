# US-0002-0017: Layer-separated test lanes without a new check name

## User Story

As a maintainer reading a failed run, I want the test layers separated into their own jobs and matrix legs by cost and duration inside the existing workflow file, so that a failure names its layer without creating a check name nobody can configure.

## Non-goals

- One workflow file per layer.
- Splitting by credential need, which QFAI's suite cannot do: it has one credential class and no credentials.
- Renaming the aggregate.
- Deciding the cost partition before the parallelism measurement exists.
