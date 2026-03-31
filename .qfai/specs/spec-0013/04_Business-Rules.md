# 04 Business Rules

## BR-0013-0001: Phase Order Mandatory

- SDD MUST follow: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update.

## BR-0013-0002: Upper-to-Lower References Forbidden

- Upper-to-lower references are forbidden. Lower-to-upper references are allowed.
- Connections between layers MUST be represented by IDs and required edges (US->AC->BR->EX->TC).

## BR-0013-0003: Discussion-Pack Required

- SDD MUST stop when discussion-pack is missing/incomplete or has blocking OQ.

## BR-0013-0004: Plan After Slice

- Plan finalize MUST happen after at least one user-story slice is grounded.
- Do not create `specs/plan.md` (use `spec-XXXX/10_Plan.md` only).

## BR-0013-0005: Contract Stub Validity

- Contract stubs must be syntactically valid (OpenAPI YAML / UI YAML / executable SQL skeleton).
- `none` is allowed only when there is no contract impact and rationale is written.

## BR-0013-0006: Delta Rejected Section

- Rejected section MUST include `DO NOT` and `Temptation` for each rejection.

## BR-0013-0007: Batch Mode Stable Mapping

- Capability order in `_policies/03_Capabilities.md` is SSOT for `spec-0001..N` assignment and ID stability.
- Reordering is a Change Request.
