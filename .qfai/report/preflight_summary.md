# Preflight Summary — SDD Run (second-wave defect remediation, v1.9.2)

## Status: PASS

## Input Selection

| Priority | Source                                                              | Selected | Notes                                                                                                          |
| -------- | ------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| P1       | `.qfai/assistant/constitution/*`                                    | ✅       | shared-skill-operating-baseline / shared-skill-delegation-baseline / test-layers                               |
| P2       | `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*`          | ✅       | agent-routing, review-profiles, agent-catalog, test-layers                                                     |
| P3       | `.qfai/specs/_policies/03_Capabilities.md` + active spec heads      | ✅       | Stage 1 Triage input (16 active specs; CAP-0001..0016)                                                          |
| P4       | `.qfai/specs/spec-0004,0006,0008,0010,0012,0013,0014,0015/**`       | ✅       | Multi-spec append-first fan-out (8 target specs, all `Status: active`)                                          |
| P5       | `.qfai/discussion/discussion-20260527075558258/**`                  | ✅       | Latest pack (15 files, `Disposition: open` count = 0, Reviewer Result `PASS`)                                  |

## Discussion Pack Readiness

| Check                              | Status  | Notes                                                                                                                    |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| All 15 required files present      | ✅ PASS | `01_Context.md` … `99_delta.md` (22 deferred-OQ rows in `13_Deferred.md`; 2 resolved in `12_OQ-Resolution-Log.md`)        |
| No blocking OQ (open=0)            | ✅ PASS | `11_OQ-Register.md` Open=0; 18 OQs (2 resolved / 16 deferred) + 6 carry-forward deferred                                  |
| Surface classification             | ✅ PASS | `ui_bearing: false` (target = QFAI package internals: CLI / validators / skill bodies / manifest contracts / schemas)     |
| `prototyping.yaml` requiredness    | ✅ PASS | non-UI pack — not required                                                                                               |
| DESIGN.md freeze                   | ⏭️ SKIP | Not applicable (non-UI-bearing); per skill `Phase 0 DESIGN.md Freeze` clause "UI-bearing only"                            |
| Reviewer gate                      | ✅ PASS | `requirements-reviewer` = PASS (cycle 1; recorded in `14_Review-Request.md`)                                             |
| Validate (discussion profile)      | ✅ PASS | `validate --profile discussion --fail-on error` exit 0 (single warning = v1.9.1 OC-60 deprecation noise, not pack-owned) |

## Deferred OQ Handling (SDD-gated)

16 net-new OQs are deferred to `/qfai-sdd` for implementation-time selection; each is the structural driver of one or more REQs. The decision owner picks the option at Phase 0/Phase 2 and persists a DR row in `_policies/08_Decisions.md` (or per-spec `07_Decisions.md`).

| OQ-ID   | Driver REQ(s)        | Decision Owner | SDD Action                                                                                       |
| ------- | -------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| OQ-0152 | REQ-0150             | solution-arch  | Skeleton UX shape: full-gen / token-placeholder / minimal-stub                                   |
| OQ-0153 | REQ-0151             | solution-arch  | DESIGN.md patch-zone shape: front-matter zone / generational lock / hybrid                       |
| OQ-0154 | REQ-0152             | solution-arch  | `prototyping.mode: exploration` gate-relaxation table (minimal / medium / full)                  |
| OQ-0155 | REQ-0153             | backend-eng    | Stale review-pack TTL default: 7d / 14d / 30d / configurable                                     |
| OQ-0156 | REQ-0154             | solution-arch  | `QFAI-MOCK-010` direction: allowlist / template-anchor / hybrid                                  |
| OQ-0157 | REQ-0155             | solution-arch  | Active session pointer surface: CLI / state.json / config / hybrid                               |
| OQ-0158 | REQ-0164             | solution-arch  | `primary_tasks` recommended count band                                                           |
| OQ-0159 | REQ-0164             | solution-arch  | `primary_tasks` structured-form JSON Schema                                                       |
| OQ-0160 | REQ-0160             | solution-arch  | Default Autopilot Policy template (which categories → auto/ask/required)                          |
| OQ-0161 | REQ-0158/0163        | solution-arch  | Supporting shape decisions (see `13_Deferred.md`)                                                |
| OQ-0162 | REQ-0158             | solution-arch  | Envelope-deviation taxonomy (which AskUserQuestion templates trigger the audit log)              |
| OQ-0163 | REQ-0171             | solution-arch  | `qfai audit log` CLI shape (flags / output format)                                               |
| OQ-0164 | (CJK residual)       | (defer)        | Per-rule CJK word-count configurability — residual follow-up                                     |
| OQ-0165 | (/proposal)          | (defer)        | Entire /proposal defect family deferred to a separate pack (user-direction exclusion)            |
| OQ-0166 | REQ-0157             | solution-arch  | `D-SCAFFOLD-PLACEHOLDER` escalate-to-error cycle count                                            |
| OQ-0167 | REQ-0167             | solution-arch  | pack-location lint scope details                                                                 |

Carry-forward deferrals (no disposition change this pack): OQ-0114 / 0116 / 0117 / 0118 / 0119 / 0122.

## Stage 1 Triage — Summary (detail persisted in delta files)

The pack introduces 24 REQs (22 must + 2 should) and the NFR set, distributed across 8 existing active specs. **No new CAP is required**; all remediations land as **UPDATE:APPEND** (new US/AC/BR/EX/TC + contract rows) or **UPDATE:MODIFY** (documentation rewrites, REQ-0173). Append-first per `_policies/11_Slice-Policy.md`. No approval-required operation (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE) is present, so no AskUserQuestion approval gate is triggered for Stage 1.

| Target spec | CAP     | Capability (pack 05_Scope)        | REQs                              | Op            |
| ----------- | ------- | --------------------------------- | --------------------------------- | ------------- |
| spec-0012   | CAP-0012| 1,2,3,13,16 (qfai-prototyping)    | 0150, 0151, 0152, 0162, 0165      | UPDATE:APPEND |
| spec-0006   | CAP-0006| 4,7,10 (qfai doctor)              | 0153, 0156, 0159 (probe side)     | UPDATE:APPEND |
| spec-0010   | CAP-0010| 5,6 (qfai-discussion)             | 0154, 0155 (writer side)          | UPDATE:APPEND |
| spec-0008   | CAP-0008| 8 (qfai-atdd)                     | 0157                              | UPDATE:APPEND |
| spec-0015   | CAP-0015| 9,11,12,21 (agents/skills)        | 0158, 0160, 0161, 0168, 0171, 0172| UPDATE:APPEND |
| spec-0013   | CAP-0013| 6,14,15 (qfai-sdd)                | 0155 (reader), 0163, 0164         | UPDATE:APPEND |
| spec-0014   | CAP-0014| 17 (qfai-verify)                  | 0166 (certify side)               | UPDATE:APPEND |
| spec-0004   | CAP-0004| 15,17,19 (qfai validate)          | 0164 (validator), 0166, 0167      | UPDATE:APPEND |
| `_policies` | —       | 18,22,23 (cross-cutting)          | 0167, 0169, 0170, 0173            | UPDATE:APPEND / MODIFY |

## Batch Delegation Plan (no-argument run)

Per `/qfai-sdd` "No-argument batch delegation (MUST)":

- Contracts-first (Phase 0) + Outline (Phase 1) run once for the batch (cross-spec `_policies/01..11` + `.qfai/contracts/**`).
- Slice (Phase 2) delegated in parallel per target spec.
- Validate gate + Reviewer gate run once at batch tail.

## Constraints Acknowledged

- Distributed-surface hygiene (`.agents/rules/distributed-surface.md`) applies to all shipped artifacts (new SKILL.md sections, manifest.json, handoff schema docs, migration memo, CHANGELOG entry).
- Version-discipline: pinned branch `feature/v1.9.2`; pin authorizes the release version for at least the first slice. Later slices MAY use a follow-on pin (OQ-0122 carry-forward). No tag / publish / force-push / amend / AI-merge without explicit user instruction.
- `packages/qfai/` is the source of truth modified by implementation; `.qfai/` here is the dev spec/runtime surface this SDD run authors.

## Final Preflight Status: PASS — proceed to Stage 1 persist + Phase 0 Contracts-first.
