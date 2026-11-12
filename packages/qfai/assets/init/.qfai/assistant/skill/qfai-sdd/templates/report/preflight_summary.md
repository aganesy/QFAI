# Preflight Summary

Output shape of `npx qfai sdd preflight` (Stage 0 of `/qfai-sdd`). The command
writes this file; re-run it instead of filling the form in by hand. `blocked`
runs emit Status / Blockers / Open Questions / Next Commands, `ready` runs emit
Status / Open Questions. The source is the deliberation record `--record`
names, else the imported specification `--import` names. Only a missing or
unreadable source blocks: a record that leaves a question open or contradicts
itself is still read, and SDD states each gap in its report. Carry-over entries
come from `--assume <text>` and are preserved across re-runs, so findings the
command does not compute can still live here.

## Status

- status: <ready | blocked>
- run id: run-<timestamp>
- source: <ready only: deliberation-record | import-lite>
- selected <deliberation-record | import-lite>: <ready only: path>
- selected input: <blocked only: (none)>

## Blockers

- <blocked only: blocker item>

## Open Questions (Carry-over)

- <carried-over assumption | none>

## Next Commands

- /qfai-discussion
