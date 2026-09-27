# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0111-01
# Parent: US-0001-0111
Scenario: Layout-Anti-Pattern IA Cap
  Given any `iter-NN/review.json` where `layoutAntiPatternsDetected.length > 0`,
  When validated,
  Then `scores.informationArchitecture` is in `{weak, acceptable}`. `strong` or `exceptional` raises `QFAI-PROT-021`.

# AC-0001-0111-02
# Parent: US-0001-0111
Scenario: lap-\* Whitelist
  Given any `iter-NN/review.json`,
  When validated,
  Then every entry in `layoutAntiPatternsDetected[]` is an identifier declared in `packages/qfai/assets/validators/layoutAntiPatterns.json`, which is what `loadKnownLapIds` reads. A token no entry declares raises `QFAI-PROT-002`. The registry is the list: writing it out here is a second copy that goes stale the next time an entry is added or retired.
```
