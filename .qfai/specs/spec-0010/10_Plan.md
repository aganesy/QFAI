# 10 Plan

## Objective

- Keep discussion authoring aligned with the exploration-first harness.

## Implemented Work

- Replace old design-evaluation sidecar family references with exploration-first sidecar references.
- Keep `04_Sources.md` as the reference-research registry.
- Ensure discussion artifacts stop before winner selection and design-system finalization.

## Acceptance

- Sidecar family names match the shipped templates.
- Required headings match the current validators.
- No active prose requires legacy single-winner selection, legacy evaluation contract, or discussion-time design-system generation.

## Second-Wave (v1.9.2) — How

- Mock template (REQ-0154 / DR-0265): emit anchor-form `<a href="#<name>">` links in the discussion mock template; update SKILL.md authoring guidance to instruct anchor-form. Keep `QFAI-MOCK-010` strict (PASS `#name` + `http(s)://`). Treat template ↔ validator as an SSOT-sync pair guarded by `R-MOCK-HREF-DRIFT`.
- Active session pointer writer (REQ-0155 / DR-0266): on pack finalization, `/qfai-discussion` writes `.qfai/state.json#discussion.currentId` with the authored pack ID. `qfai discussion list --active` reads the pointer; resolution rejects absent/missing/duplicate with an error naming candidate dirs and `qfai discussion use <id>`. No mtime inference; no committed-config storage.
