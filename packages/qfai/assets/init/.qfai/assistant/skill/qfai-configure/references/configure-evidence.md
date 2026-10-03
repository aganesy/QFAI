# Configure Evidence

The sections `.qfai/evidence/configure-<run-id>.md` holds, and a template for it.

## Required sections

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks (must be explicit; "none" is acceptable if justified)
- Final status (PASS/FAIL) + who confirmed

## Template

```md
# Configure Evidence: <run-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Proposed globs

- include:
- exclude:

## Evidence samples (5-15)

## Tool selection (per layer)

## Minimum runnable path

## Files changed

- qfai.config.yaml:
- policy and contract files:

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```
