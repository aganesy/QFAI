# Preflight Summary — SDD Run (layered CI test scaffold adoption, CHG-007)

## Status: PASS

- source: discussion-pack
- selected discussion-pack: `.qfai/discussion/discussion-20260804173914356/`
- run date: 2026-08-05

## Input Selection

| Priority | Source                                                       | Selected | Notes                                                                                        |
| -------- | ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| P1       | `.qfai/assistant/constitution/*`                             | ✅       | shared-skill-operating-baseline / shared-skill-delegation-baseline / drift-protocol           |
| P2       | `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*`   | ✅       | agent-catalog, agent-routing, review-profiles, test-layers                                    |
| P3       | `_policies/03_Capabilities.md` + `11_Slice-Policy.md` + active spec heads | ✅ | Stage 1 Triage input (16 active specs at entry; CAP-0001..0016)                    |
| P4       | `.qfai/specs/spec-0003,0004,0006,0008,0009,0012,0015/**`     | ✅       | Append-first fan-out targets, all `Status: active`                                            |
| P5       | `.qfai/discussion/discussion-20260804173914356/**`, `.qfai/contracts/**` | ✅ | Latest pack (15 files, `Disposition: open` = 0, reviewer result PASS)              |

## Discussion Pack Readiness

| Check                          | Status  | Notes                                                                                                     |
| ------------------------------ | ------- | --------------------------------------------------------------------------------------------------------- |
| All 15 required files present  | ✅ PASS | `01_Context.md` … `99_delta.md`                                                                            |
| No blocking OQ (open = 0)      | ✅ PASS | `11_OQ-Register.md`: 22 rows — 18 resolved, 4 deferred, 0 open                                              |
| Surface classification         | ✅ PASS | `ui_bearing: false`, `primary_surface: non-ui` (target = GitHub Actions CI + shipped workflow templates)   |
| DESIGN.md freeze               | ⏭️ SKIP | Not applicable — skill clause is "UI-bearing only"                                                          |
| Reviewer gate (upstream)       | ✅ PASS | `.qfai/review/review-20260804183752006/summary.json` — completion / requirements / architecture all PASS   |
| doctor                         | ✅ PASS | ok=15 info=1 warning=1 error=0, exit 0                                                                     |
| validate (sdd profile, baseline) | ✅ PASS | error=0 warning=13 info=4, exit 0                                                                        |

Advisory findings carried forward unchanged (pre-existing, not produced by this work):
`paths.srcDir is missing` (warning), `guardrails.present` (info), and `QFAI-DCON-034`
(root `DESIGN.md` is still the unreplaced `qfai init` sample brand). The last matters
only for UI-bearing targets, so it does not gate this batch.

## Canonical Launcher

This repository is the **producer** of the `qfai` package, not a consumer. The root
`preinstall` guard `scripts/check-not-a-dependency.mjs` structurally forbids the
monorepo from depending on itself, so no `node_modules/.bin/qfai` exists and none
should. The dogfood launcher is therefore the built CLI at
`packages/qfai/dist/cli/index.mjs` (declared as `bin.qfai` in
`packages/qfai/package.json`), and every gate in this run uses it. Recorded explicitly
because it is a deliberate deviation from the shared baseline's `node_modules/.bin`
proof, which is written for consuming projects.

## Requirement Intake

- REQ: 25 (`REQ-0001`..`REQ-0025`)
- NFR: 16 (`NFR-0001`..`NFR-0016`)
- Design/technical constraints: 28 (`DTC-1`..`DTC-28`)

Surface split taken verbatim from the pack's `Surface` column. No requirement's
deliverable spans surfaces; `both` marks requirements whose subject *is* the
relationship between the two surfaces.

| Surface | Count | REQ IDs                     |
| ------- | ----- | --------------------------- |
| own-CI  | 13    | REQ-0001..0012, 0025        |
| shipped | 7     | REQ-0014..0019, 0021        |
| both    | 5     | REQ-0013, 0020, 0022..0024  |

## Stage 1 Triage Outcome

Resolves the pack's deferred `OQ-0015` (spec and capability allocation). Full record with
rationale and rejected alternatives: `_policies/10_delta.md` § `2026-08-05 — CHG-007`
(DR-0275, DR-0276).

| Target                                            | Operation           | Requirements                | Approval        |
| ------------------------------------------------- | ------------------- | --------------------------- | --------------- |
| `spec-0017` (NEW, `CAP-0017` Repository Toolchain) | CREATE              | REQ-0001..0013, 0023, 0025  | user@2026-08-05 |
| `spec-0003` (`qfai init`)                          | UPDATE:APPEND       | REQ-0014..0021              | not required    |
| `spec-0006` (`qfai doctor`)                        | UPDATE:APPEND       | REQ-0022 (detection half)   | not required    |
| `spec-0008` (`/qfai-atdd`)                         | UPDATE:APPEND       | REQ-0024                    | not required    |
| `spec-0004` / `spec-0009` / `spec-0012`            | UPDATE:MODIFY       | cascade rows                | not required    |
| `spec-0015`                                        | UPDATE:APPEND       | cascade row                 | not required    |
| `_policies`                                        | UPDATE:MODIFY + APPEND | gap revocation, `toolchain` category | user@2026-08-05 |

Approval-required rows in this batch: **one decision** — the `CREATE` of `spec-0017`, approved as
`user@2026-08-05`. Note that `spec-0017/09_delta.md` persists that single decision as **15 per-REQ
`CREATE` rows** (one per spec-local requirement), every one carrying the same approver and citing
`CAP-0017`. The row count differs from the decision count by design; an audit reading the per-spec
delta should expect 15, not 1.

**No `UPDATE:REMOVE` row exists.** Verified before triage was persisted: the vitest
`compatibility` project and the repository's duplicate
`.github/workflows/qfai-validate.yml` — both removed by requirements in this batch
(REQ-0011, REQ-0025) — are referenced by **zero** spec items, so neither removal cuts a
downstream reference.

## Structural Precondition Resolved During Stage 1

Adding a 17th capability was **machine-impossible** at entry.
`validateSpecSplitByCapability` derives its expected spec set positionally from the CAP
count (`packages/qfai/src/core/validators/specSplitByCapability.ts:75` maps each CAP's
list *index* to `spec-000<index+1>`, never reading the CAP number). With 17 CAP rows it
demands `spec-0001..spec-0017`. Because `spec-0017` and `CAP-0017` had been reserved as
permanent gaps on 2026-05-06, the 17th capability had no legal name: the reserved ID
violated the reservation, and the next free ID raised `QFAI-SPLIT-103` (missing
`spec-0017`) **and** `QFAI-SPLIT-104` (extra `spec-0018`) simultaneously, both `error`.

Reproduced empirically in this run — after registering `CAP-0017` but before creating the
directory, validate returned exactly:

```text
error=3 ... result=FAIL
QFAI-SPLIT-102: CAP件数と spec件数が一致しません (CAP=17, spec=16)
QFAI-SPLIT-103: CAPに対応する spec ディレクトリが不足しています: spec-0017
```

The user revoked the permanent-gap reservation on 2026-08-05 (DR-0275), which is what
makes the contiguous state reachable. The residual defect — §ID 安定性ルール 5's default
of leaving a gap stays unsatisfiable against a positional gate for **any** future reserved ID once
the capability count reaches it — inner-range or trailing is irrelevant, and `spec-0017` was in fact
a *trailing* gap that detonated at the very next capability addition — is recorded as `OQ-0023` and deliberately **not**
repaired here: the validator is `CAP-0004` surface with its own tests, and
`08_Decisions.md` DR-0001-0005 forbids inflating a pack beyond an atomic slice.

## Newly Recorded Open Questions

| OQ      | Subject                                                                                              | Owner              | Severity | Disposition |
| ------- | ---------------------------------------------------------------------------------------------------- | ------------------ | -------- | ----------- |
| OQ-0023 | Make the CAP↔spec 1:1 gate pair by **number** rather than list position                                | solution-architect | medium   | deferred    |
| OQ-0024 | `spec-0005` declares 10 AC / 10 TC but carries **zero** `-0005-` annotations in `packages/qfai/tests/**` | qa-strategist    | medium   | deferred    |
| OQ-0025 | Three spec-claimed implementation paths do not exist; `16_Traceability-ledger.md` is adopted in only 4 of 17 specs, so `QFAI-TRACE-001` is skipped for the other 13 | solution-architect | high | deferred |
| OQ-0026 | Adopter drift channel has a permanent blind spot for adopters who installed before the provenance record existed | user | medium | deferred |
| OQ-0027 | Duplicate item-ID definitions inside one spec are undetected by every validator (measured on a spec this change never touched) | qa-strategist | high | deferred |
| OQ-0028 | No validator reconciles a delta's declared ID ranges against the pack's actual contents | qa-strategist | medium | deferred |

All six were found by measurement during this run. Four are pre-existing conditions this change did
not cause. Two are consequences of this change's own surface: the adopter drift-channel blind spot
that the new provenance record introduces, and the delta/pack reconciliation gap that this run's own
under-declared delta exposed. None is repaired here.

One further deferral, **spec-local**, WAS created by this change and is recorded at the spec
level rather than in the policy table above: registering the two new error-class reviewer-gate
finding codes into the closed justification catalog. By the catalog's own discriminator
(severity class, not emitter identity) they belong in it, but adding a code extends a closed
requirement contract and must move in lockstep with the catalog SSOT, the reviewer SSOT and the
owning spec's closed-set acceptance criterion — outside this pack's atomic slice. Until that
lands, the gate surfacing them without a justification demand is a known temporary divergence,
not a principle. Named here so the run-level narrative does not omit the one open question this
change actually created.

## Phase Order Note

Phase 0 (Contracts-first) was dispatched **after** the requirements-side authoring of
Phase 2 rather than strictly before it. The two touch disjoint files — contracts under
`.qfai/contracts/**` plus `_policies/05_Contracts.md`, versus spec `01`/`02`/`03` files —
and no `BR` / `EX` / `TC` was authored before the contracts existed. Phase 2c obligation
reconciliation, which exists precisely to re-check contracts against the `BR` / `AC`
Phase 2 produced, is run for every target spec. Recorded rather than left implicit.

## Next Commands

- `/qfai-atdd` — test-first path for the acceptance obligations
- `/qfai-implement` — after `tdd/test-list.md` is seeded for each target spec
- `/qfai-prototyping` — not applicable (non-UI batch)
