# Evidence: /qfai-sdd (<spec-id>)

> Canonical layout for `.qfai/evidence/sdd-<spec-id>.md`, a Mandatory Output of
> `/qfai-sdd`. Keep every `##` heading below, in this order, even when a section
> is empty — write `- none` rather than deleting the heading. The completion
> reviewer grades this file's shape against this template.

## Objective

- Spec target: <spec-id>
- Objective: <what this SDD cycle set out to change for this spec>

## Inputs reviewed

- <path or pack id>
- <path or pack id>

## Preflight summary path

- `.qfai/report/preflight/run-<timestamp>/preflight_summary.md` (run id: <run-id>)

> Cite the run-scoped copy, never `.qfai/report/preflight_summary.md`. That path
> is the latest-run pointer and every rerun rewrites it, so once a second cycle
> has run it no longer names the preflight this spec was triaged against.

## Triage decisions

> One row per incoming REQ/NFR handled for this spec, mirroring the Triage table
> persisted in `09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec).
> Operation: `CREATE` | `UPDATE` | `DELETE` | `SPLIT` | `MERGE` | `SUPERSEDE`.
> Sub-op (UPDATE only): `APPEND` | `MODIFY` | `REMOVE`.
> Approved By is required for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE /
> UPDATE:REMOVE; use `-` when approval is not required.

| Source   | Subject     | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | --------- | ------ | ----------- | --------- |
| REQ-XXXX | <one-liner> | UPDATE    | APPEND | -           | <why>     |

## Open questions

- OQ-XXXX: <question> — Disposition: open | resolved | deferred
- <or> none

## Decisions made

- DEC-XXXX / DELTA-XXXX: <decision> — <rationale>
- <or> none

## Work performed

- <artifact created or updated, with path>
- <artifact created or updated, with path>

## Commands executed

```
npx qfai validate --profile sdd --fail-on error --format github
```

> No redirect. `npx qfai validate` writes `<paths.outDir>/validate.log` itself on
> every run, always pointing at that run's `run-*/` directory, so a `| tee` is
> both unnecessary and not portable to PowerShell. Same command as `SKILL.md`
> step 8 and `references/sdd-quality-gate.md`.

## Validate evidence paths

- `.qfai/report/validate.log`
- `.qfai/report/run-<timestamp>/` (run id: <run-id>, status: pass | fail)
- `.qfai/report/specs-coverage/<spec-id>.md`

## Work Orders Summary

> Fixed 6-column schema from
> `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#work-orders-summary`.
> Do not add, remove or rename columns.
> `Status` accepts exactly `PASS` or `REVISE` — no other value (no `PENDING`,
> no `N/A`, no `FAIL`). A work order that has not been reviewed yet is `REVISE`.

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS                 |

## Gaps / Open risks

- <residual risk, or the OQ that carries it>
- <or> none

## Final status

- Final status: PASS | REVISE
- Rationale: <one line>

> `Final status` accepts exactly `PASS` or `REVISE`, matching the reviewer
> vocabulary in `shared-skill-delegation-baseline.md#verdict-vocabulary`. A
> `REVISE` here maps to `status: "FAIL"` when a review pack's `summary.json` is
> written; they are the same outcome. Do not invent a third verdict.
