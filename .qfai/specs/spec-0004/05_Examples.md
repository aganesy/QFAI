# 05 Examples

## EX-0004-0001

- BR-Ref: BR-0004-0003
- Given a screen contract declares `orders-dashboard`
- And screenshot evidence is missing
- Then validate emits `QFAI-UIE-001`

## EX-0004-0002

- BR-Ref: BR-0004-0004
- Given a screen contract declares `orders-dashboard`
- And HTML evidence is missing
- Then validate emits `QFAI-UIE-002`

## EX-0004-0003

- BR-Ref: BR-0004-0005
- Given no screen contract exists
- Then `validateUiEvidenceArtifacts` returns no issue

## EX-0004-0004

- BR-Ref: BR-0004-0001, BR-0004-0002
- Given `qfai validate` runs on a repo with canonical validators enabled
- Then deterministic validator findings are aggregated through the canonical validate path

## EX-0004-0005

- BR-Ref: BR-0004-0006
- Given the prototyping skill contains stale runtime or CLI wording
- Then the skill validator emits a finding instead of silently accepting the drift

## EX-0004-0006

- BR-Ref: BR-0004-0007
- Given a legacy design-system validator slice is still wired in code
- When its prerequisite artifact exists
- Then validate may emit the scoped legacy finding without restoring a removed runtime contract

## EX-0004-0007

- BR-Ref: BR-0004-0008
- Given root `DESIGN.md` does not exist in the consuming project root
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-030` at error severity with message `DESIGN.md not found at <repo-root>/DESIGN.md`

## EX-0004-0008

- BR-Ref: BR-0004-0009
- Given `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256` records `abc123...` while the on-disk `DESIGN.md` sha256 is `def456...`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-031` at error severity with message `DESIGN.md hash drift: lock=abc123..., disk=def456...`

## EX-0004-0009

- BR-Ref: BR-0004-0010
- Given root `DESIGN.md` declares `--color-primary: #2563eb` while `.qfai/contracts/design/design-system.yaml#tokens.color.primary` is `#1d4ed8`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-032` at error severity with message `design-system.yaml mirror drift: category=color`

## EX-0004-0010

- BR-Ref: BR-0004-0011
- Given `iter-03/review.json` contains `{mode: "full-harness", fullHarness: {iterations: [...]}, allReviewerAxesPerfect100: false}` and lacks `pivotDirective`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-PROT-002` (schema-v3-violation) at error severity, listing missing required keys (`scores`, `prose`, `pivotDirective`, `layoutAntiPatternsDetected`, `designMdViolations`)

## EX-0004-0011

- BR-Ref: BR-0004-0012
- Given `iter-05/review.json#layoutAntiPatternsDetected` contains `["lap-099-mystery-pattern"]`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-PROT-002` (lap-whitelist-violation) at error severity, citing `lap-099-mystery-pattern` as not in `{lap-001..008}`

## EX-0004-0012

- BR-Ref: BR-0004-0013
- Given `findDesignMdViolations(html, designMd)` is invoked twice with identical inputs across separate test runs
- When the outputs are compared
- Then both arrays are deeply equal and order-stable; static analysis confirms no `fs` / `process` / `Date.now` / network reference inside the call graph

## EX-0004-0013

- BR-Ref: BR-0004-0014
- Given a project with `.qfai/assistant/steering/` (legacy single layer) still on disk
- When `qfai validate` runs in v1.9.x
- Then a warning surface fires naming the offending dir + the canonical 4-layer enum

## EX-0004-0014

- BR-Ref: BR-0004-0015
- Given `.qfai/steering/entry-001.md` with frontmatter `{id: "entry-001", kind: "unknown-kind"}` (invalid `kind`)
- When `qfai validate` runs
- Then `W-WORKLOG-SCHEMA` fires naming `entry-001.md` and the offending `kind` value

## EX-0004-0015

- BR-Ref: BR-0004-0016
- Given a work-log entry whose `links:` array contains 2 entries that point at a non-existent spec id (4-digit numeric like `9999`) and a non-existent discussion timestamp (illustrative ids — actual numerals omitted to avoid validator id-shape detection in this example)
- When `qfai validate` runs against a repo without those resources
- Then `W-WORKLOG-BROKEN-LINK` fires twice (once per unresolved link)

## EX-0004-0016

- BR-Ref: BR-0004-0017
- Given a reviewer report JSON containing `{"code": "R-WORKLOG-DRIFT", "justification": ""}`
- When `qfai validate` ingests it
- Then validate exits with error severity (advisory-failing)

## EX-0004-0017

- BR-Ref: BR-0004-0018
- Given `.qfai/steering/handoff-001.md` with `kind: handoff` and body containing only `## State` and `## Next action` (missing Constraints/OQs/References)
- When `qfai validate` runs
- Then `R-HANDOFF-INCOMPLETE` fires naming the 3 missing sections

## EX-0004-0018

- BR-Ref: BR-0004-0019
- Given an entry with `promote-to: 07_Decisions.md` AND `07_Decisions.md` lacks a row referencing the entry
- When `qfai validate` runs
- Then `W-PENDING-PROMOTION` fires AND the validate report carries a "Pending Promotions" section listing the entry

## EX-0004-0019

- BR-Ref: BR-0004-0020
- Given an entry with `status: active` and `updated: 2025-12-01T00:00:00Z` evaluated on `2026-05-23`
- When `qfai validate` runs (now − updated = 173 days > 90)
- Then `W-WORKLOG-STALE` fires naming the entry and age "173d"

## EX-0004-0020

- BR-Ref: BR-0004-0021
- Given a project carrying legacy layout in v1.9.x
- When `qfai validate` runs
- Then `D-DEPRECATED-PATH` warning body matches `/sunset: v1\.10\.0/`; ambiguous phrasing like "future release" is absent

## EX-0004-0021

- BR-Ref: BR-0004-0022
- Given `qfai-implement/SKILL.md` without a trailing `project_memory:` YAML block
- When `qfai validate` runs
- Then an error fires naming `qfai-implement` and the missing block

## EX-0004-0022

- BR-Ref: BR-0004-0023
- Given a SKILL.md body containing `.qfai/assistant/steering/agent-routing.yml` (a non-canonical path)
- When `qfai validate` runs in v1.9.x
- Then `W-SKILL-DOC-BROKEN-REF` fires naming the SKILL.md and the broken path

## EX-0004-0023

- BR-Ref: BR-0004-0024
- Given a validate run on a freshly-upgraded project where `qfai init --upgrade-assistant-tree` emitted `W-USER-EDIT-PRESERVED` notes
- When `qfai validate` runs immediately afterwards
- Then validate exits 0; `counts.info >= 1`; the report has an "Informational" section listing the preserved files

<!-- EX-0004-0024..0025 reserved (NNNN gap; the next live row is EX-0004-0026, the ssot-guard worked example which pairs with AC-0004-0026). -->

## EX-0004-0026

- BR-Ref: BR-0004-0015 (frontmatter schema; meta-validation of the SSOT pipeline)
- Given the `agent-catalog.yml` row for `acceptance-test-engineer` carries `developer_instructions: "## Mission\n- old body"` while the canonical `.qfai/assistant/agents/acceptance-test-engineer.md` body has changed to `"## Mission\n- new body"`
- When the SSOT-guard test in `packages/qfai/tests/codex/agents.test.ts` runs
- Then the test FAILS with `agent-catalog.yml developer_instructions diverges from canonical MD` so the 3-way SSOT cannot drift

## EX-0004-0027

- BR-Ref: BR-0004-0015 (frontmatter schema)
- Given a `.qfai/steering/foo.md` entry with `created: 2026/05/23` and `updated: May 23 2026` (both non-ISO-8601)
- When `qfai validate` runs
- Then `worklogSurface.schema.createdFormat` AND `worklogSurface.schema.updatedFormat` fire as separate `W-WORKLOG-SCHEMA` warnings

## EX-0004-0028

- BR-Ref: BR-0004-0015 (frontmatter schema)
- Given an entry with `created: 2026-05-23` and `updated: 2026-05-22` (reversed order, both valid ISO-8601)
- When `qfai validate` runs
- Then `worklogSurface.schema.updatedOrder` fires naming both dates; the validator does NOT also report a format warning since dates are syntactically valid

## EX-0004-0029

- BR-Ref: BR-0004-0015 (frontmatter schema)
- Given an entry whose `links` YAML is a mixed-type list: `- 123` (numeric), `- true` (boolean)
- When `qfai validate` runs
- Then 2 separate `worklogSurface.schema.linksElementType` warnings fire (one per non-string element); broken-link integrity check is skipped for those elements

## EX-0004-0030

- BR-Ref: BR-0004-0015 (frontmatter schema)
- Given a `.qfai/steering/foo.md` entry with `id: Foo Bar` (uppercase + space; not kebab-case ASCII)
- When `qfai validate` runs
- Then `worklogSurface.schema.idFormat` fires as a `W-WORKLOG-SCHEMA` warning naming the bad id; date-style kebab ids like `2026-05-22-recut-design-call` still pass since they match the contract regex

## EX-0004-0031

- BR-Ref: BR-0004-0015 (frontmatter schema)
- Given a `.qfai/steering/foo.md` entry with `created: 2026-02-30` (syntactically valid `YYYY-MM-DD` but non-existent — Feb has 28 days in 2026)
- When `qfai validate` runs
- Then `worklogSurface.schema.createdFormat` fires; message contains "calendar date" so reviewers can distinguish syntax errors from calendar-validity errors. Internally enforced via `setUTCFullYear()` round-trip in `isValidCalendarDate()`.
