# 03 Acceptance Criteria

## AC-0015-0001: Agent Catalog Completeness

Given the agent catalog, when checked, then 19 agents are listed with ID, kind, mission, and domain.

## AC-0015-0002: Standard Contract Structure

Given any agent definition file, when checked, then it contains Mission, Inputs You Must Read, Deliverables, Stop Conditions, and Sign-off Checklist sections.

## AC-0015-0003: Orchestrator No Direct Generation

Given an Orchestrator invocation, when it processes work, then it delegates to sub-agents and does not generate primary artifact first drafts directly.

## AC-0015-0004: Optional Review Mode Concrete Alternative

Given a devils-advocate FAIL verdict, when checked, then it includes a concrete alternative proposal. Bare negation FAIL triggers re-judgment.

## AC-0015-0005: Devils-Advocate 3-FAIL Demotion

Given 3 consecutive devils-advocate FAILs, when checked, then advisory demotion is triggered (blocking power lost for current review cycle).

## AC-0015-0006: Pattern-Doubler Rationale

Given a pattern-doubler proposal, when checked, then each proposed pattern includes rationale.

## AC-0015-0007: Pattern-Doubler N/A Default

Given an artifact with no ID-bearing items, when pattern-doubler evaluates, then it returns N/A.

## AC-0015-0008: All-Reviewer FAIL Obligation

Given any reviewer returning FAIL, when checked, then feedback includes a concrete alternative or fix proposal. Feedback without alternative is invalid.

## AC-0015-0009: Routing SSOT

Given `agent-routing.yml` and `review-profiles.yml`, when checked, then they are the sole source for reviewer routing and optional review modes.

## AC-0015-0010: Specialist Responsibilities Preserved

Given consolidated agents, when checked, then prior specialist responsibilities remain represented in the merged agent definitions.

## AC-0015-0011: Capability Probe Uses Real Delegation

Given a skill stage starts, when the first required delegation is attempted, then that real delegation attempt acts as the capability check and no preflight availability confirmation gates execution.

## AC-0015-0012: Delegation Failure Hard Stop

Given the first required delegation fails, when the orchestrator handles the failure, then it classifies the failure as `unavailable` or `saturated` and no simulated or self-executed fallback is used in either class. An `unavailable` failure stops the stage immediately and the user receives failure reason, failure class, attempted role/task, remediation guidance, and retry condition. A `saturated` failure holds the stage open for a bounded retry of the identical delegation and falls through to the same hard-stop report once the retry budget is exhausted.

## AC-0015-0013: Reviewer-Gate emits `R-CERTIFY-VERIFY-CIRCULAR` on prototyping-phase certify/verify cycle

- US-Refs: US-0015-0007
- Given a future PR that wires `certify` to read validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts (i.e. reintroduces the cycle the option-B path was chosen to eliminate),
- When the Reviewer Gate runs against that PR,
- Then it emits `R-CERTIFY-VERIFY-CIRCULAR` at severity **info**, and `qfai prototyping certify` refuses that verdict with exit 2. The finding is info because a `scope: "full"` verdict on disk is not damage — a full-profile run records it truthfully, and at error severity an ordinary repo-wide `validate` made `/qfai-verify`'s Completion Contract unsatisfiable outside Work Order H (#1097). The finding names (a) the certify code path that reads the offending validator output, (b) the validator output file / profile whose artifact requirements include `/qfai-atdd` or `/qfai-implement`, (c) the option-B contract clause that is violated. A PR whose certify path reads no validator output requiring `/qfai-atdd`/`/qfai-implement` artifacts (i.e. holds the option-B path intact) passes without `R-CERTIFY-VERIFY-CIRCULAR`.

## AC-0015-0014: Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` with non-empty `justification:`

- US-Refs: US-0015-0008
- Given the upstream SSOT-sync-pair CI lane (owned by spec-0004) flags drift between `findDesignMdViolations.ts` and `generator-prompt.md` on a PR,
- When the Reviewer Gate processes that signal,
- Then it emits `R-PROMPT-SCANNER-DRIFT` at severity error with a non-empty `justification:` text naming (a) the modified file path, (b) the un-paired counterpart path, (c) the specific contract clause whose match cannot be confirmed. Empty / whitespace-only / missing `justification:` MUST be treated by spec-0004's validate ingestion as an advisory-failing error (mirror of the R-WORKLOG-DRIFT family pattern).

## AC-0015-0015: SKILL.md `## Default Autopilot Policy` present with 3 named buckets

- US-Refs: US-0015-0009
- Given a SKILL.md,
- When the Reviewer Gate checks it,
- Then a `## Default Autopilot Policy` section MUST be present listing three named buckets per DR-0269: (a) auto-decide (named defaults — output formatting, ID / sequence numbering, append-vs-create on subject overlap, equivalent-option pick), (b) ask-user (approval-required triage ops CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE, destructive operations, version-pin changes, scope expansions — each with its prompt template), (c) hard-required (`companyName`, brand intent, `primarySpecId` when absent). When the section is absent OR is present but missing one or more required buckets (heading-only / partial population — the "populated with three named buckets" requirement is not satisfied), the gate emits `R-AUTOPILOT-POLICY-MISSING` at severity error with a non-empty `justification:` naming the missing bucket(s). A SKILL.md MAY narrow the auto-decide set but MUST NOT widen it.

## AC-0015-0016: Envelope-deviation `AskUserQuestion` writes a decision record

- US-Refs: US-0015-0010
- Given an `AskUserQuestion` whose template names one of the four envelope-deviation contexts (skill-envelope / architectural-decision / rejected-option re-adoption / scope-expansion),
- When the skill body resolves the answer,
- Then it MUST write `.qfai/evidence/decisions/<ISO8601-ts>.json` shaped `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}` per DR-0270; `.qfai/evidence/decisions/` MUST be **tracked** in version control (the managed `.gitignore` block negates it after `.qfai/evidence/*`), because a decision record carries operator approval and cannot be regenerated — unlike the regenerable `.qfai/evidence/prototyping/`. An `AskUserQuestion` that names none of the four contexts MUST NOT write a record (no fail-open false-positive).

## AC-0015-0017: Cross-skill handoff schema is the single canonical writer/reader

- US-Refs: US-0015-0011
- Given any skill that produces or consumes handoff state,
- When it writes a handoff file,
- Then the file MUST conform to the canonical CLI-HANDOFF schema in `packages/qfai/src/core/schemas/handoff.ts` (documented in `references/handoff.md`) whose minimum field set is `companyName?` / `primarySpecId?` / `startDate?` / `signature?` / `entryPattern?` / `productScope?` with `additionalProperties: true`. A legacy ad-hoc file (e.g. `session-handoff.yaml`) is accepted during the deprecation window with a `D-HANDOFF-LEGACY-FORMAT` warning. A non-conforming write, or an asymmetric edit of the SSOT-sync Pair IV (schema ↔ all skill writers), emits `R-HANDOFF-SCHEMA-DRIFT` at severity error with a non-empty `justification:`.

## AC-0015-0018: New Reviewer-Gate finding-code catalog enforced with mandatory justification

- US-Refs: US-0015-0012
- Given the Reviewer Gate,
- When it evaluates a PR,
- Then the eight catalog codes `R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`, `R-DESIGN-MD-PATCH-OUT-OF-ZONE`, `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`, `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT` MUST be available in the catalog, each carrying a mandatory non-empty `justification:` (per the prior-pack OQ-0109 Option A / TC-71 advisory-failing posture). The catalog governs membership only and declares no per-code severity column: each code's own severity belongs to the detector that emits it (e.g. `R-DESIGN-MD-PATCH-OUT-OF-ZONE` is emitted at warning by `designMdPatchZone.ts` per REQ-0151). A finding emitted with empty / whitespace-only `justification:` MUST be rejected by `qfai validate` ingestion (advisory-failing) at severity error for every one of the eight codes without exception, because what that rejection reports is the missing justification, not the underlying finding. The Reviewer subagent prompt / tool-augmentation timing for these codes inherits the OQ-0119 carry-forward deferral and is NOT resolved here.

## AC-0015-0019: `qfai audit log` lists and filters decision records

- US-Refs: US-0015-0013
- Given `.qfai/evidence/decisions/<ts>.json` records exist,
- When `qfai audit log` runs,
- Then it lists the records newest-first and supports `--scope`, `--operator`, and `--clause` (filtering on `envelopeContractClause`) plus `--format table|json` defaulting to `table`, per DR-0271 (CLI-AUDIT). Because `.qfai/evidence/decisions/` is human-readable JSON, the CLI is SHOULD-level (ergonomic, not a hard requirement).

## AC-0015-0020: `qfai handoff upgrade` emits a conforming handoff losslessly

- US-Refs: US-0015-0014
- Given a legacy handoff file (e.g. `session-handoff.yaml`),
- When `qfai handoff upgrade <legacy-file>` runs,
- Then it emits a conforming `handoff.yaml` (CLI-HANDOFF) at the canonical path and preserves all original fields under a `legacy:` key so no data is lost. SHOULD-level per the v1.9.1 `qfai prototyping upgrade-{config,json}` precedent (closed OQ-0120 / 0121).

## AC-0015-0021: Cross-skill docs realigned to implementation with zero stale references

- US-Refs: US-0015-0015
- Given the OQ-0152..0157 outcomes are implemented,
- When the implementing PR lands,
- Then `references/iteration-loop.md`, `references/generator-prompt.md`, `references/handoff.md`, `references/evidence-requirements.md`, and each affected SKILL.md MUST be rewritten in the same atomic PR to match the chosen implementations, and `qfai validate --report` MUST verify zero remaining stale references at HEAD after sunset (warnings during the deprecation window). spec-0015 owns this cross-skill documentation-governance obligation.

## AC-0015-0022: Reviewer-Gate ingests `R-WORKFLOW-HYGIENE-DRIFT` and `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`

- US-Refs: US-0015-0016
- Given the workflow-hygiene lane (owned by spec-0017) reports a rule violation on a pull request, in either QFAI's own workflows or the shipped template tree,
- When the Reviewer Gate processes that signal,
- Then it surfaces `R-WORKFLOW-HYGIENE-DRIFT` (own or shipped workflow rule violation) or `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` (declared shape divergence) naming the offending file, job and rule name as the lane reported them.
- And membership of the closed `JUSTIFICATION_CATALOG` set is decided by **severity class**, never by which component emits the code: the catalog is the closed error-class mandatory-justification set and already holds script- and probe-driven members (`R-PACK-LOCATION-DRIFT`, emitted only by a repository lint script; `R-SKILL-MANIFEST-DRIFT`), while what sits outside it is warning-class advisory-only auxiliary signal such as `R-AUTOPILOT-POLICY-WIDENED` — whose own sibling `R-AUTOPILOT-POLICY-MISSING`, same emitter, is a member.
- And both new codes are declared lint-failure codes, i.e. error class, so by that test they **belong in** the catalog on the `R-PACK-LOCATION-DRIFT` precedent. Registering them extends a closed set and MUST move in lockstep with the reviewer SSOTs, so registration is deliberately deferred rather than denied (DR-0015-0006 / OQ-0015-0001).
- And until that lockstep change lands, the gate MUST ingest both codes without demanding a `justification:`. That handling is a recorded **temporary divergence** from the membership test, scoped to exactly these two codes; it is NOT a principle, and no further code may be exempted by appealing to it.
