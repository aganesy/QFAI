# OQ and Deferred Rules

Use this file for canonical field definitions in `/qfai-discussion`.

## OQ Register Fields

- `OQ-ID`
- `Title`
- `Gate`
- `Disposition`
- `Owner`
- `Rationale`
- `Options`
- `Recommendation`
- `Next-Decision-Point`
- `Due`
- `Evidence`

## Gate Enum

`discussion|sdd|atdd|tdd|ops`

## Deferred Fields

- `OQ-ID`
- `Title`
- `Gate`
- `Deferred-Reason`
- `Deferred-Until`
- `Owner`
- `Due`
- `Severity`
- `Impact`
- `Mitigation`
- `Evidence`

## Guardrails

- Do not leave recommendations implicit.
- Do not defer without a next decision point.
- Do not close the pack while `Disposition: open` remains.
