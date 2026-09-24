# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0044-01
# Parent: US-0001-0044
Scenario: AC-0001-0044-01
  Given a work-log entry file at `.qfai/steering/<name>.md` whose YAML frontmatter omits a required field, uses a wrong enum value for `kind`/`status`, or carries a malformed `created`/`updated` timestamp
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` is emitted at warning severity (non-blocking) naming the file and the offending field; valid entries do not trigger it

# AC-0001-0044-02
# Parent: US-0001-0044
Scenario: AC-0001-0044-02
  Given a work-log entry whose `links:` array names a missing spec, discussion pack, and kebab-case entry ID without requiring an `entry-` prefix
  When `qfai validate` runs
  Then `W-WORKLOG-BROKEN-LINK` is emitted at warning severity for each unresolved reference, naming the entry file and the unresolved token
  And On the story tree, a `BF-NNNN` element with no `business-flow-NNNN/` directory under `paths.specsDir`, and a `DEC-NNNN` element with no row in `decisions.md`, are unresolved references and raise the same finding

# AC-0001-0044-03
# Parent: US-0001-0044
Scenario: AC-0001-0044-03
  Given the `agent-catalog.yml` entry for any agent declares a `developer_instructions` field that diverges from the canonical `.qfai/assistant/agents/<name>.md` body (from `## Mission` onward, line-ending normalized)
  When the SSOT-guard test (`tests/codex/agents.test.ts` ssot-guard test) runs
  Then the test FAILS naming the diverging agent id so the 3-way SSOT (canonical MD ↔ codex TOML ↔ `agent-catalog.yml`) cannot silently drift

Scenario: AC-0001-0044-03 on the rule/ skill/ agent/ prompt/ assistant tree
  Given `agent-catalog.yml` and its `developer_instructions` no longer exist, and the guard compares the agent card at `.qfai/assistant/agent/<name>.md` with the generated `.codex/agents/<name>.toml`
  And the TOML differs from the card in a field generated from its frontmatter or in `developer_instructions` against the card body from `## Mission` onward (line-ending normalized)
  When the two-way guard runs
  Then it FAILS naming the agent id, whichever side changed

# AC-0001-0044-04
# Parent: US-0001-0044
Scenario: AC-0001-0044-04
  Given a `.qfai/steering/<id>.md` entry whose `created` or `updated` field value either (a) does not match the surface regex `^\d{4}-\d{2}-\d{2}$` OR (b) matches the regex but is not a valid calendar date (e.g. `2026-02-30`, `2026-13-01`)
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` is emitted at warning severity per non-conformant field (rule: `worklogSurface.schema.createdFormat` / `updatedFormat`) — both branches are handled by `isValidCalendarDate()` round-trip detection so neither bad-syntax nor calendar-rollover dates can silently flow through schema validation

# AC-0001-0044-05
# Parent: US-0001-0044
Scenario: AC-0001-0044-05
  Given a `.qfai/steering/<id>.md` entry whose `updated` ISO-8601 date is strictly earlier than its `created` ISO-8601 date
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.updatedOrder`) is emitted at warning severity naming both dates, enforcing the worklog contract's `updated >= created` invariant

# AC-0001-0044-06
# Parent: US-0001-0044
Scenario: AC-0001-0044-06
  Given a `.qfai/steering/<id>.md` entry whose `links` array contains one or more non-string elements (e.g. `links: [123, true]`)
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.linksElementType`) is emitted per non-string element so malformed link items cannot bypass schema and broken-link checks

# AC-0001-0044-07
# Parent: US-0001-0044
Scenario: AC-0001-0044-07
  Given a `.qfai/steering/<id>.md` entry whose frontmatter `id` value does not match kebab-case ASCII (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
  When `qfai validate` runs
  Then `W-WORKLOG-SCHEMA` (rule: `worklogSurface.schema.idFormat`) is emitted at warning severity naming the offending id, enforcing the worklog-entry.schema.md Storage-model requirement that `<id>` is kebab-case ASCII
```
