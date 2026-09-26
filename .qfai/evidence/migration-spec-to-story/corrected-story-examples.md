# Corrected Story Examples

## EX-0001-0112-03

- Source: `.qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0112/03_Example.md`
- Original row SHA-256: `EC85E05DF33FD9BBBBBF50C3750C3364FD92A52B10A28BEEAA9A9427167362E5`
- Decision: DEC-0720; the approved convergence gate requires all four ordinal UX scores to be exceptional and all three blocking arrays to be empty.
- Disposition: replace the contradictory expected outcome in the active story example; retain its original row below.

```text
| EX-0001-0112-03 | AC-0001-0112-01 | Given every frozen UI contract and screen has empty `blockingFindings[]`, `layoutAntiPatternsDetected[]`, and `designMdViolations[]`. When the next cycle evaluates convergence. | Then it exits 64 for convergence without requiring exceptional ordinal UX scores. |
```

## EX-0001-0108-06

- Source: `.qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0108/03_Example.md`
- Original row SHA-256: `FE85F834AD41CAA8164E4AC94E7FBC98F599046928D3F44E464DB0963F7A0544`
- Decision: the accepted schema finding is QFAI-PROT-002 under BR-0109 and the current validator; no current decision requires QFAI-PROT-023.
- Disposition: retain the rejected expected code below and update the active example and criterion to QFAI-PROT-002.

```text
| EX-0001-0108-06 | AC-0001-0108-01 | Given `pivotDirective` is `stop` or missing. When the directive type guard validates it.                                                                                                             | Then the value is rejected and a persisted invalid directive raises `QFAI-PROT-023`.                                                                                             |
```
