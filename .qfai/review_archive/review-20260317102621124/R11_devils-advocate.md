# Review: Devil's Advocate (R11)

## Target

- Pack: `.qfai/discussion/discussion-20260317102145554/`
- Scope: discussion
- Reviewer: R11 (Devil's Advocate)

## Checklist

1. Challenge every assumption, conclusion, and design decision: Three substantive challenges raised and evaluated against the pack's documented decisions. See Notes for full challenge analysis.
2. Provide concrete alternative for every issue: Alternatives considered for each challenge; all were found to be already addressed by the pack's explicit rationale and option analysis.
3. Persist with objections: Objections maintained through counter-argument evaluation. All three challenges were ultimately resolved by evidence within the discussion pack.

## Verdict

**PASS**

## Notes

### Challenge 1: No deprecation period is reckless

**Objection:** Assumption 1 in 01_Context states no deprecation period is needed for abolishing the 3 old TDD skills. Users may have workflows, scripts, or muscle memory depending on `qfai-tdd-red`, `qfai-tdd-green`, and `qfai-tdd-refactor` as separate invocations.

**Counter-evidence:** Assumption 2 explicitly states the old skills have no external dependencies. QFAI is an internal CLI tool where the user and maintainer are the same person (or tightly aligned team). The breaking change is communicated through semantic versioning (v1.6.0 major-minor bump). For an internal tool with this profile, a deprecation period would add complexity without meaningful user protection.

**Alternative (if FAIL):** Introduce a 1-version deprecation shim that maps old skill names to `qfai-implement` with a warning message, removed in v1.7.0.

**Resolution:** Addressed. The pack's rationale is sound for the tool's usage context.

### Challenge 2: Phase 1 validator is too lenient

**Objection:** The Phase 1 validator should enforce test coverage (TC) mapping from day one, not defer it. Shipping without TC enforcement invites technical debt accumulation.

**Counter-evidence:** OQ-0003 documents this decision explicitly, with options analyzed. The rationale is structural migration first (consolidate 3 skills into 1), then layer on enforcement. Deferral targets are concrete: v1.6.1 for OQ-0006/OQ-0007. This is a deliberate phased rollout, not neglect.

**Alternative (if FAIL):** Ship Phase 1 validator with TC coverage as a warning-only check (non-blocking) to establish baseline metrics immediately.

**Resolution:** Addressed. Phased approach is pragmatic and the deferral has explicit version targets.

### Challenge 3: Serial-by-default is too conservative

**Objection:** Requiring serial execution of TDD micro-cycles by default artificially limits throughput. Modern development workflows benefit from parallelism.

**Counter-evidence:** OQ-0005 documents this with three options evaluated. Option C (serial-by-default with independent-slice exception) was selected for pragmatic reasons: correctness over speed for TDD cycles where each step depends on the previous. The independent-slice escape hatch provides parallelism where safe.

**Alternative (if FAIL):** Default to parallel execution with automatic dependency detection and fallback to serial when dependencies are detected.

**Resolution:** Addressed. Serial-by-default is the correct default for TDD red-green-refactor cycles where ordering matters.

### Overall Assessment

All three challenges were substantive but each is adequately addressed by the discussion pack's explicit decision documentation, option analysis, and rationale. The pack demonstrates thorough consideration of alternatives at every decision point.
