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

## EX-0013-0003: Incomplete Discussion Pack Stops SDD

- BR-Ref: BR-0013-0003
- Given discussion pack missing `06_REQ.md`
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
