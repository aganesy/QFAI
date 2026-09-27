# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping skill and UI evidence validation
  # AC-0001-0042-01
  Scenario: Prototyping skill drift is reported
    Given the current prototyping skill
    When the prototyping skill validator runs
    Then the prototyping skill validator confirms current skill sections, evidence paths, and CLI-removal wording.

  # AC-0001-0042-02
  Scenario: Legacy validators stay validator slices
    Given legacy artifact validators exist
    When production validation runs
    Then legacy artifact validators are treated as validator slices rather than proof of a public runtime surface.

  # AC-0001-0042-03
  Scenario: A present, parseable DESIGN.md raises no design finding
    Given root `DESIGN.md` and `references/design-md-spec.md`
    When `qfai validate` runs
    Then a root `DESIGN.md` that exists and whose front matter parses per `references/design-md-spec.md` raises neither `QFAI-DCON-030` nor `QFAI-DCON-033`.

  # AC-0001-0042-04
  Scenario: A matching design lock raises no lock finding
    Given the design lock and root `DESIGN.md` bytes
    When `qfai validate` runs
    Then a `<paths.contractsDir>/design/DESIGN.md.lock.yaml#designMdSha256` equal to `sha256(DESIGN.md bytes)` raises neither `QFAI-DCON-031` nor `QFAI-DCON-032`.

  # AC-0001-0042-05
  Scenario: A matching design system raises no mirror finding
    Given the design system and root `DESIGN.md` token tables
    When `qfai validate` runs
    Then a `<paths.contractsDir>/design/design-system.yaml` whose `visual.*` tokens equal those of root `DESIGN.md` raises no mirror finding.

  # AC-0001-0042-06
  Scenario: A review payload follows schema v3
    Given an `.qfai/evidence/prototyping/iter-NN/review.json` file
    When the prototypingEvidenceV3 validator runs
    Then prototypingEvidenceV3 validator checks each `.qfai/evidence/prototyping/iter-NN/review.json` against schema v3: 4 UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) each scored on the ordinal scale `{weak, acceptable, strong, exceptional}`, prose critique within its cap — measured in CJK characters where the text carries CJK and in whitespace-separated words otherwise, with no lower bound in either unit — and `pivotDirective` ∈ `{continue, refine, pivot}`.

  # AC-0001-0042-07
  Scenario: Layout anti-patterns come from the registry
    Given a `layoutAntiPatternsDetected` array
    When the validator resolves tokens against the registry
    Then `layoutAntiPatternsDetected` is an array of strings drawn from the whitelist in `packages/qfai/assets/validators/layoutAntiPatterns.json`, which is the SSOT the validator resolves against (`loadKnownLapIds`): `{lap-007-state-not-represented, lap-008-no-back-affordance}`. Both are scoped `semantic`; each entry carries the regex that detects it and the authority that makes it a defect, so adding or renaming one is a change to that file and this list follows it.

  # AC-0001-0042-08
  Scenario: Design violations have the checked shape
    Given a `designMdViolations` array
    When the prototyping evidence validator checks it
    Then `designMdViolations` is an array of objects with shape `{kind: "color"|"font"|"radius"|"shadow", found: string}` — the shape `core/validators/prototypingEvidence.ts` checks (`isViolationArray`, and `DESIGN_MD_VIOLATION_KINDS` for the enum).

  # AC-0001-0042-09
  Scenario: The violation scan is pure and deterministic
    Given the same HTML and DESIGN.md input bytes
    When `findDesignMdViolations(html, designMd)` runs
    Then `findDesignMdViolations(html, designMd)` is pure (no I/O, no clock, no global state) and deterministic (same input bytes → same output array).
    And property tests assert: (a) idempotence, (b) order-stability, (c) absence of `Date`, `process`, `fs`, network calls in the call graph.

  # AC-0001-0042-10
  Scenario: A missing or unparseable DESIGN.md is reported
    Given root `DESIGN.md` is missing or its front matter does not parse
    When `qfai validate` runs
    Then a missing `DESIGN.md` emits `QFAI-DCON-030` at error severity, and an unparseable one emits `QFAI-DCON-033` at error severity.

  # AC-0001-0042-11
  Scenario: Design lock drift is reported
    Given the design lock is missing, lacks `designMdSha256`, or records a hash that differs from the on-disk hash
    When `qfai validate` runs
    Then a missing lock or a missing `designMdSha256` emits `QFAI-DCON-031` at error severity, and a differing hash emits `QFAI-DCON-032` at error severity.

  # AC-0001-0042-12
  Scenario: A diverging design system is reported
    Given a `design-system.yaml` mirror key whose value differs from root `DESIGN.md`
    When `qfai validate` runs
    Then `QFAI-DCON-005` is emitted at error severity, naming the key and both values.

  # AC-0001-0042-13
  Scenario: An invalid review payload is rejected
    Given review.json has missing axes, an out-of-range ordinal or word count, or an unknown pivotDirective
    When the prototypingEvidenceV3 validator runs
    Then missing axes, an out-of-range ordinal, an out-of-range word count and an unknown pivotDirective each emit `QFAI-PROT-002` at error severity.

  # AC-0001-0042-14
  Scenario: An unknown layout pattern is rejected
    Given a token is absent from the layout anti-pattern registry
    When the validator checks review.json
    Then any token absent from that registry rejects the review.json with `QFAI-PROT-002` at error severity.

  # AC-0001-0042-15
  Scenario: An invalid design violation is rejected
    Given a violation is missing `kind` or `found`, or has an out-of-enum `kind`
    When the validator checks review.json
    Then a missing `kind`, a missing `found`, or an out-of-enum `kind` rejects the review.json with `QFAI-PROT-002` at error severity.

  # AC-0001-0042-16
  Scenario: Extra design violation fields are accepted
    Given a violation has `kind` and `found` plus extra fields
    When the validator checks review.json
    Then extra fields do **not** reject: the shipped check reads the two it requires and ignores the rest.
```
