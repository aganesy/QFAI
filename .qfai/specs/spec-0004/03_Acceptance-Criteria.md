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

- `layoutAntiPatternsDetected` is an array of strings drawn from the whitelist in `packages/qfai/assets/validators/layoutAntiPatterns.json`, which is the SSOT the validator resolves against (`loadKnownLapIds`): `{lap-001-saas-dashboard, lap-002-card-grid-sidebar, lap-003-saas-table-tabs, lap-004-bento-grid, lap-005-centered-hero, lap-006-overcrowded-sidebar, lap-007-state-not-represented, lap-008-no-back-affordance}`. Six are scoped `layout` and two (`lap-007`, `lap-008`) `semantic`; each entry carries the regex that detects it, so adding or renaming one is a change to that file and this list follows it.
- Any token absent from that registry rejects the review.json with `QFAI-PROT-002` at error severity.
- An earlier revision of this criterion listed eight different IDs — `lap-001-orphan-page`, `lap-002-deadend-flow`, `lap-003-hidden-state`, `lap-004-missing-wayfinding`, `lap-005-input-trap`, `lap-006-modal-dead-zone`, `lap-007-untargetable-affordance` — naming navigation and interaction defects rather than layout archetypes. Seven of the eight had no counterpart in the registry, so every one of them was rejected by the shipped gate while every ID the gate accepts violated this criterion (#1105). The registry is canonical: it is what the validator reads, and each entry carries a working detector. Whether the navigation-defect family is separately worth detecting is a product question, recorded in `08_Open-questions.md` rather than settled here.

## AC-0004-0013

- `designMdViolations` is an array of objects with shape `{kind: "color"|"font"|"radius"|"shadow", found: string}` — the shape `core/validators/prototypingEvidence.ts` checks (`isViolationArray`, and `DESIGN_MD_VIOLATION_KINDS` for the enum).
- A missing `kind`, a missing `found`, or an out-of-enum `kind` rejects the review.json with `QFAI-PROT-002` at error severity. Extra fields do **not** reject: the shipped check reads the two it requires and ignores the rest.
- An earlier revision named the key `category` and required `expected` and `location` too, with any extra field rejecting. None of that is what the validator does, so a payload written to this criterion was rejected on `kind` and a payload written to the validator violated the criterion (#1105). The enum itself was already right. Whether a reviewer should have to supply `expected` and `location` — information the shipped check drops — is a product question, recorded in `08_Open-questions.md`.

## AC-0004-0014

- `findDesignMdViolations(html, designMd)` is pure (no I/O, no clock, no global state) and deterministic (same input bytes → same output array).
- Property tests assert: (a) idempotence, (b) order-stability, (c) absence of `Date`, `process`, `fs`, network calls in the call graph.

## AC-0004-0015

- US-Refs: US-0004-0028
- Given a project with a directory at `.qfai/assistant/steering/` (or any other non-canonical layer name)
- When `qfai validate` runs
- Then a finding is emitted naming the offending directory; the canonical layer enum (`constitution`, `manifest`, `catalog`, `process`) is enumerated in the finding text; severity is at least warning during the deprecation window (D-DEPRECATED-PATH co-fires per REQ-0040)

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
- Given a work-log entry with `kind: handoff` whose body is missing at least one of the 5 required sections (`## State of the task`, `## Next single action`, `## Constraints to preserve`, `## Open questions`, `## References to consult first` — canonical per `.qfai/contracts/cli/worklog-entry.schema.md`)
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
- Given a `qfai-*` SKILL.md whose body references a path that no longer resolves under the 4-layer layout (e.g., `.qfai/assistant/steering/agent-routing.yml`)
- When `qfai validate` runs
- Then `W-SKILL-DOC-BROKEN-REF` is emitted; severity is `warning` during the deprecation window (running tool version < `LEGACY_STEERING_SUNSET`) and escalates to `error` once the tool version reaches or passes the sunset minor. The message headline branches with the severity so consumers can distinguish "Read-compatible only" (pre-sunset) from "past the announced sunset" (post-sunset). User-defined (non-`qfai-*`) skills are NOT flagged.

## AC-0004-0025

- US-Refs: US-0004-0033
- Given a validate run on a project that just completed `qfai init --upgrade-assistant-tree`
- When the migration emitted `W-USER-EDIT-PRESERVED` informational notes
- Then the validator recognizes those notes as informational pass-throughs (`info` severity, not warning/error); they appear in the validate report under "Informational" without failing any gate

## AC-0004-0026

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema; meta-validation of the manifest pipeline that surfaces agent SSOT divergence)
- Given the `agent-catalog.yml` entry for any agent declares a `developer_instructions` field that diverges from the canonical `.qfai/assistant/agents/<name>.md` body (from `## Mission` onward, line-ending normalized)
- When the SSOT-guard test (`tests/codex/agents.test.ts` ssot-guard test) runs
- Then the test FAILS naming the diverging agent id so the 3-way SSOT (canonical MD ↔ codex TOML ↔ `agent-catalog.yml`) cannot silently drift

## AC-0004-0027

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema)
- Given a `.qfai/steering/<id>.md` entry whose `created` or `updated` field value either (a) does not match the surface regex `^\d{4}-\d{2}-\d{2}$` OR (b) matches the regex but is not a valid calendar date (e.g. `2026-02-30`, `2026-13-01`)
- When `qfai validate` runs
- Then `W-WORKLOG-SCHEMA` is emitted at warning severity per non-conformant field (rule: `worklogSurface.schema.createdFormat` / `updatedFormat`) — both branches are handled by `isValidCalendarDate()` round-trip detection so neither bad-syntax nor calendar-rollover dates can silently flow through schema validation

## AC-0004-0028

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema)
- Given a `.qfai/steering/<id>.md` entry whose `updated` ISO-8601 date is strictly earlier than its `created` ISO-8601 date
- When `qfai validate` runs
- Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.updatedOrder`) is emitted at warning severity naming both dates, enforcing the worklog contract's `updated >= created` invariant

## AC-0004-0029

- US-Refs: US-0004-0029 (sub-criterion of REQ-0039 link integrity)
- Given a `.qfai/steering/<id>.md` entry whose `links` array contains one or more non-string elements (e.g. `links: [123, true]`)
- When `qfai validate` runs
- Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.linksElementType`) is emitted per non-string element so malformed link items cannot bypass schema and broken-link checks

## AC-0004-0030

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema)
- Given a `.qfai/steering/<id>.md` entry whose frontmatter `id` value does not match kebab-case ASCII (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- When `qfai validate` runs
- Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.idFormat`) is emitted at warning severity naming the offending id, enforcing the worklog-entry.schema.md Storage-model requirement that `<id>` is kebab-case ASCII

## AC-0004-0031

- US-Refs: US-0004-0034
- Given a `qfai validate --profile prototyping` run immediately followed by a `qfai validate --profile default` run in the same working tree
- When the two runs complete
- Then `.qfai/report/validate-prototyping.json` AND `.qfai/report/validate-default.json` both exist with mutually independent contents (neither overwritten by the other); `.qfai/report/validate.json` reflects only the most recent run and carries an explicit top-level `profile` field naming that run's profile

## AC-0004-0032

- US-Refs: US-0004-0034
- Given a downstream project that still reads from the legacy `.qfai/output/validate.json` path
- When `qfai validate` runs during the deprecation window (current minor)
- Then the legacy path continues to receive a copy of the latest validate JSON AND `D-DEPRECATED-PATH` is emitted at severity warning naming the sunset version `1.10.0` (literal string in the message body)
- At sunset (when the running tool reaches the named version), the same condition escalates to severity error and the legacy path is no longer written

## AC-0004-0033

- US-Refs: US-0004-0035
- Given a PR that modifies `packages/qfai/src/core/validators/findDesignMdViolations.ts` without a paired modification to the LLM prompt SSOT under `packages/qfai/assets/init/.claude/skills/qfai-prototyping/references/generator-prompt.md` (or vice versa)
- When `pnpm ci:lint` runs as part of the new SSOT-sync-pair lane
- Then the lane FAILS and a Reviewer-Gate finding `R-PROMPT-SCANNER-DRIFT` (severity error) is emitted naming both the modified file and the un-paired counterpart; a paired modification (both files touched in the same PR) passes the lane

## AC-0004-0034

- US-Refs: US-0004-0035
- Given the SSOT-sync-pair lane runs on a PR with no changes to either file
- When the lane evaluates pair-changed semantics
- Then the lane passes silently (no `R-PROMPT-SCANNER-DRIFT` finding is emitted); the lane only fires when exactly one of the two paired files changes

## AC-0004-0035

- US-Refs: US-0004-0036
- Given a Reviewer-Gate report containing an `R-PROMPT-SCANNER-DRIFT` finding whose `justification:` field is empty, missing, or whitespace-only
- When `qfai validate` ingests the reviewer report
- Then validate rejects the run with severity error (advisory-failing); a finding with a non-empty `justification:` naming (a) the modified file, (b) the un-paired counterpart, and (c) the specific contract clause whose match cannot be confirmed passes

## AC-0004-0036

- US-Refs: US-0004-0037
- Given a SaaS-tenant repo whose prototyping-profile validate PASSes, with a DCON-005 design-system attestation present at `.qfai/contracts/design/design-system.yaml` and a conforming CLI-HANDOFF cross-skill handoff
- When `qfai validate --profile saas-package` runs
- Then validate PASSes; the ATDD / implement-class gates are SKIPPED and each skip is surfaced as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (severity info) finding naming the skipped gate
- And when any of the three required conditions fails (prototyping-profile fails, DCON-005 attestation absent, or CLI-HANDOFF schema fails), `qfai validate --profile saas-package` does NOT PASS

## AC-0004-0037

- US-Refs: US-0004-0038
- Given a UI contract whose `primary_tasks` items use the legacy string-only form
- When `auditProfile.ts` evaluates the contract
- Then the string-only items continue to PASS during the deprecation window, AND a structured `{id, label, acceptance}` (all three required, `additionalProperties: false` per DR-0268) form is also accepted
- And the `QFAI-AUD-020` warning text names the recommended count band `3..7` (per DR-0267)

## AC-0004-0038

- US-Refs: US-0004-0039
- Given a PR that introduces a `review-*/` or `discussion-*/` directory outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`)
- When the `check-pack-locations.mjs` lane (wired into `pnpm ci:lint`, scanning staged / changed dirs per DR-0274) runs
- Then the lane FAILS emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes the correct allowed-root path for the misplaced directory

## AC-0004-0039

- US-Refs: US-0004-0039
- Given a PR that adds `review-*/` or `discussion-*/` directories only under allowed roots (or touches no pack directories at all)
- When the `check-pack-locations.mjs` lane runs
- Then the lane passes silently with no `R-PACK-LOCATION-DRIFT` finding; pre-existing legacy packs on unrelated PRs are not re-flagged (staged/changed-dir scope, not a full-tree walk, per DR-0274)
