# Scaffolding

`npx qfai atdd scaffold --spec <spec-id>` bulk-emits one placeholder test per
`TC-*` **this skill owns**, each carrying its `QFAI:SPEC-XXXX:TC-YYYY`
annotation. Skeletons land in `tests/integration/<spec-id>/` — the directory
`QFAI-ATDD-112` scans — so a filled-in skeleton counts as coverage. It is
idempotent: existing files are left untouched.

## Which language the skeleton is written in

The skeleton's language is derived from
`qfai.config.yaml#validation.traceability.testFileGlobs` — the same key
`QFAI-ATDD-112` derives its scan extensions from, so the file the command
writes is always a file the gate reads. A JS/TS glob set (and the unconfigured
default) gets a `vitest` body; a Python one gets a `unittest.TestCase`
subclass, which pytest **and** `python -m unittest discover` both collect —
the globs name an extension, never a runner, and a module-level `def test_...`
that unittest never collects would let you clear the gate with zero tests run.
A stack with neither is refused with a non-zero exit naming the derived
pattern: author those TCs by hand in `tests/integration/<spec-id>/`, keeping
the `QFAI:SPEC-XXXX:TC-YYYY` annotation.

The file **name** follows the same key one level finer. The extension is one
the globs actually admit (`tests/**/*.test.js` gets `.test.js`, not `.test.ts`),
and the basename follows the configured convention — `test_<tc_id>.py` or
`<tc_id>_test.py`, `<TC-ID>.test.ts` or `<TC-ID>.spec.ts`; extglob patterns
(`*.@(test|spec).ts`) are read the way fast-glob reads them. `QFAI-ATDD-112`
widens to the bare extension, so a name your runner does not collect would
clear the coverage gate with a test that never runs; when no name the command
can emit matches your globs, it refuses instead. A skeleton an earlier run
wrote under a different convention is removed while it is still an untouched
placeholder — one that already carries a real assertion is kept, and named on
stderr so you can port it.

The refusal is evaluated only when the spec actually has L3 skeletons to emit,
so sweeping many specs on an unsupported stack still succeeds for the ones with
nothing in scope.

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
