# Preflight Summary

Output shape of `npx qfai sdd preflight` (Stage 0 of `/qfai-sdd`). The command
writes this file; re-run it instead of filling the form in by hand. `blocked`
runs emit Status / Blockers / Open Questions / Next Commands, `ready` runs emit
Status / Requirement Intake / Pack Gaps / Open Questions. Only a missing or
misnamed pack blocks: what a present pack lacks or contradicts is listed under
Pack Gaps, to be recorded in the SDD-owned delta or evidence, and the run
continues. Carry-over entries come from `--assume <text>` and are preserved
across re-runs, so findings the command does not compute can still live here.

## Status

- status: <ready | blocked>
- run id: run-<timestamp>
- source: <discussion-pack | import-lite>
- selected <discussion-pack | import-lite evidence>: <path | (not found)>

## Blockers

- <blocked only: blocker item>

## Requirement Intake

- Imported REQ count: <ready only: number>

## Pack Gaps

- <ready only: what the selected pack lacks or contradicts | none>

## Open Questions (Carry-over)

- <carried-over assumption | none>

## Next Commands

- /qfai-discussion
