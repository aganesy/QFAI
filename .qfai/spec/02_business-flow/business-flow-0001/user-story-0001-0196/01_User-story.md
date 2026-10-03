# US-0001-0196: Install or upgrade and get the free-text entry

## User Story

As an adopter maintainer, I want `qfai init` and an upgrade to install `qfai-run` and `qfai-maintain` with their host links, and tell me which workflow mode is in force and what my own edits leave out of step, so that my operators can use the free-text entry without further setup and my edits survive.

## Non-goals

- The workflow core and what `start` refuses.
- The routing entries of the two skills, which the package defaults carry.
- Writing a `workflow.mode` key or asking for one.
- Installing the built-in plans, which the package holds.
- Overwriting a skill the project edited without `--force`.
- The ignore entries for the run state and run records an earlier release left in the managed `.gitignore` block.
