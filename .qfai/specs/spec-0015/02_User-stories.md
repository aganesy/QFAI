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

As a QFAI maintainer, I want the Reviewer Gate to emit `R-CERTIFY-VERIFY-CIRCULAR` (severity: error) whenever a future PR reintroduces the cycle where certify reads validator output that requires `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase, so that the prototyping-completable certify path (option-B per upstream deferred-OQ decision) cannot silently regress to the old circular contract (REQ-0015-0013).

## US-0015-0008: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` emission with mandatory `justification:`

As a Reviewer-Gate consumer, I want the Reviewer Gate to emit `R-PROMPT-SCANNER-DRIFT` (severity: error) with a non-empty `justification:` (naming the modified file, the un-paired counterpart, and the unmatched contract clause) whenever the upstream SSOT-sync-pair CI lane flags drift between `findDesignMdViolations.ts` and `generator-prompt.md`, so that downstream `qfai validate` ingestion can reject empty-justification findings under the existing prior-pack justification contract (REQ-0015-0014, per the discussion-20260522081618995 REQ-0006 justification text contract).
