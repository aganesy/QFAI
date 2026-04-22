# Reviewer Gate

The reviewer is an independent gate, not the implementation author.

## Reviewer must verify

- all declared screens have screenshot evidence
- all declared screens have HTML snapshot evidence
- L1 and L2 evaluators used the required inputs
- the 3-layer evaluation family was referenced
- missing evidence triggered rerun rather than waiver
- `qfai validate --fail-on error` passed

## Reviewer output

```text
Result: PASS | REVISE
Findings:
- ...
Required fixes:
- ...
Evidence checked:
- ...
```
