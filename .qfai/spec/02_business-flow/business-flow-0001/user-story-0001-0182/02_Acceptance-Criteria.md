# Acceptance Criteria

## Criteria

```gherkin
Feature: Reviewer-Gate ingests workflow-hygiene and shipped-shape drift

# AC-0001-0182-01
# Parent: US-0001-0182
Scenario: Reviewer-Gate ingests `R-WORKFLOW-HYGIENE-DRIFT` and `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`
  Given the workflow-hygiene lane (owned by spec-0017) reports a rule violation on a pull request, in either QFAI's own workflows or the shipped template tree,
  When the Reviewer Gate processes that signal,
  Then it surfaces `R-WORKFLOW-HYGIENE-DRIFT` (own or shipped workflow rule violation) or `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` (declared shape divergence) naming the offending file, job and rule name as the lane reported them.
  And membership of the closed `JUSTIFICATION_CATALOG` set is decided by **severity class**, never by which component emits the code: the catalog is the closed error-class mandatory-justification set and already holds script- and probe-driven members (`R-PACK-LOCATION-DRIFT`, emitted only by a repository lint script; `R-SKILL-MANIFEST-DRIFT`), while what sits outside it is warning-class advisory-only auxiliary signal such as `R-AUTOPILOT-POLICY-WIDENED` — whose own sibling `R-AUTOPILOT-POLICY-MISSING`, same emitter, is a member.
  And both new codes are declared lint-failure codes, i.e. error class, so by that test they **belong in** the catalog on the `R-PACK-LOCATION-DRIFT` precedent. Registering them extends a closed set and MUST move in lockstep with the reviewer SSOTs, so registration is deliberately deferred rather than denied (DR-0015-0006 / OQ-0015-0001).
  And until that lockstep change lands, the gate MUST ingest both codes without demanding a `justification:`. That handling is a recorded **temporary divergence** from the membership test, scoped to exactly these two codes; it is NOT a principle, and no further code may be exempted by appealing to it.
```
