# Preflight Summary — SDD Run (qfai-prototyping defect remediation, 2026-05-24)

## Status: PASS

## Input Selection

| Priority | Source                                                              | Selected | Notes                                                                                                          |
| -------- | ------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| P1       | `.qfai/assistant/constitution/*`                                    | ✅       | Read (shared-skill-operating-baseline / shared-skill-delegation-baseline / test-layers)                        |
| P2       | `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*`          | ✅       | Read (agent-routing, review-profiles, agent-catalog, test-layers)                                              |
| P3       | `.qfai/specs/_policies/03_Capabilities.md` + all active spec heads  | ✅       | Stage 1 Triage input (16 active specs)                                                                         |
| P4       | `.qfai/specs/spec-0004,0006,0012,0013,0015/**`                      | ✅       | Multi-spec append-first fan-out                                                                                |
| P5       | `.qfai/discussion/discussion-20260523221141355/**`                  | ✅       | Latest pack (15 files, `Disposition: open` count = 0, Reviewer Result `PASS`)                                  |

## Discussion Pack Readiness

| Check                              | Status  | Notes                                                                                                                    |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| All 15 required files present      | ✅ PASS | `01_Context.md` through `99_delta.md` (14 deferred-OQ rows in `13_Deferred.md` + 8 resolved in `12_OQ-Resolution-Log.md`) |
| No blocking OQ (open=0)            | ✅ PASS | `11_OQ-Register.md` "Disposition: open = 0" confirmed; 22 OQs total (8 resolved / 14 deferred / 0 open)                  |
| Surface classification             | ✅ PASS | `ui_bearing: false` (target = QFAI package internals: CLI / validators / skill bodies / generator-prompt / capture infra) |
| `prototyping.yaml` requiredness    | ✅ PASS | non-UI pack — not required                                                                                               |
| DESIGN.md freeze                   | ⏭️ SKIP | Not applicable (non-UI-bearing); per skill `Phase 0 DESIGN.md Freeze` clause "UI-bearing only"                            |
| Reviewer gate                      | ✅ PASS | `requirements-reviewer` = PASS (cycle 1; recorded in `14_Review-Request.md`)                                             |

## Deferred OQ Handling (SDD-gated)

14 OQs are deferred to `/qfai-sdd` for implementation-time selection. They are the structural drivers of multiple REQs:

| OQ-ID   | Driver REQ(s)              | Decision Owner | SDD Action                                                                                                            |
| ------- | -------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| OQ-0103 | REQ-0101                   | solution-arch  | Pick Tailwind ↔ gate remedy among α/β/γ/δ/ε at Phase 0 contracts-first; persist DR row in `_policies/08_Decisions.md` |
| OQ-0104 | REQ-0105                   | backend-eng    | Pick `--shadow-*:` strip regex shape A/B/C; persist DR row                                                            |
| OQ-0105 | REQ-0106                   | solution-arch  | Pick CJK word-count algorithm (Intl.Segmenter / heuristic / OR / configurable); persist DR row                        |
| OQ-0107 | REQ-0112 / REQ-0113        | solution-arch  | Pick certify scope resolution A/B/C (split / scoped field / new subcommand); persist DR row                           |
| OQ-0108 | REQ-0114                   | solution-arch  | Pick multi-spec resolution A (SKILL.md realign) or B (complete per-spec migration); persist DR row                    |
| OQ-0109 | REQ-0121                   | solution-arch  | Severity policy for lap-009 / lap-010 (advisory-failing as written, or advisory-warning); persist DR row              |
| OQ-0110 | REQ-0116                   | backend-eng    | Screen-id casing normalization (underscore / hyphen / accept-both); persist DR row                                    |
| OQ-0111 | REQ-0120                   | solution-arch  | Pick validate.json profile disambiguation A/B/C; persist DR row                                                       |
| OQ-0112 | REQ-0119                   | backend-eng    | primarySpecId input normalization SHOULD vs MUST; persist DR row                                                      |
| OQ-0114 | REQ-0123                   | (defer)        | License-catalog full unfreeze automation — deferred beyond this pack                                                  |
| OQ-0116 | REQ-0130                   | (defer)        | /proposal R7 助詞 whitelist — defer to a future pack focused on /proposal; REQ-0130 remains informational              |
| OQ-0117 | REQ-0128                   | (defer)        | Subagent cache redesign — deferred beyond this pack                                                                   |
| OQ-0118 | REQ-0129                   | (defer)        | --cycle N peek-mode design — deferred beyond this pack                                                                |
| OQ-0119 | (advisory)                 | (defer)        | TBD — defer                                                                                                           |
| OQ-0122 | (advisory)                 | (defer)        | TBD — defer                                                                                                           |

## Slice Decision (Stage 1 Triage — preview)

The pack introduces 30 REQs (25 must + 5 should) and 15 NFRs (12 must + 3 should) distributed across multiple existing active specs. **No new CAP is required**; all remediations land as **UPDATE:APPEND** (or UPDATE:MODIFY for documentation rewrites) on existing capabilities. Append-first per `_policies/11_Slice-Policy.md`.

| Spec      | Action  | Category   | REQs (primary)                                                                                                                       | Rationale                                                                                                                |
| --------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| spec-0004 | APPEND  | CLI        | REQ-0120 (validate.json profile disambiguation), REQ-0102 / REQ-0125 (SSOT-sync CI lane wiring through validate)                     | `qfai validate` is CAP-0004; profile output handling is its surface.                                                     |
| spec-0006 | APPEND  | CLI        | REQ-0107 (playwright probe primary), REQ-0122 (skills.integrity severity downgrade)                                                  | `qfai doctor` is CAP-0006; probe ordering + severity defaulting are its surface.                                         |
| spec-0012 | APPEND  | skill      | REQ-0101, 0103–0106, 0108, 0109, 0110, 0111, 0112, 0114, 0116, 0117, 0118, 0119, 0121, 0123, 0128, 0129 (19 REQ)                     | qfai-prototyping is CAP-0012; generator-prompt / iterate / certify / validators are all its surface.                     |
| spec-0013 | APPEND  | skill      | REQ-0115 (UI contract template `primary_tasks` slot + validate lane)                                                                 | qfai-sdd is CAP-0013; contract template is its surface.                                                                  |
| spec-0015 | APPEND  | agent      | REQ-0113 (R-CERTIFY-VERIFY-CIRCULAR), REQ-0125 (R-PROMPT-SCANNER-DRIFT enforcement)                                                  | Reviewer-Gate findings are CAP-0015 (agent collective spec); finding-code definitions live in agent contracts.           |
| _policies | APPEND  | cross-spec | REQ-0124 (doc realignment policy), REQ-0126 (backwards-compat adapter / deprecation policy), REQ-0127 (migration memo authoring)     | Cross-cutting policies/process — register in `_policies/10_delta.md`. REQ-0130 is informational (OQ-0116 deferred).      |

**Triage operations:** 30 × UPDATE:APPEND (no CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / REMOVE). No AskUserQuestion required per `_policies/11_Slice-Policy.md`.

## Constitutional Alignment (Stage 0 read)

| Source                                                                  | Key Constraints Applied                                                                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `.qfai/assistant/constitution/shared-skill-operating-baseline.md`       | Stage 0 mandatory, gate-failure auto-repair protocol, AskUserQuestion protocol, Delta Rejected Guard                                    |
| `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`      | Orchestrator must not draft primary artifact; delegate to requirements-analyst / solution-architect / test-design-analyst; reviewer gate |
| `.qfai/assistant/catalog/test-layers.md`                                | TC layer pinning (US→E2E, TC→Integration, CON-API→API)                                                                                  |
| `.agents/rules/distributed-surface.md`                                  | No internal `spec-NNNN` (N ≥ 10) / `CAP-0010+` / `DEC-NNNN-NNNN` / `DR-NNNN` / `OQ-NNNN-NNNN` / `vN.M[.P]` / `schemaVersion` in shipped surface |
| `.agents/rules/version-discipline.md`                                   | Branch `feature/v1.9.1` is pinned — sync `packages/qfai/package.json#version` + CHANGELOG H2 at PR-ready time                            |
| `CLAUDE.md` (project rules)                                             | Source under `packages/qfai/`; do not modify `.qfai/` for package improvement; tmp/ for scratch; root-additions require approval        |

## Next Steps (this SDD invocation)

1. Persist Stage 1 Triage table into `_policies/10_delta.md` (cross-spec rows) and per-spec `09_delta.md` (single-spec rows).
2. Phase 0 Contracts-first: normalize affected contracts under `.qfai/contracts/**` (capture / prototyping.json / validate.json / probe / Tailwind contract).
3. Phase 1 Outline: refresh `_policies/05_Contracts.md` Contract Index; add deferred-OQ resolutions to `_policies/08_Decisions.md`.
4. Phase 2 Slice: per spec append US/AC/BR/EX/TC; size threshold honored (`acCount ≤ 30 && tcCount ≤ 50`).
5. Phase 3 Plan finalize after first slice gates pass.
6. Phase 4 Delta update.
7. `qfai validate --profile sdd --fail-on error` until error=0.
8. Reviewer gate (completion-reviewer; architecture-reviewer for structural / contract / CLI changes).
9. Evidence files `.qfai/evidence/sdd-spec-NNNN.md` per touched spec.

## Capability Probe (Sub-agent Delegation)

Per `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`, the orchestrator MUST delegate primary authoring. Probe results captured at Stage 1 below in the per-task assignments.
