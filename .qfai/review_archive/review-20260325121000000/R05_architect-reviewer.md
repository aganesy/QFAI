# R05 — Architect Reviewer

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] Decision to extend existing validators (vs. creating new parallel validators) is documented in OQ-0005 with rationale
- [x] OQ-0005 rejected Option B (parallel new validators) with explicit reason: "Parallel new validators would fragment the validation surface"
- [x] New validator file placement decision (`ddpValidation.ts` extension or `discussionDesignHardening.ts`) is acknowledged but left open for implementation — acceptable at discussion gate
- [x] UI-bearing detection design is specified in TC-2 as artifact-presence-based (not keyword-only)
- [x] Backward compatibility architecture is specified: new validators short-circuit on `isUiBearing === false` (REQ-0014)
- [x] `validate.ts` orchestrator is preserved as the single integration point (TC-3)
- [x] No new CLI commands are introduced (OC-3)
- [x] No new runtime dependencies are introduced (TC-5)
- [x] Quality profile infrastructure is preserved without modification (10_Policy.md)
- [x] Single-PR delivery constraint (OC-1) is architecturally sound for this scope
- [x] Downstream skill impact is explicitly deferred — `/qfai-sdd`, `/qfai-prototyping` unchanged in v1.7.0

## Findings

### Finding 1 — Significant: Extending ddpValidation.ts vs. new discussionDesignHardening.ts is unresolved

**Severity**: Significant

01_Context.md Technical Context states: "New validators will be added as additional checks within `ddpValidation.ts` or in a new `discussionDesignHardening.ts` validator file." The OR is unresolved. OQ-0005 correctly decides to extend existing infrastructure rather than create parallel pipelines, but OQ-0005's resolution only addresses the pipeline question (extend vs. parallel execution), not the file placement question (same file vs. new co-located file).

This matters architecturally because:

- If `ddpValidation.ts` already contains 18 validators (DDP-001..018), adding 7 more (DDP-019..025 or DPACK-DDS-001..005) will push the file size and responsibility beyond single-responsibility bounds.
- A `discussionDesignHardening.ts` file that registers through the same orchestrator is consistent with OQ-0005's "extend existing infrastructure" resolution — it extends the pipeline without duplicating it.
- The decision has implications for test file organization, import structure, and future maintainability.

**Recommendation**: The SDD step should make an explicit architectural decision on file placement as a required output. The preferred architecture is a new `discussionDesignHardening.ts` (or similarly named) file that imports and calls the same `issue()` helper, is registered through `validate.ts` alongside the existing files, and is co-located in `packages/qfai/src/core/validators/`. This preserves single-responsibility while following OQ-0005's extension-not-fragmentation intent.

### Finding 2 — Significant: UI-bearing detection upgrade (TC-2) requires a new detection interface that is not yet designed

**Severity**: Significant

TC-2 mandates artifact-presence detection to replace keyword-only matching. This is architecturally non-trivial: the current `isUiBearing` flag is computed from a keyword regex scan in `ddpValidation.ts`. Replacing or augmenting this with artifact-presence detection requires:

- A definition of "artifact" in machine-readable form (file naming convention? section heading? YAML front-matter field?)
- A detection function that reads potentially multiple files in the pack (not just `03_Story-Workshop.md`)
- A clear contract for what the detection function returns and how it integrates with the existing validator guard pattern

None of these are designed in this pack. The pack correctly identifies the requirement (TC-2) and the resolution direction (OQ-0001: Option B), but the architectural design for the new detection mechanism is entirely deferred to SDD. This is acceptable at the discussion gate, but the SDD deliverable must include a concrete detection interface design before the implementation step begins.

**Recommendation**: Flag TC-2 as a required SDD architecture item with a specified output: a detection interface definition (function signature, input type, return type) and at least one example artifact schema entry. The risk of skipping this design step is that the implementer defaults to augmented keyword matching, which may not satisfy TC-2's intent.

### Finding 3 — Pass: Extending existing validators is the correct architectural call

**Severity**: Pass observation

OQ-0005's decision to extend rather than create parallel validators is architecturally sound. The existing `validate.ts` orchestrator, `issue()` helper, and fixture-based test pattern represent a stable, well-understood validation architecture. Introducing a parallel validation runner for v1.7.0 would have created two validation surfaces with independent error reporting, independent test fixtures, and potential ordering dependencies. The extension approach maintains a single validation surface, a single exit-code contract, and a single test harness. This is the correct call.

### Finding 4 — Observation: qualityProfile non-activation is architecturally conservative and correct

**Severity**: Observation (positive)

The decision to preserve but not activate `qualityProfile` gating for new validators (OQ-0007, 10_Policy.md) is architecturally conservative and correct for a v1.7.0 release. Structural presence checks do not benefit from profile-sensitive severity — a section is either present or absent, and the severity of absence is not a matter of quality profile preference. Deferring profile-sensitive behavior to a future release avoids premature complexity while keeping the infrastructure available. This decision is well-reasoned and requires no follow-up.

### Finding 5 — Minor: SKILL.md downstream read mandate for 99_delta.md is out-of-scope but referenced in-scope

**Severity**: Minor

02_Inception-Deck.md Q7 Risks table states: "`SKILL.md` update explicitly mandates that `/qfai-sdd` reads `99_delta.md` Rejected Directions section" as a mitigation for the risk that design anti-goals are not read by downstream agents. However, the NOT List explicitly places downstream skill modifications (including `/qfai-sdd`) out of scope for v1.7.0. Adding a mandate for `/qfai-sdd` behavior in `SKILL.md` would be a de facto downstream skill modification even if expressed in discussion-layer documentation.

REQ-0012 limits the SKILL.md update to the `qfai-discussion/SKILL.md` skill document — the discussion skill, not `/qfai-sdd`. This is the correct scope boundary. The risk mitigation stated in Q7 may be aspirational rather than implementable within v1.7.0 scope; if so, it should be noted as a v1.7.1 backlog item rather than a v1.7.0 risk mitigation.

## Verdict

**PASS**

The high-level architecture is sound: extending the existing validator pipeline through the `validate.ts` orchestrator, preserving backward compatibility through `isUiBearing` guards, deferring profile-sensitive behavior, and maintaining the single-PR delivery constraint. The two significant findings (validator file placement unresolved, TC-2 detection interface undesigned) are both correctly scoped to the SDD step and do not constitute blocking defects at the discussion gate. They are flagged here as required SDD architecture deliverables. Finding 5 (SKILL.md downstream scope boundary) is a minor scope-discipline note for the SDD author.
