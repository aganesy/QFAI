# Acceptance Criteria

## Criteria

```gherkin
Feature: Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` regression check

# AC-0001-0173-01
# Parent: US-0001-0173
Scenario: Reviewer-Gate emits `R-CERTIFY-VERIFY-CIRCULAR` on prototyping-phase certify/verify cycle
  Given a future PR that wires `certify` to read validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts (i.e. reintroduces the cycle the option-B path was chosen to eliminate),
  When the Reviewer Gate runs against that PR,
  Then it emits `R-CERTIFY-VERIFY-CIRCULAR` at severity **info**, and `qfai prototyping certify` refuses that verdict with exit 2. The finding is info because a `scope: "full"` verdict on disk is not damage — a full-profile run records it truthfully, and at error severity an ordinary repo-wide `validate` would make `/qfai-verify`'s Completion Contract unsatisfiable outside Work Order H. The finding names (a) the certify code path that reads the offending validator output, (b) the validator output file / profile whose artifact requirements include `/qfai-atdd` or `/qfai-implement`, (c) the option-B contract clause that is violated. A PR whose certify path reads no validator output requiring `/qfai-atdd`/`/qfai-implement` artifacts (i.e. holds the option-B path intact) passes without `R-CERTIFY-VERIFY-CIRCULAR`.
```
