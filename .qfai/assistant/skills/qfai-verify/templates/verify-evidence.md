# Verify evidence template

Copy this into `.qfai/evidence/verify-<spec-id>.md` and fill every section. A
section left empty is a gap, not a pass — write "none" with a justification
rather than deleting the heading.

Required sections (all of them, in this order):

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- QFAI gates
- Repo gates
- Next actions (if any)
- Gaps / Open risks (must be explicit; "none" is acceptable if justified)
- Final status (PASS/FAIL) + who confirmed

```md
# Verify Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

- command:
- result:

## QFAI gates

- command:
- result:

## Repo gates

- command:
- result:

## Next actions (if any)

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```
