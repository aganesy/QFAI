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

Given the first required delegation fails, when the orchestrator handles the failure, then the stage stops immediately, no simulated or self-executed fallback is used, and the user receives failure reason, attempted role/task, remediation guidance, and retry condition.
