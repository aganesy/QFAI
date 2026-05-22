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

## AC-0004-0015

- US-Refs: US-0004-0028
- Given a project with a directory at `.qfai/assistant/steering/` (or any other non-canonical layer name)
- When `qfai validate` runs
- Then a finding is emitted naming the offending directory; the canonical layer enum (`constitution`, `manifest`, `catalog`, `process`) is enumerated in the finding text; severity is at least warning during the deprecation window (D-DEPRECATED-PATH co-fires per REQ-0029)

## AC-0004-0016

- US-Refs: US-0004-0029
- Given a work-log entry file at `.qfai/steering/<name>.md` whose YAML frontmatter omits a required field, uses a wrong enum value for `kind`/`status`, or carries a malformed `created`/`updated` timestamp
- When `qfai validate` runs
- Then `W-WORKLOG-SCHEMA` is emitted at warning severity (non-blocking) naming the file and the offending field; valid entries do not trigger it

## AC-0004-0017

- US-Refs: US-0004-0029
- Given a work-log entry whose `links: [spec-0099, discussion-99991231235959999, entry-XXXX-FAKE]` references resources that do not exist on disk
- When `qfai validate` runs
- Then `W-WORKLOG-BROKEN-LINK` is emitted at warning severity for each unresolved reference, naming the entry file and the unresolved token

## AC-0004-0018

- US-Refs: US-0004-0030
- Given a reviewer report containing an `R-WORKLOG-DRIFT` or `R-REJECTED-READOPT` finding with an empty or missing `justification:` field
- When `qfai validate` ingests the reviewer report
- Then the validator rejects the run with severity error (advisory-failing). A correctly-justified finding (non-empty `justification:` naming the entry ID or Decisions row) passes

## AC-0004-0019

- US-Refs: US-0004-0030
- Given a work-log entry with `kind: handoff` whose body is missing at least one of the 5 required sections (`State`, `Next action`, `Constraints`, `OQs`, `References`)
- When `qfai validate` runs
- Then `R-HANDOFF-INCOMPLETE` is emitted at error severity; the finding text names the missing section(s) and the entry file

## AC-0004-0020

- US-Refs: US-0004-0031
- Given a work-log entry of `kind: decision` whose `promote-to: 07_Decisions.md` is set but `07_Decisions.md` does NOT yet contain a row referencing the entry AND no `promoted-to` back-ref exists in the entry's frontmatter
- When `qfai validate` runs
- Then `W-PENDING-PROMOTION` is emitted at warning severity AND a dedicated section "Pending Promotions" appears in the validate report

## AC-0004-0021

- US-Refs: US-0004-0031
- Given a `status: active` work-log entry whose `updated` timestamp is older than 90 days from now
- When `qfai validate` runs
- Then `W-WORKLOG-STALE` is emitted at warning severity naming the entry and its age in days

## AC-0004-0022

- US-Refs: US-0004-0032
- Given a project still carrying `.qfai/assistant/steering/` after the v1.9.0 release
- When `qfai validate` runs in v1.9.x
- Then `D-DEPRECATED-PATH` warning is emitted with the body string literally containing `sunset: v1.10.0`; in v1.10.0+ the same condition escalates to error per REQ-0008 (handled by spec-0003 sunset semantics + spec-0004 validator severity table)

## AC-0004-0023

- US-Refs: US-0004-0032
- Given a `qfai-*` skill whose SKILL.md does not declare a top-level `project_memory:` YAML block
- When `qfai validate` runs
- Then an error finding is emitted (no specific code; uses `QFAI-SKILL-*` family) naming the skill and pointing at the missing block; read attempts of un-declared paths through the skill body are also rejected

## AC-0004-0024

- US-Refs: US-0004-0033
- Given a SKILL.md whose body references a path that no longer resolves under the 4-layer layout (e.g., `.qfai/assistant/steering/agent-routing.yml`)
- When `qfai validate` runs
- Then `W-SKILL-DOC-BROKEN-REF` is emitted at warning severity naming the SKILL.md file and the broken reference

## AC-0004-0025

- US-Refs: US-0004-0033
- Given a validate run on a project that just completed `qfai init --upgrade-assistant-tree`
- When the migration emitted `W-USER-EDIT-PRESERVED` informational notes
- Then the validator recognizes those notes as informational pass-throughs (`info` severity, not warning/error); they appear in the validate report under "Informational" without failing any gate
