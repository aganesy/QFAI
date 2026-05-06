# 04 Business Rules

## BR-0004-0001: Validate Is the Machine Gate

- AC-Refs: AC-0004-0001
- `qfai validate` checks schema, evidence, and canonical validator rules.

## BR-0004-0002: UI Evidence Is Screen-Scoped

- AC-Refs: AC-0004-0002
- Validation of prototyping evidence is keyed by declared screen IDs from canonical screen contracts.

## BR-0004-0003: Missing Screenshot

- AC-Refs: AC-0004-0003
- Missing screenshot evidence emits `QFAI-UIE-001`.

## BR-0004-0004: Missing HTML

- AC-Refs: AC-0004-0004
- Missing HTML snapshot evidence emits `QFAI-UIE-002`.

## BR-0004-0005: Safe Skip Without Screen Contract

- AC-Refs: AC-0004-0005
- If no canonical screen contract is available, the UI evidence artifact validator skips instead of over-firing.

## BR-0004-0006: Skill Contract Validator

- AC-Refs: AC-0004-0006
- The prototyping skill validator checks current section presence, canonical evidence paths, and CLI-removal wording.

## BR-0004-0007: Legacy Validator Slices

- AC-Refs: AC-0004-0007
- Legacy design-system or artifact validators may remain in validate while corresponding code still exists.
- They do not redefine the current public execution model.

## BR-0004-0008: DESIGN.md Presence Validator

- AC-Refs: AC-0004-0008
- DCON-030 reads root `DESIGN.md` at validate time and checks for the four required token tables (color, typography, radius, shadow) per `references/design-md-spec.md`.
- Absent file or unparseable structure emits `QFAI-DCON-030` at error severity; presence + parseability passes.

## BR-0004-0009: DESIGN.md Lock Hash Integrity

- AC-Refs: AC-0004-0009
- DCON-031 computes `sha256(DESIGN.md bytes)` and compares it against `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.
- Mismatch emits `QFAI-DCON-031` at error severity, including both hashes in the message.

## BR-0004-0010: design-system Mirror Integrity

- AC-Refs: AC-0004-0010
- DCON-032 parses `.qfai/contracts/design/design-system.yaml` and compares its token tables byte-for-byte against the parsed token tables of root `DESIGN.md`.
- Any per-category divergence emits `QFAI-DCON-032` at error severity, naming the diverging category.

## BR-0004-0011: prototypingEvidenceV3 Schema Validation

- AC-Refs: AC-0004-0011
- prototypingEvidenceV3 validator enforces schema v3 on each `iter-NN/review.json`: required keys `scores` (4 UX axes ordinal), `prose` (200..500 words), `pivotDirective` (∈ continue|refine|pivot), `layoutAntiPatternsDetected`, `designMdViolations`.
- Schema violation emits `QFAI-PROT-002` at error severity. v1.x fields (`mode`, `fullHarness`, `scoringTrace`, `allReviewerAxesPerfect100`) being present is an additional schema warning.

## BR-0004-0012: layoutAntiPatternsDetected Whitelist

- AC-Refs: AC-0004-0012
- Any string in `layoutAntiPatternsDetected` not in `{lap-001-orphan-page..lap-008-no-back-affordance}` rejects the review.json.
- Detection of any `lap-*` token caps `informationArchitecture` at `acceptable` (cross-validated against AC-0012-0024 in spec-0012).

## BR-0004-0013: designMdViolations Shape and findDesignMdViolations Purity

- AC-Refs: AC-0004-0013, AC-0004-0014
- Each `designMdViolations` element MUST have exactly the keys `{category, expected, found, location}` with `category` ∈ `{color, font, radius, shadow}`.
- The producer `findDesignMdViolations(html, designMd)` is pure and deterministic; it MUST NOT touch `fs`, `process`, `Date.now`, network, or any side-channel.
- Non-empty `designMdViolations` blocks `/qfai-prototyping` convergence; convergence semantics are deferred to spec-0012, while spec-0004 only validates the data shape and producer purity.
