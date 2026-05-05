# 03 Acceptance Criteria

## AC-0004-0001

- `qfai validate` runs deterministic validators and aggregates issues.

## AC-0004-0002

- The canonical UIX validator set remains the production path.

## AC-0004-0003

- `QFAI-UIE-001` fires when a declared screen is missing screenshot evidence.

## AC-0004-0004

- `QFAI-UIE-002` fires when a declared screen is missing HTML snapshot evidence.

## AC-0004-0005

- If no screen contract exists, the UI evidence validator skips without error.

## AC-0004-0006

- The prototyping skill validator confirms current skill sections, evidence paths, and CLI-removal wording.

## AC-0004-0007

- Legacy artifact validators may still exist, but they are treated as validator slices rather than proof of a public runtime surface.

## AC-0004-0008

- DCON-030 validates that root `DESIGN.md` exists and contains the required token tables (color, typography, radius, shadow) parseable per `references/design-md-spec.md`.
- Missing or unparseable `DESIGN.md` emits `QFAI-DCON-030` at error severity.

## AC-0004-0009

- DCON-031 validates that `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256` matches `sha256(DESIGN.md bytes)` byte-for-byte.
- Hash drift emits `QFAI-DCON-031` at error severity with both the lock sha256 and the on-disk sha256 in the message.

## AC-0004-0010

- DCON-032 validates that `.qfai/contracts/design/design-system.yaml` token tables (color, typography, radius, shadow) are byte-equivalent to the parsed token tables of root `DESIGN.md`.
- Any divergence emits `QFAI-DCON-032` at error severity, listing the diverging token category.

## AC-0004-0011

- prototypingEvidenceV3 validator checks each `.qfai/evidence/prototyping/iter-NN/review.json` against schema v3: 4 UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) each scored on the ordinal scale `{weak, acceptable, strong, exceptional}`, prose critique 200..500 words, `pivotDirective` ∈ `{continue, refine, pivot}`.
- Missing axes / out-of-range ordinal / out-of-range word count / unknown pivotDirective each emits `QFAI-PROT-002` at error severity.

## AC-0004-0012

- `layoutAntiPatternsDetected` is an array of strings drawn from the whitelist `{lap-001-orphan-page, lap-002-deadend-flow, lap-003-hidden-state, lap-004-missing-wayfinding, lap-005-input-trap, lap-006-modal-dead-zone, lap-007-untargetable-affordance, lap-008-no-back-affordance}`.
- Any unknown token rejects the review.json with `QFAI-PROT-002` at error severity.

## AC-0004-0013

- `designMdViolations` is an array of objects with shape `{category: "color"|"font"|"radius"|"shadow", expected: string, found: string, location: string}`.
- Any extra field, missing field, or out-of-enum `category` rejects the review.json with `QFAI-PROT-002` at error severity.

## AC-0004-0014

- `findDesignMdViolations(html, designMd)` is pure (no I/O, no clock, no global state) and deterministic (same input bytes → same output array).
- Property tests assert: (a) idempotence, (b) order-stability, (c) absence of `Date`, `process`, `fs`, network calls in the call graph.
