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

## TC-0013-0014: Triage Cell Render-Parse Identity (Edge Cases)

- EX-Ref: EX-0013-0009
- AC-Refs: AC-0013-0012
- Type: edge
- Verify `escapeTableCell` ↔ `splitMarkdownRow` round-trip identity for cells containing literal `\` (Windows path, regex literal), `|` (CLI flag `--mode=a|b`), the combo `a\|b`, and the line-break classes `\r\n` / `\r` / `\n`. Backslash-containing cells must round-trip without doubling; pipes round-trip through `\|` escape; line breaks collapse deterministically to a single space. Implemented in `packages/qfai/tests/core/sddTriage.test.ts` under `describe("escapeTableCell ↔ splitMarkdownRow round-trip identity", ...)`.

## TC-0013-0015: Triage Cell Render-Parse Identity (Happy Path)

- EX-Ref: EX-0013-0009
- AC-Refs: AC-0013-0012
- Type: normal
- Verify the round-trip identity property for plain ASCII subjects / rationales that contain none of the escape-relevant characters (no `|`, no `\`, no line breaks). Required by BR-0013-0008 (each AC must have at least one normal-type TC). Implemented as the dedicated "happy path" assertion in the round-trip identity describe block in `packages/qfai/tests/core/sddTriage.test.ts`.
