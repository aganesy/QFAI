# 02 User Stories

## US-0015-0001: Agent Catalog

As a QFAI maintainer, I want a catalog of 19 consolidated sub-agents with ID, mission, and category, so that agent delegation is standardized across all skills.

## US-0015-0002: Standard Agent Contract

As a QFAI maintainer, I want each agent to follow a standard contract structure (Mission, Inputs, Deliverables, Stop Conditions, Sign-off, Output Format), so that agent behavior is predictable and auditable.

## US-0015-0003: Orchestrator Protocol

As a QFAI user, I want the Orchestrator to only delegate, integrate, and decide (no direct generation or self-approval), so that work is distributed to specialized agents.

## US-0015-0004: Devils-Advocate Reviewer

As a QFAI user, I want a devils-advocate reviewer that challenges assumptions and provides concrete alternatives on FAIL, with 3-FAIL advisory demotion to prevent infinite loops.

## US-0015-0005: Pattern-Doubler Reviewer

As a QFAI user, I want a pattern-doubler reviewer that identifies missing patterns and proposes additions with rationale, so that ID-bearing items (US/AC/BR/EX/TC) have comprehensive coverage.

## US-0015-0006: All-Reviewer FAIL Obligation

As a QFAI user, I want every reviewer to provide a concrete alternative or fix proposal when returning FAIL, so that feedback is actionable and not merely negative.

## US-0015-0007: Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` regression check

As a QFAI maintainer, I want the Reviewer Gate to emit `R-CERTIFY-VERIFY-CIRCULAR` (severity: info — `qfai prototyping certify` is what refuses the wrong-phase verdict, with exit 2) whenever a future PR reintroduces the cycle where certify reads validator output that requires `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase, so that the prototyping-completable certify path (option-B per upstream deferred-OQ decision) cannot silently regress to the old circular contract (REQ-0015-0013).

## US-0015-0008: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` emission with mandatory `justification:`

As a Reviewer-Gate consumer, I want the Reviewer Gate to emit `R-PROMPT-SCANNER-DRIFT` (severity: error) with a non-empty `justification:` (naming the modified file, the un-paired counterpart, and the unmatched contract clause) whenever the upstream SSOT-sync-pair CI lane flags drift between `findDesignMdViolations.ts` and `generator-prompt.md`, so that downstream `qfai validate` ingestion can reject empty-justification findings under the existing prior-pack justification contract (REQ-0015-0014, per the discussion-20260522081618995 REQ-0006 justification text contract).

## US-0015-0009: SKILL.md `## Default Autopilot Policy` section

As a QFAI operator, I want every SKILL.md to carry a `## Default Autopilot Policy` section with three named buckets (auto-decide / ask-user / hard-required) and a Reviewer Gate that emits `R-AUTOPILOT-POLICY-MISSING` (severity error) when the section is absent OR is present but missing one or more required buckets (heading-only / partial population), so that avoidable per-session `AskUserQuestion` prompts collapse to 0–1 while triage / destructive / version-pin / scope-expansion decisions still require human authorization (REQ-0160, DR-0269).

## US-0015-0010: Envelope-deviation `AskUserQuestion` audit-log

As a QFAI maintainer, I want the skill body to write an envelope-deviation decision record to `.qfai/evidence/decisions/<ISO8601-ts>.json` whenever an `AskUserQuestion` names one of the four envelope-deviation contexts (skill-envelope / architectural-decision / rejected-option re-adoption / scope-expansion), so that future reviewers can map a deviation back to the architectural envelope-contract clause it touched (REQ-0158, DR-0270).

## US-0015-0011: Cross-skill `handoff.yaml` schema

As a QFAI maintainer, I want a single canonical cross-skill handoff schema (`packages/qfai/src/core/schemas/handoff.ts`, documented in `references/handoff.md`) that every skill producing or consuming handoff state reads and writes, with a Reviewer Gate emitting `R-HANDOFF-SCHEMA-DRIFT` (severity error) on non-conforming writes or asymmetric SSOT-sync-pair edits, so that handoff state stops fragmenting into ad-hoc per-skill files (REQ-0161, CLI-HANDOFF, SSOT-sync Pair IV).

## US-0015-0012: New Reviewer-Gate finding-code catalog

As a Reviewer-Gate consumer, I want the eight new second-wave finding codes registered as a catalog (membership only — the catalog declares no per-code severity column, each code keeping the severity its own detector emits — with every code carrying a mandatory non-empty `justification:` whose empty / whitespace-only value is rejected at severity error), so that Capabilities across the pack are tied to Reviewer-Gate enforcement under the single justification-text contract (REQ-0168, TC-71 advisory-failing posture).

## US-0015-0013: `qfai audit log` CLI surface

As a QFAI operator, I want a `qfai audit log` CLI (SHOULD) that lists the envelope-deviation decision records newest-first with `--scope` / `--operator` / `--clause` filters and `--format table|json` (table default), so that ops audit of recorded deviations does not require piping raw JSON through external tooling (REQ-0171, CLI-AUDIT, DR-0271).

## US-0015-0014: Cross-skill handoff legacy adapter helper

As a downstream-project operator on a legacy handoff file, I want `qfai handoff upgrade <legacy-file>` (SHOULD) to emit a conforming `handoff.yaml` at the canonical path while preserving all original fields under `legacy:`, so that migration to the CLI-HANDOFF schema is lossless during the deprecation window (REQ-0172).

## US-0015-0015: Cross-skill documentation realignment to implementation

As a QFAI maintainer, I want every `references/*.md` and each skill's SKILL.md rewritten to match the implementations chosen for the OQ-0152..0157 outcomes, landing in the same atomic PR as the implementation, with `qfai validate --report` verifying zero stale references at HEAD after sunset, so that cross-skill documentation does not drift from the shipped behavior (REQ-0173).

## US-0015-0016: Reviewer-Gate ingests workflow-hygiene and shipped-shape drift

- Parent: CAP-0015
- Source: discussion-20260804173914356#REQ-0013, #REQ-0022 (CHG-007)
- Goal: As a reviewer, I want the Reviewer Gate to ingest the two drift findings the workflow-hygiene lane emits, so that a hygiene or shipped-shape regression is surfaced in review rather than only in a CI log.
- Non-goals: authoring the lane itself (spec-0017), the shipped-file rules it checks (spec-0003), and any change to `qfai validate`'s own check set.
- Notes: follows the established emitter/ingestion split — an upstream CI lane emits, this spec defines how the gate consumes it. `R-PROMPT-SCANNER-DRIFT` is the precedent.
