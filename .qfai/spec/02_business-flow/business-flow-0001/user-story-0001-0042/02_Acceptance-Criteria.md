# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0042-01
# Parent: US-0001-0042
Scenario: AC-0001-0042-01
  Given the current prototyping skill
  When the prototyping skill validator runs
  Then the prototyping skill validator confirms current skill sections, evidence paths, and CLI-removal wording.

# AC-0001-0042-02
# Parent: US-0001-0042
Scenario: AC-0001-0042-02
  Given legacy artifact validators exist
  When production validation runs
  Then legacy artifact validators are treated as validator slices rather than proof of a public runtime surface.

# AC-0001-0042-03
# Parent: US-0001-0042
Scenario: AC-0001-0042-03 required design tokens
  Given root `DESIGN.md` and `references/design-md-spec.md`
  When DCON-030 runs
  Then DCON-030 validates that root `DESIGN.md` exists and contains the required token tables (color, typography, radius, shadow) parseable per `references/design-md-spec.md`.

Scenario: AC-0001-0042-03 missing design tokens
  Given root `DESIGN.md` is missing or unparseable
  When DCON-030 runs
  Then Missing or unparseable `DESIGN.md` emits `QFAI-DCON-030` at error severity.

# AC-0001-0042-04
# Parent: US-0001-0042
Scenario: AC-0001-0042-04 matching design lock
  Given the design lock and root `DESIGN.md` bytes
  When DCON-031 runs
  Then DCON-031 validates that `<paths.contractsDir>/design/DESIGN.md.lock.yaml#sha256` matches `sha256(DESIGN.md bytes)` byte-for-byte.

Scenario: AC-0001-0042-04 hash drift
  Given the design lock hash differs from the on-disk hash
  When DCON-031 runs
  Then Hash drift emits `QFAI-DCON-031` at error severity with both the lock sha256 and the on-disk sha256 in the message.

# AC-0001-0042-05
# Parent: US-0001-0042
Scenario: AC-0001-0042-05 matching design system
  Given the design system and root `DESIGN.md` token tables
  When DCON-032 runs
  Then DCON-032 validates that `<paths.contractsDir>/design/design-system.yaml` token tables (color, typography, radius, shadow) are byte-equivalent to the parsed token tables of root `DESIGN.md`.

Scenario: AC-0001-0042-05 diverging design system
  Given a design-system token category diverges from root `DESIGN.md`
  When DCON-032 runs
  Then Any divergence emits `QFAI-DCON-032` at error severity, listing the diverging token category.

# AC-0001-0042-06
# Parent: US-0001-0042
Scenario: AC-0001-0042-06 review schema
  Given an `.qfai/evidence/prototyping/iter-NN/review.json` file
  When the prototypingEvidenceV3 validator runs
  Then prototypingEvidenceV3 validator checks each `.qfai/evidence/prototyping/iter-NN/review.json` against schema v3: 4 UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) each scored on the ordinal scale `{weak, acceptable, strong, exceptional}`, prose critique within its cap — measured in CJK characters where the text carries CJK and in whitespace-separated words otherwise, with no lower bound in either unit — and `pivotDirective` ∈ `{continue, refine, pivot}`.

Scenario: AC-0001-0042-06 invalid review
  Given review.json has missing axes, an out-of-range ordinal or word count, or an unknown pivotDirective
  When the prototypingEvidenceV3 validator runs
  Then Missing axes / out-of-range ordinal / out-of-range word count / unknown pivotDirective each emits `QFAI-PROT-002` at error severity.

# AC-0001-0042-07
# Parent: US-0001-0042
Scenario: AC-0001-0042-07 known layout pattern
  Given a `layoutAntiPatternsDetected` array
  When the validator resolves tokens against the registry
  Then `layoutAntiPatternsDetected` is an array of strings drawn from the whitelist in `packages/qfai/assets/validators/layoutAntiPatterns.json`, which is the SSOT the validator resolves against (`loadKnownLapIds`): `{lap-007-state-not-represented, lap-008-no-back-affordance}`. Both are scoped `semantic`; each entry carries the regex that detects it and the authority that makes it a defect, so adding or renaming one is a change to that file and this list follows it.

Scenario: AC-0001-0042-07 unknown layout pattern
  Given a token is absent from the layout anti-pattern registry
  When the validator checks review.json
  Then Any token absent from that registry rejects the review.json with `QFAI-PROT-002` at error severity.

# AC-0001-0042-08
# Parent: US-0001-0042
Scenario: AC-0001-0042-08 violation shape
  Given a `designMdViolations` array
  When the prototyping evidence validator checks it
  Then `designMdViolations` is an array of objects with shape `{kind: "color"|"font"|"radius"|"shadow", found: string}` — the shape `core/validators/prototypingEvidence.ts` checks (`isViolationArray`, and `DESIGN_MD_VIOLATION_KINDS` for the enum).

Scenario: AC-0001-0042-08 invalid violation
  Given a violation is missing `kind` or `found`, or has an out-of-enum `kind`
  When the validator checks review.json
  Then a missing `kind`, a missing `found`, or an out-of-enum `kind` rejects the review.json with `QFAI-PROT-002` at error severity.

Scenario: AC-0001-0042-08 extra fields
  Given a violation has `kind` and `found` plus extra fields
  When the validator checks review.json
  Then extra fields do **not** reject: the shipped check reads the two it requires and ignores the rest.

# AC-0001-0042-09
# Parent: US-0001-0042
Scenario: AC-0001-0042-09
  Given the same HTML and DESIGN.md input bytes
  When `findDesignMdViolations(html, designMd)` runs
  Then `findDesignMdViolations(html, designMd)` is pure (no I/O, no clock, no global state) and deterministic (same input bytes → same output array).
  And property tests assert: (a) idempotence, (b) order-stability, (c) absence of `Date`, `process`, `fs`, network calls in the call graph.
```
