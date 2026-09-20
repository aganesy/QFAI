# Reading this repository's CI checks

The repository's `CI` workflow reports `ci-pass` as its required status context.
Its verdict includes the selected lanes, so a matrix contributes one aggregate
result even when it produces several check runs.

## Full and documentation-only runs

A full run expands both `test` and `node-floor` over the same nine slices:
`cli`, `core`, `e2e`, `integration`, `pr-fix`, `pr-merge`, `scripts`, `unit`, and
`validators`. Their check names have the form `test (core)` and
`node-floor (core)`.

The detector selects the documentation-only path for changes confined to its
explicit documentation allowlist. A Markdown extension alone is insufficient:
changes under `.qfai/specs/`, for example, select the full path. Changes under
`packages/qfai/docs/` select the documentation-only path.

Both matrix jobs have a job-level condition on the detector's output. To inspect
a documentation-only run, read the reported jobs and check runs instead of
assuming the full run's expanded names. Distinguish a skipped job from a missing
check, and retain its exact reported name and conclusion.

## Recording the observed names

For each observation, retain the run URL, head commit, event type, detector
result, and every job's name and conclusion. Read all pages of the run's jobs
and the commit's check runs, then compare the received counts with each API
response's total. This prevents an incomplete response from looking like a
missing matrix leg.

Keep the full and documentation-only observations separate. Both sliced lanes
must follow the same naming rule for the same selection state. A change to
check names belongs in the topology inventory; it does not require adding each
matrix leg to branch protection because `ci-pass` remains the required context.
