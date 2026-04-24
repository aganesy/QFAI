# Reviewer Gate

The reviewer is an independent gate, not the implementation author.

## Reviewer must verify

- all declared screens have screenshot evidence
- all declared screens have HTML snapshot evidence
- L1 and L2 evaluators used the required inputs
- the 3-layer evaluation family was referenced
- missing evidence triggered rerun rather than waiver
- `qfai validate --fail-on error` passed
- winner_selected is true
- post_selection_polish_completed is true
- breakthrough_checked is true
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
- winner_selected: true|false
- post_selection_polish_completed: true|false
- breakthrough_checked: true|false
- all_reviewer_axes_perfect_100: true|false
- completion_eligible: true|false
- completion_certificate_valid: true|false
```
