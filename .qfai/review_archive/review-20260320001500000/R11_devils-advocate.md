# Review: Devil's Advocate

- **Reviewer ID**: R11
- **Target**: discussion-20260320000941109
- **Cycle**: 1
- **Date**: 2026-03-20
- **Verdict**: PASS

## Checklist

- [x] Challenge the 5-failure-mode framing
- [x] Challenge sub-agent roster (6 agents)
- [x] Challenge evidence contract (free-text evidence)
- [x] Challenge parallel dispatch rules
- [x] Challenge scope (too much or too little)

## Findings

### Challenge 1: Are F-6201 through F-6205 really the right failure modes?

**Counter-argument:** The five failure modes are all _orchestration-internal_ concerns. A sixth failure mode is arguably missing: **F-620X: Silent regression** -- a passing GREEN observation does not guarantee the test is actually meaningful (i.e., the test could be tautological or test the wrong thing). The RedGreenAuditor verifies that the test fails and then passes, but not that the test _tests the right thing_. That responsibility falls to TDDSpecReviewer, but the spec reviewer checks _scope alignment_, not _assertion quality_.

**Assessment:** This gap is partially mitigated by TDDSpecReviewer (which checks that implementation matches the intended test case) and TDDCodeQualityReviewer (which evaluates correctness). The five failure modes are scoped to what is _detectable by the orchestration layer_ -- assertion quality is a code-level concern, not an orchestration concern. The framing is sound for the stated scope. **Holds up.**

### Challenge 2: Is 6 agents the right number?

**Counter-argument (fewer):** TDDSpecReviewer and TDDCodeQualityReviewer could be merged into a single "TDDReviewer" agent. Their concerns overlap (both review post-implementation), and splitting them creates an artificial handoff point that adds ceremony without proportional value.

**Counter-argument (more):** A dedicated "EvidenceCollector" agent separate from RedGreenAuditor would separate the concerns of _collecting_ evidence (running commands, capturing output) from _auditing_ evidence (validating that it meets the contract). Currently RedGreenAuditor does both.

**Assessment:** The separation of SpecReviewer and CodeQualityReviewer is justified by the different failure modes they address: F-6202 (scope/spec compliance) vs. general code quality. Merging them would blur the audit trail for _why_ something was rejected. The evidence collection concern is adequately handled within RedGreenAuditor since collection and validation happen in the same step. Six agents is defensible. **Holds up.**

### Challenge 3: Is free-text evidence really auditable?

**Counter-argument:** The entire point of F-6203 is to make evidence auditable, yet the chosen format is free-text with labels. Free-text is inherently harder to parse, validate, and query programmatically. A post-hoc audit that needs to verify "did this item have a RED command+result?" must now parse unstructured text rather than querying a JSON field. OQ-0001 resolved this by deferring strict JSON to a future version, citing SRC-0001 S6.2, but this means the evidence contract is only _partially_ addressing F-6203.

**Assessment:** This is the strongest challenge. However, the discussion pack explicitly acknowledges this trade-off (OQ-0001, 99*delta Rejected items) and provides a migration path. The free-text+labels approach is a pragmatic stepping stone: it moves from "no evidence requirement" to "labeled evidence required," which is a substantial improvement even if not the final state. The key guarantee -- that command+result \_pairs* must be present -- is enforceable even in free text by checking for the presence of labeled sections. **Holds up, with noted technical debt.**

### Challenge 4: Are parallel dispatch rules too strict or too loose?

**Counter-argument (too strict):** The requirement for worktree separation (OQ-0003, resolved as Option A) could be overly burdensome. Many parallel tasks could safely share a worktree if they touch different files. Requiring worktree/branch separation for every parallel dispatch adds overhead that may discourage parallel work entirely.

**Counter-argument (too loose):** The independence check is described as validating "no shared state, no sequential dependency, no public API overlap" (Glossary), but the mechanism for verifying independence is not specified. Without a concrete algorithm or heuristic, the independence check could be rubber-stamped.

**Assessment:** The "too strict" concern is mitigated by the Inception Deck Risk #3 acknowledgment that rules target safety not throughput, and by the fact that ParallelSliceDispatcher is conditional (only activated when slices meet criteria). The "too loose" concern about unspecified verification mechanism is valid but appropriate for a discussion-phase artifact -- the implementation phase will define the concrete checks. **Holds up.**

### Challenge 5: Is v1.6.2 trying to do too much or too little?

**Counter-argument (too much):** Five failure modes, six sub-agents, completion contracts, evidence contracts, parallel rules, AND docs/wrapper sync in a single PR is ambitious. The single-PR constraint (NFR-0001) means any one failing area blocks the entire release.

**Counter-argument (too little):** The evidence contract stops at free-text labels when JSON would be more robust. The validator warnings are non-blocking (REQ-0012 is "Could" priority). The actual enforcement is in documentation/contracts, not in runtime code that actively prevents violations.

**Assessment:** The scope is well-calibrated as "contract hardening" -- it formalizes what was already informally present (Assumption #3 in Context). The ~10 files touched (Inception Deck §8) suggests the changes are documentation/contract updates, not large code changes. The single-PR constraint is appropriate for coordinated contract updates where partial delivery would create the half-migration state that F-6205 explicitly addresses. **Holds up.**

## Verdict

**PASS** -- All five challenges were examined thoroughly. The original decisions withstand scrutiny:

1. The 5-failure-mode framing is correctly scoped to orchestration-layer concerns.
2. Six agents have distinct, non-overlapping responsibilities justified by different failure modes.
3. Free-text evidence is a pragmatic improvement with an acknowledged migration path to structured formats.
4. Parallel dispatch rules balance safety and usability appropriately for this phase.
5. The scope is well-calibrated as contract hardening within a single coordinated PR.

The strongest area of concern is the free-text evidence format (Challenge 3), which is acknowledged technical debt with a planned resolution path. This does not warrant a FAIL because the discussion pack explicitly documents the trade-off and deferral rationale.
