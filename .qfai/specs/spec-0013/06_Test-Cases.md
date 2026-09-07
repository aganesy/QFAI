# 06 Test Cases

## TC-0013-0001: Phase Order Enforcement

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0001
- Verify Contracts-first -> Outline -> Slice -> Plan -> Delta order.

## TC-0013-0002: Contract Index Alignment

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0002
- Verify every indexed ID in `_policies/05_Contracts.md` maps to a declared file.

## TC-0013-0003: Usable-Source Preflight Stop

- EX-Ref: EX-0013-0003
- AC-Refs: AC-0013-0003
- Verify SDD continues on an incomplete or contradictory pack, and stops only when no usable source exists.

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
- Verify that `validateTraceabilityIntegrity` is exported from `packages/qfai/src/core/validators/index.ts` and that `packages/qfai/src/core/validate.ts` imports and calls it during the validate pipeline. Direct behavioral assertion of the validator-registration wiring contract (AC-0013-0014 / BR-0013-0011). Implemented in `packages/qfai/tests/core/traceabilityIntegrity.test.ts` under `describe("TDD-0015: validate pipeline integration", ...)`.

## TC-0013-0021: Traceability Validator Tolerates Old Evidence (Forward-Compat Boundary)

- EX-Ref: EX-0013-0001
- AC-Refs: AC-0013-0007
- Type: boundary
- Verify that `validateTraceabilityIntegrity` does not raise an error when an evidence file is present but lacks the Diff Context section (an older evidence-format that predates the Diff Context contract). Forward-compatibility boundary for the validate gate (AC-0013-0007). Implemented in `packages/qfai/tests/core/traceabilityIntegrity.test.ts` under `describe("TDD-0014: evidence without Diff Context", ...)`.

## TC-0013-0022: DESIGN.md sha256 Lock Written at Phase 0

- EX-Ref: EX-0013-0012
- AC-Refs: AC-0013-0015
- Type: normal
- Verify `/qfai-sdd` Phase 0 produces `.qfai/contracts/design/DESIGN.md.lock.yaml` with `sha256` matching `sha256(DESIGN.md bytes)` and a `lockedAt` ISO 8601 timestamp; absence of root `DESIGN.md` halts Phase 0 with an error-severity finding routed through the design contract validator family owned by spec-0004.

## TC-0013-0023: Legacy Design Contracts Absent After SDD

- EX-Ref: EX-0013-0013
- AC-Refs: AC-0013-0016
- Type: normal
- Verify that after `/qfai-sdd` completes, `_policies/05_Contracts.md` Active Contract Sets / Design Contracts contains none of `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, `brand-design.yaml`. Historical annotations under `09_delta.md` are tolerated.

## TC-0013-0024: Active Design Contract Index Snapshot

- EX-Ref: EX-0013-0014
- AC-Refs: AC-0013-0017
- Type: normal
- Verify the post-decomposition active design-contract entries are exactly `{design-system.yaml, prototype-handoff.yaml, DESIGN.md, DESIGN.md.lock.yaml, design-system mirror validator}` and that any extra active row triggers a contract-index validator finding.

## TC-0013-0025: UI Contract Template Ships `primary_tasks: []` Slot

- EX-Ref: EX-0013-0015
- AC-Refs: AC-0013-0018
- Type: normal
- Level: integration
- Verify that the shipped `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml` template parses with every `screens[]` entry carrying a `primary_tasks: []` slot, and that the requirements-analyst agent guide contains the instruction "≥ 1 primary_task per screen" (or canonical equivalent). Implemented as a template-load + structural-assertion test under `packages/qfai/tests/integration/sddUiTemplate.test.ts`.

## TC-0013-0026: Empty `primary_tasks` blocks `/qfai-prototyping` preflight

- EX-Ref: EX-0013-0016
- AC-Refs: AC-0013-0019
- Type: error
- Level: integration
- Verify that the new QFAI-AUD-001 aligned validate lane FAILS at severity error when any `.qfai/contracts/ui/*.yaml` has `screens[].primary_tasks: []` on any entry, and that `/qfai-prototyping` preflight refuses to proceed. The finding message names the offending file path, the offending screen `id`, and the rule token. Implemented under `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`.

## TC-0013-0027: Non-empty `primary_tasks` passes validate lane

- EX-Ref: EX-0013-0016
- AC-Refs: AC-0013-0019
- Type: normal
- Level: integration
- Verify that the QFAI-AUD-001 aligned lane passes silently when every `screens[].primary_tasks` is non-empty (≥ 1 entry), and that `/qfai-prototyping` preflight proceeds without a `primary_tasks`-related blocker. Pre-existing UI contracts that predate the slot are treated under deprecation-window semantics (informational, non-blocking) — covered as a boundary sub-case within the same test file.

## TC-0013-0028: Active pack resolved from `state.json#discussion.currentId`

- EX-Ref: EX-0013-0017
- AC-Refs: AC-0013-0020
- Type: normal
- Level: integration
- Verify the single helper returns the pack named in `.qfai/state.json#discussion.currentId` without scanning filesystem mtimes (REQ-0155 reader side / DR-0266).

## TC-0013-0029: Ambiguous/absent active pointer raises recovery error

- EX-Ref: EX-0013-0017
- AC-Refs: AC-0013-0021
- Type: error
- Level: integration
- Verify that when `currentId` is absent or resolves to a missing/duplicate pack, the helper raises an error naming the candidate `discussion-*` dirs and the recovery command (`qfai discussion use <id>`).

## TC-0013-0030: `/qfai-sdd` auto-populates `surface_type: ui-bearing`

- EX-Ref: EX-0013-0018
- AC-Refs: AC-0013-0022
- Type: normal
- Level: integration
- Verify `/qfai-sdd` sets `surface_type: ui-bearing` frontmatter for a spec with a `.qfai/contracts/ui/<spec>-*.yaml` companion and that `resolveAllUiBearingSpecs()` still requires the frontmatter as the strict signal (REQ-0163).

## TC-0013-0031: `D-SURFACE-TYPE-MISSING` warns on companion-without-frontmatter

- EX-Ref: EX-0013-0018
- AC-Refs: AC-0013-0023
- Type: boundary
- Level: integration
- Verify `qfai sdd lint` emits `D-SURFACE-TYPE-MISSING` (warning during the window) when a UI companion exists but `surface_type: ui-bearing` is absent, and emits no finding for a spec with no UI companion.

## TC-0013-0032: `primary_tasks` band documented and named in warning

- EX-Ref: EX-0013-0019
- AC-Refs: AC-0013-0024
- Type: normal
- Level: integration
- Verify the recommended band `3..7` (DR-0267) appears in `templates/contracts/ui-spec.yaml` comments and `references/ui-contract-guide.md`, and that the `QFAI-AUD-020` warning text names the band.

## TC-0013-0033: `primary_tasks` count below 3 / above 7 warns

- EX-Ref: EX-0013-0019
- AC-Refs: AC-0013-0024
- Type: boundary
- Level: integration
- Verify a screen declaring fewer than 3 or more than 7 `primary_tasks` triggers the `QFAI-AUD-020` warning naming the band; 3 and 7 (inclusive bounds) do not.

## TC-0013-0034: Structured `primary_tasks` shape accepted

- EX-Ref: EX-0013-0020
- AC-Refs: AC-0013-0025
- Type: normal
- Level: integration
- Verify `auditProfile.ts` accepts string-only items AND complete structured `{id, label, acceptance}` items during the deprecation window (REQ-0164 / DR-0268).

## TC-0013-0035: Incomplete / open structured `primary_tasks` rejected

- EX-Ref: EX-0013-0020
- AC-Refs: AC-0013-0025
- Type: error
- Level: integration
- Verify a structured item missing any of `id` / `label` / `acceptance`, or carrying extra keys (closed schema violation), is rejected by `auditProfile.ts` (DR-0268).
