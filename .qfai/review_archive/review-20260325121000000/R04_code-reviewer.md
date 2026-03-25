# R04 — Code Reviewer

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] New validator codes are named with a clear scheme (though inconsistency is noted — see R03 Finding 1)
- [x] Validators are specified to use the existing `issue()` helper pattern with `"error"` severity argument
- [x] Integration path is specified: new validators register through existing `validate.ts` orchestrator (TC-3)
- [x] No new runtime dependencies are introduced (TC-5)
- [x] TypeScript 5.6.3 compatibility is required (TC-4)
- [x] Unit test requirements are specified: passing path + each distinct failing path, 100% branch coverage (NFR-0004)
- [x] Mermaid flow in 03_Story-Workshop.md is fail-fast sequential — implementable as linear guard chain
- [x] Error message quality standard is defined (NFR-0003: what failed, why required, how to fix)
- [x] TC-2 artifact-presence detection requirement is specified; implementation approach is partially underspecified
- [x] REQ-0003 option comparison check targets a markdown table under `### Screen Option Comparison` heading — parse strategy is implicit

## Findings

### Finding 1 — Significant: TC-2 artifact-presence detection is specified but implementation approach is underspecified

**Severity**: Significant

TC-2 (09_Constraints.md) states that UI-bearing detection "must be based on the confirmed presence of UI-related artifacts in the pack's document set (e.g., declared screen specifications, wireframe file references, component inventory entries)" and that "keyword scanning of free-text prose is insufficient on its own." However, the constraint does not define what constitutes a "declared screen specification" in machine-readable terms. The current codebase (`ddpValidation.ts` line 23) uses a keyword regex; TC-2 explicitly supersedes this but does not provide the replacement schema.

Concurrently, US-D001 acceptance criteria reference `UI_HINT_RE` (keyword matching) as the detection mechanism, and 01_Context.md Assumptions state detection is unchanged in v1.7.0. This three-way conflict (TC-2 requires artifact presence, US-D001 uses keywords, Assumptions say no change) means the implementing engineer will encounter a contradiction with no definitive resolution in this pack.

**Recommendation**: The SDD step must produce a concrete specification for the artifact-presence detection mechanism — either a list of file-type or section-heading markers that constitute a UI artifact, or an explicit acknowledgment that v1.7.0 uses enhanced keyword matching with TC-2 deferred to v1.7.1. Without this, there is a risk of the implementer making a free-form choice that is inconsistent with the reviewer's intent.

### Finding 2 — Minor: Option comparison count detection strategy is implicit

**Severity**: Minor

REQ-0003 states that the validator counts options in the DDS or a dedicated options section. US-D002 acceptance criteria state that "the validator counts option rows by detecting a markdown table under the `### Screen Option Comparison` heading." The count strategy is defined as "rows in a markdown table under a specific heading," which is implementable. However, there is no specification of how the heading is detected (case-sensitive? prefix match? exact string?), and no specification of whether the heading is required to be `### Screen Option Comparison` exactly or whether any sub-heading under `## Design Direction Summary` is acceptable.

**Recommendation**: The SDD step should specify the exact heading string used for detection and the row-counting logic (e.g., "count data rows, excluding the header row, in the first markdown table following the `### Screen Option Comparison` heading"). This is a well-scoped SDD item, not a discussion-gate blocker.

### Finding 3 — Minor: QFAI-DPACK-DDS-004 and QFAI-DPACK-DDS-005 are specified as `warning`, not `error`

**Severity**: Minor

US-D005 specifies that a `14_Review-Request.md` missing the Design Direction Decisions section triggers QFAI-DPACK-DDS-004 as a **warning** ("downgraded from error due to reviewer-authored nature of the file"). US-D006 specifies QFAI-DPACK-DDS-005 as a **warning** for `99_delta.md` missing the Design Direction section. These are intentional downgrade decisions.

However, REQ-0009 states that "every validator introduced in v1.7.0 that checks structural completeness of UI-bearing discussion packs must emit `error` severity." The warning assignment for DDS-004 and DDS-005 is not reflected as an explicit carve-out in REQ-0009 or in 05_Scope.md. The US-level rationale ("reviewer-authored nature") is sound, but the REQ-level rule and the user story are in tension without an explicit exception clause.

**Recommendation**: Either amend REQ-0009 to add a carve-out for reviewer-authored and post-authoring files (14, 99), or move DDS-004 and DDS-005 to a `should` priority status rather than `must`. This disambiguation will prevent the validator implementer from defaulting to `error` for all new checks based on REQ-0009 alone.

### Finding 4 — Observation: 100% branch coverage requirement for new validators

**Severity**: Observation (positive)

NFR-0004 explicitly requires 100% branch coverage for all new validator code. This is a high but achievable standard for structural presence checks (which are typically binary). The SDD test specification should include fixture files for each distinct branch: (a) UI-bearing pack with all DDS fields present (pass path), (b) UI-bearing pack missing each individual DDS field (one failing fixture per field), (c) non-UI-bearing pack (should produce zero new issues). This factorial fixture approach is the only way to achieve 100% branch coverage rigorously.

## Verdict

**PASS**

The design intent is sufficiently actionable for downstream coding, with two important caveats that must be resolved at SDD: the UI-bearing detection mechanism ambiguity (Finding 1) and the REQ-0009 vs. warning-severity validator inconsistency (Finding 3). The `issue()` helper integration path, severity model, error message quality standard, and test coverage requirement are clearly specified. Finding 1 is the highest-priority SDD input from this review. The pack does not need to be revised at the discussion gate.
