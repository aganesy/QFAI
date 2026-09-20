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

## Observed documentation-only run

The [documentation-only CI run](https://github.com/aganesy/QFAI/actions/runs/35492666770)
on commit `dad4384dced73d5fde5d619a9644503932da9ea9` completed successfully on
2026-09-20. It was a pull-request event with only this guide changed.

Both the jobs and commit check-runs APIs returned ten entries, matching their
reported totals after pagination. The names and conclusions were:

| Conclusion | Check names                                                                   |
| ---------- | ----------------------------------------------------------------------------- |
| Success    | `build`, `ci-pass`, `detect`, `lint`, `mirror-surface`                        |
| Skipped    | `check-types`, `check-types-future`, `node-floor`, `scanner-coverage`, `test` |

Neither sliced lane reported expanded leg names. Their job-level condition was
false before matrix expansion, so both reported a single skipped check under
the bare job name. The required `ci-pass` check still ran and succeeded.

For comparison, the [full CI run](https://github.com/aganesy/QFAI/actions/runs/35479590985)
on commit `bf473648c3f32ff61f63a7de6587c4db4f1e5346` reported 26 successful
checks, including nine expanded names for each sliced lane. The jobs and commit
check-runs APIs both returned all 26 entries. The two selection states therefore
have different reported name sets while retaining the same required context.
