# 03 Acceptance Criteria

## AC-0015-0001: Agent Catalog Completeness

Given the agent catalog, when checked, then 39 agents are listed with ID, name, mission, and category (planning/implementation/review/operations).

## AC-0015-0002: Standard Contract Structure

Given any agent definition file, when checked, then it contains Mission, Inputs You Must Read, Deliverables, Stop Conditions, and Sign-off Checklist sections.

## AC-0015-0003: Orchestrator No Direct Generation

Given an Orchestrator invocation, when it processes work, then it delegates to sub-agents and does not generate primary artifact first drafts directly.

## AC-0015-0004: Devils-Advocate Concrete Alternative

Given a devils-advocate FAIL verdict, when checked, then it includes a concrete alternative proposal. Bare negation FAIL triggers re-judgment.

## AC-0015-0005: Devils-Advocate 3-FAIL Demotion

Given 3 consecutive devils-advocate FAILs, when checked, then advisory demotion is triggered (blocking power lost for current review cycle).

## AC-0015-0006: Pattern-Doubler Rationale

Given a pattern-doubler proposal, when checked, then each proposed pattern includes rationale.

## AC-0015-0007: Pattern-Doubler N/A Default

Given an artifact with no ID-bearing items, when pattern-doubler evaluates, then it returns N/A.

## AC-0015-0008: All-Reviewer FAIL Obligation

Given any reviewer returning FAIL, when checked, then feedback includes a concrete alternative or fix proposal. Feedback without alternative is invalid.

## AC-0015-0009: Roster Single-File SSOT

Given `review-roster.yml`, when checked, then it is the sole source for reviewer roster (all reviewers registered here).

## AC-0015-0010: Existing Reviewers Unchanged

Given the 10 existing reviewers, when new reviewers are added, then existing reviewers' behavior, order, and logic are unchanged.
