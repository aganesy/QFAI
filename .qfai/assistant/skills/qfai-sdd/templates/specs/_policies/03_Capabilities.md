# 03 Capabilities

## Capability order rule

- Capabilities are listed in execution order.
- The `Spec` column declares which spec directory owns each capability. It is
  the SSOT for the capability-to-spec mapping — `validateSpecSplitByCapability`
  reads it instead of deriving the directory name from row order, so an ID gap
  left by an approved DELETE stays legal (see `_policies/11_Slice-Policy.md`).
- Seed a new capability with the next free `spec-NNNN`; never reuse a retired one.
- Keep IDs stable once published.

## CAP Catalog

| CAP ID   | Spec      | Statement (what)         | Success metrics (optional) | Notes (optional) |
| -------- | --------- | ------------------------ | -------------------------- | ---------------- |
| CAP-0001 | spec-0001 | <what capability solves> | <metric>                   | <note>           |
| CAP-0002 | spec-0002 | <what capability solves> | <metric>                   | <note>           |

## Authoring rules

- This file is the policy-layer SSOT for capability mapping across all specs.
- Every CAP appears on exactly one row, that row must name exactly one spec
  directory, and no two rows may name the same one; `QFAI-SPLIT-106` reports
  all three breaches.
- Do not copy spec-level details (US/AC/BR/EX/TC) into this file.
