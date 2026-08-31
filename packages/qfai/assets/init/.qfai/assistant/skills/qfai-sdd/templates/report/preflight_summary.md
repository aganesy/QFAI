# Preflight Summary

Output shape of `npx qfai sdd preflight` (Stage 0 of `/qfai-sdd`). The command writes this file; re-run it instead of filling the form in by hand. `blocked` runs emit Status / Blockers / Open Questions / Next Commands, `ready` runs emit Status / Requirement Intake / Open Questions. Carry-over entries come from `--assume <text>` and are preserved across re-runs, so findings the command does not compute can still live here.

## Status

- status: <ready | blocked>
- source: <discussion-pack | import-lite>
- selected <discussion-pack | import-lite evidence>: <path | (not found)>

## Blockers

- <blocked only: blocker item>

## Requirement Intake

- Imported REQ count: <ready only: number>

## Open Questions (Carry-over)

- <carried-over assumption | none>

## Next Commands

- /qfai-discussion
