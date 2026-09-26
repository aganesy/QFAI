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
- Given `<paths.contractsDir>/design/DESIGN.md.lock.yaml#sha256` records `abc123...` while the on-disk `DESIGN.md` sha256 is `def456...`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-031` at error severity with message `DESIGN.md hash drift: lock=abc123..., disk=def456...`

## EX-0004-0009

- BR-Ref: BR-0004-0010
- Given root `DESIGN.md` declares `--color-primary: #2563eb` while `<paths.contractsDir>/design/design-system.yaml#tokens.color.primary` is `#1d4ed8`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-032` at error severity with message `design-system.yaml mirror drift: category=color`

## EX-0004-0010

- BR-Ref: BR-0004-0011
- Given `iter-03/review.json` contains `{mode: "full-harness", fullHarness: {iterations: [...]}, allReviewerAxesPerfect100: false}` and lacks `pivotDirective`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-PROT-002` (schema-v3-violation) at error severity, listing missing required keys (`scores`, `proseCritique`, `pivotDirective`, `layoutAntiPatternsDetected`, `designMdViolations`)

## EX-0004-0011

- BR-Ref: BR-0004-0012
- Given `iter-05/review.json#layoutAntiPatternsDetected` contains `["lap-099-mystery-pattern"]`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-PROT-002` (lap-whitelist-violation) at error severity, citing `lap-099-mystery-pattern` as an identifier the registry does not declare

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
- With the `rule/ skill/ agent/ prompt/` assistant tree, the same `steering/` directory is named with the layers `rule`, `skill`, `agent` and `prompt`, and a `skill.local/` directory beside them raises no finding

## EX-0004-0014

- BR-Ref: BR-0004-0015
- Given `.qfai/steering/entry-001.md` with frontmatter `{id: "entry-001", kind: "unknown-kind"}` (invalid `kind`)
- When `qfai validate` runs
- Then `W-WORKLOG-SCHEMA` fires naming `entry-001.md` and the offending `kind` value

## EX-0004-0015

- BR-Ref: BR-0004-0016
- Given a work-log entry whose `links:` array names a non-existent spec, a non-existent discussion pack, and an unprefixed kebab-case entry ID that has no file (illustrative IDs are omitted to avoid ID-shape detection)
- When `qfai validate` runs against a repo without those resources
- Then `W-WORKLOG-BROKEN-LINK` fires once per unresolved link
- On the story tree, a `links:` array naming a `BF-NNNN` with no `business-flow-NNNN/` directory under `paths.specsDir` and a `DEC-NNNN` with no `decisions.md` row makes `W-WORKLOG-BROKEN-LINK` fire twice, once per unresolved link

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
- Given an entry with `promote-to: spec-NNNN/07_Decisions.md` whose declared target lacks a row citing the entry ID as a whole token
- When `qfai validate` runs
- Then `W-PENDING-PROMOTION` fires AND the validate report carries a "Pending Promotions" section listing the entry
- On the story tree, an entry with `promote-to: decisions.md` whose entry is not archived or whose `promoted-to` does not name the citing row's DEC ID makes `W-PENDING-PROMOTION` fire, and the same section lists the entry

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
- With the `rule/ skill/ agent/ prompt/` assistant tree, given the generated `.codex/agents/acceptance-test-engineer.toml` still carries `developer_instructions` from the old body while `.qfai/assistant/agent/acceptance-test-engineer.md` has changed from `## Mission` onward, the guard FAILS naming `acceptance-test-engineer`; it FAILS the same way when a TOML field generated from the card frontmatter differs from the card

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

## EX-0004-0032

- BR-Ref: BR-0004-0025
- Given a working tree where `qfai validate --profile prototyping` ran first and `qfai validate --profile default` ran second
- When the report directory `.qfai/report/` is listed
- Then both `validate-prototyping.json` and `validate-default.json` exist with independent contents; `validate.json` exists with top-level `{"profile": "default", ...}` reflecting only the second (most recent) run

## EX-0004-0033

- BR-Ref: BR-0004-0026
- Given a downstream consumer that still points at the legacy `.qfai/output/validate.json` path on `qfai@1.9.x`
- When `qfai validate` runs
- Then the legacy path is written AND `D-DEPRECATED-PATH` warning fires with body literally containing `sunset: 1.10.0`
- And in `qfai@1.10.0+`, the same condition exits with error severity and the legacy path is no longer written

## EX-0004-0034

- BR-Ref: BR-0004-0027
- Given a PR that edits `packages/qfai/src/core/validators/findDesignMdViolations.ts` to add a new Tailwind preflight literal exemption but does NOT touch `packages/qfai/assets/init/.claude/skills/qfai-prototyping/references/generator-prompt.md`
- When the SSOT-sync-pair `pnpm ci:lint` lane runs
- Then the lane FAILS emitting `R-PROMPT-SCANNER-DRIFT` (severity error) naming both the modified scanner path and the un-paired prompt path

## EX-0004-0035

- BR-Ref: BR-0004-0027
- Given a PR that touches neither `findDesignMdViolations.ts` nor `generator-prompt.md` (e.g. README typo fix)
- When the SSOT-sync-pair lane runs
- Then the lane passes silently with no `R-PROMPT-SCANNER-DRIFT` emission and no exit-code regression

## EX-0004-0036

- BR-Ref: BR-0004-0028
- Given a Reviewer-Gate report JSON containing `{"code": "R-PROMPT-SCANNER-DRIFT", "justification": "   "}` (whitespace-only)
- When `qfai validate` ingests it
- Then validate exits with severity error (advisory-failing); a corrected justification naming (a) `findDesignMdViolations.ts`, (b) `generator-prompt.md`, and (c) the Tailwind preflight clause whose match could not be confirmed passes

## EX-0004-0037

- BR-Ref: BR-0004-0029
- Given a `certify` invocation that reads `.qfai/report/validate.json` whose top-level `profile` field is `"default"` but the certify gate expects `profile: "prototyping"`
- When `certify` performs the read,
- Then certify aborts the read, surfaces the mismatch with both the observed and expected profile names, and emits the recovery command `qfai validate --profile prototyping --fail-on error` so the operator can re-emit the correct profile-suffixed artifact
- And in `qfai@1.10.0+`, a downstream consumer still reading the legacy `.qfai/output/validate.json` path receives an `error`-severity `D-DEPRECATED-PATH` finding instead of the deprecation-window warning

## EX-0004-0038

- BR-Ref: BR-0004-0030
- Given a SaaS-tenant repo whose prototyping-profile validate PASSes, with `<paths.contractsDir>/design/design-system.yaml` present (DCON-005) and a conforming CLI-HANDOFF handoff
- When `qfai validate --profile saas-package` runs
- Then validate PASSes and emits two `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) findings: one naming the skipped ATDD-class gate and one naming the skipped implement-class gate
- And given the same repo with `<paths.contractsDir>/design/design-system.yaml` removed, `qfai validate --profile saas-package` does NOT PASS

## EX-0004-0039

- BR-Ref: BR-0004-0031
- Given a UI contract with `primary_tasks: ["View orders", "Refund an order"]` (string-only) and a sibling contract with `primary_tasks: [{ id: "view-orders", label: "View orders", acceptance: "orders table renders within budget" }]` (structured)
- When `auditProfile.ts` evaluates both
- Then both PASS (string-only during the deprecation window; structured `{id,label,acceptance}` closed shape per DR-0268), and a `QFAI-AUD-020` warning naming the `3..7` recommended count band (DR-0267) fires on a screen declaring 9 tasks

## EX-0004-0040

- BR-Ref: BR-0004-0032
- Given a PR that adds `review-2026-05-27/` at the repository root (outside the allowed roots)
- When `check-pack-locations.mjs` runs in `pnpm ci:lint`
- Then the lane FAILS emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes `.qfai/review/2026-05-27/` as the correct path

## EX-0004-0041

- BR-Ref: BR-0004-0033
- Given a PR that adds `.qfai/discussion/discussion-20260527075558258/` (under an allowed root) and edits an unrelated README
- When `check-pack-locations.mjs` runs
- Then the lane passes silently with no `R-PACK-LOCATION-DRIFT`, and a pre-existing legacy `review-old/` directory untouched by the PR is not re-flagged

## EX-0004-0046

- BR-Ref: BR-0004-0043
- Given `paths.specsDir` holds `decisions.md`, `open-questions.md`, `01_policy/` and `02_business-flow/`, and no `spec-*/` or `_policies/` directory
- When `qfai validate --profile sdd` runs
- Then the story-tree finding families run on the tree, and no spec-pack validator reports a finding about it
- And given the same directory also holds a `spec-*/` directory, the tree is read as the spec-pack layout and no story-tree finding family runs

## EX-0004-0047

- BR-Ref: BR-0004-0044
- Given on the story tree a `user-story-NNNN-NNNN/` directory holding `01_User-story.md`, `02_Acceptance-Criteria.md`, `notes.md` and a `drafts/` subdirectory
- When `qfai validate --profile sdd` runs
- Then an error names the directory, the missing `03_Example.md`, and the extra `notes.md` and `drafts/`
- And a story directory holding exactly the three files raises no such error

## EX-0004-0048

- BR-Ref: BR-0004-0045
- Given on the story tree an AC defined with a three-digit tail after its story ID, in the shape `AC-NNNN-NNNN-NNN`
- When `qfai validate --profile sdd` runs
- Then an error names the malformed ID and the `02_Acceptance-Criteria.md` that defines it
- And an ID of each of the seven shapes written correctly raises no such error

## EX-0004-0049

- BR-Ref: BR-0004-0046
- Given on the story tree one `US-NNNN-NNNN` ID that is the H1 of the `01_User-story.md` in two story directories
- When `qfai validate --profile sdd` runs
- Then one error names the ID and both files

## EX-0004-0050

- BR-Ref: BR-0004-0047
- Given on the story tree a story whose ID starts with the number of a flow other than the `business-flow-NNNN/` it sits in, and a `user-story-NNNN-NNNN/` directory whose name carries a number other than its story's ID
- When `qfai validate --profile sdd` runs
- Then an error names each of the two IDs and the file that defines it
- And a story whose ID, AC IDs, EX IDs and directory names all agree raises no such error

## EX-0004-0051

- BR-Ref: BR-0004-0048
- Given on the story tree `<paths.contractsDir>/api/orders.yaml`, which declares a `CON-API-*` ID, `<paths.contractsDir>/cli/new-command.md`, which declares none, and a `contracts.md` that lists neither
- When `qfai validate --profile sdd` runs
- Then `QFAI-CONTRACT-034` is raised twice at error: once keyed by the `CON-API-*` ID, and once keyed by the path of `cli/new-command.md`
- And once `contracts.md` lists both files, neither finding is raised

## EX-0004-0052

- BR-Ref: BR-0004-0049
- Given on the story tree `<paths.contractsDir>/tech.md` whose Standard commands section still holds the shipped placeholder, and `<paths.contractsDir>/structure.md` filled in while the catalog copy of `structure.md` still holds its placeholder
- When `qfai validate` runs with a profile that runs `QFAI-ASSETS-*`
- Then `QFAI-ASSETS-003` names `<paths.contractsDir>/tech.md` and its Standard commands section, and raises nothing about either catalog copy

## EX-0004-0053

- BR-Ref: BR-0004-0050
- Given on the story tree a `decisions.md` table with the columns ID, Content, Approach, Status and Date, and an `open-questions.md` table with the columns ID, Content and Status
- When `qfai validate --profile sdd` runs
- Then one error names `decisions.md` and the column `Date`, and one names `open-questions.md` and the missing column `Approach`

## EX-0004-0054

- BR-Ref: BR-0004-0051
- Given on the story tree a `decisions.md` row at Status `SUPERSEDED by DEC-NNNN`, written without the parentheses, and an `open-questions.md` row at Status REJECTED
- When `qfai validate --profile sdd` runs
- Then one error names `decisions.md` and the first row's ID, and one names `open-questions.md` and the second row's ID
- And a `decisions.md` row at `SUPERSEDED (by DEC-NNNN)` naming a DEC row that does not exist raises no such error

## EX-0004-0055

- BR-Ref: BR-0004-0052
- Given on the story tree a `decisions.md` row whose ID has the `OQ-NNNN` shape
- When `qfai validate --profile sdd` runs
- Then an error names `decisions.md` and the row ID

## EX-0004-0056

- BR-Ref: BR-0004-0053
- Given on the story tree a `decisions.md` row whose Content is `Test exception: EX-NNNN-NNNN-NN, AC-NNNN-NNNN-NN` at Status DONE, and a row whose Content is `Change request: 01_policy/glossary.md` at Status TODO
- When the validators that read those keywords run
- Then the first row is read as in force, with the two IDs as its references
- And the second row is read as not in force, with `01_policy/glossary.md` as its reference

## EX-0004-0057

- BR-Ref: BR-0004-0054
- Given on the story tree an `open-questions.md` row whose Content opens `Unadjudicated:` at Status WIP
- When `qfai validate --profile sdd` runs
- Then `QFAI-SPACK-102` is raised at error naming `open-questions.md` and the row ID
- And the same row at DONE raises no such finding

## EX-0004-0058

- BR-Ref: BR-0004-0055
- Given on the story tree a base `qfai validate` can resolve, and a `decisions.md` row that the base holds
- When the row is removed on the branch and `qfai validate --profile drift` runs
- Then an error names `decisions.md` and the removed row's ID

## EX-0004-0059

- BR-Ref: BR-0004-0055
- Given on the story tree the same base, a `decisions.md` row whose Content cell changes on the branch, and an `open-questions.md` row whose Status alone moves from TODO to DONE
- When `qfai validate --profile drift` runs
- Then one error names `decisions.md`, the first row's ID and the Content cell, and the Status change raises no error

## EX-0004-0060

- BR-Ref: BR-0004-0056
- Given on the story tree a `qfai.config.yaml` whose `baseBranch` names a ref the repository does not have, and a working tree in which a `decisions.md` row is removed and a file under `01_policy/` has changed
- When `qfai validate --profile drift` runs
- Then neither the row-rewritten check nor the upstream-edit check reports anything
- And the same holds for a project directory that is not a git repository

## EX-0004-0061

- BR-Ref: BR-0004-0057, BR-0004-0058
- Given on the story tree a change since the base to `01_policy/glossary.md` under `paths.specsDir` and to `<paths.contractsDir>/tech.md`, and no `decisions.md` row opening `Change request:` that names either
- When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
- Then one error names each of the two paths
- And a change to a file outside the protected set, such as a test file, raises no such error

## EX-0004-0062

- BR-Ref: BR-0004-0058
- Given on the story tree a change since the base to `01_policy/glossary.md` and to `02_business-flow/business-flows.md`, a base `decisions.md` row `Change request: 01_policy/glossary.md` at Status WIP, and a base row `Change request: 02_business-flow/business-flows.md` at Status TODO
- When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
- Then no error is raised for `01_policy/glossary.md`, and an error names `02_business-flow/business-flows.md`

## EX-0004-0063

- BR-Ref: BR-0004-0059
- Given on the story tree a change since the base whose only edit to `decisions.md` appends a row opening `Change request:` at Status TODO
- When `qfai validate --profile drift` runs
- Then no upstream-edit error is raised for `decisions.md`

## EX-0004-0064

- BR-Ref: BR-0004-0060
- Given on the story tree one EX row whose `AC-Ref` cell is empty, and one whose cell names two ACs of its story
- When `qfai validate --profile sdd` runs
- Then an error names each of the two EX IDs and the `03_Example.md` that defines it
- And an EX row naming exactly one AC of its own story raises no such error

## EX-0004-0065

- BR-Ref: BR-0004-0060
- Given on the story tree one EX row whose `AC-Ref` names an `AC-NNNN-NNNN-NN` ID no story defines, and one whose `AC-Ref` names an AC of another story
- When `qfai validate --profile sdd` runs
- Then an error names each of the two EX IDs and the `03_Example.md` that defines it

## EX-0004-0066

- BR-Ref: BR-0004-0061
- Given on the story tree a story with two ACs, only one of which an EX names in its `AC-Ref` cell
- When `qfai validate --profile sdd` runs
- Then one error names the other AC's ID and the `02_Acceptance-Criteria.md` that defines it

## EX-0004-0067

- BR-Ref: BR-0004-0062
- Given on the story tree a YAML contract with an `x-qfai-rules:` entry, a SQL contract with a `-- Rule BR-NNNN:` line followed by an `-- Examples:` line, and a Markdown contract with a `## Rules` table, each rule naming EXs the tree defines, and a JSON contract whose `x-qfai-rule-refs:` names the YAML rule
- When `qfai validate --profile sdd` runs
- Then each of the three rules is read with its ID, its statement and its examples, and no BR-to-EX error is raised
- And the rule-refs entry is read as a reference to the YAML rule, not as a fourth rule

## EX-0004-0068

- BR-Ref: BR-0004-0063
- Given on the story tree a YAML rule whose `examples` list is empty, and a SQL `-- Rule BR-NNNN:` line with no `-- Examples:` line after it
- When `qfai validate --profile sdd` runs
- Then an error names each of the two BR IDs and its contract file

## EX-0004-0069

- BR-Ref: BR-0004-0063
- Given on the story tree a Markdown `## Rules` row whose Examples cell names an `EX-NNNN-NNNN-NN` ID the tree does not define
- When `qfai validate --profile sdd` runs
- Then an error names the BR ID and that contract file

## EX-0004-0070

- BR-Ref: BR-0004-0064
- Given on the story tree an EX that no rule names in its examples
- When `qfai validate --profile sdd` runs
- Then an error names the EX ID and the `03_Example.md` that defines it
- And once a rule names the EX in its examples, no such error is raised

## EX-0004-0071

- BR-Ref: BR-0004-0065
- Given on the story tree a SQL contract whose `-- Rule refs:` line names a `BR-NNNN` that no contract defines
- When `qfai validate --profile sdd` runs
- Then an error names that BR ID and the SQL contract file

## EX-0004-0072

- BR-Ref: BR-0004-0066, BR-0004-0067
- Given on the story tree a BF that only a test under `<paths.testsDir>/integration/` annotates with `QFAI:BF-NNNN`, and no `Test exception:` row in force naming it
- When `qfai validate --profile atdd` runs
- Then an error names the BF ID and the `business-flow.md` that defines it
- And once a test under `<paths.testsDir>/e2e/` carries the annotation, that error is not raised

## EX-0004-0073

- BR-Ref: BR-0004-0066, BR-0004-0068
- Given on the story tree one AC that only a test under `<paths.testsDir>/e2e/` annotates with `QFAI:AC-NNNN-NNNN-NN`, a second AC annotated by a test under `<paths.testsDir>/api/`, and no `Test exception:` row in force
- When `qfai validate --profile atdd` runs
- Then an error names the first AC's ID and the `02_Acceptance-Criteria.md` that defines it, and the second AC raises no test-obligation error

## EX-0004-0074

- BR-Ref: BR-0004-0069
- Given on the story tree an EX that no file `validation.traceability.testFileGlobs` selects annotates with `QFAI:EX-NNNN-NNNN-NN`, and a second EX annotated by a unit test those globs select
- When `qfai validate --profile tdd` runs
- Then an error names the first EX's ID and the `03_Example.md` that defines it, and the second EX raises none

## EX-0004-0075

- BR-Ref: BR-0004-0070
- Given on the story tree a `QFAI:BF-NNNN` annotation in a test under `<paths.testsDir>/integration/`, and a `QFAI:AC-NNNN-NNNN-NN` annotation in a unit test outside `<paths.testsDir>/integration/` and `<paths.testsDir>/api/`
- When `qfai validate --profile atdd` runs
- Then an error names each of the two files and its annotation

## EX-0004-0076

- BR-Ref: BR-0004-0071
- Given on the story tree a test under `<paths.testsDir>/e2e/` annotated `QFAI:BF-NNNN` with a flow number the tree does not define, and a unit test annotated `QFAI:EX-NNNN-NNNN-NN` with an ID no story defines
- When `qfai validate --profile atdd` runs, and again with `--profile tdd`
- Then each run raises an error naming each of the two files and its ID

## EX-0004-0077

- BR-Ref: BR-0004-0072
- Given on the story tree a BF with no E2E test, whose story holds an AC with no integration or API test, and a `decisions.md` row whose Content is `Test exception: BF-NNNN` naming that BF, with the reason in Approach
- When `qfai validate --profile atdd` runs while the row's Status is DONE
- Then the BF raises no test-obligation error, and the AC of its story still raises one
- And with the row at WIP, the BF's error stands

## EX-0004-0078

- BR-Ref: BR-0004-0073
- Given on the story tree two EXs with no test, and a `decisions.md` row at Status DONE whose Content is `Test exception:` followed by the first EX's ID and by an `EX-NNNN-NNNN-NN` ID the tree does not define, a misspelling of the second EX's ID
- When `qfai validate --profile tdd` runs
- Then the first EX is listed at info, naming its ID and the row's DEC ID, and raises no test-obligation error
- And the second EX's test-obligation error stays, and the misspelled ID raises no other finding

## EX-0004-0079

- BR-Ref: BR-0004-0074, BR-0004-0075
- Given `paths.specsDir` holds a `spec-*/` directory beside story-tree files, one of whose story directories lacks `03_Example.md`
- When `qfai validate` runs under each of the profiles `sdd`, `atdd`, `tdd`, `full` and `drift`
- Then each run raises one error whose single sentence names the path that holds the old layout and `/qfai-migration-spec-to-story`
- And no run reports the missing `03_Example.md` or any other story-tree finding

## EX-0004-0081

- BR-Ref: BR-0004-0077
- Given a comment line in a file under the package's `src/` carrying a `BF-` ID whose four-digit number is `0010`, one above the sample band, and a comment line carrying an `AC-` ID whose four-digit segments are `0001` and whose two-digit tail is `10`
- When the `src-comment` rule of `lint-shipping.ts` runs over the package, as `pnpm ci:lint` runs it
- Then it reports the file and each of the two lines, so `pnpm ci:lint` exits 1

## EX-0004-0082

- BR-Ref: BR-0004-0077
- Given comment lines in a file under the package's `src/` carrying a `US-` ID whose segments are `0001` and `0002`, an `EX-` ID whose segments are `0001`, `0001` and `09`, and an old composite decision ID whose segments are `0001` and `0042`
- When the `src-comment` rule of `lint-shipping.ts` runs over the package, as `pnpm ci:lint` runs it
- Then the two story-tree IDs raise nothing, and the old composite ID is reported once, by its existing class, and not again by a story-tree pattern

## EX-0004-0083

- BR-Ref: BR-0004-0078
- Given the story tree with two business flows, each with a story directory lacking `03_Example.md`, and a `validate.json` from an earlier run
- When `qfai validate --flow BF-NNNN` runs naming the first flow
- Then the result reports the first flow's missing file and not the second's, and is written to `validate.flow-<ids>.json` beside `validate.json`, with `<ids>` naming the first flow
- And `validate.json` and `validate-<profile>.json` are left as they were

## EX-0004-0084

- BR-Ref: BR-0004-0079
- Given the story tree
- When `qfai validate --spec <spec-id>` runs
- Then it exits 2, and its message names `--flow BF-NNNN` as the option that scopes a run

## EX-0004-0085

- BR-Ref: BR-0004-0080
- Given the story tree with one business flow
- When `qfai validate --flow` runs with the value `flow-1`, and again with a `BF-NNNN` ID the tree does not define
- Then each run raises an error finding naming the value, and no `validate.flow-*.json` file is written

## EX-0004-0086

- BR-Ref: BR-0004-0059
- Given on the story tree a change since the base whose only edit to `decisions.md` appends a row opening `Change request:` at Status WIP
- When `qfai validate --profile drift` runs
- Then no upstream-edit error is raised for `decisions.md`

## EX-0004-0087

- BR-Ref: BR-0004-0059
- Given on the story tree a change since the base whose only edit to `decisions.md` moves the Status of a base row opening `Change request:` from TODO to WIP
- When `qfai validate --profile drift` runs
- Then no upstream-edit error is raised for `decisions.md`

## EX-0004-0088

- BR-Ref: BR-0004-0058
- Given on the story tree a change since the base to `<paths.contractsDir>/tech.md`, and no `decisions.md` row opening `Change request:` that names it
- When `qfai validate --profile tdd` runs
- Then an error names `<paths.contractsDir>/tech.md` as an upstream edit without a change request, the same error the `drift` profile raises for that change

## EX-0004-0089

- BR-Ref: BR-0004-0081
- Given a merge base without `<paths.specsDir>/decisions.md`, and a HEAD that adds `decisions.md` with a row that is not a change-request row, `01_policy/glossary.md` and a file under `paths.contractsDir`
- When `qfai validate --profile tdd` and `qfai validate --profile drift` run
- Then neither drift check reports anything
- And once a commit holding that tree is the base, a further change to `01_policy/glossary.md` with no change-request row raises one upstream-edit error

## EX-0004-0090

- BR-Ref: BR-0004-0013
- Given matching iteration and review payloads whose `designMdViolations` item contains `kind: color`, a string `found`, and the same extra field
- When `qfai validate --fail-on error` runs
- Then the extra field alone does not raise `QFAI-PROT-002`
- And a missing `kind`, a missing `found`, or a `kind` outside the four allowed values raises `QFAI-PROT-002`
