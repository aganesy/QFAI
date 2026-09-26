# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0002-0010-01
# Parent: US-0002-0010
Scenario: AC-0002-0010-01
  Given a PR that modifies `packages/qfai/src/core/validators/findDesignMdViolations.ts` without a paired modification to the LLM prompt SSOT under `packages/qfai/assets/init/.claude/skills/qfai-prototyping/references/generator-prompt.md` (or vice versa)
  When `pnpm ci:lint` runs as part of the new SSOT-sync-pair lane
  Then the lane FAILS and a Reviewer-Gate finding `R-PROMPT-SCANNER-DRIFT` (severity error) is emitted naming both the modified file and the un-paired counterpart; a paired modification (both files touched in the same PR) passes the lane

# AC-0002-0010-02
# Parent: US-0002-0010
Scenario: AC-0002-0010-02
  Given the SSOT-sync-pair lane runs on a PR with no changes to either file
  When the lane evaluates pair-changed semantics
  Then the lane passes silently (no `R-PROMPT-SCANNER-DRIFT` finding is emitted); the lane only fires when exactly one of the two paired files changes
```
