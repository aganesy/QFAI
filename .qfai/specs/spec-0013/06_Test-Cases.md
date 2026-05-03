# 06 Test Cases

## TC-0013-0001: Phase Order Enforcement

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0001
- Verify Contracts-first -> Outline -> Slice -> Plan -> Delta order.

## TC-0013-0002: Contract Index Alignment

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0002
- Verify every indexed ID in `_policies/05_Contracts.md` maps to a declared file.

## TC-0013-0003: Discussion-Pack Preflight Stop

- EX-Ref: EX-0013-0003
- AC-Refs: AC-0013-0003
- Verify SDD stops when discussion pack is missing or incomplete.

## TC-0013-0004: Slice Gate US->AC->BR->EX->TC

- EX-Ref: EX-0013-0002
- AC-Refs: AC-0013-0004
- Verify required edges are enforced in slice gate.

## TC-0013-0005: Plan After Slice Gate

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0005
- Verify plan finalization happens only after slice gate pass.

## TC-0013-0006: Reference Direction Enforcement

- EX-Ref: EX-0013-0002
- AC-Refs: AC-0013-0006
- Verify upper-to-lower references are detected and reported.

## TC-0013-0007: Validate Gate error=0

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0007
- Verify `qfai validate --fail-on error` produces error=0.

## TC-0013-0008: Business Flow Mermaid

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0008
- Verify `_policies/04_Business-Flow.md` contains Mermaid diagram.

## TC-0013-0009: Delta Rejected Guardrails

- EX-Ref: EX-0013-0004
- AC-Refs: AC-0013-0009
- Verify rejected entries include DO NOT and Temptation sections.

## TC-0013-0010: Coverage Placeholder for EX-0013-0005

- EX-Ref: EX-0013-0005
- AC-Refs: AC-0013-0001
- Verify that migrated traceability includes EX-0013-0005.

## TC-0013-0011: Coverage Placeholder for EX-0013-0006

- EX-Ref: EX-0013-0006
- AC-Refs: AC-0013-0011
- Verify that migrated example EX-0013-0006 is covered by at least one test case.

## TC-0013-0012: Coverage Placeholder for EX-0013-0007

- EX-Ref: EX-0013-0007
- AC-Refs: AC-0013-0001
- Verify that migrated example EX-0013-0007 is covered by at least one test case.

## TC-0013-0013: Test Case Type Column Presence

- EX-Ref: EX-0013-0008
- AC-Refs: AC-0013-0010
- Type: normal
- Verify that 06_Test-Cases.md template includes a Type column and each AC has at least one non-normal test case type.

## TC-0013-0014: SpecDiffResult Includes All Required Fields

- EX-Ref: EX-0013-0010
- AC-Refs: AC-0013-0013
- Type: normal
- Spec Auto-Discovery (consolidated from spec-0038) — verify that `detectSpecChanges` returns a `SpecDiffResult` with `entries`, `allSpecs`, and `fullScan` fields populated correctly. Implemented in `packages/qfai/tests/integration/specAutoDiscovery.test.ts` under `describe("TC-0013-0014: SpecDiffResult includes all required fields", ...)`.

## TC-0013-0015: Policy Change Detection

- EX-Ref: EX-0013-0010
- AC-Refs: AC-0013-0013
- Type: normal
- Spec Auto-Discovery (consolidated from spec-0038) — verify that `detectPolicyChanges` returns `true` when `_policies/` files are modified between refs and `false` otherwise. Implemented in `packages/qfai/tests/integration/specAutoDiscovery.test.ts` under `describe("TC-0013-0015: policy change detection", ...)`. A unit-test companion of the same SUT lives at `packages/qfai/tests/core/specDiffDetector.test.ts` `describe("TDD-0010: detectPolicyChanges", ...)`. The canonical TDD ↔ TC mapping is `tdd/test-list.md` (TDD-0010 → TC-0013-0010); this Notes entry deliberately does not mirror that mapping to avoid SSOT drift (cf. OQ-0017 / OQ-0018).

## TC-0013-0016: Config baseBranch Loading

- EX-Ref: EX-0013-0010
- AC-Refs: AC-0013-0013
- Type: normal
- Spec Auto-Discovery (consolidated from spec-0038) — verify that `loadConfig` reads `baseBranch` from `qfai.config.yaml` when present and returns the default sentinel when absent. Implemented in `packages/qfai/tests/integration/specAutoDiscovery.test.ts` under `describe("TC-0013-0016: config baseBranch — loadConfig reads baseBranch from yaml", ...)`.

## TC-0013-0017: Old Evidence Without Diff Context Remains Parseable

- EX-Ref: EX-0013-0010
- AC-Refs: AC-0013-0013
- Type: boundary
- Spec Auto-Discovery (consolidated from spec-0038) — verify that `detectSpecChanges` parses old-style evidence files that predate the Diff Context section without erroring (forward-compatibility boundary). Implemented in `packages/qfai/tests/integration/specAutoDiscovery.test.ts` under `describe("TC-0013-0017: old evidence without Diff Context remains parseable", ...)`.

## TC-0013-0018: Triage Cell Render-Parse Identity (Edge Cases)

- EX-Ref: EX-0013-0009
- AC-Refs: AC-0013-0012
- Type: edge
- Verify `escapeTableCell` ↔ `splitMarkdownRow` round-trip identity for cells containing literal `\` (Windows path, regex literal), `|` (CLI flag `--mode=a|b`), the combo `a\|b`, and the line-break classes `\r\n` / `\r` / `\n`. Backslash-containing cells must round-trip without doubling; pipes round-trip through `\|` escape; line breaks collapse deterministically to a single space. Implemented in `packages/qfai/tests/core/sddTriage.test.ts` under `describe("escapeTableCell ↔ splitMarkdownRow round-trip identity", ...)`.

## TC-0013-0019: Triage Cell Render-Parse Identity (Happy Path)

- EX-Ref: EX-0013-0009
- AC-Refs: AC-0013-0012
- Type: normal
- Verify the round-trip identity property for plain ASCII subjects / rationales that contain none of the escape-relevant characters (no `|`, no `\`, no line breaks). Required by BR-0013-0008 (each AC must have at least one normal-type TC). Implemented as the dedicated "happy path" assertion in the round-trip identity describe block in `packages/qfai/tests/core/sddTriage.test.ts`.

<!--
PR #206 review NxLq / NxQH (architecture-reviewer + implementation-reviewer,
MAJOR): the placeholder TC introduced at f1064756 was retracted. A
"coverage placeholder" without an actual test does not legitimately
satisfy the BR (it would weaken the rule by precedent). The non-normal
coverage gap on the Type-column-required AC is a pre-existing condition
that predates this PR. Tracked for separate implementation as OQ-0016
— see `_policies/09_Open-questions.md`.
-->

## TC-0013-0020: Validate Pipeline Wires Traceability Integrity

- EX-Ref: EX-0013-0011
- AC-Refs: AC-0013-0014
- Type: normal
- Verify that `validateTraceabilityIntegrity` is exported from `packages/qfai/src/core/validators/index.ts` and that `packages/qfai/src/core/validate.ts` imports and calls it during the validate pipeline. This is the direct behavioral assertion of the validator-registration wiring contract (AC-0013-0014 / BR-0013-0011). PR #206 review N65f re-anchored this TC from AC-0013-0007 (error=0 outcome) to AC-0013-0014 (wiring contract) because the SUT exercises structural wiring, not the observable error count. Implemented in `packages/qfai/tests/core/traceabilityIntegrity.test.ts` under `describe("TDD-0015: validate pipeline integration", ...)`.

## TC-0013-0021: Traceability Validator Tolerates Old Evidence (Forward-Compat Boundary)

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0007
- Type: boundary
- Verify that `validateTraceabilityIntegrity` does not raise an error when an evidence file is present but lacks the Diff Context section (an older evidence-format that predates the Diff Context contract). Forward-compatibility boundary for the validate gate (AC-0013-0007). Implemented in `packages/qfai/tests/core/traceabilityIntegrity.test.ts` under `describe("TDD-0014: evidence without Diff Context", ...)`.
