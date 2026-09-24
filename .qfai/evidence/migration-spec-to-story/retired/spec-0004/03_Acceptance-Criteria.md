# 03 Acceptance Criteria

## AC-0004-0001

```gherkin
Scenario: AC-0004-0001
  Given a QFAI project
  When `qfai validate` runs
  Then `qfai validate` runs deterministic validators and aggregates issues.
```

## AC-0004-0002

```gherkin
Scenario: AC-0004-0002
  Given the canonical UIX validator set
  When production validation runs
  Then the canonical UIX validator set remains the production path.
```

## AC-0004-0003

```gherkin
Scenario: AC-0004-0003
  Given a declared screen has no screenshot evidence
  When the UI evidence validator runs
  Then `QFAI-UIE-001` fires when a declared screen is missing screenshot evidence.
```

## AC-0004-0004

```gherkin
Scenario: AC-0004-0004
  Given a declared screen has no HTML snapshot evidence
  When the UI evidence validator runs
  Then `QFAI-UIE-002` fires when a declared screen is missing HTML snapshot evidence.
```

## AC-0004-0005

```gherkin
Scenario: AC-0004-0005
  Given no screen contract exists
  When the UI evidence validator runs
  Then the UI evidence validator skips without error.
```

## AC-0004-0006

```gherkin
Scenario: AC-0004-0006
  Given the current prototyping skill
  When the prototyping skill validator runs
  Then the prototyping skill validator confirms current skill sections, evidence paths, and CLI-removal wording.
```

## AC-0004-0007

```gherkin
Scenario: AC-0004-0007
  Given legacy artifact validators exist
  When production validation runs
  Then legacy artifact validators are treated as validator slices rather than proof of a public runtime surface.
```

## AC-0004-0008

```gherkin
Scenario: AC-0004-0008 required design tokens
  Given root `DESIGN.md` and `references/design-md-spec.md`
  When DCON-030 runs
  Then DCON-030 validates that root `DESIGN.md` exists and contains the required token tables (color, typography, radius, shadow) parseable per `references/design-md-spec.md`.

Scenario: AC-0004-0008 missing design tokens
  Given root `DESIGN.md` is missing or unparseable
  When DCON-030 runs
  Then Missing or unparseable `DESIGN.md` emits `QFAI-DCON-030` at error severity.
```

## AC-0004-0009

```gherkin
Scenario: AC-0004-0009 matching design lock
  Given the design lock and root `DESIGN.md` bytes
  When DCON-031 runs
  Then DCON-031 validates that `<paths.contractsDir>/design/DESIGN.md.lock.yaml#sha256` matches `sha256(DESIGN.md bytes)` byte-for-byte.

Scenario: AC-0004-0009 hash drift
  Given the design lock hash differs from the on-disk hash
  When DCON-031 runs
  Then Hash drift emits `QFAI-DCON-031` at error severity with both the lock sha256 and the on-disk sha256 in the message.
```

## AC-0004-0010

```gherkin
Scenario: AC-0004-0010 matching design system
  Given the design system and root `DESIGN.md` token tables
  When DCON-032 runs
  Then DCON-032 validates that `<paths.contractsDir>/design/design-system.yaml` token tables (color, typography, radius, shadow) are byte-equivalent to the parsed token tables of root `DESIGN.md`.

Scenario: AC-0004-0010 diverging design system
  Given a design-system token category diverges from root `DESIGN.md`
  When DCON-032 runs
  Then Any divergence emits `QFAI-DCON-032` at error severity, listing the diverging token category.
```

## AC-0004-0011

```gherkin
Scenario: AC-0004-0011 review schema
  Given an `.qfai/evidence/prototyping/iter-NN/review.json` file
  When the prototypingEvidenceV3 validator runs
  Then prototypingEvidenceV3 validator checks each `.qfai/evidence/prototyping/iter-NN/review.json` against schema v3: 4 UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) each scored on the ordinal scale `{weak, acceptable, strong, exceptional}`, prose critique within its cap — measured in CJK characters where the text carries CJK and in whitespace-separated words otherwise, with no lower bound in either unit — and `pivotDirective` ∈ `{continue, refine, pivot}`.

Scenario: AC-0004-0011 invalid review
  Given review.json has missing axes, an out-of-range ordinal or word count, or an unknown pivotDirective
  When the prototypingEvidenceV3 validator runs
  Then Missing axes / out-of-range ordinal / out-of-range word count / unknown pivotDirective each emits `QFAI-PROT-002` at error severity.
```

## AC-0004-0012

```gherkin
Scenario: AC-0004-0012 known layout pattern
  Given a `layoutAntiPatternsDetected` array
  When the validator resolves tokens against the registry
  Then `layoutAntiPatternsDetected` is an array of strings drawn from the whitelist in `packages/qfai/assets/validators/layoutAntiPatterns.json`, which is the SSOT the validator resolves against (`loadKnownLapIds`): `{lap-007-state-not-represented, lap-008-no-back-affordance}`. Both are scoped `semantic`; each entry carries the regex that detects it and the authority that makes it a defect, so adding or renaming one is a change to that file and this list follows it.

Scenario: AC-0004-0012 unknown layout pattern
  Given a token is absent from the layout anti-pattern registry
  When the validator checks review.json
  Then Any token absent from that registry rejects the review.json with `QFAI-PROT-002` at error severity.
```

- Note: An earlier revision of this criterion listed eight different IDs — `lap-001-orphan-page`, `lap-002-deadend-flow`, `lap-003-hidden-state`, `lap-004-missing-wayfinding`, `lap-005-input-trap`, `lap-006-modal-dead-zone`, `lap-007-untargetable-affordance` — naming navigation and interaction defects rather than layout archetypes. Seven of the eight had no counterpart in the registry, so every one of them was rejected by the shipped gate while every ID the gate accepts violated this criterion. The registry is canonical: it is what the validator reads, and each entry carries a working detector. Whether the navigation-defect family is separately worth detecting is a product question, recorded in `08_Open-questions.md` rather than settled here.

## AC-0004-0013

```gherkin
Scenario: AC-0004-0013 violation shape
  Given a `designMdViolations` array
  When the prototyping evidence validator checks it
  Then `designMdViolations` is an array of objects with shape `{kind: "color"|"font"|"radius"|"shadow", found: string}` — the shape `core/validators/prototypingEvidence.ts` checks (`isViolationArray`, and `DESIGN_MD_VIOLATION_KINDS` for the enum).

Scenario: AC-0004-0013 invalid violation
  Given a violation is missing `kind` or `found`, or has an out-of-enum `kind`
  When the validator checks review.json
  Then a missing `kind`, a missing `found`, or an out-of-enum `kind` rejects the review.json with `QFAI-PROT-002` at error severity.

Scenario: AC-0004-0013 extra fields
  Given a violation has `kind` and `found` plus extra fields
  When the validator checks review.json
  Then extra fields do **not** reject: the shipped check reads the two it requires and ignores the rest.
```

- Note: An earlier revision named the key `category` and required `expected` and `location` too, with any extra field rejecting. None of that is what the validator does, so a payload written to this criterion was rejected on `kind` and a payload written to the validator violated the criterion. The enum itself was already right. Whether a reviewer should have to supply `expected` and `location` — information the shipped check drops — is a product question, recorded in `08_Open-questions.md`.

## AC-0004-0014

```gherkin
Scenario: AC-0004-0014
  Given the same HTML and DESIGN.md input bytes
  When `findDesignMdViolations(html, designMd)` runs
  Then `findDesignMdViolations(html, designMd)` is pure (no I/O, no clock, no global state) and deterministic (same input bytes → same output array).
  And property tests assert: (a) idempotence, (b) order-stability, (c) absence of `Date`, `process`, `fs`, network calls in the call graph.
```

## AC-0004-0015

- US-Refs: US-0004-0028

```gherkin
Scenario: AC-0004-0015
  Given a project with a directory at `.qfai/assistant/steering/` (or any other non-canonical layer name)
  When `qfai validate` runs
  Then a finding is emitted naming the offending directory; the canonical layer enum (`constitution`, `manifest`, `catalog`, `process`) is enumerated in the finding text; severity is at least warning during the deprecation window (D-DEPRECATED-PATH co-fires per REQ-0040)
  And with the `rule/ skill/ agent/ prompt/` assistant tree, the enumerated layers are `rule`, `skill`, `agent` and `prompt`. A `skill.local/` directory raises no finding, and a directory under a name those four replaced is reported like any other non-canonical name
```

## AC-0004-0016

- US-Refs: US-0004-0029

```gherkin
Scenario: AC-0004-0016
  Given a work-log entry file at `.qfai/steering/<name>.md` whose YAML frontmatter omits a required field, uses a wrong enum value for `kind`/`status`, or carries a malformed `created`/`updated` timestamp
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` is emitted at warning severity (non-blocking) naming the file and the offending field; valid entries do not trigger it
```

## AC-0004-0017

- US-Refs: US-0004-0029

```gherkin
Scenario: AC-0004-0017
  Given a work-log entry whose `links:` array names a missing spec, discussion pack, and kebab-case entry ID without requiring an `entry-` prefix
  When `qfai validate` runs
  Then `W-WORKLOG-BROKEN-LINK` is emitted at warning severity for each unresolved reference, naming the entry file and the unresolved token
  And On the story tree, a `BF-NNNN` element with no `business-flow-NNNN/` directory under `paths.specsDir`, and a `DEC-NNNN` element with no row in `decisions.md`, are unresolved references and raise the same finding
```

## AC-0004-0018

- US-Refs: US-0004-0030

```gherkin
Scenario: AC-0004-0018
  Given a reviewer report containing an `R-WORKLOG-DRIFT` or `R-REJECTED-READOPT` finding with an empty or missing `justification:` field
  When `qfai validate` ingests the reviewer report
  Then the validator rejects the run with severity error (advisory-failing). A correctly-justified finding (non-empty `justification:` naming the entry ID or Decisions row) passes
```

## AC-0004-0019

- US-Refs: US-0004-0030

```gherkin
Scenario: AC-0004-0019
  Given a work-log entry with `kind: handoff` whose body is missing at least one of the 5 required sections (`## State of the task`, `## Next single action`, `## Constraints to preserve`, `## Open questions`, `## References to consult first` — canonical per `.qfai/contracts/cli/worklog-entry.schema.md`)
  When `qfai validate` runs
  Then `R-HANDOFF-INCOMPLETE` is emitted at error severity; the finding text names the missing section(s) and the entry file
```

## AC-0004-0020

- US-Refs: US-0004-0031

```gherkin
Scenario: AC-0004-0020
  Given a work-log entry of `kind: decision` whose declared `promote-to: spec-NNNN/07_Decisions.md` target has no row citing the entry ID as a whole token, or whose status is not `archived`, or whose `promoted-to` does not name that row's DR ID
  When `qfai validate` runs
  Then `W-PENDING-PROMOTION` is emitted at warning severity AND a dedicated section "Pending Promotions" appears in the validate report
  And On the story tree, the same finding and section appear for an entry whose `promote-to: decisions.md` is set while no `decisions.md` row cites its ID as a whole token, its status is not `archived`, or its `promoted-to` does not name that row's DEC ID
```

## AC-0004-0021

- US-Refs: US-0004-0031

```gherkin
Scenario: AC-0004-0021
  Given a `status: active` work-log entry whose `updated` timestamp is older than 90 days from now
  When `qfai validate` runs
  Then `W-WORKLOG-STALE` is emitted at warning severity naming the entry and its age in days
```

## AC-0004-0022

- US-Refs: US-0004-0032

```gherkin
Scenario: AC-0004-0022
  Given a project still carrying `.qfai/assistant/steering/` after the v1.9.0 release
  When `qfai validate` runs in v1.9.x
  Then `D-DEPRECATED-PATH` warning is emitted with the body string literally containing `sunset: v1.10.0`; in v1.10.0+ the same condition escalates to error per REQ-0008 (handled by spec-0003 sunset semantics + spec-0004 validator severity table)
```

## AC-0004-0023

- US-Refs: US-0004-0032

```gherkin
Scenario: AC-0004-0023
  Given a `qfai-*` skill whose SKILL.md does not declare a top-level `project_memory:` YAML block
  When `qfai validate` runs
  Then an error finding is emitted (no specific code; uses `QFAI-SKILL-*` family) naming the skill and pointing at the missing block; read attempts of un-declared paths through the skill body are also rejected
```

## AC-0004-0024

- US-Refs: US-0004-0033

```gherkin
Scenario: AC-0004-0024
  Given a `qfai-*` SKILL.md whose body references a path that no longer resolves under the 4-layer layout (e.g., `.qfai/assistant/steering/agent-routing.yml`)
  When `qfai validate` runs
  Then `W-SKILL-DOC-BROKEN-REF` is emitted; severity is `warning` during the deprecation window (running tool version < `LEGACY_STEERING_SUNSET`) and escalates to `error` once the tool version reaches or passes the sunset minor. The message headline branches with the severity so consumers can distinguish "Read-compatible only" (pre-sunset) from "past the announced sunset" (post-sunset). User-defined (non-`qfai-*`) skills are NOT flagged.
  And With the `rule/ skill/ agent/ prompt/` assistant tree, a reference resolves only under those four layers, so a reference into `constitution/`, `manifest/`, `catalog/` or `process/` is reported the same way
```

## AC-0004-0025

- US-Refs: US-0004-0033

```gherkin
Scenario: AC-0004-0025
  Given a validate run on a project that just completed `qfai init --upgrade-assistant-tree`
  When the migration emitted `W-USER-EDIT-PRESERVED` informational notes
  Then the validator recognizes those notes as informational pass-throughs (`info` severity, not warning/error); they appear in the validate report under "Informational" without failing any gate
```

## AC-0004-0026

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema; meta-validation of the manifest pipeline that surfaces agent SSOT divergence)

```gherkin
Scenario: AC-0004-0026
  Given the `agent-catalog.yml` entry for any agent declares a `developer_instructions` field that diverges from the canonical `.qfai/assistant/agents/<name>.md` body (from `## Mission` onward, line-ending normalized)
  When the SSOT-guard test (`tests/codex/agents.test.ts` ssot-guard test) runs
  Then the test FAILS naming the diverging agent id so the 3-way SSOT (canonical MD ↔ codex TOML ↔ `agent-catalog.yml`) cannot silently drift

Scenario: AC-0004-0026 on the rule/ skill/ agent/ prompt/ assistant tree
  Given `agent-catalog.yml` and its `developer_instructions` no longer exist, and the guard compares the agent card at `.qfai/assistant/agent/<name>.md` with the generated `.codex/agents/<name>.toml`
  And the TOML differs from the card in a field generated from its frontmatter or in `developer_instructions` against the card body from `## Mission` onward (line-ending normalized)
  When the two-way guard runs
  Then it FAILS naming the agent id, whichever side changed
```

## AC-0004-0027

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema)

```gherkin
Scenario: AC-0004-0027
  Given a `.qfai/steering/<id>.md` entry whose `created` or `updated` field value either (a) does not match the surface regex `^\d{4}-\d{2}-\d{2}$` OR (b) matches the regex but is not a valid calendar date (e.g. `2026-02-30`, `2026-13-01`)
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` is emitted at warning severity per non-conformant field (rule: `worklogSurface.schema.createdFormat` / `updatedFormat`) — both branches are handled by `isValidCalendarDate()` round-trip detection so neither bad-syntax nor calendar-rollover dates can silently flow through schema validation
```

## AC-0004-0028

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema)

```gherkin
Scenario: AC-0004-0028
  Given a `.qfai/steering/<id>.md` entry whose `updated` ISO-8601 date is strictly earlier than its `created` ISO-8601 date
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.updatedOrder`) is emitted at warning severity naming both dates, enforcing the worklog contract's `updated >= created` invariant
```

## AC-0004-0029

- US-Refs: US-0004-0029 (sub-criterion of REQ-0039 link integrity)

```gherkin
Scenario: AC-0004-0029
  Given a `.qfai/steering/<id>.md` entry whose `links` array contains one or more non-string elements (e.g. `links: [123, true]`)
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.linksElementType`) is emitted per non-string element so malformed link items cannot bypass schema and broken-link checks
```

## AC-0004-0030

- US-Refs: US-0004-0029 (sub-criterion of REQ-0035 frontmatter schema)

```gherkin
Scenario: AC-0004-0030
  Given a `.qfai/steering/<id>.md` entry whose frontmatter `id` value does not match kebab-case ASCII (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.idFormat`) is emitted at warning severity naming the offending id, enforcing the worklog-entry.schema.md Storage-model requirement that `<id>` is kebab-case ASCII
```

## AC-0004-0031

- US-Refs: US-0004-0034

```gherkin
Scenario: AC-0004-0031
  Given a `qfai validate --profile prototyping` run immediately followed by a `qfai validate --profile default` run in the same working tree
  When the two runs complete
  Then `.qfai/report/validate-prototyping.json` AND `.qfai/report/validate-default.json` both exist with mutually independent contents (neither overwritten by the other); `.qfai/report/validate.json` reflects only the most recent run and carries an explicit top-level `profile` field naming that run's profile
```

## AC-0004-0032

- US-Refs: US-0004-0034

```gherkin
Scenario: AC-0004-0032
  Given a downstream project that still reads from the legacy `.qfai/output/validate.json` path
  When `qfai validate` runs during the deprecation window (current minor)
  Then the legacy path continues to receive a copy of the latest validate JSON AND `D-DEPRECATED-PATH` is emitted at severity warning naming the sunset version `1.10.0` (literal string in the message body)
  And At sunset (when the running tool reaches the named version), the same condition escalates to severity error and the legacy path is no longer written
```

## AC-0004-0033

- US-Refs: US-0004-0035

```gherkin
Scenario: AC-0004-0033
  Given a PR that modifies `packages/qfai/src/core/validators/findDesignMdViolations.ts` without a paired modification to the LLM prompt SSOT under `packages/qfai/assets/init/.claude/skills/qfai-prototyping/references/generator-prompt.md` (or vice versa)
  When `pnpm ci:lint` runs as part of the new SSOT-sync-pair lane
  Then the lane FAILS and a Reviewer-Gate finding `R-PROMPT-SCANNER-DRIFT` (severity error) is emitted naming both the modified file and the un-paired counterpart; a paired modification (both files touched in the same PR) passes the lane
```

## AC-0004-0034

- US-Refs: US-0004-0035

```gherkin
Scenario: AC-0004-0034
  Given the SSOT-sync-pair lane runs on a PR with no changes to either file
  When the lane evaluates pair-changed semantics
  Then the lane passes silently (no `R-PROMPT-SCANNER-DRIFT` finding is emitted); the lane only fires when exactly one of the two paired files changes
```

## AC-0004-0035

- US-Refs: US-0004-0036

```gherkin
Scenario: AC-0004-0035
  Given a Reviewer-Gate report containing an `R-PROMPT-SCANNER-DRIFT` finding whose `justification:` field is empty, missing, or whitespace-only
  When `qfai validate` ingests the reviewer report
  Then validate rejects the run with severity error (advisory-failing); a finding with a non-empty `justification:` naming (a) the modified file, (b) the un-paired counterpart, and (c) the specific contract clause whose match cannot be confirmed passes
```

## AC-0004-0036

- US-Refs: US-0004-0037

```gherkin
Scenario: AC-0004-0036
  Given a SaaS-tenant repo whose prototyping-profile validate PASSes, with a DCON-005 design-system attestation present at `<paths.contractsDir>/design/design-system.yaml` and a conforming CLI-HANDOFF cross-skill handoff
  When `qfai validate --profile saas-package` runs
  Then validate PASSes; the ATDD / implement-class gates are SKIPPED and each skip is surfaced as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (severity info) finding naming the skipped gate
  And when any of the three required conditions fails (prototyping-profile fails, DCON-005 attestation absent, or CLI-HANDOFF schema fails), `qfai validate --profile saas-package` does NOT PASS
```

## AC-0004-0037

- US-Refs: US-0004-0038

```gherkin
Scenario: AC-0004-0037
  Given a UI contract whose `primary_tasks` items use the legacy string-only form
  When `auditProfile.ts` evaluates the contract
  Then the string-only items continue to PASS during the deprecation window, AND a structured `{id, label, acceptance}` (all three required, `additionalProperties: false` per DR-0268) form is also accepted
  And the `QFAI-AUD-020` warning text names the recommended count band `3..7` (per DR-0267)
```

## AC-0004-0038

- US-Refs: US-0004-0039

```gherkin
Scenario: AC-0004-0038
  Given a PR that introduces a `review-*/` or `discussion-*/` directory outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`)
  When the `check-pack-locations.mjs` lane (wired into `pnpm ci:lint`, scanning staged / changed dirs per DR-0274) runs
  Then the lane FAILS emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes the correct allowed-root path for the misplaced directory
```

## AC-0004-0039

- US-Refs: US-0004-0039

```gherkin
Scenario: AC-0004-0039
  Given a PR that adds `review-*/` or `discussion-*/` directories only under allowed roots (or touches no pack directories at all)
  When the `check-pack-locations.mjs` lane runs
  Then the lane passes silently with no `R-PACK-LOCATION-DRIFT` finding; pre-existing legacy packs on unrelated PRs are not re-flagged (staged/changed-dir scope, not a full-tree walk, per DR-0274)
```

## AC-0004-0041

- US-Refs: US-0004-0040

```gherkin
Scenario: AC-0004-0041
  Given a project whose `paths.specsDir` holds no `spec-*/` and no `_policies/` directory (the story tree)
  When `qfai validate --profile sdd` runs
  Then the story-tree finding families run on it and the spec-pack validators report nothing about it
  And A `paths.specsDir` that holds a `spec-*/` or `_policies/` directory beside story-tree files is read as the spec-pack layout, and no story-tree finding family runs on it
```

## AC-0004-0042

- US-Refs: US-0004-0040

```gherkin
Scenario: AC-0004-0042
  Given the story tree, and a `user-story-NNNN-NNNN/` directory that lacks `01_User-story.md`, `02_Acceptance-Criteria.md` or `03_Example.md`, holds any other file, or holds a subdirectory
  When `qfai validate --profile sdd` runs
  Then an error names the directory and each missing or extra entry
  And A story directory holding exactly the three files raises no such error
```

## AC-0004-0043

- US-Refs: US-0004-0040

```gherkin
Scenario: AC-0004-0043
  Given the story tree, and an ID the tree defines that does not match its shape — `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN` or `OQ-NNNN`
  When `qfai validate --profile sdd` runs
  Then an error names the ID and the file that defines it
```

## AC-0004-0044

- US-Refs: US-0004-0040

```gherkin
Scenario: AC-0004-0044
  Given the story tree, and an ID of one of the seven shapes defined in more than one place
  When `qfai validate --profile sdd` runs
  Then one error names the ID and every file that defines it
```

## AC-0004-0045

- US-Refs: US-0004-0040

```gherkin
Scenario: AC-0004-0045
  Given the story tree, and a story ID that does not start with its flow's number, an AC or EX ID that does not start with its story's ID, or a `business-flow-NNNN/` or `user-story-NNNN-NNNN/` directory whose name does not match the ID it holds
  When `qfai validate --profile sdd` runs
  Then an error names the ID and the file that defines it
```

## AC-0004-0046

- US-Refs: US-0004-0041

```gherkin
Scenario: AC-0004-0046
  Given the story tree, and a contract file under `paths.contractsDir` that has no row in `contracts.md`
  When `qfai validate --profile sdd` runs
  Then `QFAI-CONTRACT-034` is raised at error naming the file, keyed by the `CON-*` ID the file declares, or by the file's path for a file under `cli/` or `design/` that declares none
  And A contract file that `contracts.md` lists raises no such finding
```

## AC-0004-0047

- US-Refs: US-0004-0041

```gherkin
Scenario: AC-0004-0047
  Given the story tree, and `tech.md` or `structure.md` under `paths.contractsDir` with a section still holding a shipped placeholder, the Standard commands section of `tech.md` included
  When `qfai validate` runs with a profile that runs `QFAI-ASSETS-*`
  Then `QFAI-ASSETS-003` names that file under `paths.contractsDir` and each section still holding a placeholder
  And The catalog copies of `tech.md` and `structure.md` are not read for this finding on the story tree
```

## AC-0004-0048

- US-Refs: US-0004-0042

```gherkin
Scenario: AC-0004-0048
  Given the story tree, and a `decisions.md` or `open-questions.md` table that has a column other than ID, Content, Approach and Status, or lacks one of those four
  When `qfai validate --profile sdd` runs
  Then an error names the file and the column
```

## AC-0004-0049

- US-Refs: US-0004-0042

```gherkin
Scenario: AC-0004-0049
  Given the story tree, and a row whose Status is outside its table's vocabulary — TODO, WIP or DONE in both tables, plus `SUPERSEDED (by DEC-NNNN)` and REJECTED in `decisions.md`, and DEFERRED in `open-questions.md`
  When `qfai validate --profile sdd` runs
  Then an error names the file and the row ID
  And A SUPERSEDED Status not written as `SUPERSEDED (by DEC-NNNN)` is outside the vocabulary
```

## AC-0004-0050

- US-Refs: US-0004-0042

```gherkin
Scenario: AC-0004-0050
  Given the story tree, and a `decisions.md` row whose ID has the `OQ-NNNN` shape, or an `open-questions.md` row whose ID has the `DEC-NNNN` shape
  When `qfai validate --profile sdd` runs
  Then an error names the file and the row ID
```

## AC-0004-0051

- US-Refs: US-0004-0042

```gherkin
Scenario: AC-0004-0051
  Given the story tree, and a table row whose Content cell opens with `Test exception:`, `Change request:` or `Unadjudicated:`
  When a validator that reads that keyword runs
  Then it reads the IDs or paths after the colon, separated by commas, as the row's references
  And it decides whether the row is in force from the Status cell alone: `Test exception:` while DONE, `Change request:` while WIP or DONE, `Unadjudicated:` while TODO or WIP
```

## AC-0004-0052

- US-Refs: US-0004-0042

```gherkin
Scenario: AC-0004-0052
  Given the story tree, and an `open-questions.md` row opening `Unadjudicated:` with Status TODO or WIP
  When `qfai validate --profile sdd` runs
  Then `QFAI-SPACK-102` is raised at error naming the file and the row ID
  And The same row at DONE or DEFERRED raises no such finding
```

## AC-0004-0053

- US-Refs: US-0004-0043

```gherkin
Scenario: AC-0004-0053
  Given the story tree, a base `qfai validate` can resolve, and a row of `decisions.md` or `open-questions.md` that the base holds
  When the row is removed, or its ID, Content or Approach cell changes, and `qfai validate --profile drift` runs
  Then an error names the file, the row ID and the changed cell
  And A change to the Status cell alone raises no such error
```

## AC-0004-0054

- US-Refs: US-0004-0043

```gherkin
Scenario: AC-0004-0054
  Given the story tree, and a base git cannot resolve, because the base ref is missing or the project is not a git repository
  When `qfai validate --profile drift` runs
  Then neither the row-rewritten check nor the upstream-edit check reports anything
```

## AC-0004-0055

- US-Refs: US-0004-0043

```gherkin
Scenario: AC-0004-0055
  Given the story tree, and a protected file changed since the base: a file under `01_policy/` or `02_business-flow/` of `paths.specsDir`, a file under `paths.contractsDir`, `decisions.md` or `open-questions.md`
  When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
  Then an error names the path unless a `decisions.md` row opening `Change request:` names that path with Status WIP or DONE
  And A `Change request:` row at TODO authorises nothing
```

## AC-0004-0056

- US-Refs: US-0004-0043

```gherkin
Scenario: AC-0004-0056
  Given the story tree, and a change to `decisions.md` confined to rows opening `Change request:`: a row appended at any Status, or a Status changed on such a row
  When `qfai validate --profile drift` runs
  Then no upstream-edit error is raised for `decisions.md`
```

## AC-0004-0057

- US-Refs: US-0004-0044

```gherkin
Scenario: AC-0004-0057
  Given the story tree, and an EX row whose `AC-Ref` cell names no AC, several ACs, an AC the tree does not define, or an AC of another story
  When `qfai validate --profile sdd` runs
  Then an error names the EX ID and the `03_Example.md` that defines it
```

## AC-0004-0058

- US-Refs: US-0004-0044

```gherkin
Scenario: AC-0004-0058
  Given the story tree, and an AC that no EX names in its `AC-Ref` cell
  When `qfai validate --profile sdd` runs
  Then an error names the AC ID and the `02_Acceptance-Criteria.md` that defines it
```

## AC-0004-0059

- US-Refs: US-0004-0044

```gherkin
Scenario: AC-0004-0059
  Given the story tree, and business rules written in a YAML or JSON contract (`x-qfai-rules`), a SQL contract (`-- Rule` and `-- Examples:` lines) and a Markdown contract (a `## Rules` table)
  When `qfai validate --profile sdd` runs
  Then each rule is read with the same fields in every form — its ID, its statement and its examples — so a rule whose examples all exist raises no BR-to-EX error in any of the three
  And a file-level rule-refs list is read as references to rules, not as rules
```

## AC-0004-0060

- US-Refs: US-0004-0044

```gherkin
Scenario: AC-0004-0060
  Given the story tree, and a rule with no examples, or with an example naming an EX the tree does not define
  When `qfai validate --profile sdd` runs
  Then an error names the BR ID and the contract file
  And A SQL `-- Rule` line with no `-- Examples:` line after it is a rule with no examples
```

## AC-0004-0061

- US-Refs: US-0004-0044

```gherkin
Scenario: AC-0004-0061
  Given the story tree, and an EX that no rule names in its examples
  When `qfai validate --profile sdd` runs
  Then an error names the EX ID and the `03_Example.md` that defines it
  And A rule-refs entry naming a rule does not count as citing that rule's examples
```

## AC-0004-0062

- US-Refs: US-0004-0044

```gherkin
Scenario: AC-0004-0062
  Given the story tree, and a rule-refs entry naming a BR that no contract defines
  When `qfai validate --profile sdd` runs
  Then an error names the BR ID and the file that carries the reference
```

## AC-0004-0063

- US-Refs: US-0004-0045

```gherkin
Scenario: AC-0004-0063
  Given the story tree, and a BF that no file under the E2E layer (`<paths.testsDir>/e2e/**`) annotates with `QFAI:BF-NNNN`, and no `Test exception:` row in force naming it
  When `qfai validate --profile atdd` runs
  Then an error names the BF ID and the `business-flow.md` that defines it
  And An annotation of that BF in a file outside the E2E layer does not satisfy the obligation
```

## AC-0004-0064

- US-Refs: US-0004-0045

```gherkin
Scenario: AC-0004-0064
  Given the story tree, and an AC that no file under the integration or API layer (`<paths.testsDir>/integration/**`, `<paths.testsDir>/api/**`) annotates with `QFAI:AC-NNNN-NNNN-NN`, and no `Test exception:` row in force naming it
  When `qfai validate --profile atdd` runs
  Then an error names the AC ID and the `02_Acceptance-Criteria.md` that defines it
  And An annotation of that AC in a file outside those two layers does not satisfy the obligation
```

## AC-0004-0065

- US-Refs: US-0004-0045

```gherkin
Scenario: AC-0004-0065
  Given the story tree, and an EX that no file `validation.traceability.testFileGlobs` selects annotates with `QFAI:EX-NNNN-NNNN-NN`, and no `Test exception:` row in force naming it
  When `qfai validate --profile tdd` runs
  Then an error names the EX ID and the `03_Example.md` that defines it
```

## AC-0004-0066

- US-Refs: US-0004-0045

```gherkin
Scenario: AC-0004-0066
  Given the story tree, and a `QFAI:BF-NNNN` annotation in a file outside the E2E layer, or a `QFAI:AC-NNNN-NNNN-NN` annotation in a file outside the integration and API layers
  When `qfai validate --profile atdd` runs
  Then an error names the file and the annotation
```

## AC-0004-0067

- US-Refs: US-0004-0045

```gherkin
Scenario: AC-0004-0067
  Given the story tree, and a `QFAI:BF-NNNN`, `QFAI:AC-NNNN-NNNN-NN` or `QFAI:EX-NNNN-NNNN-NN` annotation naming an ID the tree does not define
  When `qfai validate --profile atdd` or `qfai validate --profile tdd` runs
  Then an error names the file and the ID
```

## AC-0004-0068

- US-Refs: US-0004-0045

```gherkin
Scenario: AC-0004-0068
  Given the story tree, and a `decisions.md` row opening `Test exception:` that names a BF, AC or EX which has no test at its layer
  When `qfai validate --profile atdd` or `qfai validate --profile tdd` runs
  Then while the row's Status is DONE, the named item raises no test-obligation error and is listed at info with the row's DEC ID; at any other Status the error stands
  And the row exempts only the obligation of the named ID's own shape: exempting a BF leaves the ACs of its stories owed, and exempting an AC leaves its EXs owed
  And a named ID the tree does not define exempts nothing, and the row raises no other finding
```

## AC-0004-0069

- US-Refs: US-0004-0046

```gherkin
Scenario: AC-0004-0069
  Given a project whose `paths.specsDir` holds a `spec-*/` or `_policies/` directory
  When `qfai validate` runs under any profile
  Then one error states, in one sentence, the path that holds the old layout and `/qfai-migration-spec-to-story`
  And no story-tree finding family reports anything in that run
```

## AC-0004-0071

- US-Refs: US-0004-0047

```gherkin
Scenario: AC-0004-0071
  Given a comment line in `packages/qfai/src/**/*.ts` carrying an ID of one of the seven story-tree shapes with a numeric segment outside the sample band (`0001` to `0009`, and `01` to `09` for the two-digit tail)
  When `pnpm ci:lint` runs
  Then it exits 1 naming the file and the line
  And The same comment with every numeric segment inside the sample band passes, and an old composite `DEC-NNNN-NNNN` or `OQ-NNNN-NNNN` ID is reported by its existing class only
```

## AC-0004-0072

- US-Refs: US-0004-0048

```gherkin
Scenario: AC-0004-0072
  Given the story tree, and `qfai validate --flow BF-NNNN` naming a flow the tree defines
  When the run completes
  Then it checks that flow, its stories, their ACs and EXs, and the rules that cite those EXs, and leaves out findings about any other flow
  And it writes its result to `validate.flow-<ids>.json` beside the configured `validate.json`, where `<ids>` names every flow in the scope, and leaves `validate.json` and `validate-<profile>.json` untouched
```

## AC-0004-0073

- US-Refs: US-0004-0048

```gherkin
Scenario: AC-0004-0073
  Given the story tree
  When `qfai validate --spec <spec-id>` runs
  Then it exits 2, and its message names `--flow BF-NNNN` as the option that scopes a run on the story tree
```

## AC-0004-0074

- US-Refs: US-0004-0048

```gherkin
Scenario: AC-0004-0074
  Given the story tree
  When `qfai validate --flow <value>` runs with a value that is not a `BF-NNNN` ID, or that names a flow the tree does not define
  Then an error finding names the value, and no `validate.flow-*.json` file is written
```

## AC-0004-0075

- US-Refs: US-0004-0043

```gherkin
Scenario: AC-0004-0075
  Given the story tree, and a merge base of `baseBranch` and HEAD that holds no `decisions.md` at the configured `paths.specsDir`
  When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
  Then neither the row-rewritten check nor the upstream-edit check reports anything
```
