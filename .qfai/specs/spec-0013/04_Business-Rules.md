# 04 Business Rules

## BR-0013-0001: Phase Order Mandatory

- AC-Refs: AC-0013-0001

- SDD MUST follow: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update.

## BR-0013-0002: Upper-to-Lower References Forbidden

- AC-Refs: AC-0013-0002

- Upper-to-lower references are forbidden. Lower-to-upper references are allowed.
- Connections between layers MUST be represented by IDs and required edges (US->AC->BR->EX->TC).

## BR-0013-0003: Usable Source Required

- AC-Refs: AC-0013-0003

- SDD MUST stop when NO usable source exists: no discussion pack, no import-lite input, and no explicit user requirement.
- SDD MUST NOT stop on a pack that is merely incomplete, contradictory, or carrying a blocking OQ, and MUST NOT edit, repair or re-run a pack to make its own gate pass.

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
- A validator that is implemented but not wired (export missing OR import missing) is forbidden — the validate gate would silently skip it and the behavioral AC (validate gate error count == 0) would pass for the wrong reason.
- Renaming a validator's export name without updating the import in `validate.ts` is treated as breakage of this rule (silent skip).
- The export half and the import half are stated together at this BR layer because failure of either half collapses to the same observable outcome at AC layer (registration-integrity broken). Keeping the decomposition at BR layer rather than splitting AC-0013-0014 into 2 sub-ACs is a deliberate routing choice to avoid creating a new OQ-0019 known-instance.

## BR-0013-0012: DESIGN.md sha256 Lock Authoritative

- AC-Refs: AC-0013-0015

- `/qfai-sdd` Phase 0 MUST hash root `DESIGN.md` with sha256 and write the result plus `lockedAt` (ISO 8601) to `.qfai/contracts/design/DESIGN.md.lock.yaml`.
- A missing or unreadable `DESIGN.md` MUST halt Phase 0 with an error-severity finding routed through the design contract validator family owned by spec-0004.
- The lock file is the authoritative source of `DESIGN.md` integrity for downstream skills.

## BR-0013-0013: Legacy Design Contracts Disallowed

- AC-Refs: AC-0013-0016

- The active design-contract surface emitted by `/qfai-sdd` MUST NOT include `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, or `brand-design.yaml`.
- Historical annotations of these files in `09_delta.md` are allowed solely as migration record and MUST NOT re-promote them to the active set.

## BR-0013-0014: Active Design Contract Index Closed

- AC-Refs: AC-0013-0017

- The active design-contract entries are exactly `{design-system.yaml, prototype-handoff.yaml, DESIGN.md, DESIGN.md.lock.yaml, design-system mirror validator}`.
- New design contracts MUST be added through an explicit slice change (CHG entry) and updated in `_policies/05_Contracts.md` simultaneously.

## BR-0013-0015: UI contract `primary_tasks: []` slot mandatory in template

- AC-Refs: AC-0013-0018

- The shipped UI contract template `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml` MUST carry a `primary_tasks: []` slot on every entry in `screens[]`. The slot ships as an empty array (placeholder for authoring); the requirements-analyst agent guide MUST instruct authoring ≥ 1 primary_task per screen as part of `/qfai-sdd` UI contract authoring.
- Removing the slot or renaming it without an equivalent migration is a breaking change of the contract template and MUST go through an explicit slice change (CHG entry) in this spec.

## BR-0013-0016: validate lane gates `/qfai-prototyping` on non-empty `primary_tasks`

- AC-Refs: AC-0013-0019

- A new `qfai validate` lane (QFAI-AUD-001 aligned) MUST verify that every `screens[].primary_tasks` in newly authored `.qfai/contracts/ui/*.yaml` is non-empty before `/qfai-prototyping` proceeds past its preflight gate.
- Empty (`[]`) `primary_tasks` on any entry MUST FAIL the lane at severity error naming (a) the offending file path, (b) the offending screen `id`, (c) the rule `QFAI-AUD-001` (or canonical-aligned token).
- The lane is independent of legacy UI-contract validators; it complements rather than replaces existing screen-presence checks. Pre-existing UI contracts that lack the slot are treated under deprecation-window semantics (informational rather than blocking) until they are re-authored or until the next minor escalates the warning.

## BR-0013-0017: Active discussion pack resolved through one helper over `state.json` SSOT

- AC-Refs: AC-0013-0020, AC-0013-0021

- Downstream `/qfai-sdd` skills MUST resolve the active discussion pack through a single helper that reads `.qfai/state.json#discussion.currentId` (the SSOT written by `/qfai-discussion`, spec-0010). The helper MUST NOT infer the active pointer from filesystem mtime.
- When `currentId` is absent or resolves to a missing/duplicate pack, the helper MUST raise an error naming the candidate `discussion-*` dirs and the recovery command (`qfai discussion use <id>`) (DR-0266).

## BR-0013-0018: `surface_type: ui-bearing` auto-populated; `D-SURFACE-TYPE-MISSING` enforces

- AC-Refs: AC-0013-0022, AC-0013-0023

- `/qfai-sdd` MUST set `surface_type: ui-bearing` frontmatter on every spec that has a `.qfai/contracts/ui/<spec>-*.yaml` companion.
- `qfai sdd lint` (or equivalent) MUST emit `D-SURFACE-TYPE-MISSING` at severity warning during the deprecation window (sunsets to error at window close) when a UI companion exists but the frontmatter is absent; specs without a UI companion emit no finding.
- `resolveAllUiBearingSpecs()` MUST continue to require `surface_type: ui-bearing` as the strict downstream signal; auto-population is a convenience, not a relaxation of the strict resolver.

## BR-0013-0019: `primary_tasks` count band documented; warning names the band

- AC-Refs: AC-0013-0024

- The recommended `primary_tasks` count band is **3..7** (DR-0267) and MUST be documented in `templates/contracts/ui-spec.yaml` comments and `references/ui-contract-guide.md`.
- The `QFAI-AUD-020` warning text MUST name the band. Below 3 risks under-specified screens; above 7 risks unfocused screens.

## BR-0013-0020: `primary_tasks` accepted shapes — string-only AND structured (closed schema)

- AC-Refs: AC-0013-0025

- During the deprecation window `auditProfile.ts` MUST accept both string-only (legacy) `primary_tasks` items and structured items shaped `{id, label, acceptance}`.
- The structured shape is **all-required, closed** (DR-0268): all three of `id`, `label`, `acceptance` MUST be present and no additional properties are allowed. A structured item missing any field, or carrying extra keys (e.g. speculative `priority` / `owner`), MUST be rejected.
- String-only items MUST continue to PASS during the window; the structured form makes a task testable (the `acceptance` field anchors downstream atdd scaffolding).
