# 02 User Stories

## US Catalog

- US-0013-0001: Unified SDD Workflow
- US-0013-0002: Contract-First Phase
- US-0013-0003: Discussion-Pack Preflight
- US-0013-0004: Batch Mode Processing
- US-0013-0005: Required Edge Enforcement
- US-0013-0006: Validate Gate Integration
- US-0013-0007: Delta Phase with Rejected Guardrails
- US-0013-0008: Discussion Markdown-Only Preflight
- US-0013-0009: DESIGN.md sha256 Lock at Phase 0
- US-0013-0010: Active Design Contract Surface Reduction
- US-0013-0011: UI contract `primary_tasks` slot per screen
- US-0013-0012: Resolve active discussion pack via single helper
- US-0013-0013: Auto-populate `surface_type: ui-bearing` frontmatter
- US-0013-0014: `primary_tasks` count band + accepted shape documented

## US-0013-0001: Unified SDD Workflow

As a QFAI user, I want a single `/qfai-sdd` command to produce layered spec artifacts (policies + spec-XXXX) from a discussion pack, so that downstream execution skills have complete specifications.

## US-0013-0002: Contract-First Phase

As a QFAI user, I want contracts created/updated before spec slices, so that spec artifacts reference concrete contract definitions.

## US-0013-0003: Discussion-Pack Preflight

As a QFAI user, I want SDD to validate the latest discussion pack and stop if incomplete or has blocking OQs, so that specs are not built on incomplete requirements.

## US-0013-0004: Batch Mode Processing

As a QFAI user, I want no-argument invocation to process all capabilities from `_policies/03_Capabilities.md`, so that multi-spec projects are handled in one run.

## US-0013-0005: Required Edge Enforcement

As a QA engineer, I want US -> AC -> BR -> EX -> TC edge completeness enforced, so that traceability gaps are caught during SDD.

## US-0013-0006: Validate Gate Integration

As a QFAI user, I want `qfai validate --fail-on error` to pass with error=0 before SDD completion, so that spec quality is verified.

## US-0013-0007: Delta Phase with Rejected Guardrails

As a QFAI user, I want `09_delta.md` to include adoption/rejection rationale with DO NOT and Temptation sections, so that rejected options are guarded against reintroduction.

## US-0013-0008: Discussion Markdown-Only Preflight

As a QFAI user, I want SDD preflight to block only on discussion-pack markdown readiness, so that optional side artifacts do not prevent spec generation.

## US-0013-0009: DESIGN.md sha256 Lock at Phase 0

As a QFAI user, I want `/qfai-sdd` Phase 0 to freeze the root `DESIGN.md` sha256 into `.qfai/contracts/design/DESIGN.md.lock.yaml`, so that downstream skills can detect drift between the discussion-time design SSOT and any later edits.

## US-0013-0010: Active Design Contract Surface Reduction

As a QFAI maintainer, I want `/qfai-sdd` to stop emitting the legacy design contract family (`exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, `brand-design.yaml`), so that the active design-contract index reduces to `design-system.yaml`, `prototype-handoff.yaml`, `DESIGN.md`, `DESIGN.md.lock.yaml`, and the design-system mirror validator.

## US-0013-0011: UI contract `primary_tasks` slot per screen

As a requirements-analyst authoring UI contracts during `/qfai-sdd`, I want the shipped `ui-contract.sample.yaml` template to include a `primary_tasks: []` slot on every `screens[]` entry AND the requirements-analyst agent guide to instruct me to fill ≥ 1 primary_task per screen, so that downstream `/qfai-prototyping` always has explicit primary-task semantics; the new validate lane (QFAI-AUD-001 aligned) blocks `/qfai-prototyping` from starting on UI contracts whose `primary_tasks` is empty (REQ-0115).

## US-0013-0012: Resolve active discussion pack via single helper

As a `/qfai-sdd` downstream skill, I want to resolve the active discussion pack through one helper reading `.qfai/state.json#discussion.currentId` (the SSOT written by `/qfai-discussion`), so that I never guess the active pack from filesystem timestamps and I surface a clear error naming candidate dirs and the recovery command (`qfai discussion use <id>`) on missing/duplicate ambiguity. (REQ-0155 reader side / DR-0266)

## US-0013-0013: Auto-populate `surface_type: ui-bearing` frontmatter

As a QFAI user running `/qfai-sdd`, I want the skill to set `surface_type: ui-bearing` frontmatter for every spec that has a `.qfai/contracts/ui/<spec>-*.yaml` companion and `qfai sdd lint` to warn (`D-SURFACE-TYPE-MISSING`) when the companion exists but the frontmatter is missing, so that UI-bearing specs are no longer hand-patched while `resolveAllUiBearingSpecs()` keeps requiring the frontmatter as the strict signal. (REQ-0163)

## US-0013-0014: `primary_tasks` count band + accepted shape documented

As a requirements-analyst authoring UI contracts, I want the recommended `primary_tasks` count band (3..7) documented in the `ui-spec.yaml` template comments and `references/ui-contract-guide.md` and named in the `QFAI-AUD-020` warning, and I want `auditProfile.ts` to accept both string-only and structured `{id, label, acceptance}` task items during the deprecation window, so that the audit guidance is explicit and structured tasks become testable without breaking legacy string-only contracts. (REQ-0164 / DR-0267 / DR-0268)
