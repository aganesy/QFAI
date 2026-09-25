# US-0002-0024: Run the init suites on Windows

## User Story

- Goal: As a QFAI maintainer, I want the init and migration suites, and the
  control-core suites once they exist, to run on a Windows runner on every
  code-path pull request, so that a Windows regression in init, upgrade, path
  handling or the lock is caught on the pull request that causes it.
- Non-goals: the whole test suite on Windows; a manual Windows run before
  release; making the `build` job depend on the new job; changing which status
  check a merge requires, which is a repository setting.
- Notes: discussion-20260923171450572#NFR-0011, own-CI half. The property itself
  is held by the suites the job runs; for init it is AC-0001-0203-06. The job
  fails the aggregate verdict on the pull request that breaks Windows parity,
  and gates a merge only once the required status context is that verdict.

## Source Provenance

- Story block: US-0017-0016, which `main` added to spec-0017 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0017/`; main's
  text at `origin/main:.qfai/specs/spec-0017/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
