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
- Then `.qfai/contracts/design/DESIGN.md.lock.yaml` exists with `sha256: abc123...` and a `lockedAt` ISO 8601 timestamp; absence of `DESIGN.md` triggers an error-severity finding from the design contract validator family

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
- Then it returns `discussion-20260527075558258` without scanning mtimes; if `currentId` were absent with 3 candidate dirs, the helper would raise an error naming the 3 dirs and `qfai discussion use <id>`

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

## EX-0013-0021: Optional Side Artifact States

- BR-Ref: BR-0013-0021
- Given a discussion pack with usable markdown and no `prototyping.yaml`
- When SDD preflight runs
- Then it reports ready without treating the absent side artifact as a blocker
- Given the same pack with a `prototyping.yaml` whose namespaced schema is invalid
- When SDD preflight runs
- Then it reports ready without treating the malformed optional artifact as a blocker
- Given the same pack with a legacy-only `prototyping.yaml` that has no `prototyping` namespace
- When SDD preflight runs
- Then it reports ready without treating the legacy optional artifact as a blocker

## EX-0013-0022: A matching routing-time approval is checked, not asked

- BR-Ref: BR-0013-0022
- Given an SDD work order bound to slot `slot-1`, citing the `human_decision` `run-20260924045712999/create-0001` with `operation: CREATE`, `answeredBy: yusuke_senaga` and a `recordedAt` on 2026-09-24
- And Stage 1 triages a `CREATE` row for the capability that slot names, and the record is not stale
- When Stage 1 writes the row
- Then no question is asked, and the row carries `Authorization-Ref` `run-20260924045712999/create-0001` and `Approved By` `yusuke_senaga@2026-09-24`

## EX-0013-0023: An approval that does not hold stops Stage 1

- BR-Ref: BR-0013-0023
- Given the work order of EX-0013-0022, changed one way: the cited record is missing, its capability differs from the row's, or its scope has changed since it was recorded
- When Stage 1 triages the `CREATE` row
- Then `09_delta.md` gains no triage row, no question is put to the operator, and the stage returns `awaiting_input` naming the row and the reason

## EX-0013-0024: A routing-time approval answers only a CREATE

- BR-Ref: BR-0013-0024
- Given a run that holds a routing-time `CREATE` approval, and Stage 1 triages a `DELETE` row
- When Stage 1 reaches the row
- Then the `CREATE` approval is not cited for it, and Stage 1 asks the operator nothing itself: its stage result opens the approval question as a `decision` question, with outcome `awaiting_input`
- And once `yusuke_senaga` answers on 2026-09-24 and the next attempt receives the answer through `authorizationRefs`, the row is written with `Approved By` `yusuke_senaga@2026-09-24` and no `Authorization-Ref`

## EX-0013-0025: `--auto` inside a run approves nothing

- BR-Ref: BR-0013-0025
- Given `/qfai-sdd --auto` running under a work order, and a `SPLIT` row with no `human_decision` that answers it
- When Stage 1 reaches the row
- Then Stage 1 stops with a `consultation-needed` entry naming the row, and `Approved By` stays `-`

## EX-0013-0026: The triage format documents `Authorization-Ref`

- BR-Ref: BR-0013-0026
- Given `references/sdd-triage.md`
- When a reader looks up the triage table format
- Then `Authorization-Ref` is an optional column found by its header name and filled on a `CREATE` row only, its value form is `run-<17 digits>/<authorizationId>`, naming the run and the cited record, a row that cites a record copies `answeredBy@YYYY-MM-DD` into `Approved By`, a `DELETE`, `SPLIT`, `MERGE`, `SUPERSEDE` or `UPDATE:REMOVE` row carries no reference, and a row without the column is still valid

## EX-0013-0027: A missing-test diagnosis becomes one test case and one row

- BR-Ref: BR-0013-0027
- Given an `sdd_append` work order for a spec whose diagnosis says no test covers a backward move out of `green`
- When Phase 2b defect row seeding runs
- Then `06_Test-Cases.md` gains one test case and `tdd/test-list.md` one row, no Change Request is filed, and the test case's `Notes` state the defect and the run ID and name no path under `.qfai/runs/`

## EX-0013-0028: Seeding changes nothing upstream and no existing row's status or evidence

- BR-Ref: BR-0013-0028, BR-0013-0036
- Given the work order of EX-0013-0027, where the diagnosis matched one existing AC of that spec and one existing example of that AC's BR, and the ledger row covering that behaviour is `done`
- When the test case and row are appended
- Then the test case cites that AC in `AC-Refs` and that example in `EX-Ref`, no US, AC, BR or EX changes, the new row is `todo`, and the `done` row keeps its `Status` and `Evidence`
- And where the new row carries an obligation an existing row already carries, the new row names a `Boundary` and the existing row, if it has none, gains its slug; that slug is the only cell written on the existing row, whose `Status` and `Evidence` stay unchanged

## EX-0013-0029: The layer decides who writes the missing test

- BR-Ref: BR-0013-0029
- Given two diagnosed missing tests: one whose oracle reads a real ledger file, and one whose oracle observes a parser's return value only
- When Phase 2b derives each test case's `Level` by `test-layers.md`
- Then the first is `L3` with an `Integration` row left for ATDD, the second is `L1` with a `Unit` row left for implement, and seeding writes neither test

## EX-0013-0030: The append is recorded as an approval-free delta row

- BR-Ref: BR-0013-0030
- Given the seeding of EX-0013-0027
- When the run records it
- Then that spec's `09_delta.md` gains one `UPDATE` / `APPEND` triage row for the appended test case, with `Approved By` `-`

## EX-0013-0031: A work order without a target is refused

- BR-Ref: BR-0013-0031
- Given an orchestrated `/qfai-sdd` work order whose `target` is absent, and a second one whose `target` is `{ kind: "new_capability", slotId: "slot-1" }`
- When `/qfai-sdd` starts each
- Then the first is refused and the no-argument batch does not run, and the second's result reports a `bindings` entry for each capability it created

## EX-0013-0032: `/qfai-sdd` invoked by name ends at SDD

- BR-Ref: BR-0013-0032
- Given the operator types `/qfai-sdd`, and later `/qfai-sdd` with a request to take the change to the end
- When SDD completes the first
- Then the skill stops with no run created, and the second request is handed to a whole run rather than continued past SDD

## EX-0013-0033: The entry check before any edit

- BR-Ref: BR-0013-0033
- Given `/qfai-sdd` selected in mode `active` three ways: with no name and no work order, with a work order that matches no issued one, and with a valid work order
- When the entry check runs
- Then the first edits nothing and passes the request to `qfai-run`, the second edits nothing and returns the refusal, and the third does only the work order's work

## EX-0013-0034: The Operations table of `/qfai-sdd`

- BR-Ref: BR-0013-0034
- Given `qfai-sdd/references/orchestrated-mode.md`
- When its `## Operations` table is read
- Then the `Operation` column holds exactly `new-capability`, `delta-or-applicability-check` and `defect-row-seeding`

## EX-0013-0035: Stage 0 reuse keeps SDD's own check live

- BR-Ref: BR-0013-0035
- Given a run whose Stage 0 snapshot was recorded by an earlier stage, and a `/qfai-sdd` work order in the same run after one policy file changed
- When `/qfai-sdd` starts
- Then it recomputes the snapshot key, refreshes the entries that policy file feeds and reuses the rest, and runs `npx qfai sdd preflight` again
