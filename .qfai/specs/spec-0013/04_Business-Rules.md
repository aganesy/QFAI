# 04 Business Rules

## BR-0013-0001: Phase Order Mandatory

- AC-Refs: AC-0013-0001

- SDD MUST follow: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update.

## BR-0013-0002: Upper-to-Lower References Forbidden

- AC-Refs: AC-0013-0002

- Upper-to-lower references are forbidden. Lower-to-upper references are allowed.
- Connections between layers MUST be represented by IDs and required edges (US->AC->BR->EX->TC).

## BR-0013-0003: Discussion-Pack Required

- AC-Refs: AC-0013-0003

- SDD MUST stop when discussion-pack is missing/incomplete or has blocking OQ.

## BR-0013-0004: Plan After Slice

- AC-Refs: AC-0013-0004

- Plan finalize MUST happen after at least one user-story slice is grounded.
- Do not create `specs/plan.md` (use `spec-XXXX/10_Plan.md` only).

## BR-0013-0005: Contract Stub Validity

- AC-Refs: AC-0013-0005

- Contract stubs must be syntactically valid (OpenAPI YAML / UI YAML / executable SQL skeleton).
- `none` is allowed only when there is no contract impact and rationale is written.

## BR-0013-0006: Delta Rejected Section

- AC-Refs: AC-0013-0006

- Rejected section MUST include `DO NOT` and `Temptation` for each rejection.

## BR-0013-0007: Batch Mode Stable Mapping

- AC-Refs: AC-0013-0007

- Capability order in `_policies/03_Capabilities.md` is SSOT for `spec-0001..N` assignment and ID stability.
- Reordering is a Change Request.

## BR-0013-0008: Test Case Type Classification

- AC-Refs: AC-0013-0010

- `06_Test-Cases.md` MUST include a `Type` column with values: `normal`, `error`, `boundary`, `edge`.
- Each AC MUST have at minimum one `normal` test case AND one non-normal (`error`/`boundary`/`edge`) test case.
- Normal-path-only coverage for an AC is considered incomplete.

## BR-0013-0010: Spec Auto-Discovery Diff Result Completeness

- AC-Refs: AC-0013-0013

- The Spec Auto-Discovery contract (`detectSpecChanges` + `detectPolicyChanges` + `loadConfig` + evidence-Diff-Context-forward-compat) MUST return a complete `SpecDiffResult` (with `entries`, `allSpecs`, `fullScan` fields) and MUST detect `_policies/` modifications independently of spec/contract/evidence diffs. Configuration (`baseBranch`) MUST be honored when present and MUST NOT block discovery when absent.
- Backward compatibility: evidence files that predate the Diff Context section MUST remain parseable.
- Consolidated from spec-0038 (Spec Auto-Discovery Protocol — 4-source unified diff detection).

## BR-0013-0009: Triage Cell Escape ↔ Parse Symmetry

- AC-Refs: AC-0013-0012

- `escapeTableCell` (`packages/qfai/src/core/sddTriage.ts`) and `splitMarkdownRow` (`packages/qfai/src/core/specPackParsers.ts`) MUST agree on what a Triage table cell can contain.
- The escape rule is exactly: `|` → `\|`, and `\r\n` / `\r` / `\n` → a single space character. Literal `\` MUST NOT be pre-escaped (no `\` → `\\` step).
- The parser un-escape rule is exactly: `\|` → `|`. The parser MUST NOT decode `\\` → `\`.
- Re-introducing `\` doubling on the renderer side without a matching `\\` → `\` rule on the parser side is forbidden — it silently mutates REQ subjects / rationales while keeping column count valid (so `QFAI-TRIAGE-*` validators would pass).
- Allowed cell character set therefore includes literal `\` (Windows paths, regex literals, escaped CLI examples). The only normalized class is line breaks.

## BR-0013-0011: Validator Registry Wiring

- AC-Refs: AC-0013-0014

- Each registered traceability / spec-integrity validator MUST be exported from the validators barrel (`packages/qfai/src/core/validators/index.ts`) under its canonical name, AND MUST be imported and invoked by the validate pipeline (`packages/qfai/src/core/validate.ts`).
- A validator that is implemented but not wired (export missing OR import missing) is forbidden — the validate gate would silently skip it and AC-0013-0007 (error=0) would pass for the wrong reason.
- Renaming a validator's export name without updating the import in `validate.ts` is treated as breakage of this rule (silent skip).
- This rule was extracted from AC-0013-0007 in PR #206 review N65f to remove semantic indirection between the wiring assertion and the behavioral AC (error count == 0).
