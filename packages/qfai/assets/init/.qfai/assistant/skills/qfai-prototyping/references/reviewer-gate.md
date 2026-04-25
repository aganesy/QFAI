# Reviewer Gate

The reviewer is an independent gate, not the implementation author. The reviewer gate applies identically to all modes (spec-0012); modes differ only in `maxCycles`.

## Reviewer must verify

- all declared screens have all 4 per-screen artifacts for every active candidate in every round (screenshot, HTML, accessibility snapshot, command log)
- canonical latest paths mirror the newest accepted winner/polish state
- every round has `command-plans.json`, `review-bundle.json`, and per-candidate evaluator reviews
- `review-bundle.json` contains all required fields (candidates, axisDefs, designSystemChecklist, commandPlanRef)
- evaluator review `evidenceRefs[]` entries are concrete artifact refs (no placeholders)
- L1 and L2 evaluators used the required inputs
- the 3-layer evaluation family was referenced
- missing evidence triggered rerun rather than waiver
- `qfai validate --profile prototyping --fail-on error` passed
- `prototyping.json` `maxCycles` matches the mode (no mode invariant violations)
- winner_selected is true
- post_selection_polish_completed is true
- breakthrough_checked is true
- best_of_history_present is true
- all_reviewer_axes_perfect_100 is true
- completion_eligible is true only after the completion certificate is valid
- no completion claim is based on a 95-point threshold

## Reviewer output

```text
Result: PASS | REVISE
Findings:
- ...
Required fixes:
- ...
Evidence checked:
- ...
Gate fields:
- mode: low-cost|standard|full-harness
- maxCycles: <number matching mode>
- winner_selected: true|false
- post_selection_polish_completed: true|false
- breakthrough_checked: true|false
- best_of_history_present: true|false
- all_reviewer_axes_perfect_100: true|false
- completion_eligible: true|false
- completion_certificate_valid: true|false
```
