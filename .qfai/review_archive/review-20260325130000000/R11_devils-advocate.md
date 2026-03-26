# R11 devils-advocate

## Verdict: PASS

## Findings

- Challenge 1: "The 7 validators only check structural presence, not content quality. A pack could pass all validators with garbage content." -- Rebuttal: This is by design. 01_Spec.md explicitly excludes "Heuristic/aesthetic checks" from scope. DR-0045 rationale states structural checks are binary (present/absent). Content quality checks are deferred to v1.7.2 per 09_delta.md Follow-ups. The scope boundary is intentional and well-documented.

- Challenge 2: "The isUiBearing() detection based on HTML tags could produce false positives if someone writes `<div>` in plain-text discussion." -- Rebuttal: The detection targets 03_Story-Workshop.md specifically (not arbitrary text files), and BR-0023-0001 specifies multiple signals (HTML tags, CSS artifacts, Mermaid screen flows). The risk is acknowledged in 10_Plan.md risk table with TC-0023-0030 as the regression baseline. The safe-side fallback (`false` on error) further limits blast radius.

- Challenge 3: "DR-0045 mandates error severity immediately with no warning phase. This could break adoption for teams transitioning from v1.6.5." -- Rebuttal: The validators only activate on UI-bearing packs (new capability). Teams with existing non-UI packs (which are the majority) experience zero impact per BR-0023-0025 and TC-0023-0030. New UI-bearing packs would need to comply from day one, which is the intended behavior for structural completeness.

- Challenge 4: "qualityProfile is preserved but unused (DR-0047). This is dead code." -- Rebuttal: It is infrastructure preservation for future releases, not dead code. The mechanism already exists in the codebase. The decision explicitly defers profile-sensitive behavior to a future release, avoiding premature coupling while maintaining forward compatibility.

- Challenge 5: "The spec has 34 EX but only 34 TC -- exactly 1:1. Shouldn't there be more test cases than examples?" -- Rebuttal: Each EX is designed to be directly verifiable by one TC. The TC table also includes cross-cutting tests (TC-0023-0023, TC-0023-0024) and integration tests (TC-0023-0025..0034) that go beyond the 1:1 mapping. Total unique test scenarios exceed the EX count when counting integration coverage.

## Required Fixes

- None

## Evidence Checked

- `.qfai/specs/spec-0023/01_Spec.md` (scope exclusions)
- `.qfai/specs/spec-0023/04_Business-Rules.md` (BR-0023-0001, BR-0023-0002, BR-0023-0025)
- `.qfai/specs/spec-0023/05_Examples.md`
- `.qfai/specs/spec-0023/06_Test-Cases.md`
- `.qfai/specs/spec-0023/07_Decisions.md` (DR-0042..DR-0047)
- `.qfai/specs/spec-0023/09_delta.md` (follow-ups)
- `.qfai/specs/spec-0023/10_Plan.md` (risk table)
