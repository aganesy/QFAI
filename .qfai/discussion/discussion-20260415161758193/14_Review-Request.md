# 14 Review Request

## Routing

Reviewer routing is derived from:
- `.qfai/assistant/steering/agent-routing.yml`
- `.qfai/assistant/steering/review-profiles.yml`

Review profile for qfai-discussion: **requirements-heavy**

Always-required reviewers:
- `completion-reviewer`
- `requirements-reviewer`

Conditional reviewers triggered:
- `architecture-reviewer` — **Yes**: this discussion covers architecture-affecting decisions (calibration SSOT, evidenceRef ledger, surface policy module structure, review semantics vocabulary)
- `product-surface-reviewer` — **No**: non-UI pack (ui_bearing: false)

## Pack Under Review

- Discussion pack: `.qfai/discussion/discussion-20260415161758193/`
- Pack type: non-UI (ui_bearing: false)
- Files in pack: 15

## Review Checklist

- [ ] Context → Inception Deck → Story Workshop causal chain is consistent
- [ ] 06_REQ.md and 07_NFR.md boundaries are not blurred
- [ ] Glossary, Constraints, Policy are sufficient as downstream inputs for /qfai-sdd
- [ ] 99_delta.md contains adoption/rejection rationale
- [ ] 11_OQ-Register.md has 0 open items
- [ ] 13_Deferred.md has 0 unwarranted deferrals
- [ ] All 15 files are populated and not placeholder-only

## Scope of Architecture Review

The following architecture-affecting decisions require `architecture-reviewer` sign-off:

1. **`surfacePolicy.ts` as standalone module** (vs inline in mode.ts) — OQ-0002
   - Decision: standalone file for SRP compliance
   - Impact: new import path; all surface checks route through `surfacePolicy.ts`

2. **`CalibrationLoader` throw-on-failure contract** — OQ-0003
   - Decision: throw `Error` immediately with packPath in message
   - Impact: callers of `runFullHarness()` must not catch CalibrationLoader errors silently

3. **`reviewerLogs[].verdict` mapped vocabulary** — OQ-0004
   - Decision: store post-mapping vocabulary (`approve`, `revise`, `reject`, `abandon`)
   - Impact: validator and downstream consumers see consistent vocabulary; no translation layer needed

4. **Hard-error on observation `uiContractId`** — OQ-0005
   - Decision: schema validator throws if observation record contains `uiContractId` field
   - Impact: all existing fixtures using `uiContractId` must be updated before tests pass

## Review Notes for Requirements Reviewer

- REQ-0001 through REQ-0010: all sourced from SRC-0001 WS-1 through WS-7
- DoD conditions in 05_Scope.md are directly traceable to REQ entries
- No requirements are marked `should` or `could` — all are `must` per design doc intent
- REQ-0003 (surfacePolicy.ts) is a structural requirement, not a behavioral one; verify it is not inadvertently treated as NFR

## Review Notes for Completion Reviewer

- 0 open OQs in 11_OQ-Register.md
- 0 deferred items in 13_Deferred.md
- All 15 files populated with substantive content
- Mermaid diagrams present in both 02_Inception-Deck.md and 03_Story-Workshop.md
- All 6 Example Seed perspectives covered in each US in 03_Story-Workshop.md
