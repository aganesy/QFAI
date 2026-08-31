# 04 Business Rules

## BR-0015-0001: Orchestrator Restrictions

- AC-Refs: AC-0015-0001

- Orchestrator may only: create work orders, delegate tasks, integrate outputs, present results.
- Orchestrator MUST NOT: generate primary artifact first draft, serve as Reviewer, skip delegation.

## BR-0015-0002: Capability Probe By Real Delegation

- AC-Refs: AC-0015-0011

- Attempt the first required delegation at stage start; do not use preflight availability confirmation as the execution gate.
- Treat that first real delegation attempt as the capability check.

## BR-0015-0003: Delegation Failure Hard Stop Output

- AC-Refs: AC-0015-0012

- If the first required delegation fails, classify it before responding. Classify `saturated` only when the identical call would succeed later with no change by anyone; a limit or quota only a user can lift, and any reason whose retryability is not explicit, is `unavailable`.
- If the class is `unavailable`, stop immediately.
- If the class is `saturated`, retry the identical delegation with bounded backoff and keep the stage open and resumable; on exhausting the retry budget, stop as above and report the class as `saturated (retry budget exhausted)`.
- Do not simulate roles and do not continue with self-execution, in either class.
- Report: attempted role, attempted task, failure summary, failure class, why the stage stopped, required user remediation, and retry condition.

## BR-0015-0004: Devils-Advocate Gate

- AC-Refs: AC-0015-0004

- `can_be_na: false` -- N/A is not allowed for devils-advocate.
- FAIL must include concrete alternative. Bare negation is invalid.
- 3 consecutive FAILs trigger advisory demotion (current cycle only).

## BR-0015-0005: Pattern-Doubler Gate

- AC-Refs: AC-0015-0005

- `can_be_na: true` -- N/A is default when no ID-bearing items exist.
- Sets 2x target for current ID-bearing items (US/AC/BR/EX/TC).
- Rationale required for each proposed addition.

## BR-0015-0006: Work Orders Schema

- AC-Refs: AC-0015-0006

- Every major artifact must include Work Orders Summary with columns: Step, Role, Task title, Input refs, Output refs, Status (PASS/REVISE).

## BR-0015-0007: All-Reviewer Alternative Obligation

- AC-Refs: AC-0015-0007

- Every reviewer MUST provide concrete alternative or fix on FAIL.
- Feedback without concrete alternative is invalid and triggers re-judgment.

## BR-0015-0008: Reviewer-Gate cycle-check is structural

- AC-Refs: AC-0015-0013
- Reviewer Gate's `R-CERTIFY-VERIFY-CIRCULAR` check MUST be structural: it inspects the certify code path (and its imported validator-output reads) without re-running the certify pipeline.
- The check asserts the option-B path (chosen by the orchestrator's upstream deferred-OQ decision) is preserved — i.e. certify reads NO validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase.
- A natural-language reviewer assessment is NOT a substitute for the structural assertion; if the structural assertion fails, the gate emits the finding regardless of reviewer prose.
- The finding `justification:` MUST name (a) the certify code path that performs the offending read, (b) the validator-output file / profile whose artifact requirements include `/qfai-atdd` or `/qfai-implement`, (c) the option-B contract clause violated.

## BR-0015-0009: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` justification 3-part contract

- AC-Refs: AC-0015-0014
- When the upstream SSOT-sync-pair CI lane in spec-0004 signals drift, the Reviewer Gate MUST emit `R-PROMPT-SCANNER-DRIFT` at severity error.
- The `justification:` field MUST be non-empty (trimmed length > 0) AND MUST contain 3 elements: (a) modified file path, (b) un-paired counterpart path, (c) the specific contract clause whose match cannot be confirmed. The 3-part contract is the SSOT shared with the spec-0004 ingestion rule (one contract, two enforcers — Reviewer-Gate is the emitter, validate is the rejector).
- Empty / whitespace-only / structurally-incomplete `justification:` MUST be rejected by spec-0004's validate ingestion as advisory-failing error (R-WORKLOG-DRIFT family pattern reused; NFR-0115 justification-text contract reuse).

## BR-0015-0010: Default Autopilot Policy 3-bucket contract

- AC-Refs: AC-0015-0015
- Per DR-0269, every SKILL.md MUST carry a `## Default Autopilot Policy` section populated with three named buckets:
  - **auto-decide** (named defaults, AI proceeds without prompting): output formatting, ID / sequence numbering, append-vs-create when a subject overlaps an existing artifact, and option-pick among demonstrably-equivalent alternatives.
  - **ask-user** (AI prompts via `AskUserQuestion` with the bucket's prompt template): approval-required triage ops (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE), destructive operations, version-pin changes, scope expansions.
  - **hard-required** (no default possible; must be supplied before proceeding): brand intent, `primarySpecId` when absent.
- The skill body MUST reference this section as the source of truth. A skill MAY narrow the auto-decide bucket but MUST NOT widen it.
- Reviewer Gate emits `R-AUTOPILOT-POLICY-MISSING` (severity error, non-empty `justification:`) when the section is absent OR is present but missing one or more required buckets (heading-only / partial-bucket population — the "populated with three named buckets" requirement is not satisfied). The `justification:` MUST name the missing bucket(s) by name when the trigger is partial population.

## BR-0015-0011: Envelope-deviation audit-log write trigger and shape

- AC-Refs: AC-0015-0016
- Per DR-0270, the audit-log write triggers on a fixed four-context declared taxonomy — when an `AskUserQuestion` template names "skill envelope", "architectural decision", "rejected-option re-adoption", or "scope expansion" (option C pinned; NOT a per-call boolean flag, NOT a question-text regex heuristic).
- On trigger, the skill body MUST write `.qfai/evidence/decisions/<ISO8601-ts>.json` containing `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}`.
- `.qfai/evidence/decisions/` MUST be **tracked** in version control: the managed `.gitignore` block negates it after `.qfai/evidence/*` (`QFAI_GITIGNORE_GOVERNANCE_NEGATIONS`). It is a governance record carrying operator approval, not regenerable stage evidence like `.qfai/evidence/prototyping/`.
- An `AskUserQuestion` that names none of the four contexts MUST NOT write a record.

## BR-0015-0012: Cross-skill handoff schema SSOT-sync Pair IV

- AC-Refs: AC-0015-0017
- The canonical handoff schema lives in `packages/qfai/src/core/schemas/handoff.ts` (CLI-HANDOFF), documented in `references/handoff.md`. Minimum field set: `companyName?` / `primarySpecId?` / `startDate?` / `signature?` / `entryPattern?` / `productScope?`; `additionalProperties: true` so per-skill extensions do not break existing writers.
- Every skill that produces / consumes handoff state MUST read / write this schema (the schema and all skill writers form SSOT-sync Pair IV).
- Legacy ad-hoc files (e.g. `session-handoff.yaml`) are accepted during the deprecation window with a `D-HANDOFF-LEGACY-FORMAT` warning; at sunset the old-form acceptance is removed.
- Reviewer Gate emits `R-HANDOFF-SCHEMA-DRIFT` (severity error, non-empty `justification:`) when a skill writes a non-conforming handoff file OR the schema ↔ writer pair is edited asymmetrically.

## BR-0015-0013: Reviewer-Gate finding-code catalog membership + justification posture

- AC-Refs: AC-0015-0018
- The eight catalog codes — `R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`, `R-DESIGN-MD-PATCH-OUT-OF-ZONE`, `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`, `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT` — MUST be registered in the catalog with a mandatory non-empty `justification:` (prior-pack OQ-0109 Option A / TC-71 advisory-failing).
- The catalog stores membership only and MUST NOT declare a per-code severity column: each code's severity belongs to the detector that emits it, and is documented per code in the `_policies/06_Glossary.md` row.
- That constrains the stored shape, not the admission test. Which codes are eligible for registration is decided by severity class per BR-0015-0017 (warning-class advisory-only auxiliary signal stays out); that criterion is applied when the closed set is amended and MUST NOT be materialized as a field on the entry it admits. A registered code keeps whatever severity its own detector emits.
- `qfai validate` ingestion MUST reject any catalog finding emitted with empty / whitespace-only `justification:` (advisory-failing, R-WORKLOG-DRIFT family pattern reuse). That rejection is severity error for every one of the eight without exception, because what it reports is the missing justification, not the underlying finding.
- Note: `R-DESIGN-MD-PATCH-OUT-OF-ZONE` is emitted at severity warning per REQ-0151 / the glossary row; its participation in the catalog covers presence + justification discipline, not severity-error escalation of the finding itself.
- The Reviewer subagent prompt / tool-augmentation timing for these codes inherits the OQ-0119 carry-forward deferral and MUST NOT be resolved by this slice.

## BR-0015-0014: `qfai audit log` filter + format surface

- AC-Refs: AC-0015-0019
- Per DR-0271, `qfai audit log` (SHOULD) lists `.qfai/evidence/decisions/<ts>.json` records newest-first with filters `--scope`, `--operator`, `--clause` (on `envelopeContractClause`) and `--format table|json` defaulting to `table`.
- SHOULD-level because `.qfai/evidence/decisions/` is human-readable JSON; the CLI is an ergonomic improvement, not a hard requirement.

## BR-0015-0015: `qfai handoff upgrade` lossless legacy adapter

- AC-Refs: AC-0015-0020
- `qfai handoff upgrade <legacy-file>` (SHOULD) accepts a legacy handoff file and emits a conforming `handoff.yaml` (CLI-HANDOFF) at the canonical path.
- The helper MUST preserve all original fields under a `legacy:` key to avoid data loss.
- SHOULD-level per the v1.9.1 `qfai prototyping upgrade-{config,json}` precedent (closed OQ-0120 / 0121).

## BR-0015-0016: Cross-skill documentation-realignment governance

- AC-Refs: AC-0015-0021
- `references/iteration-loop.md`, `references/generator-prompt.md`, `references/handoff.md`, `references/evidence-requirements.md`, and each affected SKILL.md MUST be rewritten to match the implementations chosen for the OQ-0152..0157 outcomes (REQs 0150 / 0151 / 0152 / 0154 / 0156 / 0157).
- The rewrites MUST land in the same atomic PR(s) as the implementation (no follow-up doc-only PR).
- `qfai validate --report` MUST verify zero remaining stale references at HEAD after sunset; during the deprecation window stale references surface as warnings.
- spec-0015 owns this cross-skill documentation-governance obligation (CAP-0015 cross-skill governance territory).

## BR-0015-0017: Hygiene-lane finding ingestion and the deferred catalog registration

- AC-Refs: AC-0015-0022
- The Reviewer Gate MUST ingest `R-WORKFLOW-HYGIENE-DRIFT` and `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`. The finding payload is passed through as the lane produced it — offending file, job and rule name. The gate does not re-derive, re-word or re-classify it, because the rule set is owned by spec-0017 and the shipped-file rules by spec-0003.
- Catalog membership is decided by **severity class**, not by emitter identity. `JUSTIFICATION_CATALOG` is the closed error-class mandatory-justification set; a code emitted only by a deterministic repository script can be and is a member (`R-PACK-LOCATION-DRIFT`), as is a probe-driven one (`R-SKILL-MANIFEST-DRIFT`). What sits outside the catalog is warning-class advisory-only auxiliary signal (`R-AUTOPILOT-POLICY-WIDENED`), whose same-emitter sibling `R-AUTOPILOT-POLICY-MISSING` is inside it.
- Both codes are declared lint-failure codes in `CLI-WFSET`, i.e. error class. By the rule above they therefore **belong in** the catalog, following `R-PACK-LOCATION-DRIFT`. Registering them extends a closed set and MUST move in lockstep with the reviewer SSOTs, which is a different atomic slice than this ingestion cascade; the registration is therefore deferred with a named owner and trigger (OQ-0015-0001), not denied. Rationale and rejected options: DR-0015-0006.
- Until that lockstep change lands, the gate MUST NOT reject either code for an empty / absent `justification:`. This is a recorded **temporary divergence** scoped to exactly these two codes, enumerated explicitly rather than derived from a property. It MUST NOT be generalized: every `JUSTIFICATION_CATALOG` member keeps its mandatory non-empty `justification:` obligation under BR-0015-0013, and adding a code to the divergence list is a governance change, not an implementation detail.
- Code declarations are SSOT in `.qfai/contracts/cli/shipped-workflows.md` (`CLI-WFSET`). This spec cites them and, where it must state the ingestion obligation, mirrors the contract's discriminator rather than asserting an independent one. `CLI-WFSET` dropped its own emitter-identity rationale in round 4, so the contract and this rule now state the same discriminator. This spec does not own that contract file; the registration change owns keeping the two aligned.
