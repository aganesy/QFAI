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

## EX-0013-0006: Coverage Placeholder for BR-0013-0004

- BR-Ref: BR-0013-0004
- Given the consolidated rule BR-0013-0004
- When layer coverage is evaluated
- Then at least one example exists for BR-0013-0004

## EX-0013-0007: Coverage Placeholder for BR-0013-0005

- BR-Ref: BR-0013-0005
- Given the consolidated rule BR-0013-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0013-0005

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
