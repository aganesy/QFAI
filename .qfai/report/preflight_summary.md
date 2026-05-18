# Preflight Summary — SDD Run (CHG-002, 2026-05-18)

## Status: PASS

## Input Selection

| Priority | Source | Selected | Notes |
|----------|--------|----------|-------|
| P1 | `.qfai/assistant/instructions/*` | ✅ | Read |
| P2 | `.qfai/assistant/steering/*` | ✅ | Read |
| P3 | `.qfai/specs/_policies/03_Capabilities.md` + spec-0012 active summary | ✅ | Stage 1 Triage input |
| P4 | `.qfai/specs/spec-0012/**` | ✅ | Target spec to UPDATE |
| P5 | `.qfai/discussion/discussion-20260516144141078/**` | ✅ | Latest discussion pack (15 files, Disposition: open count = 0) |

## Discussion Pack Readiness

| Check | Status | Notes |
|-------|--------|-------|
| All 15 required files present | ✅ PASS | `01_Context.md` through `99_delta.md` |
| No blocking OQ (open=0) | ✅ PASS | `11_OQ-Register.md` Disposition: open count = 0; OQ-0003 deferred to `13_Deferred.md` only |
| Surface classification | ✅ PASS | `ui_bearing: false`, `primary_surface: non-ui` (skill-redefinition, not a UI design) |
| `prototyping.yaml` requiredness | ✅ PASS | non-UI pack のため不要 |
| Reviewer gate | ✅ PASS | requirements-reviewer = PASS (recorded in discussion pack `14_Review-Request.md` Reviewer Response section) |

## Deferred OQ Handling (SDD-gated)

| OQ-ID | Title | Gate | SDD Action |
|-------|-------|------|------------|
| OQ-0003 (discussion) | Airgapped run support | ops | Deferred — mirrored to `spec-0012/08_Open-questions.md` OQ-0012-0001 with mitigation (deterministic exit 66 + error message) and next-decision point (ops gate post-v1 dogfooding) |
| OQ-0012-0002 | `prototyping.json#iterations[]` shape under per-spec namespace | implement | Recommendation `B` (nested `iterationsBySpec[specId][]`); blocks code landing in `iteration.ts` / `prototypingIterate.ts` |
| OQ-0012-0003 | `pivotDirective` retention vs supersede | implement | Recommendation `A` (retain as per-(spec, cycle) generator hint); blocks reviewer-prompt / generator-prompt reference cleanup |
| OQ-0012-0004 | `critique` field cleanup under `*Feel` schema | implement | Recommendation `A` (drop entirely); blocks `evaluatorReview.ts` schema implementation |
| OQ-0012-0005 | Capture role removal in steering / agent-routing | implement | Recommendation: keep in catalog, remove only prototyping routing entry — follow-up via spec-0015 / `_policies/02_routing.md` |

## Slice Decision (Stage 1 Triage)

| Spec | Action | Category | REQs Covered | Rationale |
|------|--------|----------|--------------|-----------|
| spec-0012 | UPDATE (MODIFY + APPEND + REMOVE) | skill | REQ-0001..0013 | full subject-token overlap; `/qfai-prototyping` redefinition per CHG-002 |
| _policies/03_Capabilities.md | UPDATE:MODIFY | policy | CAP-0012 success-metrics cell | new model wording (multi-spec, 10-cycle, reviewer-driven Playwright, qualitative-only, stock-photo license, per-spec iter-dir) |

Slice policy per `_policies/11_Slice-Policy.md`: append-first; all changes UPDATE within an existing active spec; no CREATE / SPLIT / MERGE / SUPERSEDE. UPDATE:REMOVE rows obtained batch approval `user@2026-05-18` via AskUserQuestion.

## Contracts Posture (Phase 0)

- DB Contracts: 0 items (none-rationale: QFAI is CLI, no DB)
- API Contracts: 0 items (none-rationale: QFAI is CLI, no HTTP/gRPC)
- UI Contracts: 0 items (none-rationale: QFAI has no GUI; target is non-UI-bearing)
- **CLI Contracts (this delta): 1 new** — `.qfai/contracts/cli/qfai-prototyping.md` documenting `iterate` / `certify` / `show-spec` public sub-commands, exit codes `0/2/64/65/66`, cycle-0 frozen `specsCovered[]` + `licenseClassCatalog` inputs, per-spec iter-dir outputs, four hard-stop classes
- DESIGN.md freeze: SKIPPED (non-UI-bearing target)

## Stage 0 Steering Refresh

| File | Status | Action |
|------|--------|--------|
| manifest.md | No change | Current facts sufficient for this run |
| product.md | No change | Current |
| tech.md | No change | Current |
| structure.md | No change | Current |

## Validate Baseline

- Pre-edit: `pnpm exec qfai validate --profile sdd --fail-on error --format github` →
  `error=0 warning=7 info=3 annotations=10/10 failOn=error result=PASS` (run-log `.qfai/report/run-20260518132742559`)
- Post-edit: same command →
  `error=0 warning=7 info=3 annotations=10/10 failOn=error result=PASS` (run-log `.qfai/report/run-20260518175405426`)
- 7 warnings = pre-existing QFAI-TRIAGE-001 on `spec-0001/0002/0003/0005/0006/0007/0016` (out of scope this pass)
- 3 notices = pre-existing QFAI-CONTRACT-000 on `.qfai/contracts/{ui,api,db}` (out of scope; this pass touches `.qfai/contracts/cli` only)

## Reviewer Routing (this delta)

| Reviewer | Routed? | Rationale |
|----------|---------|-----------|
| completion-reviewer | ✅ default | Always required |
| architecture-reviewer | ✅ | Structural / contract / CLI surface changed |
| product-surface-reviewer | ❌ NOT routed | Target is non-UI-bearing |
| qa-gatekeeper | ❌ NOT routed | No validate / coverage / runtime / prototyping evidence change in this SDD pass (the prototyping evidence schema is described in the spec but no actual evidence is written) |

## Open Gaps

None blocking SDD. Five integration follow-ups (OQ-0012-0001..0005) tracked for the implementation phase.

## Next Step

Proceed to `/qfai-prototyping` (recommended) once the implementation phase resolves OQ-0012-0002..0005 and lands the code changes enumerated in `spec-0012/10_Plan.md` Next Maintenance Steps.
