# 05 Examples

## EX-0013-0001: Contract-First Then Slice

- BR-Ref: BR-0013-0001
- Given a discussion pack with API and DB requirements
- When SDD runs
- Then contracts are created in `.qfai/contracts/(api|db)/` before `spec-XXXX/02_User-stories.md`

## EX-0013-0002: Upper-to-Lower Reference Detected

- BR-Ref: BR-0013-0002
- Given `_policies/01_Objective.md` referencing `対象 spec/02_User-stories.md:US-0001-0001`
- When reference direction is checked
- Then error: upper-to-lower reference detected

## EX-0013-0003: Incomplete Pack Continues; No Usable Source Stops

- BR-Ref: BR-0013-0003
- Given a discussion pack missing `06_REQ.md`, and specs that already exist
- When SDD preflight runs
- Then SDD continues, recording the gap as a reference-quality fact
- Given no discussion pack, no import-lite input, and no explicit user requirement
- When SDD preflight runs
- Then SDD stops and guides to `/qfai-discussion`

## EX-0013-0004: Delta Rejected with Guardrails

- BR-Ref: BR-0013-0006
- Given a rejected option "inline SQL queries"
- When delta is updated
- Then entry includes: DO NOT use inline SQL queries, Temptation: quick prototyping without ORM

## EX-0013-0005: Batch Mode All Capabilities

- BR-Ref: BR-0013-0007
- Given 3 capabilities in `_policies/03_Capabilities.md`
- When `/qfai-sdd` runs without arguments
- Then 対象 spec, 対象 spec, 対象 spec are processed in parallel (slice/plan/delta per spec)

## EX-0013-0006: Plan Finalized After A Slice Is Grounded

- BR-Ref: BR-0013-0004
- Given a target spec whose user stories have not been sliced yet
- When `/qfai-sdd` reaches Phase 3
- Then Plan finalize waits for at least one slice gate to pass, and the plan is
  written to `spec-XXXX/10_Plan.md` rather than to a `specs/plan.md`

## EX-0013-0007: Contract Stub Is Parseable Or Declared `none`

- BR-Ref: BR-0013-0005
- Given a slice that touches an API, a UI or a database contract
- When the slice writes its contract stub
- Then the stub parses as OpenAPI YAML, UI YAML or an executable SQL skeleton;
  `none` stands only where the slice has no contract impact and says why

## EX-0013-0008: Test Case Table with Type Column

- BR-Ref: BR-0013-0008
- Given AC-0013-0010 with both normal and error scenarios
- When 06_Test-Cases.md is generated
- Then each AC has at least one test case with Type=normal and one with Type=error

## EX-0013-0010: Spec Auto-Discovery Detects Policy Change

- BR-Ref: BR-0013-0010
- Given a repository where `_policies/naming.md` is modified between `origin/main` and `HEAD` and the `qfai.config.yaml` declares `baseBranch: origin/develop`
- When `detectSpecChanges` and `detectPolicyChanges` run
- Then `SpecDiffResult` carries `entries` / `allSpecs` / `fullScan` populated, `detectPolicyChanges` returns `true`, the configured `baseBranch` (`origin/develop`) is used as the diff base, and old-style evidence files (lacking the Diff Context section) still parse without throwing

## EX-0013-0009: Backslash-Containing Triage Cell Round-Trips Unchanged

- BR-Ref: BR-0013-0009
- Given a Triage row with `subject = "C:\Users\spec.md"` and `rationale = "matches \d+ pattern"`
- When the row is rendered via `escapeTableCell` and re-parsed via `splitMarkdownRow`
- Then the parsed `subject` equals `"C:\Users\spec.md"` (no backslash doubling) and the parsed `rationale` equals `"matches \d+ pattern"` (literal backslash preserved as-is)

## EX-0013-0011: Validator Wiring Verified Against Source

- BR-Ref: BR-0013-0011
- Given the source files `packages/qfai/src/core/validators/index.ts` and `packages/qfai/src/core/validate.ts`
- When the wiring contract is checked
- Then `validateTraceabilityIntegrity` is exported from the barrel (`typeof validateTraceabilityIntegrity === "function"`) AND `validate.ts` source contains an `import` statement for that named export AND the import is referenced inside the validate pipeline body (not dead code)

## EX-0013-0012: DESIGN.md Lock Written at Phase 0

- BR-Ref: BR-0013-0012
- Given root `DESIGN.md` exists and its sha256 is `abc123...`
- When `/qfai-sdd` Phase 0 completes
- Then `<paths.contractsDir>/design/DESIGN.md.lock.yaml` exists with `sha256: abc123...` and a `lockedAt` ISO 8601 timestamp; absence of `DESIGN.md` triggers an error-severity finding from the design contract validator family

## EX-0013-0013: Legacy Design Contract Removed From Active Set

- BR-Ref: BR-0013-0013
- Given a fresh `/qfai-sdd` run on a UI-bearing pack
- When `_policies/05_Contracts.md` is inspected
- Then none of `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, `brand-design.yaml` appear as active rows; `09_delta.md` may retain history annotations

## EX-0013-0014: Active Design Contract Index Snapshot

- BR-Ref: BR-0013-0014
- Given the post-decomposition contract index
- When the active design-contract entries are listed
- Then the set is exactly `{design-system.yaml, prototype-handoff.yaml, DESIGN.md, DESIGN.md.lock.yaml, design-system mirror validator}`

## EX-0013-0015: UI contract template ships `primary_tasks: []` slot

- BR-Ref: BR-0013-0015
- Given the shipped `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml` template
- When the template is parsed at `qfai init` time
- Then every entry in `screens[]` carries a literal `primary_tasks: []` key/value pair; the requirements-analyst agent guide reads "Each screen MUST declare ≥ 1 primary_task" (or equivalent canonical wording)

## EX-0013-0016: Empty `primary_tasks` blocks `/qfai-prototyping`

- BR-Ref: BR-0013-0016
- Given a newly authored `.qfai/contracts/ui/orders-dashboard.yaml` with `screens: [{ id: orders-dashboard, primary_tasks: [] }]`
- When `qfai validate --fail-on error` runs (with the new QFAI-AUD-001 aligned lane active)
- Then the lane FAILS at severity error naming `orders-dashboard` and the empty-`primary_tasks` violation; `/qfai-prototyping` preflight refuses to proceed; populating `primary_tasks: ["Review pending orders", "Mark order shipped"]` passes the lane and unblocks `/qfai-prototyping`

## EX-0013-0017: Active pack resolved from `state.json#discussion.currentId`

- BR-Ref: BR-0013-0017
- Given `.qfai/state.json` carries `discussion.currentId: "discussion-20260527075558258"` and that dir exists
- When a `/qfai-sdd` downstream skill resolves the active pack via the helper
- Then it returns `discussion-20260527075558258` without scanning mtimes

## EX-0013-0035: Absent active pointer names recovery

- BR-Ref: BR-0013-0017
- Given `state.json#discussion.currentId` is absent and three candidate discussion directories exist
- When the downstream helper resolves the active pack
- Then it raises an error naming the three candidates and `qfai discussion use <id>`

## EX-0013-0018: `surface_type: ui-bearing` auto-set; missing-frontmatter warns

- BR-Ref: BR-0013-0018
- Given a target spec `<spec-id>` has a `.qfai/contracts/ui/<spec-id>-dashboard.yaml` companion
- When `/qfai-sdd` runs then `qfai sdd lint` runs
- Then `/qfai-sdd` writes `surface_type: ui-bearing` to that spec's `01_Spec.md` frontmatter; had the frontmatter been absent, `sdd lint` would emit `D-SURFACE-TYPE-MISSING` (warning); a spec with no UI companion emits no finding

## EX-0013-0019: `primary_tasks` band documented and named in warning

- BR-Ref: BR-0013-0019
- Given a screen declaring 9 `primary_tasks`
- When `QFAI-AUD-020` runs
- Then the warning fires naming the recommended band `3..7`; the `ui-spec.yaml` template comments and `references/ui-contract-guide.md` both document the band

## EX-0013-0020: Structured `primary_tasks` shape accepted / rejected

- BR-Ref: BR-0013-0020
- Given one item `"Review orders"` (string-only) and one `{id: t1, label: "Mark shipped", acceptance: "order status flips to shipped"}` (structured) and one `{id: t2, label: "x"}` (missing `acceptance`)
- When `auditProfile.ts` evaluates them during the deprecation window
- Then the string-only and the complete structured item are accepted; the item missing `acceptance` is rejected (all-required, closed schema)

## EX-0013-0021: Concrete-First Order On The Story Tree

- BR-Ref: BR-0013-0021
- Given a story-tree project and a request for one new business flow with two stories and one API contract
- When `/qfai-sdd` writes the specification
- Then it writes `01_policy/`, then the flow's `business-flow.md` under `02_business-flow/`, then both `user-story-NNNN-NNNN/` directories with their US, ACs and EXs, and last the API contract under `03_contract/`; every rule the contract carries cites only EX IDs the two stories already hold, and no Contracts-first phase runs

## EX-0013-0022: A Story Directory Holds Exactly Three Files

- BR-Ref: BR-0013-0022
- Given a new story on the story tree
- When `/qfai-sdd` writes its `user-story-NNNN-NNNN/` directory
- Then the directory holds exactly `01_User-story.md`, `02_Acceptance-Criteria.md` and `03_Example.md`, each written from its paired `qfai-sdd` template, and each AC is a Gherkin scenario; a fourth file such as `notes.md`, or a subdirectory such as `fixtures/`, is a story-directory error

## EX-0013-0023: A Business Flow Carries A Mermaid Diagram

- BR-Ref: BR-0013-0023
- Given a new business flow on the story tree
- When `/qfai-sdd` writes its `business-flow-NNNN/business-flow.md`
- Then the file holds a `mermaid` code block that opens with `flowchart` or `sequenceDiagram`; a flow described in prose alone does not meet the rule

## EX-0013-0024: A New Contract File Gets Its contracts.md Row

- BR-Ref: BR-0013-0024
- Given `/qfai-sdd` writes a new `orders.yaml` under `<paths.contractsDir>/api/` on the story tree
- When the change is complete
- Then `<paths.contractsDir>/contracts.md` has a row for `api/orders.yaml`, added in the same change; without that row the gate reports the file as an unlisted contract at error

## EX-0013-0025: Records Land As Rows Of The Two Tables

- BR-Ref: BR-0013-0025
- Given a story-tree project and two discussion REQs that each need approval, one to change a story and one to retire a story
- When `/qfai-sdd` triages both, the user approves the first and declines the second, a change request is raised against `<paths.contractsDir>/api/orders.yaml`, and an open question comes up
- Then `decisions.md` gains one `DEC-NNNN` row per triage decision, appended at TODO, whose Content names the operation, the `US-NNNN-NNNN` it acts on and `discussion-<id>#REQ-NNNN`; the approved row moves to WIP and the declined row to REJECTED; a further `DEC-NNNN` row opens its Content with `Change request: <paths.contractsDir>/api/orders.yaml`; the open question is an `OQ-NNNN` row of `open-questions.md`; nothing is written under `.qfai/decisions/`, and no `01_Spec-retired` file is written

## EX-0013-0026: Table Rows Keep Four Cells And Change Only Status

- BR-Ref: BR-0013-0026
- Given `decisions.md` holding a DONE row `DEC-NNNN` and `open-questions.md` holding a TODO row `OQ-NNNN`, each with the cells ID, Content, Approach and Status
- When `/qfai-sdd` later records that the decision is superseded and that the question is deferred
- Then the decision row's Status becomes `SUPERSEDED (by DEC-NNNN)` and the question row's Status becomes DEFERRED, while their ID, Content and Approach stay as written; a fifth column such as a date, a Status outside the table's vocabulary such as `CLOSED`, a changed Content cell, or a removed row is an error

## EX-0013-0027: The Quality-Gate Commands Have One Home

- BR-Ref: BR-0013-0027
- Given a story-tree project whose quality gate is `pnpm lint`, `pnpm test` and `pnpm build`
- When `/qfai-sdd` writes `principle.md` under `<paths.specsDir>/01_policy/` and `tech.md` under `<paths.contractsDir>`
- Then the three commands appear only in the Standard commands section of `<paths.contractsDir>/tech.md`, and `principle.md` points to that section instead of listing them; a product goal stated in `objective.md` is not restated in `initiative.md`

## EX-0013-0028: A New ID Is The Highest In Its Scope Plus One

- BR-Ref: BR-0013-0028
- Given a business flow whose stories are numbered `0001` to `0003` within the flow, a `decisions.md` row recording that story `0004` of that flow was retired, and a story whose ACs have the tails `01` and `02`
- When `/qfai-sdd` adds a story to the flow and an AC to that story
- Then the new story takes `0005` within the flow and its directory is named after its `US-NNNN-NNNN` ID, and the new AC takes the tail `03`; in a tree with no business flow the first flow takes `0001`, and the first AC or EX of a new story takes the tail `01`

## EX-0013-0029: Rules Are Written In Each Contract's Own Form

- BR-Ref: BR-0013-0029
- Given the story tree and three rules, enforced by an OpenAPI YAML contract, a SQL schema and a Markdown CLI contract
- When `/qfai-sdd` writes the rules at the 03-contract step
- Then the YAML contract carries a top-level `x-qfai-rules:` list of `{ id: BR-NNNN, statement, examples: [EX-NNNN-NNNN-NN] }`, the SQL file carries `-- Rule BR-NNNN: <statement>` followed on the next line by `-- Examples: EX-NNNN-NNNN-NN`, and the Markdown contract carries a `## Rules` table with the columns BR-ID, Statement and Examples; the three rule numbers differ across the contracts, and no separate rules file exists

## EX-0013-0030: A Shared Rule Is Defined Once

- BR-Ref: BR-0013-0030
- Given a rule that both the orders API contract and the orders table schema rely on, with the API contract authoritative for it
- When `/qfai-sdd` writes both contracts
- Then the rule is defined once, in the API contract's `x-qfai-rules:`, and the SQL file lists its ID on a `-- Rule refs: BR-NNNN` line without restating the statement

## EX-0013-0031: Each EX Names Exactly One AC

- BR-Ref: BR-0013-0031
- Given a story on the story tree with two ACs and three EXs
- When `qfai validate --profile sdd --fail-on error` gates the tree
- Then the gate passes when each EX names exactly one of the two ACs in its `AC-Ref` cell and each AC is named by at least one EX; an EX whose `AC-Ref` cell is empty or names both ACs, or an AC that no EX names, fails the gate with the ID and its file

## EX-0013-0032: Each Rule Cites An EX And Each EX Is Cited

- BR-Ref: BR-0013-0032
- Given a contract on the story tree defining two rules, and a story with three EXs
- When `qfai validate --profile sdd --fail-on error` gates the tree
- Then the gate passes when each rule's examples name at least one of the three EXs and the two rules together name all three; a rule with no examples, an EX that no rule names, or an example naming an EX that does not exist fails the gate with the ID and its file

## EX-0013-0033: qfai-sdd Citations Resolve In The New Assistant Tree

- BR-Ref: BR-0013-0033
- Given the `rule/ skill/ agent/ prompt/` assistant tree
- When the `qfai-sdd` skill's `SKILL.md`, `references/` and `templates/` are read
- Then every citation of the change-classification document reads `.qfai/assistant/rule/change-classification.md`, every citation of the requirements-decomposition document reads `<paths.skillsDir>/qfai-sdd/references/requirements-decomposition.md`, and both files exist; a citation still reading `.qfai/assistant/constitution/change-classification.md` resolves to nothing

## EX-0013-0034: The Completion Gate Runs Per Business Flow

- BR-Ref: BR-0013-0034
- Given a story-tree project in which `/qfai-sdd` changed two business flows while a parallel worker edits a third
- When `/qfai-sdd` runs its completion gate
- Then it runs `qfai validate --profile sdd --fail-on error --flow BF-NNNN` once for each of its two flows, and a failure in the third flow does not hold it back; it does not pass `--spec <spec-id>`, which on that tree exits 2 and names `--flow`
