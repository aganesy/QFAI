# US-0002-0024: Run the init suites on Windows

## User Story

As a QFAI maintainer, I want the init and migration suites and the workflow command suites to run on a Windows runner on every code-path pull request, so that a Windows regression in init, upgrade or path handling is caught on the pull request that causes it.

## Non-goals

- The whole test suite on Windows.
- A manual Windows run before release.
- Making the `build` job depend on the new job.
- Changing which status check a merge requires, which is a repository setting.
