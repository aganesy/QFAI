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
