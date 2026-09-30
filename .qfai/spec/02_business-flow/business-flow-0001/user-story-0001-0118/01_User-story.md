# US-0001-0118: Unattended prototyping execution

## User Story

As a CI operator, I want `/qfai-prototyping` to run from cycle 0 through cycle 9 with no per-cycle prompt and to exit non-zero with a deterministic code on lock drift, reviewer Playwright-session failure, license-verify failure (exit 66) or a mid-run change to the UI contract set, so that pipelines never block on stdin.
