# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0120-01
# Parent: US-0001-0120
Scenario: Qualitative review payload schema per spec × screen
  Given `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` (`iter-NN/CON-UI-NNNN/<screen>.review.json` on the story tree),
  When validated,
  Then it contains exactly the 4 ordinal UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`, each in `{weak, acceptable, strong, exceptional}`) AND the six qualitative `*Feel` prose fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`), each bounded ≤ 200 words, AND `layoutAntiPatternsDetected[]` AND `designMdViolations[]`.

# AC-0001-0120-02
# Parent: US-0001-0120
Scenario: Convergence AND across spec × screen pairs (no quantitative thresholds)
  Given the cycle-0 frozen spec set S and the union of declared screens per spec,
  When the aggregator evaluates convergence at the end of any cycle,
  Then the run converges ONLY when, for every `(spec, screen)` pair: all 4 ordinal UX axes are `exceptional` AND `layoutAntiPatternsDetected[]` is empty AND `designMdViolations[]` is empty.
  And no quantitative AC-pass% / transition-pass% threshold is consulted.
  And on hard-fail at cycle 9, the aggregated convergence record names every lagging spec ID.
  And On the story tree S is the cycle-0 frozen `uiContractsCovered[]`, each pair is `(UI contract, screen)`, and the record names every lagging UI contract ID.

# AC-0001-0120-03
# Parent: US-0001-0120
Scenario: Menu reachability exercised at least once per Reviewer session
  Given a spec × screen (UI contract × screen on the story tree) with declared primary menu entry points (sidebar / topbar / bottombar as system-appropriate),
  When the Reviewer's Playwright session runs,
  Then the Reviewer SHOULD exercise every primary menu entry point at least once and reflect findings in the `menuReachabilityFeel` prose field; unreachable entries surface as qualitative critique and do NOT hard-fail the cycle.
```
