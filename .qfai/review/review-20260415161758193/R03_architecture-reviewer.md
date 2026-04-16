# Reviewer Result

- reviewer_id: R03
- reviewer_role: architecture-reviewer
- verdict: PASS
- reviewed_at: 2026-04-15T16:17:58Z

## Checked

- [x] surfacePolicy.ts standalone decision is architecturally sound
- [x] CalibrationLoader throw-on-failure contract is safe and correct
- [x] reviewerLogs.verdict mapped vocabulary avoids downstream issues
- [x] Hard-error on uiContractId is consistent with backward-compat-abandoned policy
- [x] All 4 decisions are mutually consistent
- [x] 99_delta.md has recurrence prevention for each rejected option
- [x] 10_Policy.md encodes decisions as enforceable policies
- [x] Constraint alignment verified (09_Constraints.md)

## Feedback

### OQ-0002 — surfacePolicy.ts standalone module

No issues. The SRP argument holds: `mode.ts` exclusively owns obligations derivation logic; the surface allowlist is a static policy concern with no behavioral dependency on `mode.ts` internals. Standalone placement reduces coupling (CLI and validator can import the allowlist without transitively pulling in obligations logic), not increases it. The recurrence prevention in `99_delta.md` ("any future proposal must include a SRP analysis showing no responsibility overlap") is correctly scoped.

### OQ-0003 — CalibrationLoader throw-on-failure

No issues. `CalibrationLoader` is a precondition step, not a business logic step. Throwing immediately is the correct contract. Unhandled exception risk is nil in a correctly structured call stack — no caller should be allowed to silently continue without a resolved pack, which is exactly the design intent ("if it runs, it's valid"). The requirement for a path-inclusive error message in `10_Policy.md` (Calibration Policy) is sufficient for operational diagnostics. Recurrence prevention correctly identifies null-return as a safety regression.

### OQ-0004 — reviewerLogs[].verdict mapped vocabulary

No issues. The architecture correctly avoids a translation layer between storage and consumer. Trace fidelity is preserved: the Glossary (`08_Glossary.md`) defines `terminationReason` as a separate field carrying the raw harness signal (`accepted`, `rejected`, `plateau`, `maxIterations`, `runtimeFailure`), so pre-mapping information is not lost — it lives in a semantically appropriate field. The mapped vocabulary in `reviewerLogs[].verdict` is the correct final semantic verdict for audit consumers. `10_Policy.md` Review Semantics Policy correctly enforces the mapping.

### OQ-0005 — Hard-error on observation uiContractId

No issues with the decision itself. The `08_Glossary.md` explicitly designates `uiContractId` as a legacy bug field ("Observation matching on `uiContractId` was a bug"), confirming there is no legitimate runtime use case that would be broken by hard-erroring. The decision is consistent with TC-02 ("backward compat not required") and the "後方互換は完全に捨てる" principle.

**Minor observation (non-blocking):** `10_Policy.md` does not contain an explicit policy statement for the `uiContractId` hard-error behavior. The Testing Policy mentions the regression fixture requirement (`screenId` and `uiContractId` differ), but there is no enforceable rule of the form "any observation record containing `uiContractId` MUST result in a schema validation error." The decision is captured in OQ-0005 and `99_delta.md`, but adding an explicit one-line statement to `10_Policy.md` under a new "Observation Schema Policy" section would make this enforceable at policy level, not only at test level. Suggested addition:

> Observation records containing a `uiContractId` field MUST result in a hard validation error naming the field and directing the caller to use `screenId`.

This is a nit — the intent is unambiguous across the pack and the Testing Policy implicitly enforces the behavior through mandatory regression tests. It does not block PASS.

### Mutual consistency

All 4 decisions are mutually consistent and collectively enforce the fail-closed, full-harness-only contract:

- `surfacePolicy.ts` standalone ensures surface enforcement is importable at every layer without transitive coupling.
- `CalibrationLoader` throw ensures no harness run is possible without a validated calibration pack.
- Mapped `reviewerLogs[].verdict` vocabulary ensures no ambiguous approval state can exist at the consumer level.
- Hard-error on `uiContractId` ensures observation attribution is always performed on the canonical `screenId`, preventing silent mismatches.

None of the 4 decisions introduce a new bypass vector to the full-harness-only contract.

### Rejected options (99_delta.md)

All 5 OQ rejected options have recurrence prevention entries. Prevention language is appropriately specific (not just "don't do this again") and actionable:

- OQ-0001 Option B: requires documented technical constraint in `surfacePolicy.ts` comment ✓
- OQ-0002 Option B: requires SRP analysis with no responsibility overlap ✓
- OQ-0003 Options B/C: null-return classified as safety regression; typed error requires consumer use case ✓
- OQ-0004 Option B: original-vocabulary storage requires explicit new audit trace requirement ✓
- OQ-0005 Option B: silent ignore requires explicit deprecation policy with removal timeline ✓

### Constraint alignment (09_Constraints.md)

- TC-01 (scope to `packages/qfai/**`): All 4 decisions operate within scope ✓
- TC-02 (backward compat not required): OQ-0005 hard-error is directly consistent ✓
- TC-03 (`standard`/`low-cost` not recoverable): Mode Rejection Policy in `10_Policy.md` enforces this ✓
- TC-04 (`cli` absent from PROTOTYPING_SUPPORTED_SURFACES): OQ-0001 decision confirms exclusion; OQ-0002 standalone surfacePolicy makes this the single authoritative source ✓
- TC-05 (no scalar calibration params): OQ-0003 throw-on-failure + Calibration Policy in `10_Policy.md` enforce this ✓
- TC-06 (TypeScript strict): No decision requires `any`, `@ts-ignore`, or bare casts ✓
- OC-01 (single PR): All decisions designed for atomic enforcement ✓

## Decision

PASS — All 4 architecture decisions are individually sound, mutually consistent, and aligned with the constraints and backward-compat-abandoned policy. The single non-blocking nit (missing explicit uiContractId observation schema policy statement in `10_Policy.md`) is noted but does not affect the correctness or enforceability of the overall architecture. The decisions collectively implement a well-defined fail-closed contract with no identified bypass vectors.
