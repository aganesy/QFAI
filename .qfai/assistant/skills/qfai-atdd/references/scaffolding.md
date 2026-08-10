# Scaffolding

`npx qfai atdd scaffold --spec <spec-id>` bulk-emits one placeholder test per
`TC-*` **this skill owns**, each carrying its `QFAI:SPEC-XXXX:TC-YYYY`
annotation. Skeletons land in `tests/integration/<spec-id>/` — the directory
`QFAI-ATDD-112` scans — so a filled-in skeleton counts as coverage. It is
idempotent: existing files are left untouched.

## Which TCs are skipped, and why

Skeletons are integration-only, so two groups of TC are skipped, both named on
stderr.

`L1` / `Unit` and `L2` / `Component`: their skeleton would land in
`tests/integration/**`, the duplication the Coverage obligations section
forbids, and `QFAI-ATDD-112` would not count it — filling one in discharges
nothing. Their ledger row under `/qfai-implement` is where they are owed.

`L4` / `API` and `L5` / `E2E`: their home is `tests/api/**` / `tests/e2e/**`, so
an integration skeleton is both uncounted and a forbidden reference
(`QFAI-ATDD-123`). Author those by hand in their own directory — or re-file the
obligation as `CON-API-*` / `US-*`, which is what a `TC-*` at L4/L5 usually
means (`.qfai/assistant/catalog/test-layers.md#annotation-routing`).

## A skeleton is not a discharge

A skeleton left in placeholder shape across repeated validate runs escalates
(`qfai.config.yaml#atdd.scaffoldEscalateCycles`), so scaffolding is a start, not
a discharge of the obligation.
